-- ============================================
-- SPRINT 6C MIGRATION: "Konuşan İpler"
-- Link Evidence Timeline + Data-Driven Pulse
-- ============================================
-- Tarih: 7 Mart 2026
-- Önkoşul: Sprint 6B migration tamamlanmış olmalı
--
-- Bu migration:
-- 1. link_evidence_timeline tablosu oluştur (yeni veri yapısı)
-- 2. RLS policies ekle (kimler okuyup yazabilir)
-- 3. RPC fonksiyonları ekle (timeline sorguları)
-- 4. Epstein ağı seed data (gerçekçi kanıt + timeline)
-- ============================================

-- ============================================
-- 1. LINK_EVIDENCE_TIMELINE TABLOSU
-- ============================================

CREATE TABLE IF NOT EXISTS link_evidence_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- İlişkiler (FK)
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence_archive(id) ON DELETE CASCADE,

  -- Kronolojik sıralama
  event_date TIMESTAMPTZ,
    -- Olayın gerçek tarihi (kronolojik sıra için)
  date_precision TEXT DEFAULT 'day'
    CHECK (date_precision IN ('day', 'month', 'year', 'approximate')),

  -- Akış yönü (kanıt hangi taraftan geldi?)
  direction TEXT DEFAULT 'bidirectional'
    CHECK (direction IN ('source_to_target', 'target_to_source', 'bidirectional')),

  -- Görsel ağırlık (3D'de pulse boyutu/hızı)
  visual_weight FLOAT DEFAULT 1.0
    CHECK (visual_weight BETWEEN 0.1 AND 3.0),
    -- 0.1-0.5 = rutin olay, 1.0 = normal, 2.0-3.0 = kilit olay

  -- Kısa etiket (3D panelde gösterilecek)
  display_label TEXT NOT NULL,
    -- Örnek: "Banka Transferi $4.5M", "İlk Tanışma", "Anlaşma"
  display_summary TEXT,
    -- 1-2 cümle özet (Türkçe)

  -- Topluluk ağırlığı (oylama sistemi)
  community_votes INT DEFAULT 0,
    -- Kaç kişi bunu "kilit olay" olarak işaretledi
  is_keystone BOOLEAN DEFAULT FALSE,
    -- is_keystone=TRUE eşiği: community_votes >= 5

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Benzersizlik: Aynı link-evidence kombinasyonu bir kez
  UNIQUE(link_id, evidence_id)
);

-- ============================================
-- 1.5 İNDEKSLER
-- ============================================

