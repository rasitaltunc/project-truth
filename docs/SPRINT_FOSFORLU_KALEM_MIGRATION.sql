-- ============================================================================
-- SPRINT: Fosforlu Kalem Consensus System
-- Date: 2026-03-25
-- Description: Adds highlight_data column to task_assignments + IoU consensus
-- ============================================================================

-- 1) Add highlight_data JSONB column to task_assignments
-- Stores normalized bounding boxes from fosforlu kalem strokes
-- Format: { page, canvas_width, canvas_height, strokes: [{color, bbox: {x,y,w,h}}] }
ALTER TABLE task_assignments
ADD COLUMN IF NOT EXISTS highlight_data JSONB DEFAULT NULL;

-- Index for querying tasks that have highlight data
CREATE INDEX IF NOT EXISTS idx_task_assignments_has_highlight
ON task_assignments ((highlight_data IS NOT NULL))
WHERE highlight_data IS NOT NULL;

-- 2) RPC: Calculate highlight consensus (IoU) for a given task
-- Returns overlap score between all reviewers' highlight regions
-- IoU = Intersection Area / Union Area — standard computer vision metric
-- Score > 0.3 = reviewers are marking similar regions = strong consensus
CREATE OR REPLACE FUNCTION calculate_highlight_consensus(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_highlights JSONB[];
  v_count INT;
  v_result JSONB;
  v_pair_scores FLOAT[] := '{}';
  v_avg_iou FLOAT := 0;
  v_i INT;
  v_j INT;
  v_s1 JSONB;
  v_s2 JSONB;
  v_iou FLOAT;
  v_total_pairs INT := 0;
BEGIN
  -- Get all highlight_data for this task (only non-null)
  SELECT array_agg(highlight_data), count(*)
  INTO v_highlights, v_count
  FROM task_assignments
  WHERE task_id = p_task_id
    AND highlight_data IS NOT NULL
    AND highlight_data != 'null'::jsonb;

  IF v_count < 2 THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_data',
      'reviewers_with_highlights', COALESCE(v_count, 0),
      'minimum_required', 2
    );
  END IF;

  -- Calculate pairwise IoU between all reviewer pairs
  FOR v_i IN 1..v_count LOOP
    FOR v_j IN (v_i + 1)..v_count LOOP
      -- Get best IoU across all stroke pairs between reviewer i and j
      v_iou := calculate_best_stroke_iou(v_highlights[v_i], v_highlights[v_j]);
      v_pair_scores := array_append(v_pair_scores, v_iou);
      v_total_pairs := v_total_pairs + 1;
    END LOOP;
  END LOOP;

  -- Average IoU across all pairs
  IF v_total_pairs > 0 THEN
    SELECT avg(unnested) INTO v_avg_iou FROM unnest(v_pair_scores) AS unnested;
  END IF;

  RETURN jsonb_build_object(
    'status', CASE
      WHEN v_avg_iou >= 0.5 THEN 'strong_consensus'
      WHEN v_avg_iou >= 0.3 THEN 'moderate_consensus'
      WHEN v_avg_iou >= 0.1 THEN 'weak_consensus'
      ELSE 'no_consensus'
    END,
    'avg_iou', round(v_avg_iou::numeric, 4),
    'total_pairs', v_total_pairs,
    'pair_scores', to_jsonb(v_pair_scores),
    'reviewers_with_highlights', v_count
  );
END;
$$;

-- 3) Helper: Calculate best IoU between two reviewers' stroke sets
-- For each stroke in reviewer A, find the best-matching stroke in reviewer B
-- Return the average of these best matches
CREATE OR REPLACE FUNCTION calculate_best_stroke_iou(
  p_highlights_a JSONB,
  p_highlights_b JSONB
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  v_strokes_a JSONB;
  v_strokes_b JSONB;
  v_page_a INT;
  v_page_b INT;
  v_sa JSONB;
  v_sb JSONB;
  v_best_iou FLOAT;
  v_iou FLOAT;
  v_sum FLOAT := 0;
  v_count INT := 0;
  -- bbox values
  v_ax FLOAT; v_ay FLOAT; v_aw FLOAT; v_ah FLOAT;
  v_bx FLOAT; v_by FLOAT; v_bw FLOAT; v_bh FLOAT;
  v_ix1 FLOAT; v_iy1 FLOAT; v_ix2 FLOAT; v_iy2 FLOAT;
  v_intersection FLOAT;
  v_union FLOAT;
BEGIN
  -- Must be on the same page to compare
  v_page_a := COALESCE((p_highlights_a->>'page')::int, 1);
  v_page_b := COALESCE((p_highlights_b->>'page')::int, 1);
  IF v_page_a != v_page_b THEN
    RETURN 0.0;
  END IF;

  v_strokes_a := p_highlights_a->'strokes';
  v_strokes_b := p_highlights_b->'strokes';

  IF v_strokes_a IS NULL OR v_strokes_b IS NULL THEN
    RETURN 0.0;
  END IF;

  -- For each stroke in A, find best matching stroke in B
  FOR v_sa IN SELECT * FROM jsonb_array_elements(v_strokes_a) LOOP
    v_ax := COALESCE((v_sa->'bbox'->>'x')::float, 0);
    v_ay := COALESCE((v_sa->'bbox'->>'y')::float, 0);
    v_aw := COALESCE((v_sa->'bbox'->>'w')::float, 0);
    v_ah := COALESCE((v_sa->'bbox'->>'h')::float, 0);

    v_best_iou := 0;

    FOR v_sb IN SELECT * FROM jsonb_array_elements(v_strokes_b) LOOP
      v_bx := COALESCE((v_sb->'bbox'->>'x')::float, 0);
      v_by := COALESCE((v_sb->'bbox'->>'y')::float, 0);
      v_bw := COALESCE((v_sb->'bbox'->>'w')::float, 0);
      v_bh := COALESCE((v_sb->'bbox'->>'h')::float, 0);

      -- Calculate IoU (Intersection over Union)
      v_ix1 := GREATEST(v_ax, v_bx);
      v_iy1 := GREATEST(v_ay, v_by);
      v_ix2 := LEAST(v_ax + v_aw, v_bx + v_bw);
      v_iy2 := LEAST(v_ay + v_ah, v_by + v_bh);

      IF v_ix2 > v_ix1 AND v_iy2 > v_iy1 THEN
        v_intersection := (v_ix2 - v_ix1) * (v_iy2 - v_iy1);
      ELSE
        v_intersection := 0;
      END IF;

      v_union := (v_aw * v_ah) + (v_bw * v_bh) - v_intersection;

      IF v_union > 0 THEN
        v_iou := v_intersection / v_union;
      ELSE
        v_iou := 0;
      END IF;

      IF v_iou > v_best_iou THEN
        v_best_iou := v_iou;
      END IF;
    END LOOP;

    v_sum := v_sum + v_best_iou;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN 0.0;
  END IF;

  RETURN v_sum / v_count;
END;
$$;

-- 4) Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_highlight_consensus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_highlight_consensus(UUID) TO anon;
GRANT EXECUTE ON FUNCTION calculate_best_stroke_iou(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_best_stroke_iou(JSONB, JSONB) TO anon;

-- ============================================================================
-- DONE. Run this in Supabase SQL Editor.
-- After running, the submit API will automatically store highlight_data.
-- Consensus can be queried: SELECT calculate_highlight_consensus('task-uuid');
-- ============================================================================
