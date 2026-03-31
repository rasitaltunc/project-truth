-- ============================================================================
-- LINK METADATA SEED — Sprint 6B Epistemological Layer
-- ============================================================================
-- Updates all Epstein network links with evidence_type, confidence_level,
-- source_hierarchy, and evidence_count metadata.
--
-- Evidence Types: court_record, official_document, leaked_document,
--   financial_record, witness_testimony, news_major, news_minor,
--   academic_paper, social_media, rumor, inference
-- Source Hierarchy: primary, secondary, tertiary
-- Confidence: 0.00-1.00 (higher = more epistemologically certain)
-- Evidence Count: estimated number of supporting pieces of evidence
-- ============================================================================

-- ============================================================================
-- VICTIMS LINKS (~15)
-- ============================================================================

-- Virginia Giuffre → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.95,
  source_hierarchy = 'primary',
  evidence_count = 12
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Virginia Giuffre' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Virginia Giuffre → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.92,
  source_hierarchy = 'primary',
  evidence_count = 8
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Virginia Giuffre' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Virginia Giuffre → Prince Andrew
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.75,
  source_hierarchy = 'secondary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Virginia Giuffre' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1);

-- Virginia Giuffre → Alan Dershowitz
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.80,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Virginia Giuffre' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Alan Dershowitz' LIMIT 1);

-- Sarah Ransome → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 7
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Sarah Ransome' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Sarah Ransome → Little St. James
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.82,
  source_hierarchy = 'primary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Sarah Ransome' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1);

-- Courtney Wild → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.90,
  source_hierarchy = 'primary',
  evidence_count = 8
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Courtney Wild' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Courtney Wild → Palm Beach
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Courtney Wild' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Palm Beach' LIMIT 1);

-- Courtney Wild → Alexander Acosta (CVRA davası — hukuki süreç)
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.75,
  source_hierarchy = 'secondary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Courtney Wild' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Alexander Acosta' LIMIT 1);

-- Annie Farmer → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.93,
  source_hierarchy = 'primary',
  evidence_count = 9
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Annie Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Annie Farmer → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Annie Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Annie Farmer → Zorro Ranch
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Annie Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Zorro Ranch' LIMIT 1);

-- Maria Farmer → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.87,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Maria Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Maria Farmer → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.82,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Maria Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Maria Farmer → Les Wexner
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.65,
  source_hierarchy = 'secondary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Maria Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Les Wexner' LIMIT 1);

-- Maria Farmer → NYC Townhouse
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.78,
  source_hierarchy = 'primary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Maria Farmer' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'NYC Townhouse' LIMIT 1);

-- ============================================================================
-- INSTITUTIONAL LINKS (~10)
-- ============================================================================

-- JP Morgan → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'financial_record',
  confidence_level = 0.98,
  source_hierarchy = 'primary',
  evidence_count = 15
