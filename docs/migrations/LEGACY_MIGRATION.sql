-- ============================================================================
-- LEGACY MIGRATION: "SIFIRDAN BAŞLA" — Temiz Slate Dönüşümü
-- ============================================================================
-- Tarih: 13 Mart 2026
-- Amaç: Mevcut seed node/link verilerini legacy olarak işaretle,
--        yeni node/link'lere belge referansı zorunluluğu getir.
--
-- TRUTH ANAYASASI:
-- "Her iddia doğrulanabilir kaynak göstermeli."
-- "Her node'un doğum belgesi = hangi belge, sayfa, cümle."
--
-- STRATEJİ:
-- Mevcut node'ları SİLMİYORUZ — "legacy" olarak işaretliyoruz.
-- Yeni node'lar SADECE belge referansıyla gelebilir.
-- İki veri katmanı yan yana yaşar:
--   1. legacy = seed data (doğrulanmamış, gösterim amaçlı)
--   2. verified = belge taramasından gelen (karantinadan geçmiş)
-- ============================================================================

-- ============================================================================
-- BÖLÜM 1: nodes tablosuna yeni kolonlar ekle
-- ============================================================================

-- source_document_id: Bu node hangi belgeden çıkarıldı?
-- NULL = legacy/seed data (belge referansı yok)
-- NOT NULL = belge taramasından geldi (karantinadan geçti)
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- source_location: Belgede tam olarak nerede?
-- Örnek: "page 3, paragraph 2" veya "Exhibit GX-1517, page 12, line 4"
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS source_location TEXT;

-- data_origin: Verinin nereden geldiğini belirten etiket
-- 'seed' = Geliştirme sırasında manuel eklenen
-- 'community_verified' = Karantinadan geçip onaylanan
-- 'structured_import' = ICIJ/OpenSanctions gibi yapısal kaynaktan
-- 'ai_extracted' = AI taramasıyla çıkarılıp doğrulanan
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS data_origin TEXT DEFAULT 'seed'
  CHECK (data_origin IN ('seed', 'community_verified', 'structured_import', 'ai_extracted'));

-- fingerprint: Biricik Kod — SHA256(name + type + created_at)
-- Entity resolution ve değişiklik takibi için
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- ============================================================================
-- BÖLÜM 2: links tablosuna aynı kolonlar ekle
-- ============================================================================

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS source_location TEXT;

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS data_origin TEXT DEFAULT 'seed'
  CHECK (data_origin IN ('seed', 'community_verified', 'structured_import', 'ai_extracted'));

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- ============================================================================
-- BÖLÜM 3: Mevcut verileri "seed" olarak işaretle
-- ============================================================================
-- NOT: data_origin DEFAULT 'seed' olduğu için mevcut veriler otomatik olarak
-- 'seed' etiketini alır. Ama açıklık için explicit güncelleme yapıyoruz.

UPDATE nodes
  SET data_origin = 'seed'
  WHERE source_document_id IS NULL
    AND data_origin IS NULL;

UPDATE links
  SET data_origin = 'seed'
  WHERE source_document_id IS NULL
    AND data_origin IS NULL;

-- ============================================================================
-- BÖLÜM 4: Mevcut node'lar için fingerprint oluştur
-- ============================================================================
-- Biricik Kod Sistemi: SHA256(name || type || created_at)

UPDATE nodes
  SET fingerprint = encode(
    sha256(
      convert_to(
        COALESCE(name, '') || '::' || COALESCE(type, '') || '::' || COALESCE(created_at::text, ''),
        'UTF8'
      )
    ),
    'hex'
  )
  WHERE fingerprint IS NULL;

UPDATE links
  SET fingerprint = encode(
    sha256(
      convert_to(
        COALESCE(source_id::text, '') || '::' || COALESCE(target_id::text, '') || '::' || COALESCE(relationship_type, '') || '::' || COALESCE(created_at::text, ''),
        'UTF8'
      )
    ),
    'hex'
  )
  WHERE fingerprint IS NULL;

-- ============================================================================
-- BÖLÜM 5: İndeksler (sorgu performansı)
-- ============================================================================

-- "Bu belgeden hangi node'lar çıkarıldı?" sorgusu
CREATE INDEX IF NOT EXISTS idx_nodes_source_document
  ON nodes(source_document_id)
  WHERE source_document_id IS NOT NULL;

-- "Tüm legacy/seed verileri göster" sorgusu
CREATE INDEX IF NOT EXISTS idx_nodes_data_origin
  ON nodes(data_origin);

-- Fingerprint ile hızlı duplicate kontrolü
CREATE INDEX IF NOT EXISTS idx_nodes_fingerprint
  ON nodes(fingerprint)
  WHERE fingerprint IS NOT NULL;

