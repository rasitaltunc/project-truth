-- ============================================================
-- SPRINT G1 PATCH — Kod İncelemesi Sonrası Düzeltmeler
-- Tarih: 24 Mart 2026
-- Düzeltmeler: trace_id uniqueness, atomic increment RPC,
--              missing index, streak fix, immutability trigger
-- ============================================================

-- ============================================================
-- PATCH 1: trace_id çakışma önleme (CRITICAL)
-- Problem: Aynı milisaniyede oluşturulan kayıtlar aynı trace_id alabilir
-- Çözüm: UUID parçası ekleyerek entropi artırma
-- NOT: Mevcut trace_id'ler etkilenmez, sadece yeni kayıtlar
-- ============================================================

-- investigation_tasks: TASK-{epoch}-{uuid8}
ALTER TABLE investigation_tasks
  ALTER COLUMN trace_id SET DEFAULT (
    'TASK-' || LPAD(CAST((EXTRACT(EPOCH FROM now()) * 1000)::bigint AS TEXT), 13, '0')
    || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)
  );

-- transparency_log: PROV-{datetime}-{uuid6}
ALTER TABLE transparency_log
  ALTER COLUMN trace_id SET DEFAULT (
    'PROV-' || TO_CHAR(now(), 'YYYYMMDD"T"HH24MISS')
    || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 6)
  );

-- disputes: DISP-{epoch}-{uuid8}
ALTER TABLE disputes
  ALTER COLUMN trace_id SET DEFAULT (
    'DISP-' || LPAD(CAST((EXTRACT(EPOCH FROM now()) * 1000)::bigint AS TEXT), 13, '0')
    || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)
  );

