-- ============================================
-- MINIMAL CORE TABLES - Sadece eksik tabloları oluşturur
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRUTH NODES
CREATE TABLE IF NOT EXISTS truth_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'person',
    tier INTEGER DEFAULT 3,
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

-- 2. TRUTH LINKS
CREATE TABLE IF NOT EXISTS truth_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source UUID REFERENCES truth_nodes(id) ON DELETE CASCADE,
    target UUID REFERENCES truth_nodes(id) ON DELETE CASCADE,
    type VARCHAR(100) DEFAULT 'associated',
    strength INTEGER DEFAULT 50,
    metadata JSONB DEFAULT '{}',
    first_seen DATE,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- 3. EVIDENCE ARCHIVE
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
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- 4. NODE TIMELINE
CREATE TABLE IF NOT EXISTS node_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES truth_nodes(id) ON DELETE CASCADE,
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

-- 5. USER CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS user_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    contribution_type VARCHAR(50),
    target_id UUID,
    target_type VARCHAR(50),
    quality_score INTEGER DEFAULT 50,
    verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TRUTH USERS (email sütununu ayrı ekle)
CREATE TABLE IF NOT EXISTS truth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Email sütununu ekle (zaten varsa hata vermez)
DO $$
BEGIN
    ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS email TEXT;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- SAMPLE DATA
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

-- Link için önce constraint kontrol et
DO $$
BEGIN
    INSERT INTO truth_links (source, target, type, strength)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'close_associate',
        95
    );
EXCEPTION WHEN unique_violation THEN
    NULL;
END $$;

SELECT 'OK - Core tables ready!' as status;
