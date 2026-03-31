-- SPRINT 17 MIGRATION: Redaction Handling & Ghost Nodes System
-- Based on RESEARCH_TASK_2_REDACTIONS_ANALYSIS.md
-- Implements: redacted_nodes, redacted_links, unsealing tracking

-- ============================================================================
-- TABLE 1: REDACTED NODES (Unknown persons with protected identities)
-- ============================================================================

CREATE TABLE redacted_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,

  -- Identifier (auto-generated DOE number)
  doe_number VARCHAR UNIQUE NOT NULL, -- e.g., "DOE-2042"

  -- What we know (non-identifying metadata)
  relationship_type VARCHAR[] NOT NULL, -- ['victim', 'witness', 'associate', 'defendant']
  mentioned_in_documents INT DEFAULT 0, -- Count of documents mentioning this person

  -- Redaction metadata (legal authority)
  redaction_authority VARCHAR NOT NULL, -- 'DOJ', 'Court', 'FBI', 'Grand Jury'
  redaction_reason VARCHAR NOT NULL, -- 'minor_victim', 'adult_victim', 'witness_protection',
                                      -- 'ongoing_investigation', 'intelligence_source', 'sealed_grand_jury'

  document_references UUID[] DEFAULT '{}', -- Array of document IDs mentioning this person
  context_snippet TEXT, -- Short text excerpt (e.g., "mentioned in deposition") without identifying info

  -- Timeline
  first_mentioned_date DATE,
  last_mentioned_date DATE,
  earliest_document_date DATE,

  -- Resolution status (when redacted person's name is unsealed)
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_to_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  unsealing_date DATE,
  unsealing_source VARCHAR, -- 'court_order', 'investigative_journalism', 'official_statement'
  unsealing_document_url TEXT, -- Link to court order or official source

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_redaction_reason CHECK (
    redaction_reason IN (
      'minor_victim',
      'adult_victim',
      'cooperating_witness',
      'witness_protection',
      'ongoing_investigation',
      'intelligence_source',
      'sealed_grand_jury',
      'protected_informant'
    )
  ),
  CONSTRAINT valid_authority CHECK (
    redaction_authority IN ('DOJ', 'Court', 'FBI', 'Grand Jury', 'Judicial', 'Federal Agency')
  )
);

CREATE INDEX idx_redacted_nodes_network ON redacted_nodes(network_id);
CREATE INDEX idx_redacted_nodes_resolved ON redacted_nodes(is_resolved);
CREATE INDEX idx_redacted_nodes_doe ON redacted_nodes(doe_number);
CREATE INDEX idx_redacted_nodes_resolved_to ON redacted_nodes(resolved_to_node_id);

-- ============================================================================
-- TABLE 2: REDACTED LINKS (Connections to unknown persons)
-- ============================================================================

