-- ═══════════════════════════════════════════════════════════════
-- HAM BELGE ÖNİZLEME + AKILLI TARAMA — Migration
-- Sprint 18+ — "Belgeyi Taramadan Önce Oku"
-- ═══════════════════════════════════════════════════════════════

-- 1. documents tablosuna raw_content kolonu ekle
-- TEXT tipi: PostgreSQL büyük metni verimli saklar (TOAST ile sıkıştırır)
-- NULL: Eski belgeler etkilenmez, geriye uyumlu
ALTER TABLE documents ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- 2. raw_content dolu mu kontrolü için partial index
-- Sadece raw_content NULL olmayan satırları indeksler (hafif)
CREATE INDEX IF NOT EXISTS idx_documents_raw_content_exists
  ON documents ((raw_content IS NOT NULL));

-- 3. Yorum: Bu migration sonrası akış
-- Import sırasında: provider.getDocument() → rawContent → documents.raw_content
-- UI'da: scan_status='pending' olsa bile raw_content varsa gösterilir
-- Scan sırasında: Önce raw_content oku, yoksa eski yolla çek
-- Eski belgeler: raw_content=NULL → scan eski pipeline ile çalışır
