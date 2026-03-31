-- ============================================================
-- PROJECT TRUTH: FULL MIGRATION (Sprint 4 + Sprint 5)
-- Doğru Supabase projesinde çalıştır!
-- ============================================================
-- Bu dosya Sprint 4 "Soruşturma Dosyası" + Sprint 5 "Kolektif Zeka"
-- için gerekli TÜM tabloları, fonksiyonları ve policy'leri içerir.
-- Güvenli: IF NOT EXISTS + CREATE OR REPLACE kullanır.
-- ============================================================


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 1: SPRINT 4 — TABLOLAR                            ║
-- ╚════════════════════════════════════════════════════════════╝

-- 0. NETWORKS TABLE (mevcut tabloyu bozmadan eksik kolonları ekle)
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

-- Mevcut tabloda eksik kolonları ekle (güvenli — IF NOT EXISTS)
ALTER TABLE networks ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE networks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE networks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE networks ADD COLUMN IF NOT EXISTS owner_fingerprint TEXT;
ALTER TABLE networks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE networks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Epstein ağını varsayılan ağ olarak ekle
INSERT INTO networks (name, slug, description, is_public)
VALUES ('Epstein Network', 'epstein-network', 'Jeffrey Epstein suç ağı — ilk soruşturma vakası', true)
ON CONFLICT (slug) DO NOTHING;

-- 1. INVESTIGATIONS TABLE
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

CREATE INDEX IF NOT EXISTS investigations_status_score_idx
  ON investigations(status, significance_score DESC);
CREATE INDEX IF NOT EXISTS investigations_parent_idx
  ON investigations(parent_id);
CREATE INDEX IF NOT EXISTS investigations_fingerprint_idx
  ON investigations(author_fingerprint);

-- 2. INVESTIGATION_STEPS TABLE
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

-- 3. INVESTIGATION_VOTES TABLE
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

