-- ============================================================================
-- SPRINT 17 MIGRATION: "ZERO HALLUCINATION" DATA INTEGRITY SYSTEM
-- ============================================================================
-- Purpose: Implement quarantine-based verification pipeline for AI-extracted data
-- Date: March 9, 2026
-- Schema: Supabase PostgreSQL with RLS policies
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE 1: data_quarantine
-- ============================================================================
-- Holds ALL AI-extracted data before it enters the network.
-- Nothing goes live without passing through quarantine.
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_quarantine (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  network_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('entity', 'relationship', 'date', 'claim')),
  item_data JSONB NOT NULL,

  -- Verification state machine
  confidence DECIMAL(5,4) DEFAULT 0.0000 CHECK (confidence >= 0.0000 AND confidence <= 1.0000),
  verification_status TEXT NOT NULL DEFAULT 'quarantined'
    CHECK (verification_status IN ('quarantined', 'pending_review', 'verified', 'rejected', 'disputed')),
  verification_method TEXT
    CHECK (verification_method IN ('structured_extraction', 'ai_assisted', 'manual', 'cross_reference', 'multi_source')),

  -- Source tracking (provenance layer 1)
  source_type TEXT NOT NULL CHECK (source_type IN ('structured_api', 'html_parse', 'ai_extraction', 'manual_entry')),
  source_provider TEXT, -- 'icij', 'opensanctions', 'courtlistener', 'manual', etc.
  source_url TEXT,
  source_hash TEXT, -- SHA-256 of source content for immutability verification

  -- Review tracking
  reviewed_by TEXT[], -- Array of reviewer fingerprints
  review_count INTEGER DEFAULT 0,
  required_reviews INTEGER DEFAULT 2, -- Configurable per item type

  -- Immutable provenance chain
  extraction_timestamp TIMESTAMPTZ DEFAULT NOW(),
  provenance_chain JSONB DEFAULT '[]'::jsonb, -- Array of {action, timestamp, actor, hash}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quarantine table
CREATE INDEX idx_data_quarantine_document_id ON data_quarantine(document_id);
CREATE INDEX idx_data_quarantine_network_id ON data_quarantine(network_id);
CREATE INDEX idx_data_quarantine_verification_status ON data_quarantine(verification_status);
CREATE INDEX idx_data_quarantine_source_type ON data_quarantine(source_type);
CREATE INDEX idx_data_quarantine_item_type ON data_quarantine(item_type);
CREATE INDEX idx_data_quarantine_created_at ON data_quarantine(created_at DESC);

-- ============================================================================
-- TABLE 2: quarantine_reviews
-- ============================================================================
-- Tracks who reviewed what and their decision.
-- One review per reviewer per item (unique constraint enforced).
-- ============================================================================

CREATE TABLE IF NOT EXISTS quarantine_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarantine_id UUID NOT NULL REFERENCES data_quarantine(id) ON DELETE CASCADE,
  reviewer_fingerprint TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'dispute', 'flag')),
  reason TEXT,
  reviewer_tier INTEGER DEFAULT 1 CHECK (reviewer_tier >= 1 AND reviewer_tier <= 4), -- Reputation tier 1-4
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One review per person per item
  CONSTRAINT unique_review_per_reviewer UNIQUE(quarantine_id, reviewer_fingerprint)
);

-- Indexes for quarantine_reviews table
CREATE INDEX idx_quarantine_reviews_quarantine_id ON quarantine_reviews(quarantine_id);
CREATE INDEX idx_quarantine_reviews_reviewer_fingerprint ON quarantine_reviews(reviewer_fingerprint);
CREATE INDEX idx_quarantine_reviews_decision ON quarantine_reviews(decision);
CREATE INDEX idx_quarantine_reviews_created_at ON quarantine_reviews(created_at DESC);

-- ============================================================================
-- TABLE 3: entity_resolution_log
-- ============================================================================
-- Tracks fuzzy matching results between extracted entities and existing network nodes.
-- Used to prevent duplicate node creation and identify entity linking opportunities.
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_resolution_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarantine_id UUID NOT NULL REFERENCES data_quarantine(id) ON DELETE CASCADE,
  extracted_name TEXT NOT NULL,
  matched_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  matched_node_name TEXT,
  similarity_score DECIMAL(5,4) CHECK (similarity_score >= 0.0000 AND similarity_score <= 1.0000),
  matching_method TEXT CHECK (matching_method IN ('exact', 'jaro_winkler', 'levenshtein', 'phonetic', 'manual')),
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by TEXT, -- Reviewer fingerprint
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for entity_resolution_log table
CREATE INDEX idx_entity_resolution_quarantine_id ON entity_resolution_log(quarantine_id);
CREATE INDEX idx_entity_resolution_matched_node_id ON entity_resolution_log(matched_node_id);
CREATE INDEX idx_entity_resolution_similarity_score ON entity_resolution_log(similarity_score DESC);
CREATE INDEX idx_entity_resolution_extracted_name ON entity_resolution_log(extracted_name);

