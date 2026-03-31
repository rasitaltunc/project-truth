-- ═══════════════════════════════════════════════════════════
-- TIMELINE DATES SEED DATA
-- Epstein Network node'larına tarih verileri ekleme
-- Timeline lens modunun çalışması için gerekli
-- ═══════════════════════════════════════════════════════════

-- Jeffrey Epstein
UPDATE nodes SET birth_date = '1953-01-20', death_date = '2019-08-10'
WHERE name = 'Jeffrey Epstein';

-- Ghislaine Maxwell
UPDATE nodes SET birth_date = '1961-12-25'
WHERE name = 'Ghislaine Maxwell';

-- Jean-Luc Brunel
UPDATE nodes SET birth_date = '1946-11-21', death_date = '2022-02-19'
WHERE name = 'Jean-Luc Brunel';

-- Prince Andrew
UPDATE nodes SET birth_date = '1960-02-19'
WHERE name = 'Prince Andrew';

-- Alan Dershowitz
UPDATE nodes SET birth_date = '1938-09-01'
WHERE name = 'Alan Dershowitz';

-- Alexander Acosta
UPDATE nodes SET birth_date = '1969-01-16'
WHERE name = 'Alexander Acosta';

-- Bill Clinton
UPDATE nodes SET birth_date = '1946-08-19'
WHERE name = 'Bill Clinton';

-- Donald Trump
UPDATE nodes SET birth_date = '1946-06-14'
WHERE name = 'Donald Trump';

-- Bill Gates
UPDATE nodes SET birth_date = '1955-10-28'
WHERE name = 'Bill Gates';

-- Les Wexner
UPDATE nodes SET birth_date = '1937-09-08'
WHERE name = 'Les Wexner';

-- Glenn Dubin
UPDATE nodes SET birth_date = '1957-03-23'
WHERE name = 'Glenn Dubin';

-- Eva Dubin
UPDATE nodes SET birth_date = '1966-01-01'
WHERE name = 'Eva Dubin';

-- Steve Bannon
UPDATE nodes SET birth_date = '1953-11-27'
WHERE name = 'Steve Bannon';

-- Virginia Giuffre
UPDATE nodes SET birth_date = '1983-08-09'
WHERE name = 'Virginia Giuffre';

-- Sarah Ransome
UPDATE nodes SET birth_date = '1985-01-01'
WHERE name = 'Sarah Ransome';

-- Annie Farmer
UPDATE nodes SET birth_date = '1980-01-01'
WHERE name = 'Annie Farmer';

-- Courtney Wild
UPDATE nodes SET birth_date = '1986-01-01'
WHERE name = 'Courtney Wild';

-- Larry Summers
UPDATE nodes SET birth_date = '1954-11-30'
WHERE name = 'Larry Summers';

-- Kevin Spacey
UPDATE nodes SET birth_date = '1959-07-26'
WHERE name = 'Kevin Spacey';

-- Joi Ito
UPDATE nodes SET birth_date = '1966-06-19'
WHERE name = 'Joi Ito';

-- Stephen Hawking
UPDATE nodes SET birth_date = '1942-01-08', death_date = '2018-03-14'
WHERE name = 'Stephen Hawking';

-- Elon Musk
UPDATE nodes SET birth_date = '1971-06-28'
WHERE name = 'Elon Musk';

-- Leonardo DiCaprio
UPDATE nodes SET birth_date = '1974-11-11'
WHERE name = 'Leonardo DiCaprio';

-- Maria Farmer
UPDATE nodes SET birth_date = '1970-01-01'
WHERE name = 'Maria Farmer';

-- Lokasyonlar için created_at (ilk belgelenen tarih kullanılır)
-- Little St. James Island (1998 satın alım)
UPDATE nodes SET created_at = '1998-01-01'
WHERE name LIKE '%Little St. James%';

-- Zorro Ranch (~1993)
UPDATE nodes SET created_at = '1993-01-01'
WHERE name LIKE '%Zorro Ranch%';

-- Residence (NYC Townhouse, 1989)
UPDATE nodes SET created_at = '1989-01-01'
WHERE name LIKE '%Residence%' AND name LIKE '%New York%' OR name LIKE '%71st%';

-- JP Morgan Chase (kuruluş 2000)
UPDATE nodes SET created_at = '2000-12-31'
WHERE name LIKE '%JP Morgan%';

-- Deutsche Bank (1870)
UPDATE nodes SET created_at = '1870-01-01'
WHERE name LIKE '%Deutsche Bank%';

-- MC2 Model Management (~2000)
UPDATE nodes SET created_at = '2000-01-01'
WHERE name LIKE '%MC2%';

-- L Brands / Victoria's Secret (1963)
UPDATE nodes SET created_at = '1963-01-01'
WHERE name LIKE '%Brands%' OR name LIKE '%Victoria%';

-- The Black Book (erken 2000'ler)
UPDATE nodes SET created_at = '2004-01-01'
WHERE name LIKE '%Black Book%';

-- Flight Records (1997-2005)
UPDATE nodes SET created_at = '1997-01-01'
WHERE name LIKE '%Flight%' OR name LIKE '%Lolita Express%';

-- Bear Stearns (1923)
UPDATE nodes SET created_at = '1923-01-01'
WHERE name LIKE '%Bear Stearns%';

-- Gulfstream IV (uçak ~1995)
UPDATE nodes SET created_at = '1995-01-01'
WHERE name LIKE '%Gulfstream%';

-- Epstein's Pilot (1991 başlangıç)
UPDATE nodes SET created_at = '1991-01-01'
WHERE name LIKE '%Pilot%' AND type = 'person';
