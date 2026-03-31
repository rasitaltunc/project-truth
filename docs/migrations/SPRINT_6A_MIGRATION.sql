-- ============================================================
-- SPRINT 6A MIGRATION: Badge & Verification System
-- "Güven Altyapısı" — The Trust Foundation
-- Project Truth — March 2026
-- ============================================================
-- Run order:
--   1. Badge tier definitions (seeded)
--   2. New tables
--   3. Alter existing tables
--   4. RPC Functions
--   5. RLS Policies
--   6. Indexes
--   7. Initial seed data
-- ============================================================


-- ============================================================
-- STEP 1: BADGE TIER DEFINITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS badge_tiers (
  id TEXT PRIMARY KEY,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_tr TEXT,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  vote_weight NUMERIC DEFAULT 1,
  rate_limit_evidence_per_hour INT DEFAULT 1,
  rate_limit_votes_per_day INT DEFAULT 5,
  can_create_networks BOOLEAN DEFAULT false,
  can_verify_evidence BOOLEAN DEFAULT false,
  can_moderate BOOLEAN DEFAULT false,
  can_nominate BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  min_reputation_for_tier INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed badge tiers
INSERT INTO badge_tiers (id, name_tr, name_en, description_tr, color, icon, vote_weight, rate_limit_evidence_per_hour, rate_limit_votes_per_day, can_create_networks, can_verify_evidence, can_moderate, can_nominate, sort_order, min_reputation_for_tier)
VALUES
  ('anonymous',      'Anonim',           'Anonymous',            'Ağı incele, soru sor, temel oy kullan',                     '#6b7280', '👤', 1,   1,   5,   false, false, false, false, 1, 0),
  ('community',      'Platform Kurdu',   'Community Contributor','Katkılarıyla güven kazanmış topluluk üyesi',                '#f59e0b', '🐺', 2,   5,   20,  false, true,  true,  true,  2, 200),
  ('journalist',     'Gazeteci',         'Journalist/Researcher','Doğrulanmış gazeteci veya araştırmacı',                     '#8b5cf6', '🔍', 3,   999, 999, true,  true,  true,  true,  3, 0),
  ('institutional',  'Kurumsal',         'Institutional',        'Doğrulanmış kurum temsilcisi (OAuth ile otomatik yönetim)', '#22c55e', '🏛️', 5,   999, 999, true,  true,  true,  true,  4, 0)
ON CONFLICT (id) DO UPDATE SET
  name_tr = EXCLUDED.name_tr,
  color = EXCLUDED.color,
  vote_weight = EXCLUDED.vote_weight,
  can_create_networks = EXCLUDED.can_create_networks,
  can_verify_evidence = EXCLUDED.can_verify_evidence,
  can_moderate = EXCLUDED.can_moderate,
  can_nominate = EXCLUDED.can_nominate;


-- ============================================================
-- STEP 2: NEW TABLES
-- ============================================================

-- User badges (per-network scoped)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
  badge_tier TEXT NOT NULL DEFAULT 'anonymous' REFERENCES badge_tiers(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by TEXT,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  oauth_provider TEXT,
  oauth_org_id TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_fingerprint, network_id)
);

-- Global badge (network_id NULL = global)
CREATE TABLE IF NOT EXISTS user_global_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL UNIQUE,
  badge_tier TEXT NOT NULL DEFAULT 'anonymous' REFERENCES badge_tiers(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by TEXT,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  oauth_provider TEXT,
  oauth_org_id TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Peer nominations (for community tier)
CREATE TABLE IF NOT EXISTS badge_nominations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nominee_fingerprint TEXT NOT NULL,
  nominator_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(nominee_fingerprint, nominator_fingerprint, network_id)
);

