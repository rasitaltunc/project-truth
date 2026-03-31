/**
 * /api/documents/ocr
 * POST: Server-side OCR using Google Document AI
 *
 * Replaces client-side Tesseract for higher accuracy on
 * court records, FBI files, scanned documents.
 * Falls back gracefully if Document AI is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processWithDocumentAI, isDocumentAIAvailable } from '@/lib/documentAI';
import { downloadFromGCS } from '@/lib/gcs';
import { applyRateLimit, GCP_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(req, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { documentId, fileUrl, mimeType, gcsPath } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (!fileUrl && !gcsPath) {
      return NextResponse.json({ error: 'fileUrl or gcsPath is required' }, { status: 400 });
    }

    // Check Document AI availability
    if (!isDocumentAIAvailable()) {
      return NextResponse.json(
        { error: 'DOCUMENT_AI_UNAVAILABLE', message: 'Google Document AI is not configured. Use client-side OCR as fallback.' },
        { status: 503 }
      );
    }

    // Update document status
    await supabaseAdmin
      .from('documents')
      .update({ ocr_status: 'processing' })
      .eq('id', documentId);

    // Fetch the file
    let fileBuffer: Buffer | null = null;

    if (gcsPath) {
      // Download from GCS
      fileBuffer = await downloadFromGCS(gcsPath);
    }

    if (!fileBuffer && fileUrl) {
      // Download from URL (Supabase or any public URL)
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } catch (fetchErr) {
        console.error('[OCR API] Failed to fetch file:', fetchErr);
      }
    }

    if (!fileBuffer) {
      await supabaseAdmin
        .from('documents')
        .update({ ocr_status: 'failed' })
        .eq('id', documentId);

      return NextResponse.json(
        { error: 'Failed to download file for OCR processing' },
        { status: 500 }
      );
    }

    // Determine MIME type
    const detectedMimeType = mimeType || (fileUrl?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    // Process with Document AI
    const result = await processWithDocumentAI(fileBuffer, detectedMimeType);

    if (!result) {
      await supabaseAdmin
        .from('documents')
        .update({ ocr_status: 'failed' })
        .eq('id', documentId);

      return NextResponse.json(
        { error: 'Document AI processing failed', fallback: 'client_ocr' },
        { status: 500 }
      );
    }

    // Update document with OCR results
    await supabaseAdmin
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_extracted_text: result.text,
        ocr_confidence: result.confidence,
        ocr_page_count: result.pageCount,
        raw_content: result.text, // Also update raw_content for scan pipeline
        // metadata merged separately below
      })
      .eq('id', documentId);

    // Also update metadata with page details (merge)
    const { data: currentDoc } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .single();

    if (currentDoc) {
      await supabaseAdmin
        .from('documents')
        .update({
          metadata: {
            ...((currentDoc.metadata as Record<string, unknown>) || {}),
            ocr_method: 'google_document_ai',
            ocr_language: result.language,
            ocr_processing_time_ms: result.processingTimeMs,
            ocr_has_tables: result.pages.some((p) => p.tables && p.tables.length > 0),
            ocr_has_forms: result.pages.some((p) => p.formFields && p.formFields.length > 0),
          },
        })
        .eq('id', documentId);
    }

    return NextResponse.json({
      success: true,
      documentId,
      text: result.text,
      confidence: result.confidence,
      pageCount: result.pageCount,
      language: result.language,
      processingTimeMs: result.processingTimeMs,
      method: 'google_document_ai',
      hasTables: result.pages.some((p) => p.tables && p.tables.length > 0),
      hasForms: result.pages.some((p) => p.formFields && p.formFields.length > 0),
      // Include table data if found
      tables: result.pages
        .flatMap((p) => p.tables || [])
        .filter((t) => t.bodyRows.length > 0),
      formFields: result.pages
        .flatMap((p) => p.formFields || [])
        .filter((f) => f.name),
    });
  } catch (error) {
    return safeErrorResponse('POST /api/documents/ocr', error);
  }
}
