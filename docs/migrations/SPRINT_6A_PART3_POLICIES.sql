-- ============================================================
-- SPRINT 6A — PART 3: RLS POLICIES + INDEXES + GRANTS
-- Supabase SQL Editor'de çalıştır
-- Sıra: PART 2 başarılı olduktan SONRA çalıştır
-- ============================================================


-- ─── 1. RLS POLICIES ────────────────────────────────────────

-- badge_tiers: herkes okuyabilir, kimse yazamaz
ALTER TABLE badge_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badge_tiers_public_read ON badge_tiers;
CREATE POLICY badge_tiers_public_read ON badge_tiers FOR SELECT USING (true);

-- user_badges: herkes okuyabilir
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_badges_public_read ON user_badges;
CREATE POLICY user_badges_public_read ON user_badges FOR SELECT USING (true);

-- user_global_badges: herkes okuyabilir
ALTER TABLE user_global_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_global_badges_public_read ON user_global_badges;
CREATE POLICY user_global_badges_public_read ON user_global_badges FOR SELECT USING (true);

-- badge_nominations: herkes okuyabilir
ALTER TABLE badge_nominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badge_nominations_public_read ON badge_nominations;
CREATE POLICY badge_nominations_public_read ON badge_nominations FOR SELECT USING (true);

-- reputation_transactions: herkes okuyabilir (şeffaflık)
ALTER TABLE reputation_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reputation_transactions_public_read ON reputation_transactions;
CREATE POLICY reputation_transactions_public_read ON reputation_transactions FOR SELECT USING (true);

-- evidence_votes: herkes okuyabilir
ALTER TABLE evidence_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS evidence_votes_public_read ON evidence_votes;
CREATE POLICY evidence_votes_public_read ON evidence_votes FOR SELECT USING (true);

-- verified_organizations: herkes okuyabilir
ALTER TABLE verified_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verified_orgs_public_read ON verified_organizations;
CREATE POLICY verified_orgs_public_read ON verified_organizations FOR SELECT USING (true);


-- ─── 2. INDEXES ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_badges_fingerprint ON user_badges(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_badges_network ON user_badges(network_id);
CREATE INDEX IF NOT EXISTS idx_user_global_badges_fingerprint ON user_global_badges(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_nominee ON badge_nominations(nominee_fingerprint);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_nominator ON badge_nominations(nominator_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_fingerprint ON reputation_transactions(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_created ON reputation_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_type ON reputation_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_evidence_votes_evidence ON evidence_votes(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_votes_voter ON evidence_votes(voter_fingerprint);
CREATE INDEX IF NOT EXISTS idx_truth_users_badge_tier ON truth_users(global_badge_tier);
CREATE INDEX IF NOT EXISTS idx_truth_users_reputation ON truth_users(reputation_score DESC);


-- ─── 3. FUNCTION GRANTS ─────────────────────────────────────

GRANT EXECUTE ON FUNCTION get_user_badge(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_reputation(TEXT, TEXT, INT, UUID, TEXT, TEXT, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION submit_staked_evidence(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_evidence(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION nominate_for_community(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_promote_badge(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_reputation_leaderboard(UUID, TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reputation_history(TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_init_user_badge(TEXT) TO anon, authenticated;

-- PostgREST schema reload
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- PART 3 TAMAMLANDI — TÜM MİGRASYON BİTTİ! 🎉
--
-- Doğrulama komutları:
--
--   SELECT COUNT(*) FROM badge_tiers;
--   -- Sonuç: 4
--
--   SELECT id, name_tr, color FROM badge_tiers ORDER BY sort_order;
--   -- anonymous, community, journalist, institutional
--
--   SELECT proname FROM pg_proc
--   WHERE proname IN (
--     'get_user_badge', 'record_reputation', 'submit_staked_evidence',
--     'resolve_evidence', 'nominate_for_community', 'check_and_promote_badge',
--     'get_reputation_leaderboard', 'get_reputation_history', 'get_or_init_user_badge'
--   );
--   -- 9 fonksiyon
--
-- ============================================================
