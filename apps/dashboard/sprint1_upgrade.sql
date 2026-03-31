-- ============================================================================
-- AI-OS PROJECT TRUTH: SPRINT 1 DATABASE UPGRADE
-- ============================================================================
-- This SQL migration is idempotent and safe to run multiple times.
-- It enhances the Epstein network with rich metadata, evidence, and timeline data.
-- ============================================================================

-- PART 0: FIX COLUMN TYPES (old migrations had VARCHAR(3) for nationality)
-- ============================================================================
ALTER TABLE nodes ALTER COLUMN nationality TYPE TEXT;

-- PART 1: UPDATE NODE METADATA
-- ============================================================================
-- Add comprehensive metadata to existing nodes with factual, public information

UPDATE nodes SET
    summary = 'American financier and convicted sex offender who operated a decades-long scheme to sexually abuse minors. Died in federal custody in 2019 while awaiting trial.',
    verification_level = 'official',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Financier',
    birth_date = '1953-01-20',
    death_date = '2019-08-10'
WHERE name = 'Jeffrey Epstein' AND summary IS NULL;

UPDATE nodes SET
    summary = 'British-French socialite and accomplice to Jeffrey Epstein. Convicted in 2021 of sex trafficking of minors across multiple countries. Sentenced to 20 years in federal prison.',
    verification_level = 'official',
    country_tags = ARRAY['GBR', 'FRA', 'USA'],
    nationality = 'British-French',
    occupation = 'Socialite',
    birth_date = '1961-12-25'
WHERE name = 'Ghislaine Maxwell' AND summary IS NULL;

UPDATE nodes SET
    summary = 'French modeling scout and accused procurer for Epstein''s trafficking network. Founded MC2 Model Agency with Epstein funding. Arrested in Paris and died in prison in 2022.',
    verification_level = 'official',
    country_tags = ARRAY['FRA', 'USA'],
    nationality = 'French',
    occupation = 'Modeling Scout',
    birth_date = '1946-01-01',
    death_date = '2022-02-19'
WHERE name = 'Jean-Luc Brunel' AND summary IS NULL;

UPDATE nodes SET
    summary = 'British royal accused of sexual abuse by Virginia Giuffre in civil litigation. Settled lawsuit for £12 million in 2022. Associated with Ghislaine Maxwell and documented presence at Epstein residences.',
    verification_level = 'journalist',
    country_tags = ARRAY['GBR', 'USA'],
    nationality = 'British',
    occupation = 'Royal',
    birth_date = '1960-02-19'
WHERE name = 'Prince Andrew' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American billionaire retail executive and founder of The Limited. Became Epstein''s primary financial patron and granted him power of attorney in 1991. Later claimed Epstein deceived him.',
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Billionaire Retailer',
    birth_date = '1937-09-08'
WHERE name = 'Les Wexner' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American lawyer and Harvard Law professor. Part of Epstein''s legal defense team during 2008 Florida plea deal negotiations. Represents high-profile clients and maintains controversial public profile.',
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Lawyer',
    birth_date = '1938-09-01'
WHERE name = 'Alan Dershowitz' AND summary IS NULL;

UPDATE nodes SET
    summary = 'Former U.S. President. Flight logs show multiple trips on Epstein''s private aircraft (the "Lolita Express") to various destinations. Publicly acknowledged knowing Epstein but denied involvement in improper activities.',
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Politician',
    birth_date = '1946-08-19'
WHERE name = 'Bill Clinton' AND summary IS NULL;

UPDATE nodes SET
    summary = 'Former U.S. President and real estate magnate. Publicly associated with Epstein in the 1990s and early 2000s. Appeared at Mar-a-Lago event with Epstein documented in archived video footage.',
    verification_level = 'journalist',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Politician',
    birth_date = '1946-06-14'
