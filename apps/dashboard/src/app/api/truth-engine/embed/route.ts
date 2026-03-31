// ============================================
// THE TRUTH ENGINE - Embedding API Route
// OpenAI Embeddings için server-side proxy
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, CHAT_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, truthEngineEmbedSchema } from '@/lib/validationSchemas';
import { checkBodySize } from '@/lib/errorHandler';

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const COST_PER_1K_TOKENS = 0.0001;

export async function POST(request: NextRequest) {
  // Rate limit check — CHAT_RATE_LIMIT (20/min)
  const blocked = applyRateLimit(request, CHAT_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 2MB default for JSON
  const tooBig = checkBodySize(request);
  if (tooBig) return tooBig;

  try {
    const body = await request.json();

    // Validate embedding request data
    const validation = validateBody(truthEngineEmbedSchema, body);
    if (!validation.success) return validation.response;
    const { texts } = validation.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI embedding error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Embedding failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Calculate cost
    const totalTokens = data.usage?.total_tokens || 0;
    const cost = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    // Transform response
    const embeddings = data.data.map((item: any, index: number) => ({
      text: texts[index],
      embedding: item.embedding,
      index: item.index,
    }));

    return NextResponse.json({
      success: true,
      embeddings,
      totalTokens,
      cost,
      model: EMBEDDING_MODEL
    });

  } catch (error: any) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { error: error.message || 'Embedding failed' },
      { status: 500 }
    );
  }
}
