-- ============================================================================
-- SPRINT 2: NETWORK EXPANSION — "DAHA FAZLA DÜĞÜM"
-- ============================================================================
-- 25 yeni node, ~47 yeni link, evidence & timeline
-- Ağı 15'ten 40 node'a çıkarıyor
-- 5 Kategori: Mağdurlar, Kurumlar, Lokasyonlar, Enablerlar, Lojistik
-- ============================================================================
-- IDEMPOTENT: Güvenle tekrar çalıştırılabilir
-- ============================================================================

DO $$
DECLARE
    v_network_id UUID;
    -- Existing nodes
    v_epstein UUID;
    v_maxwell UUID;
    v_andrew UUID;
    v_clinton UUID;
    v_trump UUID;
    v_gates UUID;
    v_wexner UUID;
    v_dershowitz UUID;
    v_brunel UUID;
    v_spacey UUID;
    v_barak UUID;
    v_kellen UUID;
    v_marcinkova UUID;
    v_groff UUID;
    -- New nodes
    v_giuffre UUID;
    v_ransome UUID;
    v_wild UUID;
    v_a_farmer UUID;
    v_m_farmer UUID;
    v_jpmorgan UUID;
    v_deutsche UUID;
    v_mit UUID;
    v_lbrands UUID;
    v_mc2 UUID;
    v_island UUID;
    v_zorro UUID;
    v_nyc UUID;
    v_paris UUID;
    v_palmbeach UUID;
    v_acosta UUID;
    v_summers UUID;
    v_ito UUID;
    v_bannon UUID;
    v_g_dubin UUID;
    v_e_dubin UUID;
    v_ross UUID;
    v_lolita UUID;
    v_gulfstream UUID;
    v_blackbook UUID;
BEGIN

-- ============================================================================
-- STEP 0: Get network ID and existing node IDs
-- ============================================================================
SELECT id INTO v_network_id FROM networks WHERE name ILIKE '%epstein%' LIMIT 1;
IF v_network_id IS NULL THEN
    SELECT id INTO v_network_id FROM networks LIMIT 1;
END IF;

SELECT id INTO v_epstein FROM nodes WHERE name = 'Jeffrey Epstein';
SELECT id INTO v_maxwell FROM nodes WHERE name = 'Ghislaine Maxwell';
SELECT id INTO v_andrew FROM nodes WHERE name = 'Prince Andrew';
SELECT id INTO v_clinton FROM nodes WHERE name = 'Bill Clinton';
SELECT id INTO v_trump FROM nodes WHERE name = 'Donald Trump';
SELECT id INTO v_gates FROM nodes WHERE name = 'Bill Gates';
SELECT id INTO v_wexner FROM nodes WHERE name = 'Les Wexner';
SELECT id INTO v_dershowitz FROM nodes WHERE name = 'Alan Dershowitz';
SELECT id INTO v_brunel FROM nodes WHERE name = 'Jean-Luc Brunel';
SELECT id INTO v_spacey FROM nodes WHERE name = 'Kevin Spacey';
SELECT id INTO v_barak FROM nodes WHERE name = 'Ehud Barak';
SELECT id INTO v_kellen FROM nodes WHERE name = 'Sarah Kellen';
SELECT id INTO v_marcinkova FROM nodes WHERE name = 'Nadia Marcinkova';
SELECT id INTO v_groff FROM nodes WHERE name = 'Lesley Groff';

-- ============================================================================
-- STEP 1: VICTIMS (5 nodes)
-- ============================================================================

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Virginia Giuffre', 'person', 3, 30, 'victim',
    'Key accuser in the Epstein case. Recruited at age 16 from Mar-a-Lago. Filed civil lawsuits against Epstein, Maxwell, Prince Andrew, and Dershowitz. Her testimony was central to exposing the trafficking network. Settled with Prince Andrew for reported £12 million in 2022.',
    true, true, 'official', ARRAY['USA','AUS'], 'American-Australian', 'Activist / Survivor', '1983-08-09'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Virginia Giuffre');
SELECT id INTO v_giuffre FROM nodes WHERE name = 'Virginia Giuffre';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Sarah Ransome', 'person', 3, 25, 'victim',
    'Survivor who testified about abuse on Little St. James Island. Filed lawsuit against Epstein and Maxwell in 2017. Her memoir and testimony provided detailed accounts of life on the island and attempts to escape.',
    true, true, 'journalist', ARRAY['ZAF','USA'], 'South African', 'Author / Survivor', '1985-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Sarah Ransome');
