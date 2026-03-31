-- ============================================
-- PROJECT TRUTH: SUPABASE MIGRATION V2
-- FIX: Type mismatch between existing and new tables
-- ============================================
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştır
-- ============================================

-- ⚠️ UYARI: Mevcut tablolar silinecek!
-- Eğer önemli veri varsa ÖNCE BACKUP AL!

-- ============================================
-- 0. ESKİ TABLOLARI TEMİZLE (Sıralı - FK bağımlılıkları)
-- ============================================
DROP TABLE IF EXISTS community_contributions CASCADE;
DROP TABLE IF EXISTS isik_tut_campaigns CASCADE;
DROP TABLE IF EXISTS evidence_archive CASCADE;
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;

-- ============================================
-- 1. NODES TABLE (Düğümler)
-- ============================================
CREATE TABLE nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Temel Bilgiler
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'person',
    -- Types: person, organization, location, event, document, evidence

    -- Görsel & UI
    image_url TEXT,
    tier INTEGER DEFAULT 3,
    -- tier 0: Mastermind (merkez)
    -- tier 1: Key Players (kırmızı, iç orbit)
    -- tier 2: Close Associates (turuncu)
    -- tier 3: Connected (sarı, orta orbit)
    -- tier 4: Peripheral (dış orbit)

    -- Puanlama Sistemi
    risk INTEGER DEFAULT 50 CHECK (risk >= 0 AND risk <= 100),
    -- 90-100: KRİTİK
    -- 50-89:  YÜKSEK
    -- 0-49:   DÜŞÜK

    -- Durum
    is_alive BOOLEAN DEFAULT TRUE,

    -- Detay Bilgileri
    role VARCHAR(255),
    summary TEXT,
    details JSONB DEFAULT '{}',

    -- New Fields from useStore.ts
    verification_level VARCHAR(50) DEFAULT 'unverified',
    -- 'unverified', 'community', 'journalist', 'official'
    country_tags TEXT[],
    nationality VARCHAR(100),
    occupation VARCHAR(255),
    birth_date DATE,
    death_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 2. LINKS TABLE (Bağlantılar)
-- ============================================
CREATE TABLE links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Bağlantı Uçları
    source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,

    -- Bağlantı Tipi
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'associated',
    -- associated, financial, familial, professional, criminal, romantic, witnessed

    -- Bağlantı Gücü
    strength INTEGER DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),

    -- Detaylar
    description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate links
    UNIQUE(source_id, target_id, relationship_type)
);

