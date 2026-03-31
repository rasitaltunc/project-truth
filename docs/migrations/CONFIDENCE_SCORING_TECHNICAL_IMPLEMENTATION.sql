-- EVIDENCE CONFIDENCE SCORING SYSTEM
-- Technical Implementation for Project Truth
-- PostgreSQL Schema & Functions
-- Date: March 21, 2026

-- ============================================================================
-- PART 1: SCHEMA EXTENSIONS
-- ============================================================================

-- Add confidence scoring columns to evidence_archive
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS (
    -- Admiralty Code assessments
    admiralty_source_grade CHAR(1) DEFAULT 'F' CHECK (admiralty_source_grade IN ('A','B','C','D','E','F')),
    admiralty_credibility_grade INT DEFAULT 6 CHECK (admiralty_credibility_grade BETWEEN 1 AND 6),

    -- Confidence component scores (0-100)
    source_reliability_score NUMERIC(5,2) DEFAULT 0,
    information_credibility_score NUMERIC(5,2) DEFAULT 0,
    evidence_quality_score NUMERIC(5,2) DEFAULT 0,
    network_consensus_score NUMERIC(5,2) DEFAULT 0,
    temporal_freshness_score NUMERIC(5,2) DEFAULT 0,

    -- Metadata for recalculation
    confidence_calculation_timestamp TIMESTAMP DEFAULT NOW(),
    confidence_decay_type VARCHAR(50) DEFAULT 'linear' CHECK (confidence_decay_type IN ('linear','exponential','step','none')),
    chain_of_custody_hash VARCHAR(256),
    is_bidirectional_link BOOLEAN DEFAULT FALSE,

    -- Audit
    confidence_updated_by UUID REFERENCES auth.users(id),
    confidence_update_reason TEXT
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_evidence_confidence_score ON evidence_archive(final_confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_admiralty_grade ON evidence_archive(admiralty_source_grade, admiralty_credibility_grade);
CREATE INDEX IF NOT EXISTS idx_evidence_last_updated ON evidence_archive(confidence_calculation_timestamp DESC);

-- ============================================================================
-- PART 2: MAPPING TABLES (Admiralty Grade → Numeric Score)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admiralty_source_mappings (
    grade CHAR(1) PRIMARY KEY,
    score_base NUMERIC(5,2),
    description TEXT
);

INSERT INTO admiralty_source_mappings VALUES
    ('A', 95.00, 'Completely reliable'),
    ('B', 75.00, 'Usually reliable'),
    ('C', 60.00, 'Fairly reliable'),
    ('D', 40.00, 'Not usually reliable'),
    ('E', 20.00, 'Unreliable'),
    ('F', 10.00, 'Reliability cannot be judged')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS admiralty_credibility_mappings (
    grade INT PRIMARY KEY,
    score_base NUMERIC(5,2),
    description TEXT
);

INSERT INTO admiralty_credibility_mappings VALUES
    (1, 95.00, 'Confirmed'),
    (2, 80.00, 'Probably true'),
    (3, 60.00, 'Possibly true'),
    (4, 40.00, 'Possibly false'),
    (5, 20.00, 'Probably false'),
    (6, 10.00, 'Cannot be judged')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 3: HELPER FUNCTIONS
-- ============================================================================

-- Function: Convert Admiralty grade to numeric score
CREATE OR REPLACE FUNCTION admiralty_source_score(grade CHAR(1))
RETURNS NUMERIC(5,2) AS $$
    SELECT COALESCE(score_base, 10::NUMERIC)
    FROM admiralty_source_mappings
    WHERE admiralty_source_mappings.grade = admiralty_source_score.grade;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION admiralty_credibility_score(grade INT)
RETURNS NUMERIC(5,2) AS $$
    SELECT COALESCE(score_base, 10::NUMERIC)
    FROM admiralty_credibility_mappings
    WHERE admiralty_credibility_mappings.grade = admiralty_credibility_score.grade;
$$ LANGUAGE SQL IMMUTABLE;

-- Function: Get CIA confidence level score (High/Moderate/Low)
CREATE OR REPLACE FUNCTION cia_confidence_to_score(confidence_level VARCHAR)
RETURNS NUMERIC(5,2) AS $$
BEGIN
    RETURN CASE confidence_level
        WHEN 'HIGH' THEN 90.0::NUMERIC
        WHEN 'MODERATE' THEN 60.0::NUMERIC
        WHEN 'LOW' THEN 30.0::NUMERIC
        ELSE 10.0::NUMERIC
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get badge tier confidence multiplier
CREATE OR REPLACE FUNCTION badge_tier_to_score(tier INT)
RETURNS NUMERIC(5,2) AS $$
BEGIN
    RETURN CASE tier
        WHEN 1 THEN 80.0::NUMERIC  -- Tier 1: Journalist
        WHEN 2 THEN 70.0::NUMERIC  -- Tier 2: Verified
        WHEN 3 THEN 50.0::NUMERIC  -- Tier 3: Community
        ELSE 20.0::NUMERIC          -- Anonymous/Unknown
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 4: TEMPORAL DECAY FUNCTIONS
-- ============================================================================

-- Function: Calculate linear decay (court records, archives)
-- Confidence(t) = Initial × (1 - decay_rate × days)
CREATE OR REPLACE FUNCTION temporal_decay_linear(
    initial_confidence NUMERIC(5,2),
    days_since_verification INT,
    decay_rate NUMERIC DEFAULT 0.001
)
RETURNS NUMERIC(5,2) AS $$
BEGIN
    RETURN GREATEST(
        initial_confidence * (1 - decay_rate * days_since_verification),
        initial_confidence * 0.1  -- Never drop below 10%
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate exponential decay (news, rumors, hearsay)
-- Confidence(t) = Initial × e^(-decay_constant × days)
CREATE OR REPLACE FUNCTION temporal_decay_exponential(
    initial_confidence NUMERIC(5,2),
    days_since_verification INT,
    decay_constant NUMERIC DEFAULT 0.003
)
RETURNS NUMERIC(5,2) AS $$
BEGIN
    RETURN initial_confidence * EXP(-decay_constant * days_since_verification);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Apply freshness bonus
-- Recently verified claims get +2% per month up to 1 year
CREATE OR REPLACE FUNCTION freshness_multiplier(
    days_since_verification INT
)
RETURNS NUMERIC AS $$
BEGIN
    IF days_since_verification <= 365 THEN
        RETURN 1.0 + (0.02 * (365 - LEAST(days_since_verification, 365)) / 365.0);
    ELSIF days_since_verification <= 365*5 THEN
        RETURN 1.0;  -- No change 1-5 years
    ELSE
        RETURN POWER(0.9, (GREATEST(days_since_verification, 365*5) - 365*5) / (365.0*5));
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Select appropriate decay function
CREATE OR REPLACE FUNCTION apply_temporal_decay(
    initial_confidence NUMERIC(5,2),
    days_since_verification INT,
    decay_type VARCHAR
)
RETURNS NUMERIC(5,2) AS $$
BEGIN
    RETURN CASE decay_type
        WHEN 'linear' THEN temporal_decay_linear(initial_confidence, days_since_verification)
        WHEN 'exponential' THEN temporal_decay_exponential(initial_confidence, days_since_verification)
        WHEN 'step' THEN initial_confidence  -- Step decay handled in separate logic
        WHEN 'none' THEN initial_confidence
        ELSE initial_confidence
    END * freshness_multiplier(days_since_verification);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 5: NETWORK CONSENSUS FUNCTIONS
-- ============================================================================

-- Function: Calculate consensus score from multiple sources
-- Consensus_Score = Avg(source_scores) × Corroboration_Multiplier × Independence_Factor
CREATE OR REPLACE FUNCTION calculate_network_consensus(
    evidence_id UUID
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    avg_source_score NUMERIC(5,2);
    source_count INT;
    corroboration_mult NUMERIC;
    independence_factor NUMERIC;
    shared_edges INT;
    total_edges INT;
BEGIN
    -- Get average score from all evidence sources
    SELECT AVG(final_confidence_score), COUNT(*)
    INTO avg_source_score, source_count
    FROM evidence_archive
    WHERE id = evidence_id;

    -- Corroboration multiplier
    corroboration_mult := CASE
        WHEN source_count = 1 THEN 1.0
        WHEN source_count = 2 THEN 1.15
        WHEN source_count >= 3 THEN 1.25
    END;

    -- Placeholder for independence factor (requires graph analysis)
    independence_factor := 0.95;  -- Would need cross-reference graph

    RETURN LEAST(
        COALESCE(avg_source_score, 0) * corroboration_mult * independence_factor,
        100.0
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Detect bidirectional links (A→B and B→A)
CREATE OR REPLACE FUNCTION has_bidirectional_link(
    node_a UUID,
    node_b UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM links
        WHERE (source_node_id = node_a AND target_node_id = node_b)
          AND EXISTS(
              SELECT 1 FROM links l2
              WHERE l2.source_node_id = node_b AND l2.target_node_id = node_a
          )
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Apply bidirectional penalty
CREATE OR REPLACE FUNCTION bidirectional_penalty(
    node_a UUID,
    node_b UUID
)
RETURNS NUMERIC AS $$
BEGIN
    IF has_bidirectional_link(node_a, node_b) THEN
        RETURN 0.5;  -- 50% weight for mutual citations
    ELSE
        RETURN 1.0;  -- Full weight for independent sources
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: MASTER CONFIDENCE CALCULATION FUNCTION
-- ============================================================================

-- Function: Calculate complete confidence score with all components
CREATE OR REPLACE FUNCTION calculate_evidence_confidence(
    evidence_id_param UUID,
    admiralty_source CHAR(1) DEFAULT 'F',
    admiralty_credibility INT DEFAULT 6,
    evidence_quality NUMERIC(5,2) DEFAULT 50,
    network_consensus NUMERIC(5,2) DEFAULT 50,
    cia_level VARCHAR DEFAULT 'LOW'
)
RETURNS TABLE (
    final_confidence NUMERIC(5,2),
    source_reliability_score NUMERIC(5,2),
    information_credibility_score NUMERIC(5,2),
    evidence_quality_score NUMERIC(5,2),
    network_consensus_score NUMERIC(5,2),
    temporal_freshness_score NUMERIC(5,2),
    admiralty_rating VARCHAR(2),
    calculation_timestamp TIMESTAMP
) AS $$
DECLARE
    v_source_score NUMERIC(5,2);
    v_credibility_score NUMERIC(5,2);
    v_evidence_score NUMERIC(5,2);
    v_network_score NUMERIC(5,2);
    v_temporal_score NUMERIC(5,2);
    v_final_score NUMERIC(5,2);
    v_days_since_verify INT;
    v_decay_type VARCHAR;
    v_temporal_base NUMERIC(5,2);
    v_now TIMESTAMP;
BEGIN
    v_now := NOW();

    -- Component 1: Source Reliability (30%)
    -- Average of: Admiralty Grade + CIA Confidence + Badge Tier
    v_source_score := (
        admiralty_source_score(admiralty_source) +
        cia_confidence_to_score(cia_level) +
        COALESCE((
            SELECT badge_tier_to_score(u.badge_tier)
            FROM users u
            WHERE u.id = (SELECT created_by FROM evidence_archive WHERE id = evidence_id_param)
        ), 20)
    ) / 3.0;

    -- Component 2: Information Credibility (25%)
    v_credibility_score := admiralty_credibility_score(admiralty_credibility);

    -- Component 3: Evidence Quality (20%)
    v_evidence_score := LEAST(evidence_quality, 100.0);

    -- Component 4: Network Consensus (15%)
    v_network_score := calculate_network_consensus(evidence_id_param);

    -- Component 5: Temporal Freshness (10%)
    SELECT
        EXTRACT(DAY FROM (v_now - confidence_calculation_timestamp))::INT,
        confidence_decay_type
    INTO v_days_since_verify, v_decay_type
    FROM evidence_archive
    WHERE id = evidence_id_param;

    v_temporal_base := COALESCE(network_consensus, 50);
    v_temporal_score := apply_temporal_decay(
        v_temporal_base,
        COALESCE(v_days_since_verify, 0),
        COALESCE(v_decay_type, 'linear')
    );

    -- FINAL CALCULATION
    v_final_score := (
        0.30 * v_source_score +
        0.25 * v_credibility_score +
        0.20 * v_evidence_score +
        0.15 * v_network_score +
        0.10 * v_temporal_score
    );

    RETURN QUERY SELECT
        LEAST(v_final_score, 100.0)::NUMERIC(5,2),
        LEAST(v_source_score, 100.0)::NUMERIC(5,2),
        LEAST(v_credibility_score, 100.0)::NUMERIC(5,2),
        LEAST(v_evidence_score, 100.0)::NUMERIC(5,2),
        LEAST(v_network_score, 100.0)::NUMERIC(5,2),
        LEAST(v_temporal_score, 100.0)::NUMERIC(5,2),
        admiralty_source || admiralty_credibility::VARCHAR,
        v_now;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 7: STORED PROCEDURE FOR BATCH CONFIDENCE UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_evidence_confidence_batch(
    evidence_ids UUID[],
    user_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    evidence_id UUID,
    old_confidence NUMERIC(5,2),
    new_confidence NUMERIC(5,2),
    change_amount NUMERIC(5,2),
    update_status VARCHAR
) AS $$
DECLARE
    v_evidence_id UUID;
    v_old_confidence NUMERIC(5,2);
    v_new_confidence NUMERIC(5,2);
    v_result RECORD;
BEGIN
    FOREACH v_evidence_id IN ARRAY evidence_ids
    LOOP
        -- Capture old confidence
        SELECT final_confidence_score INTO v_old_confidence
        FROM evidence_archive
        WHERE id = v_evidence_id;

        -- Calculate new confidence
        SELECT confidence.final_confidence INTO v_new_confidence
        FROM calculate_evidence_confidence(
            v_evidence_id,
            (SELECT admiralty_source_grade FROM evidence_archive WHERE id = v_evidence_id),
            (SELECT admiralty_credibility_grade FROM evidence_archive WHERE id = v_evidence_id),
            (SELECT evidence_quality_score FROM evidence_archive WHERE id = v_evidence_id),
            (SELECT network_consensus_score FROM evidence_archive WHERE id = v_evidence_id),
            'MODERATE'
        ) AS confidence;

        -- Update database
        UPDATE evidence_archive
        SET
            final_confidence_score = v_new_confidence,
            confidence_calculation_timestamp = NOW(),
            confidence_updated_by = COALESCE(user_id_param, auth.uid())
        WHERE id = v_evidence_id;

        -- Log audit trail
        INSERT INTO confidence_audit_log (
            evidence_id, old_score, new_score, reason, timestamp
        ) VALUES (
            v_evidence_id,
            v_old_confidence,
            v_new_confidence,
            'Batch recalculation',
            NOW()
        );

        -- Return results
        RETURN QUERY SELECT
            v_evidence_id,
            v_old_confidence,
            v_new_confidence,
            (v_new_confidence - COALESCE(v_old_confidence, 0))::NUMERIC(5,2),
            'SUCCESS'::VARCHAR;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: CALIBRATION MONITORING FUNCTIONS
-- ============================================================================

-- Table: Actual accuracy tracking
CREATE TABLE IF NOT EXISTS confidence_calibration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence_archive(id),
    stated_confidence NUMERIC(5,2),
    actual_accuracy BOOLEAN,  -- Verified accurate by Tier 2+ reviewer
    review_date TIMESTAMP DEFAULT NOW(),
    reviewer_id UUID REFERENCES auth.users(id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_calibration_confidence ON confidence_calibration_log(stated_confidence);

-- Function: Calculate Expected Calibration Error (ECE)
CREATE OR REPLACE FUNCTION calculate_ece(
    confidence_band_min NUMERIC,
    confidence_band_max NUMERIC,
    sample_period_days INT DEFAULT 30
)
RETURNS NUMERIC(5,3) AS $$
DECLARE
    avg_stated NUMERIC;
    avg_actual NUMERIC;
    count INT;
BEGIN
    SELECT
        AVG(stated_confidence),
        AVG(CASE WHEN actual_accuracy THEN 1.0 ELSE 0.0 END),
        COUNT(*)
    INTO avg_stated, avg_actual, count
    FROM confidence_calibration_log
    WHERE stated_confidence >= confidence_band_min
      AND stated_confidence < confidence_band_max
      AND review_date > NOW() - (sample_period_days || ' days')::INTERVAL;

    IF count < 5 THEN
        RETURN NULL;  -- Insufficient samples
    END IF;

    RETURN ABS(avg_stated - (avg_actual * 100.0));
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Brier Score (mean squared error)
CREATE OR REPLACE FUNCTION calculate_brier_score(
    sample_period_days INT DEFAULT 30
)
RETURNS NUMERIC(5,3) AS $$
DECLARE
    brier NUMERIC;
BEGIN
    SELECT AVG(
        POWER(
            (stated_confidence / 100.0) -
            (CASE WHEN actual_accuracy THEN 1.0 ELSE 0.0 END),
            2
        )
    )
    INTO brier
    FROM confidence_calibration_log
    WHERE review_date > NOW() - (sample_period_days || ' days')::INTERVAL;

    RETURN COALESCE(brier, 0.5);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: CHAIN OF CUSTODY VERIFICATION
-- ============================================================================

-- Function: Generate SHA-256 hash of chain-of-custody audit trail
CREATE OR REPLACE FUNCTION generate_chain_of_custody_hash(
    evidence_id_param UUID
)
RETURNS VARCHAR(256) AS $$
DECLARE
    v_audit_text TEXT;
    v_hash VARCHAR(256);
BEGIN
    -- Concatenate all audit entries in chronological order
    SELECT STRING_AGG(
        evidence_id || '|' || old_score || '|' || new_score || '|' ||
        reason || '|' || timestamp::VARCHAR,
        '|||'
        ORDER BY timestamp
    )
    INTO v_audit_text
    FROM confidence_audit_log
    WHERE evidence_id = evidence_id_param;

    -- Generate SHA-256 hash (requires pgcrypto extension)
    v_hash := encode(digest(COALESCE(v_audit_text, ''), 'sha256'), 'hex');

    RETURN v_hash;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 10: BAYESIAN UPDATING FUNCTION
-- ============================================================================

-- Function: Apply Bayesian update with likelihood ratios
-- Returns: Prior odds → Likelihood Ratio → Posterior odds
CREATE OR REPLACE FUNCTION bayesian_update(
    prior_probability NUMERIC,  -- 0-1
    likelihood_ratio NUMERIC    -- P(Evidence|Hypothesis) / P(Evidence|~Hypothesis)
)
RETURNS TABLE (
    prior_odds NUMERIC,
    likelihood_ratio_result NUMERIC,
    posterior_odds NUMERIC,
    posterior_probability NUMERIC(5,3)
) AS $$
DECLARE
    v_prior_odds NUMERIC;
    v_posterior_odds NUMERIC;
BEGIN
    -- Convert probability to odds
    v_prior_odds := prior_probability / (1 - prior_probability);

    -- Multiply by likelihood ratio
    v_posterior_odds := v_prior_odds * likelihood_ratio;

    RETURN QUERY SELECT
        v_prior_odds,
        likelihood_ratio,
        v_posterior_odds,
        (v_posterior_odds / (1 + v_posterior_odds))::NUMERIC(5,3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Combine multiple Bayesian updates (independent sources)
CREATE OR REPLACE FUNCTION bayesian_update_multiple(
    prior_probability NUMERIC,
    likelihood_ratios NUMERIC[]
)
RETURNS TABLE (
    prior_odds NUMERIC,
    combined_likelihood_ratio NUMERIC,
    posterior_odds NUMERIC,
    posterior_probability NUMERIC(5,3)
) AS $$
DECLARE
    v_prior_odds NUMERIC;
    v_combined_lr NUMERIC := 1.0;
    v_lr NUMERIC;
    i INT;
BEGIN
    -- Convert probability to odds
    v_prior_odds := prior_probability / (1 - prior_probability);

    -- Multiply all likelihood ratios together
    FOR i IN 1..array_length(likelihood_ratios, 1)
    LOOP
        v_lr := likelihood_ratios[i];
        v_combined_lr := v_combined_lr * v_lr;
    END LOOP;

    RETURN QUERY SELECT
        v_prior_odds,
        v_combined_lr,
        v_prior_odds * v_combined_lr,
        ((v_prior_odds * v_combined_lr) / (1 + (v_prior_odds * v_combined_lr)))::NUMERIC(5,3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 11: API VIEW FOR CONFIDENCE QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW evidence_confidence_summary AS
SELECT
    e.id,
    e.title,
    e.final_confidence_score,
    e.admiralty_source_grade,
    e.admiralty_credibility_grade,
    CASE
        WHEN e.final_confidence_score >= 80 THEN 'VERIFIED'
        WHEN e.final_confidence_score >= 70 THEN 'LIKELY'
        WHEN e.final_confidence_score >= 60 THEN 'PROBABLE'
        WHEN e.final_confidence_score >= 50 THEN 'POSSIBLE'
        WHEN e.final_confidence_score >= 30 THEN 'UNLIKELY'
        ELSE 'DISPUTED'
    END AS confidence_label,
    CASE
        WHEN e.final_confidence_score >= 80 THEN '⭐⭐⭐⭐⭐'
        WHEN e.final_confidence_score >= 70 THEN '⭐⭐⭐⭐'
        WHEN e.final_confidence_score >= 60 THEN '⭐⭐⭐'
        WHEN e.final_confidence_score >= 50 THEN '⭐⭐'
        WHEN e.final_confidence_score >= 30 THEN '⭐'
        ELSE '✗'
    END AS confidence_stars,
    e.confidence_calculation_timestamp,
    EXTRACT(DAY FROM (NOW() - e.confidence_calculation_timestamp))::INT AS days_since_calculation,
    u.badge_tier,
    n.network_id
FROM evidence_archive e
LEFT JOIN users u ON e.created_by = u.id
LEFT JOIN nodes n ON e.associated_node_id = n.id;

-- ============================================================================
-- PART 12: EXAMPLE QUERIES
-- ============================================================================

/*
-- Example 1: Calculate confidence for single evidence
SELECT * FROM calculate_evidence_confidence(
    'evidence-uuid-here',
    'A'::CHAR(1),
    2::INT,
    85.0::NUMERIC,
    75.0::NUMERIC,
    'MODERATE'::VARCHAR
);

-- Example 2: Update confidence scores for entire network
SELECT * FROM update_evidence_confidence_batch(
    ARRAY['evidence-id-1', 'evidence-id-2', 'evidence-id-3'],
    'user-id-here'::UUID
);

-- Example 3: Check calibration for 80-89% confidence band
SELECT
    confidence_band_min,
    confidence_band_max,
    calculate_ece(80, 89, 30) AS ece_percent,
    calculate_brier_score(30) AS brier_score,
    CASE
        WHEN calculate_ece(80, 89, 30) < 0.15 THEN 'Well-calibrated'
        WHEN calculate_ece(80, 89, 30) < 0.25 THEN 'Acceptable'
        ELSE 'Recalibration needed'
    END AS status;

-- Example 4: Bayesian update with single evidence
SELECT *
FROM bayesian_update(
    0.30::NUMERIC,  -- Prior: 30% likely defendant guilty
    5.0::NUMERIC    -- LR: DNA evidence 5x more likely if guilty
);

-- Example 5: Combine multiple independent sources
SELECT *
FROM bayesian_update_multiple(
    0.40::NUMERIC,
    ARRAY[3.5, 5.0, 10.0]::NUMERIC[]
);

-- Example 6: Query confidence summary by tier
SELECT
    badge_tier,
    COUNT(*) AS total_evidence,
    AVG(final_confidence_score) AS avg_confidence,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_confidence_score) AS median_confidence,
    COUNT(*) FILTER (WHERE final_confidence_score >= 80) AS high_confidence_count
FROM evidence_confidence_summary
GROUP BY badge_tier
ORDER BY badge_tier;

-- Example 7: Identify overconfident assessments
SELECT
    evidence_id,
    stated_confidence,
    AVG(CASE WHEN actual_accuracy THEN 100 ELSE 0 END) AS actual_accuracy_percent,
    stated_confidence - AVG(CASE WHEN actual_accuracy THEN 100 ELSE 0 END) AS over_confidence_bias
FROM confidence_calibration_log
GROUP BY evidence_id, stated_confidence
HAVING AVG(CASE WHEN actual_accuracy THEN 100 ELSE 0 END) < stated_confidence - 10
ORDER BY over_confidence_bias DESC;
*/

-- ============================================================================
-- PART 13: GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to view confidence summary
GRANT SELECT ON evidence_confidence_summary TO authenticated;

-- Allow Tier 2+ to update confidence scores
GRANT EXECUTE ON FUNCTION calculate_evidence_confidence TO authenticated;

-- Only admins can run batch updates
GRANT EXECUTE ON FUNCTION update_evidence_confidence_batch TO service_role;

-- Everyone can read calibration info
GRANT SELECT ON confidence_calibration_log TO authenticated;
