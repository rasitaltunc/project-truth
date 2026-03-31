-- ============================================
-- Migration 004: Evidence Archive Table + Seed Data
-- Önce tablo yapısını düzelt, sonra veri ekle
-- ============================================

-- ============================================
-- ADIM 1: evidence_archive tablosunu oluştur/düzelt
-- ============================================

-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS evidence_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'document',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    verification_status VARCHAR(20) DEFAULT 'unverified',
    is_primary_source BOOLEAN DEFAULT false,
    country_tags VARCHAR(3)[] DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eksik kolonları ekle (varsa atla)
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) DEFAULT 'document';
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_date DATE;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS is_primary_source BOOLEAN DEFAULT false;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS country_tags VARCHAR(3)[] DEFAULT '{}';
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_evidence_node ON evidence_archive(node_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_archive(evidence_type);

-- RLS
ALTER TABLE evidence_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_read" ON evidence_archive;
CREATE POLICY "evidence_read" ON evidence_archive FOR SELECT USING (true);

-- ============================================
-- ADIM 2: Seed Evidence Data
-- ============================================

-- Önce node ID'lerini alalım
DO $$
DECLARE
    epstein_id UUID;
    maxwell_id UUID;
    andrew_id UUID;
    clinton_id UUID;
    brunel_id UUID;
    wexner_id UUID;
BEGIN
    SELECT id INTO epstein_id FROM nodes WHERE name = 'Jeffrey Epstein';
    SELECT id INTO maxwell_id FROM nodes WHERE name = 'Ghislaine Maxwell';
    SELECT id INTO andrew_id FROM nodes WHERE name = 'Prince Andrew';
    SELECT id INTO clinton_id FROM nodes WHERE name = 'Bill Clinton';
    SELECT id INTO brunel_id FROM nodes WHERE name = 'Jean-Luc Brunel';
    SELECT id INTO wexner_id FROM nodes WHERE name = 'Les Wexner';

    -- Log
    RAISE NOTICE 'Epstein ID: %', epstein_id;
    RAISE NOTICE 'Maxwell ID: %', maxwell_id;

    -- ============================================
    -- JEFFREY EPSTEIN - KANITLAR
    -- ============================================

    IF epstein_id IS NOT NULL THEN
        -- Uçuş Kayıtları
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            epstein_id,
            'document',
            'Lolita Express Uçuş Kayıtları',
            'Jeffrey Epstein''in özel uçağı "Lolita Express" (N908JE) için FAA tarafından yayınlanan uçuş logları. 1997-2005 arası uçuşları içerir.',
            'Federal Aviation Administration (FAA)',
            'https://www.documentcloud.org/documents/1507315-epstein-flight-manifests.html',
            '2015-01-05',
            'official',
            true,
            ARRAY['USA', 'VIR'],
            'en'
        ) ON CONFLICT DO NOTHING;

        -- Palm Beach Polis Raporu
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            epstein_id,
            'document',
            'Palm Beach Polis Departmanı Soruşturma Raporu',
            '2005-2006 yılları arasında yürütülen soruşturmanın detaylı raporu. Mağdur ifadeleri ve kanıt listesi içerir.',
            'Palm Beach Police Department',
            'https://www.palmbeachpost.com/news/crime--law/documents-the-palm-beach-police-probe-jeffrey-epstein/',
            '2006-05-01',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;

        -- Federal İddianame 2019
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            epstein_id,
            'legal',
            'SDNY Federal İddianamesi (2019)',
            'ABD Güney New York Bölge Savcılığı tarafından hazırlanan iddianame. Cinsel istismar ve insan ticareti suçlamaları.',
            'U.S. Department of Justice - SDNY',
            'https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-sex-trafficking-minors',
            '2019-07-08',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;

        -- Zorro Ranch
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            epstein_id,
            'document',
            'Zorro Ranch Mülkiyet Kayıtları',
            'New Mexico''daki Zorro Ranch mülkünün tapu ve inşaat izin belgeleri.',
            'New Mexico Property Records',
            NULL,
            '1993-01-01',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- ============================================
    -- GHISLAINE MAXWELL - KANITLAR
    -- ============================================

    IF maxwell_id IS NOT NULL THEN
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            maxwell_id,
            'legal',
            'SDNY Federal İddianamesi - Maxwell',
            'Ghislaine Maxwell hakkındaki federal iddianame. Cinsel istismarın kolaylaştırılması ve yalan yere yemin etme suçlamaları.',
            'U.S. Department of Justice - SDNY',
            'https://www.justice.gov/usao-sdny/pr/ghislaine-maxwell-charged-manhattan-federal-court-conspiring-jeffrey-epstein-sexually',
            '2020-07-02',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            maxwell_id,
            'legal',
            'Maxwell Mahkumiyet Kararı',
            'Ghislaine Maxwell''in jüri tarafından 5 ayrı suçtan mahkum edilmesi. 20 yıl hapis cezası.',
            'U.S. District Court SDNY',
            'https://www.courtlistener.com/docket/17318376/united-states-v-maxwell/',
            '2021-12-29',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- ============================================
    -- PRINCE ANDREW - KANITLAR
    -- ============================================

    IF andrew_id IS NOT NULL THEN
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            andrew_id,
            'media',
            'BBC Newsnight Röportajı',
            'Prince Andrew''un Emily Maitlis ile yaptığı tartışmalı röportaj. Virginia Giuffre ile fotoğrafı ve ilişkiyi reddetti.',
            'BBC News',
            'https://www.bbc.com/news/uk-50449339',
            '2019-11-16',
            'official',
            true,
            ARRAY['GBR'],
            'en'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            andrew_id,
            'legal',
            'Virginia Giuffre Davası - Uzlaşma',
            'Virginia Giuffre tarafından açılan hukuk davasının gizli bir uzlaşma ile sonuçlanması.',
            'U.S. District Court SDNY',
            'https://www.theguardian.com/uk-news/2022/feb/15/prince-andrew-virginia-giuffre-settlement-agreement',
            '2022-02-15',
            'journalist',
            false,
            ARRAY['USA', 'GBR'],
            'en'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            andrew_id,
            'photo',
            'Prince Andrew - Virginia Giuffre Fotoğrafı',
            'Maxwell''in Londra evinde çekilen, Prince Andrew ve Virginia Giuffre''yi (17 yaşında) birlikte gösteren fotoğraf.',
            'Court Evidence',
            NULL,
            '2001-03-10',
            'official',
            true,
            ARRAY['GBR'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- ============================================
    -- BILL CLINTON - KANITLAR
    -- ============================================

    IF clinton_id IS NOT NULL THEN
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            clinton_id,
            'document',
            'Uçuş Loglarında Clinton Kayıtları',
            'Bill Clinton''ın Lolita Express uçuş loglarında en az 26 kez yer aldığını gösteren kayıtlar.',
            'FAA Flight Logs',
            'https://www.documentcloud.org/documents/1507315-epstein-flight-manifests.html',
            '2015-01-05',
            'official',
            true,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- ============================================
    -- JEAN-LUC BRUNEL - KANITLAR
    -- ============================================

    IF brunel_id IS NOT NULL THEN
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            brunel_id,
            'news',
            'Brunel Tutuklanması Haberi',
            'Jean-Luc Brunel''in Paris Charles de Gaulle Havalimanı''nda tutuklanması.',
            'Le Monde',
            'https://www.lemonde.fr/societe/article/2020/12/17/affaire-epstein-le-francais-jean-luc-brunel-arrete_6063729_3224.html',
            '2020-12-16',
            'journalist',
            false,
            ARRAY['FRA'],
            'fr'
        ) ON CONFLICT DO NOTHING;

        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            brunel_id,
            'news',
            'Brunel Ölümü - Hücre İntiharı',
            'Jean-Luc Brunel''in Paris''te cezaevinde ölü bulunması. Resmi açıklama: intihar.',
            'AFP',
            'https://www.france24.com/en/europe/20220219-french-modelling-agent-jean-luc-brunel-found-dead-in-jail-cell',
            '2022-02-19',
            'official',
            true,
            ARRAY['FRA'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- ============================================
    -- LES WEXNER - KANITLAR
    -- ============================================

    IF wexner_id IS NOT NULL THEN
        INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
        VALUES (
            wexner_id,
            'document',
            'Wexner-Epstein Vekalet Belgesi',
            'Les Wexner''ın Epstein''a kapsamlı mali vekalet verdiğini gösteren belge.',
            'New York Times Investigation',
            'https://www.nytimes.com/2019/07/25/business/jeffrey-epstein-wexner-victorias-secret.html',
            '2019-07-25',
            'journalist',
            false,
            ARRAY['USA'],
            'en'
        ) ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- ============================================
-- KONTROL
-- ============================================
SELECT
    n.name as kisi,
    COUNT(e.id) as kanit_sayisi
FROM nodes n
LEFT JOIN evidence_archive e ON n.id = e.node_id
GROUP BY n.name
ORDER BY kanit_sayisi DESC;
