/**
 * /api/documents/stats
 * GET: Document statistics for a network
 * Returns: total count, scanned count, pending count
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveNetworkId(networkId: string): Promise<string | null> {
  if (UUID_REGEX.test(networkId)) return networkId;

  const { data } = await supabaseAdmin
    .from('networks')
    .select('id')
    .or(`slug.eq.${networkId},name.ilike.%${networkId.replace(/-/g, ' ')}%`)
    .limit(1)
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: first } = await supabaseAdmin
    .from('networks')
    .select('id')
    .limit(1)
    .maybeSingle();

  return first?.id || null;
}

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const rawNetworkId = searchParams.get('network_id');

    if (!rawNetworkId) {
      return NextResponse.json({ total: 0, scanned: 0, pending: 0 });
    }

    const networkId = await resolveNetworkId(rawNetworkId);
    if (!networkId) {
      // No network found — return zeros
      return NextResponse.json({ total: 0, scanned: 0, pending: 0 });
    }

    // CLEAN START POLICY: Exclude legacy (metadata-only) documents from all counts

    // Count total documents (excluding legacy)
    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('network_id', networkId)
      .eq('is_public', true)
      .neq('scan_status', 'legacy');

    if (totalError) throw totalError;

    // Count scanned documents (AI entity extraction completed)
    const { count: scannedCount, error: scannedError } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('network_id', networkId)
      .eq('is_public', true)
      .eq('scan_status', 'scanned');

    if (scannedError) throw scannedError;

    // Count ready documents (OCR done, waiting for AI scan)
    const { count: readyCount, error: readyError } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('network_id', networkId)
      .eq('is_public', true)
      .eq('scan_status', 'ready');

    if (readyError) throw readyError;

    // Count pending (no OCR yet, not scanned, not legacy, not ready)
    const { count: pendingCount, error: pendingError } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('network_id', networkId)
      .eq('is_public', true)
      .neq('scan_status', 'scanned')
      .neq('scan_status', 'ready')
      .neq('scan_status', 'legacy');

    if (pendingError) throw pendingError;

    // Count derived items by type (entities, relationships, dates)
    const [entityRes, relRes, dateRes, quarantineRes, nodeRes, linkRes] = await Promise.all([
      supabaseAdmin.from('document_derived_items').select('id', { count: 'exact', head: true }).eq('item_type', 'entity'),
      supabaseAdmin.from('document_derived_items').select('id', { count: 'exact', head: true }).eq('item_type', 'relationship'),
      supabaseAdmin.from('document_derived_items').select('id', { count: 'exact', head: true }).eq('item_type', 'date'),
      supabaseAdmin.from('data_quarantine').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('nodes').select('id', { count: 'exact', head: true }).eq('network_id', networkId),
      supabaseAdmin.from('links').select('id', { count: 'exact', head: true }).eq('network_id', networkId),
    ]);

    return NextResponse.json({
      total: totalCount || 0,
      scanned: scannedCount || 0,
      ready: readyCount || 0,
      pending: pendingCount || 0,
      entities: entityRes.count || 0,
      relationships: relRes.count || 0,
      dates: dateRes.count || 0,
      quarantine: quarantineRes.count || 0,
      nodes: nodeRes.count || 0,
      links: linkRes.count || 0,
    });
  } catch (error: any) {
    console.error('GET /api/documents/stats error:', error?.message || error);
    return NextResponse.json({ total: 0, scanned: 0, pending: 0, entities: 0, relationships: 0, dates: 0, quarantine: 0, nodes: 0, links: 0 });
  }
}
