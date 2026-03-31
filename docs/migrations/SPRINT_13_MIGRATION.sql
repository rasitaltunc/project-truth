-- ═══════════════════════════════════════════════════════
-- SPRINT 13: KOLEKTİF KALKAN PROTOKOLÜ
-- "Bir gazeteciyi susturduğun anda, belgeleri binlerce kişiye ulaşır."
-- ═══════════════════════════════════════════════════════

-- ─── 1. KOLEKTİF DMS ANA TABLOSU ───────────────────────
-- Her kolektif DMS kaydı: kim, ne yükledi, hangi kefiller, durum
CREATE TABLE IF NOT EXISTS collective_dms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Sahip (fingerprint-based, anonim uyumlu)
  owner_fingerprint TEXT NOT NULL,
  owner_display_name TEXT,

  -- Şifrelenmiş içerik (AES-256-GCM)
  encrypted_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,          -- SHA-256 bütünlük doğrulaması

  -- Shamir yapılandırması
  total_shards INTEGER NOT NULL DEFAULT 10,
  threshold INTEGER NOT NULL DEFAULT 6, -- M-of-N (6/10 varsayılan)

  -- Canlılık ayarları
  checkin_interval_hours INTEGER NOT NULL DEFAULT 168, -- 7 gün varsayılan
  last_checkin TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Kefil onayı
  required_guarantors INTEGER NOT NULL DEFAULT 3,
  approved_guarantors INTEGER NOT NULL DEFAULT 0,

  -- Durum
  status TEXT NOT NULL DEFAULT 'pending_guarantors'
    CHECK (status IN (
      'pending_guarantors',  -- Kefil onayı bekleniyor
      'active',              -- Aktif, check-in bekleniyor
      'silent_alarm',        -- Sessiz alarm (kefillere bildirim)
      'yellow_alarm',        -- Sarı alarm (geniş çevre)
      'red_alarm',           -- KIRMIZI ALARM — belgeler açıldı
      'paused',              -- Kullanıcı tarafından duraklatıldı
      'cancelled',           -- İptal edildi
      'recovered'            -- İçerik kurtarıldı (alarm sonrası)
    )),

  -- Coğrafi risk (RSF endeksi)
  country_code TEXT,                   -- ISO 3166-1 alpha-2
  risk_score INTEGER DEFAULT 50,       -- 0-100 (yüksek = tehlikeli)

  -- Meta
  name TEXT,                           -- "Soruşturma Dosyası: ..."
  description TEXT,
  network_id TEXT,                     -- Hangi Truth ağıyla ilişkili

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_at TIMESTAMPTZ,            -- Kırmızı alarm zamanı

  -- Alarm zaman çizelgesi
  silent_alarm_at TIMESTAMPTZ,
  yellow_alarm_at TIMESTAMPTZ,
  red_alarm_at TIMESTAMPTZ
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_cdms_owner ON collective_dms(owner_fingerprint);
CREATE INDEX IF NOT EXISTS idx_cdms_status ON collective_dms(status);
CREATE INDEX IF NOT EXISTS idx_cdms_checkin ON collective_dms(last_checkin) WHERE status = 'active';

