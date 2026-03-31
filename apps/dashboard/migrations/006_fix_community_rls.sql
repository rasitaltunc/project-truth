-- ============================================
-- Migration 006: Fix Community Evidence RLS Policies
-- community_evidence tablosunda UPDATE policy eksikti
-- Bu yüzden votes API helpful_count güncelleyemiyordu
-- ============================================

-- community_evidence: UPDATE policy ekle
DROP POLICY IF EXISTS "community_evidence_update" ON community_evidence;
CREATE POLICY "community_evidence_update" ON community_evidence
    FOR UPDATE USING (true) WITH CHECK (true);

-- community_evidence: DELETE policy ekle (admin/moderation için)
DROP POLICY IF EXISTS "community_evidence_delete" ON community_evidence;
CREATE POLICY "community_evidence_delete" ON community_evidence
    FOR DELETE USING (true);

-- Kontrol: Mevcut tabloları ve policy'leri listele
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('community_evidence', 'community_votes')
ORDER BY tablename, policyname;