SELECT id INTO v_ransome FROM nodes WHERE name = 'Sarah Ransome';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Courtney Wild', 'person', 3, 20, 'victim',
    'Lead plaintiff in the Crime Victims Rights Act case challenging Epstein''s 2008 plea deal. Recruited at age 14. Her legal battle helped expose the controversial non-prosecution agreement arranged by Alexander Acosta.',
    true, true, 'official', ARRAY['USA'], 'American', 'Survivor / Advocate', '1990-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Courtney Wild');
SELECT id INTO v_wild FROM nodes WHERE name = 'Courtney Wild';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Annie Farmer', 'person', 3, 20, 'victim',
    'Only victim to testify at Ghislaine Maxwell''s 2021 trial using her real name. Abused at Zorro Ranch as a teenager in 1996. Her sister Maria was the first person to report Epstein to the FBI.',
    true, true, 'official', ARRAY['USA'], 'American', 'Psychologist / Survivor', '1979-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Annie Farmer');
SELECT id INTO v_a_farmer FROM nodes WHERE name = 'Annie Farmer';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Maria Farmer', 'person', 3, 25, 'victim',
    'First person to report Jeffrey Epstein and Ghislaine Maxwell to the FBI in 1996. Artist who was assaulted at Les Wexner''s Ohio estate. Her reports were ignored by law enforcement for years.',
    true, true, 'official', ARRAY['USA'], 'American', 'Artist / Survivor', '1970-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Maria Farmer');
SELECT id INTO v_m_farmer FROM nodes WHERE name = 'Maria Farmer';

-- ============================================================================
-- STEP 2: INSTITUTIONS (5 nodes)
-- ============================================================================

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'JP Morgan Chase', 'organization', 2, 70, 'financial_institution',
    'Major financial institution that banked Jeffrey Epstein for over 15 years (1998-2013) despite numerous red flags. Settled with USVI for $75M and with victims for $290M in 2023.',
    true, true, 'official', ARRAY['USA'], 'American', 'Investment Bank'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'JP Morgan Chase');
SELECT id INTO v_jpmorgan FROM nodes WHERE name = 'JP Morgan Chase';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Deutsche Bank', 'organization', 2, 65, 'financial_institution',
    'Processed millions in suspicious transactions for Epstein from 2013 to 2018, after JP Morgan dropped him. Fined $150M by NYDFS in 2020 for compliance failures.',
    true, true, 'official', ARRAY['DEU','USA'], 'German', 'Investment Bank'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Deutsche Bank');
SELECT id INTO v_deutsche FROM nodes WHERE name = 'Deutsche Bank';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'MIT Media Lab', 'organization', 3, 50, 'academic_institution',
    'MIT research lab that accepted donations from Epstein even after his 2008 conviction. Director Joi Ito resigned in 2019 after exposure by Ronan Farrow in The New Yorker.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Research Institution'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'MIT Media Lab');
SELECT id INTO v_mit FROM nodes WHERE name = 'MIT Media Lab';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'L Brands / Victoria''s Secret', 'organization', 2, 55, 'corporation',
    'Retail conglomerate owned by Les Wexner. Epstein had unusual access to Victoria''s Secret models and used the brand as a recruitment tool. Wexner granted Epstein power of attorney in 1991.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Retail Corporation'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'L Brands / Victoria''s Secret');
SELECT id INTO v_lbrands FROM nodes WHERE name = 'L Brands / Victoria''s Secret';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'MC2 Model Management', 'organization', 2, 80, 'front_company',
    'Modeling agency founded by Jean-Luc Brunel with Epstein funding. Used as a pipeline to recruit young women under the guise of modeling opportunities.',
    true, true, 'official', ARRAY['USA','FRA'], 'Franco-American', 'Modeling Agency'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'MC2 Model Management');
SELECT id INTO v_mc2 FROM nodes WHERE name = 'MC2 Model Management';

-- ============================================================================
-- STEP 3: LOCATIONS (5 nodes)
-- ============================================================================

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Little St. James Island', 'location', 1, 95, 'primary_location',
    'Private 70-acre island in the US Virgin Islands purchased by Epstein in 1998. Known colloquially as "Pedophile Island." Site of extensive abuse. FBI raided August 2019. Featured distinctive blue-striped temple.',
    true, true, 'official', ARRAY['VIR','USA'], 'US Virgin Islands', 'Private Island'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Little St. James Island');
