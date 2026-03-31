-- ============================================================================
-- SPRINT VERIFICATION DESK v2 — "CANLI AĞ" Migration
-- Anti-Bias 3-Layer System + Spotlight + Honeypot + Re-verification
-- Date: 25 Mart 2026
-- ============================================================================

-- ============================================================================
-- 1. INVESTIGATION_TASKS — Yeni kolonlar (Spotlight + Anti-Bias)
-- ============================================================================

-- Spotlight modu: normal (%50), honeypot (%20), none (%30)
ALTER TABLE investigation_tasks
  ADD COLUMN IF NOT EXISTS spotlight_mode TEXT NOT NULL DEFAULT 'normal'
  CHECK (spotlight_mode IN ('normal', 'honeypot', 'none'));

-- Honeypot modunda: DOĞRU bölgenin koordinatları
-- (yanlış bölge task_data.source_location'da zaten var)
ALTER TABLE investigation_tasks
  ADD COLUMN IF NOT EXISTS honeypot_target_section JSONB;

-- Risk seviyesi: auto-promote pipeline'da kullanılır
ALTER TABLE investigation_tasks
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'standard'
  CHECK (risk_level IN ('standard', 'high'));

-- Yüksek riskli görevler 48 saat bekler
ALTER TABLE investigation_tasks
  ADD COLUMN IF NOT EXISTS cooling_expires_at TIMESTAMPTZ;

-- Composite confidence (AI hesaplamasın, BİZ hesaplayalım — Anayasa Madde 9)
ALTER TABLE investigation_tasks
  ADD COLUMN IF NOT EXISTS composite_confidence FLOAT;

-- İndeks: spotlight modu filtreleme
CREATE INDEX IF NOT EXISTS idx_tasks_spotlight_mode
  ON investigation_tasks(spotlight_mode);

-- İndeks: risk seviyesi
CREATE INDEX IF NOT EXISTS idx_tasks_risk_level
  ON investigation_tasks(risk_level) WHERE risk_level = 'high';

-- ============================================================================
-- 2. TASK_ASSIGNMENTS — 3 Katmanlı Cevap + Honeypot Sonuçları
-- ============================================================================

-- 3 katman cevapları: blind → compare → verify
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS phase_responses JSONB NOT NULL DEFAULT '{}';
-- Yapı:
-- {
--   "blind": { "answer": "pilot", "confidence": 0.8, "completed_at": "..." },
--   "compare": { "decision": "approve", "corrections": [...], "completed_at": "..." },
--   "verify": { "source_exists": true, "correctly_interpreted": true, "completed_at": "..." }
-- }

-- Mevcut katman (partial save için)
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'blind'
  CHECK (current_phase IN ('blind', 'compare', 'verify', 'complete'));

-- Honeypot sonuçları (sessiz, kullanıcı görmez)
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS rejected_spotlight BOOLEAN DEFAULT FALSE;

ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS found_correct_section BOOLEAN DEFAULT FALSE;

-- Düzeltme kaydı (Katman 2'de "DÜZELT" seçeneği — V1 stres testi bulgusu)
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS corrections JSONB;

-- İndeks: faz bazlı filtreleme
CREATE INDEX IF NOT EXISTS idx_assignments_phase
  ON task_assignments(current_phase);

-- ============================================================================
-- 3. INVESTIGATOR_PROFILES — Spotlight Direnci + Yeni Metrikler
-- ============================================================================

-- Spotlight direnci (0.0-1.0) — trust_weight formülüne eklenen 6. sinyal
ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS spotlight_resistance FLOAT NOT NULL DEFAULT 0.5;

-- Honeypot görev sayıları (hesaplama için)
ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS honeypot_completed INT NOT NULL DEFAULT 0;

ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS honeypot_correct INT NOT NULL DEFAULT 0;

-- Spotlight-yok görev sayıları
ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS no_spotlight_completed INT NOT NULL DEFAULT 0;

ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS no_spotlight_correct INT NOT NULL DEFAULT 0;

-- Reviewer doğruluk oranı (<%70 → oy ağırlığı yarıya)
ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS review_accuracy FLOAT NOT NULL DEFAULT 0.5;

ALTER TABLE investigator_profiles
  ADD COLUMN IF NOT EXISTS total_reviews_graded INT NOT NULL DEFAULT 0;

-- ============================================================================
-- 4. REVERIFICATION_QUEUE — Sürekli yeniden doğrulama
-- "Veri ağa girince ölmez — sonsuza kadar canlı kalır."
-- ============================================================================

CREATE TABLE IF NOT EXISTS reverification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hedef: node veya link
  target_type TEXT NOT NULL CHECK (target_type IN ('node', 'link')),
  target_id UUID NOT NULL,
  network_id UUID NOT NULL,

  -- Tetikleyici
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'new_evidence',   -- Yeni belge eklendi
    'periodic',       -- Zaman bazlı (30/60/90 gün)
    'dispute',        -- İtiraz sonrası
    'inconsistency',  -- Bağlı node'larda tutarsızlık
    'cascade'         -- Bağlı veri değişti
  )),
  trigger_source UUID,  -- Tetikleyen belge/itiraz/node ID

  -- Öncelik (1=acil, 10=düşük)
  priority INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

  -- İstatistikler
  verification_count INT NOT NULL DEFAULT 0,  -- Toplam kaç kez doğrulanmış
  last_verified_at TIMESTAMPTZ,
  next_verification_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),

  -- Durum
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Kuyrukta bekliyor
    'assigned',   -- Görev oluşturuldu
    'verified',   -- Doğrulandı
    'flagged',    -- Sorunlu bulundu
    'disputed'    -- İtiraz altında
  )),

  -- İlişkili görev
  task_id UUID REFERENCES investigation_tasks(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_reverification_status
  ON reverification_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_reverification_network
  ON reverification_queue(network_id);
CREATE INDEX IF NOT EXISTS idx_reverification_target
  ON reverification_queue(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reverification_next
  ON reverification_queue(next_verification_at) WHERE status = 'pending';

-- ============================================================================
-- 5. TASK_CORRECTIONS — Düzeltme kayıtları (provenance zinciri)
-- Katman 2'de "DÜZELT" seçeneği → ayrı kayıt
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES investigation_tasks(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,

  -- Ne düzeltildi?
  field_name TEXT NOT NULL,           -- 'entity_name', 'entity_type', 'relationship_type', vb.
  original_value TEXT,                -- AI'ın çıkarımı
  corrected_value TEXT NOT NULL,      -- Kullanıcının düzeltmesi
  correction_reasoning TEXT NOT NULL, -- Neden düzeltti? (min 10 karakter)

  -- Durum (düzeltmeler DE doğrulanmalı)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Doğrulama bekliyor
    'verified',   -- Başka reviewer onayladı
    'rejected',   -- Başka reviewer reddetti
    'applied'     -- Ağa uygulandı
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corrections_task ON task_corrections(task_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON task_corrections(status);

-- ============================================================================
-- 6. TASK_FEEDBACK — Görev sorunlu bildirimleri + platform geri bildirim
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES investigation_tasks(id) ON DELETE SET NULL,
  user_fingerprint TEXT NOT NULL,

  -- Kategori
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'task_broken',        -- Belge yüklenmiyor, spotlight yanlış, vb.
    'question_unclear',   -- Soru anlamsız
    'language_issue',     -- Dil sorunu
    'wrong_data',         -- Yanlış bilgi (dışarıdan erişilebilir)
    'suggestion',         -- Öneri
    'complaint',          -- Şikayet
    'other'
  )),

  -- İçerik
  message TEXT NOT NULL,
  context_data JSONB,     -- Ek bağlam (ekran görüntüsü URL, vb.)

  -- Durum
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'in_progress', 'resolved', 'wont_fix'
  )),

  -- Hesapsız erişilebilir (anonim gözlemciler de gönderebilir)
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_type ON task_feedback(feedback_type, status);

