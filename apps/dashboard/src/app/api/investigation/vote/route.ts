// ============================================
// PROJECT TRUTH: INVESTIGATION VOTE API
// POST /api/investigation/vote — oy ver / geri al
// Uses RPC function (bypasses PostgREST schema cache)
// SECURITY: C1 (Input Validation) + E1 (Error Sanitization)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateBody, investigationVoteSchema } from '@/lib/validationSchemas';
import { applyRateLimit, VOTE_RATE_LIMIT } from '@/lib/rateLimit';
import { resolveIdentity, identityHasPermission, identityVoteWeight } from '@/lib/authBridge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    // SECURITY C1: Validate request body with Zod schema
    const body = await request.json();
    const validation = validateBody(investigationVoteSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { investigationId, direction } = validation.data;

    // ── AUTH BRIDGE: Resolve identity (auth token OR fingerprint header) ──
    // SECURITY: NEVER fall back to body.fingerprint — attacker can fabricate it
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli. Giriş yapın veya anonim oturum başlatın.' },
        { status: 401 }
      );
    }

    // ── PERMISSION CHECK: Only contributors+ can vote ──
    if (!identityHasPermission(identity, 'vote')) {
      return NextResponse.json(
        { error: 'Oy vermek için giriş yapmanız gerekiyor.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    // Map 'direction' from schema to 'voteType' for RPC call
    const voteType = direction === 'up' ? 'upvote' : 'downvote';

    const { data, error } = await supabaseAdmin.rpc('toggle_investigation_vote', {
      p_investigation_id: investigationId,
      p_fingerprint: fingerprint,
      p_vote_type: voteType,
    });

    // SECURITY E1: Don't expose RPC error details to client
    if (error) {
      console.error('Vote error:', error.message);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    return NextResponse.json({
      action: data?.action || 'unknown',
      upvote_count: data?.upvote_count || 0,
    });

  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic message to client
    console.error('Vote POST error:', error?.message || error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
