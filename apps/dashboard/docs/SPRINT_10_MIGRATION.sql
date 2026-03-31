-- ═══════════════════════════════════════════
-- SPRINT 10: "İlk Temas" — Supabase Migration
-- İP UZAT: Proposed Links + Evidence + Votes
-- ═══════════════════════════════════════════

-- 1. Önerilen Bağlantılar (Hayalet İpler)
CREATE TABLE IF NOT EXISTS proposed_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID,                                    -- Hangi ağda
  source_id TEXT NOT NULL,                            -- Kaynak node ID
  target_id TEXT NOT NULL,                            -- Hedef node ID

  -- Bağlantı detayı
  relationship_type TEXT NOT NULL DEFAULT 'unknown',  -- financial, familial, organizational, criminal, etc.
  description TEXT NOT NULL,                          -- 100-500 karakter açıklama

  -- Öneren kişi
  proposer_fingerprint TEXT NOT NULL,
  proposer_badge_tier TEXT DEFAULT 'community',       -- Minimum tier: community

  -- Durum
  status TEXT NOT NULL DEFAULT 'pending_evidence',    -- pending_evidence | pending_vote | accepted | rejected | expired
  evidence_count INT DEFAULT 0,
  evidence_threshold INT DEFAULT 3,                   -- Kaç kanıt gerekli

  -- Oylama
  community_upvotes INT DEFAULT 0,
  community_downvotes INT DEFAULT 0,
  total_votes INT DEFAULT 0,

  -- İtibar stake
  reputation_staked FLOAT DEFAULT 0,

  -- İlk kanıt (opsiyonel)
  initial_evidence_url TEXT,
  initial_evidence_description TEXT,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')  -- 30 gün sonra expire
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_proposed_links_network ON proposed_links(network_id);
CREATE INDEX IF NOT EXISTS idx_proposed_links_status ON proposed_links(status);
CREATE INDEX IF NOT EXISTS idx_proposed_links_source ON proposed_links(source_id);
CREATE INDEX IF NOT EXISTS idx_proposed_links_target ON proposed_links(target_id);
CREATE INDEX IF NOT EXISTS idx_proposed_links_proposer ON proposed_links(proposer_fingerprint);
CREATE INDEX IF NOT EXISTS idx_proposed_links_active ON proposed_links(status)
  WHERE status IN ('pending_evidence', 'pending_vote');

-- 2. Öneriye Eklenen Kanıtlar
CREATE TABLE IF NOT EXISTS proposed_link_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_link_id UUID NOT NULL REFERENCES proposed_links(id) ON DELETE CASCADE,

  -- Katkıcı
  contributor_fingerprint TEXT NOT NULL,

  -- Kanıt detayı
  evidence_type TEXT NOT NULL DEFAULT 'document',     -- document, court_record, news_article, witness, financial_record, photo, video
  confidence_level FLOAT DEFAULT 0.5,                 -- 0.0-1.0
  source_url TEXT,                                     -- Kaynak URL
  description TEXT NOT NULL,                           -- Kanıt açıklaması

  -- İtibar stake
  reputation_staked FLOAT DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ple_link ON proposed_link_evidence(proposed_link_id);
CREATE INDEX IF NOT EXISTS idx_ple_contributor ON proposed_link_evidence(contributor_fingerprint);

-- Kullanıcı başına 1 kanıt limiti (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ple_unique_contributor
  ON proposed_link_evidence(proposed_link_id, contributor_fingerprint);

-- 3. Topluluk Oyları
CREATE TABLE IF NOT EXISTS proposed_link_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_link_id UUID NOT NULL REFERENCES proposed_links(id) ON DELETE CASCADE,

  -- Oy veren
  voter_fingerprint TEXT NOT NULL,
  vote_direction TEXT NOT NULL CHECK (vote_direction IN ('up', 'down')),  -- up=kabul, down=red
  vote_weight FLOAT DEFAULT 1.0,                      -- Tier'a göre ağırlık

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plv_link ON proposed_link_votes(proposed_link_id);
CREATE INDEX IF NOT EXISTS idx_plv_voter ON proposed_link_votes(voter_fingerprint);

-- Kullanıcı başına 1 oy limiti
CREATE UNIQUE INDEX IF NOT EXISTS idx_plv_unique_voter
  ON proposed_link_votes(proposed_link_id, voter_fingerprint);

-- 4. RLS Policies
ALTER TABLE proposed_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_link_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_link_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Proposed Links: Herkes okuyabilir, herkes ekleyebilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_links' AND policyname = 'proposed_links_read_all'
  ) THEN
    CREATE POLICY "proposed_links_read_all"
      ON proposed_links
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_links' AND policyname = 'proposed_links_insert_all'
  ) THEN
    CREATE POLICY "proposed_links_insert_all"
      ON proposed_links
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_links' AND policyname = 'proposed_links_update_all'
  ) THEN
    CREATE POLICY "proposed_links_update_all"
      ON proposed_links
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Evidence: Herkes okuyabilir, herkes ekleyebilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_link_evidence' AND policyname = 'ple_read_all'
  ) THEN
    CREATE POLICY "ple_read_all"
      ON proposed_link_evidence
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_link_evidence' AND policyname = 'ple_insert_all'
  ) THEN
    CREATE POLICY "ple_insert_all"
      ON proposed_link_evidence
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Votes: Herkes okuyabilir, herkes oy verebilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_link_votes' AND policyname = 'plv_read_all'
  ) THEN
    CREATE POLICY "plv_read_all"
      ON proposed_link_votes
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proposed_link_votes' AND policyname = 'plv_insert_all'
  ) THEN
    CREATE POLICY "plv_insert_all"
      ON proposed_link_votes
      FOR INSERT
      WITH CHECK (true);
  END IF;
END;
$$;

-- 5. Auto-expire fonksiyonu (opsiyonel — cron ile çağrılabilir)
-- Süresi dolan önerileri expired yap
CREATE OR REPLACE FUNCTION expire_proposed_links()
RETURNS void AS $$
BEGIN
  UPDATE proposed_links
  SET status = 'expired', updated_at = now()
  WHERE status IN ('pending_evidence', 'pending_vote')
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════
-- NOTLAR:
-- 1. Bu SQL'i Supabase Dashboard > SQL Editor'da calistirin
-- 2. proposed_links: Hayalet ipler (topluluk onerileri)
-- 3. proposed_link_evidence: Her oneriye eklenen kanitlar
-- 4. proposed_link_votes: Topluluk oylari (kabul/red)
-- 5. 30 gun sonra expire olan oneriler otomatik temizlenir
-- ═══════════════════════════════════════════
