/**
 * SECURITY A5: Session Validator
 *
 * Validates that the fingerprint in X-User-Fingerprint header
 * matches the fingerprint bound to the httpOnly session cookie.
 *
 * This prevents fingerprint impersonation — even if someone knows
 * another user's fingerprint, they can't use it without the cookie
 * that was set on the original device.
 *
 * Usage in API routes:
 *   const fp = validateSession(request);
 *   if (!fp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */

import { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/app/api/auth/session/route';
import { quickValidateFingerprint } from '@/lib/serverFingerprint';

export interface SessionValidationResult {
  valid: boolean;
  fingerprint: string | null;
  error?: string;
}

/**
 * Validate session: check that cookie fingerprint matches header fingerprint.
 *
 * Returns fingerprint if valid, null if not.
 * Gracefully degrades: if no cookie exists, falls back to header-only
 * (for backwards compatibility during rollout).
 */
export async function validateSession(request: NextRequest): Promise<SessionValidationResult> {
  // 1. Get fingerprint from header (primary) or searchParams (legacy fallback)
  const headerFp = request.headers.get('X-User-Fingerprint');
  const paramFp = request.nextUrl?.searchParams?.get('fingerprint') ||
                  request.nextUrl?.searchParams?.get('fp');
  const fingerprint = headerFp || paramFp;

  if (!fingerprint || !quickValidateFingerprint(fingerprint)) {
    return { valid: false, fingerprint: null, error: 'Missing or invalid fingerprint' };
  }

  // 2. Check session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    // GRACEFUL DEGRADATION: During rollout, allow requests without cookie
    // TODO: After full rollout, change this to return { valid: false }
    return {
      valid: true,
      fingerprint,
      error: 'no_session_cookie', // Soft warning, not blocking
    };
  }

  // 3. Verify cookie and compare fingerprints
  const cookieFp = await verifySessionToken(sessionCookie.value);

  if (!cookieFp) {
    // Cookie exists but is invalid/expired
    return { valid: false, fingerprint: null, error: 'Invalid or expired session' };
  }

  if (cookieFp !== fingerprint) {
    // CRITICAL: Fingerprint mismatch — possible impersonation attempt
    return { valid: false, fingerprint: null, error: 'Session fingerprint mismatch' };
  }

  // All checks passed
  return { valid: true, fingerprint };
}

/**
 * Quick helper: extract fingerprint from validated session.
 * Returns fingerprint string or null if invalid.
 */
export async function getSessionFingerprint(request: NextRequest): Promise<string | null> {
  const result = await validateSession(request);
  return result.valid ? result.fingerprint : null;
}
