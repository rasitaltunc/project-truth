// ═══════════════════════════════════════════
// SECURITY SPRINT S1: Server-side Fingerprint Validation
// Validates that a fingerprint has been seen before in the system
// Does NOT replace Supabase Auth — works within anonymous-first model
// ═══════════════════════════════════════════

import { supabaseAdmin } from '@/lib/supabase';

// In-memory IP → fingerprint tracking (max 3 fingerprints per IP)
const ipFingerprintMap = new Map<string, Set<string>>();
const IP_FINGERPRINT_LIMIT = 3;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let lastCleanup = Date.now();

function cleanupIpMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  ipFingerprintMap.clear(); // Simple reset — sliding window not needed for IP tracking
}

/**
 * Extract client IP from request headers
 *
 * SECURITY: Only trust x-real-ip (set by reverse proxy infrastructure).
 * x-forwarded-for last entry is fallback (rightmost = added by trusted proxy).
 * Client can spoof x-forwarded-for first entries but not the last one.
 */
function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim());
    return parts[parts.length - 1];
  }

  return 'unknown';
}

/**
 * Basic fingerprint format validation
 * Device fingerprint is SHA-256 hex = 64 characters
 */
function isValidFingerprintFormat(fingerprint: string): boolean {
  if (!fingerprint || typeof fingerprint !== 'string') return false;
  // SHA-256 hex string: exactly 64 hex characters
  // Some fingerprints may be shorter UUIDs or other formats
  // Accept 16-128 character alphanumeric strings
  return /^[a-f0-9-]{16,128}$/i.test(fingerprint);
}

export interface FingerprintValidation {
  valid: boolean;
  verifiedFingerprint: string;
  isNew: boolean;
  error?: string;
}

/**
 * Validate a fingerprint against the system
 *
 * Checks:
 * 1. Format validation (hex string)
 * 2. IP-based fingerprint limit (max 3 per IP)
 * 3. Existence in truth_users or user_global_badges (optional — new users allowed but flagged)
 */
export async function validateFingerprint(
  fingerprint: string | null | undefined,
  request: Request
): Promise<FingerprintValidation> {
  // Step 1: Null/empty check
  if (!fingerprint) {
    return { valid: false, verifiedFingerprint: '', isNew: false, error: 'fingerprint gerekli' };
  }

  // Step 2: Format validation
  if (!isValidFingerprintFormat(fingerprint)) {
    return { valid: false, verifiedFingerprint: '', isNew: false, error: 'Geçersiz fingerprint formatı' };
  }

  // Step 3: IP-based fingerprint limiting
  cleanupIpMap();
  const clientIp = getClientIp(request);
  if (clientIp !== 'unknown') {
    let ipFingerprints = ipFingerprintMap.get(clientIp);
    if (!ipFingerprints) {
      ipFingerprints = new Set();
      ipFingerprintMap.set(clientIp, ipFingerprints);
    }

    // If this fingerprint is new for this IP
    if (!ipFingerprints.has(fingerprint)) {
      if (ipFingerprints.size >= IP_FINGERPRINT_LIMIT) {
        return {
          valid: false,
          verifiedFingerprint: '',
          isNew: false,
          error: 'Bu IP adresinden çok fazla farklı kimlik kullanılıyor',
        };
      }
      ipFingerprints.add(fingerprint);
    }
  }

  // Step 4: Check if fingerprint exists in truth_users or user_global_badges
  let isNew = true;
  try {
    const { data: userData } = await supabaseAdmin
      .from('truth_users')
      .select('anonymous_id')
      .eq('anonymous_id', fingerprint)
      .maybeSingle();

    if (userData) {
      isNew = false;
    } else {
      // Also check user_global_badges
      const { data: badgeData } = await supabaseAdmin
        .from('user_global_badges')
        .select('user_fingerprint')
        .eq('user_fingerprint', fingerprint)
        .maybeSingle();

      if (badgeData) {
        isNew = false;
      }
    }
  } catch {
    // DB check failed — allow but flag as new (graceful degradation)
    isNew = true;
  }

  return {
    valid: true,
    verifiedFingerprint: fingerprint,
    isNew,
  };
}

/**
 * Quick fingerprint format check only (no DB call)
 * Use this for non-critical routes where DB roundtrip isn't worth it
 */
export function quickValidateFingerprint(fingerprint: string | null | undefined): boolean {
  if (!fingerprint) return false;
  return isValidFingerprintFormat(fingerprint);
}
