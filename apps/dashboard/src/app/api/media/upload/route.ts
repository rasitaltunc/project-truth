// ═══════════════════════════════════════════
// MEDIA UPLOAD API — Sprint 9
// POST: Dosya yükle (Supabase Storage)
// Metadata sıyırma + hash doğrulama
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { safeErrorResponse, checkBodySize, UPLOAD_MAX_BODY_BYTES } from '@/lib/errorHandler';
import { validateFileMagic } from '@/lib/fileValidator';
import { stripFileMetadata } from '@/lib/metadataStripper';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
];
const BUCKET_NAME = 'evidence-media';

// Rate limit (in-memory, dev ortamı için)
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(fingerprint: string, maxPerHour: number = 10): boolean {
  const now = Date.now();
  const entry = uploadCounts.get(fingerprint);

  if (!entry || now > entry.resetAt) {
    uploadCounts.set(fingerprint, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= maxPerHour) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Request body size check — 50MB for file uploads
  const tooBig = checkBodySize(request, UPLOAD_MAX_BODY_BYTES);
  if (tooBig) return tooBig;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fingerprint = formData.get('fingerprint') as string | null;
    const evidenceId = formData.get('evidence_id') as string | null;
    const nodeId = formData.get('node_id') as string | null;
    const stripMetadata = formData.get('strip_metadata') !== 'false'; // default true

    if (!file) {
      return NextResponse.json(
        { error: 'file alanı gerekli' },
        { status: 400 }
      );
    }

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'fingerprint gerekli' },
        { status: 400 }
      );
    }

    // ── Dosya boyutu kontrolü ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // ── Dosya türü kontrolü ──
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Desteklenmeyen dosya türü: ${file.type}. İzin verilenler: JPG, PNG, WebP, GIF, MP4, WebM, PDF` },
        { status: 415 }
      );
    }

    // ── Rate limit ──
    if (!checkRateLimit(fingerprint)) {
      return NextResponse.json(
        { error: 'Çok fazla yükleme — lütfen 1 saat bekleyin' },
        { status: 429 }
      );
    }

    // ── Supabase yoksa hata ──
    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        success: false,
        source: 'no_db',
        message: 'Supabase Storage bağlantısı yok',
      });
    }

    // ── Dosya verisi ──
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── F1 FIX: Magic bytes doğrulaması (MIME spoofing önleme) ──
    const magicCheck = validateFileMagic(buffer, file.type, ALLOWED_TYPES);
    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: magicCheck.error },
        { status: 415 }
      );
    }

    // ── F3 FIX: Server-side metadata stripping (EXIF, PDF author, etc.) ──
    let cleanBuffer: Buffer = buffer;
    let metadataStripped = false;
    if (stripMetadata) {
      const result = await stripFileMetadata(buffer, file.type);
      cleanBuffer = Buffer.from(result.buffer);
      metadataStripped = result.stripped;
    }

    // ── SHA-256 hash (of CLEAN buffer — post-stripping) ──
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(cleanBuffer).digest('hex');

    // ── Dosya adı temizliği (metadata sıyırma temel adım) ──
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const secureId = crypto.randomBytes(16).toString('hex');
    const secureName = `${secureId}.${ext}`;

    // ── Storage path ──
    const storagePath = nodeId
      ? `evidence/${nodeId}/${secureName}`
      : `uploads/${fingerprint.slice(0, 8)}/${secureName}`;

    // ── Supabase Storage upload ──
    // F3: Upload CLEAN buffer (metadata stripped)
    const { data: uploadData, error: uploadError } = await (supabase as any)
      .storage
      .from(BUCKET_NAME)
      .upload(storagePath, cleanBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      // Bucket yoksa bildir
      if (uploadError.message?.includes('not found') || uploadError.statusCode === 404) {
        return NextResponse.json({
          success: false,
          source: 'no_bucket',
          message: `"${BUCKET_NAME}" bucket\'ı Supabase Storage'da oluşturulmalı`,
        });
      }
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // ── Public URL ──
    const { data: urlData } = (supabase as any)
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // ── Evidence media tablosuna kaydet ──
    const mediaRecord = {
      evidence_id: evidenceId || null,
      storage_path: storagePath,
      media_type: file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document',
      original_filename: stripMetadata ? null : file.name,
      file_size: cleanBuffer.length,
      file_hash: hash,
      metadata_stripped: metadataStripped,
      uploaded_by: fingerprint,
      created_at: new Date().toISOString(),
    };

    const { data: mediaData, error: mediaError } = await (supabase as any)
      .from('evidence_media')
      .insert(mediaRecord)
      .select('id')
      .single();

    if (mediaError) {
      // Tablo yoksa sadece storage URL döndür
      if (mediaError.code === '42P01' || mediaError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          mediaId: null,
          url: urlData?.publicUrl || null,
          hash,
          storagePath,
          source: 'storage_only',
          message: 'evidence_media tablosu yok — sadece storage yüklendi',
        });
      }
      console.error('Media record error:', mediaError);
    }

    return NextResponse.json({
      success: true,
      mediaId: mediaData?.id || null,
      url: urlData?.publicUrl || null,
      hash,
      storagePath,
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('POST /api/media/upload', err);
  }
}