-- ─── 2. SHARD DAĞITIMI ─────────────────────────────────
-- Shamir key parçalarının kime dağıtıldığı
CREATE TABLE IF NOT EXISTS collective_dms_shards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  collective_dms_id UUID NOT NULL REFERENCES collective_dms(id) ON DELETE CASCADE,

  -- Shard sahibi
  holder_fingerprint TEXT NOT NULL,
  holder_display_name TEXT,

  -- Shard verisi
  shard_x INTEGER NOT NULL,            -- Shamir x değeri (1-255)
  shard_data TEXT NOT NULL,            -- Hex encoded shard

  -- Rol
  is_guarantor BOOLEAN DEFAULT FALSE,  -- Bu kişi aynı zamanda kefil mi?
  guarantor_approved BOOLEAN DEFAULT FALSE, -- Kefalet onayı verdiyse

  -- Belge doğrulama
  has_verified_content BOOLEAN DEFAULT FALSE, -- "Bu belgeyi gördüm" onayı

  -- Durum
  status TEXT NOT NULL DEFAULT 'distributed'
    CHECK (status IN ('distributed', 'acknowledged', 'combined', 'revoked')),

  acknowledged_at TIMESTAMPTZ,         -- Shard sahibi gördüğünü onayladı

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Benzersizlik: her DMS'e kişi başı 1 shard
  UNIQUE(collective_dms_id, holder_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_shards_dms ON collective_dms_shards(collective_dms_id);
CREATE INDEX IF NOT EXISTS idx_shards_holder ON collective_dms_shards(holder_fingerprint);

-- ─── 3. CANLILIK ZİNCİRİ (PROOF-OF-LIFE) ───────────────
-- Blockchain mantığı: her blok öncekine hash ile bağlı
CREATE TABLE IF NOT EXISTS proof_of_life_chain (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Kimin zinciri
  user_fingerprint TEXT NOT NULL,
  collective_dms_id UUID REFERENCES collective_dms(id) ON DELETE SET NULL,

  -- Zincir verileri
  block_index INTEGER NOT NULL,        -- 0'dan başlar
  block_hash TEXT NOT NULL,            -- SHA-256(user + prev_hash + timestamp)
  prev_hash TEXT NOT NULL DEFAULT 'genesis', -- Genesis bloğu için 'genesis'

  -- Metadata
  checkin_method TEXT DEFAULT 'manual'  -- manual, app_open, api
    CHECK (checkin_method IN ('manual', 'app_open', 'api')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Benzersizlik: kullanıcı başına blok index
  UNIQUE(user_fingerprint, block_index)
);

CREATE INDEX IF NOT EXISTS idx_pol_user ON proof_of_life_chain(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_pol_dms ON proof_of_life_chain(collective_dms_id);
CREATE INDEX IF NOT EXISTS idx_pol_created ON proof_of_life_chain(created_at DESC);

-- ─── 4. KOLEKTİF ALARMLAR ──────────────────────────────
-- Alarm durumları ve kolektif onay süreci
CREATE TABLE IF NOT EXISTS collective_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  collective_dms_id UUID NOT NULL REFERENCES collective_dms(id) ON DELETE CASCADE,

  -- Alarm seviyesi
  alert_level TEXT NOT NULL DEFAULT 'silent'
    CHECK (alert_level IN ('silent', 'yellow', 'red', 'resolved', 'false_alarm')),

  -- Tetikleme nedeni
  trigger_reason TEXT NOT NULL DEFAULT 'missed_checkin',
  missed_checkin_hours INTEGER,        -- Kaç saat geçti

  -- Kefil oyları
  guarantor_votes JSONB DEFAULT '[]',  -- [{ fingerprint, vote: "unreachable"|"safe"|"pending", voted_at }]
  votes_unreachable INTEGER DEFAULT 0,
  votes_safe INTEGER DEFAULT 0,

  -- Zaman çizelgesi
  silent_at TIMESTAMPTZ DEFAULT NOW(),
  yellow_at TIMESTAMPTZ,               -- 48 saat sonra (veya hızlı tetikleme)
  red_at TIMESTAMPTZ,                  -- 72 saat + çoğunluk onayı
  resolved_at TIMESTAMPTZ,

  -- Çözüm
  resolution TEXT,                     -- 'owner_checkin', 'guarantor_safe', 'documents_released', 'false_alarm'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_dms ON collective_alerts(collective_dms_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON collective_alerts(alert_level) WHERE alert_level IN ('silent', 'yellow');

-- ─── 5. RLS POLİTİKALARI ───────────────────────────────

ALTER TABLE collective_dms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_dms_shards ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_life_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_alerts ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (şeffaf platform)
DROP POLICY IF EXISTS "collective_dms_select" ON collective_dms;
CREATE POLICY "collective_dms_select" ON collective_dms FOR SELECT USING (true);
DROP POLICY IF EXISTS "shards_select" ON collective_dms_shards;
CREATE POLICY "shards_select" ON collective_dms_shards FOR SELECT USING (true);
DROP POLICY IF EXISTS "pol_select" ON proof_of_life_chain;
CREATE POLICY "pol_select" ON proof_of_life_chain FOR SELECT USING (true);
DROP POLICY IF EXISTS "alerts_select" ON collective_alerts;
CREATE POLICY "alerts_select" ON collective_alerts FOR SELECT USING (true);

-- Yazma: service role veya anon (API route üzerinden)
DROP POLICY IF EXISTS "collective_dms_insert" ON collective_dms;
CREATE POLICY "collective_dms_insert" ON collective_dms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "collective_dms_update" ON collective_dms;
CREATE POLICY "collective_dms_update" ON collective_dms FOR UPDATE USING (true);
DROP POLICY IF EXISTS "shards_insert" ON collective_dms_shards;
CREATE POLICY "shards_insert" ON collective_dms_shards FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "shards_update" ON collective_dms_shards;
CREATE POLICY "shards_update" ON collective_dms_shards FOR UPDATE USING (true);
DROP POLICY IF EXISTS "pol_insert" ON proof_of_life_chain;
CREATE POLICY "pol_insert" ON proof_of_life_chain FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "alerts_insert" ON collective_alerts;
CREATE POLICY "alerts_insert" ON collective_alerts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "alerts_update" ON collective_alerts;
CREATE POLICY "alerts_update" ON collective_alerts FOR UPDATE USING (true);

-- ─── 6. RPC FONKSİYONLARI ──────────────────────────────

-- Kullanıcının kolektif DMS'lerini getir
CREATE OR REPLACE FUNCTION get_user_collective_dms(p_fingerprint TEXT)
RETURNS SETOF collective_dms AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM collective_dms
    WHERE owner_fingerprint = p_fingerprint
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının tuttuğu shard'ları getir (başkalarının DMS'leri)
CREATE OR REPLACE FUNCTION get_user_held_shards(p_fingerprint TEXT)
RETURNS TABLE(
  shard_id UUID,
  collective_dms_id UUID,
  dms_name TEXT,
  dms_owner_name TEXT,
  dms_status TEXT,
  shard_x INTEGER,
  is_guarantor BOOLEAN,
  guarantor_approved BOOLEAN,
  has_verified_content BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.id as shard_id,
      s.collective_dms_id,
      d.name as dms_name,
      d.owner_display_name as dms_owner_name,
      d.status as dms_status,
      s.shard_x,
      s.is_guarantor,
      s.guarantor_approved,
      s.has_verified_content,
      s.status,
      s.created_at
    FROM collective_dms_shards s
    JOIN collective_dms d ON d.id = s.collective_dms_id
    WHERE s.holder_fingerprint = p_fingerprint
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Canlılık zinciri uzunluğunu getir (güvenilirlik skoru)
CREATE OR REPLACE FUNCTION get_chain_length(p_fingerprint TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM proof_of_life_chain
    WHERE user_fingerprint = p_fingerprint
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Süresi dolmuş aktif DMS'leri bul (cron job için)
CREATE OR REPLACE FUNCTION get_expired_collective_dms()
RETURNS SETOF collective_dms AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM collective_dms
    WHERE status = 'active'
    AND last_checkin + (checkin_interval_hours || ' hours')::INTERVAL < NOW()
    ORDER BY last_checkin ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kefil onayını işle + otomatik durum geçişi
CREATE OR REPLACE FUNCTION approve_guarantor(
  p_dms_id UUID,
  p_fingerprint TEXT
)
RETURNS JSON AS $$
DECLARE
  v_dms collective_dms%ROWTYPE;
  v_new_count INTEGER;
BEGIN
  -- Shard kaydını güncelle
  UPDATE collective_dms_shards
  SET guarantor_approved = TRUE, acknowledged_at = NOW()
  WHERE collective_dms_id = p_dms_id
    AND holder_fingerprint = p_fingerprint
    AND is_guarantor = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Kefil kaydı bulunamadı');
  END IF;

  -- Onaylı kefil sayısını güncelle
  SELECT COUNT(*)::INTEGER INTO v_new_count
  FROM collective_dms_shards
  WHERE collective_dms_id = p_dms_id
    AND is_guarantor = TRUE
    AND guarantor_approved = TRUE;

  UPDATE collective_dms
  SET approved_guarantors = v_new_count, updated_at = NOW()
  WHERE id = p_dms_id;

  -- Yeterli kefil onayı aldıysa aktifleştir
  SELECT * INTO v_dms FROM collective_dms WHERE id = p_dms_id;

  IF v_new_count >= v_dms.required_guarantors AND v_dms.status = 'pending_guarantors' THEN
    UPDATE collective_dms
    SET status = 'active', last_checkin = NOW(), updated_at = NOW()
    WHERE id = p_dms_id;

    RETURN json_build_object(
      'success', TRUE,
      'activated', TRUE,
      'approved_count', v_new_count,
      'required', v_dms.required_guarantors
    );
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'activated', FALSE,
    'approved_count', v_new_count,
    'required', v_dms.required_guarantors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alarm oyu ver (kefil: "ulaşamıyorum" veya "güvende")
CREATE OR REPLACE FUNCTION vote_on_alert(
  p_alert_id UUID,
  p_fingerprint TEXT,
  p_vote TEXT -- 'unreachable' veya 'safe'
)
RETURNS JSON AS $$
DECLARE
  v_alert collective_alerts%ROWTYPE;
  v_dms collective_dms%ROWTYPE;
  v_total_guarantors INTEGER;
BEGIN
  SELECT * INTO v_alert FROM collective_alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Alarm bulunamadı');
  END IF;

  -- Zaten oy verdiyse güncelle, vermediyse ekle
  UPDATE collective_alerts
  SET
    guarantor_votes = (
      -- Mevcut oyu çıkar
      (SELECT COALESCE(
        jsonb_agg(v) FILTER (WHERE v->>'fingerprint' != p_fingerprint),
        '[]'::jsonb
      ) FROM jsonb_array_elements(guarantor_votes) v)
      -- Yeni oyu ekle
      || jsonb_build_array(jsonb_build_object(
        'fingerprint', p_fingerprint,
        'vote', p_vote,
        'voted_at', NOW()::TEXT
      ))
    ),
    updated_at = NOW()
  WHERE id = p_alert_id;

  -- Oy sayılarını güncelle
  SELECT * INTO v_alert FROM collective_alerts WHERE id = p_alert_id;

  UPDATE collective_alerts SET
    votes_unreachable = (SELECT COUNT(*) FROM jsonb_array_elements(v_alert.guarantor_votes) v WHERE v->>'vote' = 'unreachable'),
    votes_safe = (SELECT COUNT(*) FROM jsonb_array_elements(v_alert.guarantor_votes) v WHERE v->>'vote' = 'safe')
  WHERE id = p_alert_id;

  -- Çoğunluk "güvende" derse → false alarm
  SELECT * INTO v_alert FROM collective_alerts WHERE id = p_alert_id;
  SELECT COUNT(*)::INTEGER INTO v_total_guarantors
  FROM collective_dms_shards
  WHERE collective_dms_id = v_alert.collective_dms_id AND is_guarantor = TRUE;

  IF v_alert.votes_safe > v_total_guarantors / 2 THEN
    UPDATE collective_alerts SET alert_level = 'resolved', resolved_at = NOW(), resolution = 'guarantor_safe' WHERE id = p_alert_id;
    UPDATE collective_dms SET status = 'active', last_checkin = NOW(), updated_at = NOW() WHERE id = v_alert.collective_dms_id;
    RETURN json_build_object('success', TRUE, 'result', 'resolved_safe');
  END IF;

  -- Çoğunluk "ulaşamıyorum" derse → seviye yükselt
  IF v_alert.votes_unreachable > v_total_guarantors / 2 THEN
    IF v_alert.alert_level = 'silent' THEN
      UPDATE collective_alerts SET alert_level = 'yellow', yellow_at = NOW() WHERE id = p_alert_id;
      UPDATE collective_dms SET status = 'yellow_alarm', yellow_alarm_at = NOW() WHERE id = v_alert.collective_dms_id;
      RETURN json_build_object('success', TRUE, 'result', 'escalated_yellow');
    ELSIF v_alert.alert_level = 'yellow' THEN
      UPDATE collective_alerts SET alert_level = 'red', red_at = NOW() WHERE id = p_alert_id;
      UPDATE collective_dms SET status = 'red_alarm', red_alarm_at = NOW(), triggered_at = NOW() WHERE id = v_alert.collective_dms_id;
      RETURN json_build_object('success', TRUE, 'result', 'escalated_red');
    END IF;
  END IF;

  RETURN json_build_object('success', TRUE, 'result', 'vote_recorded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
