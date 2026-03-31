-- ============================================
-- SPRINT 6B MIGRATION: Epistemolojik Katman
-- "Görsel Ontoloji + Kaynak Provenance + ClaimReview"
-- ============================================
-- Tarih: 7 Mart 2026
-- Önkoşul: Sprint 6A migration tamamlanmış olmalı

-- ============================================
-- 1. LINKS TABLOSU GENİŞLETME (Görsel Ontoloji)
-- ============================================

-- Kanıt tipi (link rengi belirler)
ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_type TEXT
  DEFAULT 'inference'
  CHECK (evidence_type IN (
    'court_record',       -- Mahkeme kaydı (en güçlü)
    'official_document',  -- Resmi belge
    'leaked_document',    -- Sızdırılmış belge
    'financial_record',   -- Finansal kayıt
    'witness_testimony',  -- Tanık ifadesi
    'news_major',         -- Ana akım medya haberi
    'news_minor',         -- Yerel/küçük medya
    'academic_paper',     -- Akademik makale
    'social_media',       -- Sosyal medya
    'rumor',              -- Söylenti
    'inference'           -- AI/kullanıcı çıkarımı
  ));

-- Epistemolojik kesinlik seviyesi (0.00 = belirsiz, 1.00 = kesin)
-- 3D'de: 0.0-0.3 = kesikli çizgi, 0.3-0.7 = yarı saydam, 0.7-1.0 = solid parlak
ALTER TABLE links ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(3,2)
  DEFAULT 0.50
  CHECK (confidence_level BETWEEN 0.00 AND 1.00);

-- Kaynak hiyerarşisi (Snopes modeli: birincil > ikincil > üçüncül)
ALTER TABLE links ADD COLUMN IF NOT EXISTS source_hierarchy TEXT
  DEFAULT 'tertiary'
  CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary'));

-- Destekleyen kanıt sayısı (3D'de çizgi kalınlığı)
ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;

-- ============================================
-- 2. EVIDENCE PROVENANCE TABLOSU (Yeni)
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL,
  evidence_table TEXT NOT NULL
    CHECK (evidence_table IN ('evidence_archive', 'community_evidence')),

  -- Kaynak bilgisi
  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'court_record', 'official_document', 'leaked_document',
      'financial_record', 'witness_testimony', 'news_major',
      'news_minor', 'social_media', 'academic_paper', 'rumor'
    )),
  source_hierarchy TEXT NOT NULL DEFAULT 'tertiary'
    CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary')),

  -- Doğrulama zinciri
  source_url TEXT,
  source_archive_url TEXT,     -- Web Archive snapshot URL
  source_hash TEXT,            -- SHA-256 of original document
  verification_chain JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "user_id": "...", "action": "verify|dispute", "timestamp": "...", "method": "..." }]

  metadata_stripped BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_provenance_evidence ON evidence_provenance(evidence_id);
CREATE INDEX IF NOT EXISTS idx_provenance_type ON evidence_provenance(source_type);
CREATE INDEX IF NOT EXISTS idx_provenance_hierarchy ON evidence_provenance(source_hierarchy);

-- RLS
ALTER TABLE evidence_provenance ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "Anyone can read provenance" ON evidence_provenance;
CREATE POLICY "Anyone can read provenance" ON evidence_provenance
  FOR SELECT USING (true);

-- Herkes ekleyebilir
DROP POLICY IF EXISTS "Anyone can insert provenance" ON evidence_provenance;
CREATE POLICY "Anyone can insert provenance" ON evidence_provenance
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. EVIDENCE ARCHIVE GENİŞLETME (ClaimReview)
-- ============================================

-- IFCN değerlendirme derecesi
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rating TEXT
  CHECK (ifcn_rating IN (
    'true', 'mostly_true', 'half_true',
    'mostly_false', 'false', 'pants_on_fire',
    'missing_context', 'unverifiable'
  ));

-- ClaimReview JSON-LD (otomatik üretilir)
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_json JSONB;

-- ClaimReview yayınlandı mı
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_published BOOLEAN DEFAULT false;

-- Kim değerlendirdi
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rated_by TEXT;

-- Ne zaman değerlendirildi
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rating_date TIMESTAMPTZ;

-- ============================================
-- 4. RPC FONKSİYONLARI
-- ============================================

