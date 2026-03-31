-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT S2: Atomic Quarantine Voting RPC
-- Problem: Separate INSERT + UPDATE creates race condition
-- Fix: Single RPC with row-level lock (FOR UPDATE)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_quarantine_review(
  p_quarantine_id UUID,
  p_reviewer_fingerprint TEXT,
  p_decision TEXT,    -- 'approve' | 'reject' | 'dispute' | 'flag'
  p_reason TEXT DEFAULT NULL,
  p_reviewer_tier INT DEFAULT 1
) RETURNS jsonb AS $$
DECLARE
  v_qitem RECORD;
  v_doc RECORD;
  v_existing_count INT;
  v_approvals INT := 0;
  v_rejections INT := 0;
  v_disputes INT := 0;
  v_weighted_approvals INT := 0;
  v_weighted_rejections INT := 0;
  v_new_status TEXT;
  v_required_reviews INT;
  v_review_count INT;
  v_reviewed_by TEXT[];
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('approve', 'reject', 'dispute', 'flag') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_decision');
  END IF;

  -- Row-level lock on quarantine item (prevents concurrent modifications)
  SELECT * INTO v_qitem
  FROM data_quarantine
  WHERE id = p_quarantine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Check if already finalized
  IF v_qitem.verification_status IN ('verified', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_finalized');
  END IF;

  -- ═══ C4 FIX: Self-review check (2 layers — both quarantine.submitted_by AND documents.scanned_by) ═══
  -- Layer 1: Check submitted_by directly on quarantine item (new field, most reliable)
  IF v_qitem.submitted_by IS NOT NULL AND v_qitem.submitted_by = p_reviewer_fingerprint THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_review_blocked');
  END IF;

  -- Layer 2: Fallback to documents.scanned_by (for items created before submitted_by existed)
  SELECT scanned_by INTO v_doc
  FROM documents
  WHERE id = v_qitem.document_id;

  IF FOUND AND v_doc.scanned_by IS NOT NULL AND v_doc.scanned_by = p_reviewer_fingerprint THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_review_blocked');
  END IF;

  -- Duplicate check
  SELECT COUNT(*) INTO v_existing_count
  FROM quarantine_reviews
  WHERE quarantine_id = p_quarantine_id
  AND reviewer_fingerprint = p_reviewer_fingerprint;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  -- Insert the review
  INSERT INTO quarantine_reviews (quarantine_id, reviewer_fingerprint, decision, reason, reviewer_tier)
  VALUES (p_quarantine_id, p_reviewer_fingerprint, p_decision, p_reason, p_reviewer_tier);

  -- Count all reviews and calculate weighted votes
  SELECT
    COUNT(*) FILTER (WHERE decision = 'approve'),
    COUNT(*) FILTER (WHERE decision = 'reject'),
    COUNT(*) FILTER (WHERE decision = 'dispute'),
    COUNT(*),
    COALESCE(SUM(CASE WHEN decision = 'approve' THEN (CASE WHEN reviewer_tier >= 2 THEN 2 ELSE 1 END) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN decision = 'reject' THEN (CASE WHEN reviewer_tier >= 2 THEN 2 ELSE 1 END) ELSE 0 END), 0),
    array_agg(reviewer_fingerprint)
  INTO v_approvals, v_rejections, v_disputes, v_review_count, v_weighted_approvals, v_weighted_rejections, v_reviewed_by
  FROM quarantine_reviews
  WHERE quarantine_id = p_quarantine_id;

  v_required_reviews := COALESCE(v_qitem.required_reviews, 2);

  -- Determine new status
  v_new_status := v_qitem.verification_status;
  IF v_disputes >= 2 THEN
    v_new_status := 'disputed';
  ELSIF v_weighted_approvals >= v_required_reviews THEN
    v_new_status := 'verified';
  ELSIF v_weighted_rejections >= v_required_reviews THEN
    v_new_status := 'rejected';
  ELSIF v_review_count > 0 THEN
    v_new_status := 'pending_review';
  END IF;

  -- Atomic update of quarantine item
  UPDATE data_quarantine SET
    verification_status = v_new_status,
    review_count = v_review_count,
    reviewed_by = v_reviewed_by,
    updated_at = NOW()
  WHERE id = p_quarantine_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'reviewCount', v_review_count,
    'requiredReviews', v_required_reviews,
    'weightedApprovals', v_weighted_approvals,
    'weightedRejections', v_weighted_rejections
  );
END;
$$ LANGUAGE plpgsql;
