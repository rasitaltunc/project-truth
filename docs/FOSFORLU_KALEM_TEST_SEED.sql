-- ════════════════════════════════════════════════════════════════════
-- FOSFORLU KALEM TEST SEED — v4 (tüm kolonlar doğrulandı)
-- 25 Mart 2026
-- ════════════════════════════════════════════════════════════════════

-- 1. Test belgesi (documents tablosu)
INSERT INTO documents (
  id,
  network_id,
  title,
  description,
  document_type,
  source_type,
  external_url,
  file_path,
  file_size,
  file_type,
  language,
  country_tags,
  date_filed,
  scan_status,
  quality_score,
  is_public,
  ocr_extracted_text,
  raw_content,
  metadata,
  date_uploaded
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM networks WHERE slug = 'epstein-network' LIMIT 1),
  'US v. Maxwell — Docket Entry 1090 (Court Filing)',
  'Court filing from the criminal prosecution of Ghislaine Maxwell, SDNY Case No. 20-cr-330',
  'court_record',
  'courtlistener',
  'https://storage.courtlistener.com/recap/gov.uscourts.nysd.447706/gov.uscourts.nysd.447706.1090.0.pdf',
  NULL,
  89238,
  'pdf',
  'en',
  ARRAY['USA'],
  '2021-03-26',
  'completed',
  80,
  true,
  'UNITED STATES DISTRICT COURT SOUTHERN DISTRICT OF NEW YORK. Case No. 20-cr-330 (AJN). UNITED STATES OF AMERICA v. GHISLAINE MAXWELL. This court filing relates to the criminal prosecution of Ghislaine Maxwell for conspiracy to entice minors to travel to engage in illegal sex acts, enticement of a minor to travel to engage in illegal sex acts, conspiracy to transport minors with intent to engage in criminal sexual activity, transportation of a minor with intent to engage in criminal sexual activity, and sex trafficking conspiracy.',
  'UNITED STATES DISTRICT COURT SOUTHERN DISTRICT OF NEW YORK Case No. 20-cr-330 UNITED STATES OF AMERICA v. GHISLAINE MAXWELL',
  jsonb_build_object(
    'court_name', 'US District Court, Southern District of New York',
    'case_number', '20-cr-330',
    'docket_number', '1090',
    'judge', 'Alison J. Nathan',
    'filed_date', '2021-03-26',
    'source_provider', 'CourtListener RECAP'
  ),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  external_url = EXCLUDED.external_url,
  ocr_extracted_text = EXCLUDED.ocr_extracted_text,
  raw_content = EXCLUDED.raw_content,
  metadata = EXCLUDED.metadata;

-- 2. Karantina — entity (Ghislaine Maxwell)
-- Gerçek kolonlar: document_id, network_id, item_type, item_data,
-- confidence, verification_status, source_type, source_provider,
-- source_url, review_count, required_reviews, provenance_chain
INSERT INTO data_quarantine (
  id,
  document_id,
  network_id,
  item_type,
  item_data,
  confidence,
  verification_status,
  source_type,
  source_provider,
  source_url,
  review_count,
  required_reviews,
  provenance_chain,
  created_at
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM networks WHERE slug = 'epstein-network' LIMIT 1),
  'entity',
  jsonb_build_object(
    'name', 'Ghislaine Maxwell',
    'type', 'person',
    'description', 'Defendant in US v. Maxwell, charged with conspiracy and sex trafficking',
    'occupation', 'Socialite',
    'nationality', 'British-American',
    'country_tags', ARRAY['USA', 'GBR']
  ),
  0.95,
  'quarantined',
  'structured_api',
  'courtlistener',
  'https://storage.courtlistener.com/recap/gov.uscourts.nysd.447706/gov.uscourts.nysd.447706.1090.0.pdf',
  0,
  2,
  '[{"action":"extracted","timestamp":"2026-03-25T12:00:00Z","source_type":"structured_api","source_provider":"courtlistener","confidence":0.95}]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Karantina — relationship (Maxwell → Epstein)
INSERT INTO data_quarantine (
  id,
  document_id,
  network_id,
  item_type,
  item_data,
  confidence,
  verification_status,
  source_type,
  source_provider,
  source_url,
  review_count,
  required_reviews,
  provenance_chain,
  created_at
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM networks WHERE slug = 'epstein-network' LIMIT 1),
  'relationship',
  jsonb_build_object(
    'sourceName', 'Ghislaine Maxwell',
    'targetName', 'Jeffrey Epstein',
    'relationshipType', 'Abuse Facilitator',
    'description', 'Ghislaine Maxwell assisted, facilitated, and contributed to Jeffrey Epstein abuse of minor girls, as stated in federal indictment',
    'evidenceType', 'court_record',
    'confidence', 0.95
  ),
  0.95,
  'quarantined',
  'structured_api',
  'courtlistener',
  'https://storage.courtlistener.com/recap/gov.uscourts.nysd.447706/gov.uscourts.nysd.447706.1090.0.pdf',
  0,
  2,
  '[{"action":"extracted","timestamp":"2026-03-25T12:00:00Z","source_type":"structured_api","source_provider":"courtlistener","confidence":0.95}]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Görev kartı — entity verification
INSERT INTO investigation_tasks (
  id,
  network_id,
  task_type,
  difficulty,
  role_affinity,
  source_document_id,
  source_quarantine_id,
  task_data,
  context_data,
  status,
  created_at
) VALUES (
  'd4e5f6a7-b8c9-0123-defa-234567890123',
  (SELECT id FROM networks WHERE slug = 'epstein-network' LIMIT 1),
  'entity_verification',
  2,
  'legal',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  jsonb_build_object(
    'entity_name', 'Ghislaine Maxwell',
    'entity_type', 'person',
    'claim', 'Ghislaine Maxwell is named as defendant in case 20-cr-330',
    'source_excerpt', 'UNITED STATES OF AMERICA v. GHISLAINE MAXWELL',
    'what_to_verify', 'Verify that this person appears in the court document as a named defendant'
  ),
  jsonb_build_object(
    'document_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'source_provider', 'CourtListener',
    'case_number', '20-cr-330',
    'court', 'SDNY'
  ),
  'open',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Görev kartı — relationship verification
INSERT INTO investigation_tasks (
  id,
  network_id,
  task_type,
  difficulty,
  role_affinity,
  source_document_id,
  source_quarantine_id,
  task_data,
  context_data,
  status,
  created_at
) VALUES (
  'e5f6a7b8-c9d0-1234-efab-345678901234',
  (SELECT id FROM networks WHERE slug = 'epstein-network' LIMIT 1),
  'relationship_verification',
  2,
  'legal',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  jsonb_build_object(
    'entity_name', 'Ghislaine Maxwell',
    'entity_type', 'person',
    'claim', 'Maxwell facilitated Epstein abuse network',
    'source_excerpt', 'Ghislaine Maxwell assisted, facilitated, and contributed to Jeffrey Epstein abuse',
    'what_to_verify', 'Verify that the court document describes this relationship between Maxwell and Epstein'
  ),
  jsonb_build_object(
    'document_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'source_provider', 'CourtListener',
    'case_number', '20-cr-330',
    'court', 'SDNY'
  ),
  'open',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- Çalıştır → dev server yeniden başlat → INVESTIGATE butonuna bas
-- ════════════════════════════════════════════════════════════════════
