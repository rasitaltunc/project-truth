// ============================================
// SPRINT 6A: STAKED EVIDENCE SUBMIT API
// POST /api/evidence/submit — Reputation stake ile kanıt gönder
// Reputation ekonomisi: -5 stake, +15 doğrulanırsa, -10 reddedilirse
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateDynamicStake, getEvidenceTypeMultiplier } from '@/lib/reputation';
import { validateBody, evidenceSubmitSchema } from '@/lib/validationSchemas';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

export const dynamic = 'force-dynamic';

const LEGACY_STAKE_AMOUNT = 5;    // Eski sabit stake (fallback)
const RATE_LIMITS = {
  anonymous: 1,     // Saatte 1 kanıt
  community: 5,     // Saatte 5 kanıt
  journalist: 999,  // Sınırsız
  institutional: 999,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(evidenceSubmitSchema, body);
    if (!validation.success) return validation.response;

    const {
      networkId,
      nodeId,
      linkId,
      title,
      description,
      evidenceType,
      sourceUrl,
      sourceName,
      sourceDate,
      content,
      stake = LEGACY_STAKE_AMOUNT,
      // Sprint 6B: Dinamik staking + provenance
      stakePercent,       // 1-10 arası (dinamik mod)
      sourceType,         // evidence_provenance kaynak tipi
      sourceHierarchy,    // primary/secondary/tertiary
      provenanceUrl,      // Kaynak URL
    } = validation.data;

    // ── AUTH BRIDGE: Resolve identity (auth token OR fingerprint header) ──
    // SECURITY: NEVER fall back to body.fingerprint — attacker can fabricate it
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli. Giriş yapın veya anonim oturum başlatın.' },
        { status: 401 }
      );
    }

    // ── PERMISSION CHECK: Only contributors+ can submit evidence ──
    if (!identityHasPermission(identity, 'submit_evidence')) {
      return NextResponse.json(
        { error: 'Kanıt göndermek için giriş yapmanız gerekiyor.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    // Get user's badge tier for rate limiting
    let userTier = 'anonymous';
    try {
      const { data: badge } = await supabaseAdmin
        .rpc('get_user_badge', {
          p_fingerprint: fingerprint,
          p_network_id: networkId ?? null,
        })
        .maybeSingle();
      if (badge?.badge_tier) userTier = badge.badge_tier;
    } catch {
      // Use anonymous defaults
    }

    // Rate limit check (last hour submissions)
    const rateLimit = RATE_LIMITS[userTier as keyof typeof RATE_LIMITS] ?? 1;
    if (rateLimit < 999) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabaseAdmin
        .from('evidence_archive')
        .select('id', { count: 'exact', head: true })
        .eq('submitted_by', fingerprint)
        .gte('created_at', oneHourAgo);

      if ((recentCount ?? 0) >= rateLimit) {
        return NextResponse.json(
          {
            error: `Rate limit: ${rateLimit}/saat kanıt gönderebilirsiniz. ${
              userTier === 'anonymous'
                ? 'Daha fazla gönderi için katkılarınızla Platform Kurdu rozeti kazanın.'
                : 'Biraz bekleyin.'
            }`,
          },
          { status: 429 }
        );
      }
    }

    // Sprint 6B: Dinamik stake hesaplama
    let actualStake = stake;
    const { data: userStats } = await supabaseAdmin
      .from('truth_users')
      .select('reputation_score')
      .eq('anonymous_id', fingerprint)
      .maybeSingle();

    const currentRep = userStats?.reputation_score ?? 0;

    if (stakePercent && currentRep > 0) {
      // Dinamik mod: kullanıcı itibarının %1-10'u
      actualStake = calculateDynamicStake(currentRep, stakePercent);
    }

    // Check if user has enough reputation for stake
    if (actualStake > 0 && currentRep < actualStake) {
      return NextResponse.json(
        { error: `Yetersiz reputation. Gerekli: ${actualStake}, Mevcut: ${currentRep}` },
        { status: 400 }
      );
    }

    // Ödül potansiyelini hesapla (UI bilgilendirme)
    const rewardMultiplier = getEvidenceTypeMultiplier(sourceType || evidenceType || 'inference');

    // Try submit_staked_evidence RPC first
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'submit_staked_evidence',
        {
          p_fingerprint: fingerprint,
          p_node_id: nodeId ?? null,
          p_title: title,
          p_evidence_type: evidenceType,
          p_source_url: sourceUrl ?? null,
          p_description: description ?? null,
          p_network_id: networkId ?? null,
          p_stake: stake,
        }
      );

      if (!rpcError) {
        return NextResponse.json({ evidence: rpcResult, usedRpc: true });
      }
    } catch {
      // RPC not available, use direct insert
    }

    // Direct insert fallback
    const { data: newEvidence, error: insertError } = await supabaseAdmin
      .from('evidence_archive')
      .insert({
        submitted_by: fingerprint,
        node_id: nodeId ?? null,
        title,
        description: description ?? null,
        evidence_type: evidenceType,
        source_url: sourceUrl ?? null,
        source_name: sourceName ?? null,
        source_date: sourceDate ?? null,
        content: content ?? null,
        verification_status: 'pending',
        staked_reputation: stake,
        network_id: networkId ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Deduct staked reputation via RPC (handles transaction + user score update)
    if (stake > 0) {
      await supabaseAdmin.rpc('record_reputation', {
        p_fingerprint: fingerprint,
        p_type: 'evidence_submit_stake',
        p_amount: -stake,
        p_reference_id: newEvidence.id,
        p_reference_type: 'evidence',
        p_description: `Kanıt gönderildi — ${stake} puan stake edildi`,
        p_network_id: networkId ?? null,
        p_staked: stake,
      }).catch(() => {});
    }

    // Sprint 6B: Otomatik provenance kaydı oluştur
    if (sourceType && newEvidence?.id) {
      try {
        await supabaseAdmin
          .from('evidence_provenance')
          .insert({
            evidence_id: newEvidence.id,
            evidence_table: 'evidence_archive',
            source_type: sourceType,
            source_hierarchy: sourceHierarchy || 'tertiary',
            source_url: provenanceUrl || sourceUrl || null,
            verification_chain: [],
            language: 'en',
          });
      } catch {
        // Provenance tablosu henüz yoksa sessizce geç
      }
    }

    return NextResponse.json({
      evidence: newEvidence,
      staked: actualStake,
      rewardMultiplier,
      potentialReward: Math.floor(actualStake * rewardMultiplier),
    });
  } catch (err) {
    console.error('[evidence/submit] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
