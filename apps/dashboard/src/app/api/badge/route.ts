// ============================================
// SPRINT 6A: BADGE API
// GET  /api/badge?fingerprint=X&networkId=Y — Get user badge(s)
// POST /api/badge — Upsert/create user badge entry
//
// SECURITY SPRINT S1: Tier protection + rate limiting
// - journalist/institutional tiers blocked from direct POST
// - Rate limiting added (GENERAL_RATE_LIMIT: 60/min)
// - Audit logging for badge changes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientId, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { logAuditActionFromRequest } from '@/lib/auditLog';
import { validateSession } from '@/lib/sessionValidator';

export const dynamic = 'force-dynamic';

// ============================================
// GET — Kullanıcının badge bilgilerini getir
// SECURITY: Fingerprint validated via session cookie + header binding
// ============================================
export async function GET(request: NextRequest) {
  // SECURITY D2: Validate session to prevent fingerprint impersonation
  const session = await validateSession(request);
  if (!session.valid) {
    return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
  }
  const fingerprint = session.fingerprint!;

  const { searchParams } = new URL(request.url);
  const networkId = searchParams.get('networkId');

  try {
    // Global badge
    let globalBadge = null;
    const { data: globalData, error: globalError } = await supabaseAdmin
      .from('user_global_badges')
      .select('*')
      .eq('user_fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle();

    if (!globalError) {
      globalBadge = globalData;
    }

    // Network badge (optional)
    let networkBadge = null;
    if (networkId) {
      const { data: netData, error: netError } = await supabaseAdmin
        .from('user_badges')
        .select('*')
        .eq('user_fingerprint', fingerprint)
        .eq('network_id', networkId)
        .eq('is_active', true)
        .maybeSingle();

      if (!netError) {
        networkBadge = netData;
      }
    }

    // Reputation stats
    let reputation = null;
    const { data: repData } = await supabaseAdmin
      .from('truth_users')
      .select('reputation_score, total_contributions, verified_contributions, accuracy_rate, nomination_count')
      .eq('anonymous_id', fingerprint)
      .maybeSingle();

    if (repData) {
      reputation = {
        // SECURITY A2: fingerprint removed from response — client already knows its own
        score: repData.reputation_score ?? 0,
        total_contributions: repData.total_contributions ?? 0,
        verified_contributions: repData.verified_contributions ?? 0,
        accuracy_rate: repData.accuracy_rate ?? 0,
        nomination_count: repData.nomination_count ?? 0,
        days_active: 0, // computed separately if needed
      };
    }

    // SECURITY A2: Strip user_fingerprint from badge objects before sending to client
    const sanitize = (obj: Record<string, unknown> | null) => {
      if (!obj) return null;
      const { user_fingerprint, ...rest } = obj;
      return rest;
    };
    return NextResponse.json({
      globalBadge: sanitize(globalBadge as Record<string, unknown> | null),
      networkBadge: sanitize(networkBadge as Record<string, unknown> | null),
      reputation,
    });
  } catch (err) {
    console.error('[badge/GET] error:', err);
    // SECURITY E1: Generic error message (never expose error.message)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// ============================================
// POST — Badge oluştur veya güncelle (sistem tarafından)
// Body: { fingerprint, networkId?, badgeTier, grantedBy?, oauthProvider?, oauthOrgId? }
// ============================================
export async function POST(request: NextRequest) {
  try {
    // C6 FIX: Session validation — fingerprint from session cookie, NOT body
    const session = await validateSession(request);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }
    const fingerprint = session.fingerprint!;

    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(clientId, GENERAL_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit aşıldı. Lütfen bekleyin.' }, { status: 429 });
    }

    const body = await request.json();
    const { networkId, badgeTier, oauthProvider, oauthOrgId, metadata } = body;
    // C6 FIX: grantedBy is NO LONGER accepted from body — server determines this
    // For nomination flow: /api/badge/nominate sets grantedBy server-side
    // For self-initiated: grantedBy = fingerprint (yourself, only for anonymous/community tiers)
    const grantedBy = fingerprint;

    if (!badgeTier) {
      return NextResponse.json({ error: 'badgeTier gerekli' }, { status: 400 });
    }

    const validTiers = ['anonymous', 'community', 'journalist', 'institutional'];
    if (!validTiers.includes(badgeTier)) {
      return NextResponse.json({ error: 'Geçersiz badge tier' }, { status: 400 });
    }

    // C6 FIX: ABSOLUTE BLOCK on journalist/institutional self-grant via this endpoint
    // These tiers can ONLY be granted through dedicated endpoints:
    // - /api/badge/nominate (peer nomination with server-side grantedBy)
    // - /api/badge/journalist-request (application + admin approval)
    // Since grantedBy is now always = fingerprint (self), these tiers are unreachable here.
    if (badgeTier === 'journalist' || badgeTier === 'institutional') {
      await logAuditActionFromRequest(request, {
        fingerprint,
        action: 'badge_blocked',
        resource: 'user_badges',
        result: 'blocked',
        metadata: { attempted_tier: badgeTier, reason: 'direct_grant_blocked' },
      });
      return NextResponse.json(
        { error: 'journalist ve institutional tier\'lar bu endpoint üzerinden atanamaz. /api/badge/nominate veya /api/badge/journalist-request kullanın.' },
        { status: 403 }
      );
    }

    if (networkId) {
      // Network-scoped badge
      const { data, error } = await supabaseAdmin
        .from('user_badges')
        .upsert({
          user_fingerprint: fingerprint,
          network_id: networkId,
          badge_tier: badgeTier,
          granted_by: grantedBy ?? null,
          oauth_provider: oauthProvider ?? null,
          oauth_org_id: oauthOrgId ?? null,
          is_active: true,
          metadata: metadata ?? {},
        }, { onConflict: 'user_fingerprint,network_id' })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      logAuditActionFromRequest(request, {
        fingerprint,
        action: 'badge_change',
        resource: 'user_badges',
        resourceId: data?.id,
        result: 'success',
        metadata: { badge_tier: badgeTier, scope: 'network', network_id: networkId },
      });

      return NextResponse.json({ badge: data, scope: 'network' });
    } else {
      // Global badge
      const { data, error } = await supabaseAdmin
        .from('user_global_badges')
        .upsert({
          user_fingerprint: fingerprint,
          badge_tier: badgeTier,
          granted_by: grantedBy ?? null,
          oauth_provider: oauthProvider ?? null,
          oauth_org_id: oauthOrgId ?? null,
          is_active: true,
          metadata: metadata ?? {},
        }, { onConflict: 'user_fingerprint' })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      logAuditActionFromRequest(request, {
        fingerprint,
        action: 'badge_change',
        resource: 'user_global_badges',
        resourceId: data?.id,
        result: 'success',
        metadata: { badge_tier: badgeTier, scope: 'global' },
      });

      return NextResponse.json({ badge: data, scope: 'global' });
    }
  } catch (err) {
    console.error('[badge/POST] error:', err);
    // SECURITY E1: Generic error message (never expose error.message)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
