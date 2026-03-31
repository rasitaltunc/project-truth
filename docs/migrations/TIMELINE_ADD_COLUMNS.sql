-- ============================================================================
-- link_evidence_timeline'a evidence_type + verification_status kolonu ekle
-- evidence_archive join'i NULL olduğunda kendi metadata'sını kullanabilsin
-- ============================================================================

ALTER TABLE link_evidence_timeline
ADD COLUMN IF NOT EXISTS evidence_type TEXT DEFAULT 'inference',
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ============================================================================
-- Mevcut verileri güncelle — gerçek kanıt tipleri ve doğrulama durumları
-- ============================================================================

-- EPSTEIN ↔ MAXWELL
UPDATE link_evidence_timeline SET evidence_type = 'social_media', verification_status = 'credible', confidence = 0.65
WHERE display_label ILIKE '%İlk Tanışma%Londra%';

UPDATE link_evidence_timeline SET evidence_type = 'witness_testimony', verification_status = 'verified', confidence = 0.92
WHERE display_label ILIKE '%Kurban Ağı%';

UPDATE link_evidence_timeline SET evidence_type = 'official_document', verification_status = 'verified', confidence = 0.88
WHERE display_label ILIKE '%Palm Beach Polis%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.97
WHERE display_label ILIKE '%NPA Anlaşması%Tartışmalı%';

UPDATE link_evidence_timeline SET evidence_type = 'news_major', verification_status = 'credible', confidence = 0.75
WHERE display_label ILIKE '%Maxwell Fransa%';

UPDATE link_evidence_timeline SET evidence_type = 'news_major', verification_status = 'verified', confidence = 0.95
WHERE display_label ILIKE '%Miami Herald%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.99,
  source_name = 'SDNY Federal Court', source_url = 'https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-sex-trafficking'
WHERE display_label ILIKE '%Federal İddianame%SDNY%';

UPDATE link_evidence_timeline SET evidence_type = 'official_document', verification_status = 'verified', confidence = 0.95,
  source_name = 'NYC Chief Medical Examiner'
WHERE display_label ILIKE '%Epstein%Ölümü%MCC%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.98,
  source_name = 'FBI / DOJ'
WHERE display_label ILIKE '%Maxwell Tutuklandı%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.99,
  source_name = 'SDNY Federal Court'
WHERE display_label ILIKE '%Maxwell Mahkum%20 Yıl%';

-- EPSTEIN ↔ PRINCE ANDREW
UPDATE link_evidence_timeline SET evidence_type = 'social_media', verification_status = 'credible', confidence = 0.70
WHERE display_label ILIKE '%Sosyal Çevre Tanışması%';

UPDATE link_evidence_timeline SET evidence_type = 'photograph', verification_status = 'verified', confidence = 0.95,
  source_name = 'Virginia Giuffre / FBI Evidence'
WHERE display_label ILIKE '%Tartışmalı Fotoğraf%Londra%';

UPDATE link_evidence_timeline SET evidence_type = 'photograph', verification_status = 'verified', confidence = 0.90,
  source_name = 'Daily Mail / Paparazzi'
WHERE display_label ILIKE '%Central Park Buluşması%';

UPDATE link_evidence_timeline SET evidence_type = 'news_major', verification_status = 'verified', confidence = 0.98,
  source_name = 'BBC Newsnight', source_url = 'https://www.bbc.co.uk/programmes/m000bkz3'
WHERE display_label ILIKE '%BBC Newsnight%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.95
WHERE display_label ILIKE '%Giuffre Davası Uzlaşması%';

-- EPSTEIN ↔ VIRGINIA GIUFFRE
UPDATE link_evidence_timeline SET evidence_type = 'witness_testimony', verification_status = 'verified', confidence = 0.90
WHERE display_label ILIKE '%İlk Temas%Mar-a-Lago%';

UPDATE link_evidence_timeline SET evidence_type = 'witness_testimony', verification_status = 'verified', confidence = 0.88,
  source_name = 'Virginia Giuffre Deposition'
WHERE display_label ILIKE '%Uluslararası Seyahatler%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.95,
  source_name = 'SDNY Federal Court'
WHERE display_label ILIKE '%Federal Dava Açıldı%';

-- EPSTEIN ↔ DERSHOWITZ
UPDATE link_evidence_timeline SET evidence_type = 'news_major', verification_status = 'credible', confidence = 0.75
WHERE display_label ILIKE '%Hukuki Danışmanlık Başlangıcı%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.97,
  source_name = 'Southern District of Florida'
WHERE display_label ILIKE '%NPA Anlaşması Savunması%';

-- EPSTEIN ↔ WEXNER
UPDATE link_evidence_timeline SET evidence_type = 'official_document', verification_status = 'verified', confidence = 0.92,
  source_name = 'Ohio Attorney General Report'
WHERE display_label ILIKE '%Vekalet Yetkisi%';

UPDATE link_evidence_timeline SET evidence_type = 'financial_record', verification_status = 'verified', confidence = 0.94,
  source_name = 'NYC Property Records'
WHERE display_label ILIKE '%Manhattan Malikanesi%';

UPDATE link_evidence_timeline SET evidence_type = 'news_major', verification_status = 'verified', confidence = 0.90,
  source_name = 'New York Times'
WHERE display_label ILIKE '%New York Times Araştırması%';

-- EPSTEIN ↔ BRUNEL
UPDATE link_evidence_timeline SET evidence_type = 'witness_testimony', verification_status = 'credible', confidence = 0.78
WHERE display_label ILIKE '%Mankenlik Ajansı%';

UPDATE link_evidence_timeline SET evidence_type = 'court_record', verification_status = 'verified', confidence = 0.96,
  source_name = 'French Judiciary / AFP'
WHERE display_label ILIKE '%Paris%Tutuklanma%';

UPDATE link_evidence_timeline SET evidence_type = 'official_document', verification_status = 'verified', confidence = 0.93,
  source_name = 'French Ministry of Justice'
WHERE display_label ILIKE '%Cezaevinde Ölüm%';

-- EPSTEIN ↔ DEUTSCHE BANK
UPDATE link_evidence_timeline SET evidence_type = 'financial_record', verification_status = 'credible', confidence = 0.80
WHERE display_label ILIKE '%Hesap Açılışı%';

UPDATE link_evidence_timeline SET evidence_type = 'financial_record', verification_status = 'verified', confidence = 0.93,
  source_name = 'Deutsche Bank Internal Audit'
WHERE display_label ILIKE '%Şüpheli Transferler%';

UPDATE link_evidence_timeline SET evidence_type = 'official_document', verification_status = 'verified', confidence = 0.99,
  source_name = 'NY DFS', source_url = 'https://www.dfs.ny.gov/reports_and_publications/press_releases/pr202007071'
WHERE display_label ILIKE '%Deutsche Bank%150M%';

-- ============================================================================
-- DOĞRULAMA
-- ============================================================================
SELECT display_label, evidence_type, verification_status, confidence, source_name
FROM link_evidence_timeline
ORDER BY event_date ASC
LIMIT 30;