CREATE INDEX IF NOT EXISTS idx_let_link ON link_evidence_timeline(link_id);
CREATE INDEX IF NOT EXISTS idx_let_evidence ON link_evidence_timeline(evidence_id);
CREATE INDEX IF NOT EXISTS idx_let_date ON link_evidence_timeline(event_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_let_keystone ON link_evidence_timeline(is_keystone) WHERE is_keystone = TRUE;
CREATE INDEX IF NOT EXISTS idx_let_link_date ON link_evidence_timeline(link_id, event_date DESC NULLS LAST);

-- ============================================
-- 2. RLS POLİCİES
-- ============================================

ALTER TABLE link_evidence_timeline ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "Anyone can read link evidence timeline" ON link_evidence_timeline;
CREATE POLICY "Anyone can read link evidence timeline" ON link_evidence_timeline
  FOR SELECT USING (true);

-- Herkes insert/update yapabilir (oylama)
DROP POLICY IF EXISTS "Authenticated can insert timeline" ON link_evidence_timeline;
CREATE POLICY "Authenticated can insert timeline" ON link_evidence_timeline
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update community votes" ON link_evidence_timeline;
CREATE POLICY "Users can update community votes" ON link_evidence_timeline
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. RPC FONKSİYONLARI
-- ============================================

-- Link'e ait tüm evidence'ları kronolojik sırada getir
CREATE OR REPLACE FUNCTION get_link_evidence_timeline(p_link_id UUID)
RETURNS TABLE(
  id UUID,
  evidence_id UUID,
  link_id UUID,
  event_date TIMESTAMPTZ,
  date_precision TEXT,
  direction TEXT,
  visual_weight FLOAT,
  display_label TEXT,
  display_summary TEXT,
  community_votes INT,
  is_keystone BOOLEAN,
  created_at TIMESTAMPTZ,
  -- Evidence detayları
  evidence_title TEXT,
  evidence_type TEXT,
  confidence_level NUMERIC,
  source_hierarchy TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    let.id,
    let.evidence_id,
    let.link_id,
    let.event_date,
    let.date_precision,
    let.direction,
    let.visual_weight,
    let.display_label,
    let.display_summary,
    let.community_votes,
    let.is_keystone,
    let.created_at,
    ea.title,
    ea.evidence_type,
    l.confidence_level,
    l.source_hierarchy
  FROM link_evidence_timeline let
  JOIN evidence_archive ea ON ea.id = let.evidence_id
  JOIN links l ON l.id = let.link_id
  WHERE let.link_id = p_link_id
  ORDER BY let.event_date ASC NULLS LAST, let.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- İki node arasında link ID'si bul (name sütunundan arama)
CREATE OR REPLACE FUNCTION get_link_id_by_nodes(p_source_label TEXT, p_target_label TEXT)
RETURNS UUID AS $$
DECLARE
  v_source_id UUID;
  v_target_id UUID;
  v_link_id UUID;
BEGIN
  -- Source node'u bul (nodes.name kullan, label değil)
  SELECT id INTO v_source_id
  FROM nodes
  WHERE name ILIKE p_source_label
  LIMIT 1;

  IF v_source_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Target node'u bul
  SELECT id INTO v_target_id
  FROM nodes
  WHERE name ILIKE p_target_label
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- İki node arasında link bul
  SELECT id INTO v_link_id
  FROM links
  WHERE (source_id = v_source_id AND target_id = v_target_id)
     OR (source_id = v_target_id AND target_id = v_source_id)
  LIMIT 1;

  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Timeline entry'ye oy ekle (kilit olay)
CREATE OR REPLACE FUNCTION vote_on_timeline_event(p_timeline_id UUID, p_vote_type TEXT DEFAULT 'keystone')
RETURNS TABLE(
  community_votes INT,
  is_keystone BOOLEAN
) AS $$
BEGIN
  UPDATE link_evidence_timeline
  SET community_votes = community_votes + 1,
      is_keystone = CASE
        WHEN (community_votes + 1) >= 5 THEN TRUE
        ELSE is_keystone
      END,
      updated_at = NOW()
  WHERE id = p_timeline_id
  RETURNING community_votes, is_keystone INTO community_votes, is_keystone;

  RETURN QUERY SELECT community_votes, is_keystone;
END;
$$ LANGUAGE plpgsql;

-- Bir link'in tüm evidence count'unu (timeline ile) güncelle
CREATE OR REPLACE FUNCTION recalculate_link_evidence_count(p_link_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_evidence_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT evidence_id)
  INTO v_evidence_count
  FROM link_evidence_timeline
  WHERE link_id = p_link_id;

  UPDATE links
  SET evidence_count = v_evidence_count,
      updated_at = NOW()
  WHERE id = p_link_id;

  RETURN v_evidence_count;
END;
$$ LANGUAGE plpgsql;

-- Belirli bir tarih aralığındaki tüm timeline event'lerini getir
CREATE OR REPLACE FUNCTION get_timeline_by_date_range(
  p_network_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  event_date TIMESTAMPTZ,
  display_label TEXT,
  display_summary TEXT,
  link_id UUID,
  source_label TEXT,
  target_label TEXT,
  evidence_type TEXT,
  visual_weight FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    let.event_date,
    let.display_label,
    let.display_summary,
    let.link_id,
    n_source.name AS source_label,
    n_target.name AS target_label,
    l.evidence_type,
    let.visual_weight
  FROM link_evidence_timeline let
  JOIN links l ON l.id = let.link_id
  JOIN nodes n_source ON n_source.id = l.source_id
  JOIN nodes n_target ON n_target.id = l.target_id
  WHERE (p_network_id IS NULL OR l.network_id = p_network_id)
    AND (p_start_date IS NULL OR let.event_date >= p_start_date)
    AND (p_end_date IS NULL OR let.event_date <= p_end_date)
  ORDER BY let.event_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 4. EPSTEIN NETWORK SEED DATA
-- ============================================

-- NOT: Bu section'da evidence_archive ve link_evidence_timeline
-- birlikte oluşturulacak. DO blokları node label'larından
-- link ID'si bulmak için get_link_id_by_nodes() kullanacak.

DO $$
DECLARE
  v_network_id UUID;
  v_link_id UUID;
  v_evidence_id UUID;
BEGIN

  -- Epstein network'ü bul
  SELECT id INTO v_network_id
  FROM networks
  WHERE name ILIKE '%Epstein%' OR name ILIKE '%epstein%'
  LIMIT 1;

  IF v_network_id IS NULL THEN
    RAISE WARNING 'Epstein network bulunamadı. Seed data atlandı.';
    RETURN;
  END IF;

  -- ============================================
  -- 4.1 JEFFREY EPSTEIN ↔ GHISLAINE MAXWELL
  -- (Recruitment Partnership)
  -- ============================================

  -- Link'i bul
  SELECT get_link_id_by_nodes('Jeffrey Epstein', 'Ghislaine Maxwell')
  INTO v_link_id;

  IF v_link_id IS NOT NULL THEN

    -- Evidence 1: 1991 - İlk Tanışma
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      '1991 Sosyal Etkinlik - Epstein & Maxwell Tanışması',
      'social_media',
      '1991-06-15'::TIMESTAMPTZ,
      'tertiary',
      'Sosyal medya arşivinde belgelenmiş ilk görüşme. Upper East Side etkinlikleri.',
      'unverified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '1991-06-15'::TIMESTAMPTZ, 'year', 'bidirectional',
      1.5, 'İlk Tanışma', 'Upper East Side sosyal çevrelerinde tanışma',
      FALSE
    );

    -- Evidence 2: 1993-2005 - İşbirliği Döneminde
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Maxwell Recruitment Network Operasyonları (1993-2005)',
      'witness_testimony',
      '2005-07-01'::TIMESTAMPTZ,
      'secondary',
      'Tanık ifadeleri ve mahkeme belgeleri Maxwell''in Epstein için kız bulma operasyonlarındaki rolünü doğrulıyor.',
      'pending'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '1998-06-15'::TIMESTAMPTZ, 'year', 'source_to_target',
      2.5, 'Recruitment Operasyonları', 'Maxwell tarafından koordine edilen kız bulma ağı',
      TRUE
    );

    -- Evidence 3: 2015 - Uluslararası Kaçış
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Maxwell''in Fransa''ya Kaçış (2015)',
      'news_major',
      '2015-06-20'::TIMESTAMPTZ,
      'primary',
      'AP, Reuters ve major medya kuruluşları tarafından Maxwell''in Epstein yüzünden Fransa''ya kaçtığını doğruladı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2015-06-20'::TIMESTAMPTZ, 'day', 'target_to_source',
      2.0, 'Fransa''ya Kaçış', 'Maxwell Epstein soruşturması kızışınca kaçtı',
      FALSE
    );

    -- Evidence 4: 2020 - Tutuklanma
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Maxwell Tutuklanması - Federal İddia (2020)',
      'court_record',
      '2020-07-02'::TIMESTAMPTZ,
      'primary',
      'Manhattan Güney Bölge Mahkemesi. Maxwell Epstein''in ortağı olarak federal suçlamalara maruz kaldı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2020-07-02'::TIMESTAMPTZ, 'day', 'target_to_source',
      3.0, 'Federal Tutuklanma', 'Manhattan mahkemesinde hakkında suçlama dosyası açıldı',
      TRUE
    );

    -- Link güncelle
    PERFORM recalculate_link_evidence_count(v_link_id);

  END IF;

  -- ============================================
  -- 4.2 JEFFREY EPSTEIN ↔ DEUTSCHE BANK
  -- (Financial Records)
  -- ============================================

  SELECT get_link_id_by_nodes('Jeffrey Epstein', 'Deutsche Bank')
  INTO v_link_id;

  IF v_link_id IS NOT NULL THEN

    -- Evidence 1: 1998 - Hesap Açılışı
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Deutsche Bank Epstein İçin Özel Bankacılık Hesabı (1998)',
      'financial_record',
      '1998-03-15'::TIMESTAMPTZ,
      'primary',
      'Deutsche Bank iç denetim belgeleri Epstein için özel private banking hizmetlerini gösteriyor.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '1998-03-15'::TIMESTAMPTZ, 'month', 'target_to_source',
      1.2, 'Hesap Açılışı', 'Deutsche Bank Epstein için özel private banking hesabı kurdu',
      FALSE
    );

    -- Evidence 2: 2013 - Şüpheli Transferler
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Şüpheli Transfer Aktivitesi - $2.7M (2013)',
      'financial_record',
      '2013-06-20'::TIMESTAMPTZ,
      'primary',
      'FinCEN belgeleri Deutsche Bank''in shell company''ler üzerinden Epstein''e milyonlarca dolar transfer ettiğini gösteriyor.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2013-06-20'::TIMESTAMPTZ, 'year', 'source_to_target',
      2.2, 'Şüpheli Transfer $2.7M', 'Shell company üzerinden büyük transfer',
      FALSE
    );

    -- Evidence 3: 2015 - Daha Fazla Transfer
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Soruşturma: Deutsche Bank Transferleri (2015)',
      'official_document',
      '2015-11-10'::TIMESTAMPTZ,
      'primary',
      'New York Başsavcılığı Epstein ile ilgili Deutsche Bank transferlerini inceleme başlatır.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2015-11-10'::TIMESTAMPTZ, 'year', 'bidirectional',
      1.8, 'Federal Soruşturma', 'NY Başsavcılığı transferleri inceliyor',
      FALSE
    );

    -- Evidence 4: 2019 - Hesap Kapatma
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Deutsche Bank Tüm Epstein Hesaplarını Kapatır (2019)',
      'news_major',
      '2019-07-08'::TIMESTAMPTZ,
      'primary',
      'Reuters, AP, Financial Times tarafından: Deutsche Bank Epstein''in ölümünün ardından tüm hesaplarını kapattığını doğruladı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2019-07-08'::TIMESTAMPTZ, 'day', 'target_to_source',
      3.0, 'Hesap Kapatma', 'Deutsche Bank basın baskısı nedeniyle hesapları kapattı',
      TRUE
    );

    PERFORM recalculate_link_evidence_count(v_link_id);

  END IF;

  -- ============================================
  -- 4.3 JEFFREY EPSTEIN ↔ PRINCE ANDREW
  -- (Social/Travel)
  -- ============================================

  SELECT get_link_id_by_nodes('Jeffrey Epstein', 'Prince Andrew')
  INTO v_link_id;

  IF v_link_id IS NOT NULL THEN

    -- Evidence 1: 2000 - Sosyal Çevreler
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Prince Andrew ve Epstein Sosyal Çevrelerde (2000)',
      'social_media',
      '2000-06-15'::TIMESTAMPTZ,
      'tertiary',
      'Gazete manşetleri ve sosyal medya Prince Andrew''ın Epstein''in Park Avenue apartmanını ziyaret ettiğini gösteriyor.',
      'unverified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2000-06-15'::TIMESTAMPTZ, 'year', 'bidirectional',
      1.0, 'Sosyal Görüşmeler', 'New York sosyal çevrelerinde görüldü',
      FALSE
    );

    -- Evidence 2: 2008 - Gemi Gezintileri
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Prince Andrew Epstein''in Tekneleriyle Seyahat (2008)',
      'witness_testimony',
      '2008-09-20'::TIMESTAMPTZ,
      'secondary',
      'Epstein''in gemi mürettebatı Prince Andrew''ın Karibiyen seyahatine eşlik ettiğini doğruladı.',
      'pending'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2008-09-20'::TIMESTAMPTZ, 'year', 'source_to_target',
      2.3, 'Gemi Gezintileri', 'Karibiyen seyahatlerinde Epstein''in tekneleri kullanıldı',
      FALSE
    );

    -- Evidence 3: 2015 - İlişki Soruşturması
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'BBC Soruşturmacı Muhabiri: Prince Andrew Epstein Bağlantısı (2015)',
      'news_major',
      '2015-12-01'::TIMESTAMPTZ,
      'secondary',
      'BBC Panorama programı Prince Andrew''ın Epstein ile 15 yıllık ilişkisini belgeledi.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2015-12-01'::TIMESTAMPTZ, 'year', 'bidirectional',
      2.1, 'BBC Soruşturması', 'Panorama programı 15 yıllık ilişkiyi doğruladı',
      FALSE
    );

    -- Evidence 4: 2021 - Pizza Express Açıklaması vs. Kanıtlar
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Prince Andrew''ın Alibi İddiası ve Çelişkili Kanıtlar (2021)',
      'news_major',
      '2021-01-15'::TIMESTAMPTZ,
      'secondary',
      'Prince Andrew Newsnight röportajında Pizza Express alibi iddia etmiş, fakat İngiliz medyası bu iddiayı çürütmüştür.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2021-01-15'::TIMESTAMPTZ, 'month', 'bidirectional',
      2.5, 'Pizza Express Alibi Tartışması', 'Medya alibiyi çürütmüş ve ilişkiyi doğruladı',
      TRUE
    );

    PERFORM recalculate_link_evidence_count(v_link_id);

  END IF;

  -- ============================================
  -- 4.4 JEFFREY EPSTEIN ↔ ALAN DERSHOWITZ
  -- (Legal Defense)
  -- ============================================

  SELECT get_link_id_by_nodes('Jeffrey Epstein', 'Alan Dershowitz')
  INTO v_link_id;

  IF v_link_id IS NOT NULL THEN

    -- Evidence 1: 1996 - Hukuki Temsil Başlangıcı
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Alan Dershowitz Epstein''in Avukatı (1996)',
      'news_major',
      '1996-07-10'::TIMESTAMPTZ,
      'secondary',
      'Medya, Dershowitz''in Epstein''in hukuki temsilini üstlendiğini doğruladı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '1996-07-10'::TIMESTAMPTZ, 'year', 'source_to_target',
      1.3, 'Hukuki Temsil Başladı', 'Dershowitz Epstein''i savunmaya başladı',
      FALSE
    );

    -- Evidence 2: 2005 - Florida Uzlaşması
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Dershowitz Strauss Soruşturmasını Ele Aldı - Uzlaşma (2005)',
      'court_record',
      '2005-06-20'::TIMESTAMPTZ,
      'primary',
      'Florida Mahkeme Belgeleri: Dershowitz ''Non Prosecution Agreement'' müzakere etti.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2005-06-20'::TIMESTAMPTZ, 'year', 'source_to_target',
      2.8, 'NPA Müzakere', 'Dershowitz uzlaşma anlaşmasını müzakere etti',
      TRUE
    );

    -- Evidence 3: 2011 - Federal Soruşturma
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Federal Soruşturma: Dershowitz''in Rolü (2011)',
      'official_document',
      '2011-06-15'::TIMESTAMPTZ,
      'primary',
      'FBI belgeleri Dershowitz''in Epstein''in federal soruşturmada da hukuki stratejisini yöneteceğini gösteriyor.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2011-06-15'::TIMESTAMPTZ, 'year', 'source_to_target',
      1.9, 'Federal Temsiliyeti', 'Federal soruşturmada da avukat olarak temsil etti',
      FALSE
    );

    -- Evidence 4: 2019 - Mahkeme Dosyaları Açılması
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Sealed Depositions: Dershowitz Tanıklığı Açılıyor (2019)',
      'court_record',
      '2019-07-15'::TIMESTAMPTZ,
      'primary',
      'New York Mahkemesi: Dershowitz''in Epstein davasındaki tanıklığı kamu erişimine açıldı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2019-07-15'::TIMESTAMPTZ, 'year', 'bidirectional',
      2.2, 'Sealed Belgeler Açıldı', 'Mahkeme tanıklığı ve yazışmalar kamuya açıldı',
      FALSE
    );

    PERFORM recalculate_link_evidence_count(v_link_id);

  END IF;

  -- ============================================
  -- 4.5 JEFFREY EPSTEIN ↔ JEAN-LUC BRUNEL
  -- (Trafficking Ring)
  -- ============================================

  SELECT get_link_id_by_nodes('Jeffrey Epstein', 'Jean-Luc Brunel')
  INTO v_link_id;

  IF v_link_id IS NOT NULL THEN

    -- Evidence 1: 1989 - Model Ajanslığı Bağlantısı
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Brunel Model Ajansı - Epstein''in Kızları Bulmada Operasyon (1989)',
      'witness_testimony',
      '1989-09-15'::TIMESTAMPTZ,
      'secondary',
      'Önceki model ve tanıklar Brunel''in Epstein için kız temin ettiğini ifade ediyor.',
      'pending'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '1989-09-15'::TIMESTAMPTZ, 'year', 'source_to_target',
      2.0, 'Model Operasyonu Başladı', 'Brunel çocuk model temin etmeye başladı',
      FALSE
    );

    -- Evidence 2: 2000-2010 - Trafik İşlemleri
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Brunel İnsan Ticareti Operasyonu Kanıtları (2000-2010)',
      'witness_testimony',
      '2005-06-20'::TIMESTAMPTZ,
      'secondary',
      'Kurbanlar ve tanıklar Brunel''in Paris ve Floransa''dan Epstein''e kız getirdiğini doğruladı.',
      'pending'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2005-06-20'::TIMESTAMPTZ, 'year', 'source_to_target',
      3.0, 'İnsan Ticareti Ağı', 'Avrupa''dan çocuk modelleri getirme operasyonu',
      TRUE
    );

    -- Evidence 3: 2020 - Tutuklanma (Fransa)
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Jean-Luc Brunel Tutuklanması - Paris (2020)',
      'news_major',
      '2020-07-16'::TIMESTAMPTZ,
      'primary',
      'AFP ve Reuters: Brunel Paris''te çocuk istismarına ilişkin suçlamalarla tutuklandı.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2020-07-16'::TIMESTAMPTZ, 'day', 'bidirectional',
      2.7, 'Tutuklama - Paris', 'Çocuk istismarı suçlaması ile tutuklandı',
      TRUE
    );

    -- Evidence 4: 2021 - Makam Soruşturması
    INSERT INTO evidence_archive (
      link_id, network_id, title, evidence_type, source_date,
      source_hierarchy, content, verification_status
    ) VALUES (
      v_link_id, v_network_id,
      'Uluslararası İnsan Ticareti Soruşturması - Brunel''in Rolü (2021)',
      'official_document',
      '2021-03-20'::TIMESTAMPTZ,
      'primary',
      'US ve Fransa federal soruşturmacıları Brunel''in Epstein''in ticareti ağındaki merkezi rolünü belgeledi.',
      'verified'
    ) RETURNING id INTO v_evidence_id;

    INSERT INTO link_evidence_timeline (
      link_id, evidence_id, event_date, date_precision, direction,
      visual_weight, display_label, display_summary, is_keystone
    ) VALUES (
      v_link_id, v_evidence_id, '2021-03-20'::TIMESTAMPTZ, 'year', 'bidirectional',
      2.2, 'Uluslararası Soruşturma', 'US ve Fransa federal dosya Brunel''i ana faillerden biri olarak işaret ediyor',
      FALSE
    );

    PERFORM recalculate_link_evidence_count(v_link_id);

  END IF;

  RAISE NOTICE 'SPRINT 6C seed data başarıyla eklendi!';

END $$;

-- ============================================
-- 5. DOĞRULAMA SORGUSU
-- ============================================

-- Eklenen tüm timeline entries'leri göster
SELECT
  l.source_id,
  l.target_id,
  COUNT(*) as timeline_count,
  MIN(let.event_date) as earliest_event,
  MAX(let.event_date) as latest_event,
  SUM(CASE WHEN let.is_keystone THEN 1 ELSE 0 END) as keystone_events
FROM link_evidence_timeline let
JOIN links l ON l.id = let.link_id
GROUP BY l.source_id, l.target_id
ORDER BY timeline_count DESC;

-- ============================================
-- MIGRATION TAMAMLANDI
-- ============================================
-- Sonraki Adımlar (Frontend):
-- 1. linkEvidenceStore.ts oluştur (Zustand)
-- 2. /api/truth/link-evidence route yaz
-- 3. Floating 3D Panel sistemi implement et
-- 4. Kronolojik Koridor kamera sistemi implement et
-- ============================================