-- Reputation ledger (immutable, append-only)
CREATE TABLE IF NOT EXISTS reputation_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'evidence_submit_stake',
    'evidence_verified',
    'evidence_disputed',
    'evidence_inconclusive_return',
    'vote_correct',
    'vote_wrong',
    'nomination_received',
    'first_discovery',
    'investigation_published',
    'daily_bonus',
    'moderation_confirmed',
    'slash_false_flag',
    'admin_adjustment'
  )),
  amount INT NOT NULL,
  staked_amount INT DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Verified organizations (for OAuth Tier 4)
CREATE TABLE IF NOT EXISTS verified_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  oauth_provider TEXT NOT NULL DEFAULT 'manual' CHECK (oauth_provider IN ('google', 'microsoft', 'manual')),
  oauth_config JSONB DEFAULT '{}',
  logo_url TEXT,
  website_url TEXT,
  org_type TEXT DEFAULT 'media' CHECK (org_type IN ('media', 'ngo', 'academic', 'legal', 'government', 'other')),
  is_active BOOLEAN DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rate limit tracking (per fingerprint per badge action)
CREATE TABLE IF NOT EXISTS badge_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('evidence_submit', 'vote')),
  window_start TIMESTAMPTZ NOT NULL,
  action_count INT DEFAULT 1,
  UNIQUE(user_fingerprint, action_type, window_start)
);


-- ============================================================
-- STEP 3: ALTER EXISTING TABLES
-- ============================================================

-- Add badge columns to truth_users
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS global_badge_tier TEXT DEFAULT 'anonymous' REFERENCES badge_tiers(id);
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS total_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS verified_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS first_active_at TIMESTAMPTZ;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS nomination_count INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS days_active INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Add staking columns to evidence_votes
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS staked_reputation INT DEFAULT 5;
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS resolution TEXT CHECK (resolution IN ('verified', 'disputed', 'inconclusive'));
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS badge_tier TEXT DEFAULT 'anonymous';


-- ============================================================
-- STEP 4: RPC FUNCTIONS
-- ============================================================

-- ── Get user's effective badge for a given network ──────────
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
  SELECT global_badge_tier INTO v_global_tier
  FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;

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

  -- Use highest tier (network overrides global only if higher)
  -- Order: institutional > journalist > community > anonymous
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


-- ── Record reputation transaction + update user score ────────
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
RETURNS INT  -- new reputation total
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

  -- Update user reputation
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


-- ── Submit evidence with reputation staking ──────────────────
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
  v_rate_ok BOOLEAN;
BEGIN
  -- Get user
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kullanıcı bulunamadı');
  END IF;

  -- Check reputation (must have at least stake amount to stake)
  IF v_user.reputation_score < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yeterli itibar puanı yok. En az ' || p_stake || ' puan gerekli.');
  END IF;

  -- Rate limit check (1/hour for anonymous)
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
    verification_status, submitted_by
  ) VALUES (
    p_node_id, p_title, p_evidence_type, p_source_url, p_description,
    'pending', p_fingerprint
  ) RETURNING id INTO v_evidence_id;

  -- Deduct stake
  PERFORM record_reputation(
    p_fingerprint,
    'evidence_submit_stake',
    -p_stake,
    v_evidence_id,
    'evidence',
    'Kanıt gönderme: ' || p_title,
    p_network_id,
    p_stake
  );

  -- Update user contributions count
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


