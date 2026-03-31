// ==========================================
// PROJECT TRUTH - DOCUMENT UPLOAD & PROCESS
// POST /api/ingestion/upload
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { filterDocument, runFullPipeline } from '@/lib/ingestion/document-processor';
import { performOCR } from '@/lib/ingestion/google-vision';
import { v4 as uuidv4 } from 'uuid';
import { checkBodySize, UPLOAD_MAX_BODY_BYTES } from '@/lib/errorHandler';
import { validateFileMagic } from '@/lib/fileValidator';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 50MB for file uploads
  const tooBig = checkBodySize(request, UPLOAD_MAX_BODY_BYTES);
  if (tooBig) return tooBig;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = formData.get('mode') as string || 'full'; // 'filter' | 'ocr' | 'full'

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded. Send a file with key "file"',
      }, { status: 400 });
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }, { status: 400 });
    }

    // Type check
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid file type: ${file.type}. Allowed: PDF, PNG, JPEG, WebP`,
      }, { status: 400 });
    }

    const documentId = uuidv4();
    const filename = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // ── F1 FIX: Magic bytes doğrulaması ──
    const magicCheck = validateFileMagic(fileBuffer, file.type, allowedTypes);
    if (!magicCheck.valid) {
      return NextResponse.json({
        success: false,
        error: magicCheck.error,
      }, { status: 415 });
    }

    const base64 = fileBuffer.toString('base64');

    // MODE: Filter only (Stage 1-2)
    if (mode === 'filter') {
      // Basit text extraction için OCR yap
      const ocrResult = await performOCR(base64);

      const filterResult = await filterDocument(
        filename,
        ocrResult.fullText,
        0 // TODO: Gerçek pixel analizi
      );

      return NextResponse.json({
        success: true,
        mode: 'filter',
        documentId,
        filename,
        filterResult,
        preview: ocrResult.fullText.substring(0, 500) + '...',
      });
    }

    // MODE: OCR only (Stage 3)
    if (mode === 'ocr') {
      const ocrResult = await performOCR(base64);

      return NextResponse.json({
        success: true,
        mode: 'ocr',
        documentId,
        filename,
        ocrResult: {
          textLength: ocrResult.fullText.length,
          confidence: ocrResult.confidence,
          processingTimeMs: ocrResult.processingTimeMs,
          pageCount: ocrResult.pages.length,
          entities: ocrResult.pages.flatMap(p => p.entities || []),
        },
        fullText: ocrResult.fullText,
      });
    }

    // MODE: Full Pipeline (Stage 1-5)
    // Önce basit OCR ile text al
    const initialOCR = await performOCR(base64);

    const result = await runFullPipeline(
      documentId,
      filename,
      initialOCR.fullText,
      [base64],
      0 // TODO: Gerçek pixel analizi
    );

    return NextResponse.json({
      success: true,
      mode: 'full',
      result: {
        documentId: result.documentId,
        filename: result.filename,
        status: result.status,
        filterResult: result.filterResult,
        extractedEntities: result.extractedEntities,
        createdNodes: result.createdNodes.length,
        createdEdges: result.createdEdges.length,
        processingTimeMs: result.processingTimeMs,
        quarantineReasons: result.quarantineReasons,
        errorMessage: result.errorMessage,
      },
      textPreview: initialOCR.fullText.substring(0, 1000),
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }, { status: 500 });
  }
}

// NOT: App Router'da `export const config = { api: { bodyParser: false } }` gerekli değil.
// Request body doğrudan `request.formData()` veya `request.arrayBuffer()` ile okunur.