-- ============================================================================
-- 7. RPC FONKSİYONLARI
-- ============================================================================

-- 7.1: Otomatik promote to network
-- Consensus'a ulaşan veriyi ağa ekle (safety threshold'larla)
CREATE OR REPLACE FUNCTION auto_promote_to_network(
  p_task_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_consensus JSONB;
  v_confidence FLOAT;
  v_is_high_risk BOOLEAN;
  v_new_node_id UUID;
  v_result JSONB;
BEGIN
  -- Görevi getir
  SELECT * INTO v_task FROM investigation_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Zaten promote edilmiş mi?
  IF v_task.status = 'promoted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already promoted');
  END IF;

  -- Consensus var mı?
  IF v_task.consensus_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No consensus yet');
  END IF;

  v_consensus := v_task.consensus_result;
  v_confidence := COALESCE(v_task.composite_confidence, (v_consensus->>'confidence')::float);
  v_is_high_risk := v_task.risk_level = 'high';

  -- Yüksek riskli: 48 saat bekleme kontrolü
  IF v_is_high_risk AND v_task.cooling_expires_at IS NOT NULL
     AND v_task.cooling_expires_at > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cooling period active',
      'expires_at', v_task.cooling_expires_at
    );
  END IF;

  -- Confidence threshold kontrolü
  -- Standart: %80, Yüksek risk: %85
  IF v_is_high_risk AND v_confidence < 0.85 THEN
    RETURN jsonb_build_object('success', false, 'error', 'High-risk confidence too low', 'confidence', v_confidence);
  ELSIF NOT v_is_high_risk AND v_confidence < 0.80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence too low', 'confidence', v_confidence);
  END IF;

  -- Dispute varsa ASLA promote etme
  IF v_task.status = 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is disputed');
  END IF;

  -- Consensus karar: sadece 'approved' promote edilir
  IF (v_consensus->>'decision') != 'approved' THEN
    -- Rejected → görevi kapat
    UPDATE investigation_tasks SET status = 'rejected', updated_at = now() WHERE id = p_task_id;
    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  END IF;

  -- PROMOTE: Task durumunu güncelle
  UPDATE investigation_tasks
  SET status = 'promoted', updated_at = now()
  WHERE id = p_task_id;

  -- Reverification kuyruğuna ekle
  -- Yüksek risk: 7 gün, standart: 30 gün
  -- (Gerçek node/link oluşturma API tarafında yapılır — burada sadece flag)

  v_result := jsonb_build_object(
    'success', true,
    'action', 'promoted',
    'confidence', v_confidence,
    'is_high_risk', v_is_high_risk,
    'alleged_label', v_is_high_risk  -- Yüksek riskli → "alleged" etiketi zorunlu
  );

  -- Transparency log
  INSERT INTO transparency_log (action_type, actor_type, action_data, network_id)
  VALUES (
    'entity_promoted',
    'system',
    jsonb_build_object(
      'task_id', p_task_id,
      'confidence', v_confidence,
      'is_high_risk', v_is_high_risk,
      'reviewer_count', v_task.completed_count
    ),
    v_task.network_id
  );

  RETURN v_result;
