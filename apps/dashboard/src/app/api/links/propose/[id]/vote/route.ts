// ═══════════════════════════════════════════
// VOTE API — Sprint 10
// POST: Hayalet ipe oy ver (kabul/red)
// GET: Bir ipin oylarını listele
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, VOTE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, linkProposeVoteSchema } from '@/lib/validationSchemas';
import { safeErrorResponse } from '@/lib/errorHandler';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

// ── Tier → oy ağırlığı ──
const TIER_WEIGHTS: Record<string, number> = {
  official: 3.0,
  journalist: 2.5,
  community: 1.0,
  unverified: 0.5,
};

// ── Auto-accept/reject thresholds ──
const MIN_VOTES_FOR_DECISION = 5;
const ACCEPT_THRESHOLD = 0.80;  // %80 kabul
const REJECT_THRESHOLD = 0.70;  // %70 red

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({ votes: [], source: 'no_db' });
    }

    // SECURITY A2: Explicit select — excludes voter_fingerprint
    const { data, error } = await (supabase as any)
      .from('proposed_link_votes')
      .select('id, proposed_link_id, vote_direction, vote_weight, created_at')
      .eq('proposed_link_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ votes: [], source: 'no_table' });
      }
      throw error;
    }

    return NextResponse.json({ votes: data || [], source: 'supabase' });
  } catch (err: any) {
    return safeErrorResponse('GET /api/links/propose/[id]/vote', err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(request, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id: linkId } = await params;
    const body = await request.json();
    const validation = validateBody(linkProposeVoteSchema, body);
    if (!validation.success) return validation.response;

    const { direction, badge_tier } = validation.data;

    // Resolve identity from request
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli.' },
        { status: 401 }
      );
    }

    // Check permission: voting requires permission
    if (!identityHasPermission(identity, 'vote')) {
      return NextResponse.json(
        { error: 'Bu işlem için yeterli izniniz yok.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    const weight = TIER_WEIGHTS[badge_tier || 'community'] || 1.0;

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        vote: {
          id: `mock-vote-${Date.now()}`,
          proposed_link_id: linkId,
          voter_fingerprint: fingerprint,
          vote_direction: direction,
          vote_weight: weight,
          created_at: new Date().toISOString(),
        },
        source: 'mock',
      });
    }

    // ═══ E2 FIX: Atomic voting via RPC (FOR UPDATE lock prevents race condition) ═══
    // Old approach: INSERT → SELECT all → COUNT in JS → UPDATE (race-prone)
    // New approach: Single RPC does INSERT + COUNT + DECIDE + UPDATE atomically
    const admin = supabaseAdmin || supabase;
    const { data: rpcResult, error: rpcError } = await (admin as any).rpc(
      'submit_proposed_link_vote',
      {
        p_link_id: linkId,
        p_fingerprint: fingerprint,
        p_direction: direction,
        p_weight: weight,
      }
    );

    if (rpcError) {
      // Fallback: RPC doesn't exist yet (migration not applied)
      if (rpcError.code === '42883') {
        console.warn('[E2] submit_proposed_link_vote RPC not found, using legacy path');
        // Legacy non-atomic path (kept as fallback)
        const { data: voteData, error: voteError } = await (supabase as any)
          .from('proposed_link_votes')
          .insert({
            proposed_link_id: linkId,
            voter_fingerprint: fingerprint,
            vote_direction: direction,
            vote_weight: weight,
          })
          .select()
          .single();

        if (voteError) {
          if (voteError.code === '23505') {
            return NextResponse.json(
              { error: 'Bu öneri için zaten oy verdiniz' },
              { status: 409 }
            );
          }
          throw voteError;
        }
        return NextResponse.json({ vote: voteData, source: 'supabase_legacy' });
      }
      throw rpcError;
    }

    // Handle RPC response
    if (!rpcResult?.success) {
      const errorMap: Record<string, { msg: string; status: number }> = {
        'already_voted': { msg: 'Bu öneri için zaten oy verdiniz', status: 409 },
        'link_not_found': { msg: 'Öneri bulunamadı', status: 404 },
        'voting_closed': { msg: 'Oylama kapatılmış', status: 400 },
        'invalid_direction': { msg: 'Geçersiz oy yönü', status: 400 },
      };
      const mapped = errorMap[rpcResult?.error] || { msg: 'Oylama hatası', status: 400 };
      return NextResponse.json({ error: mapped.msg }, { status: mapped.status });
    }

    return NextResponse.json({
      vote: { proposed_link_id: linkId, vote_direction: direction, vote_weight: weight },
      autoDecision: rpcResult.status !== 'pending' && rpcResult.status !== 'voting' ? rpcResult.status : null,
      totalVotes: rpcResult.total_votes,
      upvotes: rpcResult.upvotes,
      downvotes: rpcResult.downvotes,
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('POST /api/links/propose/[id]/vote', err);
  }
}
