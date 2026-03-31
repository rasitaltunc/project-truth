-- ═══════════════════════════════════════════════════════
-- SECURITY E4: View Count Deduplication
-- Problem: Same user can inflate highlight_count by querying same node repeatedly
-- Fix: Add 5-minute deduplication window per fingerprint per node
-- ═══════════════════════════════════════════════════════

-- Step 1: Add last_query_fingerprints tracking to node_query_stats
-- This stores recent fingerprint+timestamp pairs for dedup
ALTER TABLE node_query_stats
  ADD COLUMN IF NOT EXISTS recent_queries JSONB DEFAULT '[]'::jsonb;

-- Step 2: Replace upsert_node_query_stat with dedup-aware version
CREATE OR REPLACE FUNCTION upsert_node_query_stat(
  p_node_id UUID,
  p_annotation_key TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_count INTEGER;
  v_recent JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_dedup_window INTERVAL := '5 minutes';
  v_is_duplicate BOOLEAN := false;
  v_cleaned JSONB;
  v_entry JSONB;
BEGIN
  -- Get existing record
  SELECT highlight_count, COALESCE(recent_queries, '[]'::jsonb)
  INTO v_count, v_recent
  FROM node_query_stats
  WHERE node_id = p_node_id;

  -- Check if this fingerprint queried this node within the dedup window
  IF p_fingerprint IS NOT NULL AND v_recent IS NOT NULL THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(v_recent)
    LOOP
      IF v_entry->>'fp' = p_fingerprint
         AND (v_entry->>'ts')::timestamptz > v_now - v_dedup_window THEN
        v_is_duplicate := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Clean old entries (older than dedup window) from recent_queries
  v_cleaned := '[]'::jsonb;
  IF v_recent IS NOT NULL THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(v_recent)
    LOOP
      IF (v_entry->>'ts')::timestamptz > v_now - v_dedup_window THEN
        v_cleaned := v_cleaned || jsonb_build_array(v_entry);
      END IF;
    END LOOP;
  END IF;

  -- Add current query to recent list (even if duplicate, for tracking)
  IF p_fingerprint IS NOT NULL THEN
    v_cleaned := v_cleaned || jsonb_build_array(
      jsonb_build_object('fp', p_fingerprint, 'ts', v_now)
    );
  END IF;

  IF v_count IS NULL THEN
    -- New node: always insert (first query can't be duplicate)
    INSERT INTO node_query_stats (
      node_id, highlight_count, annotation_counts, unique_investigators,
      created_at, updated_at, recent_queries
    ) VALUES (
      p_node_id, 1, '{}',
      CASE WHEN p_fingerprint IS NOT NULL THEN 1 ELSE 0 END,
      v_now, v_now, v_cleaned
    );
  ELSE
    IF v_is_duplicate THEN
      -- Duplicate query within 5 min: DON'T increment highlight_count
      -- Only update recent_queries and last_queried_at
      UPDATE node_query_stats
      SET last_queried_at = v_now,
          updated_at = v_now,
          recent_queries = v_cleaned
      WHERE node_id = p_node_id;
    ELSE
      -- New query (or different user): increment normally
      UPDATE node_query_stats
      SET highlight_count = highlight_count + 1,
          last_queried_at = v_now,
          updated_at = v_now,
          recent_queries = v_cleaned
      WHERE node_id = p_node_id;
    END IF;
  END IF;

  -- Update annotation counts (unchanged from original)
  IF p_annotation_key IS NOT NULL AND p_annotation_key != '' THEN
    UPDATE node_query_stats
    SET annotation_counts = jsonb_set(
      COALESCE(annotation_counts, '{}'::jsonb),
      ARRAY[p_annotation_key],
      to_jsonb(COALESCE((annotation_counts->>p_annotation_key)::int, 0) + 1)
    )
    WHERE node_id = p_node_id;
  END IF;

  -- Update unique investigators (unchanged from original)
  IF p_fingerprint IS NOT NULL AND NOT v_is_duplicate THEN
    UPDATE node_query_stats
    SET unique_investigators = (
      SELECT COUNT(DISTINCT voter_fingerprint)
      FROM (
        SELECT voter_fingerprint FROM proposed_link_votes WHERE voter_fingerprint IS NOT NULL
        UNION
        SELECT p_fingerprint
      ) sub
    )
    WHERE node_id = p_node_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict to service_role only (C5 pattern)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION upsert_node_query_stat(UUID, TEXT, TEXT) FROM anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
