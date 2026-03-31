/**
 * /api/documents/vision
 * POST: Image analysis using Google Cloud Vision AI
 *
 * For FBI evidence photos, building exteriors, crime scene images —
 * answers "what's in this photo?" and "where is this?"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeImage, isVisionAIAvailable } from '@/lib/visionAI';
import { downloadFromGCS } from '@/lib/gcs';
import { applyRateLimit, GCP_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(req, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { documentId, fileUrl, gcsPath } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (!fileUrl && !gcsPath) {
      return NextResponse.json({ error: 'fileUrl or gcsPath is required' }, { status: 400 });
    }

    // Check Vision AI availability
    if (!isVisionAIAvailable()) {
      return NextResponse.json(
        { error: 'VISION_AI_UNAVAILABLE', message: 'Google Cloud Vision AI is not configured.' },
        { status: 503 }
      );
    }

    // Fetch the image
    let imageBuffer: Buffer | null = null;

    if (gcsPath) {
      imageBuffer = await downloadFromGCS(gcsPath);
    }

    if (!imageBuffer && fileUrl) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } catch (fetchErr) {
        console.error('[Vision API] Failed to fetch image:', fetchErr);
      }
    }

    if (!imageBuffer) {
      return NextResponse.json(
        { error: 'Failed to download image for analysis' },
        { status: 500 }
      );
    }

    // Analyze with Vision AI (all features)
    const result = await analyzeImage(imageBuffer);

    if (!result) {
      return NextResponse.json(
        { error: 'Vision AI analysis failed' },
        { status: 500 }
      );
    }

    // Build a human-readable summary for the scan pipeline
    const summaryParts: string[] = [];

    if (result.labels.length > 0) {
      const topLabels = result.labels
        .filter((l) => l.score > 0.7)
        .slice(0, 5)
        .map((l) => l.description);
      if (topLabels.length > 0) {
        summaryParts.push(`Labels: ${topLabels.join(', ')}`);
      }
    }

    if (result.objects.length > 0) {
      const topObjects = result.objects
        .filter((o) => o.score > 0.5)
        .slice(0, 5)
        .map((o) => o.name);
      if (topObjects.length > 0) {
        summaryParts.push(`Objects: ${topObjects.join(', ')}`);
      }
    }

    if (result.landmarks.length > 0) {
      const lm = result.landmarks[0];
      summaryParts.push(`Location: ${lm.description} (${lm.latitude.toFixed(4)}, ${lm.longitude.toFixed(4)})`);
    }

    if (result.text) {
      const textPreview = result.text.length > 200
        ? result.text.slice(0, 200) + '...'
        : result.text;
      summaryParts.push(`Text found: "${textPreview}"`);
    }

    if (result.webBestGuesses.length > 0) {
      summaryParts.push(`Web: ${result.webBestGuesses.join(', ')}`);
    }

    const visionSummary = summaryParts.join(' | ');

    // Update document with vision results
    const { data: currentDoc } = await supabaseAdmin
      .from('documents')
      .select('metadata, raw_content')
      .eq('id', documentId)
      .single();

    // Append vision analysis to raw_content for scan pipeline
    const existingContent = currentDoc?.raw_content || '';
    const visionContent = [
      existingContent,
      '\n\n--- VISION AI ANALYSIS ---',
      visionSummary,
      result.text ? `\n--- EXTRACTED TEXT FROM IMAGE ---\n${result.text}` : '',
    ].filter(Boolean).join('\n');

    await supabaseAdmin
      .from('documents')
      .update({
        raw_content: visionContent,
        metadata: {
          ...((currentDoc?.metadata as Record<string, unknown>) || {}),
          vision_analysis: {
            labels: result.labels.slice(0, 10),
            objects: result.objects.slice(0, 10),
            landmarks: result.landmarks,
            webEntities: result.webEntities.slice(0, 5),
            webBestGuesses: result.webBestGuesses,
            matchingPages: result.matchingPageUrls,
            safeSearch: result.safeSearch,
            hasText: !!result.text,
            textLength: result.text?.length || 0,
            processingTimeMs: result.processingTimeMs,
          },
        },
      })
      .eq('id', documentId);

    return NextResponse.json({
      success: true,
      documentId,
      summary: visionSummary,
      labels: result.labels,
      objects: result.objects,
      text: result.text,
      landmarks: result.landmarks,
      webEntities: result.webEntities,
      webBestGuesses: result.webBestGuesses,
      matchingPageUrls: result.matchingPageUrls,
      safeSearch: result.safeSearch,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (error) {
    return safeErrorResponse('POST /api/documents/vision', error);
  }
}
