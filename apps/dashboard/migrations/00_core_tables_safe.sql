-- ============================================
-- CORE TABLES - PROJECT TRUTH (SAFE VERSION)
-- Bu migration EN ÖNCE çalıştırılmalı!
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TRUTH NODES (Ana entity tablosu)
-- ============================================

CREATE TABLE IF NOT EXISTS truth_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'person',
    tier INTEGER DEFAULT 3 CHECK (tier >= 1 AND tier <= 5),
    role TEXT,
    img TEXT,
    metadata JSONB DEFAULT '{}',
    connection_count INTEGER DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    credibility_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_nodes_label ON truth_nodes(label);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON truth_nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_tier ON truth_nodes(tier);

-- ============================================
-- 2. TRUTH LINKS (Bağlantı tablosu)
-- ============================================

CREATE TABLE IF NOT EXISTS truth_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
    type VARCHAR(100) DEFAULT 'associated',
    strength INTEGER DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
    metadata JSONB DEFAULT '{}',
    first_seen DATE,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT unique_link UNIQUE (source, target)
);

CREATE INDEX IF NOT EXISTS idx_links_source ON truth_links(source);
CREATE INDEX IF NOT EXISTS idx_links_target ON truth_links(target);

-- ============================================
-- 3. EVIDENCE ARCHIVE (Kanıt arşivi)
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES truth_nodes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    evidence_type VARCHAR(50) DEFAULT 'document',
    source_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    location TEXT,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verification_score INTEGER DEFAULT 50,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    file_url TEXT,
    file_type VARCHAR(50),
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_evidence_node ON evidence_archive(node_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_archive(verification_status);

-- ============================================
-- 4. NODE TIMELINE
-- ============================================

CREATE TABLE IF NOT EXISTS node_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
    event_date DATE,
    title TEXT NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'event',
    location TEXT,
    source_name VARCHAR(255),
    source_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_node ON node_timeline(node_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON node_timeline(event_date);

-- ============================================
-- 5. USER CONTRIBUTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    contribution_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    quality_score INTEGER DEFAULT 50,
    verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_user ON user_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON user_contributions(created_at);

-- ============================================
-- 6. TRUTH USERS
-- ============================================

CREATE TABLE IF NOT EXISTS truth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    reputation_score INTEGER DEFAULT 0,
    trust_level INTEGER DEFAULT 1,
    contribution_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON truth_users(email);

-- ============================================
-- TRIGGERS (Safe - drop first if exists)
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nodes_timestamp ON truth_nodes;
CREATE TRIGGER trigger_nodes_timestamp
    BEFORE UPDATE ON truth_nodes
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_links_timestamp ON truth_links;
CREATE TRIGGER trigger_links_timestamp
    BEFORE UPDATE ON truth_links
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_evidence_timestamp ON evidence_archive;
CREATE TRIGGER trigger_evidence_timestamp
    BEFORE UPDATE ON evidence_archive
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_users_timestamp ON truth_users;
CREATE TRIGGER trigger_users_timestamp
    BEFORE UPDATE ON truth_users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO truth_nodes (id, label, type, tier, role, img)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Jeffrey Epstein',
    'mastermind',
    1,
    'Financier / Convicted Sex Offender',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Jeffrey_Epstein_mugshot.jpg/220px-Jeffrey_Epstein_mugshot.jpg'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO truth_nodes (id, label, type, tier, role)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Ghislaine Maxwell',
    'person',
    2,
    'Socialite / Convicted Trafficker'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO truth_links (source, target, type, strength)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'close_associate',
    95
)
ON CONFLICT (source, target) DO NOTHING;

-- ============================================
-- NOTE: Realtime'ı Supabase Dashboard'dan aktive edin
-- Table Editor > truth_nodes > Realtime: ON
-- ============================================
