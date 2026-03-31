-- ============================================
-- PROJECT TRUTH: FOTOĞRAF GÜNCELLEMESİ
-- ============================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştır
-- ============================================

-- TIER 0: MASTERMIND
-- Jeffrey Epstein - Mugshot (Public Domain - NY State)
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Jeffrey_Epstein_mugshot.jpg'
WHERE name = 'Jeffrey Epstein';

-- TIER 1: KEY ACCOMPLICES
-- Ghislaine Maxwell - Mugshot (Public Domain - Federal)
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Ghislaine_Maxwell_mugshot.jpg'
WHERE name = 'Ghislaine Maxwell';

-- Jean-Luc Brunel - News Photo (kullanılabilir en iyi kaynak)
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Jean-Luc_Brunel.jpg/440px-Jean-Luc_Brunel.jpg'
WHERE name = 'Jean-Luc Brunel';

-- TIER 2: CLOSE ASSOCIATES
-- Prince Andrew - Official Royal Photo (Public appearances)
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Prince_Andrew_August_2014_%28cropped%29.jpg/440px-Prince_Andrew_August_2014_%28cropped%29.jpg'
WHERE name = 'Prince Andrew';

-- Les Wexner - Corporate Photo
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Les_Wexner.jpg/440px-Les_Wexner.jpg'
WHERE name = 'Les Wexner';

-- Alan Dershowitz - Public appearance
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Alan_Dershowitz_2009.jpg/440px-Alan_Dershowitz_2009.jpg'
WHERE name = 'Alan Dershowitz';

-- TIER 3: CONNECTED
-- Bill Clinton - Official Presidential
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Bill_Clinton.jpg/440px-Bill_Clinton.jpg'
WHERE name = 'Bill Clinton';

-- Donald Trump - Official Presidential
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg'
WHERE name = 'Donald Trump';

-- Bill Gates - Public Photo
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bill_Gates_2017_%28cropped%29.jpg/440px-Bill_Gates_2017_%28cropped%29.jpg'
WHERE name = 'Bill Gates';

-- Kevin Spacey - Public appearance
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Kevin_Spacey%2C_May_2013.jpg/440px-Kevin_Spacey%2C_May_2013.jpg'
WHERE name = 'Kevin Spacey';

-- TIER 4: PERIPHERAL
-- Leonardo DiCaprio
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Leonardo_Dicaprio_Cannes_2019.jpg/440px-Leonardo_Dicaprio_Cannes_2019.jpg'
WHERE name = 'Leonardo DiCaprio';

-- Stephen Hawking
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Stephen_Hawking.StarChild.jpg/440px-Stephen_Hawking.StarChild.jpg'
WHERE name = 'Stephen Hawking';

-- Michael Jackson
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Michael_Jackson_in_1988.jpg/440px-Michael_Jackson_in_1988.jpg'
WHERE name = 'Michael Jackson';

-- Naomi Campbell
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Naomi_Campbell_Cannes_2017.jpg/440px-Naomi_Campbell_Cannes_2017.jpg'
WHERE name = 'Naomi Campbell';

-- Elon Musk
UPDATE nodes
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/440px-Elon_Musk_Royal_Society_%28crop2%29.jpg'
WHERE name = 'Elon Musk';

-- ============================================
-- VERIFY UPDATES
-- ============================================
SELECT name, tier, image_url
FROM nodes
WHERE image_url IS NOT NULL
ORDER BY tier ASC;

-- ============================================
-- DONE! Fotoğraflar güncellendi.
-- ============================================
