-- ============================================
-- Migration 005: Timeline Events
-- Her kişi için kronolojik olaylar
-- ============================================

-- Önce tabloyu DROP et (varsa)
DROP TABLE IF EXISTS timeline_events CASCADE;

-- Timeline Events Tablosu
CREATE TABLE timeline_events (
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

-- Indexler
CREATE INDEX idx_timeline_node ON timeline_events(node_id);
CREATE INDEX idx_timeline_date ON timeline_events(event_date);

-- RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline_read" ON timeline_events FOR SELECT USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- JEFFREY EPSTEIN
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1953-01-20', 'birth', 'Doğum', 'Jeffrey Edward Epstein Brooklyn''de doğdu.', 'Brooklyn, New York, USA', 'normal', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1976-01-01', 'other', 'Dalton Okulu', 'Matematik öğretmeni olarak Dalton Okulu''na alındı.', 'New York, USA', 'normal', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1981-01-01', 'other', 'Bear Stearns', 'Bear Stearns yatırım bankasında çalışmaya başladı.', 'New York, USA', 'normal', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1988-01-01', 'meeting', 'Les Wexner Ortaklığı', 'Victoria''s Secret sahibi Les Wexner''ın mali danışmanı oldu.', 'Ohio, USA', 'high', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2005-03-01', 'legal', 'Palm Beach Soruşturması', 'Palm Beach polisi soruşturma başlattı.', 'Palm Beach, Florida, USA', 'critical', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2006-05-01', 'legal', 'FBI Soruşturması', 'FBI federal soruşturma başlattı.', 'Florida, USA', 'critical', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2008-06-30', 'conviction', 'İlk Mahkumiyet', 'Florida''da fuhuş suçlarından mahkum oldu. 13 ay hapis.', 'Florida, USA', 'critical', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2019-07-06', 'arrest', 'Federal Tutuklama', 'Teterboro Havaalanı''nda tutuklandı.', 'New Jersey, USA', 'critical', true
FROM nodes WHERE name = 'Jeffrey Epstein';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2019-08-10', 'death', 'Ölüm', 'Cezaevinde ölü bulundu. Resmi açıklama: intihar.', 'New York, USA', 'critical', true
FROM nodes WHERE name = 'Jeffrey Epstein';

-- GHISLAINE MAXWELL
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1961-12-25', 'birth', 'Doğum', 'Ghislaine Maxwell doğdu.', 'Fransa', 'normal', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1991-11-05', 'other', 'Babasının Ölümü', 'Robert Maxwell yatından düşerek öldü.', 'Kanarya Adaları', 'high', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1992-01-01', 'meeting', 'Epstein ile Tanışma', 'Jeffrey Epstein ile romantik ilişki başladı.', 'New York, USA', 'critical', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2020-07-02', 'arrest', 'Tutuklama', 'New Hampshire''da FBI tarafından tutuklandı.', 'New Hampshire, USA', 'critical', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2021-12-29', 'conviction', 'Mahkumiyet', '5 suçtan mahkum edildi.', 'New York, USA', 'critical', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2022-06-28', 'legal', 'Ceza Kararı', '20 yıl federal hapis cezası.', 'New York, USA', 'critical', true
FROM nodes WHERE name = 'Ghislaine Maxwell';

-- PRINCE ANDREW
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1960-02-19', 'birth', 'Doğum', 'Kraliçe II. Elizabeth''in üçüncü çocuğu olarak doğdu.', 'Londra, UK', 'normal', true
FROM nodes WHERE name = 'Prince Andrew';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1999-01-01', 'meeting', 'Epstein ile Tanışma', 'Maxwell aracılığıyla Epstein ile tanıştı.', 'Londra, UK', 'high', true
FROM nodes WHERE name = 'Prince Andrew';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2001-03-10', 'other', 'Virginia Giuffre Fotoğrafı', 'Maxwell''in evinde Virginia Giuffre (17) ile fotoğraflandı.', 'Londra, UK', 'critical', true
FROM nodes WHERE name = 'Prince Andrew';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2019-11-16', 'media', 'BBC Röportajı', 'Emily Maitlis ile tartışmalı BBC röportajı.', 'Londra, UK', 'critical', true
FROM nodes WHERE name = 'Prince Andrew';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2022-01-13', 'other', 'Ünvanların Geri Alınması', 'Askeri ünvanları ve HRH statüsü geri alındı.', 'UK', 'critical', true
FROM nodes WHERE name = 'Prince Andrew';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2022-02-15', 'legal', 'Dava Uzlaşması', 'Virginia Giuffre davası gizli uzlaşma ile sonuçlandı.', 'New York, USA', 'critical', true
FROM nodes WHERE name = 'Prince Andrew';

-- BILL CLINTON
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1946-08-19', 'birth', 'Doğum', 'William Jefferson Clinton doğdu.', 'Arkansas, USA', 'normal', true
FROM nodes WHERE name = 'Bill Clinton';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2002-09-01', 'travel', 'Afrika Gezisi', 'Epstein''ın uçağıyla Afrika turu.', 'Afrika', 'high', true
FROM nodes WHERE name = 'Bill Clinton';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2003-05-01', 'travel', 'Asya Gezisi', 'Epstein''ın uçağıyla Asya gezisi.', 'Asya', 'high', true
FROM nodes WHERE name = 'Bill Clinton';

-- JEAN-LUC BRUNEL
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1946-01-01', 'birth', 'Doğum', 'Jean-Luc Brunel doğdu.', 'Fransa', 'normal', true
FROM nodes WHERE name = 'Jean-Luc Brunel';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1999-01-01', 'other', 'MC2 Model Ajansı', 'Epstein finansmanıyla MC2 ajansını kurdu.', 'Miami, USA', 'high', true
FROM nodes WHERE name = 'Jean-Luc Brunel';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2020-12-16', 'arrest', 'Tutuklama', 'Paris havaalanında tutuklandı.', 'Paris, Fransa', 'critical', true
FROM nodes WHERE name = 'Jean-Luc Brunel';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2022-02-19', 'death', 'Ölüm', 'Cezaevinde ölü bulundu. Resmi: intihar.', 'Paris, Fransa', 'critical', true
FROM nodes WHERE name = 'Jean-Luc Brunel';

-- LES WEXNER
INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1937-09-08', 'birth', 'Doğum', 'Leslie Herbert Wexner doğdu.', 'Ohio, USA', 'normal', true
FROM nodes WHERE name = 'Les Wexner';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1987-01-01', 'meeting', 'Epstein ile Tanışma', 'Epstein''ı mali danışman olarak işe aldı.', 'Ohio, USA', 'critical', true
FROM nodes WHERE name = 'Les Wexner';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '1991-01-01', 'other', 'Vekalet Belgesi', 'Epstein''a kapsamlı mali vekalet verdi.', 'USA', 'critical', true
FROM nodes WHERE name = 'Les Wexner';

INSERT INTO timeline_events (node_id, event_date, event_type, title, description, location, importance, is_verified)
SELECT id, '2019-08-07', 'other', 'Kamuoyu Açıklaması', 'Epstein tarafından kandırıldığını açıkladı.', 'USA', 'high', true
FROM nodes WHERE name = 'Les Wexner';

-- Kontrol
SELECT n.name, COUNT(t.id) as events FROM nodes n LEFT JOIN timeline_events t ON n.id = t.node_id GROUP BY n.name ORDER BY events DESC;
