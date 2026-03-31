-- ============================================
-- PROJECT TRUTH: SCALABLE SCHEMA
-- Migration 002: Multi-network, Multi-country Support
-- ============================================

-- ============================================
-- 1. NETWORKS (Ağlar - Her dosya bir network)
-- ============================================
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kimlik
    slug VARCHAR(100) UNIQUE NOT NULL,  -- 'epstein-network', 'turkey-corruption-2024'
    name VARCHAR(255) NOT NULL,          -- 'Epstein Network'
    name_local VARCHAR(255),             -- 'Epstein Ağı' (yerel dil)

    -- Tanım
    description TEXT,
    description_local TEXT,

    -- Kategori
    category VARCHAR(50) NOT NULL DEFAULT 'investigation',  -- investigation, corruption, crime, trafficking, political

    -- Coğrafya
    primary_country VARCHAR(3),          -- ISO 3166-1 alpha-3: 'USA', 'TUR', 'GBR'
    country_tags VARCHAR(3)[] DEFAULT '{}',  -- ['USA', 'GBR', 'FRA', 'ISR']

    -- Durum
    status VARCHAR(20) DEFAULT 'active',  -- active, archived, under_review
    visibility VARCHAR(20) DEFAULT 'public',  -- public, restricted, private

    -- İstatistikler (denormalized for performance)
    node_count INT DEFAULT 0,
    link_count INT DEFAULT 0,
    evidence_count INT DEFAULT 0,
    contributor_count INT DEFAULT 0,

    -- Meta
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Arama için
    search_vector tsvector
);

-- Epstein Network'ü ekle
INSERT INTO networks (slug, name, name_local, description, category, primary_country, country_tags, status)
VALUES (
    'epstein-network',
    'Epstein Network',
    'Epstein Ağı',
    'Investigation into Jeffrey Epstein''s network of associates, victims, and enablers.',
    'trafficking',
    'USA',
    ARRAY['USA', 'GBR', 'FRA', 'ISR', 'VIR'],
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. NODES'a network_id ve country_tags ekle
-- ============================================
ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES networks(id),
ADD COLUMN IF NOT EXISTS country_tags VARCHAR(3)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS death_date DATE,
ADD COLUMN IF NOT EXISTS nationality VARCHAR(3),
ADD COLUMN IF NOT EXISTS occupation VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'unverified';  -- unverified, community, journalist, official

-- Mevcut nodes'ları Epstein network'üne bağla
UPDATE nodes
SET network_id = (SELECT id FROM networks WHERE slug = 'epstein-network')
WHERE network_id IS NULL;

-- ============================================
-- 3. VERIFICATION SOURCES (Doğrulama Kaynakları)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kimlik
    slug VARCHAR(100) UNIQUE NOT NULL,  -- 'teyit-org', 'snopes', 'afp-fact-check'
    name VARCHAR(255) NOT NULL,

    -- Tip
    source_type VARCHAR(50) NOT NULL,  -- fact_checker, news_org, government, court, academic, community

    -- Güvenilirlik
    trust_score INT DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),

    -- Coğrafya
    country VARCHAR(3),  -- Hangi ülkede aktif

    -- İletişim
    website_url TEXT,
    api_endpoint TEXT,  -- Otomatik doğrulama için

    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bazı doğrulama kaynakları ekle
INSERT INTO verification_sources (slug, name, source_type, trust_score, country, website_url) VALUES
('court-records', 'Court Records', 'court', 95, NULL, NULL),
('fbi-records', 'FBI Official Records', 'government', 95, 'USA', 'https://fbi.gov'),
('doj-records', 'US Department of Justice', 'government', 95, 'USA', 'https://justice.gov'),
('teyit-org', 'Teyit.org', 'fact_checker', 85, 'TUR', 'https://teyit.org'),
('snopes', 'Snopes', 'fact_checker', 80, 'USA', 'https://snopes.com'),
('afp-factcheck', 'AFP Fact Check', 'fact_checker', 85, NULL, 'https://factcheck.afp.com'),
('reuters-factcheck', 'Reuters Fact Check', 'fact_checker', 90, NULL, 'https://reuters.com/fact-check'),
('community', 'Community Verification', 'community', 50, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 4. NODE VERIFICATIONS (Düğüm Doğrulamaları)
-- ============================================
CREATE TABLE IF NOT EXISTS node_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES verification_sources(id),

    -- Doğrulama detayları
    claim TEXT NOT NULL,  -- Neyi doğruluyor?
    verdict VARCHAR(20) NOT NULL,  -- verified, disputed, debunked, unverified
    confidence INT DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),

    -- Kanıt
    evidence_url TEXT,
    evidence_summary TEXT,

    -- Meta
    verified_by VARCHAR(255),  -- Doğrulayan kişi/kurum
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- Bazı doğrulamalar geçici olabilir

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(node_id, source_id, claim)
);

-- ============================================
-- 5. CROSS REFERENCES (Çapraz Referanslar)
-- ============================================
CREATE TABLE IF NOT EXISTS cross_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kaynak ve hedef
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,

    -- Farklı ağlar arası mı?
    source_network_id UUID REFERENCES networks(id),
    target_network_id UUID REFERENCES networks(id),

    -- İlişki
    reference_type VARCHAR(50) NOT NULL,  -- same_person, related, mentioned_in, investigated_by
    description TEXT,
    confidence INT DEFAULT 50,

    -- Meta
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Aynı referans iki kere olmasın
    UNIQUE(source_node_id, target_node_id, reference_type)
);

-- ============================================
-- 6. EVIDENCE TABLOSUNU GÜNCELLEEvidance Archive zaten var, eklemeler yapalım
-- ============================================
-- evidence_archive tablosu zaten var, country_tags ekleyelim
ALTER TABLE evidence_archive
ADD COLUMN IF NOT EXISTS country_tags VARCHAR(3)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_primary_source BOOLEAN DEFAULT false;

-- ============================================
-- 7. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_nodes_network ON nodes(network_id);
CREATE INDEX IF NOT EXISTS idx_nodes_country ON nodes USING GIN(country_tags);
CREATE INDEX IF NOT EXISTS idx_networks_country ON networks USING GIN(country_tags);
CREATE INDEX IF NOT EXISTS idx_networks_search ON networks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_verifications_node ON node_verifications(node_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_source ON cross_references(source_node_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_target ON cross_references(target_node_id);

-- ============================================
-- 8. RLS POLICIES
-- ============================================
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_references ENABLE ROW LEVEL SECURITY;

-- Public read for all
CREATE POLICY "networks_read" ON networks FOR SELECT USING (visibility = 'public');
CREATE POLICY "verification_sources_read" ON verification_sources FOR SELECT USING (is_active = true);
CREATE POLICY "node_verifications_read" ON node_verifications FOR SELECT USING (true);
CREATE POLICY "cross_references_read" ON cross_references FOR SELECT USING (true);

-- ============================================
-- 9. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE networks;
ALTER PUBLICATION supabase_realtime ADD TABLE node_verifications;

-- ============================================
-- DONE!
-- ============================================
SELECT 'Migration 002 completed successfully!' as status;