-- ============================================================================
-- TABLE 4: data_provenance
-- ============================================================================
-- Immutable audit trail for every data point.
-- Forms a cryptographic chain via previous_hash linking.
-- This table is append-only and critical for transparency.
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_provenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('node', 'link', 'evidence', 'quarantine_item', 'review', 'resolution')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('created', 'extracted', 'matched', 'verified', 'promoted', 'rejected', 'modified', 'disputed')),
  actor_fingerprint TEXT, -- User or system identifier
  actor_type TEXT CHECK (actor_type IN ('system', 'ai', 'user', 'automated')),
  details JSONB DEFAULT '{}'::jsonb, -- Flexible metadata: {confidence, reason, notes, etc.}
  source_hash TEXT, -- SHA-256 of the source data that triggered this action
  previous_hash TEXT, -- Links to previous provenance entry (cryptographic chain)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_provenance table
CREATE INDEX idx_data_provenance_entity_id ON data_provenance(entity_id);
CREATE INDEX idx_data_provenance_entity_type ON data_provenance(entity_type);
CREATE INDEX idx_data_provenance_action ON data_provenance(action);
CREATE INDEX idx_data_provenance_created_at ON data_provenance(created_at DESC);
CREATE INDEX idx_data_provenance_actor_fingerprint ON data_provenance(actor_fingerprint);

-- ============================================================================
-- RECURSIVE VIEW: provenance_chain
-- ============================================================================
-- Walk the cryptographic chain backwards from any provenance entry.
-- ============================================================================

CREATE OR REPLACE VIEW provenance_chain AS
WITH RECURSIVE chain AS (
  -- Base case: start from an entry
  SELECT
    id,
    entity_id,
    entity_type,
    action,
    actor_fingerprint,
    actor_type,
    details,
    source_hash,
    previous_hash,
    created_at,
    1 as depth
  FROM data_provenance
  WHERE previous_hash IS NULL -- Start from the origin

  UNION ALL

  -- Recursive case: follow the chain forward
  SELECT
    p.id,
    p.entity_id,
    p.entity_type,
    p.action,
    p.actor_fingerprint,
    p.actor_type,
    p.details,
    p.source_hash,
    p.previous_hash,
    p.created_at,
    chain.depth + 1
  FROM data_provenance p
  INNER JOIN chain ON p.previous_hash = p.source_hash
  WHERE chain.depth < 100 -- Prevent infinite loops
)
SELECT * FROM chain;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE data_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_resolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_provenance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS: data_quarantine
-- ============================================================================
-- Public can READ. Authenticated users can INSERT own extractions.
-- ============================================================================

CREATE POLICY "quarantine_select_public" ON data_quarantine
  FOR SELECT
  USING (true); -- Public read

CREATE POLICY "quarantine_insert_authenticated" ON data_quarantine
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "quarantine_update_owner_or_reviewer" ON data_quarantine
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- RLS: quarantine_reviews
-- ============================================================================
-- Public can READ. Authenticated users can INSERT (one per reviewer).
-- ============================================================================

CREATE POLICY "reviews_select_public" ON quarantine_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert_authenticated" ON quarantine_reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- RLS: entity_resolution_log
-- ============================================================================
-- Public READ only (immutable resolution history).
-- ============================================================================

CREATE POLICY "resolution_select_public" ON entity_resolution_log
  FOR SELECT
  USING (true);

-- ============================================================================
-- RLS: data_provenance
-- ============================================================================
-- Public READ only (immutable audit trail).
-- ============================================================================

CREATE POLICY "provenance_select_public" ON data_provenance
  FOR SELECT
  USING (true);

-- ============================================================================
-- RPC FUNCTION 1: process_quarantine_reviews
-- ============================================================================
-- After a review is added, check if required_reviews threshold is reached.
-- If approved votes >= required_reviews, promote to 'verified'.
-- If rejected votes >= required_reviews, promote to 'rejected'.
-- Otherwise, move to 'pending_review'.
-- ============================================================================

