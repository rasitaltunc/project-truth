-- ============================================================================
-- SPRINT 14C: Evidence Type Constraint Genişletme
-- flight_record ekle (Lolita Express, Gulfstream uçuş bağlantıları için)
-- ============================================================================

-- 1. Mevcut constraint'i kaldır
ALTER TABLE links DROP CONSTRAINT IF EXISTS links_evidence_type_check;

-- 2. Genişletilmiş constraint ekle (flight_record dahil)
ALTER TABLE links ADD CONSTRAINT links_evidence_type_check
  CHECK (evidence_type IN (
    'court_record',       -- Mahkeme kaydı
    'official_document',  -- Resmi belge
    'leaked_document',    -- Sızdırılmış belge
    'financial_record',   -- Finansal kayıt
    'flight_record',      -- Uçuş kaydı (YENİ)
    'witness_testimony',  -- Tanık ifadesi
    'news_major',         -- Ana akım medya
    'news_minor',         -- Yerel medya
    'social_media',       -- Sosyal medya
    'academic_paper',     -- Akademik makale
    'rumor',              -- Söylenti
    'inference'           -- AI/kullanıcı çıkarımı
  ));

-- 3. Constraint eklendikten sonra Lolita Express + Gulfstream güncellemelerini çalıştır:
-- (LINK_METADATA_SEED.sql'deki ilgili UPDATE'ler)

-- Lolita Express → Jeffrey Epstein
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Lolita Express → Bill Clinton
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Bill Clinton' LIMIT 1);

-- Lolita Express → Prince Andrew
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1);

-- Lolita Express → Ghislaine Maxwell
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Lolita Express → Little St. James
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1);

-- Gulfstream IV → Jeffrey Epstein
UPDATE links SET evidence_type = 'flight_record'
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Gulfstream IV (N120JE)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);
