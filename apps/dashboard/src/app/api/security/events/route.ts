// ═══════════════════════════════════════════
// G1 FIX: Security Events API
// GET /api/security/events — Query security monitor summary
// Protected: requires service role key in header
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getSecuritySummary, evaluateThreat } from '@/lib/securityMonitor';

export const dynamic = 'force-dynamic';

/**
 * GET — Retrieve security event summary.
 * Requires X-Service-Key header matching SUPABASE_SERVICE_ROLE_KEY.
 * This ensures only server-side admin tools can access security data.
 */
export async function GET(request: NextRequest) {
  // Auth: service role key required
  const serviceKey = request.headers.get('x-service-key');
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedKey || serviceKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Optional: evaluate specific client
  const clientId = request.nextUrl.searchParams.get('client');
  if (clientId) {
    const threat = evaluateThreat(clientId);
    return NextResponse.json({ clientId, threat });
  }

  // Default: full summary
  const summary = getSecuritySummary();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...summary,
  });
}
