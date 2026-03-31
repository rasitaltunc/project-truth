-- ============================================
-- CORE TABLES V2 - Mevcut yapıyı kontrol eder
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TRUTH NODES
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'truth_nodes') THEN
        CREATE TABLE truth_nodes (
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
        CREATE INDEX idx_nodes_label ON truth_nodes(label);
        CREATE INDEX idx_nodes_type ON truth_nodes(type);
    END IF;
END $$;

-- ============================================
-- 2. TRUTH LINKS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'truth_links') THEN
        CREATE TABLE truth_links (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            source UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
            target UUID NOT NULL REFERENCES truth_nodes(id) ON DELETE CASCADE,
            type VARCHAR(100) DEFAULT 'associated',
            strength INTEGER DEFAULT 50,
            metadata JSONB DEFAULT '{}',
            first_seen DATE,
            last_activity TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            CONSTRAINT unique_link UNIQUE (source, target)
        );
        CREATE INDEX idx_links_source ON truth_links(source);
        CREATE INDEX idx_links_target ON truth_links(target);
    END IF;
END $$;

-- ============================================
-- 3. EVIDENCE ARCHIVE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'evidence_archive') THEN
        CREATE TABLE evidence_archive (
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
        CREATE INDEX idx_evidence_node ON evidence_archive(node_id);
    END IF;
END $$;

-- ============================================
-- 4. NODE TIMELINE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'node_timeline') THEN
        CREATE TABLE node_timeline (
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
        CREATE INDEX idx_timeline_node ON node_timeline(node_id);
    END IF;
END $$;

-- ============================================
-- 5. USER CONTRIBUTIONS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_contributions') THEN
        CREATE TABLE user_contributions (
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
        CREATE INDEX idx_contributions_user ON user_contributions(user_id);
    END IF;
END $$;

-- ============================================
-- 6. TRUTH USERS (veya mevcut tabloya email ekle)
-- ============================================
DO $$
BEGIN
    -- Tablo yoksa oluştur
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'truth_users') THEN
        CREATE TABLE truth_users (
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
    ELSE
        -- Tablo varsa, email sütunu yoksa ekle
        IF NOT EXISTS (SELECT FROM information_schema.columns
                       WHERE table_name = 'truth_users' AND column_name = 'email') THEN
            ALTER TABLE truth_users ADD COLUMN email TEXT UNIQUE;
        END IF;
    END IF;
END $$;

-- ============================================
-- TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

SELECT 'Core tables created/updated successfully!' as result;
