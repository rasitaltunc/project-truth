-- ============================================================================
-- FIX: UNIQUE constraint düzelt + tüm eski veriyi temizle + yeni seed
-- ============================================================================

-- 1. Tüm eski timeline verilerini temizle
TRUNCATE link_evidence_timeline;

-- 2. Eski UNIQUE constraint kaldır (link_id + evidence_id çakışması)
ALTER TABLE link_evidence_timeline DROP CONSTRAINT IF EXISTS link_evidence_timeline_link_id_evidence_id_key;

-- 3. Yeni UNIQUE constraint: sadece evidence_id NULL değilse uygula
-- NULL evidence_id olan satırlar artık çakışmaz
CREATE UNIQUE INDEX IF NOT EXISTS idx_let_unique_link_evidence
    ON link_evidence_timeline(link_id, evidence_id)
    WHERE evidence_id IS NOT NULL;

-- ============================================================================
-- EPSTEIN ↔ MAXWELL (10 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1991-01-01'::timestamptz, 'year', 'bidirectional', 1.5,
  'İlk Tanışma — Londra Sosyete Çevresi',
  'Maxwell, babası Robert Maxwell''ın ölümünden sonra Epstein ile tanıştı. İkili hızla yakınlaştı.',
  false, 3
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1994-06-01'::timestamptz, 'month', 'bidirectional', 2.0,
  'Kurban Ağı Kuruluyor',
  'Maxwell, genç kızları Epstein''e yönlendirmeye başladı. Palm Beach ve New York merkezli operasyon.',
  true, 12
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2005-03-01'::timestamptz, 'month', 'bidirectional', 2.2,
  'Palm Beach Polis Soruşturması',
  'Palm Beach polisi soruşturma başlattı. Maxwell''ın rolü ifadelerde ortaya çıktı.',
  false, 8
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2008-06-30'::timestamptz, 'day', 'bidirectional', 2.5,
  'NPA Anlaşması — Tartışmalı Muafiyet',
  'Savcı Acosta ile gizli anlaşma. Epstein ve ortakları federal suçlamalardan kurtuldu.',
  true, 18
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2015-01-01'::timestamptz, 'year', 'source_to_target', 1.8,
  'Maxwell Fransa''ya Kaçışı',
  'Maxwell, artan baskılar sonucu Paris''e yerleşti. Epstein ile uzaktan iletişim devam etti.',
  false, 5
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2018-11-28'::timestamptz, 'day', 'bidirectional', 2.0,
  'Miami Herald Soruşturması Yayınlandı',
  'Julie K. Brown''un "Perversion of Justice" araştırması. NPA skandalı gün yüzüne çıktı.',
  false, 10
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2019-07-08'::timestamptz, 'day', 'bidirectional', 3.0,
  'Federal İddianame — SDNY',
  'Southern District of New York iddianamesi. Epstein seks ticareti ve komplo ile suçlandı.',
  true, 25
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2019-08-10'::timestamptz, 'day', 'source_to_target', 3.0,
  'Epstein''in Ölümü — MCC',
  'Metropolitan Correctional Center''da ölü bulundu. Resmi: intihar. Koşullar tartışmalı.',
  true, 30
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2020-07-02'::timestamptz, 'day', 'target_to_source', 2.8,
  'Maxwell Tutuklandı — New Hampshire',
  'FBI operasyonuyla yakalandı. Seks ticareti, komplo ve yalan yere yemin etme suçlamaları.',
  true, 20
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2021-12-29'::timestamptz, 'day', 'target_to_source', 3.0,
  'Maxwell Mahkum Edildi — 20 Yıl',
  'Jüri 5 suçlamadan mahkum etti. 20 yıl hapis cezası.',
  true, 22
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name = 'Jeffrey Epstein' AND t.name = 'Ghislaine Maxwell')
   OR (s.name = 'Ghislaine Maxwell' AND t.name = 'Jeffrey Epstein')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ PRINCE ANDREW (5 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1999-01-01'::timestamptz, 'year', 'bidirectional', 1.2,
  'Sosyal Çevre Tanışması',
  'Maxwell aracılığıyla tanıştılar. Londra ve New York sosyete etkinliklerinde görüldüler.',
  false, 4
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Prince Andrew%')
   OR (s.name ILIKE '%Prince Andrew%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2001-03-01'::timestamptz, 'month', 'bidirectional', 2.5,
  'Tartışmalı Fotoğraf — Londra',
  'Maxwell''ın Londra evinde çekilen fotoğraf. Andrew''un Giuffre''nin belinden tuttuğu görülüyor.',
  true, 28
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Prince Andrew%')
   OR (s.name ILIKE '%Prince Andrew%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2010-12-01'::timestamptz, 'month', 'bidirectional', 2.0,
  'Central Park Buluşması',
  'Epstein serbest bırakıldıktan sonra Central Park''ta birlikte görüntülendi. Büyük tepki çekti.',
  false, 15
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Prince Andrew%')
   OR (s.name ILIKE '%Prince Andrew%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2019-11-16'::timestamptz, 'day', 'target_to_source', 2.8,
  'BBC Newsnight Röportajı',
  'Andrew''un savunması: "Pizza Express", "terleme bozukluğu". Kamuoyu nezdinde büyük hasar.',
  true, 20
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Prince Andrew%')
   OR (s.name ILIKE '%Prince Andrew%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2022-02-15'::timestamptz, 'day', 'target_to_source', 2.5,
  'Giuffre Davası Uzlaşması',
  'Virginia Giuffre ile şartları açıklanmayan uzlaşma. Andrew kraliyet görevlerinden çekildi.',
  true, 16
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Prince Andrew%')
   OR (s.name ILIKE '%Prince Andrew%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ VIRGINIA GIUFFRE (3 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2000-01-01'::timestamptz, 'year', 'source_to_target', 2.0,
  'İlk Temas — Mar-a-Lago',
  'Giuffre 16 yaşındayken Maxwell tarafından Mar-a-Lago''da işe alındı. Masaj terapisti olarak.',
  true, 20
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND (t.name ILIKE '%Virginia%Giuffre%' OR t.name ILIKE '%Virginia%Roberts%'))
   OR ((s.name ILIKE '%Virginia%Giuffre%' OR s.name ILIKE '%Virginia%Roberts%') AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2001-03-01'::timestamptz, 'month', 'source_to_target', 2.5,
  'Uluslararası Seyahatler',
  'Giuffre, Epstein ile Londra, Paris, USVI ve New Mexico''ya seyahat etti. Andrew ile tanıştırıldı.',
  true, 22
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND (t.name ILIKE '%Virginia%Giuffre%' OR t.name ILIKE '%Virginia%Roberts%'))
   OR ((s.name ILIKE '%Virginia%Giuffre%' OR s.name ILIKE '%Virginia%Roberts%') AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2015-01-01'::timestamptz, 'year', 'target_to_source', 2.8,
  'Federal Dava Açıldı',
  'Giuffre, Maxwell''a karşı sivil dava açtı. Binlerce sayfa belge kamuoyuyla paylaşıldı.',
  true, 18
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND (t.name ILIKE '%Virginia%Giuffre%' OR t.name ILIKE '%Virginia%Roberts%'))
   OR ((s.name ILIKE '%Virginia%Giuffre%' OR s.name ILIKE '%Virginia%Roberts%') AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ DERSHOWITZ (2 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1997-01-01'::timestamptz, 'year', 'target_to_source', 1.5,
  'Hukuki Danışmanlık Başlangıcı',
  'Harvard hukuk profesörü Dershowitz, Epstein''in hukuki danışmanı oldu.',
  false, 5
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Dershowitz%')
   OR (s.name ILIKE '%Dershowitz%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2008-06-30'::timestamptz, 'day', 'target_to_source', 2.8,
  'NPA Anlaşması Savunması',
  'Dershowitz, Epstein''in NPA anlaşmasında kilit savunma avukatıydı. Federal suçlamalardan muafiyet.',
  true, 15
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Dershowitz%')
   OR (s.name ILIKE '%Dershowitz%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ LES WEXNER (3 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1991-01-01'::timestamptz, 'year', 'target_to_source', 2.5,
  'Vekalet Yetkisi Devri',
  'L Brands CEO''su Wexner, Epstein''e mali konularda tam vekalet yetkisi verdi.',
  true, 16
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Wexner%')
   OR (s.name ILIKE '%Wexner%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1996-01-01'::timestamptz, 'year', 'target_to_source', 2.2,
  'Manhattan Malikanesi Devri',
  'Wexner, 9 East 71st Street Manhattan malikanesini Epstein''e devretti. Değer: ~$77M.',
  true, 14
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Wexner%')
   OR (s.name ILIKE '%Wexner%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2019-07-25'::timestamptz, 'day', 'bidirectional', 2.0,
  'New York Times Araştırması',
  'NYT, Wexner-Epstein mali ilişkisini detaylı araştırdı. Victoria''s Secret bağlantısı ortaya çıktı.',
  false, 10
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Wexner%')
   OR (s.name ILIKE '%Wexner%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ JEAN-LUC BRUNEL (3 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1989-01-01'::timestamptz, 'year', 'bidirectional', 1.8,
  'Mankenlik Ajansı Ortaklığı',
  'Brunel''in MC2 Model Management ajansı. Genç mankenleri Epstein''e yönlendirdiği iddia edildi.',
  false, 8
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Brunel%')
   OR (s.name ILIKE '%Brunel%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2020-12-16'::timestamptz, 'day', 'target_to_source', 2.8,
  'Paris''te Tutuklanma',
  'CDG Havalimanı''nda yakalandı. Minör tecavüzü ve seks ticareti suçlamaları.',
  true, 18
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Brunel%')
   OR (s.name ILIKE '%Brunel%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2022-02-19'::timestamptz, 'day', 'target_to_source', 3.0,
  'Cezaevinde Ölüm',
  'La Santé Cezaevi''nde ölü bulundu. Resmi neden: intihar. Epstein''in ölümüyle paralellik.',
  true, 25
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Brunel%')
   OR (s.name ILIKE '%Brunel%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- EPSTEIN ↔ DEUTSCHE BANK (3 kayıt)
-- ============================================================================
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '1998-01-01'::timestamptz, 'year', 'bidirectional', 1.5,
  'Hesap Açılışı',
  'Deutsche Bank ile mali ilişki başladı. Özel bankacılık hizmetleri.',
  false, 4
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Deutsche%')
   OR (s.name ILIKE '%Deutsche%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2013-01-01'::timestamptz, 'year', 'source_to_target', 2.2,
  'Şüpheli Transferler — $2.7M',
  'Deutsche Bank üzerinden şüpheli para transferleri tespit edildi. İç denetim raporu.',
  true, 12
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Deutsche%')
   OR (s.name ILIKE '%Deutsche%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, date_precision, direction, visual_weight, display_label, display_summary, is_keystone, community_votes)
SELECT l.id, NULL, '2020-07-07'::timestamptz, 'day', 'target_to_source', 2.8,
  'Deutsche Bank $150M Ceza',
  'NY DFS, Deutsche Bank''a Epstein ilişkisi nedeniyle $150M ceza kesti.',
  true, 20
FROM links l
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
WHERE (s.name ILIKE '%Epstein%' AND t.name ILIKE '%Deutsche%')
   OR (s.name ILIKE '%Deutsche%' AND t.name ILIKE '%Epstein%')
LIMIT 1;

-- ============================================================================
-- links.evidence_count güncelle
-- ============================================================================
UPDATE links SET evidence_count = sub.cnt
FROM (
    SELECT link_id, COUNT(*) as cnt
    FROM link_evidence_timeline
    GROUP BY link_id
) sub
WHERE links.id = sub.link_id;

-- ============================================================================
-- DOĞRULAMA: Sonucu kontrol et
-- ============================================================================
SELECT
    s.name as source_node, t.name as target_node,
    COUNT(let.id) as timeline_entries,
    COUNT(CASE WHEN let.is_keystone THEN 1 END) as keystones,
    MIN(let.event_date)::date as earliest,
    MAX(let.event_date)::date as latest
FROM link_evidence_timeline let
JOIN links l ON let.link_id = l.id
JOIN nodes s ON l.source_id = s.id
JOIN nodes t ON l.target_id = t.id
GROUP BY s.name, t.name
ORDER BY timeline_entries DESC;
