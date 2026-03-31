-- ============================================
-- STEP 2: EXTRA TABLES (Run AFTER step1)
-- ============================================

-- Dead Man's Switch
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

-- Evidence Votes
CREATE TABLE IF NOT EXISTS evidence_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence_archive(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.0,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Upgrade Requests
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

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dms_user ON dead_man_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON evidence_votes(user_id);

-- RLS
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dms_all" ON dead_man_switches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "votes_all" ON evidence_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "upgrade_all" ON trust_upgrade_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "badges_all" ON user_badges FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 2 COMPLETE!
-- ============================================