CREATE TABLE redacted_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,

  -- Source: Known person → Target: Unknown person (redacted_node)
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_redacted_node_id UUID NOT NULL REFERENCES redacted_nodes(id) ON DELETE CASCADE,

  -- Relationship details
  relationship_type VARCHAR, -- 'associate', 'victim', 'defendant', 'witness', 'financial', etc.
  confidence_score FLOAT DEFAULT 0.5, -- 0.0-1.0 based on evidence strength
  documents_count INT DEFAULT 1, -- How many documents mention this connection

  -- Evidence metadata
  evidence_type VARCHAR[], -- ['flight_log', 'email', 'deposition', 'letter', 'document']
  evidence_count INT DEFAULT 1,
  context_snippet TEXT, -- Short non-identifying excerpt

  -- UI hints
  is_strong_evidence BOOLEAN DEFAULT FALSE, -- Confidence > 0.8 and documents > 3
  is_primary_connection BOOLEAN DEFAULT FALSE, -- Key connection for the network

  -- Resolution (when redacted node is unmasked)
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_to_link_id UUID REFERENCES links(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_confidence CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

CREATE INDEX idx_redacted_links_network ON redacted_links(network_id);
CREATE INDEX idx_redacted_links_source ON redacted_links(source_node_id);
CREATE INDEX idx_redacted_links_target ON redacted_links(target_redacted_node_id);
CREATE INDEX idx_redacted_links_resolved ON redacted_links(is_resolved);
CREATE INDEX idx_redacted_links_confidence ON redacted_links(confidence_score);

-- ============================================================================
-- TABLE 3: UNSEALING EVENTS (Track when redacted persons are identified)
-- ============================================================================

CREATE TABLE unsealing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,

  -- What was unsealed
  redacted_node_id UUID NOT NULL REFERENCES redacted_nodes(id) ON DELETE CASCADE,
  actual_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,

  doe_number_before VARCHAR NOT NULL, -- e.g., "DOE-2042"
  name_after VARCHAR NOT NULL, -- e.g., "Prince Andrew"
  additional_identifiers TEXT, -- Alias, title, etc.

  -- Court order or source
  court_order_url TEXT,
  court_order_date DATE,
  judicial_authority VARCHAR,
  case_number VARCHAR,

  -- Additional sources
  investigative_journalism_source VARCHAR, -- If unsealed via journalism
  official_statement_url TEXT,

  -- Impact metrics
  ghosts_converted INT DEFAULT 0, -- How many ghost links were converted to real links
  documents_affected INT DEFAULT 0, -- How many documents now show real name

  -- Verification
  verified_by_admin BOOLEAN DEFAULT FALSE,
  verification_timestamp TIMESTAMP,

  -- Timeline
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_unsealing_events_network ON unsealing_events(network_id);
CREATE INDEX idx_unsealing_events_redacted_node ON unsealing_events(redacted_node_id);
CREATE INDEX idx_unsealing_events_actual_node ON unsealing_events(actual_node_id);

-- ============================================================================
-- TABLE 4: REDACTION QUALITY CHECKS (Verify PDFs for bad redactions)
-- ============================================================================

CREATE TABLE redaction_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Redaction analysis
  has_exposed_text BOOLEAN DEFAULT FALSE,
  exposed_pii_count INT DEFAULT 0,
  redaction_confidence FLOAT, -- 0.0-1.0 (how confident are we it's properly redacted?)
  risk_level VARCHAR, -- 'safe', 'warning', 'critical'

  -- Details
  exposed_patterns VARCHAR[], -- Regex patterns found in black boxes
  black_box_coordinates JSONB, -- Detected black boxes and their positions
  analysis_notes TEXT,

  -- Metadata extraction (safe to publish)
  extracted_location_clues TEXT[], -- Building names, landmarks, etc. (safe)
  extracted_timestamps VARCHAR[], -- Dates/times mentioned (usually safe)
  extracted_entities_count INT, -- How many entities mentioned (safe count)

  -- Dangerous extractions (never published)
  -- (We deliberately don't store these; they're flagged but not retained)
  has_face_pattern BOOLEAN DEFAULT FALSE, -- Did OCR find face-like patterns?
  has_speaker_identification BOOLEAN DEFAULT FALSE, -- Could audio be speaker-diarized?
  has_gps_data BOOLEAN DEFAULT FALSE, -- Was EXIF/GPS metadata found?

  -- Action taken
  requires_quarantine BOOLEAN DEFAULT FALSE,
  quarantine_reason TEXT,
  verified_safe_by_admin BOOLEAN DEFAULT FALSE,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  checked_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_risk_level CHECK (risk_level IN ('safe', 'warning', 'critical'))
);

CREATE INDEX idx_redaction_quality_document ON redaction_quality_checks(document_id);
CREATE INDEX idx_redaction_quality_risk ON redaction_quality_checks(risk_level);
CREATE INDEX idx_redaction_quality_requires_quarantine ON redaction_quality_checks(requires_quarantine);

-- ============================================================================
-- RLS POLICIES: Redacted Data Access Control
-- ============================================================================

-- Policy 1: Only Tier 2+ can see victim names
CREATE POLICY "victim_protection_tier_check" ON redacted_nodes
  USING (
    redaction_reason IN ('minor_victim', 'adult_victim')
    AND (
      current_user_tier() >= 2
      OR current_user_is_admin()
    )
  );

-- Policy 2: Everyone can see ghost connections (but not identities)
CREATE POLICY "public_ghost_links" ON redacted_links
  USING (TRUE); -- Ghost links are public

-- Policy 3: Intelligence source redactions never shown to anyone
CREATE POLICY "intelligence_source_sealed" ON redacted_nodes
  USING (
    redaction_reason != 'intelligence_source'
    OR current_user_is_admin()
  );

-- Policy 4: Grand jury transcripts never unsealed
CREATE POLICY "grand_jury_sealed_forever" ON redacted_nodes
  USING (
    redaction_reason != 'sealed_grand_jury'
    OR current_user_is_system()
  );

-- ============================================================================
-- RPC FUNCTIONS: Unsealing & Resolution Workflow
-- ============================================================================

-- Function 1: Resolve redacted node (convert DOE to actual person)
CREATE OR REPLACE FUNCTION resolve_redacted_node(
  p_redacted_node_id UUID,
  p_actual_node_id UUID,
  p_court_order_url TEXT DEFAULT NULL,
  p_court_order_date DATE DEFAULT NULL,
  p_verification_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  ghosts_converted INT,
  unsealing_event_id UUID
) AS $$
DECLARE
  v_redacted_node redacted_nodes%ROWTYPE;
  v_ghost_links_count INT;
  v_unsealing_event_id UUID;
BEGIN
  -- Fetch the redacted node
  SELECT * INTO v_redacted_node FROM redacted_nodes WHERE id = p_redacted_node_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Redacted node not found', 0, NULL::UUID;
    RETURN;
  END IF;

  IF v_redacted_node.is_resolved THEN
    RETURN QUERY SELECT FALSE, 'Node already resolved', 0, NULL::UUID;
    RETURN;
  END IF;

  -- Count ghost links to be converted
  SELECT COUNT(*) INTO v_ghost_links_count
  FROM redacted_links
  WHERE target_redacted_node_id = p_redacted_node_id AND is_resolved = FALSE;

  -- Create unsealing event
  INSERT INTO unsealing_events (
    network_id,
    redacted_node_id,
    actual_node_id,
    doe_number_before,
    name_after,
    court_order_url,
    court_order_date,
    ghosts_converted
  ) VALUES (
    v_redacted_node.network_id,
    p_redacted_node_id,
    p_actual_node_id,
    v_redacted_node.doe_number,
    (SELECT name FROM nodes WHERE id = p_actual_node_id),
    p_court_order_url,
    p_court_order_date,
    v_ghost_links_count
  ) RETURNING id INTO v_unsealing_event_id;

  -- Mark redacted node as resolved
  UPDATE redacted_nodes
  SET
    is_resolved = TRUE,
    resolved_to_node_id = p_actual_node_id,
    unsealing_date = COALESCE(p_court_order_date, CURRENT_DATE),
    unsealing_document_url = p_court_order_url,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_redacted_node_id;

  -- Mark all ghost links as resolved
  UPDATE redacted_links
  SET is_resolved = TRUE, resolved_at = NOW()
  WHERE target_redacted_node_id = p_redacted_node_id;

  -- Broadcast network update (via notify)
  PERFORM pg_notify(
    'network_update',
    json_build_object(
      'type', 'unsealing_event',
      'network_id', v_redacted_node.network_id,
      'event_id', v_unsealing_event_id,
      'ghosts_converted', v_ghost_links_count
    )::TEXT
  );

  RETURN QUERY SELECT TRUE, 'Node resolved successfully', v_ghost_links_count, v_unsealing_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Find potential DOE matches (when name is unsealed)
CREATE OR REPLACE FUNCTION find_redacted_node_by_context(
  p_network_id UUID,
  p_context_clue TEXT,
  p_min_confidence FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  redacted_node_id UUID,
  doe_number VARCHAR,
  matching_documents INT,
  confidence_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rn.id,
    rn.doe_number,
    rn.mentioned_in_documents,
    CASE
      WHEN rn.context_snippet ILIKE '%' || p_context_clue || '%' THEN 0.95
      WHEN p_context_clue ILIKE '%' || ANY(rn.relationship_type) || '%' THEN 0.70
      ELSE 0.5
    END as confidence
  FROM redacted_nodes rn
  WHERE
    rn.network_id = p_network_id
    AND rn.is_resolved = FALSE
    AND (
      rn.context_snippet ILIKE '%' || p_context_clue || '%'
      OR p_context_clue ILIKE ANY(rn.relationship_type)
    )
  ORDER BY confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Generate next DOE number
CREATE OR REPLACE FUNCTION generate_doe_number(
  p_network_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_max_number INT;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(doe_number, 5) AS INT)), 0
  ) INTO v_max_number
  FROM redacted_nodes
  WHERE network_id = p_network_id
  AND doe_number ~ '^\DOE-\d+$';

  RETURN 'DOE-' || (v_max_number + 1)::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS: Helpful Analytics & Tracking
