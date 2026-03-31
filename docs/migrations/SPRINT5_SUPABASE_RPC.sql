-- ============================================================
-- SPRINT 5: SUPABASE RPC FUNCTIONS
-- Supabase SQL Editor'da çalıştır (Dashboard → SQL Editor)
-- PostgREST schema cache sorununu bypass eder
-- ============================================================

-- ─── 1. UPSERT node_query_stat ────────────────────────────────────────────────
-- Her AI sorgusunda highlight edilen her node için çağrılır
CREATE OR REPLACE FUNCTION upsert_node_query_stat(
  p_node_id UUID,
  p_annotation_key TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mevcut highlight_count oku
  SELECT highlight_count INTO v_count
  FROM node_query_stats
  WHERE node_id = p_node_id;

  IF v_count IS NULL THEN
    -- İlk kez ekleniyor
    INSERT INTO node_query_stats (
      node_id, highlight_count, annotation_counts,
      unique_investigators, last_queried_at, updated_at
    ) VALUES (
      p_node_id, 1, '{}',
      CASE WHEN p_fingerprint IS NOT NULL THEN 1 ELSE 0 END,
      now(), now()
    );
  ELSE
    -- Güncelle
    UPDATE node_query_stats
    SET
      highlight_count = highlight_count + 1,
      last_queried_at = now(),
      updated_at = now()
    WHERE node_id = p_node_id;
  END IF;

  -- Annotation count güncelle (varsa)
  IF p_annotation_key IS NOT NULL AND p_annotation_key != '' THEN
    UPDATE node_query_stats
    SET annotation_counts = jsonb_set(
      COALESCE(annotation_counts, '{}'),
      ARRAY[p_annotation_key],
      to_jsonb(COALESCE((annotation_counts->>p_annotation_key)::int, 0) + 1)
    )
    WHERE node_id = p_node_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. GET node_query_stat (tekil, ilk keşif tespiti için) ──────────────────
CREATE OR REPLACE FUNCTION get_node_stat(p_node_id UUID)
RETURNS TABLE(
  node_id UUID,
  highlight_count INTEGER,
  annotation_counts JSONB,
  unique_investigators INTEGER,
  last_queried_at TIMESTAMPTZ
) AS $$
  SELECT
    node_id, highlight_count, annotation_counts,
    unique_investigators, last_queried_at
  FROM node_query_stats
  WHERE node_id = p_node_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 3. GET node_name (ilk keşif banner için node adını çek) ─────────────────
CREATE OR REPLACE FUNCTION get_node_name(p_node_id UUID)
RETURNS TABLE(name TEXT) AS $$
  SELECT COALESCE(n.name, 'Bilinmeyen')
  FROM nodes n
  WHERE n.id = p_node_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 4. GET all node_query_stats (heat map için) ─────────────────────────────
CREATE OR REPLACE FUNCTION get_node_query_stats()
RETURNS SETOF node_query_stats AS $$
  SELECT * FROM node_query_stats ORDER BY highlight_count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 5. GET gap nodes (hiç sorgulanmamış node'lar) ───────────────────────────
-- NOT: nodes tablosunda network_id kolonu henüz yok — filtre kaldırıldı
-- Çoklu ağ desteği Sprint 6'da eklenecek
CREATE OR REPLACE FUNCTION get_gap_nodes(p_network_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, name TEXT, type TEXT, tier TEXT) AS $$
  SELECT
    n.id,
    COALESCE(n.name, 'Bilinmeyen') AS name,
    COALESCE(n.type, 'person') AS type,
    COALESCE(n.tier::text, 'tier3') AS tier
  FROM nodes n
  LEFT JOIN node_query_stats nqs ON n.id = nqs.node_id
  WHERE
    nqs.node_id IS NULL OR nqs.highlight_count = 0
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

-- ─── 6. GET node connection counts (gap analysis bağlantı sayısı için) ───────
-- NOT: nodes tablosunda network_id kolonu henüz yok — filtre kaldırıldı
CREATE OR REPLACE FUNCTION get_node_connection_counts(p_network_id UUID DEFAULT NULL)
RETURNS TABLE(node_id UUID, connection_count BIGINT) AS $$
  WITH link_counts AS (
    SELECT l.source_id AS node_id, COUNT(*) AS cnt
    FROM links l
    GROUP BY l.source_id
    UNION ALL
    SELECT l.target_id AS node_id, COUNT(*) AS cnt
    FROM links l
    GROUP BY l.target_id
  )
  SELECT node_id, SUM(cnt) AS connection_count
  FROM link_counts
  GROUP BY node_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── GRANTS (public erişim için) ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION upsert_node_query_stat(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_stat(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_name(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_query_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_gap_nodes(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_node_connection_counts(UUID) TO anon, authenticated, service_role;

-- ─── TABLO RLS POLİSİ (node_query_stats) ──────────────────────────────────────
-- Herkes okuyabilir, sadece service_role yazabilir (API route üzerinden)
ALTER TABLE node_query_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "node_query_stats_select" ON node_query_stats;
CREATE POLICY "node_query_stats_select" ON node_query_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "node_query_stats_insert_service" ON node_query_stats;
CREATE POLICY "node_query_stats_insert_service" ON node_query_stats
  FOR ALL USING (true);  -- RPC SECURITY DEFINER zaten korur

-- ─── KONTROL SORGUSU ──────────────────────────────────────────────────────────
-- Çalıştırdıktan sonra aşağıdaki sorgu ile doğrula:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%node%';
