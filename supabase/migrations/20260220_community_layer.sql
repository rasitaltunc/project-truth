-- ============================================
-- PROJECT TRUTH: COMMUNITY LAYER MIGRATION
-- 20260220 - Topluluk Sistemi
-- ============================================

-- 1. COMMUNITY EVIDENCE TABLE
-- Topluluk kanıt gönderileri - ANA AĞI ETKİLEMEZ
CREATE TABLE IF NOT EXISTS community_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,

    -- Evidence details
    evidence_type TEXT NOT NULL DEFAULT 'document'
        CHECK (evidence_type IN ('document', 'legal', 'media', 'photo', 'video', 'testimony', 'news', 'financial')),
    title TEXT NOT NULL,
    description TEXT,

    -- Source info
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_date DATE,
    language TEXT DEFAULT 'en' CHECK (language IN ('tr', 'en', 'fr', 'de', 'es', 'ar', 'ru')),
    country_tags TEXT[] DEFAULT '{}',

    -- Submitter
    submitted_by UUID, -- nullable for anonymous

    -- Moderation workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'rejected', 'promoted')),
    moderation_notes TEXT,
    moderated_by UUID,
    moderated_at TIMESTAMPTZ,

    -- Promotion tracking
    promoted_to_evidence_id UUID, -- links to evidence_archive.id if promoted
    promoted_by UUID,
    promoted_at TIMESTAMPTZ,

    -- Community voting aggregates
    vote_count INTEGER DEFAULT 0,
    vote_weight REAL DEFAULT 0.0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- Flagging
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    flag_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMMUNITY VOTES TABLE
CREATE TABLE IF NOT EXISTS community_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_evidence_id UUID NOT NULL REFERENCES community_evidence(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful', 'flag')),
    reasoning TEXT,
    vote_weight REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One vote per user per evidence
    UNIQUE(community_evidence_id, voter_id)
);

-- 3. ADD source_of_truth TO evidence_archive
-- Tracks provenance of core evidence
DO $$ BEGIN
    ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS
        source_of_truth TEXT DEFAULT 'official'
        CHECK (source_of_truth IN ('official', 'court', 'journalist', 'community_verified'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. ADD community_evidence_count TO nodes
DO $$ BEGIN
    ALTER TABLE nodes ADD COLUMN IF NOT EXISTS community_evidence_count INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_community_evidence_node ON community_evidence(node_id);
CREATE INDEX IF NOT EXISTS idx_community_evidence_status ON community_evidence(status);
CREATE INDEX IF NOT EXISTS idx_community_evidence_vote_weight ON community_evidence(vote_weight DESC);
CREATE INDEX IF NOT EXISTS idx_community_evidence_submitted_by ON community_evidence(submitted_by);
CREATE INDEX IF NOT EXISTS idx_community_votes_evidence ON community_votes(community_evidence_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_voter ON community_votes(voter_id);

-- 6. AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION update_community_evidence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_community_evidence_updated ON community_evidence;
CREATE TRIGGER trigger_community_evidence_updated
    BEFORE UPDATE ON community_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_community_evidence_updated_at();

-- 7. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE community_evidence;

-- 8. RLS POLICIES
ALTER TABLE community_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_votes ENABLE ROW LEVEL SECURITY;

-- Community evidence: anyone can read, authenticated can insert
CREATE POLICY "community_evidence_read" ON community_evidence
    FOR SELECT USING (true);

CREATE POLICY "community_evidence_insert" ON community_evidence
    FOR INSERT WITH CHECK (true);

CREATE POLICY "community_evidence_update" ON community_evidence
    FOR UPDATE USING (true);

-- Community votes: anyone can read, authenticated can insert their own
CREATE POLICY "community_votes_read" ON community_votes
    FOR SELECT USING (true);

CREATE POLICY "community_votes_insert" ON community_votes
    FOR INSERT WITH CHECK (true);