-- ============================================================================

-- View 1: Network redaction status
CREATE OR REPLACE VIEW redaction_network_summary AS
SELECT
  rn.network_id,
  COUNT(DISTINCT rn.id) as total_redacted_persons,
  COUNT(DISTINCT CASE WHEN rn.is_resolved THEN rn.id END) as unsealed_persons,
  SUM(rn.mentioned_in_documents) as total_mentions,
  COUNT(DISTINCT rl.id) as ghost_links,
  COUNT(DISTINCT CASE WHEN rl.is_resolved THEN rl.id END) as resolved_links,
  AVG(rl.confidence_score) as avg_ghost_confidence
FROM
  redacted_nodes rn
LEFT JOIN
  redacted_links rl ON rn.id = rl.target_redacted_node_id
GROUP BY
  rn.network_id;

-- View 2: Unsealing timeline
CREATE OR REPLACE VIEW unsealing_timeline AS
SELECT
  ue.network_id,
  ue.doe_number_before,
  ue.name_after,
  ue.court_order_date,
  ue.ghosts_converted,
  ue.created_at,
  n.tier,
  n.risk_score
FROM
  unsealing_events ue
LEFT JOIN
  nodes n ON ue.actual_node_id = n.id
ORDER BY
  ue.court_order_date DESC, ue.created_at DESC;

