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
import Groq from 'groq-sdk';
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

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const startTime = Date.now();

    // Run the actual 3-pass consensus engine with all required arguments
    const result = await runThreePassScan(
      groq,
      text.substring(0, 50000), // Groq llama-3.3-70b has 128K context, ~50K chars = ~12K tokens
      'Jeffrey Epstein, Ghislaine Maxwell', // Known network nodes
      true, // hasRealContent
      'court_record', // Document type
      'test_pipeline', // Source provider
      'v1.0', // Prompt version
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