END;
$$;

-- 7.2: Composite confidence hesaplama
-- AI hesaplamasın, BİZ hesaplayalım (Truth Anayasası Madde 9)
CREATE OR REPLACE FUNCTION calculate_composite_confidence(
  p_task_id UUID
) RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_assignments RECORD;
  v_doc_type_weight FLOAT := 0.5;
  v_source_hierarchy_weight FLOAT := 0.5;
  v_verification_weight FLOAT := 0.5;
  v_trust_weight_avg FLOAT := 0.1;
  v_composite FLOAT;
  v_review_count INT;
BEGIN
  SELECT * INTO v_task FROM investigation_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN 0.0; END IF;

  -- 1. Belge tipi ağırlığı (court_record > leaked > social)
  IF v_task.task_data ? 'source_type' THEN
    CASE (v_task.task_data->>'source_type')
      WHEN 'court_record' THEN v_doc_type_weight := 0.95;
      WHEN 'official_document' THEN v_doc_type_weight := 0.90;
      WHEN 'structured_api' THEN v_doc_type_weight := 0.85;
      WHEN 'financial_record' THEN v_doc_type_weight := 0.80;
      WHEN 'witness_testimony' THEN v_doc_type_weight := 0.70;
      WHEN 'ai_extraction' THEN v_doc_type_weight := 0.50;
      WHEN 'leaked_document' THEN v_doc_type_weight := 0.45;
      WHEN 'social_connection' THEN v_doc_type_weight := 0.30;
      ELSE v_doc_type_weight := 0.50;
    END CASE;
  END IF;

  -- 2. Kaynak hiyerarşisi (primary > secondary > tertiary)
  IF v_task.context_data ? 'source_hierarchy' THEN
    CASE (v_task.context_data->>'source_hierarchy')
      WHEN 'primary' THEN v_source_hierarchy_weight := 0.95;
      WHEN 'secondary' THEN v_source_hierarchy_weight := 0.70;
      WHEN 'tertiary' THEN v_source_hierarchy_weight := 0.45;
      ELSE v_source_hierarchy_weight := 0.50;
    END CASE;
  END IF;

  -- 3. Doğrulama sayısı (daha çok reviewer = daha yüksek güven)
  SELECT COUNT(*) INTO v_review_count
  FROM task_assignments
  WHERE task_id = p_task_id AND current_phase = 'complete';

  v_verification_weight := LEAST(1.0, 0.3 + (v_review_count * 0.2));

  -- 4. Reviewer trust_weight ortalaması
  SELECT COALESCE(AVG(ip.trust_weight), 0.1) INTO v_trust_weight_avg
  FROM task_assignments ta
  JOIN investigator_profiles ip ON ip.fingerprint = ta.user_fingerprint
  WHERE ta.task_id = p_task_id AND ta.current_phase = 'complete';

  -- Composite: ağırlıklı ortalama
  v_composite := (
    v_doc_type_weight * 0.25 +
    v_source_hierarchy_weight * 0.20 +
    v_verification_weight * 0.30 +
    v_trust_weight_avg * 0.25
  );

  -- Güncelle
  UPDATE investigation_tasks
  SET composite_confidence = v_composite, updated_at = now()
  WHERE id = p_task_id;

  RETURN v_composite;
