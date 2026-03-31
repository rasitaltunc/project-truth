// ============================================
// SPRINT 6A: REPUTATION HISTORY API
// GET /api/reputation/history?fp=X&limit=50 — Reputation transaction geçmişi
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const networkId = searchParams.get('nid');

  try {
    // SECURITY A2: Explicit select — excludes fingerprint columns
    let query = supabaseAdmin
      .from('reputation_transactions')
      .select('id, user_type, transaction_type, amount, reason, network_id, created_at, updated_at')
      .eq('user_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      transactions: data ?? [],
      networkId: networkId ?? null,
    });
  } catch (err) {
    console.error('[reputation/history] error:', err);
    // SECURITY E1: Generic error message (never expose error.message)
    return NextResponse.json({ transactions: [], error: 'Sunucu hatası' }, { status: 500 });
  }
}
