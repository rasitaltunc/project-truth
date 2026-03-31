/**
 * /api/auth/session
 * POST: Bind a fingerprint to an httpOnly session cookie
 *
 * SECURITY A5: Session Token for Fingerprint Ownership
 *
 * Problem: Anyone who knows a fingerprint can impersonate that user.
 * Solution: On first visit, client sends fingerprint → server creates
 * HMAC-signed httpOnly cookie. Subsequent requests are validated
 * against this cookie.
 *
 * Flow:
 * 1. Client generates fingerprint (auth.ts)
 * 2. Client POST /api/auth/session { fingerprint }
 * 3. Server creates HMAC(fingerprint + timestamp) → httpOnly cookie
 * 4. All subsequent API calls include this cookie automatically
 * 5. Server validates: cookie fingerprint === header fingerprint
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { quickValidateFingerprint } from '@/lib/serverFingerprint';

// HMAC secret — in production, use a proper secret from env
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'truth_session_secret_v1';

/**
 * Create HMAC-SHA256 signature for session binding
 */
async function createSessionToken(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const timestamp = Date.now();
  const payload = `${fingerprint}:${timestamp}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Token format: fingerprint:timestamp:signature
  return `${fingerprint}:${timestamp}:${sigHex}`;
}

/**
 * Verify a session token and extract fingerprint
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;

    const [fingerprint, timestamp, signature] = parts;

    // Validate format
    if (!quickValidateFingerprint(fingerprint)) return null;

    // Check token age (max 30 days)
    const age = Date.now() - parseInt(timestamp, 10);
    if (isNaN(age) || age < 0 || age > 30 * 24 * 60 * 60 * 1000) return null;

    // Verify HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const payload = `${fingerprint}:${timestamp}`;
    const sigBytes = new Uint8Array(
      (signature.match(/.{2}/g) || []).map((hex) => parseInt(hex, 16))
    );

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
    return valid ? fingerprint : null;
  } catch {
    return null;
  }
}

// Cookie name
export const SESSION_COOKIE_NAME = 'truth_session';

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint || !quickValidateFingerprint(fingerprint)) {
      return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 400 });
    }

    // Check if there's already a valid session for a DIFFERENT fingerprint
    const existingCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (existingCookie?.value) {
      const existingFp = await verifySessionToken(existingCookie.value);
      if (existingFp && existingFp !== fingerprint) {
        // Already bound to a different fingerprint — reject
        return NextResponse.json(
          { error: 'Session already bound to a different identity' },
          { status: 403 }
        );
      }
      if (existingFp === fingerprint) {
        // Already valid — just confirm
        return NextResponse.json({ status: 'active', bound: true });
      }
    }

    // Create new session token
    const token = await createSessionToken(fingerprint);

    const response = NextResponse.json({ status: 'created', bound: true });

    // Set httpOnly cookie — not accessible from JavaScript
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[auth/session] Error:', error);
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
  }
}
