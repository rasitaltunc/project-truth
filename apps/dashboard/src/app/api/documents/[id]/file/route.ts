/**
 * /api/documents/[id]/file
 * GET: Proxy-serve document file bytes — solves CORS issues.
 *
 * Priority chain:
 * 1. GCS files: downloads from GCS and streams to client
 * 2. CourtListener/external: fetches PDF and streams through (no storage, memory-only pipe)
 * 3. Supabase files: redirects to public URL
 *
 * ARCHITECTURE DECISION (25 Mar 2026): Orijinal PDF'ler saklanmaz.
 * Bu route PDF'i kaynak siteden çekip kullanıcıya aktarır — diske hiçbir şey yazılmaz.
 * "Su borusu" modeli: CourtListener → sunucu belleği → kullanıcı tarayıcısı.
 *
 * Usage: <Document file="/api/documents/{id}/file" /> or <img src="/api/documents/{id}/file" />
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { downloadFromGCS } from '@/lib/gcs';

// ── SECURITY: SSRF Prevention ──
// Only allow fetches/redirects to known-safe domains.
const ALLOWED_REDIRECT_HOSTS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
  '.supabase.co',
  '.supabase.in',
];

// Domains we trust for proxy-fetch (PDF flows through server memory, never stored)
const ALLOWED_PROXY_HOSTS = [
  'storage.courtlistener.com',
  'www.courtlistener.com',
  'courtlistener.com',
  'recap.free.law',
  'www.archive.org',             // Internet Archive (backup)
  'ia800100.us.archive.org',     // IA direct
];

function isAllowedHost(url: string, allowList: string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return allowList.some(
      (host) =>
        host.startsWith('.')
          ? parsed.hostname.endsWith(host)
          : parsed.hostname === host
    );
  } catch {
    return false;
  }
}

function isSafeRedirectUrl(url: string): boolean {
  return isAllowedHost(url, ALLOWED_REDIRECT_HOSTS);
}

function isSafeProxyUrl(url: string): boolean {
  return isAllowedHost(url, ALLOWED_PROXY_HOSTS);
}

/**
 * Proxy-fetch a PDF from an external source (CourtListener, Archive.org, etc.)
 * PDF flows through server memory and is never written to disk.
 * Returns null if fetch fails — caller should try next fallback.
 */
async function proxyFetchPdf(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ProjectTruth/1.0 (research platform; contact: rasitaltunc@gmail.com)',
        'Accept': 'application/pdf, */*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[documents/file] Proxy fetch failed: ${response.status} from ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/pdf';

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (err) {
    console.warn(`[documents/file] Proxy fetch error for ${url}:`, err);
    return null;
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = applyRateLimit(_req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  const { id } = await params;

  // SECURITY: Validate UUID format to prevent injection via path params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Valid document UUID required' }, { status: 400 });
  }

  try {
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('id, display_url, external_url, file_path, file_type, metadata')
      .eq('id', id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const metadata = doc.metadata || {};
    const storageProvider = metadata.storage_provider;
    const gcsPath = metadata.gcs_path;

    // Determine content type from file path
    const ext = (doc.file_path || '').split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_TYPES[ext] || (doc.file_type === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    // ── PRIORITY 1: GCS (if we have a stored copy) ──
    if (storageProvider === 'gcs' && gcsPath) {
      const buffer = await downloadFromGCS(gcsPath);
      if (buffer) {
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'private, max-age=3600',
            'Content-Disposition': 'inline',
          },
        });
      }
      // GCS download failed — try next fallback
    }

    // ── PRIORITY 2: Proxy-fetch from external source (CourtListener, etc.) ──
    // PDF flows through memory — never written to disk.
    // Try source_url first (original source), then display_url as proxy candidate.
    const proxyCandidate = doc.external_url || doc.display_url;
    if (proxyCandidate && isSafeProxyUrl(proxyCandidate)) {
      const result = await proxyFetchPdf(proxyCandidate);
      if (result) {
        return new NextResponse(new Uint8Array(result.buffer), {
          status: 200,
          headers: {
            'Content-Type': result.contentType,
            'Content-Length': result.buffer.length.toString(),
            'Cache-Control': 'private, max-age=3600',
            'Content-Disposition': 'inline',
            'X-Source': 'proxy',
          },
        });
      }
      // Proxy fetch failed — try redirect fallback
    }

    // ── PRIORITY 3: Redirect to safe storage URL (Supabase, GCS public) ──
    if (doc.display_url) {
      if (!isSafeRedirectUrl(doc.display_url)) {
        console.error(`[documents/file] SSRF blocked: unsafe redirect URL for doc ${id}: ${doc.display_url}`);
        return NextResponse.json(
          { error: 'File URL is not from a trusted storage provider' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(doc.display_url);
    }

    return NextResponse.json({ error: 'No file available' }, { status: 404 });
  } catch (err) {
    console.error('[documents/file] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
