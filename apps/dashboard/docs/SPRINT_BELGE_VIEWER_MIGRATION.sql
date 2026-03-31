-- ═══════════════════════════════════════════════════════
-- SPRINT: GERÇEK BELGE SİSTEMİ — OCR + PDF Viewer
-- Manuel belge yükleme, OCR, görsel inceleme
-- ═══════════════════════════════════════════════════════

-- OCR metadata columns
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ocr_page_count INT,
  ADD COLUMN IF NOT EXISTS display_url TEXT;

-- Index for OCR status queries
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status
ON documents(network_id, ocr_status);

-- Index for manual uploads
CREATE INDEX IF NOT EXISTS idx_documents_source_manual
ON documents(network_id, source_type) WHERE source_type = 'manual';
