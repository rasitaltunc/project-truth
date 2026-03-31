// ============================================
// SPRINT 6A: BADGE LEADERBOARD API
// GET /api/badge/leaderboard?nid=X&limit=20 — Reputation leaderboard
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Simple in-memory cache (10 dakika)
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const networkId = searchParams.get('nid');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const cacheKey = `leaderboard:${networkId ?? 'global'}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // Use RPC function if available, fallback to direct query
    let leaderboard: any[] = [];

    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        'get_reputation_leaderboard',
        { p_network_id: networkId ?? null, p_limit: limit }
      );

      if (!rpcError && rpcData) {
        leaderboard = rpcData;
      }
    } catch {
      // RPC not available, use direct query
      const query = supabaseAdmin
        .from('truth_users')
        .select('anonymous_id, global_badge_tier, reputation_score, accuracy_rate, verified_contributions')
        .order('reputation_score', { ascending: false })
        .limit(limit);

      const { data: directData } = await query;
      leaderboard = (directData ?? []).map((u: any) => ({
        fingerprint: u.anonymous_id,
        badge_tier: u.global_badge_tier ?? 'anonymous',
        reputation: u.reputation_score ?? 0,
        accuracy: u.accuracy_rate ?? 0,
        contributions: u.verified_contributions ?? 0,
      }));
    }

    const response = { leaderboard, networkId, generatedAt: new Date().toISOString() };
    cache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[badge/leaderboard] error:', err);
    return NextResponse.json({ leaderboard: [], error: 'Server hatası' }, { status: 500 });
  }
}
