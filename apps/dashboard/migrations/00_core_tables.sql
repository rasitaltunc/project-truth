-- ============================================
-- CORE TABLES - PROJECT TRUTH
-- Bu migration EN ÖNCE çalıştırılmalı!
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TRUTH NODES (Ana entity tablosu)
-- ============================================

CREATE TABLE IF NOT EXISTS truth_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Temel bilgiler
    label TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'person', -- person, organization, location, event, document
    tier INTEGER DEFAULT 3 CHECK (tier >= 1 AND tier <= 5),
    role TEXT,

    -- Görsel
    img TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- İstatistikler
    connection_count INTEGER DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    credibility_score INTEGER DEFAULT 50 CHECK (credibility_score >= 0 AND credibility_score <= 100),

    -- Zaman damgaları
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_label ON truth_nodes(label);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON truth_nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_tier ON truth_nodes(tier);
CREATE INDEX IF NOT EXISTS idx_nodes_created ON truth_nodes(created_at);

-- ============================================
-- 2. TRUTH LINKS (Bağlantı tablosu)
-- ============================================

CREATE TABLE IF NOT EXISTS truth_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Bağlantı
    source UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,

    -- Detaylar
    type VARCHAR(100) DEFAULT 'associated',
    strength INTEGER DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Tarihler
    first_seen DATE,
    last_activity TIMESTAMP WITH TIME ZONE,

    -- Zaman damgaları
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    -- Her yön için tek bağlantı
    CONSTRAINT unique_link UNIQUE (source, target)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_links_source ON truth_links(source);
CREATE INDEX IF NOT EXISTS idx_links_target ON truth_links(target);
CREATE INDEX IF NOT EXISTS idx_links_type ON truth_links(type);

-- ============================================
-- 3. EVIDENCE ARCHIVE (Kanıt arşivi)
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Bağlı entity
    node_id UUID REFERENCES truth_nodes(id) ON DELETE SET NULL,

    -- İçerik
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    evidence_type VARCHAR(50) DEFAULT 'document',

    -- Kaynak
    source_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,

    -- Lokasyon
    location TEXT,

    -- Doğrulama
    verification_status VARCHAR(50) DEFAULT 'pending',
    verification_score INTEGER DEFAULT 50,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,

    -- Dosya
    file_url TEXT,
    file_type VARCHAR(50),
    file_size INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Zaman damgaları
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_node ON evidence_archive(node_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_archive(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_archive(verification_status);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_archive(source_name);
CREATE INDEX IF NOT EXISTS idx_evidence_date ON evidence_archive(source_date);

-- ============================================
-- 4. NODE TIMELINE (Entity zaman çizelgesi)
-- ============================================

CREATE TABLE IF NOT EXISTS node_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    node_id UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,

    event_date DATE,
    title TEXT NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'event',
    location TEXT,

    -- Kaynak
    source_name VARCHAR(255),
    source_url TEXT,

    -- Metadata
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
    contribution_type VARCHAR(50) NOT NULL, -- document, evidence, node, link, edit
    target_id UUID,
    target_type VARCHAR(50),

    -- Değerlendirme
    quality_score INTEGER DEFAULT 50,
    verified BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_user ON user_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON user_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON user_contributions(created_at);

-- ============================================
-- 6. TRUTH USERS (Kullanıcı tablosu)
-- ============================================

CREATE TABLE IF NOT EXISTS truth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Auth
    email TEXT UNIQUE,
    username TEXT,

    -- Profil
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,

    -- Reputation
    reputation_score INTEGER DEFAULT 0,
    trust_level INTEGER DEFAULT 1,
    contribution_count INTEGER DEFAULT 0,

    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Zaman damgaları
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON truth_users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON truth_users(username);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
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
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE truth_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE truth_links;
ALTER PUBLICATION supabase_realtime ADD TABLE evidence_archive;

-- ============================================
-- SAMPLE DATA (OPTIONAL - Test için)
-- ============================================

-- Epstein as central node
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

-- Ghislaine Maxwell
INSERT INTO truth_nodes (id, label, type, tier, role)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Ghislaine Maxwell',
    'person',
    2,
    'Socialite / Convicted Trafficker'
)
ON CONFLICT (id) DO NOTHING;

-- Link between them
INSERT INTO truth_links (source, target, type, strength)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'close_associate',
    95
)
ON CONFLICT (source, target) DO NOTHING;

COMMENT ON TABLE truth_nodes IS 'Core entity table for PROJECT TRUTH network';
COMMENT ON TABLE truth_links IS 'Connections between entities';
COMMENT ON TABLE evidence_archive IS 'Document and evidence storage';