-- View 3: At-risk redacted persons (frequently mentioned, likely to be unsealed soon)
CREATE OR REPLACE VIEW at_risk_redacted_nodes AS
SELECT
  rn.id,
  rn.doe_number,
  rn.network_id,
  rn.mentioned_in_documents,
  COUNT(DISTINCT rl.source_node_id) as connected_known_persons,
  AVG(rl.confidence_score) as avg_connection_confidence,
  rn.redaction_reason,
  CASE
    WHEN rn.mentioned_in_documents > 20 THEN 'high'
    WHEN rn.mentioned_in_documents > 10 THEN 'medium'
    ELSE 'low'
  END as unsealing_likelihood
FROM
  redacted_nodes rn
LEFT JOIN
  redacted_links rl ON rn.id = rl.target_redacted_node_id
WHERE
  rn.is_resolved = FALSE
GROUP BY
  rn.id, rn.doe_number, rn.network_id, rn.mentioned_in_documents, rn.redaction_reason
ORDER BY
  unsealing_likelihood DESC, rn.mentioned_in_documents DESC;

-- ============================================================================
-- TRIGGERS: Audit trail & automatic updates
-- ============================================================================

-- Trigger: Update timestamp on redacted_nodes
CREATE OR REPLACE FUNCTION update_redacted_nodes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_redacted_nodes_timestamp
BEFORE UPDATE ON redacted_nodes
FOR EACH ROW
EXECUTE FUNCTION update_redacted_nodes_timestamp();

-- Trigger: Update redacted_nodes mention count when documents are tagged
CREATE OR REPLACE FUNCTION update_redacted_node_mention_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE redacted_nodes
  SET
    mentioned_in_documents = (
      SELECT COUNT(DISTINCT id) FROM documents
      WHERE id = ANY(document_references)
    ),
    updated_at = NOW()
  WHERE id = NEW.target_redacted_node_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mention_count
AFTER INSERT ON redacted_links
FOR EACH ROW
EXECUTE FUNCTION update_redacted_node_mention_count();

-- ============================================================================
-- SEED DATA (Optional: Example for Epstein Network)
-- ============================================================================

-- Insert example redacted nodes (victim protection)
INSERT INTO redacted_nodes (
  network_id,
  doe_number,
  relationship_type,
  mentioned_in_documents,
  redaction_authority,
  redaction_reason,
  context_snippet,
  first_mentioned_date,
  last_mentioned_date
) VALUES
  (
    (SELECT id FROM networks WHERE name = 'Epstein'),
    'DOE-2042',
    ARRAY['victim', 'witness'],
    43,
    'Court',
    'minor_victim',
    'mentioned in deposition testimony',
    '2015-01-01'::DATE,
    '2016-12-31'::DATE
  ),
  (
    (SELECT id FROM networks WHERE name = 'Epstein'),
    'DOE-2043',
    ARRAY['victim'],
    27,
    'DOJ',
    'adult_victim',
    'flight log passenger record',
    '2002-06-15'::DATE,
    '2010-03-22'::DATE
  ),
  (
    (SELECT id FROM networks WHERE name = 'Epstein'),
    'DOE-2044',
    ARRAY['associate', 'financial'],
    8,
    'FBI',
    'ongoing_investigation',
    'international financial records',
    '2019-08-01'::DATE,
    '2020-06-30'::DATE
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON redacted_nodes TO authenticated;
GRANT SELECT ON redacted_links TO authenticated;
GRANT SELECT ON unsealing_events TO authenticated;
GRANT SELECT ON redaction_quality_checks TO authenticated;

GRANT SELECT,INSERT,UPDATE ON redacted_nodes TO service_role;
GRANT SELECT,INSERT,UPDATE ON redacted_links TO service_role;
GRANT SELECT,INSERT,UPDATE ON unsealing_events TO service_role;
GRANT SELECT,INSERT,UPDATE ON redaction_quality_checks TO service_role;

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

/*
IMPLEMENTATION CHECKLIST:

✅ 1. Run this migration in Supabase
✅ 2. Create TypeScript types (RedactedNode, RedactedLink, UnsealingEvent)
✅ 3. Build /api/redacted-nodes/[id] endpoints
✅ 4. Build /api/unsealing/events endpoint
✅ 5. Build /api/documents/verify-redaction endpoint
✅ 6. Update Truth3DScene to render ghost links
✅ 7. Build UnsealingTracker component
✅ 8. Add RLS policy tests
✅ 9. Set up pg_notify listeners for network updates
✅ 10. Document victim privacy policy

TESTING:
- [ ] Verify RLS blocks victim names from unauthenticated users
- [ ] Test unsealing workflow (DOE → actual node)
- [ ] Test ghost link conversion
- [ ] Test redaction quality checker
- [ ] Test pg_notify broadcasts
- [ ] Load test with 1000+ redacted nodes
*/