-- task_assignments trigger da güncelle (daha fazla entropi)
CREATE OR REPLACE FUNCTION set_task_assignment_trace_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trace_id := 'REV-'
    || SUBSTRING(CAST(NEW.task_id AS TEXT), 1, 8)
    || '-' || SUBSTRING(NEW.user_fingerprint, 1, 8)
    || '-' || LPAD(CAST((EXTRACT(EPOCH FROM now()) * 1000)::bigint % 10000 AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PATCH 2: Atomik completed_count artırma RPC (CRITICAL)
-- Problem: JS'de oku-artır-yaz race condition yaratıyor
-- Çözüm: DB seviyesinde atomik UPDATE ... RETURNING
-- ============================================================

CREATE OR REPLACE FUNCTION increment_task_completed_count(p_task_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INT;
BEGIN
  UPDATE investigation_tasks
  SET
    completed_count = completed_count + 1,
    updated_at = now()
  WHERE id = p_task_id
  RETURNING completed_count INTO v_new_count;

  IF v_new_count IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  RETURN v_new_count;
END;
$$;

-- ============================================================
-- PATCH 3: Eksik index (CRITICAL — performans)
-- Problem: refresh_platform_metrics created_at üzerinde filtreliyor ama index yok
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_assignments_created
  ON task_assignments(created_at DESC);

-- transparency_log için de composite index
CREATE INDEX IF NOT EXISTS idx_tlog_target_created
  ON transparency_log(target_type, target_id, created_at DESC);

-- trace_id araması için index
CREATE INDEX IF NOT EXISTS idx_tlog_trace
  ON transparency_log(trace_id);

-- ============================================================
-- PATCH 4: Streak başlangıç düzeltmesi (HIGH)
-- Problem: İlk kullanıcının streak'i hiç başlamıyor (NULL last_active_date)
-- Çözüm: update_investigator_stats RPC'de NULL handling
-- ============================================================

CREATE OR REPLACE FUNCTION update_investigator_stats(
  p_fingerprint TEXT,
  p_is_calibration BOOLEAN,
  p_is_correct BOOLEAN,
  p_task_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile investigator_profiles%ROWTYPE;
  v_new_trust FLOAT;
  v_cal_acc FLOAT;
  v_tier_bonus FLOAT;
  v_streak_bonus FLOAT;
BEGIN
  -- Profili al
  SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;

  IF NOT FOUND THEN
    INSERT INTO investigator_profiles (fingerprint) VALUES (p_fingerprint);
    SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;
  END IF;

  -- Toplam görev güncelle
  UPDATE investigator_profiles SET
    total_tasks_completed = total_tasks_completed + 1,
    last_active_date = CURRENT_DATE
  WHERE fingerprint = p_fingerprint;

  -- Kalibrasyon ise accuracy güncelle
  IF p_is_calibration THEN
    UPDATE investigator_profiles SET
      total_correct = CASE WHEN p_is_correct THEN total_correct + 1 ELSE total_correct END,
      calibration_accuracy = CASE
        WHEN total_tasks_completed > 0
        THEN (CASE WHEN p_is_correct THEN total_correct + 1 ELSE total_correct END)::FLOAT
             / (total_tasks_completed + 1)::FLOAT
        ELSE 0.5
      END
    WHERE fingerprint = p_fingerprint;
  END IF;

  -- Streak güncelle (NULL handling düzeltmesi)
  IF v_profile.last_active_date IS NULL THEN
    -- İlk kez aktif — streak başlat
    UPDATE investigator_profiles SET streak_days = 1
    WHERE fingerprint = p_fingerprint;
  ELSIF v_profile.last_active_date = CURRENT_DATE THEN
    -- Bugün zaten aktif — streak değişmez
    NULL;
  ELSIF v_profile.last_active_date = CURRENT_DATE - 1 THEN
    -- Dün aktifti — streak devam
    UPDATE investigator_profiles SET streak_days = streak_days + 1
    WHERE fingerprint = p_fingerprint;
  ELSE
    -- 1+ gün ara — streak sıfırla
    UPDATE investigator_profiles SET streak_days = 1
    WHERE fingerprint = p_fingerprint;
  END IF;

  -- Profili yeniden oku (güncel değerlerle)
  SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;

  -- Tier bonus
  v_tier_bonus := CASE v_profile.tier
    WHEN 'novice' THEN 0.0
    WHEN 'researcher' THEN 0.1
    WHEN 'analyst' THEN 0.2
    WHEN 'senior' THEN 0.35
    WHEN 'expert' THEN 0.5
    ELSE 0.0
  END;

  -- Streak bonus
  v_streak_bonus := LEAST(v_profile.streak_days::FLOAT / 30.0 * 0.1, 0.1);

  -- Kalibrasyon accuracy
  v_cal_acc := COALESCE(v_profile.calibration_accuracy, 0.5);

  -- Trust weight hesapla (Game Bible v4 formülü)
  -- base(0.1) + calibration(×0.35) + tier(×0.25) + streak(×0.15)
  v_new_trust := 0.1 + (v_cal_acc * 0.35) + (v_tier_bonus * 0.25) + (v_streak_bonus * 0.15);

  -- Taban ve tavan
  v_new_trust := GREATEST(LEAST(v_new_trust, 1.0), 0.1);

  UPDATE investigator_profiles SET
    trust_weight = v_new_trust
  WHERE fingerprint = p_fingerprint;

  -- Tier yükseltme kontrolü
  UPDATE investigator_profiles SET
    tier = CASE
      WHEN xp >= 5000 AND calibration_accuracy >= 0.90 THEN 'expert'
      WHEN xp >= 2000 AND calibration_accuracy >= 0.85 THEN 'senior'
      WHEN xp >= 500  AND calibration_accuracy >= 0.80 THEN 'analyst'
      WHEN xp >= 100  AND calibration_accuracy >= 0.70 THEN 'researcher'
      ELSE 'novice'
    END
  WHERE fingerprint = p_fingerprint;
END;
$$;

-- ============================================================
-- PATCH 5: transparency_log değiştirilemezlik (MEDIUM)
-- Append-only log — UPDATE ve DELETE yasak
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_transparency_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'transparency_log kayıtları değiştirilemez (append-only)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_tlog_update ON transparency_log;
CREATE TRIGGER trg_prevent_tlog_update
  BEFORE UPDATE OR DELETE ON transparency_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_transparency_log_mutation();

-- ============================================================
-- BITTI — Tüm patch'ler uygulandı
-- ============================================================
