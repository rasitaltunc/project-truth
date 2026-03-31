// ═══════════════════════════════════════════
// G1 FIX: Security Event Monitor
// Detects suspicious patterns (brute force, mass scanning)
// In-memory sliding window + threshold alerting
// ═══════════════════════════════════════════

import { logAuditActionFromRequest } from '@/lib/auditLog';

// ── Types ──

export type SecurityEventType =
  | 'rate_limit_hit'      // Rate limit triggered
  | 'file_upload_blocked' // Magic bytes mismatch / invalid file
  | 'auth_failure'        // Bad fingerprint / unauthorized access
  | 'body_too_large'      // Oversized request body
  | 'suspicious_scan'     // Mass endpoint scanning
  | 'mime_mismatch';      // MIME type spoofing attempt

interface SecurityEvent {
  type: SecurityEventType;
  clientId: string;
  route: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ThreatLevel {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  eventCount: number;
}

// ── In-Memory Event Store ──

const WINDOW_MS = 10 * 60 * 1000; // 10-minute detection window
const MAX_EVENTS = 10000;          // Memory cap
const events: SecurityEvent[] = [];

// Cleanup every 5 minutes
let lastCleanup = Date.now();
function cleanupEvents() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  while (events.length > 0 && events[0].timestamp < cutoff) {
    events.shift();
  }
  // Hard cap
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

// ── Threat Detection Thresholds ──

const THRESHOLDS = {
  // Same client hitting rate limit X times in 10 min = escalation
  rate_limit_low: 3,       // 3 hits → low
  rate_limit_medium: 8,    // 8 hits → medium (possible automated tool)
  rate_limit_high: 15,     // 15 hits → high (definite attack)

  // File validation failures
  file_block_medium: 3,    // 3 failed uploads → medium (possible attack)
  file_block_high: 8,      // 8 failed uploads → high

  // Distinct routes hit by same client (scanning detection)
  route_scan_medium: 15,   // 15 different routes in 10 min → medium
  route_scan_high: 30,     // 30 different routes → high (likely scanner)
};

// ── Public API ──

/**
 * Record a security event and evaluate threat level.
 * Fire-and-forget — never blocks main flow.
 */
export function recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  cleanupEvents();

  events.push({
    ...event,
    timestamp: Date.now(),
  });
}

/**
 * Record a security event AND log to audit trail (Supabase).
 * Use this for important events that need persistent storage.
 */
export async function recordAndLogSecurityEvent(
  request: Request,
  event: Omit<SecurityEvent, 'timestamp'>,
  fingerprint?: string
): Promise<void> {
  recordSecurityEvent(event);

  // Fire-and-forget audit log
  logAuditActionFromRequest(request, {
    fingerprint: fingerprint || event.clientId || 'unknown',
    action: 'rate_limit_hit',
    resource: event.route,
    result: 'blocked',
    metadata: {
      event_type: event.type,
      ...event.metadata,
    },
  }).catch(() => {});
}

/**
 * Evaluate the current threat level for a specific client.
 */
export function evaluateThreat(clientId: string): ThreatLevel {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const clientEvents = events.filter(
    (e) => e.clientId === clientId && e.timestamp > cutoff
  );

  if (clientEvents.length === 0) {
    return { level: 'none', reason: '', eventCount: 0 };
  }

  // Count rate limit hits
  const rateLimitHits = clientEvents.filter((e) => e.type === 'rate_limit_hit').length;

  if (rateLimitHits >= THRESHOLDS.rate_limit_high) {
    return {
      level: 'critical',
      reason: `${rateLimitHits} rate limit hits in 10min — likely automated attack`,
      eventCount: rateLimitHits,
    };
  }

  if (rateLimitHits >= THRESHOLDS.rate_limit_medium) {
    return {
      level: 'high',
      reason: `${rateLimitHits} rate limit hits — possible automated tool`,
      eventCount: rateLimitHits,
    };
  }

  // Count file validation failures
  const fileBlocks = clientEvents.filter(
    (e) => e.type === 'file_upload_blocked' || e.type === 'mime_mismatch'
  ).length;

  if (fileBlocks >= THRESHOLDS.file_block_high) {
    return {
      level: 'high',
      reason: `${fileBlocks} file upload rejections — possible malware upload attempt`,
      eventCount: fileBlocks,
    };
  }

  // Count distinct routes (scanning detection)
  const distinctRoutes = new Set(clientEvents.map((e) => e.route)).size;

  if (distinctRoutes >= THRESHOLDS.route_scan_high) {
    return {
      level: 'high',
      reason: `${distinctRoutes} distinct routes hit — likely vulnerability scanner`,
      eventCount: clientEvents.length,
    };
  }

  if (distinctRoutes >= THRESHOLDS.route_scan_medium) {
    return {
      level: 'medium',
      reason: `${distinctRoutes} distinct routes — possible scanning`,
      eventCount: clientEvents.length,
    };
  }

  // Moderate threat levels
  if (rateLimitHits >= THRESHOLDS.rate_limit_low) {
    return {
      level: 'low',
      reason: `${rateLimitHits} rate limit hits`,
      eventCount: rateLimitHits,
    };
  }

  if (fileBlocks >= THRESHOLDS.file_block_medium) {
    return {
      level: 'medium',
      reason: `${fileBlocks} file upload rejections`,
      eventCount: fileBlocks,
    };
  }

  return {
    level: 'low',
    reason: `${clientEvents.length} security events recorded`,
    eventCount: clientEvents.length,
  };
}

/**
 * Get a summary of recent security events for monitoring.
 * Returns aggregated stats, not individual events (privacy).
 */
export function getSecuritySummary(): {
  totalEvents: number;
  windowMinutes: number;
  byType: Record<string, number>;
  topThreats: Array<{ clientId: string; threat: ThreatLevel }>;
  activeClients: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = events.filter((e) => e.timestamp > cutoff);

  // Count by type
  const byType: Record<string, number> = {};
  for (const e of recent) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  // Find unique clients with threats
  const clients = new Set(recent.map((e) => e.clientId));
  const threats: Array<{ clientId: string; threat: ThreatLevel }> = [];

  for (const clientId of clients) {
    const threat = evaluateThreat(clientId);
    if (threat.level !== 'none' && threat.level !== 'low') {
      // Mask client ID for privacy (first 8 chars only)
      threats.push({
        clientId: clientId.substring(0, 8) + '***',
        threat,
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
  threats.sort((a, b) => severityOrder[a.threat.level] - severityOrder[b.threat.level]);

  return {
    totalEvents: recent.length,
    windowMinutes: WINDOW_MS / 60000,
    byType,
    topThreats: threats.slice(0, 10), // Top 10
    activeClients: clients.size,
  };
}