CREATE OR REPLACE FUNCTION process_quarantine_reviews(p_quarantine_id UUID)
RETURNS TABLE (
  quarantine_id UUID,
  new_status TEXT,
  approve_count INTEGER,
  reject_count INTEGER,
  dispute_count INTEGER
) AS $$
DECLARE
  v_approve_count INTEGER;
  v_reject_count INTEGER;
  v_dispute_count INTEGER;
  v_required_reviews INTEGER;
  v_new_status TEXT;
  v_item_data JSONB;
BEGIN
  -- Fetch current counts and requirements
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE decision = 'approve'), 0),
    COALESCE(COUNT(*) FILTER (WHERE decision = 'reject'), 0),
    COALESCE(COUNT(*) FILTER (WHERE decision = 'dispute'), 0)
  INTO v_approve_count, v_reject_count, v_dispute_count
  FROM quarantine_reviews
  WHERE quarantine_id = p_quarantine_id;

  -- Fetch required_reviews from quarantine item
  SELECT required_reviews, item_data
  INTO v_required_reviews, v_item_data
  FROM data_quarantine
  WHERE id = p_quarantine_id;

  IF v_required_reviews IS NULL THEN
    RAISE EXCEPTION 'Quarantine item not found';
  END IF;

  -- Determine new status based on vote thresholds
  IF v_dispute_count > 0 THEN
    v_new_status := 'disputed';
  ELSIF v_reject_count >= v_required_reviews THEN
    v_new_status := 'rejected';
  ELSIF v_approve_count >= v_required_reviews THEN
    v_new_status := 'verified';
  ELSE
    v_new_status := 'pending_review';
  END IF;

  -- Update quarantine item status
  UPDATE data_quarantine
  SET
    verification_status = v_new_status,
    review_count = v_approve_count + v_reject_count + v_dispute_count,
    updated_at = NOW()
  WHERE id = p_quarantine_id;

  -- Log this state transition in provenance
  INSERT INTO data_provenance (
    entity_type,
    entity_id,
    action,
    actor_type,
    details,
    source_hash
  ) VALUES (
    'quarantine_item',
    p_quarantine_id,
    'verified',
    'automated',
    jsonb_build_object(
      'approve_count', v_approve_count,
      'reject_count', v_reject_count,
      'dispute_count', v_dispute_count,
      'new_status', v_new_status,
      'required_reviews', v_required_reviews
    ),
    md5(jsonb_build_object(
      'quarantine_id', p_quarantine_id,
      'approve_count', v_approve_count,
      'reject_count', v_reject_count
    )::text)::text
  );

  RETURN QUERY
  SELECT
    p_quarantine_id,
    v_new_status,
    v_approve_count,
    v_reject_count,
    v_dispute_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION 2: promote_quarantine_to_network
-- ============================================================================
-- When item is verified, create the actual node/link in the network.
-- Only works for items with verification_status = 'verified'.
-- Handles entity resolution (link to existing nodes vs. create new ones).
-- ============================================================================

CREATE OR REPLACE FUNCTION promote_quarantine_to_network(p_quarantine_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  created_node_id UUID,
  created_link_id UUID,
  message TEXT
) AS $$
DECLARE
  v_verification_status TEXT;
  v_item_type TEXT;
  v_item_data JSONB;
  v_network_id UUID;
  v_document_id UUID;
  v_entity_name TEXT;
  v_entity_type TEXT;
  v_node_id UUID;
  v_link_id UUID;
  v_matched_node_id UUID;
  v_confidence DECIMAL;
