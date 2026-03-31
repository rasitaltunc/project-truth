/**
 * AUTH BRIDGE — Fingerprint → Auth Migration Layer
 * Sprint Auth
 *
 * Bu dosya mevcut fingerprint tabanlı API route'lar ile
 * yeni auth sistemi arasında köprü kurar.
 *
 * Strateji: "Hem eski hem yeni çalışsın"
 * - Auth user varsa → user.id kullan
 * - Auth user yoksa → fingerprint kullan (anonim gözlemci)
 * - Mevcut fingerprint ile birikmiş itibar → auth hesabına bağlanabilir
 *
 * Bu dosya tüm API route'larda kullanılacak:
 *   const identity = await resolveIdentity(req);
 *   if (!identity) return unauthorized();
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { getRoleFromTrustLevel, hasPermission, Permission, getVoteWeight } from './roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ═══════════════════════════════════════════
// IDENTITY RESOLUTION
// ═══════════════════════════════════════════

export interface ResolvedIdentity {
  /** User's primary ID (truth_users.id UUID) — null for pure anonymous */
  userId: string | null;
  /** Supabase auth ID — null for anonymous users */
  authId: string | null;
  /** Device fingerprint — always present (even for auth users) */
  fingerprint: string;
  /** Trust level (0-4) */
  trustLevel: number;
  /** User role derived from trust level */
  role: ReturnType<typeof getRoleFromTrustLevel>;
  /** Display name */
  displayName: string | null;
  /** Account creation date (for age-based vote weight) */
  createdAt: string;
  /** Whether this is a registered user (not anonymous) */
  isAuthenticated: boolean;
}

/**
 * Resolve user identity from request.
 *
 * Priority:
 * 1. Supabase Auth token (Authorization: Bearer <jwt>)
 * 2. Fingerprint header (X-Truth-Fingerprint)
 * 3. Fingerprint in body (for POST requests)
 *
 * Returns null if no identity can be resolved.
 */
export async function resolveIdentity(req: NextRequest): Promise<ResolvedIdentity | null> {
  // ── Try Auth token first ──
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && authUser) {
        // Look up truth_users by auth_id
        const { data: truthUser } = await supabaseAdmin
          .from('truth_users')
          .select('id, auth_id, anonymous_id, display_name, trust_level, created_at, device_fingerprint')
          .eq('auth_id', authUser.id)
          .maybeSingle();

        if (truthUser) {
          return {
            userId: truthUser.id,
            authId: authUser.id,
            fingerprint: truthUser.device_fingerprint || truthUser.anonymous_id,
            trustLevel: truthUser.trust_level,
            role: getRoleFromTrustLevel(truthUser.trust_level),
            displayName: truthUser.display_name,
            createdAt: truthUser.created_at,
            isAuthenticated: true,
          };
        }

        // Auth user exists but no truth_user yet — create one
        const anonymousId = `AUTH_${authUser.id.substring(0, 8)}`;
        const { data: newUser } = await supabaseAdmin
          .from('truth_users')
          .insert({
            auth_id: authUser.id,
            anonymous_id: anonymousId,
            display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || null,
            trust_level: 1, // Authenticated = at least contributor
            reputation_score: 10,
            contributions_count: 0,
            verified_contributions: 0,
            false_contributions: 0,
            preferred_language: 'tr',
          })
          .select()
          .single();

        if (newUser) {
          return {
            userId: newUser.id,
            authId: authUser.id,
            fingerprint: anonymousId,
            trustLevel: 1,
            role: 'contributor',
            displayName: newUser.display_name,
            createdAt: newUser.created_at,
            isAuthenticated: true,
          };
        }
      }
    } catch {
      // Token invalid — fall through to fingerprint
    }
  }

  // ── Fallback to fingerprint ──
  const fingerprint =
    req.headers.get('x-truth-fingerprint') ||
    req.headers.get('x-fingerprint');

  if (fingerprint && /^[a-f0-9-]{16,128}$/i.test(fingerprint)) {
    // Look up truth_users by fingerprint/anonymous_id
    const { data: truthUser } = await supabaseAdmin
      .from('truth_users')
      .select('id, auth_id, anonymous_id, display_name, trust_level, created_at, device_fingerprint')
      .or(`anonymous_id.eq.${fingerprint},device_fingerprint.eq.${fingerprint}`)
      .limit(1)
      .maybeSingle();

    if (truthUser) {
      return {
        userId: truthUser.id,
        authId: truthUser.auth_id || null,
        fingerprint,
        trustLevel: truthUser.trust_level,
        role: getRoleFromTrustLevel(truthUser.trust_level),
        displayName: truthUser.display_name,
        createdAt: truthUser.created_at,
        isAuthenticated: !!truthUser.auth_id,
      };
    }

    // Unknown fingerprint — anonymous observer
    return {
      userId: null,
      authId: null,
      fingerprint,
      trustLevel: 0,
      role: 'observer',
      displayName: null,
      createdAt: new Date().toISOString(),
      isAuthenticated: false,
    };
  }

  // No identity at all
  return null;
}

// ═══════════════════════════════════════════
// PERMISSION HELPERS FOR API ROUTES
// ═══════════════════════════════════════════

/** Check if identity has a specific permission */
export function identityHasPermission(identity: ResolvedIdentity, permission: Permission): boolean {
  return hasPermission(identity.trustLevel, permission);
}

/** Get vote weight for this identity */
export function identityVoteWeight(identity: ResolvedIdentity): number {
  return getVoteWeight(identity.trustLevel, identity.createdAt);
}

/**
 * Link an existing fingerprint-based account to an auth user.
 * Used when a user who previously used the platform anonymously
 * creates an account — their reputation transfers.
 *
 * SECURITY: Uses atomic UPDATE with WHERE auth_id IS NULL condition
 * to prevent race condition where two auth IDs claim the same reputation.
 * If another request already linked this fingerprint, UPDATE affects 0 rows.
 */
export async function linkFingerprintToAuth(
  fingerprint: string,
  authId: string
): Promise<boolean> {
  try {
    // SECURITY: Validate inputs
    if (!fingerprint || !authId) return false;
    if (!/^[a-f0-9-]{16,128}$/i.test(fingerprint)) return false;

    // Atomic UPDATE — no separate SELECT needed.
    // WHERE auth_id IS NULL ensures only unlinked accounts get claimed.
    // If two requests race, second one affects 0 rows (no harm done).
    const { data, error } = await supabaseAdmin
      .from('truth_users')
      .update({
        auth_id: authId,
        trust_level: 1, // At least contributor after linking
        updated_at: new Date().toISOString(),
      })
      .or(`anonymous_id.eq.${fingerprint},device_fingerprint.eq.${fingerprint}`)
      .is('auth_id', null) // CRITICAL: Only link if not already linked (atomic check)
      .select('id, reputation_score')
      .maybeSingle();

    if (!error && data) {
      console.log(`[authBridge] Linked fingerprint ${fingerprint.substring(0, 8)}... to auth ${authId.substring(0, 8)}... (reputation: ${data.reputation_score})`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[authBridge] Link error:', err);
    return false;
  }
}
