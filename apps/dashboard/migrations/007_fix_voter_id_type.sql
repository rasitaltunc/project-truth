-- ============================================
-- Migration 007: Fix voter_id column type
-- community_votes.voter_id eski migration'da UUID olarak oluşturulmuş
-- TEXT olması gerekiyor (anonymous_voter gibi string değerler için)
-- ============================================

ALTER TABLE community_votes ALTER COLUMN voter_id TYPE TEXT;

-- Kontrol
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'community_votes'
ORDER BY ordinal_position;
