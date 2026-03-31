/**
 * PROJECT TRUTH — Scoring Engine
 * ===============================
 *
 * 5-Layer Confidence Scoring + NATO Code Assignment + Hallucination Detection
 *
 * Usage:
 *   import { scoreEntity, scoreEntityBatch, verifyEntity, assignNATOCode } from '@/lib/scoring';
 */

// Core scoring
export {
  scoreEntity,
  scoreEntityBatch,
  getBandDistribution,
  getSupportedDocumentTypes,
  getDocumentTypeConfig,
  getScoringMetadata,
} from './confidenceCalculator';

export type {
  ScoringEntity,
  ScoringResult,
  LayerBreakdown,
  ConfidenceBand,
  ScoringAuditEntry,
  DocumentTypeConfig,
} from './confidenceCalculator';

// NATO code assignment
export {
  assignNATOCode,
  assignNATOCodeBatch,
} from './natoCodeAssigner';

export type {
  NATOAssignment,
  NATOReliability,
  NATOCredibility,
} from './natoCodeAssigner';

// Hallucination detection
export {
  verifyEntity,
  verifyEntityBatch,
  multiPassFilter,
} from './hallucination';

export type {
  VerificationResult,
  VerificationLayer,
  HalluGraphReport,
} from './hallucination';
