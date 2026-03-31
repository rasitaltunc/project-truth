// ============================================
// SPRINT 5: GÜNÜN SORUSU API
// GET  /api/daily-question?networkId=xxx — Günün sorusunu getir
// POST /api/daily-question/answered — Cevaplanma sayısını artır
//
// SECURITY SPRINT AI-1: AI KALDIRILDI
// Groq çağrısı kaldırıldı — template-based soru üretimi
// Halüsinasyon riski: SIFIR (AI yok = halüsinasyon imkansız)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, CHAT_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Template-based question generation (NO AI — ZERO hallucination risk)
const QUESTION_TEMPLATES = [
  '{name} kimdir ve bu ağdaki rolü nedir?',
  '{name} ile diğer kişiler arasındaki bağlantılar nelerdir?',
  '{name} hakkında hangi belgeler mevcut?',
  '{name} bu ağa nasıl dahil oldu?',
  '{name} ile ilgili zaman çizelgesi nasıl görünüyor?',
  '{name} hangi olaylarda yer almış?',
  '{name} ({connections} bağlantı) hakkında neler biliyoruz?',
];

// In-memory daily cache (per network)
const dailyCache: Map<string, { question: string; targetNodeId: string; targetNodeName: string; expiresAt: string; answeredCount: number; builtAt: number }> = new Map();

export async function GET(request: NextRequest) {
  // Rate limit check — CHAT_RATE_LIMIT (20/min)
  const blocked = applyRateLimit(request, CHAT_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId') || '';

    const cacheKey = `daily_${networkId}`;
    const now = Date.now();

    // Cache kontrolü: 24 saat geçerli
    const cached = dailyCache.get(cacheKey);
    if (cached && now < new Date(cached.expiresAt).getTime()) {
      return NextResponse.json(cached);
    }

    // En az sorgulanmış (ama bağlantılı) node'u bul
    const { data: gapNodes } = await supabaseAdmin.rpc('get_gap_nodes', {
      p_network_id: networkId || null,
    });

    if (!gapNodes || gapNodes.length === 0) {
      return NextResponse.json({
        question: 'Bu ağdaki en kritik düğümün tüm bağlantılarını araştırdınız mı?',
        targetNodeId: null,
        targetNodeName: null,
        expiresAt: getTomorrow(),
        answeredCount: 0,
      });
    }

    // Bağlantı sayısına göre sırala
    const { data: linkData } = await supabaseAdmin.rpc('get_node_connection_counts', {
      p_network_id: networkId || null,
    });

    const connMap: Record<string, number> = {};
    if (linkData) {
      linkData.forEach((row: { node_id: string; connection_count: number }) => {
        connMap[row.node_id] = row.connection_count;
      });
    }

    const sorted = [...gapNodes].sort(
      (a: { id: string }, b: { id: string }) => (connMap[b.id] ?? 0) - (connMap[a.id] ?? 0)
    );
    const target = sorted[0] as { id: string; name: string; type: string; tier: string };

    // Deterministic template selection (day-based — different template each day)
    const dayIndex = new Date().getDate() % QUESTION_TEMPLATES.length;
    const question = QUESTION_TEMPLATES[dayIndex]
      .replace('{name}', target.name)
      .replace('{connections}', String(connMap[target.id] ?? 0));

    const result = {
      question,
      targetNodeId: target.id,
      targetNodeName: target.name,
      expiresAt: getTomorrow(),
      answeredCount: 0,
    };

    dailyCache.set(cacheKey, { ...result, builtAt: Date.now() });

    return NextResponse.json(result);

  } catch (error) {
    console.error('daily-question error:', error);
    return NextResponse.json({
      question: 'Bu ağda henüz keşfedilmemiş bağlantılar var. Araştırmaya başlayın.',
      targetNodeId: null,
      targetNodeName: null,
      expiresAt: getTomorrow(),
      answeredCount: 0,
    });
  }
}

// POST — Cevaplanma sayısını artır (fire-and-forget)
export async function POST(request: NextRequest) {
  // Rate limit check — CHAT_RATE_LIMIT (20/min)
  const blocked = applyRateLimit(request, CHAT_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId') || '';
    const cacheKey = `daily_${networkId}`;
    const cached = dailyCache.get(cacheKey);
    if (cached) {
      cached.answeredCount++;
      dailyCache.set(cacheKey, cached);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
