// ============================================
// PROJECT TRUTH: INVESTIGATION FEED API
// GET /api/investigation/feed — yayınlanmış soruşturmalar
// Uses RPC function (bypasses PostgREST schema cache)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';
import { safeLimit, safeOffset } from '@/lib/inputSanitizer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const sortRaw = searchParams.get('sort') || 'significance';
    // SECURITY: Whitelist sort values to prevent RPC parameter injection
    const ALLOWED_SORTS = ['significance', 'newest', 'votes', 'steps'];
    const sort = ALLOWED_SORTS.includes(sortRaw) ? sortRaw : 'significance';
    const limit = safeLimit(searchParams.get('limit'));
    const offset = safeOffset(searchParams.get('offset'));

    const { data, error } = await supabaseAdmin.rpc('get_investigation_feed', {
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Feed fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      investigations: data?.investigations || [],
      total: data?.total || 0,
      offset,
      limit,
    });

  } catch (error) {
    return safeErrorResponse('GET /api/investigation/feed', error);
  }
}
