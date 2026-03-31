// ============================================
// PROJECT TRUTH: INVESTIGATION FORK API
// POST /api/investigation/fork — soruşturmayı devam ettir
// Uses RPC function (bypasses PostgREST schema cache)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investigationId, fingerprint, authorName } = body;

    if (!investigationId || !fingerprint) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('fork_investigation', {
      p_investigation_id: investigationId,
      p_fingerprint: fingerprint,
      p_author_name: authorName || 'Anonim Araştırmacı',
    });

    if (error) {
      console.error('Fork error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }

    return NextResponse.json({
      forked: data?.forked || null,
    });

  } catch (error) {
    return safeErrorResponse('POST /api/investigation/fork', error);
  }
}
