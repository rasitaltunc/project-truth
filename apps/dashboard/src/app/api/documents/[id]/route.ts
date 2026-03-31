/**
 * /api/documents/[id]
 * GET: Single document with derived items
 * PATCH: Update document fields (ownership validated)
 * DELETE: Soft delete (ownership validated)
 *
 * SECURITY D1: Ownership verification on mutating operations
 * SECURITY E1: Generic error responses (no internal details)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateSession } from '@/lib/sessionValidator';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// SECURITY D1: Whitelist of updatable fields — prevents mass assignment
const ALLOWED_UPDATE_FIELDS = new Set([
  'title',
  'document_type',
  'source_url',
  'status',
  'ocr_status',
  'ocr_extracted_text',
  'ocr_confidence',
  'extracted_text',
  'scan_status',
  'scan_result',
  'is_public',
  'metadata',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    // SECURITY: Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Geçersiz belge ID' }, { status: 400 });
    }

    // SECURITY A2: Explicit select — excludes scanned_by and fingerprint columns
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, document_type, source_type, source_url, display_url, gcs_path, status, ocr_status, ocr_extracted_text, ocr_confidence, extracted_text, raw_content, scan_status, scan_result, network_id, metadata, is_public, created_at, updated_at')
      .eq('id', id)
      .single();

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
      }
      throw docError;
    }
    if (!document) {
      return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
    }

    // SECURITY A2: Explicit select — excludes fingerprint columns (submitted_by, approved_by)
    // Fetch derived items — includes both legacy columns and Sprint 16+ columns (item_type, item_data, confidence)
    const { data: derivedItems, error: itemsError } = await supabaseAdmin
      .from('document_derived_items')
      .select('id, document_id, item_type, item_data, confidence, extracted_type, extracted_value, confidence_score, source_field, status, created_at, updated_at')
      .eq('document_id', id)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.warn('Failed to fetch derived items:', itemsError.code);
    }

    return NextResponse.json({
      document,
      derivedItems: derivedItems || [],
    });
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error instanceof Error ? error.message : 'unknown');
    // SECURITY E1: Generic error — no internal details
    return NextResponse.json(
      { error: 'Belge yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    // SECURITY: Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Geçersiz belge ID' }, { status: 400 });
    }

    // SECURITY D1: Validate session — ownership check
    const session = await validateSession(req);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Yetkisiz erişim' }, { status: 401 });
    }
    const fingerprint = session.fingerprint;

    // SECURITY D1: Verify ownership — document must belong to requester
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('documents')
      .select('id, uploaded_by')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
    }

    if (existing.uploaded_by !== fingerprint) {
      return NextResponse.json({ error: 'Bu belgeyi düzenleme yetkiniz yok' }, { status: 403 });
    }

    // SECURITY D1: Whitelist — only allowed fields can be updated
    const rawUpdates = await req.json();
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of Object.keys(rawUpdates)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        sanitizedUpdates[key] = rawUpdates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek geçerli alan bulunamadı' }, { status: 400 });
    }

    // SECURITY C2: Length validation on text fields
    if (sanitizedUpdates.title && typeof sanitizedUpdates.title === 'string' && sanitizedUpdates.title.length > 500) {
      return NextResponse.json({ error: 'Başlık çok uzun (max 500 karakter)' }, { status: 400 });
    }
    if (sanitizedUpdates.extracted_text && typeof sanitizedUpdates.extracted_text === 'string' && sanitizedUpdates.extracted_text.length > 500000) {
      return NextResponse.json({ error: 'Metin çok uzun (max 500K karakter)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('uploaded_by', fingerprint) // Double-check ownership in query
      .select('id, title, document_type, status, updated_at')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Belge bulunamadı veya yetkiniz yok' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error instanceof Error ? error.message : 'unknown');
    // SECURITY E1: Generic error
    return NextResponse.json(
      { error: 'Belge güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    // SECURITY: Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Geçersiz belge ID' }, { status: 400 });
    }

    // SECURITY D1: Validate session — ownership check
    const session = await validateSession(req);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Yetkisiz erişim' }, { status: 401 });
    }
    const fingerprint = session.fingerprint;

    // SECURITY D1: Ownership-scoped soft delete
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('uploaded_by', fingerprint) // Only owner can delete
      .select('id')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Belge bulunamadı veya yetkiniz yok' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error instanceof Error ? error.message : 'unknown');
    // SECURITY E1: Generic error
    return NextResponse.json(
      { error: 'Belge silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
