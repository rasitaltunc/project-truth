// ============================================
// PROJECT TRUTH: INVESTIGATION DETAIL API
// GET /api/investigation/[id] — detay + steps
// Uses RPC function (bypasses PostgREST schema cache)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('get_investigation_detail', {
      p_id: id,
    });

    if (error) {
      console.error('Detail fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || !data.investigation) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      investigation: data.investigation,
      steps: data.steps || [],
    });

  } catch (error) {
    return safeErrorResponse('GET /api/investigation/[id]', error);
  }
}
