-- ============================================================
-- PROJECT TRUTH: SPRINT 4 MIGRATION
-- "Soruşturma Dosyası" (Investigation System)
-- ============================================================
-- Supabase Dashboard → SQL Editor → Bu dosyayı çalıştır
-- ============================================================

-- ============================================================
-- 0. NETWORKS TABLE (henüz yoksa oluştur)
-- ============================================================
CREATE TABLE IF NOT EXISTS networks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  owner_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Epstein ağını varsayılan ağ olarak ekle (zaten yoksa)
INSERT INTO networks (name, slug, description, is_public)
VALUES ('Epstein Network', 'epstein-network', 'Jeffrey Epstein suç ağı — ilk soruşturma vakası', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 1. INVESTIGATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investigations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonim Araştırmacı',
  author_fingerprint TEXT,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  parent_id UUID REFERENCES investigations(id) ON DELETE SET NULL,
  fork_count INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  significance_score FLOAT NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Index for feed queries
CREATE INDEX IF NOT EXISTS investigations_status_score_idx
  ON investigations(status, significance_score DESC);
CREATE INDEX IF NOT EXISTS investigations_parent_idx
  ON investigations(parent_id);
CREATE INDEX IF NOT EXISTS investigations_fingerprint_idx
  ON investigations(author_fingerprint);

-- ============================================================
-- 2. INVESTIGATION_STEPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investigation_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  highlight_node_ids TEXT[] DEFAULT '{}',
  highlight_link_ids TEXT[] DEFAULT '{}',
  annotations JSONB DEFAULT '{}',
  node_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS investigation_steps_inv_idx
  ON investigation_steps(investigation_id, step_order);

-- ============================================================
-- 3. INVESTIGATION_VOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investigation_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'spotlight')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investigation_id, voter_fingerprint)
);

CREATE INDEX IF NOT EXISTS investigation_votes_inv_idx
  ON investigation_votes(investigation_id);

-- ============================================================
-- 4. NODE_QUERY_STATS TABLE
-- (Sprint 5'te populate edilecek, şimdi tablo kuruluyor)
-- ============================================================
CREATE TABLE IF NOT EXISTS node_query_stats (
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE PRIMARY KEY,
  highlight_count INTEGER NOT NULL DEFAULT 0,
  annotation_counts JSONB NOT NULL DEFAULT '{}',
  unique_investigators INTEGER NOT NULL DEFAULT 0,
  last_queried_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. SIGNIFICANCE SCORE FUNCTION
-- significance_score = (step_count * 2) + (fork_count * 5) + (upvote_count * 1) + (view_count * 0.1)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_significance_score(
  p_step_count INTEGER,
  p_fork_count INTEGER,
  p_upvote_count INTEGER,
  p_view_count INTEGER
) RETURNS FLOAT AS $$
BEGIN
  RETURN (p_step_count * 2.0) + (p_fork_count * 5.0) + (p_upvote_count * 1.0) + (p_view_count * 0.1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 6. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investigations_updated_at
  BEFORE UPDATE ON investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_query_stats ENABLE ROW LEVEL SECURITY;

-- INVESTIGATIONS: SELECT — herkes published olanları görebilir, kendi draft'larını da
CREATE POLICY "investigations_select_published"
  ON investigations FOR SELECT
  USING (status = 'published' OR author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

-- INVESTIGATIONS: INSERT — herkes oluşturabilir (fingerprint ile)
CREATE POLICY "investigations_insert_all"
  ON investigations FOR INSERT
  WITH CHECK (true);

-- INVESTIGATIONS: UPDATE — sadece sahibi güncelleyebilir
CREATE POLICY "investigations_update_owner"
  ON investigations FOR UPDATE
  USING (author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

-- INVESTIGATION_STEPS: SELECT — parent published ise veya kendi investigation'ı ise
CREATE POLICY "steps_select"
  ON investigation_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.id = investigation_steps.investigation_id
      AND (i.status = 'published' OR i.author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint')
    )
  );

-- INVESTIGATION_STEPS: INSERT — investigation sahibi ekleyebilir
CREATE POLICY "steps_insert_owner"
  ON investigation_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.id = investigation_steps.investigation_id
      AND i.author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint'
    )
  );

-- INVESTIGATION_VOTES: SELECT — herkes
CREATE POLICY "votes_select_all"
  ON investigation_votes FOR SELECT
  USING (true);

-- INVESTIGATION_VOTES: INSERT — herkes oy verebilir (unique constraint ile korumalı)
CREATE POLICY "votes_insert_all"
  ON investigation_votes FOR INSERT
  WITH CHECK (true);

-- INVESTIGATION_VOTES: DELETE — sadece kendi oyunu silebilir
CREATE POLICY "votes_delete_own"
  ON investigation_votes FOR DELETE
  USING (voter_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

-- NODE_QUERY_STATS: SELECT — herkes
CREATE POLICY "node_stats_select_all"
  ON node_query_stats FOR SELECT
  USING (true);

-- NODE_QUERY_STATS: INSERT/UPDATE — service role (API route'tan)
CREATE POLICY "node_stats_insert_service"
  ON node_query_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "node_stats_update_service"
  ON node_query_stats FOR UPDATE
  USING (true);

-- ============================================================
-- DONE! Kontrol sorgusu:
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('investigations', 'investigation_steps', 'investigation_votes', 'node_query_stats')
ORDER BY table_name;
