-- ============================================================================
-- NODE ENRICHMENT SEED — Lens Mode Data Quality
-- ============================================================================
-- Epstein ağındaki node'ların occupation, birth_date, death_date,
-- country_tags, nationality alanlarını gerçek verilerle doldurur.
-- Bu veriler Follow Money, Timeline, Evidence Map lenslerinin çalışması için kritik.
-- ============================================================================

-- ═══ CORE FIGURES ═══

-- Jeffrey Epstein
UPDATE nodes SET
  occupation = 'financier',
  birth_date = '1953-01-20',
  death_date = '2019-08-10',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name = 'Jeffrey Epstein';

-- Ghislaine Maxwell
UPDATE nodes SET
  occupation = 'socialite',
  birth_date = '1961-12-25',
  nationality = 'British',
  country_tags = ARRAY['USA', 'GBR', 'FRA'],
  type = 'person'
WHERE name = 'Ghislaine Maxwell';

-- ═══ ASSOCIATES / KEY PLAYERS ═══

-- Jean-Luc Brunel
UPDATE nodes SET
  occupation = 'model agent',
  birth_date = '1946-11-21',
  death_date = '2022-02-19',
  nationality = 'French',
  country_tags = ARRAY['FRA', 'USA'],
  type = 'person'
WHERE name = 'Jean-Luc Brunel';

-- Les Wexner
UPDATE nodes SET
  occupation = 'businessman',
  birth_date = '1937-09-08',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Wexner%';

-- Prince Andrew
UPDATE nodes SET
  occupation = 'royal',
  birth_date = '1960-02-19',
  nationality = 'British',
  country_tags = ARRAY['GBR', 'USA'],
  type = 'person'
WHERE name ILIKE '%Prince Andrew%' OR name ILIKE '%Andrew%Duke%';

-- Alan Dershowitz
UPDATE nodes SET
  occupation = 'lawyer',
  birth_date = '1938-09-01',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Dershowitz%';

-- Sarah Kellen
UPDATE nodes SET
  occupation = 'assistant',
  birth_date = '1980-01-01',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Kellen%';

-- Nadia Marcinkova
UPDATE nodes SET
  occupation = 'pilot',
  birth_date = '1986-01-01',
  nationality = 'Slovakian-American',
  country_tags = ARRAY['USA', 'SVK'],
  type = 'person'
WHERE name ILIKE '%Marcinkova%';

-- ═══ VICTIMS ═══

-- Virginia Giuffre
UPDATE nodes SET
  occupation = 'victim-advocate',
  birth_date = '1983-08-09',
  nationality = 'American-Australian',
  country_tags = ARRAY['USA', 'AUS', 'GBR'],
  type = 'person'
WHERE name ILIKE '%Virginia%Giuffre%' OR name ILIKE '%Virginia%Roberts%';

-- Courtney Wild
UPDATE nodes SET
  occupation = 'victim-advocate',
  birth_date = '1988-01-01',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Courtney Wild%';

-- Annie Farmer
UPDATE nodes SET
  occupation = 'victim-advocate',
  birth_date = '1979-01-01',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Annie Farmer%';

-- Maria Farmer
UPDATE nodes SET
  occupation = 'artist',
  birth_date = '1970-01-01',
  nationality = 'American',
  country_tags = ARRAY['USA'],
  type = 'person'
WHERE name ILIKE '%Maria Farmer%';

-- ═══ LOCATIONS ═══

UPDATE nodes SET
  type = 'location',
  country_tags = ARRAY['USVI']
WHERE name ILIKE '%Little St. James%' OR name ILIKE '%Epstein Island%';

UPDATE nodes SET
  type = 'location',
  country_tags = ARRAY['USA']
WHERE name ILIKE '%71st Street%' OR name ILIKE '%Manhattan%Mansion%';

UPDATE nodes SET
  type = 'location',
  country_tags = ARRAY['USA']
WHERE name ILIKE '%Palm Beach%' AND type IS DISTINCT FROM 'person';

UPDATE nodes SET
  type = 'location',
  country_tags = ARRAY['FRA']
WHERE name ILIKE '%Paris%Apartment%';

UPDATE nodes SET
  type = 'location',
  country_tags = ARRAY['USA']
WHERE name ILIKE '%Zorro Ranch%' OR name ILIKE '%New Mexico%Ranch%';

-- ═══ ORGANIZATIONS ═══

UPDATE nodes SET
  type = 'organization',
  country_tags = ARRAY['USA']
WHERE name ILIKE '%J. Epstein & Co%' OR name ILIKE '%Financial Trust%';

-- ============================================================================
-- VERIFICATION: Check enrichment results
-- ============================================================================
-- SELECT name, occupation, birth_date, nationality, country_tags, type
-- FROM nodes
-- WHERE occupation IS NOT NULL
-- ORDER BY name;
-- ============================================================================
