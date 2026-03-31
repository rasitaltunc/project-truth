-- ============================================
-- PROJECT TRUTH: USER SYSTEM MIGRATION v3
-- Truth Protocol - Anonim Kimlik Sistemi
-- ============================================
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştır
-- ============================================

-- ============================================
-- 1. TRUTH_USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS truth_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID,
    anonymous_id VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 4),
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

-- ============================================
-- 2. DEAD MAN'S SWITCH TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dead_man_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    encrypted_content TEXT NOT NULL,
    encryption_key_hash TEXT NOT NULL,
    check_in_interval_hours INTEGER DEFAULT 168,
    last_check_in TIMESTAMPTZ DEFAULT NOW(),
    next_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    recipients JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    triggered_at TIMESTAMPTZ,
    recovery_key_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EVIDENCE VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID NOT NULL REFERENCES evidence_archive(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.0,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(evidence_id, user_id)
);

-- ============================================
-- 4. TRUST UPGRADE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS trust_upgrade_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    requested_level INTEGER NOT NULL,
    current_level INTEGER NOT NULL,
    evidence_type VARCHAR(50),
    evidence_data JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ============================================
-- 5. USER BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_truth_users_auth ON truth_users(auth_id);
CREATE INDEX IF NOT EXISTS idx_truth_users_anon ON truth_users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_truth_users_trust ON truth_users(trust_level);
CREATE INDEX IF NOT EXISTS idx_dms_user ON dead_man_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_dms_status ON dead_man_switches(status);
CREATE INDEX IF NOT EXISTS idx_votes_evidence ON evidence_votes(evidence_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON evidence_votes(user_id);

-- ============================================
-- 7. RLS POLICIES
-- ============================================
ALTER TABLE truth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_public_read" ON truth_users;
DROP POLICY IF EXISTS "users_own_update" ON truth_users;
DROP POLICY IF EXISTS "users_insert" ON truth_users;
DROP POLICY IF EXISTS "dms_owner_read" ON dead_man_switches;
DROP POLICY IF EXISTS "dms_owner_insert" ON dead_man_switches;
DROP POLICY IF EXISTS "dms_owner_update" ON dead_man_switches;
DROP POLICY IF EXISTS "votes_public_read" ON evidence_votes;
DROP POLICY IF EXISTS "votes_insert" ON evidence_votes;
DROP POLICY IF EXISTS "badges_public_read" ON user_badges;
DROP POLICY IF EXISTS "badges_insert" ON user_badges;

-- Truth Users policies
CREATE POLICY "users_public_read" ON truth_users FOR SELECT USING (TRUE);
CREATE POLICY "users_insert" ON truth_users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_own_update" ON truth_users FOR UPDATE USING (TRUE);

-- Dead Man Switches policies
CREATE POLICY "dms_owner_read" ON dead_man_switches FOR SELECT USING (TRUE);
CREATE POLICY "dms_owner_insert" ON dead_man_switches FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "dms_owner_update" ON dead_man_switches FOR UPDATE USING (TRUE);

-- Evidence Votes policies
CREATE POLICY "votes_public_read" ON evidence_votes FOR SELECT USING (TRUE);
CREATE POLICY "votes_insert" ON evidence_votes FOR INSERT WITH CHECK (TRUE);

-- User Badges policies
CREATE POLICY "badges_public_read" ON user_badges FOR SELECT USING (TRUE);
CREATE POLICY "badges_insert" ON user_badges FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Generate anonymous ID function
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

-- Create truth user (RPC function)
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
-- MIGRATION COMPLETE!
-- ============================================
