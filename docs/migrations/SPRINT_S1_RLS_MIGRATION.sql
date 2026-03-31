-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT S1: RLS Fix — Collective DMS Tables
-- Problem: USING(true) allows any anon key access
-- Fix: Restrict to service_role only (API routes use supabaseAdmin)
-- ═══════════════════════════════════════════════════════

-- ── collective_dms table ──
DROP POLICY IF EXISTS "collective_dms_select" ON collective_dms;
DROP POLICY IF EXISTS "collective_dms_insert" ON collective_dms;
DROP POLICY IF EXISTS "collective_dms_update" ON collective_dms;

-- Only service role (supabaseAdmin) can access
-- All client access goes through API routes which validate fingerprints
CREATE POLICY "cdms_service_only_select" ON collective_dms
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "cdms_service_only_insert" ON collective_dms
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "cdms_service_only_update" ON collective_dms
  FOR UPDATE USING (auth.role() = 'service_role');

-- ── collective_dms_shards table ──
DROP POLICY IF EXISTS "shards_select" ON collective_dms_shards;
DROP POLICY IF EXISTS "shards_insert" ON collective_dms_shards;
DROP POLICY IF EXISTS "shards_update" ON collective_dms_shards;

CREATE POLICY "shards_service_only_select" ON collective_dms_shards
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "shards_service_only_insert" ON collective_dms_shards
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "shards_service_only_update" ON collective_dms_shards
  FOR UPDATE USING (auth.role() = 'service_role');

-- ── proof_of_life_chain table ──
DROP POLICY IF EXISTS "chain_select" ON proof_of_life_chain;
DROP POLICY IF EXISTS "chain_insert" ON proof_of_life_chain;

CREATE POLICY "chain_service_only_select" ON proof_of_life_chain
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "chain_service_only_insert" ON proof_of_life_chain
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── collective_alerts table ──
DROP POLICY IF EXISTS "alerts_select" ON collective_alerts;
DROP POLICY IF EXISTS "alerts_insert" ON collective_alerts;
DROP POLICY IF EXISTS "alerts_update" ON collective_alerts;

CREATE POLICY "alerts_service_only_select" ON collective_alerts
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "alerts_service_only_insert" ON collective_alerts
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "alerts_service_only_update" ON collective_alerts
  FOR UPDATE USING (auth.role() = 'service_role');
