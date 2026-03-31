-- ============================================
-- Migration 007: Verification System
-- Topluluk doğrulama ve oylama sistemi
-- ============================================

-- ============================================
-- 1. EVIDENCE VOTES (Kanıt Oyları)
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence_archive(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,

    -- Oy detayları
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('verify', 'dispute', 'flag')),
    confidence INT NOT NULL CHECK (confidence >= 1 AND confidence <= 100),
    reasoning TEXT,

    -- Ağırlık (trust level ve reputation'a göre)
    vote_weight DECIMAL(4,2) DEFAULT 1.0,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Bir kullanıcı bir kanıta bir kez oy verebilir
    UNIQUE(evidence_id, voter_id)
);

-- ============================================
-- 2. EVIDENCE_ARCHIVE GÜNCELLEMELER
-- ============================================

ALTER TABLE evidence_archive
ADD COLUMN IF NOT EXISTS community_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;

-- ============================================
-- 3. TRUST_UPGRADE_REQUIREMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS trust_upgrade_requirements (
    level INT PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL,
    min_contributions INT DEFAULT 0,
    min_verified INT DEFAULT 0,
    min_reputation INT DEFAULT 0,
    special_requirement VARCHAR(100),
    description TEXT
);

-- Insert default requirements
INSERT INTO trust_upgrade_requirements (level, level_name, min_contributions, min_verified, min_reputation, special_requirement, description)
VALUES
    (0, 'Anonim Ziyaretçi', 0, 0, 0, NULL, 'Sadece okuma yetkisi'),
    (1, 'Doğrulanmış İnsan', 0, 0, 0, 'human_verification', 'CAPTCHA ve cihaz doğrulaması'),
    (2, 'Doğrulanmış Tanık', 5, 3, 30, 'location_proof', 'Lokasyon veya olay kanıtı'),
    (3, 'Doğrulanmış İçeriden', 20, 15, 200, 'institutional_proof', 'Kurumsal erişim kanıtı'),
    (4, 'İsimli Kaynak', 50, 40, 500, 'identity_revealed', 'Gerçek kimlik doğrulaması')
ON CONFLICT (level) DO NOTHING;

-- ============================================
-- 4. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_votes_evidence ON evidence_votes(evidence_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON evidence_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_type ON evidence_votes(vote_type);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE evidence_votes ENABLE ROW LEVEL SECURITY;

-- Herkes oyları görebilir
CREATE POLICY "votes_read_all" ON evidence_votes
    FOR SELECT USING (TRUE);

-- Sadece kendi oyunu görebilir detaylı
CREATE POLICY "votes_insert_own" ON evidence_votes
    FOR INSERT WITH CHECK (
        voter_id IN (SELECT id FROM truth_users WHERE auth_id = auth.uid())
    );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Kullanıcı katkı sayısını artır
CREATE OR REPLACE FUNCTION increment_contributions(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE truth_users
    SET contributions_count = contributions_count + 1,
        last_active_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Kanıt doğrulama skorunu güncelle
CREATE OR REPLACE FUNCTION update_evidence_score(p_evidence_id UUID)
RETURNS void AS $$
DECLARE
    v_verify_count INT;
    v_dispute_count INT;
    v_flag_count INT;
    v_total_votes INT;
    v_weighted_score DECIMAL;
    v_new_status VARCHAR(20);
BEGIN
    -- Oyları say
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'verify'),
        COUNT(*) FILTER (WHERE vote_type = 'dispute'),
        COUNT(*) FILTER (WHERE vote_type = 'flag'),
        COUNT(*),
        COALESCE(SUM(CASE
            WHEN vote_type = 'verify' THEN vote_weight * confidence / 100.0
            WHEN vote_type = 'dispute' THEN -vote_weight * confidence / 100.0
            WHEN vote_type = 'flag' THEN -vote_weight * confidence / 50.0
            ELSE 0
        END), 0)
    INTO v_verify_count, v_dispute_count, v_flag_count, v_total_votes, v_weighted_score
    FROM evidence_votes
    WHERE evidence_id = p_evidence_id;

    -- Durumu belirle
    v_new_status := 'pending';
    IF v_total_votes >= 5 THEN
        IF v_flag_count::FLOAT / v_total_votes > 0.5 THEN
            v_new_status := 'flagged';
        ELSIF v_dispute_count::FLOAT / v_total_votes > 0.5 THEN
            v_new_status := 'disputed';
        ELSIF v_verify_count::FLOAT / v_total_votes > 0.6 THEN
            v_new_status := 'community_verified';
        END IF;
    END IF;

    -- Güncelle
    UPDATE evidence_archive
    SET
        community_score = GREATEST(0, LEAST(100, 50 + (v_weighted_score * 10)::INT)),
        vote_count = v_total_votes,
        verification_status = v_new_status
    WHERE id = p_evidence_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Oy verildiğinde skoru güncelle
CREATE OR REPLACE FUNCTION trigger_update_evidence_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_evidence_score(NEW.evidence_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_update_score ON evidence_votes;
CREATE TRIGGER trg_vote_update_score
    AFTER INSERT OR UPDATE OR DELETE ON evidence_votes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_evidence_score();

-- ============================================
-- DONE
-- ============================================

SELECT 'Migration 007: Verification System completed!' as status;