SELECT id INTO v_island FROM nodes WHERE name = 'Little St. James Island';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Zorro Ranch', 'location', 2, 75, 'secondary_location',
    '33,000-acre ranch near Stanley, New Mexico. Epstein reportedly planned to use it for a DNA-seeding program. Annie Farmer testified she was abused here.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Ranch Estate'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Zorro Ranch');
SELECT id INTO v_zorro FROM nodes WHERE name = 'Zorro Ranch';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, '9 East 71st Street NYC', 'location', 1, 85, 'primary_location',
    'Epstein''s Manhattan townhouse — one of the largest private residences in NYC. Originally owned by Les Wexner, transferred to Epstein under unclear circumstances. Sold in 2021 for $51M.',
    true, true, 'official', ARRAY['USA'], 'American', 'Manhattan Townhouse'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = '9 East 71st Street NYC');
SELECT id INTO v_nyc FROM nodes WHERE name = '9 East 71st Street NYC';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, '22 Avenue Foch Paris', 'location', 2, 70, 'european_base',
    'Luxury apartment near the Arc de Triomphe, serving as Epstein''s European base of operations. Jean-Luc Brunel was a frequent visitor.',
    true, true, 'journalist', ARRAY['FRA'], 'French', 'Paris Apartment'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = '22 Avenue Foch Paris');
SELECT id INTO v_paris FROM nodes WHERE name = '22 Avenue Foch Paris';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Palm Beach Residence', 'location', 2, 80, 'investigation_origin',
    'Epstein''s Florida mansion at 358 El Brillo Way. The 2005 investigation by Palm Beach PD that originated here led to the first criminal case.',
    true, true, 'official', ARRAY['USA'], 'American', 'Florida Mansion'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Palm Beach Residence');
SELECT id INTO v_palmbeach FROM nodes WHERE name = 'Palm Beach Residence';

-- ============================================================================
-- STEP 4: ENABLERS & KEY FIGURES (7 nodes)
-- ============================================================================

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Alexander Acosta', 'person', 2, 65, 'legal_enabler',
    'US Attorney who approved the controversial 2008 plea deal granting Epstein federal immunity. Later appointed US Secretary of Labor, resigned in 2019 amid scrutiny.',
    true, true, 'official', ARRAY['USA'], 'American', 'Lawyer / Politician', '1969-01-16'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Alexander Acosta');
SELECT id INTO v_acosta FROM nodes WHERE name = 'Alexander Acosta';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Larry Summers', 'person', 3, 35, 'associate',
    'Former Harvard President and US Treasury Secretary. Met with Epstein on multiple occasions, including after his 2008 conviction.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Economist / Academic', '1954-11-30'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Larry Summers');
SELECT id INTO v_summers FROM nodes WHERE name = 'Larry Summers';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Joi Ito', 'person', 3, 45, 'fundraiser',
    'Former MIT Media Lab Director who accepted donations from Epstein and concealed the source. Resigned September 2019 after exposure by Ronan Farrow.',
    true, true, 'official', ARRAY['USA','JPN'], 'Japanese-American', 'Technologist', '1966-06-19'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Joi Ito');
SELECT id INTO v_ito FROM nodes WHERE name = 'Joi Ito';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Steve Bannon', 'person', 3, 40, 'associate',
    'Political strategist and former White House adviser. Met with Epstein at the NYC townhouse.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Political Strategist', '1953-11-27'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Steve Bannon');
SELECT id INTO v_bannon FROM nodes WHERE name = 'Steve Bannon';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Glenn Dubin', 'person', 2, 55, 'associate',
    'Hedge fund billionaire. Close associate of Epstein for decades. Virginia Giuffre alleged she was directed to have sexual encounters with Dubin, which he denied.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Hedge Fund Manager', '1957-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Glenn Dubin');
SELECT id INTO v_g_dubin FROM nodes WHERE name = 'Glenn Dubin';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Eva Dubin', 'person', 3, 40, 'associate',
    'Former Miss Sweden and physician. Previously dated Epstein. Named Epstein as successor guardian of her children in her will.',
    true, true, 'journalist', ARRAY['SWE','USA'], 'Swedish-American', 'Physician', '1961-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Eva Dubin');
SELECT id INTO v_e_dubin FROM nodes WHERE name = 'Eva Dubin';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation, birth_date)
SELECT v_network_id, 'Adriana Ross', 'person', 3, 50, 'assistant',
    'Polish-born former model. Invoked the Fifth Amendment when called to testify. Listed in flight logs and black book. Described as one of Epstein''s schedulers.',
    true, true, 'official', ARRAY['POL','USA'], 'Polish-American', 'Model / Assistant', '1986-01-01'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Adriana Ross');