END;
$$;

-- 7.3: Spotlight direnci hesaplama
CREATE OR REPLACE FUNCTION update_spotlight_resistance(
  p_fingerprint TEXT
) RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_honeypot_score FLOAT := 0.5;
  v_no_spotlight_score FLOAT := 0.5;
  v_resistance FLOAT;
BEGIN
  SELECT * INTO v_profile FROM investigator_profiles WHERE fingerprint = p_fingerprint;
  IF NOT FOUND THEN RETURN 0.5; END IF;

  -- Minimum veri kontrolü (5 honeypot + 5 spotlight-yok)
  IF v_profile.honeypot_completed < 5 AND v_profile.no_spotlight_completed < 5 THEN
    RETURN 0.5; -- Nötr, yeterli veri yok
  END IF;

  -- Honeypot skoru: yanlış spotlight'ı reddetme oranı
  IF v_profile.honeypot_completed > 0 THEN
    v_honeypot_score := v_profile.honeypot_correct::float / v_profile.honeypot_completed::float;
  END IF;

  -- Spotlight-yok skoru: doğru bölgeyi bulma oranı
  IF v_profile.no_spotlight_completed > 0 THEN
    v_no_spotlight_score := v_profile.no_spotlight_correct::float / v_profile.no_spotlight_completed::float;
  END IF;

  -- Ağırlıklı: aktif direnç (0.7) > pasif buluş (0.3)
  v_resistance := v_honeypot_score * 0.7 + v_no_spotlight_score * 0.3;

  -- Güncelle
  UPDATE investigator_profiles
  SET spotlight_resistance = v_resistance, updated_at = now()
  WHERE fingerprint = p_fingerprint;

  RETURN v_resistance;
END;
$$;

