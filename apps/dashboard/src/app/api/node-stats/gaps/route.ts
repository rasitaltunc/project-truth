// ============================================
// SPRINT 5: GAP ANALYSIS API
// GET /api/node-stats/gaps?networkId=xxx
// Hiç sorgulanmamış veya az sorgulanmış node'ları + template öneriler
//
// SECURITY SPRINT AI-1: AI KALDIRILDI
// Groq çağrısı kaldırıldı — template-based öneri üretimi
// Halüsinasyon riski: SIFIR (AI yok = halüsinasyon imkansız)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, CHAT_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Template-based suggestion generation (NO AI — ZERO hallucination risk)
const GAP_TEMPLATES = [
  '{name} kimdir ve ağla nasıl bağlantılıdır? ({connections} bağlantı)',
  '{name} hakkında henüz keşfedilmemiş bağlantılar olabilir mi?',
  '{name} ile ilgili belgeleri araştırdınız mı? ({connections} bağlantı)',
];

// Simple in-memory cache
interface GapCache { data: any; builtAt: number; networkId: string }
let gapCacheRef: GapCache | null = null;
const GAP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 dakika

export async function GET(request: NextRequest) {
  // Rate limit check — CHAT_RATE_LIMIT (20/min)
  const blocked = applyRateLimit(request, CHAT_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId') || '';

    // Cache kontrolü
    const now = Date.now();
    if (
      gapCacheRef &&
      gapCacheRef.networkId === networkId &&
      now - gapCacheRef.builtAt < GAP_CACHE_TTL_MS
    ) {
      return NextResponse.json(gapCacheRef.data);
    }

    // Sorgulanmamış node'ları getir
    const { data: gapNodes, error } = await supabaseAdmin.rpc('get_gap_nodes', {
      p_network_id: networkId || null,
    });

    if (error) {
      console.error('gap nodes error:', error);
      return NextResponse.json({ gaps: [], aiSuggestions: [] });
    }

    const gaps = (gapNodes ?? []).slice(0, 8); // Max 8 gap göster

    if (gaps.length === 0) {
      return NextResponse.json({ gaps: [], aiSuggestions: ['Tüm ağ tarandı! Her düğüm en az bir kez sorgulandı.'] });
    }

    // Bağlantı sayılarını ekle (linkler üzerinden)
    const { data: linkData } = await supabaseAdmin.rpc('get_node_connection_counts', {
      p_network_id: networkId || null,
    });

    const connMap: Record<string, number> = {};
    if (linkData) {
      linkData.forEach((row: { node_id: string; connection_count: number }) => {
        connMap[row.node_id] = row.connection_count;
      });
    }

    const enrichedGaps = gaps.map((g: { id: string; name: string; type: string; tier: string }) => ({
      nodeId: g.id,
      nodeName: g.name,
      nodeType: g.type || 'person',
      tier: g.tier,
      connectionCount: connMap[g.id] ?? 0,
    }));

    // Template-based suggestions (deterministic, no hallucination)
    const aiSuggestions = enrichedGaps.slice(0, 3).map(
      (g: { nodeName: string; connectionCount: number }, idx: number) =>
        GAP_TEMPLATES[idx % GAP_TEMPLATES.length]
          .replace('{name}', g.nodeName)
          .replace('{connections}', String(g.connectionCount))
    );

    const result = { gaps: enrichedGaps, aiSuggestions };

    // Cache güncelle
    gapCacheRef = { data: result, builtAt: Date.now(), networkId };

    return NextResponse.json(result);

  } catch (error) {
    console.error('gap analysis error:', error);
    return NextResponse.json({ gaps: [], aiSuggestions: [] });
  }
}
