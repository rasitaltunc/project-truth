-- ============================================================
-- SPRINT 6A — PART 1: TABLES + SEED DATA
-- Supabase SQL Editor'de çalıştır
-- Sıra: Bu dosya İLK çalışır
-- ============================================================


-- ─── 1. BADGE TIER DEFINITIONS ─────────────────────────────

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

-- Seed 4 tiers
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


-- ─── 2. USER BADGES (per-network scoped) ───────────────────

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


-- ─── 3. GLOBAL BADGES ──────────────────────────────────────

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


-- ─── 4. PEER NOMINATIONS ───────────────────────────────────

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


-- ─── 5. REPUTATION TRANSACTIONS (append-only ledger) ───────

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


-- ─── 6. EVIDENCE VOTES (YENİ — bu tablo eksikti!) ──────────
-- Kanıt oylama tablosu. Badge sistemiyle entegre çalışır.
-- Kullanıcılar kanıtlara oy verir, stake edilir, çözümlenir.

CREATE TABLE IF NOT EXISTS evidence_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id UUID REFERENCES evidence_archive(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('verify', 'dispute', 'flag')),
  badge_tier TEXT DEFAULT 'anonymous' REFERENCES badge_tiers(id),
  vote_weight NUMERIC DEFAULT 1,
  staked_reputation INT DEFAULT 5,
  resolved BOOLEAN DEFAULT false,
  resolution TEXT CHECK (resolution IN ('verified', 'disputed', 'inconclusive')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(evidence_id, voter_fingerprint)
);


-- ─── 7. VERIFIED ORGANIZATIONS (OAuth Tier 4 için) ─────────

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


-- ─── 8. RATE LIMIT TRACKING ────────────────────────────────

CREATE TABLE IF NOT EXISTS badge_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('evidence_submit', 'vote')),
  window_start TIMESTAMPTZ NOT NULL,
  action_count INT DEFAULT 1,
  UNIQUE(user_fingerprint, action_type, window_start)
);


-- ─── 9. ALTER EXISTING TABLES ───────────────────────────────

-- truth_users'a badge kolonları ekle
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS global_badge_tier TEXT DEFAULT 'anonymous' REFERENCES badge_tiers(id);
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS total_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS verified_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS first_active_at TIMESTAMPTZ;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS nomination_count INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS days_active INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- evidence_archive'a submitted_by kolonu ekle (yoksa)
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS staked_reputation INT DEFAULT 0;


-- ============================================================
-- PART 1 TAMAMLANDI
-- Doğrulama:
--   SELECT COUNT(*) FROM badge_tiers;  -- 4 olmalı
--   SELECT id, name_tr, color FROM badge_tiers ORDER BY sort_order;
-- ============================================================
