-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT S2: Quarantine RLS Fix
-- Problem: UPDATE uses auth.role() = 'authenticated' — no ownership check
-- Fix: Restrict INSERT/UPDATE to service_role, keep SELECT public
-- ═══════════════════════════════════════════════════════

-- Keep SELECT public (quarantine data is meant to be community-viewable)
-- Existing "quarantine_select_public" USING (true) stays ✅

-- Fix INSERT: only through API (service_role)
DROP POLICY IF EXISTS "quarantine_insert_authenticated" ON data_quarantine;
DROP POLICY IF EXISTS "quarantine_insert_service" ON data_quarantine;

CREATE POLICY "quarantine_insert_service" ON data_quarantine
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fix UPDATE: only through API (service_role)
DROP POLICY IF EXISTS "quarantine_update_owner_or_reviewer" ON data_quarantine;
DROP POLICY IF EXISTS "quarantine_update_service" ON data_quarantine;

CREATE POLICY "quarantine_update_service" ON data_quarantine
  FOR UPDATE USING (auth.role() = 'service_role');

-- Reviews table: same treatment
DROP POLICY IF EXISTS "reviews_insert_authenticated" ON quarantine_reviews;
DROP POLICY IF EXISTS "reviews_insert_service" ON quarantine_reviews;

CREATE POLICY "reviews_insert_service" ON quarantine_reviews
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
