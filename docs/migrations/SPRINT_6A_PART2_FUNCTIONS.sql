-- ============================================================
-- SPRINT 6A — PART 2: RPC FUNCTIONS
-- Supabase SQL Editor'de çalıştır
-- Sıra: PART 1 başarılı olduktan SONRA çalıştır
-- ============================================================


-- ── 1. GET USER BADGE ───────────────────────────────────────
-- Kullanıcının efektif badge'ini getirir (global vs network)

CREATE OR REPLACE FUNCTION get_user_badge(
  p_fingerprint TEXT,
  p_network_id UUID DEFAULT NULL
)
RETURNS TABLE(
  badge_tier TEXT,
  badge_name_tr TEXT,
  badge_color TEXT,
  badge_icon TEXT,
  vote_weight NUMERIC,
  can_create_networks BOOLEAN,
  can_verify_evidence BOOLEAN,
  can_moderate BOOLEAN,
  can_nominate BOOLEAN,
  reputation INT,
  accuracy NUMERIC,
  contributions INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tier TEXT;
  v_global_tier TEXT;
  v_net_tier TEXT;
BEGIN
  -- Get global badge
  SELECT tu.global_badge_tier INTO v_global_tier
  FROM truth_users tu WHERE tu.anonymous_id = p_fingerprint LIMIT 1;

  v_global_tier := COALESCE(v_global_tier, 'anonymous');

  -- Get network-specific badge if requested
  IF p_network_id IS NOT NULL THEN
    SELECT ub.badge_tier INTO v_net_tier
    FROM user_badges ub
    WHERE ub.user_fingerprint = p_fingerprint
      AND ub.network_id = p_network_id
      AND ub.is_active = true
    LIMIT 1;
  END IF;

  -- Use highest tier
  v_tier := CASE
    WHEN v_net_tier = 'institutional' OR v_global_tier = 'institutional' THEN 'institutional'
    WHEN v_net_tier = 'journalist'    OR v_global_tier = 'journalist'    THEN 'journalist'
    WHEN v_net_tier = 'community'     OR v_global_tier = 'community'     THEN 'community'
    ELSE 'anonymous'
  END;

  RETURN QUERY
  SELECT
    bt.id,
    bt.name_tr,
    bt.color,
    bt.icon,
    bt.vote_weight,
    bt.can_create_networks,
    bt.can_verify_evidence,
    bt.can_moderate,
    bt.can_nominate,
    COALESCE(tu.reputation_score, 0)::INT,
    COALESCE(tu.accuracy_rate, 0)::NUMERIC,
    COALESCE(tu.total_contributions, 0)::INT
  FROM badge_tiers bt
  LEFT JOIN truth_users tu ON tu.anonymous_id = p_fingerprint
  WHERE bt.id = v_tier;
END;
$$;


-- ── 2. RECORD REPUTATION ───────────────────────────────────
-- Transaction kaydeder + kullanıcı skorunu günceller

CREATE OR REPLACE FUNCTION record_reputation(
  p_fingerprint TEXT,
  p_type TEXT,
  p_amount INT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_network_id UUID DEFAULT NULL,
  p_staked INT DEFAULT 0
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_reputation INT;
BEGIN
  -- Insert transaction record
  INSERT INTO reputation_transactions (
    user_fingerprint, network_id, transaction_type, amount,
    staked_amount, reference_id, reference_type, description
  ) VALUES (
    p_fingerprint, p_network_id, p_type, p_amount,
    p_staked, p_reference_id, p_reference_type, p_description
  );

  -- Update user reputation (floor at 0)
  UPDATE truth_users
  SET
    reputation_score = GREATEST(0, reputation_score + p_amount),
    last_active_at = now()
  WHERE anonymous_id = p_fingerprint;

  -- Get new total
  SELECT reputation_score INTO v_new_reputation
  FROM truth_users WHERE anonymous_id = p_fingerprint;

  -- Check tier auto-promotion
  PERFORM check_and_promote_badge(p_fingerprint, p_network_id);

  RETURN COALESCE(v_new_reputation, 0);
END;
$$;


-- ── 3. SUBMIT STAKED EVIDENCE ──────────────────────────────
-- Kanıt gönderir, reputation stake eder

CREATE OR REPLACE FUNCTION submit_staked_evidence(
  p_fingerprint TEXT,
  p_node_id UUID,
  p_title TEXT,
  p_evidence_type TEXT,
  p_source_url TEXT,
  p_description TEXT,
  p_network_id UUID DEFAULT NULL,
  p_stake INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user truth_users%ROWTYPE;
  v_badge_tier TEXT;
  v_evidence_id UUID;
BEGIN
  -- Get user
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kullanıcı bulunamadı');
  END IF;

  -- Check reputation
  IF v_user.reputation_score < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yeterli itibar puanı yok. En az ' || p_stake || ' puan gerekli.');
  END IF;

  -- Rate limit check (anonymous = 1/hour)
  v_badge_tier := COALESCE(v_user.global_badge_tier, 'anonymous');
  IF v_badge_tier = 'anonymous' THEN
    IF EXISTS (
      SELECT 1 FROM reputation_transactions
      WHERE user_fingerprint = p_fingerprint
        AND transaction_type = 'evidence_submit_stake'
        AND created_at > now() - INTERVAL '1 hour'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Saatlik kanıt gönderme limitine ulaştınız (1/saat)');
    END IF;
  END IF;

  -- Insert evidence
  INSERT INTO evidence_archive (
    node_id, title, evidence_type, source_url, description,
    verification_status, submitted_by, staked_reputation
  ) VALUES (
    p_node_id, p_title, p_evidence_type, p_source_url, p_description,
    'pending', p_fingerprint, p_stake
  ) RETURNING id INTO v_evidence_id;

  -- Deduct stake via record_reputation
  PERFORM record_reputation(
    p_fingerprint, 'evidence_submit_stake', -p_stake,
    v_evidence_id, 'evidence',
    'Kanıt gönderme: ' || p_title,
    p_network_id, p_stake
  );

  -- Update contribution count
  UPDATE truth_users
  SET total_contributions = total_contributions + 1
  WHERE anonymous_id = p_fingerprint;

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', v_evidence_id,
    'staked', p_stake,
    'message', 'Kanıtınız gönderildi. Doğrulanırsa +15, reddedilirse -10 puan.'
  );
END;
$$;


-- ── 4. RESOLVE EVIDENCE ────────────────────────────────────
-- Kanıtı doğrula/reddet + slashing ekonomisi uygula

CREATE OR REPLACE FUNCTION resolve_evidence(
  p_evidence_id UUID,
  p_resolution TEXT,
  p_resolver_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_evidence evidence_archive%ROWTYPE;
  v_resolver_badge TEXT;
  v_submitter TEXT;
  v_staked INT;
  v_payout INT;
BEGIN
  -- Validate resolution
  IF p_resolution NOT IN ('verified', 'disputed', 'inconclusive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Geçersiz karar');
  END IF;

  -- Get evidence
  SELECT * INTO v_evidence FROM evidence_archive WHERE id = p_evidence_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanıt bulunamadı');
  END IF;

  -- Resolver must be community+
  SELECT global_badge_tier INTO v_resolver_badge
  FROM truth_users WHERE anonymous_id = p_resolver_fingerprint;

  IF v_resolver_badge = 'anonymous' OR v_resolver_badge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanıt doğrulamak için en az Platform Kurdu rozeti gerekli');
  END IF;

  v_submitter := v_evidence.submitted_by;

  -- Get staked amount
  SELECT COALESCE(ABS(amount), 5) INTO v_staked
  FROM reputation_transactions
  WHERE user_fingerprint = v_submitter
    AND reference_id = p_evidence_id
    AND transaction_type = 'evidence_submit_stake'
  ORDER BY created_at DESC LIMIT 1;

  v_staked := COALESCE(v_staked, 5);

  -- Update evidence status
  UPDATE evidence_archive
  SET verification_status = p_resolution, updated_at = now()
  WHERE id = p_evidence_id;

  -- Mark related votes as resolved
  UPDATE evidence_votes
  SET resolved = true, resolution = p_resolution, resolved_at = now()
  WHERE evidence_id = p_evidence_id;

  -- Apply reputation consequences
  IF p_resolution = 'verified' THEN
    v_payout := v_staked + 10;
    PERFORM record_reputation(
      v_submitter, 'evidence_verified', v_payout,
      p_evidence_id, 'evidence', 'Kanıt doğrulandı: ' || COALESCE(v_evidence.title, '')
    );
    PERFORM record_reputation(
      p_resolver_fingerprint, 'moderation_confirmed', 3,
      p_evidence_id, 'evidence', 'Kanıt doğrulama kararı'
    );
    UPDATE truth_users
    SET verified_contributions = verified_contributions + 1,
        accuracy_rate = CASE
          WHEN total_contributions > 0
          THEN ROUND((verified_contributions + 1)::NUMERIC / total_contributions * 100, 1)
          ELSE 100
        END
    WHERE anonymous_id = v_submitter;

  ELSIF p_resolution = 'disputed' THEN
    PERFORM record_reputation(
      v_submitter, 'evidence_disputed', -5,
      p_evidence_id, 'evidence', 'Kanıt reddedildi: ' || COALESCE(v_evidence.title, '')
    );
    UPDATE truth_users
    SET accuracy_rate = CASE
          WHEN total_contributions > 0
          THEN ROUND(verified_contributions::NUMERIC / total_contributions * 100, 1)
          ELSE 0
        END
    WHERE anonymous_id = v_submitter;

    -- 30 günde 3+ slash → demote
    IF (
      SELECT COUNT(*) FROM reputation_transactions
      WHERE user_fingerprint = v_submitter
        AND transaction_type = 'evidence_disputed'
        AND created_at > now() - INTERVAL '30 days'
    ) >= 3 THEN
      UPDATE truth_users SET global_badge_tier = 'anonymous'
      WHERE anonymous_id = v_submitter AND global_badge_tier = 'community';
      UPDATE user_global_badges
      SET badge_tier = 'anonymous', revoked_at = now(),
          revocation_reason = '30 günde 3+ kanıt reddi'
      WHERE user_fingerprint = v_submitter AND is_active = true;
    END IF;

  ELSE -- inconclusive
    PERFORM record_reputation(
      v_submitter, 'evidence_inconclusive_return', v_staked,
      p_evidence_id, 'evidence', 'Kararsız karar — stake iade edildi'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'resolution', p_resolution,
    'staked', v_staked, 'submitter', v_submitter
  );
END;
$$;


-- ── 5. NOMINATE FOR COMMUNITY ──────────────────────────────

CREATE OR REPLACE FUNCTION nominate_for_community(
  p_nominator_fingerprint TEXT,
  p_nominee_fingerprint TEXT,
  p_network_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nominator_badge TEXT;
  v_existing_count INT;
BEGIN
  SELECT global_badge_tier INTO v_nominator_badge
  FROM truth_users WHERE anonymous_id = p_nominator_fingerprint;

  IF v_nominator_badge NOT IN ('community', 'journalist', 'institutional') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aday göstermek için en az Platform Kurdu rozeti gerekli');
  END IF;

  IF p_nominator_fingerprint = p_nominee_fingerprint THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinizi aday gösteremezsiniz');
  END IF;

  IF LENGTH(TRIM(p_reason)) < 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gerekçe en az 30 karakter olmalı');
  END IF;

  IF EXISTS (
    SELECT 1 FROM badge_nominations
    WHERE nominee_fingerprint = p_nominee_fingerprint
      AND nominator_fingerprint = p_nominator_fingerprint
      AND (network_id = p_network_id OR (network_id IS NULL AND p_network_id IS NULL))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bu kullanıcıyı zaten aday gösterdiniz');
  END IF;

  INSERT INTO badge_nominations (nominee_fingerprint, nominator_fingerprint, network_id, reason)
  VALUES (p_nominee_fingerprint, p_nominator_fingerprint, p_network_id, p_reason);

  PERFORM record_reputation(
    p_nominee_fingerprint, 'nomination_received', 10,
    NULL, NULL, p_nominator_fingerprint || ' tarafından aday gösterildiniz', p_network_id
  );

  UPDATE truth_users SET nomination_count = nomination_count + 1
  WHERE anonymous_id = p_nominee_fingerprint;

  PERFORM check_and_promote_badge(p_nominee_fingerprint, p_network_id);

  SELECT COUNT(*) INTO v_existing_count
  FROM badge_nominations
  WHERE nominee_fingerprint = p_nominee_fingerprint
    AND (network_id = p_network_id OR (network_id IS NULL AND p_network_id IS NULL))
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'nomination_count', v_existing_count,
    'message', 'Adaylık kaydedildi. ' || v_existing_count || '/3 aday gösterme tamamlandı.'
  );
END;
$$;


-- ── 6. CHECK AND PROMOTE BADGE ─────────────────────────────

CREATE OR REPLACE FUNCTION check_and_promote_badge(
  p_fingerprint TEXT,
  p_network_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user truth_users%ROWTYPE;
  v_nomination_count INT;
  v_current_tier TEXT;
  v_promoted BOOLEAN := false;
BEGIN
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('promoted', false); END IF;

  v_current_tier := COALESCE(v_user.global_badge_tier, 'anonymous');

  IF v_current_tier != 'anonymous' THEN
    RETURN jsonb_build_object('promoted', false, 'current_tier', v_current_tier);
  END IF;

  SELECT COUNT(*) INTO v_nomination_count
  FROM badge_nominations bn
  JOIN truth_users tu ON tu.anonymous_id = bn.nominator_fingerprint
  WHERE bn.nominee_fingerprint = p_fingerprint
    AND bn.status = 'pending'
    AND (bn.network_id = p_network_id OR p_network_id IS NULL)
    AND tu.global_badge_tier IN ('community', 'journalist', 'institutional');

  IF (
    v_user.reputation_score >= 200 AND
    v_user.verified_contributions >= 50 AND
    COALESCE(v_user.accuracy_rate, 0) >= 80 AND
    COALESCE(v_user.days_active, 0) >= 90 AND
    v_nomination_count >= 3
  ) THEN
    UPDATE truth_users SET global_badge_tier = 'community'
    WHERE anonymous_id = p_fingerprint;

    INSERT INTO user_global_badges (user_fingerprint, badge_tier, granted_by)
    VALUES (p_fingerprint, 'community', 'system_auto_promotion')
    ON CONFLICT (user_fingerprint) DO UPDATE
    SET badge_tier = 'community', granted_at = now(), granted_by = 'system_auto_promotion', is_active = true;

    UPDATE badge_nominations SET status = 'accepted', resolved_at = now()
    WHERE nominee_fingerprint = p_fingerprint AND status = 'pending';

    v_promoted := true;
  END IF;

  RETURN jsonb_build_object(
    'promoted', v_promoted,
    'current_tier', CASE WHEN v_promoted THEN 'community' ELSE v_current_tier END,
    'reputation', v_user.reputation_score,
    'verified_contributions', v_user.verified_contributions,
    'accuracy_rate', COALESCE(v_user.accuracy_rate, 0),
    'days_active', COALESCE(v_user.days_active, 0),
    'nominations', v_nomination_count
  );
END;
$$;


-- ── 7. LEADERBOARD ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_reputation_leaderboard(
  p_network_id UUID DEFAULT NULL,
  p_period TEXT DEFAULT 'all',
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  rank BIGINT,
  fingerprint TEXT,
  display_name TEXT,
  badge_tier TEXT,
  badge_icon TEXT,
  badge_color TEXT,
  reputation INT,
  accuracy NUMERIC,
  verified_contributions INT,
  total_contributions INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  v_since := CASE p_period
    WHEN 'week'  THEN now() - INTERVAL '7 days'
    WHEN 'month' THEN now() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY tu.reputation_score DESC) AS rank,
    tu.anonymous_id AS fingerprint,
    COALESCE(tu.display_name, SPLIT_PART(tu.anonymous_id, '_', 1)) AS display_name,
    COALESCE(tu.global_badge_tier, 'anonymous') AS badge_tier,
    bt.icon AS badge_icon,
    bt.color AS badge_color,
    COALESCE(tu.reputation_score, 0)::INT AS reputation,
    COALESCE(tu.accuracy_rate, 0)::NUMERIC AS accuracy,
    COALESCE(tu.verified_contributions, 0)::INT AS verified_contributions,
    COALESCE(tu.total_contributions, 0)::INT AS total_contributions
  FROM truth_users tu
  LEFT JOIN badge_tiers bt ON bt.id = COALESCE(tu.global_badge_tier, 'anonymous')
  WHERE tu.reputation_score > 0
    AND tu.last_active_at >= v_since
  ORDER BY tu.reputation_score DESC
  LIMIT p_limit;
END;
$$;


-- ── 8. REPUTATION HISTORY ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_reputation_history(
  p_fingerprint TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  transaction_type TEXT,
  amount INT,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ,
  running_total BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.transaction_type,
    rt.amount,
    rt.description,
    rt.reference_id,
    rt.reference_type,
    rt.created_at,
    SUM(rt.amount) OVER (
      PARTITION BY rt.user_fingerprint
      ORDER BY rt.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
  FROM reputation_transactions rt
  WHERE rt.user_fingerprint = p_fingerprint
  ORDER BY rt.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


-- ── 9. GET OR INIT USER BADGE ──────────────────────────────

CREATE OR REPLACE FUNCTION get_or_init_user_badge(
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user truth_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'badge_tier', 'anonymous', 'reputation', 0, 'accuracy', 0,
      'contributions', 0, 'verified_contributions', 0, 'nominations', 0
    );
  END IF;

  UPDATE truth_users
  SET
    days_active = GREATEST(
      COALESCE(days_active, 0),
      CASE WHEN first_active_at IS NOT NULL
        THEN EXTRACT(DAY FROM now() - first_active_at)::INT ELSE 0
      END
    ),
    first_active_at = COALESCE(first_active_at, now()),
    last_active_at = now()
  WHERE anonymous_id = p_fingerprint;

  RETURN jsonb_build_object(
    'badge_tier', COALESCE(v_user.global_badge_tier, 'anonymous'),
    'reputation', COALESCE(v_user.reputation_score, 0),
    'accuracy', COALESCE(v_user.accuracy_rate, 0),
    'contributions', COALESCE(v_user.total_contributions, 0),
    'verified_contributions', COALESCE(v_user.verified_contributions, 0),
    'nominations', COALESCE(v_user.nomination_count, 0),
    'days_active', COALESCE(v_user.days_active, 0)
  );
END;
$$;


-- ============================================================
-- PART 2 TAMAMLANDI
-- Doğrulama:
--   SELECT proname FROM pg_proc WHERE proname LIKE '%badge%' OR proname LIKE '%reputation%' OR proname LIKE '%evidence%';
-- ============================================================
