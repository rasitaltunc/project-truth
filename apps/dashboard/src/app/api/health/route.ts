// ═══════════════════════════════════════════
// G2 FIX: Health Check Endpoint
// GET /api/health — Component-level health status
// Used by: UptimeRobot, Vercel, internal monitoring
// No auth required (public health check is standard practice)
// ═══════════════════════════════════════════

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isGCSAvailable } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
}

/**
 * GET — Health check with component-level status.
 * Returns 200 if core services are up, 503 if critical components are down.
 */
export async function GET() {
  const startTime = Date.now();
  const components: Record<string, ComponentHealth> = {};

  // ── 1. Database (Supabase) ──
  try {
    const dbStart = Date.now();
    const { error } = await supabaseAdmin
      .from('networks')
      .select('id')
      .limit(1)
      .single();

    const dbLatency = Date.now() - dbStart;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found — that's fine, table exists
      components.database = {
        status: 'degraded',
        latencyMs: dbLatency,
        message: 'Query returned error',
      };
    } else {
      components.database = {
        status: 'healthy',
        latencyMs: dbLatency,
      };
    }
  } catch {
    components.database = { status: 'down', message: 'Connection failed' };
  }

  // ── 2. Google Cloud Storage ──
  try {
    components.gcs = {
      status: isGCSAvailable() ? 'healthy' : 'degraded',
      message: isGCSAvailable() ? undefined : 'GCS not configured',
    };
  } catch {
    components.gcs = { status: 'down', message: 'GCS check failed' };
  }

  // ── 3. AI Service (Groq) ──
  components.ai = {
    status: process.env.GROQ_API_KEY ? 'healthy' : 'degraded',
    message: process.env.GROQ_API_KEY ? undefined : 'GROQ_API_KEY not set',
  };

  // ── 4. Environment ──
  components.environment = {
    status:
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'healthy'
        : 'degraded',
    message:
      !process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'SUPABASE_URL missing'
        : !process.env.SUPABASE_SERVICE_ROLE_KEY
          ? 'SERVICE_ROLE_KEY missing'
          : undefined,
  };

  // ── Overall status ──
  const allStatuses = Object.values(components).map((c) => c.status);
  const hasCriticalDown = components.database?.status === 'down'; // DB is critical
  const hasAnyDown = allStatuses.includes('down');
  const hasAnyDegraded = allStatuses.includes('degraded');

  const overallStatus = hasCriticalDown
    ? 'down'
    : hasAnyDown
      ? 'degraded'
      : hasAnyDegraded
        ? 'degraded'
        : 'healthy';

  const totalLatency = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatencyMs: totalLatency,
    components,
    version: process.env.npm_package_version || '1.0.0',
  };

  // Return 503 if critical component is down (triggers uptime alerts)
  const httpStatus = overallStatus === 'down' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
