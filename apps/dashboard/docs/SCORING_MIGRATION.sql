-- ============================================================================
-- SCORING DECISIONS AUDIT TABLE
-- Project Truth — 5-Layer Confidence Scoring Engine
-- Sprint Faz 0, Hafta 1
-- Date: 2026-03-22
-- ============================================================================

-- Immutable audit log for all scoring decisions.
-- Every entity scored gets a row here. Never updated, never deleted.
-- Used for: calibration monitoring, drift detection, Daubert compliance.

CREATE TABLE IF NOT EXISTS scoring_decisions_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document reference
  document_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  document_type TEXT NOT NULL,

  -- 5-Layer breakdown (stored as JSONB for flexibility)
  layers JSONB NOT NULL DEFAULT '{}',
  -- Expected shape: { grade: 0.88, nato: 0.04, berkeley: 0.025, ach: 0.015, transparency: 0.015 }

  -- Composite scores
  raw_score NUMERIC(6,4) NOT NULL,
  final_confidence NUMERIC(6,4) NOT NULL,
  band TEXT NOT NULL CHECK (band IN ('CONFIRMED', 'HIGHLY_PROBABLE', 'PROBABLE', 'POSSIBLE', 'UNVERIFIED')),

  -- Config versioning (for reproducibility)
  config_version TEXT NOT NULL DEFAULT '1.0.0',

  -- Metadata
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scored_by TEXT, -- fingerprint of the person who triggered scoring

  -- No UPDATE or DELETE — append only
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scoring_audit_document
  ON scoring_decisions_audit(document_id);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_entity
  ON scoring_decisions_audit(entity_name);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_band
  ON scoring_decisions_audit(band);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_scored_at
  ON scoring_decisions_audit(scored_at DESC);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_config_version
  ON scoring_decisions_audit(config_version);

-- Composite index for calibration queries (band + config_version)
CREATE INDEX IF NOT EXISTS idx_scoring_audit_calibration
  ON scoring_decisions_audit(config_version, band);

-- ============================================================================
-- ADD scoring columns to documents table (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'scoring_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN scoring_status TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'scoring_result'
  ) THEN
    ALTER TABLE documents ADD COLUMN scoring_result JSONB DEFAULT NULL;
  END IF;
END $$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Scoring audit is read-only for authenticated users, write-only via service role
ALTER TABLE scoring_decisions_audit ENABLE ROW LEVEL SECURITY;

-- Anyone can read audit records (transparency)
DROP POLICY IF EXISTS "scoring_audit_select_all" ON scoring_decisions_audit;
CREATE POLICY "scoring_audit_select_all"
  ON scoring_decisions_audit
  FOR SELECT
  USING (true);

-- Only service role can insert (API routes use service role key)
DROP POLICY IF EXISTS "scoring_audit_insert_service" ON scoring_decisions_audit;
CREATE POLICY "scoring_audit_insert_service"
  ON scoring_decisions_audit
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies — immutable audit log

-- ============================================================================
-- HELPER RPCs
-- ============================================================================

-- Get calibration stats for a config version
CREATE OR REPLACE FUNCTION get_scoring_calibration_stats(p_config_version TEXT DEFAULT '1.0.0')
RETURNS TABLE (
  band TEXT,
  count BIGINT,
  avg_confidence NUMERIC,
  min_confidence NUMERIC,
  max_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sda.band,
    COUNT(*)::BIGINT,
    ROUND(AVG(sda.final_confidence), 4),
    MIN(sda.final_confidence),
    MAX(sda.final_confidence)
  FROM scoring_decisions_audit sda
  WHERE sda.config_version = p_config_version
  GROUP BY sda.band
  ORDER BY
    CASE sda.band
      WHEN 'CONFIRMED' THEN 1
      WHEN 'HIGHLY_PROBABLE' THEN 2
      WHEN 'PROBABLE' THEN 3
      WHEN 'POSSIBLE' THEN 4
      WHEN 'UNVERIFIED' THEN 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get scoring history for a specific entity (cross-document)
CREATE OR REPLACE FUNCTION get_entity_scoring_history(p_entity_name TEXT)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  final_confidence NUMERIC,
  band TEXT,
  config_version TEXT,
  scored_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sda.document_id,
    sda.document_type,
    sda.final_confidence,
    sda.band,
    sda.config_version,
    sda.scored_at
  FROM scoring_decisions_audit sda
  WHERE LOWER(sda.entity_name) = LOWER(p_entity_name)
  ORDER BY sda.scored_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scoring_decisions_audit IS
  'Immutable audit log for 5-layer confidence scoring decisions. Never updated/deleted.';

COMMENT ON COLUMN scoring_decisions_audit.layers IS
  'JSONB: { grade, nato, berkeley, ach, transparency } — each layer''s contribution';

COMMENT ON COLUMN scoring_decisions_audit.config_version IS
  'Scoring config version (scoring-config.json). For reproducibility and drift detection.';