-- ── Resolve evidence (verify/dispute) + apply slashing ───────
CREATE OR REPLACE FUNCTION resolve_evidence(
  p_evidence_id UUID,
  p_resolution TEXT,   -- 'verified' | 'disputed' | 'inconclusive'
  p_resolver_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_evidence evidence_archive%ROWTYPE;
  v_resolver truth_users%ROWTYPE;
  v_resolver_badge TEXT;
  v_submitter TEXT;
  v_staked INT;
  v_payout INT;
BEGIN
  -- Validate resolution value
  IF p_resolution NOT IN ('verified', 'disputed', 'inconclusive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Geçersiz karar');
  END IF;

  -- Get evidence
  SELECT * INTO v_evidence FROM evidence_archive WHERE id = p_evidence_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanıt bulunamadı');
  END IF;

  -- Get resolver's badge (must be community+)
  SELECT global_badge_tier INTO v_resolver_badge
  FROM truth_users WHERE anonymous_id = p_resolver_fingerprint;

  IF v_resolver_badge = 'anonymous' OR v_resolver_badge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kanıt doğrulamak için en az Platform Kurdu rozeti gerekli');
  END IF;

  -- Get submitter fingerprint
  v_submitter := v_evidence.submitted_by;

  -- Get staked amount from transactions
  SELECT COALESCE(ABS(amount), 5) INTO v_staked
  FROM reputation_transactions
  WHERE user_fingerprint = v_submitter
    AND reference_id = p_evidence_id
    AND transaction_type = 'evidence_submit_stake'
  ORDER BY created_at DESC
  LIMIT 1;

  v_staked := COALESCE(v_staked, 5);

  -- Update evidence status
  UPDATE evidence_archive
  SET verification_status = p_resolution, updated_at = now()
  WHERE id = p_evidence_id;

  -- Mark votes as resolved
  UPDATE evidence_votes
  SET resolved = true, resolution = p_resolution, resolved_at = now()
  WHERE evidence_id = p_evidence_id;

  -- Apply reputation consequences
  IF p_resolution = 'verified' THEN
    -- Submitter gets stake back + bonus (total +15)
    v_payout := v_staked + 10; -- return stake + 10 bonus
    PERFORM record_reputation(
      v_submitter, 'evidence_verified', v_payout,
      p_evidence_id, 'evidence', 'Kanıt doğrulandı: ' || COALESCE(v_evidence.title, '')
    );

    -- Resolver gets +3
    PERFORM record_reputation(
      p_resolver_fingerprint, 'moderation_confirmed', 3,
      p_evidence_id, 'evidence', 'Kanıt doğrulama kararı'
    );

    -- Update verified contributions count
    UPDATE truth_users
    SET verified_contributions = verified_contributions + 1,
        accuracy_rate = CASE
          WHEN total_contributions > 0
          THEN ROUND((verified_contributions + 1)::NUMERIC / total_contributions * 100, 1)
          ELSE 100
        END
    WHERE anonymous_id = v_submitter;

  ELSIF p_resolution = 'disputed' THEN
    -- Submitter loses stake + penalty (total -10 net effect: already lost 5, now -5 more)
    PERFORM record_reputation(
      v_submitter, 'evidence_disputed', -5,
      p_evidence_id, 'evidence', 'Kanıt reddedildi: ' || COALESCE(v_evidence.title, '')
    );

    -- Update accuracy rate
    UPDATE truth_users
    SET accuracy_rate = CASE
          WHEN total_contributions > 0
          THEN ROUND(verified_contributions::NUMERIC / total_contributions * 100, 1)
          ELSE 0
        END
    WHERE anonymous_id = v_submitter;

    -- Check for repeat offenders (3+ slashes in 30 days → demote)
    IF (
      SELECT COUNT(*) FROM reputation_transactions
      WHERE user_fingerprint = v_submitter
        AND transaction_type = 'evidence_disputed'
        AND created_at > now() - INTERVAL '30 days'
    ) >= 3 THEN
      UPDATE truth_users
      SET global_badge_tier = 'anonymous'
      WHERE anonymous_id = v_submitter AND global_badge_tier = 'community';

      UPDATE user_global_badges
      SET badge_tier = 'anonymous',
          revoked_at = now(),
          revocation_reason = '30 günde 3+ kanıt reddi'
      WHERE user_fingerprint = v_submitter AND is_active = true;
    END IF;

  ELSE -- inconclusive
    -- Return stake, no penalty/bonus
    PERFORM record_reputation(
      v_submitter, 'evidence_inconclusive_return', v_staked,
      p_evidence_id, 'evidence', 'Kararsız karar — stake iade edildi'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'resolution', p_resolution,
    'staked', v_staked,
    'submitter', v_submitter
  );
END;
$$;


-- ── Nominate user for community tier ─────────────────────────
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
  -- Nominator must be community+
  SELECT global_badge_tier INTO v_nominator_badge
  FROM truth_users WHERE anonymous_id = p_nominator_fingerprint;

  IF v_nominator_badge NOT IN ('community', 'journalist', 'institutional') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aday göstermek için en az Platform Kurdu rozeti gerekli');
  END IF;

  -- Cannot self-nominate
  IF p_nominator_fingerprint = p_nominee_fingerprint THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinizi aday gösteremezsiniz');
  END IF;

  -- Reason must be substantial
  IF LENGTH(TRIM(p_reason)) < 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gerekçe en az 30 karakter olmalı');
  END IF;

  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM badge_nominations
    WHERE nominee_fingerprint = p_nominee_fingerprint
      AND nominator_fingerprint = p_nominator_fingerprint
      AND (network_id = p_network_id OR (network_id IS NULL AND p_network_id IS NULL))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bu kullanıcıyı zaten aday gösterdiniz');
  END IF;

  -- Insert nomination
  INSERT INTO badge_nominations (nominee_fingerprint, nominator_fingerprint, network_id, reason)
  VALUES (p_nominee_fingerprint, p_nominator_fingerprint, p_network_id, p_reason);

  -- Give nominee +10 reputation for nomination received
  PERFORM record_reputation(
    p_nominee_fingerprint, 'nomination_received', 10,
    NULL, NULL,
    p_nominator_fingerprint || ' tarafından aday gösterildiniz',
    p_network_id
  );

  -- Update nomination count
  UPDATE truth_users
  SET nomination_count = nomination_count + 1
  WHERE anonymous_id = p_nominee_fingerprint;

  -- Check promotion eligibility
  PERFORM check_and_promote_badge(p_nominee_fingerprint, p_network_id);

  -- Count total nominations for this nominee in this network
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


-- ── Check and auto-promote to community tier ─────────────────
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
  -- Get user
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('promoted', false); END IF;

  v_current_tier := COALESCE(v_user.global_badge_tier, 'anonymous');

  -- Only check for community promotion (journalist/institutional are manual)
  IF v_current_tier != 'anonymous' THEN
    RETURN jsonb_build_object('promoted', false, 'current_tier', v_current_tier);
  END IF;

  -- Count valid nominations
  SELECT COUNT(*) INTO v_nomination_count
  FROM badge_nominations bn
  JOIN truth_users tu ON tu.anonymous_id = bn.nominator_fingerprint
  WHERE bn.nominee_fingerprint = p_fingerprint
    AND bn.status = 'pending'
    AND (bn.network_id = p_network_id OR p_network_id IS NULL)
    AND tu.global_badge_tier IN ('community', 'journalist', 'institutional');

  -- Check all thresholds
  IF (
    v_user.reputation_score >= 200 AND
    v_user.verified_contributions >= 50 AND
    COALESCE(v_user.accuracy_rate, 0) >= 80 AND
    COALESCE(v_user.days_active, 0) >= 90 AND
    v_nomination_count >= 3
  ) THEN
    -- Promote!
    UPDATE truth_users
    SET global_badge_tier = 'community'
    WHERE anonymous_id = p_fingerprint;

    INSERT INTO user_global_badges (user_fingerprint, badge_tier, granted_by)
    VALUES (p_fingerprint, 'community', 'system_auto_promotion')
    ON CONFLICT (user_fingerprint) DO UPDATE
    SET badge_tier = 'community', granted_at = now(), granted_by = 'system_auto_promotion', is_active = true;

    -- Accept all pending nominations
    UPDATE badge_nominations
    SET status = 'accepted', resolved_at = now()
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


-- ── Get reputation leaderboard ────────────────────────────────
CREATE OR REPLACE FUNCTION get_reputation_leaderboard(
  p_network_id UUID DEFAULT NULL,
  p_period TEXT DEFAULT 'all',  -- 'week', 'month', 'all'
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


-- ── Get reputation history for a user ────────────────────────
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


-- ── Get user badge tier check (for API) ──────────────────────
CREATE OR REPLACE FUNCTION get_or_init_user_badge(
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user truth_users%ROWTYPE;
  v_badge TEXT;
BEGIN
  SELECT * INTO v_user FROM truth_users WHERE anonymous_id = p_fingerprint LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'badge_tier', 'anonymous',
      'reputation', 0,
      'accuracy', 0,
      'contributions', 0,
      'verified_contributions', 0,
      'nominations', 0
    );
  END IF;

  -- Update days_active
  UPDATE truth_users
  SET
    days_active = GREATEST(
      COALESCE(days_active, 0),
      CASE
        WHEN first_active_at IS NOT NULL
        THEN EXTRACT(DAY FROM now() - first_active_at)::INT
        ELSE 0
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
-- STEP 5: RLS POLICIES
-- ============================================================

-- badge_tiers: anyone can read, no user writes
ALTER TABLE badge_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badge_tiers_public_read ON badge_tiers;
CREATE POLICY badge_tiers_public_read ON badge_tiers FOR SELECT USING (true);

-- user_badges: anyone can read, system writes via RPC
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_badges_public_read ON user_badges;
CREATE POLICY user_badges_public_read ON user_badges FOR SELECT USING (true);

-- user_global_badges: anyone can read
ALTER TABLE user_global_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_global_badges_public_read ON user_global_badges;
CREATE POLICY user_global_badges_public_read ON user_global_badges FOR SELECT USING (true);

-- badge_nominations: anyone can read, authenticated insert (via RPC)
ALTER TABLE badge_nominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badge_nominations_public_read ON badge_nominations;
CREATE POLICY badge_nominations_public_read ON badge_nominations FOR SELECT USING (true);

-- reputation_transactions: anyone can read (public transparency)
ALTER TABLE reputation_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reputation_transactions_public_read ON reputation_transactions;
CREATE POLICY reputation_transactions_public_read ON reputation_transactions FOR SELECT USING (true);

-- verified_organizations: anyone can read
ALTER TABLE verified_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verified_orgs_public_read ON verified_organizations;
CREATE POLICY verified_orgs_public_read ON verified_organizations FOR SELECT USING (true);


-- ============================================================
-- STEP 6: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_badges_fingerprint ON user_badges(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_badges_network ON user_badges(network_id);
CREATE INDEX IF NOT EXISTS idx_user_global_badges_fingerprint ON user_global_badges(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_nominee ON badge_nominations(nominee_fingerprint);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_nominator ON badge_nominations(nominator_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_fingerprint ON reputation_transactions(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_created ON reputation_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_type ON reputation_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_truth_users_badge_tier ON truth_users(global_badge_tier);
CREATE INDEX IF NOT EXISTS idx_truth_users_reputation ON truth_users(reputation_score DESC);


-- ============================================================
-- STEP 7: GRANT RPC ACCESS (PostgREST schema cache)
-- ============================================================

GRANT EXECUTE ON FUNCTION get_user_badge(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_reputation(TEXT, TEXT, INT, UUID, TEXT, TEXT, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION submit_staked_evidence(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_evidence(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION nominate_for_community(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_promote_badge(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_reputation_leaderboard(UUID, TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reputation_history(TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_init_user_badge(TEXT) TO anon, authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- MIGRATION COMPLETE
-- Run verification:
--   SELECT COUNT(*) FROM badge_tiers;  -- should be 4
--   SELECT id, name_tr, color FROM badge_tiers ORDER BY sort_order;
-- ============================================================
