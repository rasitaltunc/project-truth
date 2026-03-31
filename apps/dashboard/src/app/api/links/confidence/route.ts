// ============================================
// SPRINT 6B: LINK CONFIDENCE API
// GET  /api/links/confidence — Tüm linklerin epistemolojik verisini getir
// POST /api/links/confidence — Tek bir link'in confidence'ını yeniden hesapla
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// 5 dakikalık cache
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dk

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('network_id');

    // Cache kontrolü
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_TTL) {
      return NextResponse.json(cachedData);
    }

    // RPC ile tüm link confidence verisini çek
    let data;
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'get_link_confidence_map',
        { p_network_id: networkId ?? null }
      );
      if (!rpcError) {
        data = rpcResult;
      }
    } catch {
      // RPC yoksa doğrudan sorgu
    }

    // Fallback: doğrudan links tablosundan çek
    if (!data) {
      let query = supabaseAdmin
        .from('links')
        .select('id, evidence_type, confidence_level, source_hierarchy, evidence_count');

      if (networkId) {
        query = query.eq('network_id', networkId);
      }

      const { data: directData, error: directError } = await query;
      if (directError) throw directError;

      data = (directData || []).map((l: any) => ({
        link_id: l.id,
        evidence_type: l.evidence_type || 'inference',
        confidence_level: l.confidence_level ?? 0.5,
        source_hierarchy: l.source_hierarchy || 'tertiary',
        evidence_count: l.evidence_count || 0,
      }));
    }

    const response = { links: data || [] };
    cachedData = response;
    cacheTime = now;

    return NextResponse.json(response);
  } catch (err) {
    console.error('[links/confidence] GET error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { link_id } = body;

    if (!link_id) {
      return NextResponse.json(
        { error: 'link_id gerekli' },
        { status: 400 }
      );
    }

    // RPC ile yeniden hesapla
    let result;
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'recalculate_link_confidence',
        { p_link_id: link_id }
      );
      if (!rpcError) {
        result = rpcResult;
      }
    } catch {
      // RPC yoksa fallback
    }

    if (!result) {
      // Basit fallback: mevcut veriyi döndür
      const { data: link } = await supabaseAdmin
        .from('links')
        .select('id, evidence_type, confidence_level, source_hierarchy, evidence_count')
        .eq('id', link_id)
        .single();

      result = link;
    }

    // Cache'i invalidate et
    cachedData = null;

    return NextResponse.json({ confidence: result });
  } catch (err) {
    console.error('[links/confidence] POST error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