SELECT id INTO v_ross FROM nodes WHERE name = 'Adriana Ross';

-- ============================================================================
-- STEP 5: VEHICLES & KEY DOCUMENTS (3 nodes)
-- ============================================================================

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Lolita Express (Boeing 727)', 'document', 2, 90, 'transport',
    'Epstein''s primary private aircraft (tail N908JE). Flight logs obtained via FOIA revealed high-profile passengers. Facilitated transport of victims worldwide.',
    true, true, 'official', ARRAY['USA','VIR'], 'American', 'Private Aircraft'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Lolita Express (Boeing 727)');
SELECT id INTO v_lolita FROM nodes WHERE name = 'Lolita Express (Boeing 727)';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'Gulfstream IV (N120JE)', 'document', 3, 70, 'transport',
    'Epstein''s secondary private jet (tail N120JE). Used for shorter trips supplementing the Boeing 727.',
    true, true, 'journalist', ARRAY['USA'], 'American', 'Private Aircraft'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'Gulfstream IV (N120JE)');
SELECT id INTO v_gulfstream FROM nodes WHERE name = 'Gulfstream IV (N120JE)';

INSERT INTO nodes (network_id, name, type, tier, risk, role, summary, is_active, is_alive, verification_level, country_tags, nationality, occupation)
SELECT v_network_id, 'The Black Book', 'document', 2, 85, 'evidence_document',
    'Epstein''s personal contact book with ~1,500 names. Stolen by butler Alfredo Rodriguez. Published by Gawker in 2015. Key piece of evidence in multiple investigations.',
    true, true, 'official', ARRAY['USA'], 'American', 'Contact Book / Evidence'
WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE name = 'The Black Book');
SELECT id INTO v_blackbook FROM nodes WHERE name = 'The Black Book';

-- ============================================================================
-- STEP 6: LINKS — VICTIMS (~15 links)
-- ============================================================================

-- Virginia Giuffre
INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_giuffre, v_epstein, 'victim', 95, 'Recruited at 16 from Mar-a-Lago. Primary accuser.'
WHERE v_giuffre IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_giuffre AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_giuffre, v_maxwell, 'victim', 90, 'Maxwell recruited and groomed her.'
WHERE v_giuffre IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_giuffre AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_giuffre, v_andrew, 'legal', 85, 'Filed lawsuit. Settled for £12M in 2022.'
WHERE v_giuffre IS NOT NULL AND v_andrew IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_giuffre AND target_id = v_andrew);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_giuffre, v_dershowitz, 'legal', 70, 'Defamation lawsuit. Public accusations.'
WHERE v_giuffre IS NOT NULL AND v_dershowitz IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_giuffre AND target_id = v_dershowitz);

-- Sarah Ransome
INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_ransome, v_epstein, 'victim', 85, 'Abused on Little St. James. Filed 2017 lawsuit.'
WHERE v_ransome IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_ransome AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_ransome, v_island, 'travel', 80, 'Held on island. Testified about conditions.'
WHERE v_ransome IS NOT NULL AND v_island IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_ransome AND target_id = v_island);

-- Courtney Wild
INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_wild, v_epstein, 'victim', 80, 'Recruited at 14 in Palm Beach. Lead CVRA plaintiff.'
WHERE v_wild IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_wild AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_wild, v_palmbeach, 'travel', 75, 'Abuse at Palm Beach residence.'
WHERE v_wild IS NOT NULL AND v_palmbeach IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_wild AND target_id = v_palmbeach);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_wild, v_acosta, 'legal', 65, 'CVRA case challenged plea deal.'
WHERE v_wild IS NOT NULL AND v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_wild AND target_id = v_acosta);

-- Annie Farmer
INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_a_farmer, v_epstein, 'victim', 85, 'Testified at Maxwell trial using real name.'
WHERE v_a_farmer IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_a_farmer AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_a_farmer, v_maxwell, 'victim', 80, 'Maxwell facilitated abuse at Zorro Ranch.'
WHERE v_a_farmer IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_a_farmer AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_a_farmer, v_zorro, 'travel', 75, 'Abused at Zorro Ranch, NM.'
WHERE v_a_farmer IS NOT NULL AND v_zorro IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_a_farmer AND target_id = v_zorro);