-- 4. NODE_QUERY_STATS TABLE
CREATE TABLE IF NOT EXISTS node_query_stats (
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE PRIMARY KEY,
  highlight_count INTEGER NOT NULL DEFAULT 0,
  annotation_counts JSONB NOT NULL DEFAULT '{}',
  unique_investigators INTEGER NOT NULL DEFAULT 0,
  last_queried_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 2: SPRINT 4 — FONKSİYONLAR                       ║
-- ╚════════════════════════════════════════════════════════════╝

-- Significance Score hesaplama
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

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investigations_updated_at ON investigations;
CREATE TRIGGER investigations_updated_at
  BEFORE UPDATE ON investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 3: SPRINT 4 — INVESTIGATION RPC FONKSİYONLARI     ║
-- ╚════════════════════════════════════════════════════════════╝

-- 1. Investigation oluştur
CREATE OR REPLACE FUNCTION create_investigation(
  p_network_id UUID DEFAULT NULL,
  p_author_name TEXT DEFAULT 'Anonim Araştırmacı',
  p_author_fingerprint TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO public.investigations (
    network_id, author_name, author_fingerprint, status,
    step_count, fork_count, upvote_count, significance_score, view_count
  ) VALUES (
    p_network_id, p_author_name, p_author_fingerprint, 'draft',
    0, 0, 0, 0, 0
  )
  RETURNING row_to_json(investigations.*) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Investigation güncelle
CREATE OR REPLACE FUNCTION update_investigation(
  p_id UUID,
  p_fingerprint TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE public.investigations SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    published_at = CASE WHEN p_status = 'published' THEN now() ELSE published_at END,
    updated_at = now()
  WHERE id = p_id AND author_fingerprint = p_fingerprint
  RETURNING row_to_json(investigations.*) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Step ekle
CREATE OR REPLACE FUNCTION add_investigation_step(
  p_investigation_id UUID,
  p_step_order INT,
  p_query TEXT,
  p_response TEXT,
  p_highlight_node_ids TEXT[] DEFAULT '{}',
  p_highlight_link_ids TEXT[] DEFAULT '{}',
  p_annotations JSONB DEFAULT '{}',
  p_node_names TEXT[] DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  step_result JSON;
  inv_record RECORD;
  new_step_count INT;
  new_score FLOAT;
BEGIN
  INSERT INTO public.investigation_steps (
    investigation_id, step_order, query, response,
    highlight_node_ids, highlight_link_ids, annotations, node_names
  ) VALUES (
    p_investigation_id, p_step_order, p_query, p_response,
    p_highlight_node_ids, p_highlight_link_ids, p_annotations, p_node_names
  )
  RETURNING row_to_json(investigation_steps.*) INTO step_result;

  SELECT step_count, fork_count, upvote_count, view_count
  INTO inv_record
  FROM public.investigations WHERE id = p_investigation_id;

  IF FOUND THEN
    new_step_count := COALESCE(inv_record.step_count, 0) + 1;
    new_score := (new_step_count * 2) + (COALESCE(inv_record.fork_count, 0) * 5) +
                 COALESCE(inv_record.upvote_count, 0) + (COALESCE(inv_record.view_count, 0) * 0.1);
    UPDATE public.investigations
    SET step_count = new_step_count, significance_score = new_score
    WHERE id = p_investigation_id;
  END IF;

  RETURN step_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Feed getir
CREATE OR REPLACE FUNCTION get_investigation_feed(
  p_sort TEXT DEFAULT 'significance',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  result JSON;
  order_col TEXT;
BEGIN
  order_col := CASE
    WHEN p_sort = 'newest' THEN 'published_at'
    WHEN p_sort = 'forks' THEN 'fork_count'
    ELSE 'significance_score'
  END;
  EXECUTE format(
    'SELECT json_build_object(
      ''investigations'', COALESCE(json_agg(row_to_json(t)), ''[]''::json),
      ''total'', (SELECT count(*) FROM public.investigations WHERE status = ''published'')
    )
    FROM (
      SELECT * FROM public.investigations
      WHERE status = ''published''
      ORDER BY %I DESC
      LIMIT $1 OFFSET $2
    ) t', order_col
  ) INTO result USING p_limit, p_offset;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tek soruşturma detayı
CREATE OR REPLACE FUNCTION get_investigation_detail(p_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE public.investigations SET view_count = view_count + 1 WHERE id = p_id;
  SELECT json_build_object(
    'investigation', row_to_json(i),
    'steps', COALESCE(
      (SELECT json_agg(row_to_json(s) ORDER BY s.step_order)
       FROM public.investigation_steps s WHERE s.investigation_id = p_id),
      '[]'::json
    )
  ) INTO result
  FROM public.investigations i WHERE i.id = p_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Oy ver / geri al (toggle)
CREATE OR REPLACE FUNCTION toggle_investigation_vote(
  p_investigation_id UUID,
  p_fingerprint TEXT,
  p_vote_type TEXT DEFAULT 'upvote'
) RETURNS JSON AS $$
DECLARE
  existing_id UUID;
  vote_action TEXT;
  new_vote_count INT;
  inv_record RECORD;
  new_score FLOAT;
BEGIN
  SELECT id INTO existing_id FROM public.investigation_votes
  WHERE investigation_id = p_investigation_id AND voter_fingerprint = p_fingerprint;

  IF existing_id IS NOT NULL THEN
    DELETE FROM public.investigation_votes WHERE id = existing_id;
    vote_action := 'removed';
  ELSE
    INSERT INTO public.investigation_votes (investigation_id, voter_fingerprint, vote_type)
    VALUES (p_investigation_id, p_fingerprint, p_vote_type);
    vote_action := 'added';
  END IF;

  SELECT count(*) INTO new_vote_count
  FROM public.investigation_votes WHERE investigation_id = p_investigation_id;

  SELECT step_count, fork_count, view_count INTO inv_record
  FROM public.investigations WHERE id = p_investigation_id;

  IF FOUND THEN
    new_score := (COALESCE(inv_record.step_count, 0) * 2) + (COALESCE(inv_record.fork_count, 0) * 5) +
                 new_vote_count + (COALESCE(inv_record.view_count, 0) * 0.1);
    UPDATE public.investigations
    SET upvote_count = new_vote_count, significance_score = new_score
    WHERE id = p_investigation_id;
  END IF;

  RETURN json_build_object('action', vote_action, 'upvote_count', new_vote_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fork (soruşturmayı devam ettir)
CREATE OR REPLACE FUNCTION fork_investigation(
  p_investigation_id UUID,
  p_fingerprint TEXT,
  p_author_name TEXT DEFAULT 'Anonim Araştırmacı'
) RETURNS JSON AS $$
DECLARE
  original RECORD;
  forked RECORD;
  original_step_count INT;
  new_fork_count INT;
  new_score FLOAT;
BEGIN
  SELECT * INTO original FROM public.investigations WHERE id = p_investigation_id;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Soruşturma bulunamadı'); END IF;

  SELECT count(*) INTO original_step_count FROM public.investigation_steps WHERE investigation_id = p_investigation_id;

  INSERT INTO public.investigations (
    network_id, author_name, author_fingerprint, title, description,
    status, parent_id, step_count, fork_count, upvote_count, significance_score, view_count
  ) VALUES (
    original.network_id, p_author_name, p_fingerprint,
    COALESCE(original.title, '') || ' — Devam Soruşturması',
    '"' || original.author_name || '" kullanıcısının soruşturmasından devam edildi.',
    'draft', p_investigation_id, original_step_count, 0, 0, original_step_count * 2, 0
  ) RETURNING * INTO forked;

  INSERT INTO public.investigation_steps (investigation_id, step_order, query, response, highlight_node_ids, highlight_link_ids, annotations, node_names)
  SELECT forked.id, step_order, query, response, highlight_node_ids, highlight_link_ids, annotations, node_names
  FROM public.investigation_steps WHERE investigation_id = p_investigation_id ORDER BY step_order;

  new_fork_count := COALESCE(original.fork_count, 0) + 1;
  new_score := (COALESCE(original.step_count, 0) * 2) + (new_fork_count * 5) +
               COALESCE(original.upvote_count, 0) + (COALESCE(original.view_count, 0) * 0.1);
  UPDATE public.investigations SET fork_count = new_fork_count, significance_score = new_score
  WHERE id = p_investigation_id;

  RETURN json_build_object('forked', row_to_json(forked));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 4: SPRINT 5 — NODE STATS RPC FONKSİYONLARI        ║
-- ╚════════════════════════════════════════════════════════════╝

-- 1. UPSERT node_query_stat
CREATE OR REPLACE FUNCTION upsert_node_query_stat(
  p_node_id UUID,
  p_annotation_key TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT highlight_count INTO v_count
  FROM node_query_stats WHERE node_id = p_node_id;

  IF v_count IS NULL THEN
    INSERT INTO node_query_stats (
      node_id, highlight_count, annotation_counts,
      unique_investigators, last_queried_at, updated_at
    ) VALUES (
      p_node_id, 1, '{}',
      CASE WHEN p_fingerprint IS NOT NULL THEN 1 ELSE 0 END,
      now(), now()
    );
  ELSE
    UPDATE node_query_stats SET
      highlight_count = highlight_count + 1,
      last_queried_at = now(), updated_at = now()
    WHERE node_id = p_node_id;
  END IF;

  IF p_annotation_key IS NOT NULL AND p_annotation_key != '' THEN
    UPDATE node_query_stats SET
      annotation_counts = jsonb_set(
        COALESCE(annotation_counts, '{}'),
        ARRAY[p_annotation_key],
        to_jsonb(COALESCE((annotation_counts->>p_annotation_key)::int, 0) + 1)
      )
    WHERE node_id = p_node_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. GET node_query_stat (tekil)
CREATE OR REPLACE FUNCTION get_node_stat(p_node_id UUID)
RETURNS TABLE(
  node_id UUID, highlight_count INTEGER,
  annotation_counts JSONB, unique_investigators INTEGER,
  last_queried_at TIMESTAMPTZ
) AS $$
  SELECT node_id, highlight_count, annotation_counts,
         unique_investigators, last_queried_at
  FROM node_query_stats WHERE node_id = p_node_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. GET node_name
CREATE OR REPLACE FUNCTION get_node_name(p_node_id UUID)
RETURNS TABLE(name TEXT) AS $$
  SELECT COALESCE(n.name, 'Bilinmeyen')
  FROM nodes n WHERE n.id = p_node_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. GET all node_query_stats (heat map)
CREATE OR REPLACE FUNCTION get_node_query_stats()
RETURNS SETOF node_query_stats AS $$
  SELECT * FROM node_query_stats ORDER BY highlight_count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. GET gap nodes (hiç sorgulanmamış)
CREATE OR REPLACE FUNCTION get_gap_nodes(p_network_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, name TEXT, type TEXT, tier TEXT) AS $$
  SELECT
    n.id,
    COALESCE(n.name, 'Bilinmeyen') AS name,
    COALESCE(n.type, 'person') AS type,
    COALESCE(n.tier::text, 'tier3') AS tier
  FROM nodes n
  LEFT JOIN node_query_stats nqs ON n.id = nqs.node_id
  WHERE nqs.node_id IS NULL OR nqs.highlight_count = 0
  ORDER BY
    CASE
      WHEN n.tier::text IN ('tier0', '0') THEN 0
      WHEN n.tier::text IN ('tier1', '1') THEN 1
      WHEN n.tier::text IN ('tier2', '2') THEN 2
      WHEN n.tier::text IN ('tier3', '3') THEN 3
      ELSE 4
    END ASC
  LIMIT 20;
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. GET node connection counts
CREATE OR REPLACE FUNCTION get_node_connection_counts(p_network_id UUID DEFAULT NULL)
RETURNS TABLE(node_id UUID, connection_count BIGINT) AS $$
  WITH link_counts AS (
    SELECT l.source_id AS node_id, COUNT(*) AS cnt FROM links l GROUP BY l.source_id
    UNION ALL
    SELECT l.target_id AS node_id, COUNT(*) AS cnt FROM links l GROUP BY l.target_id
  )
  SELECT node_id, SUM(cnt) AS connection_count
  FROM link_counts GROUP BY node_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 5: GRANTS + RLS POLİCY'LER                        ║
-- ╚════════════════════════════════════════════════════════════╝

-- Investigation fonksiyonları
GRANT EXECUTE ON FUNCTION create_investigation(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_investigation(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_investigation_step(UUID, INT, TEXT, TEXT, TEXT[], TEXT[], JSONB, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_investigation_feed(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_investigation_detail(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION toggle_investigation_vote(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fork_investigation(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- Sprint 5 fonksiyonları
GRANT EXECUTE ON FUNCTION upsert_node_query_stat(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_stat(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_name(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_query_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_gap_nodes(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_connection_counts(UUID) TO anon, authenticated, service_role;

-- RLS — Yeni tablolar
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_query_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing (idempotent)
DROP POLICY IF EXISTS "investigations_select_published" ON investigations;
DROP POLICY IF EXISTS "investigations_insert_all" ON investigations;
DROP POLICY IF EXISTS "investigations_update_owner" ON investigations;
DROP POLICY IF EXISTS "steps_select" ON investigation_steps;
DROP POLICY IF EXISTS "steps_insert_owner" ON investigation_steps;
DROP POLICY IF EXISTS "votes_select_all" ON investigation_votes;
DROP POLICY IF EXISTS "votes_insert_all" ON investigation_votes;
DROP POLICY IF EXISTS "votes_delete_own" ON investigation_votes;
DROP POLICY IF EXISTS "node_stats_select_all" ON node_query_stats;
DROP POLICY IF EXISTS "node_stats_insert_service" ON node_query_stats;
DROP POLICY IF EXISTS "node_stats_update_service" ON node_query_stats;
DROP POLICY IF EXISTS "node_query_stats_select" ON node_query_stats;
DROP POLICY IF EXISTS "node_query_stats_insert_service" ON node_query_stats;

-- INVESTIGATIONS policies
CREATE POLICY "investigations_select_published" ON investigations
  FOR SELECT USING (status = 'published' OR author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

CREATE POLICY "investigations_insert_all" ON investigations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "investigations_update_owner" ON investigations
  FOR UPDATE USING (author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

-- INVESTIGATION_STEPS policies
CREATE POLICY "steps_select" ON investigation_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.id = investigation_steps.investigation_id
      AND (i.status = 'published' OR i.author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint')
    )
  );

CREATE POLICY "steps_insert_owner" ON investigation_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.id = investigation_steps.investigation_id
      AND i.author_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint'
    )
  );

-- INVESTIGATION_VOTES policies
CREATE POLICY "votes_select_all" ON investigation_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_all" ON investigation_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_delete_own" ON investigation_votes
  FOR DELETE USING (voter_fingerprint = current_setting('request.headers', true)::json->>'x-fingerprint');

-- NODE_QUERY_STATS policies
CREATE POLICY "node_stats_select_all" ON node_query_stats FOR SELECT USING (true);
CREATE POLICY "node_stats_insert_service" ON node_query_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "node_stats_update_service" ON node_query_stats FOR UPDATE USING (true);


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 6: SCHEMA CACHE RELOAD                            ║
-- ╚════════════════════════════════════════════════════════════╝

NOTIFY pgrst, 'reload schema';


-- ╔════════════════════════════════════════════════════════════╗
-- ║  BÖLÜM 7: DOĞRULAMA SORGUSU                              ║
-- ╚════════════════════════════════════════════════════════════╝

-- Bu sorgu sonucunda 4 tablo + 13 fonksiyon görmelisin:
SELECT 'TABLES' AS check_type, table_name AS name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('networks', 'investigations', 'investigation_steps', 'investigation_votes', 'node_query_stats')
UNION ALL
SELECT 'FUNCTIONS', routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'calculate_significance_score', 'update_updated_at_column',
  'create_investigation', 'update_investigation', 'add_investigation_step',
  'get_investigation_feed', 'get_investigation_detail',
  'toggle_investigation_vote', 'fork_investigation',
  'upsert_node_query_stat', 'get_node_stat', 'get_node_name',
  'get_node_query_stats', 'get_gap_nodes', 'get_node_connection_counts'
)
ORDER BY check_type, name;
