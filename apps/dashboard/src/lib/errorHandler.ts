// ═══════════════════════════════════════════
// SECURITY D1 + D2: Error Handler + Body Size Limit
// D1: Never expose internal error details to clients.
// D2: Reject oversized request bodies before processing.
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a safe error response that never leaks internal details.
 *
 * Usage:
 *   catch (error) {
 *     return safeErrorResponse('POST /api/my-route', error);
 *   }
 *
 * - Logs full error details to server console (for debugging)
 * - Returns generic message to client (no stack trace, no table names, no SQL errors)
 * - Optional custom client message for known error types
 */
export function safeErrorResponse(
  context: string,
  error: unknown,
  options?: {
    status?: number;
    clientMessage?: string;
  }
): NextResponse {
  // ── Server-side logging (FULL details, never sent to client) ──
  console.error(`[${context}] error:`, error);

  // ── Client-side response (GENERIC, no internal details) ──
  const status = options?.status || 500;
  const clientMessage = options?.clientMessage || 'Sunucu hatası';

  return NextResponse.json(
    { error: clientMessage },
    { status }
  );
}

// ── SECURITY D2: Request Body Size Limit ──

/** Default max body size: 2MB for JSON endpoints */
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Max body size for file upload endpoints: 50MB */
export const UPLOAD_MAX_BODY_BYTES = 50 * 1024 * 1024;

/**
 * Check Content-Length header and reject oversized requests BEFORE parsing.
 * Returns NextResponse (413) if too large, null if OK.
 *
 * Usage:
 *   const tooBig = checkBodySize(request);
 *   if (tooBig) return tooBig;
 */
export function checkBodySize(
  request: NextRequest,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES
): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `Request body too large. Maximum: ${maxMB}MB` },
      { status: 413 }
    );
  }
  return null;
}
