// ============================================
// SPRINT 6A: EVIDENCE RESOLVE API
// POST /api/evidence/resolve — Kanıtı onayla veya reddet (slashing)
// Only for Tier 2+ reviewers
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateReward, calculateSlash, type ResolveSeverity } from '@/lib/reputation';
import { applyRateLimit, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, evidenceResolveSchema } from '@/lib/validationSchemas';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

export const dynamic = 'force-dynamic';

// Legacy sabit puanlar (fallback — dinamik hesaplama başarısız olursa)
const LEGACY_REPUTATION_POINTS = {
  evidence_verified: 15,
  evidence_disputed: -10,
  vote_correct: 2,
  vote_wrong: -1,
  moderation_action: 5,
};

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = validateBody(evidenceResolveSchema, body);
    if (!validation.success) return validation.response;

    const {
      evidence_id,
      resolution,
      severity = 'good_faith' as ResolveSeverity,
    } = validation.data;

    // Resolve identity from request
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli.' },
        { status: 401 }
      );
    }

    // Check permission: resolving evidence requires higher trust
    if (!identityHasPermission(identity, 'review_evidence')) {
      return NextResponse.json(
        { error: 'Bu işlem için yeterli izniniz yok.' },
        { status: 403 }
      );
    }

    const resolver_fingerprint = identity.fingerprint;

    // Check resolver's badge tier (must be community or above)
    const { data: resolverBadge } = await supabaseAdmin
      .rpc('get_user_badge', {
        p_fingerprint: resolver_fingerprint,
        p_network_id: null,
      })
      .maybeSingle();

    const allowedTiers = ['community', 'journalist', 'institutional'];
    if (!resolverBadge || !allowedTiers.includes(resolverBadge.badge_tier)) {
      return NextResponse.json(
        { error: 'Kanıt incelemesi için en az Platform Kurdu rozetine ihtiyacın var.' },
        { status: 403 }
      );
    }

    // Try via RPC first, then fallback to direct update
    let evidence: any = null;
    let resolveError: any = null;

    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('resolve_evidence', {
        p_evidence_id: evidence_id,
        p_resolution: resolution,
        p_resolver_fingerprint: resolver_fingerprint,
      });

      if (!rpcError) {
        return NextResponse.json({ resolved: rpcResult, usedRpc: true });
      }
    } catch {
      // RPC not available, use direct approach
    }

    // Direct approach: fetch evidence and update
    const { data: ev, error: fetchError } = await supabaseAdmin
      .from('evidence_archive')
      .select('*, staked_reputation, submitted_by')
      .eq('id', evidence_id)
      .eq('verification_status', 'pending')
      .maybeSingle();

    if (fetchError || !ev) {
      return NextResponse.json(
        { error: 'Kanıt bulunamadı veya zaten işlendi.' },
        { status: 404 }
      );
    }

    // Update evidence status
    const { error: updateError } = await supabaseAdmin
      .from('evidence_archive')
      .update({
        verification_status: resolution,
        updated_at: new Date().toISOString(),
      })
      .eq('id', evidence_id);

    if (updateError) throw updateError;

    // Sprint 6B: Dinamik reputation ekonomisi
    const stakedAmount = ev.staked_reputation || 5; // Kullanıcının stake'i
    let submitterAmount: number;

    if (resolution === 'verified') {
      // Ödül: stake × kanıt tipi çarpanı
      const evidenceType = ev.evidence_type || 'inference';
      submitterAmount = calculateReward(stakedAmount, evidenceType);
    } else {
      // Ceza: stake × severity × correlation penalty
      // Ardışık red sayısını kontrol et
      let consecutiveRejects = 0;
      try {
        const { data: recentRejections } = await supabaseAdmin
          .from('evidence_archive')
          .select('id')
          .eq('submitted_by', ev.submitted_by)
          .eq('verification_status', 'disputed')
          .order('updated_at', { ascending: false })
          .limit(5);
        consecutiveRejects = recentRejections?.length || 0;
      } catch { /* ignore */ }

      submitterAmount = -calculateSlash(stakedAmount, severity, consecutiveRejects);
    }

    const resolverAmount = LEGACY_REPUTATION_POINTS.moderation_action;

    // Submitter reputation via RPC (handles transaction + score update + auto-promotion check)
    if (ev.submitted_by) {
      await supabaseAdmin.rpc('record_reputation', {
        p_fingerprint: ev.submitted_by,
        p_type: resolution === 'verified' ? 'evidence_verified' : 'evidence_disputed',
        p_amount: submitterAmount,
        p_reference_id: evidence_id,
        p_reference_type: 'evidence',
        p_description: resolution === 'verified'
          ? 'Kanıtın doğrulandı 🎉'
          : 'Kanıtın reddedildi - stake kesildi',
        p_network_id: null,
        p_staked: 0,
      }).catch(() => {});
    }

    // Resolver reputation via RPC (moderation action bonus)
    await supabaseAdmin.rpc('record_reputation', {
      p_fingerprint: resolver_fingerprint,
      p_type: 'moderation_confirmed',
      p_amount: resolverAmount,
      p_reference_id: evidence_id,
      p_reference_type: 'evidence',
      p_description: `Kanıt inceleme: ${resolution}`,
      p_network_id: null,
      p_staked: 0,
    }).catch(() => {});


    return NextResponse.json({
      resolved: {
        evidence_id,
        resolution,
        submitterAmount,
        resolverAmount,
      },
    });
  } catch (err) {
    console.error('[evidence/resolve] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
