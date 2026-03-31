// ============================================
// SPRINT 6A: BADGE NOMINATION API
// POST /api/badge/nominate — Platform Kurdu (Tier 2) aday göster
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, VOTE_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, badgeNominateSchema } from '@/lib/validationSchemas';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = validateBody(badgeNominateSchema, body);
    if (!validation.success) return validation.response;

    const { nominee_fingerprint, network_id, reason } = validation.data;

    // Resolve identity from request
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli.' },
        { status: 401 }
      );
    }

    // Check permission: nomination is like voting
    if (!identityHasPermission(identity, 'vote')) {
      return NextResponse.json(
        { error: 'Bu işlem için yeterli izniniz yok.' },
        { status: 403 }
      );
    }

    const nominator_fingerprint = identity.fingerprint;

    if (nominator_fingerprint === nominee_fingerprint) {
      return NextResponse.json(
        { error: 'Kendinizi aday gösteremezsiniz.' },
        { status: 400 }
      );
    }

    // Nominator'ın badge'ini kontrol et (en az community tier gerekli)
    const { data: nomBadge } = await supabaseAdmin
      .rpc('get_user_badge', {
        p_fingerprint: nominator_fingerprint,
        p_network_id: network_id,
      })
      .maybeSingle();

    const allowedTiers = ['community', 'journalist', 'institutional'];
    if (!nomBadge || !allowedTiers.includes(nomBadge.badge_tier)) {
      return NextResponse.json(
        { error: 'Aday göstermek için en az Platform Kurdu rozetine ihtiyacın var.' },
        { status: 403 }
      );
    }

    // Daha önce aynı aday gösterilmiş mi?
    const { data: existing } = await supabaseAdmin
      .from('badge_nominations')
      .select('id, status')
      .eq('nominee_fingerprint', nominee_fingerprint)
      .eq('nominator_fingerprint', nominator_fingerprint)
      .eq('network_id', network_id)
      .neq('status', 'expired')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Bu kullanıcıyı zaten aday gösterdiniz.' },
        { status: 409 }
      );
    }

    // Aday gösterme ekle
    const { data: nomination, error: nomError } = await supabaseAdmin
      .from('badge_nominations')
      .insert({
        nominee_fingerprint,
        nominator_fingerprint,
        network_id,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (nomError) throw nomError;

    // Nominator'a reputation puanı ekle (nomination_received event için nominee'ye)
    // Bu işlem trigger veya ayrı bir job ile de yapılabilir
    // Şimdilik basit bir log ekliyoruz
    await supabaseAdmin.from('reputation_transactions').insert({
      user_fingerprint: nominee_fingerprint,
      network_id,
      transaction_type: 'nomination_received',
      amount: 10,
      reference_id: nomination.id,
      description: `Aday gösterildi: ${nominator_fingerprint.slice(0, 8)}... tarafından`,
    }).catch(() => {}); // soft fail

    // Adayın toplam nomination sayısını güncelle (truth_users'da varsa)
    await supabaseAdmin
      .from('truth_users')
      .select('nomination_count')
      .eq('anonymous_id', nominee_fingerprint)
      .maybeSingle()
      .then(async ({ data: user }: { data: { nomination_count: number | null } | null }) => {
        if (user) {
          await supabaseAdmin
            .from('truth_users')
            .update({ nomination_count: (user.nomination_count ?? 0) + 1 })
            .eq('anonymous_id', nominee_fingerprint)
            .catch(() => {});
        }
      })
      .catch(() => {}); // soft fail

    // Tier 2 yükseltme kontrolü
    const { data: promotionCheck } = await supabaseAdmin
      .rpc('check_and_promote_badge', {
        p_fingerprint: nominee_fingerprint,
        p_network_id: network_id,
      })
      .maybeSingle();

    let promoted = false;
    if (promotionCheck?.eligible) {
      // Otomatik promote et
      await supabaseAdmin
        .from('user_badges')
        .upsert({
          user_fingerprint: nominee_fingerprint,
          network_id,
          badge_tier: 'community',
          granted_by: 'system:auto-promotion',
          is_active: true,
          metadata: { promoted_at: new Date().toISOString(), trigger: 'nomination_threshold' },
        }, { onConflict: 'user_fingerprint,network_id' });
      promoted = true;
    }

    return NextResponse.json({ nomination, promoted });
  } catch (err) {
    console.error('[badge/nominate] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