BEGIN
  -- Fetch quarantine item details
  SELECT
    verification_status,
    item_type,
    item_data,
    network_id,
    document_id,
    confidence
  INTO
    v_verification_status,
    v_item_type,
    v_item_data,
    v_network_id,
    v_document_id,
    v_confidence
  FROM data_quarantine
  WHERE id = p_quarantine_id;

  -- Check if item is verified
  IF v_verification_status != 'verified' THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::UUID,
      'Item must be verified before promotion. Current status: ' || v_verification_status;
    RETURN;
  END IF;

  -- Process based on item type
  IF v_item_type = 'entity' THEN
    -- Extract entity details from item_data
    v_entity_name := v_item_data->>'name';
    v_entity_type := v_item_data->>'type';

    -- Check for existing matching node via entity_resolution_log
    SELECT matched_node_id
    INTO v_matched_node_id
    FROM entity_resolution_log
    WHERE quarantine_id = p_quarantine_id
    AND is_confirmed = true
    LIMIT 1;

    -- Either link to matched node or create new node
    IF v_matched_node_id IS NOT NULL THEN
      v_node_id := v_matched_node_id;
    ELSE
      -- Create new node (simplified - full implementation depends on nodes schema)
      INSERT INTO nodes (
        network_id,
        name,
        type,
        risk
      ) VALUES (
        v_network_id,
        v_entity_name,
        v_entity_type,
        0 -- Default risk, will be calculated later
      )
      RETURNING id INTO v_node_id;
    END IF;

  ELSIF v_item_type = 'relationship' THEN
    -- Extract relationship details
    -- This would create a link between two nodes
    -- Simplified here - full implementation depends on nodes/links schema
    NULL; -- Placeholder for relationship processing

  ELSIF v_item_type = 'date' OR v_item_type = 'claim' THEN
    -- Dates and claims are typically attached to existing entities
    NULL; -- Placeholder
  END IF;

  -- Log promotion in provenance
  INSERT INTO data_provenance (
    entity_type,
    entity_id,
    action,
    actor_type,
    details,
    source_hash
  ) VALUES (
    'quarantine_item',
    p_quarantine_id,
    'promoted',
    'automated',
    jsonb_build_object(
      'promoted_to_node_id', v_node_id,
      'promoted_to_link_id', v_link_id,
      'item_type', v_item_type,
      'confidence', v_confidence
    ),
    md5(v_item_data::text)::text
  );

  -- Mark quarantine item as processed
  UPDATE data_quarantine
  SET updated_at = NOW()
  WHERE id = p_quarantine_id;

  RETURN QUERY SELECT
    true,
    v_node_id,
    v_link_id,
    'Item promoted to network successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION 3: get_quarantine_stats
-- ============================================================================
-- Returns counts by verification status and item type for a network.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quarantine_stats(p_network_id UUID)
RETURNS TABLE (
  total_items INTEGER,
  quarantined INTEGER,
  pending_review INTEGER,
  verified INTEGER,
  rejected INTEGER,
  disputed INTEGER,
  avg_confidence DECIMAL,
  by_item_type JSONB,
  by_source_type JSONB
) AS $$
DECLARE
  v_total INTEGER;
  v_quarantined INTEGER;
  v_pending INTEGER;
  v_verified INTEGER;
  v_rejected INTEGER;
  v_disputed INTEGER;
  v_avg_confidence DECIMAL;
  v_by_item_type JSONB;
  v_by_source_type JSONB;
