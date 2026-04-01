/**
 * TEST ENDPOINT — Pipeline Accuracy Test
 *
 * POST /api/test/scan-pipeline
 * Body: { "text": "document text", "label": "test label" }
 *
 * Runs 3-pass consensus engine on provided text and returns full results.
 * This is a TEMPORARY endpoint for Faz 0 testing. Remove before launch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runThreePassScan } from '@/lib/consensusEngine';

export async function POST(req: NextRequest) {
  try {
    const { text, label } = await req.json();

    if (!text || text.length < 100) {
      return NextResponse.json({ error: 'Text too short (min 100 chars)' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const startTime = Date.now();

    // Run the actual 3-pass consensus engine
    const result = await runThreePassScan(
      text.substring(0, 25000), // Limit to fit context
      'Jeffrey Epstein, Ghislaine Maxwell', // Known network nodes
      'court_record', // Document type for confidence scoring
      undefined // No case context
    );

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      label: label || 'unnamed_test',
      duration_ms: duration,
      result,
      meta: {
        text_length: text.length,
        text_truncated: text.length > 25000,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
