/**
 * /api/documents/import — DISABLED (Sprint KEŞFET Redesign)
 *
 * This endpoint has been intentionally disabled to prevent external API data
 * from contaminating the investigation network. External APIs (ICIJ, OpenSanctions,
 * CourtListener) return ALL name matches without relevance filtering, which means
 * unrelated individuals could be added to the network.
 *
 * The KEŞFET tab now operates as a "Research Desk" — users can search, save notes,
 * and cross-reference, but cannot import directly into the network.
 *
 * To add data to the network, use BELGELERİM → manual document upload → OCR → AI scan → quarantine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getDocument } from '@/lib/documentProviders';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SourceType } from '@/lib/documentProviders/types';

// ═══════════════════════════════════════════════════
// DISABLED — Returns 410 Gone
// ═══════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  return NextResponse.json(
    {
      error: 'ENDPOINT_DISABLED',
      message: 'Direct import from external APIs has been disabled. Use manual document upload instead.',
      reason: 'External APIs return all name matches without relevance filtering, which could contaminate the investigation network.',
      alternative: '/api/documents/manual-upload',
    },
    { status: 410 }
  );
}

// ═══════════════════════════════════════════════════
// LEGACY CODE BELOW — kept for reference, not executed
// ═══════════════════════════════════════════════════

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// UUID v4 validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

async function resolveNetworkId(networkId: string): Promise<string | null> {
  if (isValidUUID(networkId)) return networkId;

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

async function LEGACY_POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, externalId, networkId, fingerprint, title: bodyTitle, description: bodyDescription, documentType: bodyDocType } = body;

    if (!provider || !externalId || !networkId) {
      return NextResponse.json(
        { error: 'provider, externalId, and networkId are required' },
        { status: 400 }
      );
    }

    // Resolve networkId to valid UUID
    const resolvedNetworkId = await resolveNetworkId(networkId);
    if (!resolvedNetworkId) {
      return NextResponse.json(
        { error: 'Could not resolve network_id to a valid UUID. Make sure a network exists in the networks table.' },
        { status: 400 }
      );
    }

    // If source is 'local', the document already exists in our DB
    if (provider === 'local') {
      // Fetch existing document
      const { data: existingDoc, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', externalId)
        .single();

      if (fetchError || !existingDoc) {
        return NextResponse.json(
          { error: 'Local document not found', id: externalId },
          { status: 404 }
        );
      }

      return NextResponse.json(existingDoc, { status: 200 });
    }

    // Check for duplicate
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('source_type', provider)
      .eq('external_id', externalId)
      .eq('network_id', resolvedNetworkId)
      .maybeSingle();

    if (checkError) {
      console.error('Duplicate check error:', checkError?.message || checkError);
      // Don't throw — continue with import attempt
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Document already imported', documentId: existing.id },
        { status: 409 }
      );
    }

    // Get real document detail from provider
    let detail = null;
    try {
      detail = await getDocument(provider as SourceType, externalId);
    } catch (detailErr) {
      console.warn('Failed to fetch document detail from provider:', detailErr);
      // Continue with fallback data
    }

    // Use real data from provider, or fallback to body data, or use externalId
    const title = detail?.title || bodyTitle || externalId;
    const description = detail?.description || bodyDescription || null;
    const date = detail?.date || null;
    const documentType = detail?.documentType || bodyDocType || 'other';
    const url = detail?.url || null;
    const metadata = detail?.metadata || { importedAt: new Date().toISOString() };

    // Capture raw content from provider (full text, no size cap)
    const rawContent = detail?.rawContent || null;

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        network_id: resolvedNetworkId,
        title,
        description,
        document_type: documentType,
        source_type: provider,
        external_id: externalId,
        external_url: url,
        file_path: null,
        file_size: null,
        file_type: null,
        language: 'en',
        country_tags: [],
        date_filed: date,
        uploaded_by: fingerprint || null,
        scan_status: 'pending',
        scan_result: null,
        raw_content: rawContent,
        quality_score: 0,
        is_public: true,
        metadata,
        date_uploaded: new Date().toISOString(),
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError?.message || docError);
      return NextResponse.json(
        { error: docError?.message || 'Failed to insert document' },
        { status: 500 }
      );
    }

    // Create scan queue entry (non-blocking — ignore errors)
    try {
      await supabaseAdmin
        .from('document_scan_queue')
        .insert({
          document_id: document.id,
          network_id: resolvedNetworkId,
          status: 'open',
          priority: 5,
        });
    } catch (queueErr) {
      console.warn('Failed to create scan queue entry:', queueErr);
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || error?.details || String(error);
    const code = error?.code || '';

    if (msg.includes('does not exist') || msg.includes('relation') || code === '42P01') {
      console.warn('POST /api/documents/import: documents table not found — run SPRINT_16_MIGRATION.sql');
      return NextResponse.json(
        { error: 'Documents table not yet created. Please run SPRINT_16_MIGRATION.sql in Supabase.' },
        { status: 503 }
      );
    }

    return safeErrorResponse('POST /api/documents/import', error);
  }
}
