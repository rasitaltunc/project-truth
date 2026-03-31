-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT S3: Audit Logs Table
-- Immutable audit trail — no DELETE or UPDATE policies
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'blocked')),
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can INSERT (API routes)
CREATE POLICY "audit_insert_service" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can SELECT (admin viewing)
CREATE POLICY "audit_select_service" ON audit_logs
  FOR SELECT USING (auth.role() = 'service_role');

-- NO UPDATE policy = updates impossible
-- NO DELETE policy = deletions impossible
-- This makes the audit trail truly immutable

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_fingerprint ON audit_logs (fingerprint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource, resource_id);
