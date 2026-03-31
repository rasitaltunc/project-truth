-- ═══════════════════════════════════════════════════════════════
-- CLEAN START LEGACY MIGRATION (2026-03-23)
-- ═══════════════════════════════════════════════════════════════
--
-- Bu migration, dosyasız (metadata-only) belgeleri "legacy" olarak işaretler.
-- Veri SİLİNMEZ — sadece gizlenir. Gelecekte gerçek dosyalar eklenirse
-- legacy etiketi kaldırılabilir.
--
-- Truth Anayasası #8: "Yanlış veri, eksik veriden her zaman daha tehlikelidir."
-- Karar: Raşit & Claude, 2026-03-23 — "Sıfırdan temiz başla"
--
-- ÇALIŞTIRMADAN ÖNCE:
-- 1. Bu SQL'i önce SELECT ile test et (aşağıdaki audit query)
-- 2. Etkilenen belge sayısını doğrula
-- 3. Ardından UPDATE'i çalıştır
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- STEP 0: Audit — Kaç belge etkilenecek?
-- ─────────────────────────────────────────────

-- Dosyasız belgeleri say
SELECT
  COUNT(*) as total_fileless,
  COUNT(CASE WHEN source_type = 'courtlistener' THEN 1 END) as courtlistener,
  COUNT(CASE WHEN source_type = 'icij' THEN 1 END) as icij,
  COUNT(CASE WHEN source_type = 'opensanctions' THEN 1 END) as opensanctions,
  COUNT(CASE WHEN source_type = 'manual_upload' THEN 1 END) as manual_upload,
  COUNT(CASE WHEN source_type NOT IN ('courtlistener', 'icij', 'opensanctions', 'manual_upload') THEN 1 END) as other
FROM documents
WHERE file_path IS NULL OR file_path = '';

-- Dosyalı belgeleri say (bunlar KORUNACAK)
SELECT
  COUNT(*) as total_with_files
FROM documents
WHERE file_path IS NOT NULL AND file_path != '';

-- ─────────────────────────────────────────────
-- STEP 1: scan_status = 'legacy' olarak işaretle
-- ─────────────────────────────────────────────
-- Dosyasız belgelerin scan_status'unu 'legacy' yapıyoruz.
-- Bu sayede:
-- - UI'da varsayılan sorgular bunları görmez (scan_status != 'legacy')
-- - Veri korunur, metadata hâlâ erişilebilir
-- - İleride gerçek dosya eklenirse 'pending' yapılabilir

UPDATE documents
SET
  scan_status = 'legacy',
  metadata = CASE
    WHEN metadata IS NULL OR jsonb_typeof(metadata::jsonb) != 'object'
      THEN jsonb_build_object('_legacy', jsonb_build_object(
        'reason', 'clean_start_policy_2026_03_23',
        'note', 'Metadata-only record. No file in GCS or Supabase Storage.',
        'marked_at', NOW()::text,
        'original_scan_status', scan_status
      ))
    ELSE metadata::jsonb || jsonb_build_object('_legacy', jsonb_build_object(
        'reason', 'clean_start_policy_2026_03_23',
        'note', 'Metadata-only record. No file in GCS or Supabase Storage.',
        'marked_at', NOW()::text,
        'original_scan_status', scan_status
      ))
  END
WHERE
  (file_path IS NULL OR file_path = '')
  AND scan_status != 'legacy';  -- idempotent: zaten legacy olanları atla

-- ─────────────────────────────────────────────
-- STEP 2: İlişkili quarantine kayıtlarını temizle
-- ─────────────────────────────────────────────
-- Dosyasız belgelere ait quarantine kayıtları da legacy yapılır.
-- Bu kayıtlar zaten doğrulanamaz (orijinal belge yok).

UPDATE data_quarantine
SET
  verification_status = 'rejected',
  provenance_chain = COALESCE(provenance_chain, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'action', 'auto_rejected',
      'timestamp', NOW()::text,
      'actor', 'system:clean_start_policy',
      'reason', 'Clean Start Policy 2026-03-23: source document has no file (legacy metadata-only record)'
    )
  )
WHERE
  document_id IN (
    SELECT id FROM documents WHERE scan_status = 'legacy'
  )
  AND verification_status IN ('quarantined', 'pending_review');

-- ─────────────────────────────────────────────
-- STEP 3: İlişkili derived items'ı temizle
-- ─────────────────────────────────────────────
-- Dosyasız belgelerden türetilmiş AI çıkarımları da işaretlenir.

UPDATE document_derived_items
SET
  status = 'rejected',
  item_data = item_data || '{"_legacy_rejected": "clean_start_policy_2026_03_23"}'::jsonb
WHERE
  document_id IN (
    SELECT id FROM documents WHERE scan_status = 'legacy'
  )
  AND status != 'rejected';

-- ─────────────────────────────────────────────
-- STEP 4: Doğrulama — Sonuçları kontrol et
-- ─────────────────────────────────────────────

SELECT
  scan_status,
  COUNT(*) as count
FROM documents
GROUP BY scan_status
ORDER BY count DESC;

-- Beklenen sonuç:
-- legacy    | ~766
-- pending   | (gerçek dosyalı belgeler)
-- scanned   | (taranmış belgeler)
-- etc.
