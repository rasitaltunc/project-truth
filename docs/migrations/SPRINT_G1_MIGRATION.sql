-- ============================================================================
-- SPRINT G1 — "TEMEL MOTOR" Migration
-- Investigation Game Engine + Radical Transparency Architecture
-- Date: 24 Mart 2026
-- ============================================================================

-- ============================================================================
-- 1. INVESTIGATION TASKS — Görev havuzu
-- Her karantina kaydı → incelenebilir görev
-- ============================================================================

CREATE TABLE IF NOT EXISTS investigation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL,

  -- Görev tipi ve zorluğu
  task_type TEXT NOT NULL CHECK (task_type IN (
    'entity_verification',    -- Bu entity doğru mu?
    'relationship_verification', -- Bu ilişki gerçek mi?
    'date_verification',      -- Bu tarih doğru mu?
    'claim_verification',     -- Bu iddia doğru mu?
    'entity_resolution',      -- Bu iki entity aynı kişi mi?
    'source_verification'     -- Bu kaynak güvenilir mi?
  )),
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  role_affinity TEXT CHECK (role_affinity IN ('finance', 'legal', 'journalism', 'general')),

  -- Kaynak bağlantıları (biricik kod zinciri)
  source_document_id UUID,          -- Hangi belgeden geldi
  source_quarantine_id UUID,        -- Karantina kaydı referansı
  source_derived_item_id UUID,      -- Derived item referansı

  -- Görev içeriği
  task_data JSONB NOT NULL,         -- Görev detayları (entity adı, belge alıntısı, vb.)
  context_data JSONB,               -- Ek bağlam (belge snippet, çevresindeki entityler)
  display_config JSONB,             -- UI konfigürasyonu (renk, ikon, layout ipuçları)

  -- Kalibrasyon (bilinen cevaplı sorular)
  is_calibration BOOLEAN NOT NULL DEFAULT false,
  known_answer JSONB,               -- Calibration ise doğru cevap (NULL = gerçek görev)
  calibration_source TEXT,          -- 'gold_standard' | 'expert_verified' | 'consensus'

  -- Atama ve consensus
  assigned_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  required_reviews INT NOT NULL DEFAULT 2,  -- Kaç bağımsız review gerekli
  consensus_result JSONB,           -- Final sonuç: {decision, confidence, reviewer_count}
  consensus_reached_at TIMESTAMPTZ,

  -- Durum
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',       -- Atama bekliyor
    'in_progress', -- Atanmış, review devam ediyor
    'consensus',  -- Yeterli review geldi, consensus hesaplandı
    'promoted',   -- Ağa eklendi
    'rejected',   -- Reddedildi
    'disputed'    -- İtiraz altında
  )),

  -- Şeffaflık: biricik kod (DEFAULT ile set edilir, GENERATED kullanılamaz çünkü now() immutable değil)
  trace_id TEXT NOT NULL DEFAULT ('TASK-' || LPAD(CAST((EXTRACT(EPOCH FROM now()) * 1000)::bigint AS TEXT), 13, '0')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_tasks_network_status ON investigation_tasks(network_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON investigation_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON investigation_tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_tasks_role ON investigation_tasks(role_affinity);
CREATE INDEX IF NOT EXISTS idx_tasks_calibration ON investigation_tasks(is_calibration) WHERE is_calibration = true;
CREATE INDEX IF NOT EXISTS idx_tasks_source_quarantine ON investigation_tasks(source_quarantine_id);

-- ============================================================================
-- 2. TASK ASSIGNMENTS — Görev atamaları (kim ne inceledi)
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES investigation_tasks(id) ON DELETE CASCADE,
  user_fingerprint TEXT NOT NULL,
  auth_user_id UUID,               -- Supabase Auth (opsiyonel, pseudonim)

  -- Mod bilgisi
  mode TEXT NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'duo_open', 'duo_friend', 'multi')),
  partner_fingerprint TEXT,         -- Duo modunda eşleşen kişi

  -- Cevap (TAM ŞEFFAFLIK — herkes görebilir)
  response JSONB,                   -- {decision: 'approve'|'reject'|'dispute'|'skip', details: {...}}
  response_time_ms INT,             -- Cevaplama süresi (ms)
  confidence_self_report FLOAT,     -- Kullanıcının kendi güven derecesi (0-1)

  -- Kalibrasyon sonucu
  is_calibration BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN,               -- Calibration ise doğru mu cevapladı?

  -- Şeffaflık: sebep gösterme ZORUNLU
  reasoning TEXT,                    -- Neden bu kararı verdin? (zorunlu, min 10 karakter)
  evidence_references TEXT[],        -- Referans gösterilen belge/kaynak ID'leri

  -- Şeffaflık: biricik kod (trigger ile set edilir — diğer sütunlara bağımlı)
  trace_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON task_assignments(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_assignments_calibration ON task_assignments(is_calibration) WHERE is_calibration = true;

-- Bir kullanıcı aynı göreve iki kez cevap veremez
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique_per_user
  ON task_assignments(task_id, user_fingerprint);

-- Trigger: task_assignments.trace_id depends on task_id + user_fingerprint
-- DEFAULT cannot reference other columns, so we use a BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION set_task_assignment_trace_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.trace_id := 'REV-' || SUBSTRING(CAST(NEW.task_id AS TEXT), 1, 8) || '-' || SUBSTRING(NEW.user_fingerprint, 1, 6);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_task_assignment_trace
  BEFORE INSERT ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION set_task_assignment_trace_id();

-- ============================================================================
-- 3. INVESTIGATOR PROFILES — Araştırmacı profilleri (davranış bazlı)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investigator_profiles (
  fingerprint TEXT PRIMARY KEY,
  auth_user_id UUID,

  -- İlerleme
  tier TEXT NOT NULL DEFAULT 'novice' CHECK (tier IN (
    'novice',      -- 0-49 XP
    'researcher',  -- 50-199 XP
    'analyst',     -- 200-499 XP
    'senior',      -- 500-999 XP
    'expert'       -- 1000+ XP
  )),
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,

  -- Streak
  streak_days INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,

  -- Doğruluk metrikleri (TAM ŞEFFAF — herkes görebilir)
  accuracy_scores JSONB NOT NULL DEFAULT '{}',  -- {finance: 0.91, legal: 0.67, entity: 0.85}
  calibration_accuracy FLOAT NOT NULL DEFAULT 0.5,
  calibration_total INT NOT NULL DEFAULT 0,
  calibration_correct INT NOT NULL DEFAULT 0,

  -- Güven ağırlığı (hesaplama formülü açık)
  trust_weight FLOAT NOT NULL DEFAULT 0.1,
  trust_weight_formula TEXT NOT NULL DEFAULT 'base(0.1) + calibration_bonus + tier_bonus + streak_bonus',

  -- Davranış profili (anomali tespiti)
  behavior_flags JSONB NOT NULL DEFAULT '{}',
  -- {rubber_stamping: false, contrarian: false, speed_anomaly: false, domain_mismatch: false}

  -- İstatistikler
  total_tasks_completed INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_disputes_filed INT NOT NULL DEFAULT 0,
  total_disputes_won INT NOT NULL DEFAULT 0,
  specializations TEXT[] NOT NULL DEFAULT '{}',

  -- Zamanlama
  avg_response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. TRANSPARENCY LOG — Değiştirilemez denetim izi (append-only)
-- Platformdaki HER aksiyonun kaydı
-- ============================================================================

CREATE TABLE IF NOT EXISTS transparency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ne oldu?
  action_type TEXT NOT NULL CHECK (action_type IN (
    -- Veri aksiyonları
    'task_created',           -- Görev oluşturuldu
    'task_assigned',          -- Görev atandı
    'task_reviewed',          -- Görev incelendi
    'task_consensus',         -- Consensus sağlandı
    'entity_promoted',        -- Entity ağa eklendi
    'entity_rejected',        -- Entity reddedildi
    -- İtiraz aksiyonları
    'dispute_filed',          -- İtiraz açıldı
    'dispute_reviewed',       -- İtiraz incelendi
    'dispute_resolved',       -- İtiraz sonuçlandı
    -- Geri bildirim aksiyonları
    'feedback_submitted',     -- Platform geri bildirimi
    'feedback_acknowledged',  -- Geri bildirim alındı
    -- Sistem aksiyonları
    'trust_weight_changed',   -- Güven ağırlığı değişti
    'tier_promoted',          -- Tier yükseltildi
    'behavior_flagged',       -- Davranış anomalisi
    'rollback_initiated',     -- Geri alma başlatıldı
    'rollback_completed'      -- Geri alma tamamlandı
  )),

  -- Kim yaptı?
  actor_fingerprint TEXT,       -- İşlemi yapan (NULL = sistem)
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'ai')),

  -- Neye yapıldı? (biricik kod referansları)
  target_type TEXT NOT NULL,    -- 'task', 'entity', 'link', 'node', 'profile', 'platform'
  target_id TEXT NOT NULL,      -- Hedef nesnenin ID'si

  -- Detay (tam kayıt)
  action_data JSONB NOT NULL,   -- {before: {...}, after: {...}, reason: "..."}

  -- Bağlam
  network_id UUID,
  related_trace_ids TEXT[],     -- İlişkili biricik kodlar

  -- Şeffaflık: biricik kod (DEFAULT ile set edilir)
  trace_id TEXT NOT NULL DEFAULT ('PROV-' || TO_CHAR(now(), 'YYYYMMDD"T"HH24MISS')),

  -- Değiştirilemezlik
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NOT: updated_at YOK — bu kayıtlar ASLA değiştirilemez
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_tlog_action ON transparency_log(action_type);
CREATE INDEX IF NOT EXISTS idx_tlog_target ON transparency_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tlog_actor ON transparency_log(actor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_tlog_network ON transparency_log(network_id);
CREATE INDEX IF NOT EXISTS idx_tlog_created ON transparency_log(created_at DESC);

-- ============================================================================
-- 5. DISPUTES — İtiraz sistemi
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL,

  -- Ne hakkında?
  target_type TEXT NOT NULL CHECK (target_type IN (
    'entity', 'relationship', 'link', 'node',
    'task_result', 'algorithm', 'platform_decision'
  )),
  target_id TEXT NOT NULL,

  -- Kim açtı? (anonim ama takip edilebilir)
  filed_by_fingerprint TEXT NOT NULL,

  -- İtiraz detayı
  dispute_type TEXT NOT NULL CHECK (dispute_type IN (
    'incorrect_data',         -- Veri yanlış
    'missing_source',         -- Kaynak eksik
    'unreliable_source',      -- Kaynak güvenilmez
    'date_inconsistency',     -- Tarih tutarsızlığı
    'duplicate_entity',       -- Tekrarlı entity
    'algorithm_unfair',       -- Algoritma adaletsiz
    'platform_bug',           -- Platform hatası
    'other'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[],           -- Destekleyici kanıt linkleri
  suggested_correction JSONB,     -- Önerilen düzeltme

  -- İnceleme süreci
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'resolved_accepted', 'resolved_rejected', 'escalated'
  )),
  reviewed_by TEXT[],             -- İnceleme yapan fingerprint'ler
  resolution_reason TEXT,         -- Sonuç açıklaması
  resolved_at TIMESTAMPTZ,

  -- Şeffaflık: biricik kod (DEFAULT ile set edilir)
  trace_id TEXT NOT NULL DEFAULT ('DISP-' || LPAD(CAST((EXTRACT(EPOCH FROM now()) * 1000)::bigint AS TEXT), 13, '0')),
  is_public BOOLEAN NOT NULL DEFAULT true,  -- Varsayılan: herkes görebilir

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_network ON disputes(network_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_target ON disputes(target_type, target_id);

-- ============================================================================
-- 6. PLATFORM METRICS — Kamuya açık canlı metrikler
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID,                -- NULL = platform geneli
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_data JSONB,              -- Ek detay
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON platform_metrics(metric_name, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_network ON platform_metrics(network_id) WHERE network_id IS NOT NULL;

-- ============================================================================
-- 7. RPC FUNCTIONS
-- ============================================================================

-- Görev ataması al (rastgele, kullanıcının görmediği)
CREATE OR REPLACE FUNCTION get_next_task(
  p_network_id UUID,
  p_fingerprint TEXT,
  p_role_affinity TEXT DEFAULT NULL
)
RETURNS SETOF investigation_tasks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM investigation_tasks t
  WHERE t.network_id = p_network_id
    AND t.status IN ('open', 'in_progress')
    AND t.completed_count < t.required_reviews
    -- Kullanıcı daha önce bu görevi cevaplamamış olmalı
    AND NOT EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = t.id AND ta.user_fingerprint = p_fingerprint
    )
    -- Rol tercihi varsa %70 uygun görev, %30 rastgele (cross-training)
    AND (
      p_role_affinity IS NULL
      OR t.role_affinity = p_role_affinity
      OR t.role_affinity = 'general'
      OR random() > 0.7  -- %30 cross-training şansı
    )
  ORDER BY
    -- Kalibrasyon sorularını %20 oranında serpiştir
    CASE WHEN t.is_calibration AND random() < 0.2 THEN 0 ELSE 1 END,
    -- Önce az incelenmiş görevler
    t.completed_count ASC,
    -- Sonra rastgele
    random()
  LIMIT 1;
END;
$$;

-- Profil güncelle (accuracy, streak, tier, trust_weight)
CREATE OR REPLACE FUNCTION update_investigator_stats(
  p_fingerprint TEXT,
  p_is_calibration BOOLEAN,
  p_is_correct BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile investigator_profiles%ROWTYPE;
  v_new_trust FLOAT;
  v_cal_acc FLOAT;
  v_tier_bonus FLOAT;
  v_streak_bonus FLOAT;
BEGIN
  -- Profil yoksa oluştur
  INSERT INTO investigator_profiles (fingerprint)
  VALUES (p_fingerprint)
  ON CONFLICT (fingerprint) DO NOTHING;

  -- Mevcut profili al
  SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;

  -- Toplam görev sayısını güncelle
  UPDATE investigator_profiles SET
    total_tasks_completed = total_tasks_completed + 1,
    last_active_date = CURRENT_DATE,
    updated_at = now()
  WHERE fingerprint = p_fingerprint;

  -- Kalibrasyon ise accuracy güncelle
  IF p_is_calibration AND p_is_correct IS NOT NULL THEN
    UPDATE investigator_profiles SET
      calibration_total = calibration_total + 1,
      calibration_correct = CASE WHEN p_is_correct THEN calibration_correct + 1 ELSE calibration_correct END,
      calibration_accuracy = CASE
        WHEN calibration_total > 0 THEN
          (CASE WHEN p_is_correct THEN calibration_correct + 1 ELSE calibration_correct END)::FLOAT
          / (calibration_total + 1)::FLOAT
        ELSE 0.5
      END,
      total_correct = CASE WHEN p_is_correct THEN total_correct + 1 ELSE total_correct END
    WHERE fingerprint = p_fingerprint;
  END IF;

  -- Streak güncelle
  IF v_profile.last_active_date = CURRENT_DATE - 1 THEN
    UPDATE investigator_profiles SET
      streak_days = streak_days + 1,
      longest_streak = GREATEST(longest_streak, streak_days + 1)
    WHERE fingerprint = p_fingerprint;
  ELSIF v_profile.last_active_date < CURRENT_DATE - 1 THEN
    UPDATE investigator_profiles SET streak_days = 1
    WHERE fingerprint = p_fingerprint;
  END IF;

  -- Trust weight hesapla (FORMÜLÜ AÇIK — herkes görebilir)
  SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;
  v_cal_acc := COALESCE(v_profile.calibration_accuracy, 0.5);
  v_tier_bonus := CASE v_profile.tier
    WHEN 'novice' THEN 0
    WHEN 'researcher' THEN 0.1
    WHEN 'analyst' THEN 0.2
    WHEN 'senior' THEN 0.35
    WHEN 'expert' THEN 0.5
    ELSE 0
  END;
  v_streak_bonus := LEAST(v_profile.streak_days * 0.01, 0.1);  -- Max 0.1

  v_new_trust := 0.1 + (v_cal_acc * 0.5) + v_tier_bonus + v_streak_bonus;
  -- Cap at 1.0
  v_new_trust := LEAST(v_new_trust, 1.0);

  UPDATE investigator_profiles SET
    trust_weight = v_new_trust,
    trust_weight_formula = FORMAT(
      'base(0.1) + calibration(%s × 0.5 = %s) + tier_%s(%s) + streak(%s days × 0.01 = %s) = %s',
      ROUND(v_cal_acc::numeric, 3),
      ROUND((v_cal_acc * 0.5)::numeric, 3),
      v_profile.tier,
      ROUND(v_tier_bonus::numeric, 3),
      v_profile.streak_days,
      ROUND(v_streak_bonus::numeric, 3),
      ROUND(v_new_trust::numeric, 3)
    )
  WHERE fingerprint = p_fingerprint;

  -- XP ekle ve tier yükselt
  UPDATE investigator_profiles SET
    xp = xp + CASE
      WHEN p_is_calibration AND p_is_correct THEN 5   -- Kalibrasyon doğru
      WHEN p_is_calibration AND NOT p_is_correct THEN 1 -- Kalibrasyon yanlış
      ELSE 3                                            -- Normal görev
    END
  WHERE fingerprint = p_fingerprint;

  -- Tier otomatik yükseltme
  UPDATE investigator_profiles SET tier = CASE
    WHEN xp >= 1000 THEN 'expert'
    WHEN xp >= 500 THEN 'senior'
    WHEN xp >= 200 THEN 'analyst'
    WHEN xp >= 50 THEN 'researcher'
    ELSE 'novice'
  END
  WHERE fingerprint = p_fingerprint;
END;
$$;

-- Consensus hesapla (ağırlıklı oylama)
CREATE OR REPLACE FUNCTION calculate_task_consensus(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_task investigation_tasks%ROWTYPE;
  v_approve_weight FLOAT := 0;
  v_reject_weight FLOAT := 0;
  v_dispute_weight FLOAT := 0;
  v_total_weight FLOAT := 0;
  v_result TEXT;
  v_confidence FLOAT;
  v_assignment RECORD;
BEGIN
  SELECT * INTO v_task FROM investigation_tasks WHERE id = p_task_id;

  -- Her cevabı ağırlıklı olarak topla
  FOR v_assignment IN
    SELECT ta.response, ta.user_fingerprint,
           COALESCE(ip.trust_weight, 0.1) AS weight
    FROM task_assignments ta
    LEFT JOIN investigator_profiles ip ON ip.fingerprint = ta.user_fingerprint
    WHERE ta.task_id = p_task_id AND ta.response IS NOT NULL
  LOOP
    v_total_weight := v_total_weight + v_assignment.weight;
    CASE (v_assignment.response->>'decision')
      WHEN 'approve' THEN v_approve_weight := v_approve_weight + v_assignment.weight;
      WHEN 'reject' THEN v_reject_weight := v_reject_weight + v_assignment.weight;
      WHEN 'dispute' THEN v_dispute_weight := v_dispute_weight + v_assignment.weight;
      ELSE NULL;
    END CASE;
  END LOOP;

  IF v_total_weight = 0 THEN
    RETURN NULL;
  END IF;

  -- Karar
  IF v_approve_weight / v_total_weight >= 0.67 THEN
    v_result := 'approved';
    v_confidence := v_approve_weight / v_total_weight;
  ELSIF v_reject_weight / v_total_weight >= 0.67 THEN
    v_result := 'rejected';
    v_confidence := v_reject_weight / v_total_weight;
  ELSIF v_dispute_weight / v_total_weight >= 0.33 THEN
    v_result := 'disputed';
    v_confidence := v_dispute_weight / v_total_weight;
  ELSE
    v_result := 'no_consensus';
    v_confidence := GREATEST(v_approve_weight, v_reject_weight) / v_total_weight;
  END IF;

  -- Task'ı güncelle
  UPDATE investigation_tasks SET
    consensus_result = jsonb_build_object(
      'decision', v_result,
      'confidence', ROUND(v_confidence::numeric, 4),
      'approve_weight', ROUND(v_approve_weight::numeric, 4),
      'reject_weight', ROUND(v_reject_weight::numeric, 4),
      'dispute_weight', ROUND(v_dispute_weight::numeric, 4),
      'total_weight', ROUND(v_total_weight::numeric, 4),
      'reviewer_count', v_task.completed_count,
      'formula', 'weighted_vote: trust_weight × decision, threshold 67%'
    ),
    consensus_reached_at = CASE WHEN v_result != 'no_consensus' THEN now() ELSE NULL END,
    status = CASE
      WHEN v_result = 'approved' THEN 'consensus'
      WHEN v_result = 'rejected' THEN 'rejected'
      WHEN v_result = 'disputed' THEN 'disputed'
      ELSE 'in_progress'
    END,
    updated_at = now()
  WHERE id = p_task_id;

  RETURN jsonb_build_object(
    'decision', v_result,
    'confidence', ROUND(v_confidence::numeric, 4),
    'total_reviews', v_task.completed_count
  );
END;
$$;

-- Platform metrikleri güncelle
CREATE OR REPLACE FUNCTION refresh_platform_metrics(p_network_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Toplam görev istatistikleri
  INSERT INTO platform_metrics (network_id, metric_name, metric_value, metric_data)
  SELECT p_network_id, 'tasks_total', COUNT(*)::FLOAT,
    jsonb_build_object(
      'open', COUNT(*) FILTER (WHERE status = 'open'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'consensus', COUNT(*) FILTER (WHERE status = 'consensus'),
      'promoted', COUNT(*) FILTER (WHERE status = 'promoted'),
      'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
      'disputed', COUNT(*) FILTER (WHERE status = 'disputed')
    )
  FROM investigation_tasks WHERE network_id = p_network_id;

  -- Onay oranı
  INSERT INTO platform_metrics (network_id, metric_name, metric_value)
  SELECT p_network_id, 'approval_rate',
    CASE WHEN COUNT(*) > 0 THEN
      COUNT(*) FILTER (WHERE status IN ('consensus', 'promoted'))::FLOAT / COUNT(*)::FLOAT
    ELSE 0 END
  FROM investigation_tasks
  WHERE network_id = p_network_id AND status NOT IN ('open', 'in_progress');

  -- Aktif araştırmacı sayısı
  INSERT INTO platform_metrics (network_id, metric_name, metric_value)
  SELECT p_network_id, 'active_investigators',
    COUNT(DISTINCT user_fingerprint)::FLOAT
  FROM task_assignments ta
  JOIN investigation_tasks t ON t.id = ta.task_id
  WHERE t.network_id = p_network_id AND ta.created_at > now() - interval '7 days';

  -- Ortalama consensus süresi
  INSERT INTO platform_metrics (network_id, metric_name, metric_value)
  SELECT p_network_id, 'avg_consensus_hours',
    COALESCE(AVG(EXTRACT(EPOCH FROM (consensus_reached_at - created_at)) / 3600), 0)::FLOAT
  FROM investigation_tasks
  WHERE network_id = p_network_id AND consensus_reached_at IS NOT NULL;

  -- İtiraz istatistikleri
  INSERT INTO platform_metrics (network_id, metric_name, metric_value, metric_data)
  SELECT p_network_id, 'disputes_stats', COUNT(*)::FLOAT,
    jsonb_build_object(
      'open', COUNT(*) FILTER (WHERE status = 'open'),
      'resolved_accepted', COUNT(*) FILTER (WHERE status = 'resolved_accepted'),
      'resolved_rejected', COUNT(*) FILTER (WHERE status = 'resolved_rejected')
    )
  FROM disputes WHERE network_id = p_network_id;
END;
$$;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

ALTER TABLE investigation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transparency_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (RADİKAL ŞEFFAFLIK)
CREATE POLICY "Anyone can read tasks" ON investigation_tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can read assignments" ON task_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can read profiles" ON investigator_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can read transparency log" ON transparency_log FOR SELECT USING (true);
CREATE POLICY "Anyone can read disputes" ON disputes FOR SELECT USING (true);
CREATE POLICY "Anyone can read metrics" ON platform_metrics FOR SELECT USING (true);

-- Service role yazabilir
CREATE POLICY "Service can insert tasks" ON investigation_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update tasks" ON investigation_tasks FOR UPDATE USING (true);
CREATE POLICY "Service can insert assignments" ON task_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can manage profiles" ON investigator_profiles FOR ALL USING (true);
CREATE POLICY "Service can insert log" ON transparency_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can manage disputes" ON disputes FOR ALL USING (true);
CREATE POLICY "Service can insert metrics" ON platform_metrics FOR INSERT WITH CHECK (true);

-- ============================================================================
-- DONE — Sprint G1 Migration Complete
-- ============================================================================
