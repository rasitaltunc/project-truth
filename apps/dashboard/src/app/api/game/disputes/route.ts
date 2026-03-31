/**
 * /api/game/disputes
 * GET: List disputes
 * POST: File a new dispute
 *
 * Sprint G1: Universal Dispute System
 * "Herkes, her şeye, kolayca itiraz edebilmeli"
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GAME_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';
import { safePage, safeLimit } from '@/lib/inputSanitizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GAME_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get('network_id');
    const targetId = searchParams.get('target_id');
    const status = searchParams.get('status');
    const page = safePage(searchParams.get('page'));
    const limit = safeLimit(searchParams.get('limit'), 20);

    // Resolve slug to UUID (disputes.network_id is UUID)
    let resolvedNetworkId: string | null = networkId;
    if (networkId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(networkId);
      if (!isUUID) {
        const { data: network } = await supabaseAdmin
          .from('networks')
          .select('id')
          .or(`slug.eq.${networkId},name.ilike.%${networkId.replace(/-/g, ' ')}%`)
          .limit(1)
          .maybeSingle();
        resolvedNetworkId = network?.id || null;
      }
    }

    let query = supabaseAdmin
      .from('disputes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (resolvedNetworkId) query = query.eq('network_id', resolvedNetworkId);
    if (targetId) query = query.eq('target_id', targetId);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      disputes: data || [],
      totalCount: count || 0,
      page,
      limit,
    });
  } catch (error) {
    return safeErrorResponse('GET /api/game/disputes', error);
  }
}

export async function POST(req: NextRequest) {
  const blocked = applyRateLimit(req, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const {
      network_id,
      fingerprint,
      target_type,
      target_id,
      dispute_type,
      title,
      description,
      evidence_urls,
      suggested_correction,
    } = body;

    // Validation
    if (!network_id || !fingerprint || !target_type || !target_id || !dispute_type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: network_id, fingerprint, target_type, target_id, dispute_type, title, description' },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 5-200 characters' },
        { status: 400 }
      );
    }

    if (description.length < 20) {
      return NextResponse.json(
        { error: 'Description must be at least 20 characters — explain your reasoning' },
        { status: 400 }
      );
    }

    // Validate target_type and dispute_type enums
    const validTargetTypes = ['task', 'assignment', 'entity', 'relationship', 'link', 'quarantine_item', 'consensus'];
    const validDisputeTypes = ['false_positive', 'false_negative', 'accuracy_issue', 'bias', 'insufficient_evidence', 'other'];

    if (!validTargetTypes.includes(target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${validTargetTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validDisputeTypes.includes(dispute_type)) {
      return NextResponse.json(
        { error: `Invalid dispute_type. Must be one of: ${validDisputeTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Resolve slug to UUID for disputes table
    let resolvedNid: string | null = network_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(network_id);
    if (!isUUID) {
      const { data: network } = await supabaseAdmin
        .from('networks')
        .select('id')
        .or(`slug.eq.${network_id},name.ilike.%${network_id.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      resolvedNid = network?.id || null;
      if (!resolvedNid) {
        return NextResponse.json({ error: 'Network not found' }, { status: 404 });
      }
    }

    // Check rate: max 5 disputes per user per day
    const { count: recentDisputes } = await supabaseAdmin
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('filed_by_fingerprint', fingerprint)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if ((recentDisputes || 0) >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 disputes per day. This prevents abuse while ensuring legitimate concerns are heard.' },
        { status: 429 }
      );
    }

    // Insert dispute
    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .insert({
        network_id: resolvedNid,
        target_type,
        target_id,
        filed_by_fingerprint: fingerprint,
        dispute_type,
        title,
        description,
        evidence_urls: evidence_urls || [],
        suggested_correction: suggested_correction || null,
        status: 'open',
        is_public: true,
      })
      .select('id, trace_id')
      .single();

    if (error) throw error;

    // Log to transparency trail
    await supabaseAdmin.from('transparency_log').insert({
      action_type: 'dispute_filed',
      actor_fingerprint: fingerprint,
      actor_type: 'user',
      target_type,
      target_id,
      action_data: {
        dispute_id: dispute.id,
        dispute_type,
        title,
        description_preview: description.substring(0, 100),
      },
      network_id: resolvedNid,
      related_trace_ids: [dispute.trace_id],
    });

    return NextResponse.json({
      success: true,
      dispute_id: dispute.id,
      trace_id: dispute.trace_id,
      message: 'İtirazın kaydedildi. Tüm itirazlar kamuya açıktır ve bağımsız inceleme sürecine tabi tutulacaktır.',
    });
  } catch (error) {
    return safeErrorResponse('POST /api/game/disputes', error);
  }
}
