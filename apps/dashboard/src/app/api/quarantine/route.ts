/**
 * /api/quarantine
 * GET: List quarantine items for a network (with filters)
 * POST: Add items to quarantine (used by scan pipeline)
 *
 * Sprint 17: Zero Hallucination Data Integrity
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';
import { safePage, safeLimit } from '@/lib/inputSanitizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get('network_id');
    const status = searchParams.get('status'); // quarantined, pending_review, verified, rejected, disputed
    const itemType = searchParams.get('item_type'); // entity, relationship, date, claim
    const documentId = searchParams.get('document_id');
    const page = safePage(searchParams.get('page'));
    const limit = safeLimit(searchParams.get('limit'), 50);

    if (!networkId) {
      return NextResponse.json({ error: 'network_id is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('data_quarantine')
      .select('*', { count: 'exact' })
      .eq('network_id', networkId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('verification_status', status);
    if (itemType) query = query.eq('item_type', itemType);
    if (documentId) query = query.eq('document_id', documentId);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      items: data || [],
      totalCount: count || 0,
      page,
      limit,
    });
  } catch (error) {
    return safeErrorResponse('GET /api/quarantine', error);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(req, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 2MB default for JSON
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{
        document_id: string;
        network_id: string;
        item_type: 'entity' | 'relationship' | 'date' | 'claim';
        item_data: Record<string, unknown>;
        confidence: number;
        source_type: 'structured_api' | 'html_parse' | 'ai_extraction' | 'manual_entry';
        source_provider?: string;
        source_url?: string;
        source_hash?: string;
        verification_method?: string;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // Validate required fields
    for (const item of items) {
      if (!item.document_id || !item.network_id || !item.item_type || !item.item_data) {
        return NextResponse.json(
          { error: 'Each item requires document_id, network_id, item_type, item_data' },
          { status: 400 }
        );
      }
    }

    // Determine initial status based on source type
    const quarantineItems = items.map((item) => ({
      document_id: item.document_id,
      network_id: item.network_id,
      item_type: item.item_type,
      item_data: item.item_data,
      confidence: item.confidence || 0,
      // Structured API data starts as pending_review (higher trust), AI starts as quarantined
      verification_status:
        item.source_type === 'structured_api' ? 'pending_review' : 'quarantined',
      verification_method: item.verification_method || null,
      source_type: item.source_type,
      source_provider: item.source_provider || null,
      source_url: item.source_url || null,
      source_hash: item.source_hash || null,
      review_count: 0,
      required_reviews: item.source_type === 'structured_api' ? 1 : 2,
      provenance_chain: JSON.stringify([
        {
          action: 'extracted',
          timestamp: new Date().toISOString(),
          source_type: item.source_type,
          source_provider: item.source_provider,
          confidence: item.confidence,
        },
      ]),
    }));

    const { data, error } = await supabaseAdmin
      .from('data_quarantine')
      .insert(quarantineItems)
      .select();

    if (error) throw error;

    // Also create provenance entries
    if (data && data.length > 0) {
      const provenanceEntries = data.map((item) => ({
        entity_type: 'quarantine_item',
        entity_id: item.id,
        action: 'created',
        actor_type: 'system',
        details: {
          source_type: item.source_type,
          source_provider: item.source_provider,
          confidence: item.confidence,
          item_type: item.item_type,
        },
      }));

      await supabaseAdmin.from('data_provenance').insert(provenanceEntries).throwOnError();
    }

    return NextResponse.json({
      inserted: data?.length || 0,
      items: data || [],
    });
  } catch (error) {
    return safeErrorResponse('POST /api/quarantine', error);
  }
}
