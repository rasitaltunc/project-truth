-- ============================================
-- PROJECT TRUTH: INVESTIGATION RPC FUNCTIONS
-- PostgREST schema cache sorununu bypass eder
-- Supabase SQL Editor'da çalıştır
-- ============================================

-- 1. Investigation oluştur (draft)
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

-- 2. Investigation güncelle (yayınla, başlık ekle)
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
  -- Step ekle
  INSERT INTO public.investigation_steps (
    investigation_id, step_order, query, response,
    highlight_node_ids, highlight_link_ids, annotations, node_names
  ) VALUES (
    p_investigation_id, p_step_order, p_query, p_response,
    p_highlight_node_ids, p_highlight_link_ids, p_annotations, p_node_names
  )
  RETURNING row_to_json(investigation_steps.*) INTO step_result;

  -- step_count ve significance_score güncelle
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

-- 4. Feed getir (yayınlanmış soruşturmalar)
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
CREATE OR REPLACE FUNCTION get_investigation_detail(
  p_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- View count artır
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
