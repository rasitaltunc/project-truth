// ============================================
// SPRINT 6A: REPUTATION STATS API
// GET /api/reputation/stats?fp=X — Kullanıcının reputation özeti
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateSession } from '@/lib/sessionValidator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  // SECURITY D2: Validate session to prevent fingerprint impersonation
  const session = await validateSession(request);
  if (!session.valid) {
    return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
  }
  const fingerprint = session.fingerprint!;

  try {
    const { data, error } = await supabaseAdmin
      .from('truth_users')
      .select(
        'anonymous_id, reputation_score, total_contributions, verified_contributions, accuracy_rate, nomination_count, first_active_at'
      )
      .eq('anonymous_id', fingerprint)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Return default zero stats
      return NextResponse.json({
        stats: {
          fingerprint,
          score: 0,
          total_contributions: 0,
          verified_contributions: 0,
          accuracy_rate: 0,
          nomination_count: 0,
          days_active: 0,
        },
      });
    }

    const daysActive = data.first_active_at
      ? Math.floor((Date.now() - new Date(data.first_active_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      stats: {
        fingerprint,
        score: data.reputation_score ?? 0,
        total_contributions: data.total_contributions ?? 0,
        verified_contributions: data.verified_contributions ?? 0,
        accuracy_rate: data.accuracy_rate ?? 0,
        nomination_count: data.nomination_count ?? 0,
        days_active: daysActive,
      },
    });
  } catch (err) {
    console.error('[reputation/stats] error:', err);
    // SECURITY E1: Generic error message (never expose error.message)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
