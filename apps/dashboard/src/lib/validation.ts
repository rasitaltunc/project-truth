// ═══════════════════════════════════════════
// SPRINT 15: Zod Validation Schemas
// Central validation for all API routes
// ═══════════════════════════════════════════

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ── Helper: Validate request body ──

export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ── Shared Primitives ──

const fingerprint = z.string().min(8).max(128);
const networkId = z.string().uuid().or(z.string().min(1).max(100));
const nodeId = z.string().min(1).max(200);
const maxText = (max: number) => z.string().min(1).max(max);

// ── Chat API ──

export const chatSchema = z.object({
  question: z.string().min(1).max(2000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10000),
  })).max(20).optional().default([]),
  nodes: z.array(z.any()).optional(),
  links: z.array(z.any()).optional(),
  previousHighlightNodeIds: z.array(z.string()).max(50).optional(),
});

// ── Investigation API ──

export const investigationCreateSchema = z.object({
  title: maxText(200),
  description: maxText(2000).optional(),
  network_id: networkId,
  created_by: fingerprint,
  initial_question: maxText(2000).optional(),
});

export const investigationStepSchema = z.object({
  investigation_id: z.string().min(1),
  step_order: z.number().int().min(1).max(1000),
  question: maxText(2000),
  ai_response: maxText(10000),
  highlight_node_ids: z.array(z.string()).max(50).optional().default([]),
  annotations: z.record(z.string(), z.string()).optional().default({}),
});

export const investigationVoteSchema = z.object({
  investigation_id: z.string().min(1),
  voter_id: fingerprint,
  vote_type: z.enum(['up', 'down']),
});

// ── Evidence API ──

export const evidenceSubmitSchema = z.object({
  node_id: nodeId,
  network_id: networkId,
  title: maxText(300),
  content: maxText(5000),
  evidence_type: z.enum([
    'court_record', 'financial_record', 'official_document', 'leaked_document',
    'witness_testimony', 'news_major', 'news_minor', 'photograph',
    'social_media', 'travel_record', 'phone_record', 'inference', 'rumor',
  ]),
  source_url: z.string().url().max(2000).optional(),
  submitted_by: fingerprint,
  stake_amount: z.number().min(0).max(1000).optional().default(0),
});

export const evidenceResolveSchema = z.object({
  evidence_id: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  resolver_id: fingerprint,
  reason: maxText(1000).optional(),
});

// ── Badge API ──

export const badgeGetSchema = z.object({
  user_id: fingerprint,
  network_id: networkId.optional(),
});

export const badgeNominateSchema = z.object({
  nominator_id: fingerprint,
  nominee_id: fingerprint,
  network_id: networkId,
  reason: maxText(500).optional(),
});

// ── DMS API ──

export const dmsCreateSchema = z.object({
  user_id: fingerprint,
  display_name: maxText(100),
  check_in_hours: z.number().int().min(1).max(720),
  recipients: z.array(z.object({
    type: z.enum(['email', 'journalist', 'authority', 'trusted_user', 'public']),
    value: z.string().min(1).max(500),
    label: maxText(200).optional(),
  })).min(1).max(20),
  content: maxText(50000),
  network_id: networkId.optional(),
});

export const dmsCheckinSchema = z.object({
  user_id: fingerprint,
  switch_id: z.string().min(1),
});

// ── Proposed Link API (Sprint 10) ──

export const proposeLinkSchema = z.object({
  source_node_id: nodeId,
  target_node_id: nodeId,
  relation_type: maxText(100),
  description: maxText(2000),
  proposed_by: fingerprint,
  network_id: networkId,
  reputation_stake: z.number().min(0).max(500).optional().default(0),
  evidence: z.object({
    title: maxText(300),
    content: maxText(5000),
    source_url: z.string().url().max(2000).optional(),
    evidence_type: z.string().max(50).optional(),
  }).optional(),
});

export const proposeLinkVoteSchema = z.object({
  voter_id: fingerprint,
  vote_type: z.enum(['up', 'down']),
});

// ── Node Stats API ──

export const nodeStatsSchema = z.object({
  node_id: nodeId,
  node_name: maxText(200).optional(),
  highlight_label: maxText(200).optional(),
  network_id: networkId.optional(),
});

// ── Intent Classify API ──

export const intentClassifySchema = z.object({
  query: z.string().min(5).max(2000),
});

// ── Collective DMS API ──

export const collectiveDmsCreateSchema = z.object({
  user_id: fingerprint,
  display_name: maxText(100),
  check_in_hours: z.number().int().min(1).max(720),
  content: maxText(50000),
  network_id: networkId.optional(),
  country_code: z.string().length(2).optional(),
  guarantors: z.array(fingerprint).min(3).max(20),
});