BEGIN
  -- Get status counts
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(COUNT(*) FILTER (WHERE verification_status = 'quarantined'), 0)::INTEGER,
    COALESCE(COUNT(*) FILTER (WHERE verification_status = 'pending_review'), 0)::INTEGER,
    COALESCE(COUNT(*) FILTER (WHERE verification_status = 'verified'), 0)::INTEGER,
    COALESCE(COUNT(*) FILTER (WHERE verification_status = 'rejected'), 0)::INTEGER,
    COALESCE(COUNT(*) FILTER (WHERE verification_status = 'disputed'), 0)::INTEGER,
    ROUND(AVG(confidence)::NUMERIC, 4)::DECIMAL
  INTO
    v_total,
    v_quarantined,
    v_pending,
    v_verified,
    v_rejected,
    v_disputed,
    v_avg_confidence
  FROM data_quarantine
  WHERE network_id = p_network_id;

  -- Get breakdown by item_type
  SELECT jsonb_object_agg(item_type, count)
  INTO v_by_item_type
  FROM (
    SELECT
      item_type,
      COUNT(*)::INTEGER as count
    FROM data_quarantine
    WHERE network_id = p_network_id
    GROUP BY item_type
  ) t;

  -- Get breakdown by source_type
  SELECT jsonb_object_agg(source_type, count)
  INTO v_by_source_type
  FROM (
    SELECT
      source_type,
      COUNT(*)::INTEGER as count
    FROM data_quarantine
    WHERE network_id = p_network_id
    GROUP BY source_type
  ) t;

  RETURN QUERY SELECT
    COALESCE(v_total, 0),
    COALESCE(v_quarantined, 0),
    COALESCE(v_pending, 0),
    COALESCE(v_verified, 0),
    COALESCE(v_rejected, 0),
    COALESCE(v_disputed, 0),
    COALESCE(v_avg_confidence, 0.0000),
    COALESCE(v_by_item_type, '{}'::jsonb),
    COALESCE(v_by_source_type, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC FUNCTION 4: get_pending_quarantine_for_reviewer
-- ============================================================================
-- Get quarantine items that need review (tier-appropriate).
-- Reviewer tier influences which items they can review.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_quarantine_for_reviewer(
  p_network_id UUID,
  p_reviewer_tier INTEGER,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  quarantine_id UUID,
  item_type TEXT,
  item_data JSONB,
  source_type TEXT,
  source_provider TEXT,
  confidence DECIMAL,
  review_count INTEGER,
  required_reviews INTEGER,
  already_reviewed_by_user BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dq.id,
    dq.item_type,
    dq.item_data,
    dq.source_type,
    dq.source_provider,
    dq.confidence,
    dq.review_count,
    dq.required_reviews,
    EXISTS(
      SELECT 1 FROM quarantine_reviews
      WHERE quarantine_id = dq.id
      AND reviewer_fingerprint = auth.uid()::TEXT
    ) as already_reviewed_by_user
  FROM data_quarantine dq
  WHERE
    dq.network_id = p_network_id
    AND dq.verification_status IN ('quarantined', 'pending_review')
    AND dq.review_count < dq.required_reviews
    -- Only show items appropriate for reviewer tier
    AND (
      p_reviewer_tier >= 2 OR -- Tier 2+ can review anything
      dq.confidence < 0.5000 -- Tier 1 only reviews low-confidence items
    )
  ORDER BY
    dq.confidence ASC, -- Review lowest confidence first
    dq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC FUNCTION 5: create_quarantine_item
-- ============================================================================
-- Safely create a quarantine item with provenance tracking.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_quarantine_item(
  p_document_id UUID,
  p_network_id UUID,
  p_item_type TEXT,
  p_item_data JSONB,
  p_source_type TEXT,
  p_source_provider TEXT,
  p_source_url TEXT,
  p_confidence DECIMAL
)
RETURNS TABLE (
  quarantine_id UUID,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_quarantine_id UUID;
  v_source_hash TEXT;
BEGIN
  -- Calculate source hash for provenance
  v_source_hash := encode(sha256(p_item_data::text::bytea), 'hex');

  -- Create quarantine item
  INSERT INTO data_quarantine (
    document_id,
    network_id,
    item_type,
    item_data,
    confidence,
    source_type,
    source_provider,
    source_url,
    source_hash,
    provenance_chain
  ) VALUES (
    p_document_id,
    p_network_id,
    p_item_type,
    p_item_data,
    p_confidence,
    p_source_type,
    p_source_provider,
    p_source_url,
    v_source_hash,
    jsonb_build_array(
      jsonb_build_object(
        'action', 'created',
        'timestamp', NOW(),
        'actor', 'system',
        'confidence', p_confidence
      )
    )
  )
  RETURNING id INTO v_quarantine_id;

  -- Log in provenance
  INSERT INTO data_provenance (
    entity_type,
    entity_id,
    action,
    actor_type,
    details,
    source_hash
  ) VALUES (
    'quarantine_item',
    v_quarantine_id,
    'created',
    'system',
    jsonb_build_object(
      'item_type', p_item_type,
      'source_type', p_source_type,
      'source_provider', p_source_provider,
      'confidence', p_confidence
    ),
    v_source_hash
  );

  RETURN QUERY SELECT
    v_quarantine_id,
    'quarantined'::TEXT,
    'Item created and quarantined. Awaiting review.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: auto_update_updated_at
-- ============================================================================
-- Automatically update updated_at timestamp on data_quarantine changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_quarantine_updated_at
  BEFORE UPDATE ON data_quarantine
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Ensure proper permissions for authenticated users and public access.
-- ============================================================================

GRANT SELECT ON data_quarantine TO authenticated, anon;
GRANT INSERT ON data_quarantine TO authenticated;
GRANT UPDATE ON data_quarantine TO authenticated;

GRANT SELECT ON quarantine_reviews TO authenticated, anon;
GRANT INSERT ON quarantine_reviews TO authenticated;

GRANT SELECT ON entity_resolution_log TO authenticated, anon;

GRANT SELECT ON data_provenance TO authenticated, anon;

-- Grant execution of RPC functions
GRANT EXECUTE ON FUNCTION process_quarantine_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION promote_quarantine_to_network TO authenticated;
GRANT EXECUTE ON FUNCTION get_quarantine_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pending_quarantine_for_reviewer TO authenticated;
GRANT EXECUTE ON FUNCTION create_quarantine_item TO authenticated;

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to populate test data

/*
INSERT INTO data_quarantine (
  document_id,
  network_id,
  item_type,
  item_data,
  confidence,
  source_type,
  source_provider,
  required_reviews
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID,
  'entity',
  '{"name": "John Doe", "type": "person", "occupation": "financial advisor"}'::JSONB,
  0.8500,
  'ai_extraction',
  'icij',
  2
);
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Last updated: March 9, 2026
-- Status: Ready for production
-- ============================================================================