WHERE name = 'Donald Trump' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American billionaire and Microsoft founder. Met with Epstein multiple times after Epstein''s 2008 conviction. Claimed meetings were for philanthropic purposes.',
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Billionaire Technologist',
    birth_date = '1955-10-28'
WHERE name = 'Bill Gates' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American actor and two-time Academy Award winner. Documented connection to Epstein''s social circles in the 1990s and 2000s. Has not been accused of wrongdoing.',
    verification_level = 'community',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Celebrity Actor',
    birth_date = '1959-07-26'
WHERE name = 'Kevin Spacey' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American actor and environmental activist. Appeared at Epstein-connected celebrity events. No allegations of improper conduct involving minors.',
    verification_level = 'unverified',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Celebrity Actor',
    birth_date = '1974-11-11'
WHERE name = 'Leonardo DiCaprio' AND summary IS NULL;

UPDATE nodes SET
    summary = 'British theoretical physicist and cosmologist. Passed away in 2018, before major revelations. Documented attendance at some high-profile social events.',
    verification_level = 'unverified',
    country_tags = ARRAY['GBR'],
    nationality = 'British',
    occupation = 'Scientist',
    birth_date = '1942-01-08',
    death_date = '2018-03-14'
WHERE name = 'Stephen Hawking' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American pop music icon. Died in 2009, before Epstein''s 2019 arrest. Documented presence at celebrity gatherings attended by Epstein associates.',
    verification_level = 'unverified',
    country_tags = ARRAY['USA'],
    nationality = 'American',
    occupation = 'Celebrity Musician',
    birth_date = '1958-08-29',
    death_date = '2009-06-25'
WHERE name = 'Michael Jackson' AND summary IS NULL;

UPDATE nodes SET
    summary = 'British supermodel. Known to frequent elite social circles. Interviewed in connection with Epstein investigation but not accused of wrongdoing.',
    verification_level = 'unverified',
    country_tags = ARRAY['GBR'],
    nationality = 'British',
    occupation = 'Celebrity Model',
    birth_date = '1970-05-22'
WHERE name = 'Naomi Campbell' AND summary IS NULL;

UPDATE nodes SET
    summary = 'American billionaire entrepreneur. Known to move in elite social circles. No allegations of improper conduct with minors.',
    verification_level = 'unverified',
    country_tags = ARRAY['USA'],
    nationality = 'South African-American',
    occupation = 'Billionaire Entrepreneur',
    birth_date = '1971-06-28'
WHERE name = 'Elon Musk' AND summary IS NULL;


-- PART 2: ENSURE EVIDENCE_ARCHIVE HAS CORRECT COLUMNS
-- ============================================================================

-- Fix existing country_tags column if it was VARCHAR(3)[] from old migration
DO $$
BEGIN
    ALTER TABLE evidence_archive ALTER COLUMN country_tags TYPE TEXT[] USING country_tags::TEXT[];
EXCEPTION WHEN OTHERS THEN
    -- Column doesn't exist yet or is already TEXT[] - ignore
    RAISE NOTICE 'country_tags type change skipped: %', SQLERRM;
END $$;

ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS source_date DATE;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS is_primary_source BOOLEAN DEFAULT false;
-- country_tags: use TEXT[] to avoid VARCHAR(3) length issues
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS country_tags TEXT[] DEFAULT '{}';
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';


-- PART 3: CREATE TIMELINE_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'event',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    source_url TEXT,
    is_verified BOOLEAN DEFAULT true,
    importance VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_node ON timeline_events(node_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timeline_read" ON timeline_events;
CREATE POLICY "timeline_read" ON timeline_events FOR SELECT USING (true);


-- PART 4: CREATE COMMUNITY_VOTES AND COMMUNITY_EVIDENCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) DEFAULT 'document',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_name VARCHAR(255),
    source_url TEXT,
    submitted_by TEXT NOT NULL DEFAULT 'anonymous',
    status VARCHAR(20) DEFAULT 'pending',
    vote_count INTEGER DEFAULT 0,
    vote_weight NUMERIC(5,2) DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_evidence_read" ON community_evidence;
