// ═══════════════════════════════════════════
// SECURITY C7: Centralized Zod Validation Schemas
// Shared schemas for API route input validation
// ═══════════════════════════════════════════

import { z } from 'zod';

// ── Common field validators ──

/** SHA-256 fingerprint: 64 hex characters */
export const fingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid fingerprint format');

/** UUID v4 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/** Safe string: no null bytes, reasonable length */
export const safeString = (maxLen = 500) =>
  z.string().max(maxLen).refine((s) => !s.includes('\0'), 'Null bytes not allowed');

/** URL: must be valid URL format */
export const urlSchema = z.string().url('Invalid URL format').max(2048);

/** Optional URL */
export const optionalUrl = urlSchema.optional().nullable();

// ── Badge schemas ──

export const badgeNominateSchema = z.object({
  nominee_fingerprint: fingerprintSchema,
  network_id: uuidSchema.optional().nullable(),
  reason: safeString(1000),
});

export const badgeJournalistRequestSchema = z.object({
  portfolioUrl: urlSchema,
  reason: safeString(2000).refine((s) => s.length >= 50, 'Reason must be at least 50 characters'),
});

// ── Evidence schemas ──

export const evidenceResolveSchema = z.object({
  evidence_id: uuidSchema,
  resolution: z.enum(['verified', 'rejected', 'disputed', 'insufficient']),
  severity: z.enum(['good_faith', 'misleading', 'malicious']).optional(),
});

export const evidenceSubmitSchema = z.object({
  networkId: uuidSchema.optional().nullable(),
  nodeId: uuidSchema.optional().nullable(),
  linkId: uuidSchema.optional().nullable(),
  title: safeString(200).refine((s) => s.length >= 3, 'Title must be at least 3 characters'),
  description: safeString(5000).optional(),
  evidenceType: z.enum([
    'court_record', 'official_document', 'leaked_document', 'financial_record',
    'photo_video', 'witness_testimony', 'flight_record', 'public_statement',
    'news_report', 'social_media', 'academic_research', 'tax_record', 'other',
  ]),
  sourceUrl: optionalUrl,
  sourceName: safeString(200).optional(),
  sourceDate: z.string().optional().nullable(),
  content: safeString(10000).optional(),
  stake: z.number().min(0).max(100).optional(),
  stakePercent: z.number().min(0).max(100).optional(),
  sourceType: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  sourceHierarchy: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  provenanceUrl: optionalUrl,
});

export const evidenceProvenanceSchema = z.object({
  evidence_id: uuidSchema,
  evidence_table: z.enum(['evidence_archive', 'proposed_link_evidence']).optional(),
  source_type: z.enum([
    'court_filing', 'government_report', 'news_article', 'academic_paper',
    'leaked_document', 'social_media', 'public_record', 'witness_statement',
    'financial_filing', 'photo_video', 'other',
  ]),
  source_hierarchy: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  source_url: optionalUrl,
  source_archive_url: optionalUrl,
  source_hash: z.string().max(128).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  metadata_stripped: z.boolean().optional(),
  link_id: uuidSchema.optional().nullable(),
});

// ── Link Proposal schemas ──

export const linkProposeSchema = z.object({
  network_id: uuidSchema,
  source_id: uuidSchema,
  target_id: uuidSchema,
  relationship_type: safeString(100),
  description: safeString(2000).refine((s) => s.length >= 10, 'Description must be at least 10 characters'),
  badge_tier: z.number().int().min(0).max(4).optional(),
  reputation_staked: z.number().min(0).max(100).optional(),
  initial_evidence_url: optionalUrl,
  initial_evidence_description: safeString(2000).optional(),
});

export const linkProposeEvidenceSchema = z.object({
  evidence_type: z.enum([
    'court_record', 'official_document', 'leaked_document', 'financial_record',
    'photo_video', 'witness_testimony', 'flight_record', 'public_statement',
    'news_report', 'social_media', 'academic_research', 'other',
  ]).optional(),
  confidence_level: z.number().min(0).max(1).optional(),
  source_url: optionalUrl,
  description: safeString(2000).refine((s) => s.length >= 5, 'Description must be at least 5 characters'),
  reputation_staked: z.number().min(0).max(100).optional(),
});

export const linkProposeVoteSchema = z.object({
  direction: z.enum(['up', 'down']),
  badge_tier: z.number().int().min(0).max(4).optional(),
});

// ── Board schema ──

export const boardSaveSchema = z.object({
  network_id: uuidSchema,
  node_positions: z.record(z.object({
    x: z.number(),
    y: z.number(),
  })),
  sticky_notes: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    text: safeString(1000),
    color: z.string().max(20).optional(),
  })).optional(),
  media_cards: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    url: z.string().max(2048),
    type: z.string().max(20),
  })).optional(),
  zoom: z.number().min(0.1).max(10).optional(),
  pan_x: z.number().optional(),
  pan_y: z.number().optional(),
});

// ── Investigation schemas ──

export const investigationVoteSchema = z.object({
  investigationId: uuidSchema,
  direction: z.enum(['up', 'down']),
});

export const investigationForkSchema = z.object({
  investigationId: uuidSchema,
  authorName: safeString(100).optional(),
});

// ── Truth Engine schemas ──

export const truthEngineAnalyzeSchema = z.object({
  content: safeString(50000).refine((s) => s.length >= 10, 'Content must be at least 10 characters'),
  documentId: uuidSchema.optional().nullable(),
  existingEntities: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).optional(),
});

export const truthEngineEmbedSchema = z.object({
  texts: z.array(safeString(10000)).min(1).max(100),
});

// ── Node Stats schema ──

export const nodeStatsSchema = z.object({
  nodeIds: z.array(uuidSchema).min(1).max(50),
  annotations: z.record(z.string().max(100)).optional(),
});

// ── Helper: validate body with Zod and return typed result or error response ──

import { NextResponse } from 'next/server';

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation error', details: errors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
