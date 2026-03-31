// ==========================================
// PROJECT TRUTH - API CONNECTION TEST
// GET /api/ingestion/test
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { testVisionAPI } from '@/lib/ingestion/google-vision';
import { testCourtListenerAPI } from '@/lib/ingestion/court-listener';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;
  const results = {
    timestamp: new Date().toISOString(),
    apis: {
      googleVision: {
        status: 'checking...',
        configured: !!process.env.GOOGLE_VISION_API_KEY,
      },
      courtListener: {
        status: 'checking...',
        configured: !!process.env.COURTLISTENER_API_TOKEN,
      },
      supabase: {
        status: 'configured',
        configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    },
  };

  // Google Vision Test
  try {
    const visionOk = await testVisionAPI();
    results.apis.googleVision.status = visionOk ? '✅ Connected' : '❌ Failed';
  } catch (error) {
    results.apis.googleVision.status = `❌ Error: ${error}`;
  }

  // CourtListener Test
  try {
    const clResult = await testCourtListenerAPI();
    results.apis.courtListener.status = clResult.success
      ? `✅ Connected (${clResult.sampleResults} sample docs)`
      : `❌ ${clResult.message}`;
  } catch (error) {
    results.apis.courtListener.status = `❌ Error: ${error}`;
  }

  return NextResponse.json(results);
}