-- Links için aynı indeksler
CREATE INDEX IF NOT EXISTS idx_links_source_document
  ON links(source_document_id)
  WHERE source_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_links_data_origin
  ON links(data_origin);

CREATE INDEX IF NOT EXISTS idx_links_fingerprint
  ON links(fingerprint)
  WHERE fingerprint IS NOT NULL;

-- ============================================================================
-- BÖLÜM 6: Veri bütünlüğü görünümü (view)
-- ============================================================================
-- Dashboard'da "kaç node belgelenmiş, kaç seed" göstermek için

CREATE OR REPLACE VIEW node_provenance_stats AS
SELECT
  n.network_id,
  net.name AS network_name,
  COUNT(*) AS total_nodes,
  COUNT(*) FILTER (WHERE n.data_origin = 'seed') AS seed_nodes,
  COUNT(*) FILTER (WHERE n.data_origin = 'community_verified') AS verified_nodes,
  COUNT(*) FILTER (WHERE n.data_origin = 'structured_import') AS imported_nodes,
  COUNT(*) FILTER (WHERE n.data_origin = 'ai_extracted') AS ai_extracted_nodes,
  COUNT(*) FILTER (WHERE n.source_document_id IS NOT NULL) AS documented_nodes,
  COUNT(*) FILTER (WHERE n.source_document_id IS NULL) AS undocumented_nodes,
  ROUND(
    (COUNT(*) FILTER (WHERE n.source_document_id IS NOT NULL))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    1
  ) AS documentation_percentage
FROM nodes n
LEFT JOIN networks net ON n.network_id = net.id
GROUP BY n.network_id, net.name;

-- ============================================================================
-- BÖLÜM 7: Promote route için helper function
-- ============================================================================
-- Karantinadan onaylanan veriyi ağa eklerken fingerprint otomatik oluşsun

CREATE OR REPLACE FUNCTION generate_node_fingerprint()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fingerprint IS NULL THEN
    NEW.fingerprint := encode(
      sha256(
        convert_to(
          COALESCE(NEW.name, '') || '::' || COALESCE(NEW.type, '') || '::' || COALESCE(NEW.created_at::text, now()::text),
          'UTF8'
        )
      ),
      'hex'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_link_fingerprint()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fingerprint IS NULL THEN
    NEW.fingerprint := encode(
      sha256(
        convert_to(
          COALESCE(NEW.source_id::text, '') || '::' || COALESCE(NEW.target_id::text, '') || '::' || COALESCE(NEW.relationship_type, '') || '::' || COALESCE(NEW.created_at::text, now()::text),
          'UTF8'
        )
      ),
      'hex'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Her yeni node/link'e otomatik fingerprint
DROP TRIGGER IF EXISTS trg_node_fingerprint ON nodes;
CREATE TRIGGER trg_node_fingerprint
  BEFORE INSERT ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION generate_node_fingerprint();

DROP TRIGGER IF EXISTS trg_link_fingerprint ON links;
CREATE TRIGGER trg_link_fingerprint
  BEFORE INSERT ON links
  FOR EACH ROW
  EXECUTE FUNCTION generate_link_fingerprint();

-- ============================================================================
-- DOĞRULAMA SORGULARI (Migration sonrası çalıştır)
-- ============================================================================

-- 1. Tüm mevcut node'lar 'seed' olarak işaretlendi mi?
-- SELECT count(*) FROM nodes WHERE data_origin = 'seed';
-- Beklenen: mevcut node sayısı (15-18 civarı)

-- 2. Tüm node'ların fingerprint'i var mı?
-- SELECT count(*) FROM nodes WHERE fingerprint IS NULL;
-- Beklenen: 0

-- 3. Provenance stats görünümü çalışıyor mu?
-- SELECT * FROM node_provenance_stats;

-- 4. Trigger çalışıyor mu? (test insert + delete)
-- INSERT INTO nodes (network_id, name, type) VALUES ('test-net-id', 'TEST_NODE', 'person');
-- SELECT fingerprint FROM nodes WHERE name = 'TEST_NODE';
-- DELETE FROM nodes WHERE name = 'TEST_NODE';

-- ============================================================================
-- SON NOT
-- ============================================================================
-- Bu migration GERİ DÖNÜŞÜMSÜZ değil — veriler silinmiyor, sadece etiketleniyor.
-- Rollback: ALTER TABLE nodes DROP COLUMN source_document_id, source_location, data_origin, fingerprint;
-- Ama bunu yapma. Biz ileriye gidiyoruz.
-- ============================================================================
