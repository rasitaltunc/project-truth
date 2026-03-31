// ═══════════════════════════════════════════
// BOARD LAYOUT API — Sprint 8
// Soruşturma Panosu pozisyon kaydetme/yükleme
// POST: Kaydet, GET: Yükle
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { validateBody, boardSaveSchema } from '@/lib/validationSchemas';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';

// ── GET: Board layout yükle ──
// SECURITY A1: Fingerprint from X-User-Fingerprint header (URL param fallback for backwards compat)
export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = request.headers.get('X-User-Fingerprint') || searchParams.get('fingerprint');
    const networkId = searchParams.get('network_id');

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'fingerprint parametresi gerekli' },
        { status: 400 }
      );
    }

    // Supabase yoksa localStorage fallback
    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        layout: null,
        source: 'no_db',
        message: 'Supabase bağlantısı yok — localStorage kullanın',
      });
    }

    // SECURITY A2: Explicit select — excludes fingerprint columns
    let query = (supabase as any)
      .from('board_layouts')
      .select('id, layout_data, investigation_id, updated_at, created_at')
      .eq('user_fingerprint', fingerprint)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (networkId) {
      query = query.eq('investigation_id', networkId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Board layout fetch error:', error);
      return NextResponse.json({ layout: null, error: error.message });
    }

    return NextResponse.json({
      layout: data,
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('GET /api/board', err);
  }
}

// ── POST: Board layout kaydet (upsert) ──
export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 2MB default for JSON
  const tooBig = checkBodySize(request);
  if (tooBig) return tooBig;

  try {
    const body = await request.json();

    // Validate board layout data
    const validation = validateBody(boardSaveSchema, body);
    if (!validation.success) return validation.response;
    const {
      network_id,
      node_positions,
      sticky_notes,
      media_cards,
      zoom,
      pan_x,
      pan_y,
    } = validation.data;

    // Extract fingerprint from body (not validated by schema in this route)
    const { fingerprint } = body;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'fingerprint gerekli' },
        { status: 400 }
      );
    }

    // Supabase yoksa sadece başarılı dön
    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        saved: false,
        source: 'no_db',
        message: 'Supabase yok — localStorage fallback kullanın',
      });
    }

    // Mevcut layout var mı?
    let existingQuery = (supabase as any)
      .from('board_layouts')
      .select('id')
      .eq('user_fingerprint', fingerprint);

    if (network_id) {
      existingQuery = existingQuery.eq('investigation_id', network_id);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    const layoutData = {
      user_fingerprint: fingerprint,
      investigation_id: network_id || null,
      node_positions,
      sticky_notes: sticky_notes || [],
      media_cards: media_cards || [],
      zoom: zoom ?? 1.0,
      pan_x: pan_x ?? 0,
      pan_y: pan_y ?? 0,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existing?.id) {
      // Update
      result = await (supabase as any)
        .from('board_layouts')
        .update(layoutData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert
      result = await (supabase as any)
        .from('board_layouts')
        .insert(layoutData)
        .select()
        .single();
    }

    if (result.error) {
      // Tablo yoksa sessizce devam et (migration henüz yapılmamış olabilir)
      if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
        return NextResponse.json({
          saved: false,
          source: 'no_table',
          message: 'board_layouts tablosu henüz oluşturulmamış — localStorage kullanın',
        });
      }
      console.error('Board layout save error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      saved: true,
      source: 'supabase',
      layout: result.data,
    });
  } catch (err: any) {
    return safeErrorResponse('POST /api/board', err);
  }
}
