-- ============================================================
-- FAZ0 — error_reports Tablosu
-- Sprint 18 Legal Fortress: "Bu bilgi yanlış" bildirimi
-- Tarih: 31 Mart 2026
-- API Route: /api/report-error/route.ts (zaten var, tablo eksikti)
-- ============================================================

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hedef bilgisi
  target_type TEXT NOT NULL CHECK (target_type IN ('node', 'link', 'evidence', 'annotation')),
  target_id TEXT NOT NULL,
  target_name TEXT,
  network_id TEXT,

  -- Bildirim detayları
  reason TEXT NOT NULL CHECK (reason IN (
    'inaccurate', 'outdated', 'no_evidence', 'misleading',
    'privacy', 'harmful', 'duplicate', 'other'
  )),
  details TEXT NOT NULL CHECK (char_length(details) >= 10 AND char_length(details) <= 2000),
  correct_info TEXT,
  source_url TEXT,

  -- Bildiren kişi (anonim olabilir)
  reporter_email TEXT,
  reporter_fingerprint TEXT,

  -- Durum takibi
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Yeni bildirim, incelenmedi
    'investigating', -- İnceleniyor
    'resolved',      -- Düzeltme yapıldı
    'rejected',      -- Bildirim geçersiz
    'duplicate'      -- Zaten bildirilmiş
  )),

  -- İnceleme notları (admin/moderatör tarafından)
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,

  -- Zaman damgaları
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status);
CREATE INDEX IF NOT EXISTS idx_error_reports_target ON error_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_created ON error_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_network ON error_reports(network_id) WHERE network_id IS NOT NULL;

-- RLS
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: Sadece service_role (admin panel için)
CREATE POLICY "error_reports_service_select" ON error_reports
  FOR SELECT USING (auth.role() = 'service_role');

-- INSERT: Herkes bildirim gönderebilir (API route rate limit yapıyor)
CREATE POLICY "error_reports_anon_insert" ON error_reports
  FOR INSERT WITH CHECK (true);

-- UPDATE: Sadece service_role (admin inceleme)
CREATE POLICY "error_reports_service_update" ON error_reports
  FOR UPDATE USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_error_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS error_reports_updated_at ON error_reports;
CREATE TRIGGER error_reports_updated_at
  BEFORE UPDATE ON error_reports
  FOR EACH ROW EXECUTE FUNCTION update_error_reports_timestamp();

-- DOĞRULAMA
SELECT
  'error_reports' AS table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'error_reports';
