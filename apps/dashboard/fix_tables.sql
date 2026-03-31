-- ============================================
-- PROJECT TRUTH: TAM TABLO YAPILANDIRMASI
-- ============================================

-- 1. Mevcut eksik tabloyu sil
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;

-- 2. NODES tablosunu tam oluştur
CREATE TABLE public.nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type varchar(50) DEFAULT 'person',
  tier integer DEFAULT 3,
  risk integer DEFAULT 50,
  is_alive boolean DEFAULT true,
  role varchar(255),
  summary text,
  image_url text,
  details jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. LINKS tablosunu oluştur
CREATE TABLE public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  target_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  relationship_type varchar(50) DEFAULT 'associated',
  strength integer DEFAULT 50,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id, relationship_type)
);

-- 4. EVIDENCE tablosu
CREATE TABLE IF NOT EXISTS public.evidence_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES nodes(id) ON DELETE SET NULL,
  link_id uuid REFERENCES links(id) ON DELETE SET NULL,
  evidence_type varchar(50) DEFAULT 'document',
  title varchar(255) NOT NULL,
  description text,
  content text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. RLS aktifleştir
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 6. Public read policy
CREATE POLICY "nodes_read" ON nodes FOR SELECT USING (is_active = true);
CREATE POLICY "links_read" ON links FOR SELECT USING (true);

-- 7. SEED DATA - Epstein Network
INSERT INTO nodes (name, type, tier, risk, is_alive, role) VALUES
('Jeffrey Epstein', 'person', 0, 100, false, 'mastermind'),
('Ghislaine Maxwell', 'person', 1, 95, true, 'accomplice'),
('Jean-Luc Brunel', 'person', 1, 90, false, 'accomplice'),
('Prince Andrew', 'person', 2, 85, true, 'royal'),
('Les Wexner', 'person', 2, 75, true, 'financier'),
('Alan Dershowitz', 'person', 2, 70, true, 'lawyer'),
('Bill Clinton', 'person', 3, 65, true, 'politician'),
('Donald Trump', 'person', 3, 50, true, 'politician'),
('Bill Gates', 'person', 3, 45, true, 'billionaire'),
('Kevin Spacey', 'person', 3, 60, true, 'celebrity'),
('Leonardo DiCaprio', 'person', 4, 25, true, 'celebrity'),
('Stephen Hawking', 'person', 4, 15, false, 'scientist'),
('Michael Jackson', 'person', 4, 20, false, 'celebrity'),
('Naomi Campbell', 'person', 4, 30, true, 'celebrity'),
('Elon Musk', 'person', 4, 20, true, 'billionaire');

-- 8. LINKS ekle
DO $$
DECLARE
  v_epstein uuid; v_maxwell uuid; v_brunel uuid; v_prince uuid;
  v_wexner uuid; v_dershowitz uuid; v_clinton uuid; v_trump uuid;
  v_gates uuid; v_spacey uuid; v_dicaprio uuid; v_hawking uuid;
  v_jackson uuid; v_campbell uuid; v_musk uuid;
BEGIN
  SELECT id INTO v_epstein FROM nodes WHERE name = 'Jeffrey Epstein';
  SELECT id INTO v_maxwell FROM nodes WHERE name = 'Ghislaine Maxwell';
  SELECT id INTO v_brunel FROM nodes WHERE name = 'Jean-Luc Brunel';
  SELECT id INTO v_prince FROM nodes WHERE name = 'Prince Andrew';
  SELECT id INTO v_wexner FROM nodes WHERE name = 'Les Wexner';
  SELECT id INTO v_dershowitz FROM nodes WHERE name = 'Alan Dershowitz';
  SELECT id INTO v_clinton FROM nodes WHERE name = 'Bill Clinton';
  SELECT id INTO v_trump FROM nodes WHERE name = 'Donald Trump';
  SELECT id INTO v_gates FROM nodes WHERE name = 'Bill Gates';
  SELECT id INTO v_spacey FROM nodes WHERE name = 'Kevin Spacey';
  SELECT id INTO v_dicaprio FROM nodes WHERE name = 'Leonardo DiCaprio';
  SELECT id INTO v_hawking FROM nodes WHERE name = 'Stephen Hawking';
  SELECT id INTO v_jackson FROM nodes WHERE name = 'Michael Jackson';
  SELECT id INTO v_campbell FROM nodes WHERE name = 'Naomi Campbell';
  SELECT id INTO v_musk FROM nodes WHERE name = 'Elon Musk';

  INSERT INTO links (source_id, target_id, strength, relationship_type) VALUES
  (v_epstein, v_maxwell, 95, 'criminal'),
  (v_epstein, v_brunel, 85, 'criminal'),
  (v_epstein, v_prince, 80, 'associated'),
  (v_epstein, v_wexner, 90, 'financial'),
  (v_epstein, v_dershowitz, 75, 'professional'),
  (v_epstein, v_clinton, 70, 'associated'),
  (v_epstein, v_trump, 45, 'associated'),
  (v_epstein, v_gates, 50, 'associated'),
  (v_epstein, v_spacey, 55, 'associated'),
  (v_epstein, v_dicaprio, 25, 'associated'),
  (v_epstein, v_hawking, 20, 'associated'),
  (v_epstein, v_jackson, 20, 'associated'),
  (v_epstein, v_campbell, 30, 'associated'),
  (v_epstein, v_musk, 15, 'associated'),
  (v_maxwell, v_prince, 85, 'associated'),
  (v_maxwell, v_brunel, 80, 'criminal'),
  (v_maxwell, v_campbell, 40, 'associated'),
  (v_clinton, v_spacey, 35, 'associated'),
  (v_trump, v_prince, 30, 'associated');
END;
$$;

-- 9. FOTOĞRAFLAR EKLE
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Jeffrey_Epstein_mugshot.jpg' WHERE name = 'Jeffrey Epstein';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Ghislaine_Maxwell_mugshot.jpg' WHERE name = 'Ghislaine Maxwell';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Prince_Andrew_August_2014_%28cropped%29.jpg/440px-Prince_Andrew_August_2014_%28cropped%29.jpg' WHERE name = 'Prince Andrew';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Alan_Dershowitz_2009.jpg/440px-Alan_Dershowitz_2009.jpg' WHERE name = 'Alan Dershowitz';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Bill_Clinton.jpg/440px-Bill_Clinton.jpg' WHERE name = 'Bill Clinton';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg' WHERE name = 'Donald Trump';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bill_Gates_2017_%28cropped%29.jpg/440px-Bill_Gates_2017_%28cropped%29.jpg' WHERE name = 'Bill Gates';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Kevin_Spacey%2C_May_2013.jpg/440px-Kevin_Spacey%2C_May_2013.jpg' WHERE name = 'Kevin Spacey';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Leonardo_Dicaprio_Cannes_2019.jpg/440px-Leonardo_Dicaprio_Cannes_2019.jpg' WHERE name = 'Leonardo DiCaprio';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Stephen_Hawking.StarChild.jpg/440px-Stephen_Hawking.StarChild.jpg' WHERE name = 'Stephen Hawking';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Naomi_Campbell_Cannes_2017.jpg/440px-Naomi_Campbell_Cannes_2017.jpg' WHERE name = 'Naomi Campbell';
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/440px-Elon_Musk_Royal_Society_%28crop2%29.jpg' WHERE name = 'Elon Musk';

-- 10. KONTROL
SELECT name, tier, risk, is_alive, image_url IS NOT NULL as has_image FROM nodes ORDER BY tier, risk DESC;