-- Link confidence otomatik hesaplama
CREATE OR REPLACE FUNCTION recalculate_link_confidence(p_link_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_confidence NUMERIC(3,2);
  v_evidence_count INTEGER;
  v_best_hierarchy TEXT;
  v_best_type TEXT;
BEGIN
  -- Bağlantıya ait kanıtların ağırlıklı ortalaması
  SELECT
    COALESCE(
      ROUND(AVG(
        CASE ep.source_hierarchy
          WHEN 'primary' THEN 0.9
          WHEN 'secondary' THEN 0.6
          WHEN 'tertiary' THEN 0.3
        END *
        CASE ep.source_type
          WHEN 'court_record' THEN 1.0
          WHEN 'official_document' THEN 0.9
          WHEN 'leaked_document' THEN 0.8
          WHEN 'financial_record' THEN 0.85
          WHEN 'witness_testimony' THEN 0.7
          WHEN 'news_major' THEN 0.65
          WHEN 'news_minor' THEN 0.5
          WHEN 'academic_paper' THEN 0.75
          WHEN 'social_media' THEN 0.3
          WHEN 'rumor' THEN 0.15
          ELSE 0.2
        END
      ), 2),
    0.50),
    COUNT(*)
  INTO v_confidence, v_evidence_count
  FROM evidence_archive ea
  JOIN evidence_provenance ep ON ep.evidence_id = ea.id AND ep.evidence_table = 'evidence_archive'
  WHERE ea.link_id = p_link_id;

  -- En güçlü kaynak tipini bul
  SELECT ep.source_type, ep.source_hierarchy
  INTO v_best_type, v_best_hierarchy
  FROM evidence_archive ea
  JOIN evidence_provenance ep ON ep.evidence_id = ea.id AND ep.evidence_table = 'evidence_archive'
  WHERE ea.link_id = p_link_id
  ORDER BY
    CASE ep.source_hierarchy WHEN 'primary' THEN 1 WHEN 'secondary' THEN 2 ELSE 3 END,
    CASE ep.source_type
      WHEN 'court_record' THEN 1
      WHEN 'official_document' THEN 2
      WHEN 'financial_record' THEN 3
      ELSE 10
    END
  LIMIT 1;

  -- Link'i güncelle
  UPDATE links SET
    confidence_level = v_confidence,
    evidence_count = v_evidence_count,
    evidence_type = COALESCE(v_best_type, evidence_type),
    source_hierarchy = COALESCE(v_best_hierarchy, source_hierarchy)
  WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'link_id', p_link_id,
    'confidence_level', v_confidence,
    'evidence_count', v_evidence_count,
    'evidence_type', v_best_type,
    'source_hierarchy', v_best_hierarchy
  );
END;
$$ LANGUAGE plpgsql;

-- ClaimReview JSON-LD üretici
CREATE OR REPLACE FUNCTION generate_claim_review(p_evidence_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_evidence RECORD;
  v_claim_review JSONB;
  v_rating_value INTEGER;
BEGIN
  SELECT * INTO v_evidence FROM evidence_archive WHERE id = p_evidence_id;

  IF v_evidence IS NULL OR v_evidence.ifcn_rating IS NULL THEN
    RETURN NULL;
  END IF;

  -- IFCN rating → sayısal değer
  v_rating_value := CASE v_evidence.ifcn_rating
    WHEN 'true' THEN 5
    WHEN 'mostly_true' THEN 4
    WHEN 'half_true' THEN 3
    WHEN 'missing_context' THEN 3
    WHEN 'mostly_false' THEN 2
    WHEN 'false' THEN 1
    WHEN 'pants_on_fire' THEN 0
    WHEN 'unverifiable' THEN 2
    ELSE 2
  END;

  v_claim_review := jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'ClaimReview',
    'datePublished', COALESCE(v_evidence.ifcn_rating_date, now()),
    'claimReviewed', v_evidence.title,
    'reviewRating', jsonb_build_object(
      '@type', 'Rating',
      'ratingValue', v_rating_value,
      'bestRating', 5,
      'worstRating', 0,
      'alternateName', v_evidence.ifcn_rating
    ),
    'itemReviewed', jsonb_build_object(
      '@type', 'Claim',
      'datePublished', v_evidence.source_date
    ),
    'author', jsonb_build_object(
      '@type', 'Organization',
      'name', 'Project Truth',
      'url', 'https://projecttruth.org'
    )
  );

  -- Kaydet
  UPDATE evidence_archive
  SET claim_review_json = v_claim_review,
      claim_review_published = true
  WHERE id = p_evidence_id;

  RETURN v_claim_review;
END;
$$ LANGUAGE plpgsql;

-- Tüm linklerin confidence verisi (3D scene için toplu çekme)
CREATE OR REPLACE FUNCTION get_link_confidence_map(p_network_id UUID DEFAULT NULL)
RETURNS TABLE(
  link_id UUID,
  evidence_type TEXT,
  confidence_level NUMERIC,
  source_hierarchy TEXT,
  evidence_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS link_id,
    l.evidence_type,
    l.confidence_level,
    l.source_hierarchy,
    l.evidence_count
  FROM links l
  WHERE (p_network_id IS NULL OR l.network_id = p_network_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. EPSTEIN AĞI SEED DATA
-- ============================================

-- Güçlü kanıtlı bağlantılar (mahkeme kayıtlı)
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.95,
  source_hierarchy = 'primary',
  evidence_count = 12
WHERE description ILIKE '%Maxwell%' OR description ILIKE '%Ghislaine%';

-- Tanık ifadeli bağlantılar
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.72,
  source_hierarchy = 'secondary',
  evidence_count = 6
WHERE (description ILIKE '%Prince%Andrew%' OR description ILIKE '%Andrew%')
  AND evidence_type = 'inference';

-- Finansal kayıtlar
UPDATE links SET
  evidence_type = 'financial_record',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 8
WHERE (description ILIKE '%fund%' OR description ILIKE '%financial%' OR description ILIKE '%money%' OR description ILIKE '%bank%')
  AND evidence_type = 'inference';

-- Resmi belgeler
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.80,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE (description ILIKE '%FBI%' OR description ILIKE '%DOJ%' OR description ILIKE '%court%' OR description ILIKE '%indictment%')
  AND evidence_type = 'inference';

-- Haber kaynakları
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.60,
  source_hierarchy = 'secondary',
  evidence_count = 4
WHERE evidence_type = 'inference'
  AND (description ILIKE '%report%' OR description ILIKE '%news%' OR description ILIKE '%article%');

-- Kalan inference'lar: varsayılan değerler ata
UPDATE links SET
  evidence_type = 'inference',
  confidence_level = 0.40,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE evidence_type = 'inference' AND confidence_level = 0.50;

-- ============================================
-- MIGRATION TAMAMLANDI
-- ============================================
-- Doğrulama: SELECT evidence_type, confidence_level, evidence_count FROM links LIMIT 10;