-- Maria Farmer
INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_m_farmer, v_epstein, 'victim', 80, 'First to report to FBI in 1996.'
WHERE v_m_farmer IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_m_farmer AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_m_farmer, v_maxwell, 'victim', 75, 'Assaulted by Maxwell at Wexner estate.'
WHERE v_m_farmer IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_m_farmer AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_m_farmer, v_wexner, 'associate', 60, 'Assaulted at Wexner Ohio compound.'
WHERE v_m_farmer IS NOT NULL AND v_wexner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_m_farmer AND target_id = v_wexner);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_m_farmer, v_nyc, 'travel', 70, 'Worked at NYC townhouse before assault.'
WHERE v_m_farmer IS NOT NULL AND v_nyc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_m_farmer AND target_id = v_nyc);

-- ============================================================================
-- STEP 7: LINKS — INSTITUTIONS (~10 links)
-- ============================================================================

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_jpmorgan, v_epstein, 'financial', 90, 'Banked 15+ years. Settled $365M total.'
WHERE v_jpmorgan IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_jpmorgan AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_deutsche, v_epstein, 'financial', 85, 'Suspicious transactions 2013-2018. Fined $150M.'
WHERE v_deutsche IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_deutsche AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_jpmorgan, v_deutsche, 'financial', 40, 'Epstein moved from JPM to DB in 2013.'
WHERE v_jpmorgan IS NOT NULL AND v_deutsche IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_jpmorgan AND target_id = v_deutsche);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_mit, v_epstein, 'financial', 60, 'Accepted post-conviction donations.'
WHERE v_mit IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_mit AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_mit, v_ito, 'professional', 80, 'Ito directed Lab, accepted funds.'
WHERE v_mit IS NOT NULL AND v_ito IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_mit AND target_id = v_ito);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lbrands, v_wexner, 'ownership', 95, 'Wexner founded L Brands.'
WHERE v_lbrands IS NOT NULL AND v_wexner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lbrands AND target_id = v_wexner);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lbrands, v_epstein, 'financial', 70, 'Epstein had unusual access to VS models.'
WHERE v_lbrands IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lbrands AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_mc2, v_brunel, 'ownership', 95, 'Brunel founded MC2 with Epstein money.'
WHERE v_mc2 IS NOT NULL AND v_brunel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_mc2 AND target_id = v_brunel);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_mc2, v_epstein, 'financial', 90, 'Epstein financed MC2 for recruitment.'
WHERE v_mc2 IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_mc2 AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_mc2, v_maxwell, 'recruitment', 60, 'Maxwell involved in recruitment pipeline.'
WHERE v_mc2 IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_mc2 AND target_id = v_maxwell);

-- ============================================================================
-- STEP 8: LINKS — LOCATIONS (~12 links)
-- ============================================================================

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_island, v_epstein, 'ownership', 95, 'Purchased 1998. Primary abuse location.'
WHERE v_island IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_island AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_island, v_andrew, 'travel', 70, 'Andrew photographed at the island.'
WHERE v_island IS NOT NULL AND v_andrew IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_island AND target_id = v_andrew);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_island, v_maxwell, 'associate', 85, 'Maxwell managed island operations.'
WHERE v_island IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_island AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_zorro, v_epstein, 'ownership', 90, '33,000 acres in New Mexico.'
WHERE v_zorro IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_zorro AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_nyc, v_epstein, 'ownership', 95, 'Largest private NYC residence.'
WHERE v_nyc IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_nyc AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_nyc, v_wexner, 'ownership', 70, 'Originally Wexner property.'
WHERE v_nyc IS NOT NULL AND v_wexner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_nyc AND target_id = v_wexner);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_nyc, v_maxwell, 'associate', 80, 'Maxwell frequently present.'
WHERE v_nyc IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_nyc AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_paris, v_epstein, 'ownership', 85, 'European operations base.'
WHERE v_paris IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_paris AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_paris, v_brunel, 'associate', 75, 'Brunel frequently visited.'
WHERE v_paris IS NOT NULL AND v_brunel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_paris AND target_id = v_brunel);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_palmbeach, v_epstein, 'ownership', 90, '2005 investigation origin.'
WHERE v_palmbeach IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_palmbeach AND target_id = v_epstein);

