-- ============================================================================
-- EVIDENCE ARCHIVE SEED — Epstein Network
-- ============================================================================
-- Gerçek kanıtlar: Mahkeme kararları, FBI belgeleri, ifadeler, haberler
-- evidence_archive tablosuna INSERT
-- ============================================================================

-- ═══ JEFFREY EPSTEIN ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'United States v. Jeffrey Epstein - Federal Indictment (SDNY)', 'court_record',
  'Southern District of New York federal iddianame. Seks ticareti ve komplo suçlamalarını içerir.',
  'U.S. Department of Justice', 'https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-sex-trafficking-conspiracy',
  '2019-07-08', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Non-Prosecution Agreement (NPA) - 2008 Florida', 'court_record',
  'ABD Savcısı Alexander Acosta ile yapılan tartışmalı gizli anlaşma. Epstein''e federal suçlamalardan muafiyet sağladı.',
  'Miami Herald', 'https://www.miamiherald.com/news/local/article220097825.html',
  '2008-06-30', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Epstein''in Ölümü - NYC Medical Examiner Raporu', 'official_document',
  'Metropolitan Correctional Center''da ölüm. Resmi neden: intihar ile asılma. Tartışmalı koşullar.',
  'NYC Office of Chief Medical Examiner', NULL,
  '2019-08-10', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'FAA Uçuş Kayıtları - "Lolita Express"', 'official_document',
  'Federal Havacılık İdaresi kayıtları. Epstein''in özel uçağının (N908JE) yolcu listeleri ve uçuş rotaları.',
  'Federal Aviation Administration', NULL,
  '2015-01-05', 'verified', true, ARRAY['USA', 'USVI'], 'en'
FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Miami Herald - Perversion of Justice Araştırması', 'news_major',
  'Julie K. Brown''un ödüllü soruşturma haberi. NPA anlaşmasını ve kurban ifadelerini ortaya çıkardı.',
  'Miami Herald', 'https://www.miamiherald.com/topics/jeffrey-epstein',
  '2018-11-28', 'verified', false, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;

-- ═══ GHISLAINE MAXWELL ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'United States v. Ghislaine Maxwell - Mahkumiyet', 'court_record',
  'Seks ticareti, komplo ve yalan yere yemin etme suçlarından mahkum edildi. 20 yıl hapis cezası.',
  'U.S. District Court SDNY', 'https://www.justice.gov/usao-sdny/pr/ghislaine-maxwell-sentenced-20-years-prison',
  '2021-12-29', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Ghislaine Maxwell Deposition (2016)', 'court_record',
  'Virginia Giuffre davasındaki ifade. Birçok bölümü sansürlü yayınlandı.',
  'U.S. District Court SDNY', NULL,
  '2016-04-22', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1;

-- ═══ VIRGINIA GIUFFRE ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Virginia Giuffre v. Ghislaine Maxwell - Federal Dava', 'court_record',
  'Giuffre''nin Maxwell''e karşı açtığı sivil dava. Binlerce sayfa belge kamuoyuyla paylaşıldı.',
  'U.S. District Court SDNY', NULL,
  '2015-01-01', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name ILIKE '%Virginia%Giuffre%' OR name ILIKE '%Virginia%Roberts%' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Giuffre İfadesi - Prince Andrew İddiaları', 'witness_testimony',
  'Prince Andrew''un cinsel istismarda bulunduğuna dair ifade. Londra, New York ve Little St. James.',
  'Sworn Testimony', NULL,
  '2015-04-07', 'verified', true, ARRAY['USA', 'GBR', 'USVI'], 'en'
FROM nodes WHERE name ILIKE '%Virginia%Giuffre%' OR name ILIKE '%Virginia%Roberts%' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Fotoğraf: Prince Andrew ile Virginia Giuffre', 'photograph',
  'Ghislaine Maxwell''in Londra evinde çekilen tartışmalı fotoğraf. Andrew''un Giuffre''nin belinden tuttuğu görülüyor.',
  'Court Evidence', NULL,
  '2001-03-01', 'verified', true, ARRAY['GBR'], 'en'
FROM nodes WHERE name ILIKE '%Virginia%Giuffre%' OR name ILIKE '%Virginia%Roberts%' LIMIT 1;

-- ═══ PRINCE ANDREW ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'BBC Newsnight Röportajı', 'news_major',
  'Prince Andrew''un BBC ile yaptığı röportaj. "Pizza Express" ve "terleme bozukluğu" savunmaları.',
  'BBC Newsnight', 'https://www.bbc.co.uk/programmes/m000bm1c',
  '2019-11-16', 'verified', false, ARRAY['GBR'], 'en'
FROM nodes WHERE name ILIKE '%Prince Andrew%' OR name ILIKE '%Andrew%Duke%' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Giuffre v. Prince Andrew - Uzlaşma', 'court_record',
  'Virginia Giuffre''nin Prince Andrew''a karşı açtığı sivil dava. Şartları açıklanmayan uzlaşma ile kapandı.',
  'U.S. District Court SDNY', NULL,
  '2022-02-15', 'verified', true, ARRAY['USA', 'GBR'], 'en'
FROM nodes WHERE name ILIKE '%Prince Andrew%' OR name ILIKE '%Andrew%Duke%' LIMIT 1;

-- ═══ JEAN-LUC BRUNEL ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Jean-Luc Brunel Gözaltı ve Ölüm', 'court_record',
  'Fransa''da minör tecavüzü ve seks ticareti suçlamalarıyla tutuklandı. Cezaevinde ölü bulundu.',
  'Parquet de Paris', NULL,
  '2022-02-19', 'verified', true, ARRAY['FRA'], 'fr'
FROM nodes WHERE name ILIKE '%Brunel%' LIMIT 1;

-- ═══ ALAN DERSHOWITZ ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Dershowitz - Epstein Hukuki Savunması', 'court_record',
  'Epstein''in 2008 NPA anlaşmasında hukuki danışmanlığı. Aynı zamanda Giuffre tarafından istismarla suçlandı.',
  'Court Records', NULL,
  '2008-06-30', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name ILIKE '%Dershowitz%' LIMIT 1;

-- ═══ LES WEXNER ═══

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Wexner - Epstein Mali İlişki Araştırması', 'financial_record',
  'L Brands CEO''su Wexner, Epstein''e vekalet yetkisi ve Manhattan malikanesini devretti. New York Times araştırması.',
  'New York Times', 'https://www.nytimes.com/2019/07/25/business/jeffrey-epstein-wexner-victorias-secret.html',
  '2019-07-25', 'verified', false, ARRAY['USA'], 'en'
FROM nodes WHERE name ILIKE '%Wexner%' LIMIT 1;

INSERT INTO evidence_archive (node_id, title, evidence_type, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT id, 'Power of Attorney - Wexner to Epstein', 'financial_record',
  'Wexner''in Epstein''e mali konularda tam vekalet yetkisi verdiğini gösteren hukuki belge.',
  'Ohio Attorney General Investigation', NULL,
  '1991-01-01', 'verified', true, ARRAY['USA'], 'en'
FROM nodes WHERE name ILIKE '%Wexner%' LIMIT 1;

-- ============================================================================
-- VERIFICATION: Check evidence counts per node
-- ============================================================================
-- SELECT n.name, COUNT(e.id) as evidence_count
-- FROM nodes n
-- LEFT JOIN evidence_archive e ON e.node_id = n.id
-- GROUP BY n.name
-- ORDER BY evidence_count DESC;
-- ============================================================================
