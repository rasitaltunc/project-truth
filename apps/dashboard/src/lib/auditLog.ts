// ═══════════════════════════════════════════
// SECURITY SPRINT S3 + A3: Audit Log Helper
// Immutable audit trail for critical operations
// Table: audit_logs (see SPRINT_S3_AUDIT_MIGRATION.sql)
//
// SECURITY A3: Fingerprints are hashed (SHA-256 prefix) and IPs are
// anonymized (last octet zeroed) before storage. This prevents
// deanonymization if the audit_logs table is ever compromised.
// ═══════════════════════════════════════════

import { supabaseAdmin } from '@/lib/supabase';

// ── Hashing & Anonymization Helpers ──

/**
 * Hash a fingerprint for audit storage.
 * Uses first 16 chars of SHA-256 — enough for correlation within logs,
 * but not reversible to original fingerprint.
 */
async function hashForAudit(value: string): Promise<string> {
  if (!value || value === 'unknown') return 'unknown';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(value + '__audit_salt_v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // 16 hex chars = 64 bits, sufficient for log correlation
  } catch {
    // Fallback: simple mask if crypto.subtle unavailable
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }
}

/**
 * Anonymize an IP address by zeroing the last octet (IPv4) or last 80 bits (IPv6).
 * 192.168.1.45 → 192.168.1.0
 * 2001:db8::1 → 2001:db8::0
 */
function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';

  // IPv4: zero last octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  // IPv6: zero last 5 groups (80 bits)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 3).join(':') + '::0';
    }
  }

  return 'masked';
}

// ── Types ──

export type AuditAction =
  | 'dms_create'
  | 'dms_checkin'
  | 'dms_pause'
  | 'dms_resume'
  | 'dms_cancel'
  | 'collective_dms_create'
  | 'collective_dms_checkin'
  | 'collective_dms_approve'
  | 'collective_dms_vote'
  | 'collective_dms_pause'
  | 'collective_dms_resume'
  | 'collective_dms_cancel'
  | 'badge_change'
  | 'badge_blocked'
  | 'quarantine_review'
  | 'quarantine_promote'
  | 'evidence_submit'
  | 'rate_limit_hit';

export type AuditResult = 'success' | 'failure' | 'blocked';

export interface AuditLogParams {
  fingerprint: string;
  action: AuditAction;
  resource: string; // table name or resource identifier
  resourceId?: string; // UUID or ID of the resource
  result: AuditResult;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an action to the audit trail.
 * Fire-and-forget — never blocks the main request.
 * Gracefully degrades if audit_logs table doesn't exist.
 *
 * SECURITY A3: Fingerprint is hashed, IP is anonymized before storage.
 */
export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    const hashedFingerprint = await hashForAudit(params.fingerprint);
    const anonIp = anonymizeIp(params.ip || 'unknown');

    await supabaseAdmin
      .from('audit_logs')
      .insert({
        fingerprint: hashedFingerprint,
        action: params.action,
        resource: params.resource,
        resource_id: params.resourceId || null,
        result: params.result,
        ip_address: anonIp,
        metadata: params.metadata || {},
      });
  } catch {
    // Silently fail — audit logging should never break the main flow
    // This handles the case where the audit_logs table doesn't exist yet
    console.warn('[audit] Failed to log action:', params.action);
  }
}

/**
 * Extract IP from request and log an action
 * Convenience wrapper that handles IP extraction
 *
 * SECURITY A6: Trust x-real-ip first (set by reverse proxy, not spoofable).
 * x-forwarded-for LAST entry is fallback (rightmost = added by trusted proxy).
 */
export async function logAuditActionFromRequest(
  request: Request,
  params: Omit<AuditLogParams, 'ip'>
): Promise<void> {
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = realIp
    ? realIp
    : forwarded
      ? forwarded.split(',').map((s) => s.trim()).pop() || 'unknown'
      : 'unknown';

  return logAuditAction({ ...params, ip });
}
