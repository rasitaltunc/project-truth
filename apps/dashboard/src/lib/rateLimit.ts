// ═══════════════════════════════════════════
// Rate Limiting Utility — Sliding Window
// ═══════════════════════════════════════════
//
// ARCHITECTURE DECISION (Faz 0 — 31 March 2026):
// In-memory Map is ACCEPTABLE for Vercel Hobby (single instance).
// Server restart resets counters — tolerable for launch traffic.
//
// ⚠️ SCALING TRIGGER: When we move to multiple Vercel instances or
// observe rate limit bypass patterns in Sentry, migrate to:
//   @upstash/ratelimit + @upstash/redis (free tier: 10K req/day)
//   See: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
//
// This is a CONSCIOUS TRADE-OFF: simplicity now, Redis when needed.
// ═══════════════════════════════════════════

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

/**
 * Check rate limit for a given identifier (IP, fingerprint, etc.)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { maxRequests, windowMs } = options;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Periodic cleanup
  cleanup(windowMs);

  // Get or create entry
  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Filter to only timestamps within the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    // Rate limited
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Allow the request
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: null,
  };
}

/**
 * Extract client identifier from request
 *
 * SECURITY: Only trust x-real-ip (set by Vercel/reverse proxy infrastructure).
 * x-forwarded-for is CLIENT-SPOOFABLE and must never be trusted directly.
 * On Vercel: x-real-ip is set by the platform and cannot be spoofed.
 * On other platforms: configure reverse proxy to set x-real-ip securely.
 */
export function getClientId(request: Request): string {
  // Priority 1: x-real-ip (trusted, set by infrastructure)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Priority 2: x-forwarded-for LAST entry (rightmost = closest proxy)
  // The last entry is added by the trusted reverse proxy, not the client.
  // Client can prepend fake entries but cannot control the last one.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim());
    return parts[parts.length - 1]; // Last = added by trusted proxy
  }

  return 'unknown-' + Date.now(); // Unique per request to avoid shared rate limit
}

// ── Pre-configured rate limiters ──

/** Chat API: 20 requests per minute per client */
export const CHAT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 20,
  windowMs: 60 * 1000,
};

/** Intent classify: 30 requests per minute */
export const INTENT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 30,
  windowMs: 60 * 1000,
};

/** Evidence submit: 5 per minute */
export const EVIDENCE_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 5,
  windowMs: 60 * 1000,
};

/** Game endpoints: 20 requests per minute (heavier DB operations per request) */
export const GAME_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 20,
  windowMs: 60 * 1000,
};

/** General API: 60 requests per minute */
export const GENERAL_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};

/**
 * SECURITY B8: DMS critical actions — 3 per minute per fingerprint
 * Used for: DMS create, collective DMS create, vote, approve_guarantor
 * This is PER-FINGERPRINT, not per-IP (unlike other rate limits)
 */
export const DMS_CRITICAL_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 3,
  windowMs: 60 * 1000,
};

/** GCP/AI expensive operations: 10 per minute (cost protection) */
export const GCP_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 10,
  windowMs: 60 * 1000,
};

/** Voting/nomination: 15 per minute (Sybil protection) */
export const VOTE_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 15,
  windowMs: 60 * 1000,
};

// ── C1 FIX: Helper function to reduce boilerplate ──

import { NextRequest, NextResponse } from 'next/server';
import { recordAndLogSecurityEvent } from '@/lib/securityMonitor';

/**
 * Apply rate limit check — returns NextResponse (429) if blocked, null if allowed.
 * G1 FIX: Automatically logs rate limit hits to security monitor + audit trail.
 */
export function applyRateLimit(
  request: NextRequest,
  preset: RateLimitOptions = GENERAL_RATE_LIMIT
): NextResponse | null {
  const rawClientId = getClientId(request);
  // Scope rate limit key by preset maxRequests to avoid cross-contamination
  // between different limiters (e.g., GAME_RATE_LIMIT vs GENERAL_RATE_LIMIT)
  const route = request.nextUrl?.pathname || 'unknown';
  const clientId = `${rawClientId}:${route}:${preset.maxRequests}`;
  const result = checkRateLimit(clientId, preset);

  if (!result.allowed) {
    // G1 FIX: Log rate limit hit to security monitor (fire-and-forget)
    recordAndLogSecurityEvent(request, {
      type: 'rate_limit_hit',
      clientId: rawClientId,
      route,
      metadata: {
        preset_max: preset.maxRequests,
        preset_window_ms: preset.windowMs,
        retry_after_ms: result.retryAfterMs,
      },
    }).catch(() => {});

    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
        },
      }
    );
  }
  return null;
}
