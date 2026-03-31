// ============================================
// SPRINT 6A: NOMINATIONS LIST API
// GET /api/badge/nominations?fp=X — Kullanıcıya gelen + gönderilen adaylar
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT, VOTE_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  // SECURITY A1: Fingerprint from X-User-Fingerprint header (URL param fallback for backwards compat)
  const fingerprint = request.headers.get('X-User-Fingerprint') || searchParams.get('fp');

  if (!fingerprint) {
    return NextResponse.json({ error: 'fp (fingerprint) parametresi gerekli' }, { status: 400 });
  }

  try {
    // SECURITY A2: Explicit select — keeps nominator/nominee fingerprints for UI identity, excludes other PII
    // TODO A2: Consider masking fingerprints in nomination responses for additional privacy
    const nominationCols = 'id, nominator_fingerprint, nominee_fingerprint, proposed_tier, reason, status, votes_for, votes_against, created_at, updated_at';

    // Gelen adaylar (bana yapılan)
    const { data: received, error: recvError } = await supabaseAdmin
      .from('badge_nominations')
      .select(nominationCols)
      .eq('nominee_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(50);

    // Gönderilen adaylar (benim yaptıklarım)
    const { data: sent, error: sentError } = await supabaseAdmin
      .from('badge_nominations')
      .select(nominationCols)
      .eq('nominator_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      received: received ?? [],
      sent: sent ?? [],
      errors: {
        received: recvError?.message ?? null,
        sent: sentError?.message ?? null,
      },
    });
  } catch (err) {
    console.error('[badge/nominations] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  // POST handler for nominations would go here if it exists
  // For now, just handling the GET endpoint that exists
  try {
    const body = await request.json();
    // Add nomination logic here
    return NextResponse.json({ error: 'POST not implemented' }, { status: 501 });
  } catch (err) {
    console.error('[badge/nominations] POST error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