-- ============================================================================
-- STEP 9: LINKS — ENABLERS (~10 links)
-- ============================================================================

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_acosta, v_epstein, 'legal', 80, 'Approved 2008 plea deal.'
WHERE v_acosta IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_acosta AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_acosta, v_dershowitz, 'legal', 50, 'Dershowitz negotiated with Acosta.'
WHERE v_acosta IS NOT NULL AND v_dershowitz IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_acosta AND target_id = v_dershowitz);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_summers, v_epstein, 'associate', 40, 'Met post-conviction.'
WHERE v_summers IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_summers AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_ito, v_epstein, 'financial', 55, 'Accepted and concealed donations.'
WHERE v_ito IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_ito AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_bannon, v_epstein, 'associate', 35, 'Met at NYC townhouse.'
WHERE v_bannon IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_bannon AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_g_dubin, v_epstein, 'associate', 75, 'Close associate for decades.'
WHERE v_g_dubin IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_g_dubin AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_g_dubin, v_e_dubin, 'familial', 95, 'Married couple.'
WHERE v_g_dubin IS NOT NULL AND v_e_dubin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_g_dubin AND target_id = v_e_dubin);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_e_dubin, v_epstein, 'associate', 55, 'Ex-girlfriend. Named Epstein in will.'
WHERE v_e_dubin IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_e_dubin AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_ross, v_epstein, 'associate', 70, 'Scheduler. Invoked Fifth.'
WHERE v_ross IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_ross AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_ross, v_maxwell, 'associate', 60, 'Worked alongside Maxwell.'
WHERE v_ross IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_ross AND target_id = v_maxwell);

-- ============================================================================
-- STEP 10: LINKS — VEHICLES & DOCUMENTS (~8 links)
-- ============================================================================

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lolita, v_epstein, 'ownership', 95, 'Primary aircraft. Tail N908JE.'
WHERE v_lolita IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lolita AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lolita, v_clinton, 'travel', 70, 'Clinton logged 26+ flights.'
WHERE v_lolita IS NOT NULL AND v_clinton IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lolita AND target_id = v_clinton);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lolita, v_andrew, 'travel', 65, 'Andrew in flight logs.'
WHERE v_lolita IS NOT NULL AND v_andrew IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lolita AND target_id = v_andrew);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lolita, v_maxwell, 'travel', 85, 'Maxwell frequent passenger.'
WHERE v_lolita IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lolita AND target_id = v_maxwell);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_lolita, v_island, 'travel', 90, 'Primary transport to island.'
WHERE v_lolita IS NOT NULL AND v_island IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_lolita AND target_id = v_island);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_gulfstream, v_epstein, 'ownership', 90, 'Secondary aircraft.'
WHERE v_gulfstream IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_gulfstream AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_blackbook, v_epstein, 'ownership', 95, '~1,500 contacts.'
WHERE v_blackbook IS NOT NULL AND v_epstein IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_blackbook AND target_id = v_epstein);

INSERT INTO links (source_id, target_id, relationship_type, strength, description)
SELECT v_blackbook, v_maxwell, 'associate', 60, 'Maxwell listed prominently.'
WHERE v_blackbook IS NOT NULL AND v_maxwell IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links WHERE source_id = v_blackbook AND target_id = v_maxwell);

-- ============================================================================
-- STEP 11: EVIDENCE
-- ============================================================================

-- Virginia Giuffre
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_giuffre, 'legal', 'Giuffre v. Maxwell Civil Lawsuit (2015)', 'Defamation lawsuit producing thousands of pages of depositions and documents.', 'US District Court SDNY', 'https://www.courtlistener.com', '2015-09-21', 'verified', true, ARRAY['USA'], 'en'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Giuffre v. Maxwell Civil Lawsuit (2015)');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_giuffre, 'legal', 'Settlement with Prince Andrew (2022)', 'Out-of-court settlement. Andrew donated to victims'' charity. No admission of liability.', 'BBC News', 'https://www.bbc.com/news', '2022-02-15', 'verified', false, ARRAY['USA','GBR'], 'en'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Settlement with Prince Andrew (2022)');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_giuffre, 'testimony', 'Deposition: Recruitment at Mar-a-Lago', 'Described recruitment at age 16. Maxwell approached her at spa.', 'Court Depositions', 'https://www.courtlistener.com', '2016-05-03', 'verified', true, ARRAY['USA'], 'en'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Deposition: Recruitment at Mar-a-Lago');

-- JP Morgan
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_jpmorgan, 'legal', 'USVI v. JP Morgan Settlement ($75M)', 'USVI sued for facilitating trafficking. Settled $75M.', 'US Virgin Islands AG', 'https://www.justice.gov', '2023-09-26', 'verified', true, ARRAY['USA','VIR'], 'en'
WHERE v_jpmorgan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'USVI v. JP Morgan Settlement ($75M)');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_jpmorgan, 'legal', 'Class Action Settlement ($290M)', 'Largest sex trafficking settlement in US history.', 'Reuters', 'https://www.reuters.com', '2023-06-12', 'verified', false, ARRAY['USA'], 'en'
WHERE v_jpmorgan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Class Action Settlement ($290M)');