-- 7.4: Reverification kuyruğuna ekleme
CREATE OR REPLACE FUNCTION schedule_reverification(
  p_target_type TEXT,
  p_target_id UUID,
  p_network_id UUID,
  p_trigger_type TEXT,
  p_trigger_source UUID DEFAULT NULL,
  p_priority INT DEFAULT 5,
  p_days_until INT DEFAULT 30
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO reverification_queue (
    target_type, target_id, network_id,
    trigger_type, trigger_source, priority,
    next_verification_at
  ) VALUES (
    p_target_type, p_target_id, p_network_id,
    p_trigger_type, p_trigger_source, p_priority,
    now() + (p_days_until || ' days')::interval
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 7.5: Koordineli saldırı tespiti
-- <5dk arayla aynı karara varan 2+ reviewer → flag
CREATE OR REPLACE FUNCTION check_coordinated_attack(
  p_task_id UUID,
  p_window_minutes INT DEFAULT 5
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suspicious BOOLEAN := FALSE;
  v_cluster_count INT;
BEGIN
  -- Aynı görevde, aynı karar, <5dk pencere
  SELECT COUNT(*) INTO v_cluster_count
  FROM task_assignments ta1
  JOIN task_assignments ta2 ON ta1.task_id = ta2.task_id
    AND ta1.id != ta2.id
    AND ta1.task_id = p_task_id
    AND (ta1.response->>'decision') = (ta2.response->>'decision')
    AND ABS(EXTRACT(EPOCH FROM (ta1.created_at - ta2.created_at))) < (p_window_minutes * 60);

  IF v_cluster_count >= 2 THEN
    v_suspicious := TRUE;

    -- Flag all involved reviewers
    INSERT INTO transparency_log (action_type, actor_type, action_data)
    VALUES (
      'behavior_flagged',
      'system',
      jsonb_build_object(
        'reason', 'coordinated_timing',
        'task_id', p_task_id,
        'window_minutes', p_window_minutes,
        'cluster_count', v_cluster_count
      )
    );
  END IF;

  RETURN v_suspicious;
END;
$$;

-- ============================================================================
-- 8. HALÜSÝNASYON ORANI KONTROLÜ
-- Bir taramadaki halüsinasyon >%20 → TAMAMI güvenilmez
-- ============================================================================

-- Scan güvenilirlik tablosu
CREATE TABLE IF NOT EXISTS scan_reliability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  network_id UUID NOT NULL,

  -- İstatistikler
  total_extractions INT NOT NULL DEFAULT 0,
  verified_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  hallucination_rate FLOAT,  -- rejected / total

  -- Durum
  is_reliable BOOLEAN NOT NULL DEFAULT TRUE,  -- false = tüm tarama güvenilmez
  flagged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_reliability_doc
  ON scan_reliability(document_id);

-- ============================================================================
-- 9. RLS POLİCİES
-- ============================================================================

-- Reverification queue: herkes okuyabilir, sadece sistem yazabilir
ALTER TABLE reverification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY reverification_select ON reverification_queue
  FOR SELECT USING (true);

-- Task corrections: herkes okuyabilir
ALTER TABLE task_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY corrections_select ON task_corrections
  FOR SELECT USING (true);

-- Task feedback: herkes yazabilir (anonim ihbar dahil), herkes okuyabilir
ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_select ON task_feedback
  FOR SELECT USING (true);

CREATE POLICY feedback_insert ON task_feedback
  FOR INSERT WITH CHECK (true);

-- Scan reliability: herkes okuyabilir
ALTER TABLE scan_reliability ENABLE ROW LEVEL SECURITY;

CREATE POLICY scan_reliability_select ON scan_reliability
  FOR SELECT USING (true);

-- ============================================================================
-- 10. TRANSPARENCY LOG — Yeni aksiyon tipleri ekleme
-- ============================================================================

-- Mevcut CHECK constraint'i güncelle (yeni aksiyonlar ekle)
-- NOT: Supabase'de ALTER CHECK doğrudan desteklenmeyebilir
-- Bu durumda constraint'i drop edip yeniden oluşturmak gerekir
-- Güvenli yol: yeni aksiyon tipleri eklenmesi gerekirse,
-- transparency_log.action_type CHECK'i kaldırılıp TEXT olarak bırakılabilir

-- ALTER TABLE transparency_log DROP CONSTRAINT IF EXISTS transparency_log_action_type_check;
-- Veya mevcut CHECK yeterli ise dokunma (task_created, task_reviewed vb. zaten var)

-- ============================================================================
-- TAMAMLANDI — Verification Desk v2 veritabanı hazır
-- ============================================================================
