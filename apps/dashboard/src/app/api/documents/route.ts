/**
 * /api/documents
 * GET: List documents with pagination and filters
 * POST: Create/upload a new document
 * SECURITY: C1 (Input Validation) + E1 (Error Sanitization)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// UUID v4 validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// SECURITY C1: Zod schemas for document validation
// CLEAN START POLICY (2026-03-23):
// Every document MUST have an actual file in storage. No metadata-only records.
// "Dosyasız belge kabul etmiyoruz" — Raşit & Claude
// Use /api/documents/manual-upload for proper file upload with validation.
const documentCreateSchema = z.object({
  network_id: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000).optional(),
  document_type: z.enum([
    'court_record', 'foia', 'leaked', 'financial', 'deposition', 'official_document', 'other'
  ]),
  file_path: z.string().min(1).max(2000), // REQUIRED — no empty file paths
  file_type: z.string().min(1).max(50),   // REQUIRED — must know what we're storing
  file_size: z.number().positive(),        // REQUIRED — must be > 0
  language: z.string().max(10).optional(),
  country_tags: z.array(z.string()).max(50).optional(),
  date_filed: z.string().datetime().optional(),
  uploaded_by: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Resolve a network identifier to a real UUID
 * If already a UUID, return as-is
 * If a slug like 'epstein-network', look it up in the networks table
 */
async function resolveNetworkId(networkId: string): Promise<string | null> {
  if (isValidUUID(networkId)) {
    return networkId;
  }

  // Try to find by slug/name
  const { data } = await supabaseAdmin
    .from('networks')
    .select('id')
    .or(`slug.eq.${networkId},name.ilike.%${networkId.replace(/-/g, ' ')}%`)
    .limit(1)
    .maybeSingle();

  if (data?.id) return data.id;

  // Last resort: get the first network
  const { data: firstNetwork } = await supabaseAdmin
    .from('networks')
    .select('id')
    .limit(1)
    .maybeSingle();

  return firstNetwork?.id || null;
}

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const rawNetworkId = searchParams.get('network_id');

    // SECURITY C1: Validate pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const documentType = searchParams.get('document_type');
    const sourceType = searchParams.get('source_type');
    const scanStatus = searchParams.get('scan_status');

    let query = supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('date_uploaded', { ascending: false });

    // Only filter by network_id if we can resolve it
    if (rawNetworkId) {
      const resolvedId = await resolveNetworkId(rawNetworkId);
      if (resolvedId) {
        query = query.eq('network_id', resolvedId);
      }
      // If resolution fails, show all public documents (no network filter)
    }

    if (documentType) query = query.eq('document_type', documentType);
    if (sourceType) query = query.eq('source_type', sourceType);
    if (scanStatus) {
      query = query.eq('scan_status', scanStatus);
    } else {
      // CLEAN START POLICY: Hide legacy (metadata-only) documents by default
      query = query.neq('scan_status', 'legacy');
    }

    const offset = (page - 1) * limit;
    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      documents: data || [],
      totalCount: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic error to client
    const msg = error?.message || error?.details || String(error);
    const code = error?.code || '';
    console.error('GET /api/documents error:', msg, code);
    return NextResponse.json({ documents: [], totalCount: 0, page: 1, limit: 20, error: 'Belgeler yüklenemiyor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      // SECURITY C1: Invalid JSON
      return NextResponse.json(
        { error: 'Geçersiz JSON formatı', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // SECURITY C1: Validate entire request body with Zod
    const validation = documentCreateSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return NextResponse.json(
        { error: 'Doğrulama başarısız', code: 'VALIDATION_ERROR', details: errors },
        { status: 400 }
      );
    }

    const {
      network_id,
      title,
      description,
      document_type,
      file_path,
      file_type,
      file_size,
      language,
      country_tags,
      date_filed,
      uploaded_by,
      metadata,
    } = validation.data;

    // Resolve network_id to valid UUID
    const resolvedNetworkId = await resolveNetworkId(network_id);
    if (!resolvedNetworkId) {
      // SECURITY E1: Don't expose resolution details
      console.error('Failed to resolve network_id:', network_id);
      return NextResponse.json(
        { error: 'Geçersiz ağ' },
        { status: 400 }
      );
    }

    // Insert document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        network_id: resolvedNetworkId,
        title,
        description: description || null,
        document_type,
        source_type: 'manual_upload',
        file_path: file_path || null,
        file_type: file_type || null,
        file_size: file_size || null,
        language: language || 'en',
        country_tags: country_tags || [],
        date_filed: date_filed || null,
        uploaded_by: uploaded_by || null,
        scan_status: 'pending',
        scan_result: null,
        quality_score: 0,
        is_public: true,
        metadata: metadata || {},
        date_uploaded: new Date().toISOString(),
      })
      .select()
      .single();

    // SECURITY E1: Don't expose database error details
    if (docError) {
      console.error('Document insert error:', docError.message);
      throw docError;
    }

    // Create scan queue entry (non-blocking)
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
      // Non-fatal, continue anyway
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic message to client
    console.error('POST /api/documents error:', error?.message || error);
    return NextResponse.json(
      { error: 'Belge oluşturulamadı' },
      { status: 500 }
    );
  }
}