-- ============================================
-- 3. EVIDENCE_ARCHIVE TABLE (Kanıt Arşivi)
-- ============================================
CREATE TABLE evidence_archive (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- İlişkili Düğüm/Bağlantı
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    link_id UUID REFERENCES links(id) ON DELETE SET NULL,

    -- Kanıt Tipi
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'document',

    -- İçerik
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ISIK_TUT_CAMPAIGNS TABLE (Işık Tut Kampanyaları)
-- ============================================
CREATE TABLE isik_tut_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',

    contribution_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. COMMUNITY_CONTRIBUTIONS TABLE
-- ============================================
CREATE TABLE community_contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- İlişkili Kayıtlar (hepsi UUID)
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    link_id UUID REFERENCES links(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_archive(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES isik_tut_campaigns(id) ON DELETE SET NULL,

    -- Katkı Tipi
    contribution_type VARCHAR(50) NOT NULL DEFAULT 'new_info',

    -- İçerik
    content TEXT NOT NULL,

    -- Değerlendirme
    status VARCHAR(20) DEFAULT 'pending',
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. INDEXES (Performans)
-- ============================================
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_tier ON nodes(tier);
CREATE INDEX idx_nodes_risk ON nodes(risk);
CREATE INDEX idx_nodes_active ON nodes(is_active);
CREATE INDEX idx_nodes_name ON nodes(name);

CREATE INDEX idx_links_source ON links(source_id);
CREATE INDEX idx_links_target ON links(target_id);
CREATE INDEX idx_links_type ON links(relationship_type);

CREATE INDEX idx_evidence_node ON evidence_archive(node_id);
CREATE INDEX idx_evidence_link ON evidence_archive(link_id);

-- ============================================
-- 7. FUNCTIONS (Updated_at trigger)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER evidence_updated_at
    BEFORE UPDATE ON evidence_archive
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_contributions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "nodes_public_read" ON nodes FOR SELECT USING (is_active = TRUE);
CREATE POLICY "links_public_read" ON links FOR SELECT USING (TRUE);
CREATE POLICY "evidence_public_read" ON evidence_archive FOR SELECT USING (TRUE);
CREATE POLICY "contributions_public_read" ON community_contributions FOR SELECT USING (TRUE);

-- ============================================
-- 9. SEED DATA (Epstein Network)
-- ============================================

-- MERKEZ
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Jeffrey Epstein', 'person', 0, 100, FALSE, 'mastermind');

-- TIER 1
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Ghislaine Maxwell', 'person', 1, 95, TRUE, 'accomplice'),
('Jean-Luc Brunel', 'person', 1, 90, FALSE, 'accomplice');

-- TIER 2
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Prince Andrew', 'person', 2, 85, TRUE, 'royal'),
('Les Wexner', 'person', 2, 75, TRUE, 'financier'),
('Alan Dershowitz', 'person', 2, 70, TRUE, 'lawyer');

-- TIER 3
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Bill Clinton', 'person', 3, 65, TRUE, 'politician'),
('Donald Trump', 'person', 3, 50, TRUE, 'politician'),
('Bill Gates', 'person', 3, 45, TRUE, 'billionaire'),
('Kevin Spacey', 'person', 3, 60, TRUE, 'celebrity');

-- TIER 4
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Leonardo DiCaprio', 'person', 4, 25, TRUE, 'celebrity'),
('Stephen Hawking', 'person', 4, 15, FALSE, 'scientist'),
('Michael Jackson', 'person', 4, 20, FALSE, 'celebrity'),
('Naomi Campbell', 'person', 4, 30, TRUE, 'celebrity'),
('Elon Musk', 'person', 4, 20, TRUE, 'billionaire');

-- LINKS (Bağlantıları ekle)
-- İlk önce node ID'lerini alalım ve bağlayalım
DO $$
DECLARE
    epstein_id UUID;
    maxwell_id UUID;
    brunel_id UUID;
    prince_id UUID;
   wexner_id UUID;
    dershowitz_id UUID;
    clinton_id UUID;
    trump_id UUID;
    gates_id UUID;
    spacey_id UUID;
    dicaprio_id UUID;
    hawking_id UUID;
    jackson_id UUID;
    campbell_id UUID;
    musk_id UUID;
BEGIN
    -- ID'leri al
    SELECT id INTO epstein_id FROM nodes WHERE name = 'Jeffrey Epstein';
    SELECT id INTO maxwell_id FROM nodes WHERE name = 'Ghislaine Maxwell';
    SELECT id INTO brunel_id FROM nodes WHERE name = 'Jean-Luc Brunel';
    SELECT id INTO prince_id FROM nodes WHERE name = 'Prince Andrew';
    SELECT id INTO wexner_id FROM nodes WHERE name = 'Les Wexner';
    SELECT id INTO dershowitz_id FROM nodes WHERE name = 'Alan Dershowitz';
    SELECT id INTO clinton_id FROM nodes WHERE name = 'Bill Clinton';
    SELECT id INTO trump_id FROM nodes WHERE name = 'Donald Trump';
    SELECT id INTO gates_id FROM nodes WHERE name = 'Bill Gates';
    SELECT id INTO spacey_id FROM nodes WHERE name = 'Kevin Spacey';
    SELECT id INTO dicaprio_id FROM nodes WHERE name = 'Leonardo DiCaprio';
    SELECT id INTO hawking_id FROM nodes WHERE name = 'Stephen Hawking';
    SELECT id INTO jackson_id FROM nodes WHERE name = 'Michael Jackson';
    SELECT id INTO campbell_id FROM nodes WHERE name = 'Naomi Campbell';
    SELECT id INTO musk_id FROM nodes WHERE name = 'Elon Musk';

    -- Epstein bağlantıları
    INSERT INTO links (source_id, target_id, strength, relationship_type) VALUES
    (epstein_id, maxwell_id, 95, 'criminal'),
    (epstein_id, brunel_id, 85, 'criminal'),
    (epstein_id, prince_id, 80, 'associated'),
    (epstein_id, wexner_id, 90, 'financial'),
    (epstein_id, dershowitz_id, 75, 'professional'),
    (epstein_id, clinton_id, 70, 'associated'),
    (epstein_id, trump_id, 45, 'associated'),
    (epstein_id, gates_id, 50, 'associated'),
    (epstein_id, spacey_id, 55, 'associated'),
    (epstein_id, dicaprio_id, 25, 'associated'),
    (epstein_id, hawking_id, 20, 'associated'),
    (epstein_id, jackson_id, 20, 'associated'),
    (epstein_id, campbell_id, 30, 'associated'),
    (epstein_id, musk_id, 15, 'associated');

    -- Maxwell bağlantıları
    INSERT INTO links (source_id, target_id, strength, relationship_type) VALUES
    (maxwell_id, prince_id, 85, 'associated'),
    (maxwell_id, brunel_id, 80, 'criminal'),
    (maxwell_id, campbell_id, 40, 'associated');

    -- Diğer
    INSERT INTO links (source_id, target_id, strength, relationship_type) VALUES
    (clinton_id, spacey_id, 35, 'associated'),
    (trump_id, prince_id, 30, 'associated');
END;
$$;

-- ============================================
-- MIGRATION V2 COMPLETE!
-- ============================================
-- Tablolar oluşturuldu ✅
-- Seed data eklendi ✅
-- RLS aktif ✅
-- ============================================
