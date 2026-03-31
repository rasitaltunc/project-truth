// ============================================
// THE TRUTH ENGINE - Server-side API Route
// Bu route, Claude API çağrılarını server-side yapar
// API keys browser'da açığa çıkmaz!
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, GCP_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, truthEngineAnalyzeSchema } from '@/lib/validationSchemas';
import { checkBodySize } from '@/lib/errorHandler';

// ============================================
// CONFIGURATION
// ============================================

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 4096;
const COST_PER_INPUT_1K = 0.003;
const COST_PER_OUTPUT_1K = 0.015;

// Lazy initialization - only when needed
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// PROMPT TEMPLATE
// ============================================

const ENTITY_EXTRACTION_PROMPT = `You are an expert intelligence analyst working on PROJECT TRUTH, investigating networks of power and corruption.

Analyze the following document and extract ALL entities and relationships.

ENTITY TYPES:
- person: Named individuals
- organization: Companies, foundations, government agencies, NGOs
- location: Places, addresses, countries, properties
- event: Meetings, incidents, dates of significance
- asset: Planes (look for N-numbers), yachts, real estate, vehicles
- financial: Bank accounts, transactions, amounts
- media: Photos, videos, documents mentioned
- communication: Emails, phone calls, messages

RELATIONSHIP TYPES:
- family, friend, romantic, associate (personal)
- employer, employee, board_member, founder, investor, advisor, client, partner (professional)
- funded, received_funds, owns, owned_by, transaction (financial)
- visited, lives_at, worked_at, headquartered (location)
- attended, organized, witnessed, mentioned_in (events)
- authored, signed, appears_in, referenced_in (documents)
- connected_to (when relationship is unclear)

IMPORTANT GUIDELINES:
1. Extract EVERY named entity, even if mentioned briefly
2. Look for implicit relationships (e.g., same company = connected)
3. Note dates and timeframes when mentioned
4. Flag any suspicious patterns or anomalies
5. Cross-reference known entities in the Epstein network
6. Pay special attention to: flight logs, financial records, witness statements

OUTPUT FORMAT (JSON):
{
  "entities": [
    {
      "name": "Full Name",
      "type": "person|organization|location|etc",
      "aliases": ["Other names"],
      "confidence": 0-100,
      "context": "Quote from document where entity appears"
    }
  ],
  "relationships": [
    {
      "source": "Entity Name 1",
      "target": "Entity Name 2",
      "type": "relationship_type",
      "confidence": 0-100,
      "evidence": "Quote supporting this relationship",
      "reasoning": "Why you believe this relationship exists"
    }
  ],
  "summary": "2-3 sentence summary of the document",
  "keyFacts": ["List of key findings"],
  "suggestedInvestigations": [
    {
      "title": "Investigation lead title",
      "description": "What should be investigated",
      "reasoning": "Why this is important"
    }
  ]
}

DOCUMENT TO ANALYZE:
`;

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(request, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 2MB default for JSON
  const tooBig = checkBodySize(request);
  if (tooBig) return tooBig;

  try {
    const body = await request.json();

    // Validate analysis request data
    const validation = validateBody(truthEngineAnalyzeSchema, body);
    if (!validation.success) return validation.response;
    const { content, documentId, existingEntities } = validation.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Build prompt
    let prompt = ENTITY_EXTRACTION_PROMPT + '\n\n' + content;

    if (existingEntities && existingEntities.length > 0) {
      prompt += `\n\nNOTE: Local extraction already found these entities. Verify and expand:\n${JSON.stringify(existingEntities.map((e: any) => ({ name: e.name, type: e.type })), null, 2)}`;
    }

    // Call Claude API
    const client = getAnthropicClient();
    const startTime = Date.now();

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Calculate cost
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = (inputTokens / 1000) * COST_PER_INPUT_1K +
                 (outputTokens / 1000) * COST_PER_OUTPUT_1K;

    // Parse response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      parsed = {
        entities: [],
        relationships: [],
        summary: responseText.substring(0, 500),
        keyFacts: [],
        suggestedInvestigations: []
      };
    }

    // Log cost to database
    try {
      await supabase.from('cost_records').insert({
        operation: 'extraction',
        model_used: CLAUDE_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        document_id: documentId,
      });
    } catch (e) {
      console.warn('Failed to log cost:', e);
    }

    return NextResponse.json({
      success: true,
      processingTime: Date.now() - startTime,
      cost,
      tokensUsed: inputTokens + outputTokens,
      modelUsed: CLAUDE_MODEL,
      entities: parsed.entities || [],
      relationships: parsed.relationships || [],
      summary: parsed.summary || '',
      keyFacts: parsed.keyFacts || [],
      suggestedInvestigations: parsed.suggestedInvestigations || []
    });

  } catch (error: any) {
    console.error('Claude analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

// ============================================
// GET Handler - Cost estimation
// ============================================

export async function GET(request: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(request, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const textLength = parseInt(searchParams.get('length') || '0');

  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(textLength / 4) + 2000; // +2000 for prompt
  const outputTokens = Math.min(MAX_OUTPUT_TOKENS, Math.ceil(inputTokens * 0.3));

  const cost = (inputTokens / 1000) * COST_PER_INPUT_1K +
               (outputTokens / 1000) * COST_PER_OUTPUT_1K;

  return NextResponse.json({
    estimatedCost: Math.round(cost * 10000) / 10000,
    inputTokens,
    outputTokens
  });
}