WHERE source_id = (SELECT id FROM nodes WHERE name = 'JP Morgan' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Deutsche Bank → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'financial_record',
  confidence_level = 0.95,
  source_hierarchy = 'primary',
  evidence_count = 12
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Deutsche Bank' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- JP Morgan → Deutsche Bank
UPDATE links SET
  evidence_type = 'inference',
  confidence_level = 0.55,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE source_id = (SELECT id FROM nodes WHERE name = 'JP Morgan' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Deutsche Bank' LIMIT 1);

-- MIT → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'MIT' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- MIT → Joi Ito
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.92,
  source_hierarchy = 'primary',
  evidence_count = 7
WHERE source_id = (SELECT id FROM nodes WHERE name = 'MIT' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Joi Ito' LIMIT 1);

-- L Brands → Les Wexner
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 10
WHERE source_id = (SELECT id FROM nodes WHERE name = 'L Brands' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Les Wexner' LIMIT 1);

-- L Brands → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'financial_record',
  confidence_level = 0.78,
  source_hierarchy = 'secondary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'L Brands' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- MC2 Model → Jean-Luc Brunel
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.96,
  source_hierarchy = 'primary',
  evidence_count = 8
WHERE source_id = (SELECT id FROM nodes WHERE name = 'MC2 Model Management' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jean-Luc Brunel' LIMIT 1);

-- MC2 Model → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.93,
  source_hierarchy = 'primary',
  evidence_count = 9
WHERE source_id = (SELECT id FROM nodes WHERE name = 'MC2 Model Management' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- MC2 Model → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.70,
  source_hierarchy = 'secondary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'MC2 Model Management' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- ============================================================================
-- LOCATION LINKS (~12)
-- ============================================================================

-- Little St. James → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 11
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Little St. James → Prince Andrew
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.80,
  source_hierarchy = 'secondary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1);

-- Little St. James → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.91,
  source_hierarchy = 'primary',
  evidence_count = 7
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Zorro Ranch → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.97,
  source_hierarchy = 'primary',
  evidence_count = 9
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Zorro Ranch' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- NYC Townhouse → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 12
WHERE source_id = (SELECT id FROM nodes WHERE name = 'NYC Townhouse' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- NYC Townhouse → Les Wexner
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'NYC Townhouse' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Les Wexner' LIMIT 1);

-- NYC Townhouse → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'NYC Townhouse' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Paris Property → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.92,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Paris Property' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Paris Property → Jean-Luc Brunel
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.80,
  source_hierarchy = 'secondary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Paris Property' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jean-Luc Brunel' LIMIT 1);

-- Palm Beach → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.98,
  source_hierarchy = 'primary',
  evidence_count = 10
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Palm Beach' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- ============================================================================
-- ENABLER/ASSOCIATE LINKS (~10)
-- ============================================================================

-- Alexander Acosta → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 11
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Alexander Acosta' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Alexander Acosta → Alan Dershowitz
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.70,
  source_hierarchy = 'secondary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Alexander Acosta' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Alan Dershowitz' LIMIT 1);

-- Larry Summers → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.60,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Larry Summers' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Joi Ito → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Joi Ito' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Steve Bannon → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'news_minor',
  confidence_level = 0.50,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Steve Bannon' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Glenn Dubin → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.82,
  source_hierarchy = 'primary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Glenn Dubin' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Glenn Dubin → Eva Dubin
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Glenn Dubin' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Eva Dubin' LIMIT 1);

-- Eva Dubin → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.75,
  source_hierarchy = 'secondary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Eva Dubin' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Adriana Ross → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.80,
  source_hierarchy = 'primary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Adriana Ross' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Adriana Ross → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.72,
  source_hierarchy = 'secondary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Adriana Ross' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- ============================================================================
-- VEHICLES & DOCUMENTS LINKS (~8)
-- ============================================================================

-- Sprint 14C Fix: Uçak bağlantıları flight_record olmalı (flight filtresi için)
-- Lolita Express → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 10
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Lolita Express → Bill Clinton
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 8
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Bill Clinton' LIMIT 1);

-- Lolita Express → Prince Andrew
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.78,
  source_hierarchy = 'primary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1);

-- Lolita Express → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.92,
  source_hierarchy = 'primary',
  evidence_count = 7
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Lolita Express → Little St. James
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.96,
  source_hierarchy = 'primary',
  evidence_count = 9
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Lolita Express (Boeing 727)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Little St. James' LIMIT 1);

-- Gulfstream IV → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'flight_record',
  confidence_level = 0.97,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Gulfstream IV (N120JE)' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Black Book → Jeffrey Epstein
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.99,
  source_hierarchy = 'primary',
  evidence_count = 11
WHERE source_id = (SELECT id FROM nodes WHERE name = 'The Black Book' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1);

-- Black Book → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.85,
  source_hierarchy = 'secondary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'The Black Book' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- ============================================================================
-- CORE RELATIONSHIP LINKS (existing from Sprint 1)
-- ============================================================================

-- Jeffrey Epstein → Ghislaine Maxwell
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.97,
  source_hierarchy = 'primary',
  evidence_count = 18
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1);

-- Jeffrey Epstein → Prince Andrew
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.75,
  source_hierarchy = 'secondary',
  evidence_count = 5
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1);

-- Jeffrey Epstein → Bill Clinton
UPDATE links SET
  evidence_type = 'official_document',
  confidence_level = 0.80,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Bill Clinton' LIMIT 1);

-- Jeffrey Epstein → Donald Trump
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.65,
  source_hierarchy = 'tertiary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Donald Trump' LIMIT 1);

-- Jeffrey Epstein → Bill Gates
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.55,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Bill Gates' LIMIT 1);

-- Jeffrey Epstein → Les Wexner
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.88,
  source_hierarchy = 'primary',
  evidence_count = 7
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Les Wexner' LIMIT 1);

-- Jeffrey Epstein → Alan Dershowitz
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.82,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Alan Dershowitz' LIMIT 1);

-- Jeffrey Epstein → Jean-Luc Brunel
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.85,
  source_hierarchy = 'primary',
  evidence_count = 6
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Jean-Luc Brunel' LIMIT 1);

-- Jeffrey Epstein → Kevin Spacey
UPDATE links SET
  evidence_type = 'social_media',
  confidence_level = 0.50,
  source_hierarchy = 'tertiary',
  evidence_count = 1
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Kevin Spacey' LIMIT 1);

-- Jeffrey Epstein → Ehud Barak
UPDATE links SET
  evidence_type = 'news_major',
  confidence_level = 0.70,
  source_hierarchy = 'tertiary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Ehud Barak' LIMIT 1);

-- Ghislaine Maxwell → Juan Pablo Soto
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.72,
  source_hierarchy = 'secondary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Juan Pablo Soto' LIMIT 1);

-- Ghislaine Maxwell → Sarah Kellen
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.80,
  source_hierarchy = 'primary',
  evidence_count = 4
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Sarah Kellen' LIMIT 1);

-- Ghislaine Maxwell → Nadia Marcinkova
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.78,
  source_hierarchy = 'primary',
  evidence_count = 3
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Nadia Marcinkova' LIMIT 1);

-- Ghislaine Maxwell → Lesley Groff
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.75,
  source_hierarchy = 'primary',
  evidence_count = 2
WHERE source_id = (SELECT id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1)
  AND target_id = (SELECT id FROM nodes WHERE name = 'Lesley Groff' LIMIT 1);

