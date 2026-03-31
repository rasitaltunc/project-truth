// ============================================
// SPRINT 6A: JOURNALIST BADGE REQUEST API
// POST /api/badge/journalist-request — Gazeteci rozeti başvurusu
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, badgeJournalistRequestSchema } from '@/lib/validationSchemas';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = validateBody(badgeJournalistRequestSchema, body);
    if (!validation.success) return validation.response;

    const { portfolioUrl, reason } = validation.data;

    // Resolve identity from request
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli.' },
        { status: 401 }
      );
    }

    // Check permission: journalist request is a contribution
    if (!identityHasPermission(identity, 'submit_evidence')) {
      return NextResponse.json(
        { error: 'Bu işlem için yeterli izniniz yok.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    // Check if already pending application
    const { data: existing } = await supabaseAdmin
      .from('badge_nominations')
      .select('id, status')
      .eq('nominee_fingerprint', fingerprint)
      .eq('nominator_fingerprint', 'system:journalist-request')
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Zaten bekleyen bir başvurunuz var. İnceleme 3-5 iş günü sürebilir.' },
        { status: 409 }
      );
    }

    // Create a system nomination record as the request
    const { data: nomination, error } = await supabaseAdmin
      .from('badge_nominations')
      .insert({
        nominee_fingerprint: fingerprint,
        nominator_fingerprint: 'system:journalist-request',
        network_id: null, // global request
        reason: `JOURNALIST_REQUEST\nPortfolio: ${portfolioUrl}\n\n${reason}`,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Gazeteci rozeti talebiniz alındı. İnceleme 3-5 iş günü sürebilir.',
      nominationId: nomination.id,
    });
  } catch (err) {
    console.error('[badge/journalist-request] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
