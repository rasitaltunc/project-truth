-- ============================================
-- ONLY IMAGE UPDATES - Run this in Supabase SQL Editor
-- ============================================

-- Jeffrey Epstein - Mugshot (Public Domain - Law Enforcement)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Jeffrey_Epstein_mugshot.jpg/220px-Jeffrey_Epstein_mugshot.jpg'
WHERE name = 'Jeffrey Epstein';

-- Ghislaine Maxwell - Mugshot (Public Domain - Law Enforcement)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Ghislaine_Maxwell_mugshot.jpg/220px-Ghislaine_Maxwell_mugshot.jpg'
WHERE name = 'Ghislaine Maxwell';

-- Prince Andrew - Official Royal Photo (CC Licensed)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Prince_Andrew_August_2014_%28cropped%29.jpg/220px-Prince_Andrew_August_2014_%28cropped%29.jpg'
WHERE name = 'Prince Andrew';

-- Bill Clinton - Official Presidential Portrait (Public Domain)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Bill_Clinton.jpg/220px-Bill_Clinton.jpg'
WHERE name = 'Bill Clinton';

-- Donald Trump - Official Presidential Portrait (Public Domain)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/220px-Donald_Trump_official_portrait.jpg'
WHERE name = 'Donald Trump';

-- Alan Dershowitz - CC Licensed photo
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Alan_Dershowitz_2009.jpg/220px-Alan_Dershowitz_2009.jpg'
WHERE name = 'Alan Dershowitz';

-- Jean-Luc Brunel - News photo (will try to find)
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Jean-Luc_Brunel.jpg/220px-Jean-Luc_Brunel.jpg'
WHERE name = 'Jean-Luc Brunel';

-- Les Wexner - Business photo
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Les_Wexner.jpg/220px-Les_Wexner.jpg'
WHERE name = 'Les Wexner';

-- Sarah Kellen - Mugshot (if available) or placeholder
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/220px-No_image_available.svg.png'
WHERE name = 'Sarah Kellen';

-- Nadia Marcinkova
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/220px-No_image_available.svg.png'
WHERE name = 'Nadia Marcinkova';

-- Lesley Groff
UPDATE nodes SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/220px-No_image_available.svg.png'
WHERE name = 'Lesley Groff';

-- Verify updates
SELECT name, image_url FROM nodes ORDER BY tier, risk DESC;
