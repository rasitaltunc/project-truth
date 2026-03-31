-- ═══════════════════════════════════════════════════════
-- SECURITY E2: Atomic Proposed Link Voting RPC
-- Problem: Race condition — concurrent votes can miscalculate tallies
--          because SELECT/COUNT/UPDATE happens in 3 separate steps
-- Fix: Single RPC with FOR UPDATE lock on proposed_links row
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_proposed_link_vote(
  p_link_id UUID,
  p_fingerprint TEXT,
  p_direction TEXT,    -- 'up' or 'down'
  p_weight NUMERIC DEFAULT 1.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link RECORD;
  v_existing_vote RECORD;
  v_total_votes INT;
  v_upvotes INT;
  v_downvotes INT;
  v_weighted_up NUMERIC := 0;
  v_weighted_down NUMERIC := 0;
  v_new_status TEXT;
  v_accept_threshold NUMERIC := 0.7;  -- 70% weighted upvotes to accept
  v_reject_threshold NUMERIC := 0.7;  -- 70% weighted downvotes to reject
  v_min_votes INT := 5;
BEGIN
  -- Validate direction
  IF p_direction NOT IN ('up', 'down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_direction');
  END IF;

  -- ═══ LOCK the proposed_links row to prevent concurrent modifications ═══
  SELECT * INTO v_link
  FROM proposed_links
  WHERE id = p_link_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'link_not_found');
  END IF;

  -- Check if link is still voteable
  IF v_link.status NOT IN ('pending', 'voting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'voting_closed', 'status', v_link.status);
  END IF;

  -- Check for existing vote by this user
  SELECT * INTO v_existing_vote
  FROM proposed_link_votes
  WHERE proposed_link_id = p_link_id
    AND voter_fingerprint = p_fingerprint;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_voted');
  END IF;

  -- ═══ INSERT vote (within the lock) ═══
  INSERT INTO proposed_link_votes (
    proposed_link_id, voter_fingerprint, vote_direction, vote_weight
  ) VALUES (
    p_link_id, p_fingerprint, p_direction, p_weight
  );

  -- ═══ COUNT votes atomically (within same transaction) ═══
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE vote_direction = 'up'),
    COUNT(*) FILTER (WHERE vote_direction = 'down'),
    COALESCE(SUM(vote_weight) FILTER (WHERE vote_direction = 'up'), 0),
    COALESCE(SUM(vote_weight) FILTER (WHERE vote_direction = 'down'), 0)
  INTO v_total_votes, v_upvotes, v_downvotes, v_weighted_up, v_weighted_down
  FROM proposed_link_votes
  WHERE proposed_link_id = p_link_id;

  -- ═══ DECIDE status atomically ═══
  v_new_status := v_link.status;

  IF v_total_votes >= v_min_votes THEN
    IF v_weighted_up + v_weighted_down > 0 THEN
      IF v_weighted_up / (v_weighted_up + v_weighted_down) >= v_accept_threshold THEN
        v_new_status := 'accepted';
      ELSIF v_weighted_down / (v_weighted_up + v_weighted_down) >= v_reject_threshold THEN
        v_new_status := 'rejected';
      END IF;
    END IF;
  END IF;

  -- ═══ UPDATE proposed_links atomically ═══
  UPDATE proposed_links
  SET
    community_upvotes = v_upvotes,
    community_downvotes = v_downvotes,
    total_votes = v_total_votes,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_votes', v_total_votes,
    'upvotes', v_upvotes,
    'downvotes', v_downvotes,
    'status', v_new_status,
    'weighted_up', v_weighted_up,
    'weighted_down', v_weighted_down
  );
END;
$$;

-- Restrict to service_role only (C5 pattern)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION submit_proposed_link_vote(UUID, TEXT, TEXT, NUMERIC) FROM anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
