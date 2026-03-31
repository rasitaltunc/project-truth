// ============================================
// SPRINT 6A: PROMOTION CHECK API
// GET /api/badge/check-promotion?fp=X&nid=Y — Tier 2 yükseltme kontrolü
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateSession } from '@/lib/sessionValidator';
import { checkRateLimit, getClientId, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const TIER2_REQUIREMENTS = {
  reputation: 200,
  contributions: 50,
  accuracy: 0.8,     // 80%
  daysActive: 90,
  nominations: 3,
};

export async function GET(request: NextRequest) {
  // C6 FIX: Session validation — fingerprint from session, not from URL params
  const session = await validateSession(request);
  if (!session.valid) {
    return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
  }
  const fingerprint = session.fingerprint!;

  // C6 FIX: Rate limiting — prevent promotion check spam
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, GENERAL_RATE_LIMIT);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit aşıldı' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const networkId = searchParams.get('nid');

  try {
    // Current badge
    let currentTier = 'anonymous';
    if (networkId) {
      const { data: netBadge } = await supabaseAdmin
        .from('user_badges')
        .select('badge_tier')
        .eq('user_fingerprint', fingerprint)
        .eq('network_id', networkId)
        .eq('is_active', true)
        .maybeSingle();
      if (netBadge) currentTier = netBadge.badge_tier;
    } else {
      const { data: globalBadge } = await supabaseAdmin
        .from('user_global_badges')
        .select('badge_tier')
        .eq('user_fingerprint', fingerprint)
        .eq('is_active', true)
        .maybeSingle();
      if (globalBadge) currentTier = globalBadge.badge_tier;
    }

    // Already at or above community
    const tierOrder = ['anonymous', 'community', 'journalist', 'institutional'];
    const currentIdx = tierOrder.indexOf(currentTier);
    if (currentIdx >= 1) {
      return NextResponse.json({
        promotionCheck: {
          eligible: false,
          currentTier,
          nextTier: null,
          message: 'Zaten Platform Kurdu veya üstü rozete sahipsiniz.',
          requirements: null,
        },
      });
    }

    // Get user stats from truth_users
    const { data: userStats } = await supabaseAdmin
      .from('truth_users')
      .select('reputation_score, total_contributions, verified_contributions, accuracy_rate, nomination_count, first_active_at')
      .eq('anonymous_id', fingerprint)
      .maybeSingle();

    // Get nomination count (from badge_nominations table)
    const { count: nominationCount } = await supabaseAdmin
      .from('badge_nominations')
      .select('id', { count: 'exact', head: true })
      .eq('nominee_fingerprint', fingerprint)
      .eq('status', 'pending');

    // Calculate days active
    let daysActive = 0;
    if (userStats?.first_active_at) {
      const firstActive = new Date(userStats.first_active_at);
      daysActive = Math.floor((Date.now() - firstActive.getTime()) / (1000 * 60 * 60 * 24));
    }

    const stats = {
      reputation: userStats?.reputation_score ?? 0,
      contributions: userStats?.verified_contributions ?? 0,
      accuracy: userStats?.accuracy_rate ?? 0,
      daysActive,
      nominations: nominationCount ?? 0,
    };

    const req = TIER2_REQUIREMENTS;
    const requirements = {
      reputation: {
        current: stats.reputation,
        required: req.reputation,
        met: stats.reputation >= req.reputation,
      },
      contributions: {
        current: stats.contributions,
        required: req.contributions,
        met: stats.contributions >= req.contributions,
      },
      accuracy: {
        current: Math.round(stats.accuracy * 100),
        required: Math.round(req.accuracy * 100),
        met: stats.accuracy >= req.accuracy,
      },
      daysActive: {
        current: stats.daysActive,
        required: req.daysActive,
        met: stats.daysActive >= req.daysActive,
      },
      nominations: {
        current: stats.nominations,
        required: req.nominations,
        met: stats.nominations >= req.nominations,
      },
    };

    const eligible = Object.values(requirements).every((r) => r.met);

    // ═══ E3 FIX: Idempotent auto-promotion ═══
    // Race condition: Multiple concurrent requests can all pass eligibility check.
    // Fix: Re-check current badge BEFORE promoting (double-check pattern).
    // UPSERT with onConflict is already idempotent at DB level, but we add
    // an explicit re-check to avoid unnecessary writes and log noise.
    if (eligible && networkId) {
      // Re-read badge to prevent race (another request may have promoted already)
      const { data: recheck } = await supabaseAdmin
        .from('user_badges')
        .select('badge_tier')
        .eq('user_fingerprint', fingerprint)
        .eq('network_id', networkId)
        .eq('is_active', true)
        .maybeSingle();

      const recheckTier = recheck?.badge_tier || 'anonymous';
      const recheckIdx = tierOrder.indexOf(recheckTier);

      if (recheckIdx < 1) {
        // Still anonymous — safe to promote
        await supabaseAdmin
          .from('user_badges')
          .upsert({
            user_fingerprint: fingerprint,
            network_id: networkId,
            badge_tier: 'community',
            granted_by: 'system:auto-promotion',
            is_active: true,
            metadata: { promoted_at: new Date().toISOString() },
          }, { onConflict: 'user_fingerprint,network_id' })
          .catch(() => {});
      }
      // else: Already promoted by another concurrent request — skip silently
    }

    return NextResponse.json({
      promotionCheck: {
        eligible,
        currentTier,
        nextTier: eligible ? 'community' : null,
        requirements,
      },
    });
  } catch (err) {
    console.error('[badge/check-promotion] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
