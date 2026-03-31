/**
 * /api/quarantine/[id]/review
 * POST: Submit a review for a quarantine item
 *
 * Rules:
 * - Scanner CANNOT review their own scan
 * - One review per person per item
 * - Tier 2+ reviews have higher weight
 * - When required_reviews reached → auto-promote or reject
 *
 * Sprint 17: Zero Hallucination Data Integrity
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientId, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { quickValidateFingerprint } from '@/lib/serverFingerprint';
import { logAuditActionFromRequest } from '@/lib/auditLog';
import { safeErrorResponse } from '@/lib/errorHandler';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting (EVIDENCE_RATE_LIMIT: 5/min — review voting is critical)
    const clientId = getClientId(req);
    const rateCheck = checkRateLimit(clientId, EVIDENCE_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit aşıldı. Lütfen bekleyin.' },
        { status: 429 }
      );
    }

    const { id: quarantineId } = await params;
    const body = await req.json();

    // ── AUTH BRIDGE: Resolve identity (auth token OR fingerprint header) ──
    // SECURITY: NEVER fall back to body.fingerprint — attacker can fabricate it
    const identity = await resolveIdentity(req);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli. Giriş yapın.' },
        { status: 401 }
      );
    }

    const { decision, reason } = body as {
      decision: 'approve' | 'reject' | 'dispute' | 'flag';
      reason?: string;
    };

    if (!decision) {
      return NextResponse.json(
        { error: 'Karar (decision) gerekli.' },
        { status: 400 }
      );
    }

    // ── PERMISSION CHECK: Only trusted_contributors+ can review quarantine ──
    if (!identityHasPermission(identity, 'review_evidence')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for quarantine review.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    // Fingerprint format validation
    if (!quickValidateFingerprint(fingerprint)) {
      return NextResponse.json(
        { error: 'Invalid fingerprint format' },
        { status: 400 }
      );
    }

    // ═══ C4 FIX: API-level self-review check (defense-in-depth, before RPC) ═══
    // Check both data_quarantine.submitted_by AND documents.scanned_by
    const { data: qItem } = await supabaseAdmin
      .from('data_quarantine')
      .select('network_id, submitted_by, document_id')
      .eq('id', quarantineId)
      .single();

    if (!qItem) {
      return NextResponse.json({ error: 'Quarantine item not found' }, { status: 404 });
    }

    // Layer 1: Direct submitted_by check on quarantine item
    if (qItem.submitted_by && qItem.submitted_by === fingerprint) {
      return NextResponse.json(
        { error: 'You cannot review items from your own scan' },
        { status: 403 }
      );
    }

    // Layer 2: Check documents.scanned_by as fallback (for items created before submitted_by existed)
    if (qItem.document_id) {
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('scanned_by')
        .eq('id', qItem.document_id)
        .maybeSingle();
      if (doc?.scanned_by && doc.scanned_by === fingerprint) {
        return NextResponse.json(
          { error: 'You cannot review items from your own scan' },
          { status: 403 }
        );
      }
    }

    // Get reviewer tier (needed for RPC call)
    let reviewerTier = 1;

    if (qItem?.network_id) {
      const { data: badge } = await supabaseAdmin
        .from('user_badges')
        .select('tier')
        .eq('user_fingerprint', fingerprint)
        .eq('network_id', qItem.network_id)
        .maybeSingle();
      if (badge?.tier) reviewerTier = badge.tier;
    }

    // Call atomic RPC (FOR UPDATE lock prevents race conditions)
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'submit_quarantine_review',
      {
        p_quarantine_id: quarantineId,
        p_reviewer_fingerprint: fingerprint,
        p_decision: decision,
        p_reason: reason || null,
        p_reviewer_tier: reviewerTier,
      }
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json({ error: 'Review submission failed' }, { status: 500 });
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      status?: string;
      reviewCount?: number;
      requiredReviews?: number;
      weightedApprovals?: number;
      weightedRejections?: number;
    };

    if (!result.success) {
      const errorMap: Record<string, { message: string; status: number }> = {
        invalid_decision: { message: 'Invalid decision', status: 400 },
        not_found: { message: 'Quarantine item not found', status: 404 },
        already_finalized: { message: 'This item has already been finalized', status: 400 },
        self_review_blocked: { message: 'You cannot review items from your own scan', status: 403 },
        already_reviewed: { message: 'You have already reviewed this item', status: 409 },
      };
      const err = errorMap[result.error || ''] || { message: 'İşlem başarısız', status: 400 };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    // Add provenance entry (fire-and-forget, outside RPC for flexibility)
    supabaseAdmin.from('data_provenance').insert({
      entity_type: 'quarantine_item',
      entity_id: quarantineId,
      action: decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : 'disputed',
      actor_fingerprint: fingerprint,
      actor_type: 'user',
      details: {
        decision,
        reason,
        reviewer_tier: reviewerTier,
        weighted_approvals: result.weightedApprovals,
        weighted_rejections: result.weightedRejections,
        new_status: result.status,
      },
    }).then(() => {});

    // Award reputation to reviewer (fire-and-forget)
    if (decision === 'approve' || decision === 'reject') {
      supabaseAdmin.from('reputation_transactions').insert({
        user_fingerprint: fingerprint,
        transaction_type: 'earn',
        amount: 2,
        reason: `Quarantine review: ${decision}`,
        metadata: { quarantine_id: quarantineId },
      }).then(() => {});
    }

    // Audit log
    logAuditActionFromRequest(req, {
      fingerprint,
      action: 'quarantine_review',
      resource: 'quarantine_reviews',
      resourceId: quarantineId,
      result: 'success',
      metadata: { decision, reviewer_tier: reviewerTier, new_status: result.status },
    });

    return NextResponse.json({
      status: result.status,
      reviewCount: result.reviewCount,
      requiredReviews: result.requiredReviews,
      weightedApprovals: result.weightedApprovals,
      weightedRejections: result.weightedRejections,
    });
  } catch (error) {
    return safeErrorResponse('POST /api/quarantine/[id]/review', error);
  }
}
