// ============================================
// PROJECT TRUTH: INVESTIGATION STEP API
// POST /api/investigation/step — adım ekle
// Uses RPC function (bypasses PostgREST schema cache)
// SECURITY: C1 (Input Validation) + E1 (Error Sanitization)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { investigationStepSchema, validateBody } from '@/lib/validation';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    // SECURITY C1: Validate request body with Zod schema
    const validation = await validateBody(request, investigationStepSchema);
    if (!validation.success) {
      return validation.response;
    }

    const {
      investigation_id: investigationId,
      step_order: stepOrder,
      question: query,
      ai_response: response,
      highlight_node_ids: highlightNodeIds,
      annotations,
    } = validation.data;

    // Additional context parameters (not in Zod schema, but allowed)
    const body = await request.json();
    const { highlightLinkIds, nodeNames, fingerprint } = body;

    // SECURITY C1: Verify fingerprint exists (basic check)
    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 8) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: [{ path: 'fingerprint', message: 'Invalid fingerprint format' }] },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc('add_investigation_step', {
      p_investigation_id: investigationId,
      p_step_order: stepOrder || 1,
      p_query: query,
      p_response: response,
      p_highlight_node_ids: highlightNodeIds || [],
      p_highlight_link_ids: highlightLinkIds || [],
      p_annotations: annotations || {},
      p_node_names: nodeNames || [],
    });

    // SECURITY E1: Don't expose RPC error details to client
    if (error) {
      console.error('Step insert error:', error.message);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    return NextResponse.json({ step: data });

  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic message to client
    console.error('Step POST error:', error?.message || error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
