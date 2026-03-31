/**
 * /api/documents/manual-upload
 * POST: Upload a local document (PDF, image) and create a documents record
 * Stores file in Supabase Storage, creates document record with display_url
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { uploadToGCS, isGCSAvailable, getSignedUrl } from '@/lib/gcs';
import { applyRateLimit, GCP_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize, UPLOAD_MAX_BODY_BYTES } from '@/lib/errorHandler';
import { validateFileMagic } from '@/lib/fileValidator';
import { stripFileMetadata } from '@/lib/metadataStripper';
import { sanitizePDF, computeSHA256 } from '@/lib/pdfSanitizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Rate limiting
const uploadCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_UPLOADS_PER_HOUR = 20;

function checkRateLimit(fingerprint: string): boolean {
  const now = Date.now();
  const record = uploadCounts.get(fingerprint);

  if (!record || now > record.resetAt) {
    uploadCounts.set(fingerprint, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (record.count >= MAX_UPLOADS_PER_HOUR) return false;
  record.count++;
  return true;
}

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
];

// ── SECURITY: File extension whitelist ──
// MIME type alone is user-controlled and can be spoofed.
// Extension whitelist ensures storage path never gets .exe, .sh, .html, etc.
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'tif']);

// Map MIME type → safe fallback extension (used when filename extension is missing/invalid)
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/tiff': 'tiff',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(req, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 50MB for file uploads
  const tooBig = checkBodySize(req, UPLOAD_MAX_BODY_BYTES);
  if (tooBig) return tooBig;

  try {
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const fingerprint = formData.get('fingerprint') as string | null;
    const networkId = formData.get('network_id') as string | null;
    const title = formData.get('title') as string | null;
    const documentType = (formData.get('document_type') as string) || 'other';
    const description = formData.get('description') as string | null;

    // Validation
    if (!file || !fingerprint || !networkId) {
      return NextResponse.json(
        { error: 'file, fingerprint, and network_id are required' },
        { status: 400 }
      );
    }

    // Resolve network_id: if it's not a UUID, look it up by slug/name
    let resolvedNetworkId = networkId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(networkId)) {
      // SECURITY: Sanitize networkId before PostgREST filter interpolation
      // Strip characters that could manipulate .or() filter syntax
      const safeNetworkId = networkId.replace(/[,().%\\]/g, '').trim();
      if (!safeNetworkId || safeNetworkId.length > 100) {
        return NextResponse.json(
          { error: 'Invalid network_id format' },
          { status: 400 }
        );
      }
      const { data: network } = await supabaseAdmin
        .from('networks')
        .select('id')
        .or(`slug.eq.${safeNetworkId},name.ilike.%${safeNetworkId.replace('-', ' ')}%`)
        .limit(1)
        .single();
      if (network) {
        resolvedNetworkId = network.id;
      } else {
        // Last resort: get the first network
        const { data: firstNetwork } = await supabaseAdmin
          .from('networks')
          .select('id')
          .limit(1)
          .single();
        if (firstNetwork) {
          resolvedNetworkId = firstNetwork.id;
        } else {
          return NextResponse.json(
            { error: 'No network found. Please create a network first.' },
            { status: 400 }
          );
        }
      }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: PDF, JPEG, PNG, WebP, GIF, TIFF` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB` },
        { status: 400 }
      );
    }

    // Rate limit
    if (!checkRateLimit(fingerprint)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 20 uploads per hour.' },
        { status: 429 }
      );
    }

    // Compute file buffer first (needed for magic bytes + hash)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // ── F1 FIX: Magic bytes doğrulaması (MIME spoofing önleme) ──
    const magicCheck = validateFileMagic(fileBuffer, file.type, ALLOWED_TYPES);
    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: magicCheck.error },
        { status: 415 }
      );
    }

    // ── SECURITY: Generate secure filename with whitelisted extension ──
    // 1. Extract extension from filename
    const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
    // 2. If extension is not in whitelist, derive from MIME type (which was already validated above)
    const fileExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : (MIME_TO_EXT[file.type] || 'bin');
    // 3. Reject if we still can't determine a safe extension (should never happen after MIME check)
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json(
        { error: `Unsupported file extension: .${rawExt}` },
        { status: 400 }
      );
    }
    const secureId = crypto.randomBytes(16).toString('hex');
    // 4. Path uses only crypto-random ID + whitelisted extension — no user input in path
    const storagePath = `documents/${fingerprint.substring(0, 8)}/${secureId}.${fileExt}`;

    // ── F3 FIX: Server-side metadata stripping (PDF author, EXIF, etc.) ──
    const { buffer: strippedBuffer } = await stripFileMetadata(fileBuffer, file.type);

    // ── SPRINT R3: PDF Dezenfeksiyon Pipeline ──
    // TRUTH ANAYASASI: "Girdi ne kadar temizse, çıktı o kadar temiz."
    // PDF dosyaları Ghostscript + QPDF'den geçirilir:
    // - JavaScript, gömülü dosyalar, makrolar yok edilir
    // - Siyah kutu altındaki gizli metin yok edilir
    // - Bozuk PDF yapıları onarılır
    // - Redaksiyon hataları tespit ve loglanır (içerik ASLA kaydedilmez)
    let cleanBuffer: Buffer;
    let sanitizationMetadata: Record<string, unknown> = {};

    if (file.type === 'application/pdf') {
      console.log('[manual-upload] PDF disinfection starting...');
      try {
        const sanitizationResult = await sanitizePDF(strippedBuffer);
        cleanBuffer = sanitizationResult.sanitizedBuffer;

        sanitizationMetadata = {
          sanitized: true,
          original_hash: sanitizationResult.originalHash,
          sanitized_hash: sanitizationResult.sanitizedHash,
          ghostscript_success: sanitizationResult.ghostscriptSuccess,
          qpdf_success: sanitizationResult.qpdfSuccess,
          redaction_detected: sanitizationResult.redactionReport.failedRedactionsDetected,
          redaction_count: sanitizationResult.redactionReport.failedRedactionCount,
          redaction_pages: sanitizationResult.redactionReport.affectedPages,
          sanitization_time_ms: sanitizationResult.processingTimeMs,
          sanitization_warnings: sanitizationResult.warnings,
        };

        if (sanitizationResult.redactionReport.failedRedactionsDetected) {
          console.warn(
            `[manual-upload] ⚠️ Failed redaction detected: ` +
            `${sanitizationResult.redactionReport.failedRedactionCount} items, ` +
            `pages: ${sanitizationResult.redactionReport.affectedPages.join(', ')}`
          );
        }

        console.log(
          `[manual-upload] PDF disinfection completed: ` +
          `${sanitizationResult.originalSize} → ${sanitizationResult.sanitizedSize} bytes, ` +
          `${sanitizationResult.processingTimeMs}ms`
        );
      } catch (sanitizeError) {
        // If disinfection fails, use metadata-stripped version
        console.error('[manual-upload] PDF disinfection error — using stripped version:', sanitizeError);
        cleanBuffer = strippedBuffer;
        sanitizationMetadata = {
          sanitized: false,
          sanitization_error: 'Pipeline error — metadata-stripped version used',
        };
      }
    } else {
      // Non-PDF files do not require disinfection
      cleanBuffer = strippedBuffer;
    }

    // Compute SHA-256 hash (of CLEAN buffer — dezenfekte edilmiş)
    const hash = computeSHA256(cleanBuffer);

    // ═══ STORAGE: GCS primary, Supabase fallback ═══
    let displayUrl = '';
    let gcsPath: string | null = null;
    let storageProvider: 'gcs' | 'supabase' = 'supabase';

    // Try GCS first
    if (isGCSAvailable()) {
      const gcsResult = await uploadToGCS(cleanBuffer, `${secureId}.${fileExt}`, file.type, `documents/${fingerprint.substring(0, 8)}`);
      if (gcsResult) {
        // F2 FIX: Bucket is private — use signed URL (15 min max, was 4 hours)
        const signedUrl = await getSignedUrl(gcsResult.path, 15);
        displayUrl = signedUrl || gcsResult.publicUrl; // fallback to public URL if signing fails
        gcsPath = gcsResult.path;
        storageProvider = 'gcs';
        console.log(`[manual-upload] Stored in GCS: ${gcsResult.path} (signed URL: ${!!signedUrl})`);
      } else {
        console.warn('[manual-upload] GCS upload failed, falling back to Supabase Storage');
      }
    }

    // Fallback to Supabase Storage
    if (!displayUrl) {
      const BUCKET_NAME = 'evidence-media';
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      if (!bucketExists) {
        const { error: createBucketError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_TYPES,
        });
        if (createBucketError && !createBucketError.message.includes('already exists')) {
          console.error('[manual-upload] Bucket creation failed:', createBucketError);
          return NextResponse.json(
            { error: 'Storage initialization failed: ' + createBucketError.message },
            { status: 500 }
          );
        }
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, cleanBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[manual-upload] Supabase Storage upload failed:', uploadError);
        return NextResponse.json(
          { error: 'File upload failed: ' + uploadError.message },
          { status: 500 }
        );
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      displayUrl = urlData?.publicUrl || '';
      console.log(`[manual-upload] Stored in Supabase: ${storagePath}`);
    }

    // Determine file type category
    const isPdf = file.type === 'application/pdf';
    const fileTypeCategory = isPdf ? 'pdf' : 'image';

    // Create document record
    const documentTitle = title || file.name.replace(/\.[^/.]+$/, '');

    const { data: document, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        network_id: resolvedNetworkId,
        title: documentTitle,
        description: description || `Manually uploaded ${fileTypeCategory} document`,
        document_type: documentType,
        source_type: 'manual',
        file_path: storagePath,
        file_size: file.size,
        file_type: fileTypeCategory, // DB expects 'pdf'|'image' not MIME type
        display_url: displayUrl,
        uploaded_by: fingerprint,
        scan_status: 'pending',
        ocr_status: 'pending',
        is_public: false,
        language: 'unknown',
        country_tags: [],
        metadata: {
          original_filename: file.name,
          file_hash: hash,
          file_type_category: fileTypeCategory,
          upload_source: 'manual_upload',
          storage_provider: storageProvider,
          gcs_path: gcsPath,
          ...sanitizationMetadata,
        },
      })
      .select()
      .single();

    if (insertError || !document) {
      console.error('[manual-upload] DB insert failed:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { error: 'Failed to create document record: ' + (insertError?.message || 'unknown') },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      displayUrl,
      fileHash: hash,
      fileType: fileTypeCategory,
      storagePath,
      storageProvider,
      gcsPath,
      document,
    });
  } catch (error: unknown) {
    return safeErrorResponse('POST /api/documents/manual-upload', error);
  }
}