-- Little St. James
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_island, 'document', 'FBI Raid on Island (August 2019)', 'FBI/NYPD executed warrants. Recovered computers and evidence.', 'FBI / DOJ', 'https://www.justice.gov', '2019-08-12', 'verified', true, ARRAY['VIR','USA'], 'en'
WHERE v_island IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'FBI Raid on Island (August 2019)');

-- Lolita Express
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_lolita, 'document', 'Flight Logs Released via FOIA (2015)', 'Pilot logs documenting hundreds of flights with passenger manifests.', 'FOIA / Court Records', 'https://www.courtlistener.com', '2015-01-05', 'verified', true, ARRAY['USA'], 'en'
WHERE v_lolita IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Flight Logs Released via FOIA (2015)');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_lolita, 'document', 'FAA Registration N908JE', 'Boeing 727-31 registered to JEGE Inc., Epstein-controlled entity.', 'FAA Registry', 'https://registry.faa.gov', '2019-07-08', 'verified', true, ARRAY['USA'], 'en'
WHERE v_lolita IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'FAA Registration N908JE');

-- Black Book
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_blackbook, 'legal', 'Alfredo Rodriguez Theft and Prosecution', 'Butler stole book, tried to sell for $50K. Convicted, 18 months.', 'US District Court', 'https://www.courtlistener.com', '2011-01-20', 'verified', true, ARRAY['USA'], 'en'
WHERE v_blackbook IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Alfredo Rodriguez Theft and Prosecution');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_blackbook, 'media', 'Gawker Publishes Full Black Book (2015)', 'Complete contents published. ~1,500 contacts with circled names.', 'Gawker Media', NULL, '2015-01-06', 'verified', false, ARRAY['USA'], 'en'
WHERE v_blackbook IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Gawker Publishes Full Black Book (2015)');

-- Acosta
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_acosta, 'legal', '2008 Non-Prosecution Agreement', 'Granted Epstein federal immunity. Later found to violate CVRA.', 'US Attorney SDFL', 'https://www.justice.gov', '2008-06-30', 'verified', true, ARRAY['USA'], 'en'
WHERE v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = '2008 Non-Prosecution Agreement');

INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_acosta, 'news', 'Miami Herald "Perversion of Justice"', 'Julie K. Brown investigation exposing plea deal. Catalyst for 2019 re-arrest.', 'Miami Herald', 'https://www.miamiherald.com', '2018-11-28', 'verified', false, ARRAY['USA'], 'en'
WHERE v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'Miami Herald "Perversion of Justice"');

-- Deutsche Bank
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_deutsche, 'financial', 'NYDFS $150M Fine', 'Fined for compliance failures on Epstein accounts.', 'NYDFS', 'https://www.dfs.ny.gov', '2020-07-07', 'verified', true, ARRAY['USA','DEU'], 'en'
WHERE v_deutsche IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'NYDFS $150M Fine');

-- MC2
INSERT INTO evidence_archive (node_id, evidence_type, title, description, source_name, source_url, source_date, verification_status, is_primary_source, country_tags, language)
SELECT v_mc2, 'testimony', 'MC2 Recruitment Pipeline Testimony', 'Survivors described how MC2 lured women with modeling promises.', 'Court Testimony', NULL, '2020-12-01', 'verified', false, ARRAY['USA','FRA'], 'en'
WHERE v_mc2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM evidence_archive WHERE title = 'MC2 Recruitment Pipeline Testimony');

-- ============================================================================
-- STEP 12: TIMELINE EVENTS
-- ============================================================================

-- Giuffre
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_giuffre, '2000-06-01', 'meeting', 'Recruited at Mar-a-Lago at age 16', 'Maxwell approached her while working at the spa.', 'Palm Beach, FL', true, 'critical'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Recruited at Mar-a-Lago at age 16');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_giuffre, '2015-01-01', 'legal', 'Filed Lawsuit Against Maxwell', 'Defamation suit triggered release of thousands of documents.', 'New York', true, 'critical'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Filed Lawsuit Against Maxwell');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_giuffre, '2022-02-15', 'legal', 'Settlement with Prince Andrew', 'Estimated £12M settlement with donation to victims'' charity.', 'New York / London', true, 'critical'
WHERE v_giuffre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Settlement with Prince Andrew' AND node_id = v_giuffre);

