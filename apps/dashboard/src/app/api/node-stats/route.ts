// ============================================
// SPRINT 5: NODE QUERY STATS API
// POST /api/node-stats — AI sorgusu sonrası node stats güncelle
// GET  /api/node-stats — Tüm stats getir (Heat Map için)
// Uses RPC functions (bypasses PostgREST schema cache)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, nodeStatsSchema } from '@/lib/validationSchemas';

export const dynamic = 'force-dynamic';

// ============================================
// POST — Sorgu sonrası node stats güncelle
// Body: { nodeIds: string[], annotations: Record<string, string>, fingerprint: string }
// ============================================
export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();

    // Validate node stats data
    const validation = validateBody(nodeStatsSchema, body);
    if (!validation.success) return validation.response;
    const { nodeIds, annotations } = validation.data;

    // Extract fingerprint from body (optional, not validated by schema)
    const { fingerprint } = body;

    if (!nodeIds || nodeIds.length === 0) {
      return NextResponse.json({ firstDiscoveries: [], updatedCount: 0 });
    }

    const firstDiscoveries: { nodeId: string; nodeName: string }[] = [];

    // Her node için increment
    for (const nodeId of nodeIds) {
      try {
        // Mevcut count'ı oku (ilk keşif tespiti için)
        const { data: existing } = await supabaseAdmin.rpc('get_node_stat', {
          p_node_id: nodeId,
        });

        const prevCount = existing?.highlight_count ?? 0;

        // Annotation key varsa gönder
        const annotationKey = annotations?.[nodeId] ?? null;

        await supabaseAdmin.rpc('upsert_node_query_stat', {
          p_node_id: nodeId,
          p_annotation_key: annotationKey,
          p_fingerprint: fingerprint ?? null,
        });

        // İlk keşif: 0 → 1 geçişi
        if (prevCount === 0) {
          // Node adını çek
          const { data: nodeData } = await supabaseAdmin.rpc('get_node_name', {
            p_node_id: nodeId,
          });
          if (nodeData?.name) {
            firstDiscoveries.push({ nodeId, nodeName: nodeData.name });
          }
        }
      } catch {
        // Tek node hatası tüm batch'i durdurmasın
        console.warn('🔴 node-stats: single node update failed:', nodeId);
      }
    }

    return NextResponse.json({
      firstDiscoveries,
      updatedCount: nodeIds.length,
    });

  } catch (error) {
    console.error('node-stats POST error:', error);
    // Hata durumunda bile 200 dön — chatStore bloklanmasın
    return NextResponse.json({ firstDiscoveries: [], updatedCount: 0 });
  }
}

// ============================================
// GET — Tüm node stats getir (Heat Map için)
// ============================================
export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { data, error } = await supabaseAdmin.rpc('get_node_query_stats');

    if (error) {
      console.error('node-stats GET error:', error);
      return NextResponse.json({ stats: [] });
    }

    return NextResponse.json({ stats: data ?? [] });

  } catch (error) {
    console.error('node-stats GET error:', error);
    return NextResponse.json({ stats: [] });
  }
}
