/**
 * /api/game/cron
 * POST: Re-verification cron job + hallucination rate update
 *
 * Verification Desk v2: Periyodik bakım görevleri
 *
 * 1. Zayıf konsensüslü görevleri yeniden kuyruğa al
 * 2. 90+ gün eski doğrulanmış verileri yeniden kontrol et
 * 3. Halüsinasyon oranını güncelle
 *
 * GÜVENLİK: Bearer token ile korunur (Vercel Cron veya dışarıdan)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/errorHandler';
import { queueReVerification, calculateHallucinationRate } from '@/lib/verificationEngine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Auth check — CRON_SECRET must be set as a separate env var (not fallback to service key)
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { network_id } = body as { network_id?: string };

    if (!network_id) {
      return NextResponse.json({ error: 'network_id is required' }, { status: 400 });
    }

    // Resolve network ID (slug → UUID)
    let resolvedNetworkId = network_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(network_id);
    if (!isUUID) {
      const { data: network } = await supabaseAdmin
        .from('networks')
        .select('id')
        .or(`slug.eq.${network_id},name.ilike.%${network_id.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      if (network) {
        resolvedNetworkId = network.id;
      } else {
        return NextResponse.json({ error: `Network "${network_id}" not found` }, { status: 404 });
      }
    }

    // 1. Re-verification queue
    const reVerifyResult = await queueReVerification(supabaseAdmin, resolvedNetworkId);

    // 2. Hallucination rate update
    const hallucinationResult = await calculateHallucinationRate(supabaseAdmin, resolvedNetworkId);

    // 3. Log cron execution
    await supabaseAdmin.from('transparency_log').insert({
      action_type: 'cron_verification_maintenance',
      actor_type: 'system',
      target_type: 'network',
      target_id: resolvedNetworkId,
      action_data: {
        reverification: reVerifyResult,
        hallucination_rate: hallucinationResult,
        executed_at: new Date().toISOString(),
      },
      network_id: resolvedNetworkId,
    });

    return NextResponse.json({
      success: true,
      reverification: reVerifyResult,
      hallucination_rate: hallucinationResult,
    });
  } catch (error) {
    return safeErrorResponse('POST /api/game/cron', error);
  }
}