-- JP Morgan
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_jpmorgan, '1998-01-01', 'financial', 'Began Banking Epstein', '15-year banking relationship begins.', 'New York', true, 'high'
WHERE v_jpmorgan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Began Banking Epstein');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_jpmorgan, '2013-06-01', 'financial', 'Dropped Epstein as Client', 'Terminated relationship 5 years after conviction.', 'New York', true, 'high'
WHERE v_jpmorgan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Dropped Epstein as Client');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_jpmorgan, '2023-06-12', 'legal', 'Settled with Victims for $290M', 'Largest sex trafficking settlement in US history.', 'New York', true, 'critical'
WHERE v_jpmorgan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Settled with Victims for $290M');

-- Island
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_island, '1998-01-01', 'financial', 'Purchased by Epstein for $7.95M', 'Epstein acquired 70-acre island in USVI.', 'US Virgin Islands', true, 'high'
WHERE v_island IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Purchased by Epstein for $7.95M');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_island, '2019-08-12', 'investigation', 'FBI Raid on Island', 'FBI/NYPD executed warrants post-arrest.', 'Little St. James, USVI', true, 'critical'
WHERE v_island IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'FBI Raid on Island');

-- Acosta
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_acosta, '2008-06-30', 'legal', 'Approved Non-Prosecution Agreement', 'Granted Epstein federal immunity in controversial deal.', 'Miami, FL', true, 'critical'
WHERE v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Approved Non-Prosecution Agreement');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_acosta, '2017-04-26', 'legal', 'Nominated Secretary of Labor', 'Trump nominated Acosta despite plea deal role.', 'Washington DC', true, 'high'
WHERE v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Nominated Secretary of Labor');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_acosta, '2019-07-12', 'legal', 'Resigned as Secretary of Labor', 'Pressure from Epstein 2019 arrest.', 'Washington DC', true, 'critical'
WHERE v_acosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Resigned as Secretary of Labor');

-- MC2
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_mc2, '2005-01-01', 'founding', 'MC2 Model Management Founded', 'Brunel founded with Epstein funding.', 'New York / Miami', true, 'high'
WHERE v_mc2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'MC2 Model Management Founded');

-- Black Book
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_blackbook, '2009-01-01', 'investigation', 'Butler Steals Black Book', 'Rodriguez stole book, tried to sell for $50K.', 'Palm Beach, FL', true, 'high'
WHERE v_blackbook IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Butler Steals Black Book');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_blackbook, '2015-01-06', 'investigation', 'Published by Gawker Media', '~1,500 contacts made public.', 'New York', true, 'critical'
WHERE v_blackbook IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Published by Gawker Media');

-- Lolita Express
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_lolita, '2015-01-05', 'investigation', 'Flight Logs Released via FOIA', 'Pilot logbooks released documenting passengers.', 'Washington DC', true, 'critical'
WHERE v_lolita IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Flight Logs Released via FOIA');

-- Deutsche Bank
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_deutsche, '2013-06-01', 'financial', 'Began Banking Epstein After JPM', 'Opened accounts after JP Morgan dropped him.', 'New York', true, 'high'
WHERE v_deutsche IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Began Banking Epstein After JPM');

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_deutsche, '2020-07-07', 'legal', 'Fined $150M by NYDFS', 'Compliance failures on Epstein accounts.', 'New York', true, 'critical'
WHERE v_deutsche IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Fined $150M by NYDFS');

-- Palm Beach
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, is_verified, importance)
SELECT v_palmbeach, '2005-03-15', 'investigation', 'Palm Beach PD Investigation Begins', 'Parent reported 14-year-old daughter taken to mansion.', 'Palm Beach, FL', true, 'critical'
WHERE v_palmbeach IS NOT NULL AND NOT EXISTS (SELECT 1 FROM timeline_events WHERE title = 'Palm Beach PD Investigation Begins');

RAISE NOTICE '✅ Sprint 2: 25 nodes, ~55 links, ~17 evidence, ~20 timeline events';

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT
    n.name,
    n.type,
    n.tier,
    n.risk,
    (SELECT COUNT(*) FROM links l WHERE l.source_id = n.id OR l.target_id = n.id) as links,
    (SELECT COUNT(*) FROM evidence_archive e WHERE e.node_id = n.id) as evidence,
    (SELECT COUNT(*) FROM timeline_events t WHERE t.node_id = n.id) as timeline
FROM nodes n
WHERE n.network_id = (SELECT id FROM networks WHERE name ILIKE '%epstein%' LIMIT 1)
  AND n.is_active = true
ORDER BY n.type, n.tier, n.risk DESC;