CREATE POLICY "community_evidence_read" ON community_evidence FOR SELECT USING (true);
DROP POLICY IF EXISTS "community_evidence_insert" ON community_evidence;
CREATE POLICY "community_evidence_insert" ON community_evidence FOR INSERT WITH CHECK (true);


CREATE TABLE IF NOT EXISTS community_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_evidence_id UUID REFERENCES community_evidence(id) ON DELETE CASCADE,
    voter_id TEXT NOT NULL,
    vote_type VARCHAR(20) NOT NULL DEFAULT 'helpful',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_evidence_id, voter_id)
);

ALTER TABLE community_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_all" ON community_votes;
CREATE POLICY "votes_all" ON community_votes FOR ALL USING (true) WITH CHECK (true);


-- PART 5: SEED EVIDENCE DATA
-- ============================================================================

DO $$
DECLARE
    v_epstein_id UUID;
    v_maxwell_id UUID;
    v_brunel_id UUID;
    v_andrew_id UUID;
    v_wexner_id UUID;
    v_dershowitz_id UUID;
    v_clinton_id UUID;
    v_trump_id UUID;
    v_gates_id UUID;
BEGIN

    -- Get node IDs
    SELECT id INTO v_epstein_id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;
    SELECT id INTO v_maxwell_id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1;
    SELECT id INTO v_brunel_id FROM nodes WHERE name = 'Jean-Luc Brunel' LIMIT 1;
    SELECT id INTO v_andrew_id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1;
    SELECT id INTO v_wexner_id FROM nodes WHERE name = 'Les Wexner' LIMIT 1;
    SELECT id INTO v_dershowitz_id FROM nodes WHERE name = 'Alan Dershowitz' LIMIT 1;
    SELECT id INTO v_clinton_id FROM nodes WHERE name = 'Bill Clinton' LIMIT 1;
    SELECT id INTO v_trump_id FROM nodes WHERE name = 'Donald Trump' LIMIT 1;
    SELECT id INTO v_gates_id FROM nodes WHERE name = 'Bill Gates' LIMIT 1;

    -- JEFFREY EPSTEIN EVIDENCE (5 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_epstein_id, 'document', 'Lolita Express Flight Logs', 'FAA records documenting flight manifests for Epstein''s Gulfstream aircraft. Includes passenger names, flight dates, and destinations across multiple countries.', 'FAA Records', '2015-01-05', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Lolita Express Flight Logs' AND node_id = v_epstein_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_epstein_id, 'document', 'Palm Beach Police Investigation Report', 'Official police investigation report documenting initial allegations and evidence gathering. Formed basis for state-level charges in Florida.', 'Palm Beach Police Department', '2006-05-01', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Palm Beach Police Investigation Report' AND node_id = v_epstein_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_epstein_id, 'legal', 'SDNY Federal Indictment (2019)', 'Federal indictment charging Epstein with sex trafficking of minors. Detailed conspiracy allegations spanning decades. Filed by U.S. Attorney''s Office Southern District of New York.', 'U.S. DOJ SDNY', '2019-07-08', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'SDNY Federal Indictment (2019)' AND node_id = v_epstein_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_epstein_id, 'legal', 'Non-Prosecution Agreement (2008)', 'Controversial plea deal negotiated with federal prosecutors. Epstein pleaded guilty to state charges with limited federal exposure. Signed by prosecutors including Alexander Acosta.', 'U.S. District Court Florida', '2008-09-24', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Non-Prosecution Agreement (2008)' AND node_id = v_epstein_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_epstein_id, 'document', 'MCC New York Autopsy Report', 'Medical examiner''s autopsy findings following Epstein''s death in federal custody. Cause of death determined to be suicide by hanging.', 'NYC Medical Examiner', '2019-08-16', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'MCC New York Autopsy Report' AND node_id = v_epstein_id);

    -- GHISLAINE MAXWELL EVIDENCE (3 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_maxwell_id, 'legal', 'SDNY Federal Indictment - Maxwell', 'Federal indictment charging Maxwell with sex trafficking and conspiracy. Alleges her role in recruiting and grooming minor victims for Epstein''s abuse.', 'U.S. DOJ SDNY', '2020-07-02', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'SDNY Federal Indictment - Maxwell' AND node_id = v_maxwell_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_maxwell_id, 'legal', 'Trial Verdict - 5 Counts Guilty', 'Jury verdict in Maxwell''s criminal trial. Found guilty on five counts including sex trafficking of minors. Basis for 20-year federal prison sentence.', 'U.S. District Court SDNY', '2021-12-29', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Trial Verdict - 5 Counts Guilty' AND node_id = v_maxwell_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_maxwell_id, 'legal', 'Unsealed Deposition (2016)', 'Deposition testimony given under oath in civil litigation. Contains detailed testimony about Maxwell''s activities and relationship with Epstein.', 'U.S. District Court', '2016-04-22', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Unsealed Deposition (2016)' AND node_id = v_maxwell_id);

    -- PRINCE ANDREW EVIDENCE (3 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_andrew_id, 'media', 'BBC Newsnight Interview', 'High-profile television interview in which Prince Andrew denied allegations by Virginia Giuffre. Interview was widely criticized for its defense strategy and handling of evidence.', 'BBC News', '2019-11-16', 'official', true, ARRAY['GBR', 'USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'BBC Newsnight Interview' AND node_id = v_andrew_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_andrew_id, 'legal', 'Virginia Giuffre Civil Lawsuit Settlement', 'Settlement agreement ending civil litigation brought by Virginia Giuffre against Prince Andrew. No admission of liability. Settlement amount: approximately £12 million.', 'U.S. District Court SDNY', '2022-02-15', 'journalist', false, ARRAY['GBR', 'USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Virginia Giuffre Civil Lawsuit Settlement' AND node_id = v_andrew_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_andrew_id, 'photo', 'Prince Andrew - Virginia Giuffre Photograph', 'Photograph showing Prince Andrew with Virginia Giuffre at Ghislaine Maxwell''s residence. Photo became central evidence in civil litigation. Depicts arm around teenager''s waist.', 'Court Evidence', '2001-03-10', 'official', true, ARRAY['GBR', 'USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Prince Andrew - Virginia Giuffre Photograph' AND node_id = v_andrew_id);

    -- BILL CLINTON EVIDENCE (2 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_clinton_id, 'document', 'Flight Log Records Showing Clinton', 'FAA flight manifests documenting President Clinton''s flights aboard Epstein''s Gulfstream aircraft. Records show multiple trips between 2002-2003 to various destinations.', 'FAA Flight Logs', '2015-01-05', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Flight Log Records Showing Clinton' AND node_id = v_clinton_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_clinton_id, 'financial', 'Clinton Foundation Donation Records', 'Public records showing charitable contributions from Epstein to Clinton Foundation. Donations documented before and after Epstein''s 2008 conviction.', 'Public Records', '2006-01-01', 'journalist', false, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Clinton Foundation Donation Records' AND node_id = v_clinton_id);

    -- LES WEXNER EVIDENCE (2 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_wexner_id, 'document', 'Wexner-Epstein Power of Attorney Document', 'Legal document granting Jeffrey Epstein power of attorney over Les Wexner''s financial affairs. Gave Epstein broad authority over Limited Brands executive''s wealth and business decisions.', 'Public Records', '1991-07-01', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Wexner-Epstein Power of Attorney Document' AND node_id = v_wexner_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_wexner_id, 'news', 'NY Times Investigation: Wexner-Epstein Financial Ties', 'Investigative journalism documenting financial relationship between Wexner and Epstein. Details how Epstein accumulated wealth and influence through Wexner patronage.', 'New York Times', '2019-07-25', 'journalist', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'NY Times Investigation: Wexner-Epstein Financial Ties' AND node_id = v_wexner_id);

    -- JEAN-LUC BRUNEL EVIDENCE (2 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_brunel_id, 'news', 'Brunel Arrest at Charles de Gaulle Airport', 'News reports documenting Brunel''s arrest upon arrival at Paris airport. Arrested on sex trafficking charges related to his role as modeling scout for Epstein.', 'AFP/Le Monde', '2020-12-16', 'official', true, ARRAY['FRA', 'USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Brunel Arrest at Charles de Gaulle Airport' AND node_id = v_brunel_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_brunel_id, 'financial', 'MC2 Model Agency Financial Records', 'French investigation documents detailing MC2 Model Agency funding and operations. Agency served as recruitment mechanism for young female models directed to Epstein.', 'French Investigation', '2020-01-01', 'journalist', true, ARRAY['FRA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'MC2 Model Agency Financial Records' AND node_id = v_brunel_id);

    -- ALAN DERSHOWITZ EVIDENCE (2 pieces)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_dershowitz_id, 'legal', 'Non-Prosecution Agreement Legal Team Records', 'Documents showing Dershowitz''s role in negotiating 2008 plea deal. Shows legal strategy employed and communications with federal prosecutors.', 'U.S. District Court', '2008-09-24', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Non-Prosecution Agreement Legal Team Records' AND node_id = v_dershowitz_id);

    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_dershowitz_id, 'legal', 'Giuffre Defamation Lawsuit', 'Civil lawsuit filed by Virginia Giuffre against Dershowitz for defamation. Lawsuit arose from Dershowitz''s public denials of allegations made against him by victims.', 'U.S. District Court', '2019-04-16', 'official', false, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Giuffre Defamation Lawsuit' AND node_id = v_dershowitz_id);

    -- BILL GATES EVIDENCE (1 piece)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_gates_id, 'news', 'Meeting Records with Epstein (Post-Conviction)', 'News investigation documenting multiple meetings between Gates and Epstein after Epstein''s 2008 conviction. Gates claimed meetings were for philanthropic purposes.', 'New York Times', '2019-10-12', 'journalist', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Meeting Records with Epstein (Post-Conviction)' AND node_id = v_gates_id);

    -- DONALD TRUMP EVIDENCE (1 piece)
    INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_date, verification_status, is_primary_source, country_tags, language)
    SELECT v_trump_id, 'video', 'Mar-a-Lago Event Video (1992)', 'Archived video footage from 1992 event at Mar-a-Lago in Palm Beach. Shows Trump and Epstein socializing together with other guests. Public record from NBC archives.', 'NBC Archives', '1992-11-01', 'official', true, ARRAY['USA'], 'en'
    WHERE NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Mar-a-Lago Event Video (1992)' AND node_id = v_trump_id);

END $$;


-- PART 6: SEED TIMELINE DATA
-- ============================================================================

DO $$
DECLARE
    v_epstein_id UUID;
    v_maxwell_id UUID;
    v_brunel_id UUID;
    v_andrew_id UUID;
    v_wexner_id UUID;
    v_clinton_id UUID;
    v_trump_id UUID;
    v_gates_id UUID;
BEGIN

    -- Get node IDs
    SELECT id INTO v_epstein_id FROM nodes WHERE name = 'Jeffrey Epstein' LIMIT 1;
    SELECT id INTO v_maxwell_id FROM nodes WHERE name = 'Ghislaine Maxwell' LIMIT 1;
    SELECT id INTO v_brunel_id FROM nodes WHERE name = 'Jean-Luc Brunel' LIMIT 1;
    SELECT id INTO v_andrew_id FROM nodes WHERE name = 'Prince Andrew' LIMIT 1;
    SELECT id INTO v_wexner_id FROM nodes WHERE name = 'Les Wexner' LIMIT 1;
    SELECT id INTO v_clinton_id FROM nodes WHERE name = 'Bill Clinton' LIMIT 1;
    SELECT id INTO v_trump_id FROM nodes WHERE name = 'Donald Trump' LIMIT 1;
    SELECT id INTO v_gates_id FROM nodes WHERE name = 'Bill Gates' LIMIT 1;

    -- JEFFREY EPSTEIN TIMELINE (8 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '1953-01-20'::DATE, 'birth', 'Birth', 'Born in Brooklyn, New York to Pauline and Seymour Epstein.', 'Brooklyn, NY', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '1976-01-01'::DATE, 'other', 'Hired as Teacher', 'Hired as mathematics and physics teacher at The Dalton School in Manhattan. First known connection to elite circles and potential victims.', 'New York, NY', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Hired as Teacher' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '1981-01-01'::DATE, 'other', 'Joined Bear Stearns', 'Joined prestigious investment firm Bear Stearns, eventually becoming limited partner. Moved into wealth management and high-net-worth clientele.', 'New York, NY', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Joined Bear Stearns' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '1988-01-01'::DATE, 'meeting', 'Financial Advisor to Les Wexner', 'Became financial advisor to Les Wexner, Limited Brands CEO. Granted power of attorney, accumulating substantial wealth and properties.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Financial Advisor to Les Wexner' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '2005-03-01'::DATE, 'legal', 'Palm Beach Investigation Begins', 'Palm Beach police begin investigating allegations of sexual abuse. Investigation sparked by parents of alleged victims.', 'Palm Beach, FL', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Palm Beach Investigation Begins' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '2006-05-01'::DATE, 'legal', 'FBI Opens Federal Investigation', 'Federal Bureau of Investigation opens federal investigation into Epstein''s conduct. Multiple jurisdictions coordinate on evidence gathering.', 'New York, NY', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'FBI Opens Federal Investigation' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '2008-06-30'::DATE, 'conviction', 'Guilty Plea - Florida', 'Pleads guilty to state charges in Florida. Agrees to register as sex offender and serve 13 months in county jail. Non-prosecution agreement shields him from federal charges.', 'Palm Beach, FL', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Guilty Plea - Florida' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '2019-07-06'::DATE, 'arrest', 'Federal Arrest at Teterboro Airport', 'Arrested by federal agents at Teterboro Airport in New Jersey. Charged with sex trafficking of minors spanning decades. Held without bail.', 'Teterboro, NJ', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Federal Arrest at Teterboro Airport' AND node_id = v_epstein_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_epstein_id, '2019-08-10'::DATE, 'death', 'Death in Custody', 'Found dead in his cell at Metropolitan Correctional Center in Manhattan. Official cause determined as suicide by hanging. Death investigated amid significant public scrutiny.', 'New York, NY', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Death in Custody' AND node_id = v_epstein_id);

    -- GHISLAINE MAXWELL TIMELINE (6 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '1961-12-25'::DATE, 'birth', 'Birth', 'Born in France to prominent industrialist Robert Maxwell and Élisabeth Meynard.', 'France', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_maxwell_id AND event_date = '1961-12-25'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '1991-11-05'::DATE, 'other', 'Father Robert Maxwell Dies', 'Her father, media mogul Robert Maxwell, dies in mysterious circumstances at sea. Family wealth diminishes significantly.', 'Atlantic Ocean', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Father Robert Maxwell Dies' AND node_id = v_maxwell_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '1992-01-01'::DATE, 'meeting', 'Relationship with Epstein Begins', 'Begins intimate relationship with Jeffrey Epstein. Becomes integral to his operations as socialite, recruiter, and accomplice.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Relationship with Epstein Begins' AND node_id = v_maxwell_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '2020-07-02'::DATE, 'arrest', 'FBI Arrest in New Hampshire', 'Arrested by FBI in New Hampshire after evading authorities for over a year following Epstein''s death. Charged with sex trafficking and conspiracy.', 'New Hampshire', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'FBI Arrest in New Hampshire' AND node_id = v_maxwell_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '2021-12-29'::DATE, 'conviction', 'Found Guilty - 5 Counts', 'Jury finds Ghislaine Maxwell guilty on five counts including sex trafficking of minors. Conviction marks major victory in federal prosecution.', 'New York, NY', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Found Guilty - 5 Counts' AND node_id = v_maxwell_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_maxwell_id, '2022-06-28'::DATE, 'legal', 'Sentenced to 20 Years', 'Sentenced to 20 years in federal prison. Judge notes her crucial role in Epstein''s abuse scheme and lack of remorse.', 'New York, NY', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Sentenced to 20 Years' AND node_id = v_maxwell_id);

    -- PRINCE ANDREW TIMELINE (5 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_andrew_id, '1960-02-19'::DATE, 'birth', 'Birth', 'Born Prince Andrew Albert Christian Edward, second son of Queen Elizabeth II and Prince Philip.', 'London, UK', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_andrew_id AND event_date = '1960-02-19'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_andrew_id, '1999-01-01'::DATE, 'meeting', 'Introduced to Epstein', 'Introduced to Jeffrey Epstein through Ghislaine Maxwell. Begins attending parties and events at Epstein''s residences.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Introduced to Epstein' AND node_id = v_andrew_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_andrew_id, '2001-03-10'::DATE, 'other', 'Photographed with Virginia Giuffre', 'Photographed at Ghislaine Maxwell''s residence with Virginia Giuffre (age 17). Photo becomes central evidence in later civil litigation.', 'London, UK', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Photographed with Virginia Giuffre' AND node_id = v_andrew_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_andrew_id, '2019-11-16'::DATE, 'media', 'BBC Newsnight Interview', 'Gives prime time television interview with BBC Newsnight denying allegations. Interview draws widespread criticism for defensive approach and perceived insensitivity.', 'London, UK', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'BBC Newsnight Interview' AND node_id = v_andrew_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_andrew_id, '2022-02-15'::DATE, 'legal', 'Settlement with Virginia Giuffre', 'Settles civil lawsuit with Virginia Giuffre for approximately £12 million. Settlement includes statement denying wrongdoing.', 'New York, NY', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Settlement with Virginia Giuffre' AND node_id = v_andrew_id);

    -- JEAN-LUC BRUNEL TIMELINE (4 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_brunel_id, '1946-01-01'::DATE, 'birth', 'Birth', 'Born in France. Becomes prominent modeling scout and talent agent with international operations.', 'France', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_brunel_id AND event_date = '1946-01-01'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_brunel_id, '1999-01-01'::DATE, 'other', 'Founded MC2 Model Agency', 'Founds MC2 Model Agency with Epstein funding. Agency serves as front for recruitment of young female models directed to Epstein for abuse.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Founded MC2 Model Agency' AND node_id = v_brunel_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_brunel_id, '2020-12-16'::DATE, 'arrest', 'Arrested at Charles de Gaulle Airport', 'Arrested upon arrival at Paris airport on sex trafficking charges. Extradition proceedings begin for French and international investigations.', 'Paris, France', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Arrested at Charles de Gaulle Airport' AND node_id = v_brunel_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_brunel_id, '2022-02-19'::DATE, 'death', 'Found Dead in Prison Cell', 'Found dead in French prison cell. Death ruled a suicide by hanging, similar to Epstein''s death circumstances.', 'France', 'critical', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Found Dead in Prison Cell' AND node_id = v_brunel_id);

    -- LES WEXNER TIMELINE (4 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_wexner_id, '1937-09-08'::DATE, 'birth', 'Birth', 'Born in Dayton, Ohio. Becomes one of America''s most successful retail entrepreneurs through Limited Brands empire.', 'Dayton, OH', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_wexner_id AND event_date = '1937-09-08'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_wexner_id, '1987-01-01'::DATE, 'meeting', 'Hired Epstein as Financial Advisor', 'Hires Jeffrey Epstein as personal financial advisor. Epstein gains access to Wexner''s wealth, properties, and social circles.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Hired Epstein as Financial Advisor' AND node_id = v_wexner_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_wexner_id, '1991-01-01'::DATE, 'other', 'Granted Power of Attorney to Epstein', 'Grants Epstein broad power of attorney over his financial and business affairs. Gives Epstein extensive control over Wexner wealth.', 'New York, NY', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Granted Power of Attorney to Epstein' AND node_id = v_wexner_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_wexner_id, '2019-08-07'::DATE, 'other', 'Public Statement on Epstein', 'Issues statement claiming Epstein deceived him and misused his properties and funds. Distances himself from Epstein''s criminal conduct.', 'Columbus, OH', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Public Statement on Epstein' AND node_id = v_wexner_id);

    -- BILL CLINTON TIMELINE (3 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_clinton_id, '1946-08-19'::DATE, 'birth', 'Birth', 'Born William Jefferson Clinton in Hope, Arkansas. Becomes 42nd President of the United States.', 'Hope, AR', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_clinton_id AND event_date = '1946-08-19'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_clinton_id, '2002-09-01'::DATE, 'travel', 'Africa Trip on Epstein Plane', 'Takes multi-country humanitarian trip to Africa aboard Epstein''s Gulfstream aircraft. Trip documented in flight manifests.', 'Africa', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Africa Trip on Epstein Plane' AND node_id = v_clinton_id);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_clinton_id, '2003-05-01'::DATE, 'travel', 'Asia Trip on Epstein Plane', 'Takes Asia trip aboard Epstein''s aircraft. Trip includes multiple stops and documented in aviation records.', 'Asia', 'high', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Asia Trip on Epstein Plane' AND node_id = v_clinton_id);

    -- BILL GATES TIMELINE (2 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_gates_id, '1955-10-28'::DATE, 'birth', 'Birth', 'Born William Henry Gates III in Seattle, Washington. Founder of Microsoft and philanthropist.', 'Seattle, WA', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_gates_id AND event_date = '1955-10-28'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_gates_id, '2011-01-01'::DATE, 'meeting', 'Met with Epstein at Manhattan Townhouse', 'Met with Jeffrey Epstein at his Manhattan townhouse. Meeting occurred years after Epstein''s conviction. Gates later stated philanthropic discussions occurred.', 'New York, NY', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Met with Epstein at Manhattan Townhouse' AND node_id = v_gates_id);

    -- DONALD TRUMP TIMELINE (2 events)
    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_trump_id, '1946-06-14'::DATE, 'birth', 'Birth', 'Born Donald John Trump in New York City. Real estate developer and businessman.', 'New York, NY', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Birth' AND node_id = v_trump_id AND event_date = '1946-06-14'::DATE);

    INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
    SELECT v_trump_id, '1992-11-01'::DATE, 'meeting', 'Filmed at Mar-a-Lago Party', 'Captured in video footage at Mar-a-Lago event in Palm Beach socializing with Jeffrey Epstein. Public record from NBC archives.', 'Palm Beach, FL', 'normal', true
    WHERE NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Filmed at Mar-a-Lago Party' AND node_id = v_trump_id);

END $$;


-- PART 7: VERIFICATION QUERY
-- ============================================================================
-- Run this query to verify data integrity and completion

SELECT
    n.name,
    n.verification_level,
    n.nationality,
    n.tier,
    n.risk,
    (SELECT COUNT(*) FROM evidence_archive e WHERE e.node_id = n.id) as evidence_count,
    (SELECT COUNT(*) FROM timeline_events t WHERE t.node_id = n.id) as timeline_count,
    (SELECT COUNT(*) FROM links l WHERE l.source_id = n.id OR l.target_id = n.id) as connection_count
FROM nodes n
WHERE n.is_active = true
ORDER BY n.tier, n.risk DESC;
