// ============================================
// SPRINT 6A: PENDING EVIDENCE API
// GET /api/evidence/pending?networkId=X — İnceleme bekleyen kanıtlar
// For Tier 2+ review queue
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const networkId = searchParams.get('networkId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  try {
    // evidence_archive tablosundan pending olanları çek
    let query = supabaseAdmin
      .from('evidence_archive')
      .select(`
        id,
        title,
        description,
        source_url,
        source_name,
        evidence_type,
        staked_reputation,
        submitted_by,
        created_at,
        node_id
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (networkId) {
      // Filter by network if possible (through node's network_id)
      // For now, return all pending if no network filter
    }

    const { data: evidence, error } = await query;
    if (error) throw error;

    // Enrich with node names
    const enriched = await Promise.all(
      (evidence ?? []).map(async (ev: any) => {
        if (!ev.node_id) return ev;
        const { data: node } = await supabaseAdmin
          .from('nodes')
          .select('name')
          .eq('id', ev.node_id)
          .maybeSingle();
        return { ...ev, node_name: node?.name ?? null };
      })
    );

    return NextResponse.json({ evidence: enriched, total: enriched.length });
  } catch (err) {
    console.error('[evidence/pending] error:', err);
    // Fallback: return empty (table might not exist yet)
    return NextResponse.json({ evidence: [], total: 0 });
  }
}
