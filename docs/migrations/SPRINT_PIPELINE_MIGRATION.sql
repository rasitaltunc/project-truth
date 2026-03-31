-- ═══════════════════════════════════════════════════════════════
-- PIPELINE ARCHITECTURE MIGRATION
-- The Truth Pipeline — Provenance + 3-Pass + 8-Signal Scoring
-- Date: 2026-03-23
-- ═══════════════════════════════════════════════════════════════

-- ═══ DOCUMENTS TABLE: New provenance & scan columns ═══

-- Intake provenance
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_hash TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_path TEXT;

-- OCR metadata
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_raw_response JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_page_map JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_cost DECIMAL(10,4);

-- 3-Pass scan engine
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_job_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_prompt_version TEXT DEFAULT 'v1.0';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_pass_1_raw JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_pass_2_raw JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_pass_3_raw JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_consensus_result JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_model TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_token_usage JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_chunks JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_node_context TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_duration_ms INTEGER;

-- 8-Signal confidence
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidence_signals JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidence_composite DECIMAL(4,3);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidence_ai_raw DECIMAL(4,3);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidence_route TEXT;

-- ═══ PROMPT VERSIONS TABLE ═══
CREATE TABLE IF NOT EXISTS prompt_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version         TEXT NOT NULL UNIQUE,
  prompt_conservative TEXT NOT NULL,
  prompt_verification TEXT NOT NULL,
  prompt_aggressive   TEXT NOT NULL,
  few_shot_examples   JSONB DEFAULT '[]'::jsonb,
  blacklist_patterns  JSONB DEFAULT '[]'::jsonb,
  accuracy_score      DECIMAL(5,3),
  total_scans         INTEGER DEFAULT 0,
  total_entities      INTEGER DEFAULT 0,
  total_approved      INTEGER DEFAULT 0,
  total_rejected      INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT false,
  parent_version      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Only one active prompt version at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_versions_active
  ON prompt_versions (is_active) WHERE is_active = true;

-- ═══ SCAN JOBS TABLE (audit trail) ═══
CREATE TABLE IF NOT EXISTS scan_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID REFERENCES documents(id) ON DELETE CASCADE,
  prompt_version    TEXT NOT NULL,
  passes_completed  INTEGER DEFAULT 0,
  pass_1_entities   INTEGER DEFAULT 0,
  pass_2_verified   INTEGER DEFAULT 0,
  pass_3_additions  INTEGER DEFAULT 0,
  consensus_3_3     INTEGER DEFAULT 0,
  consensus_2_3     INTEGER DEFAULT 0,
  consensus_1_3     INTEGER DEFAULT 0,
  total_entities    INTEGER DEFAULT 0,
  total_relationships INTEGER DEFAULT 0,
  token_total       INTEGER DEFAULT 0,
  duration_ms       INTEGER DEFAULT 0,
  cost_estimate     DECIMAL(10,4) DEFAULT 0,
  confidence_signals JSONB,
  confidence_composite DECIMAL(4,3),
  error_log         TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_jobs_document ON scan_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_version ON scan_jobs(prompt_version);

-- ═══ INSERT DEFAULT PROMPT VERSION v1.0 ═══
INSERT INTO prompt_versions (version, prompt_conservative, prompt_verification, prompt_aggressive, is_active, notes)
VALUES (
  'v1.0',
  'INITIAL — will be populated by scan engine on first run',
  'INITIAL — will be populated by scan engine on first run',
  'INITIAL — will be populated by scan engine on first run',
  true,
  'Initial prompt version — Pipeline Architecture launch'
)
ON CONFLICT (version) DO NOTHING;

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_documents_scan_job ON documents(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_documents_prompt_version ON documents(scan_prompt_version);
CREATE INDEX IF NOT EXISTS idx_documents_confidence_route ON documents(confidence_route);
