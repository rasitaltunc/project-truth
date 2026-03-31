-- ============================================
-- STEP 1: TRUTH_USERS TABLE ONLY
-- ============================================

-- Önce tabloyu sil (varsa)
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS trust_upgrade_requests CASCADE;
DROP TABLE IF EXISTS evidence_votes CASCADE;
DROP TABLE IF EXISTS dead_man_switches CASCADE;
DROP TABLE IF EXISTS truth_users CASCADE;

-- Truth Users tablosu
CREATE TABLE truth_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID,
    anonymous_id VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    trust_level INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    contributions_count INTEGER DEFAULT 0,
    verified_contributions INTEGER DEFAULT 0,
    false_contributions INTEGER DEFAULT 0,
    preferred_language VARCHAR(10) DEFAULT 'tr',
    device_fingerprint TEXT,
    last_ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_truth_users_anon ON truth_users(anonymous_id);

-- RLS
ALTER TABLE truth_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "truth_users_all" ON truth_users FOR ALL USING (true) WITH CHECK (true);

-- Helper function
CREATE OR REPLACE FUNCTION generate_anonymous_id()
RETURNS VARCHAR(50) AS $$
DECLARE
    prefixes TEXT[] := ARRAY['WITNESS', 'SOURCE', 'GUARDIAN', 'SEEKER', 'TRUTH', 'LIGHT', 'SHADOW', 'VOICE'];
    prefix TEXT;
    suffix TEXT;
BEGIN
    prefix := prefixes[1 + floor(random() * array_length(prefixes, 1))::int];
    suffix := encode(gen_random_bytes(4), 'hex');
    RETURN prefix || '_' || suffix;
END;
$$ LANGUAGE plpgsql;

-- RPC function
CREATE OR REPLACE FUNCTION create_truth_user(
    p_auth_id UUID DEFAULT NULL,
    p_display_name VARCHAR DEFAULT NULL
)
RETURNS SETOF truth_users AS $$
BEGIN
    RETURN QUERY
    INSERT INTO truth_users (auth_id, anonymous_id, display_name, trust_level)
    VALUES (
        p_auth_id,
        generate_anonymous_id(),
        p_display_name,
        CASE WHEN p_auth_id IS NOT NULL THEN 1 ELSE 0 END
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 1 COMPLETE!
-- Şimdi migration_step2_extras.sql çalıştır
-- ============================================
