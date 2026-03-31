-- ============================================
-- Migration 003: Node Metadata (Verification + Country Tags)
-- ============================================

-- Jeffrey Epstein
UPDATE nodes SET
    verification_level = 'official',
    country_tags = ARRAY['USA', 'VIR', 'FRA'],
    nationality = 'USA',
    occupation = 'Financier',
    birth_date = '1953-01-20',
    death_date = '2019-08-10'
WHERE name = 'Jeffrey Epstein';

-- Ghislaine Maxwell
UPDATE nodes SET
    verification_level = 'official',
    country_tags = ARRAY['USA', 'GBR', 'FRA'],
    nationality = 'GBR',
    occupation = 'Socialite'
WHERE name = 'Ghislaine Maxwell';

-- Prince Andrew
UPDATE nodes SET
    verification_level = 'journalist',
    country_tags = ARRAY['GBR', 'USA'],
    nationality = 'GBR',
    occupation = 'Royal Family Member'
WHERE name = 'Prince Andrew';

-- Bill Clinton
UPDATE nodes SET
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Former US President'
WHERE name = 'Bill Clinton';

-- Donald Trump
UPDATE nodes SET
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Former US President'
WHERE name = 'Donald Trump';

-- Alan Dershowitz
UPDATE nodes SET
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Attorney / Professor'
WHERE name = 'Alan Dershowitz';

-- Jean-Luc Brunel
UPDATE nodes SET
    verification_level = 'official',
    country_tags = ARRAY['FRA', 'USA'],
    nationality = 'FRA',
    occupation = 'Model Agent',
    death_date = '2022-02-19'
WHERE name = 'Jean-Luc Brunel';

-- Les Wexner
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Businessman'
WHERE name = 'Les Wexner';

-- Bill Gates
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Tech Entrepreneur'
WHERE name = 'Bill Gates';

-- Kevin Spacey
UPDATE nodes SET
    verification_level = 'journalist',
    country_tags = ARRAY['USA', 'GBR'],
    nationality = 'USA',
    occupation = 'Actor'
WHERE name = 'Kevin Spacey';

-- Naomi Campbell
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['GBR', 'USA'],
    nationality = 'GBR',
    occupation = 'Model'
WHERE name = 'Naomi Campbell';

-- Leonardo DiCaprio
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Actor'
WHERE name = 'Leonardo DiCaprio';

-- Elon Musk
UPDATE nodes SET
    verification_level = 'unverified',
    country_tags = ARRAY['USA', 'ZAF'],
    nationality = 'USA',
    occupation = 'Tech Entrepreneur'
WHERE name = 'Elon Musk';

-- Michael Jackson
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'USA',
    occupation = 'Musician',
    death_date = '2009-06-25'
WHERE name = 'Michael Jackson';

-- Stephen Hawking
UPDATE nodes SET
    verification_level = 'community',
    country_tags = ARRAY['GBR'],
    nationality = 'GBR',
    occupation = 'Physicist',
    death_date = '2018-03-14'
WHERE name = 'Stephen Hawking';

-- Diğer karakterler için default
UPDATE nodes SET
    verification_level = 'unverified',
    country_tags = ARRAY['USA']
WHERE verification_level IS NULL;

-- Kontrol
SELECT name, verification_level, country_tags, nationality, occupation
FROM nodes
ORDER BY tier, risk DESC;
