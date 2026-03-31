# Confidence Scoring Implementation Guide
## For Project Truth Engineering Team

**Date:** March 22, 2026
**Target:** 2-week implementation sprint
**Dependencies:** Existing quarantine system, evidence_archive table, external DB access (OpenSanctions, CourtListener)

---

## OVERVIEW

This guide provides step-by-step implementation of the 8-signal confidence scoring system to replace broken LLM self-rating.

**Current Problem:**
```
SELECT confidence_score FROM evidence_archive;
-- Result: 0.95, 0.92, 0.95, 0.94, 0.95, ... (NO VARIATION)
-- All entities treated as equally confident = no signal
```

**Target Solution:**
```
SELECT confidence_score FROM evidence_archive;
-- Result: 0.89, 0.35, 0.92, 0.18, 0.76, ... (CALIBRATED)
-- High-confidence sources = 0.80+, speculative = 0.20-0.40
```

---

## PHASE 1: DATA SCHEMA UPDATES (Day 1-2)

### 1.1 Add Document Source Type Column

```sql
-- If not already present
ALTER TABLE evidence_archive
ADD COLUMN source_document_type TEXT
  CHECK (source_document_type IN (
    'sworn_testimony',
    'plea_agreement',
    'court_order',
    'fbi_report',
    'government_filing',
    'credible_journalism',
    'academic_research',
    'leaked_document',
    'news_article',
    'interview_transcript',
    'social_media',
    'address_book',
    'email',
    'rumor',
    'unknown'
  ));

-- Backfill from existing document_type or infer from content
UPDATE evidence_archive
SET source_document_type = CASE
  WHEN document_title ILIKE '%deposition%' THEN 'sworn_testimony'
  WHEN document_title ILIKE '%plea%agreement%' THEN 'plea_agreement'
  WHEN document_title ILIKE '%indictment%' THEN 'court_order'
  WHEN document_title ILIKE '%fbi%report%' THEN 'fbi_report'
  ELSE 'unknown'
END
WHERE source_document_type IS NULL;
```

### 1.2 Add NATO Admiralty Grade Columns

```sql
ALTER TABLE evidence_archive
ADD COLUMN nato_source_reliability CHAR(1)
  CHECK (nato_source_reliability IN ('A', 'B', 'C', 'D', 'E', 'F', NULL)),
ADD COLUMN nato_information_credibility INT
  CHECK (nato_information_credibility IN (1, 2, 3, 4, 5, 6, NULL));

-- Seed data: Map existing fields to NATO grades
-- (Raşit: manual review of 100 entities to determine initial grades)
```

### 1.3 Add Signals for Composite Scoring

```sql
ALTER TABLE evidence_archive
ADD COLUMN mention_frequency INT DEFAULT 1,  -- how many chunks
ADD COLUMN external_db_match_count INT DEFAULT 0,  -- OpenSanctions, etc.
ADD COLUMN corroborating_source_count INT DEFAULT 0,  -- independent documents
ADD COLUMN first_mention_date TIMESTAMP,
ADD COLUMN last_mention_date TIMESTAMP,
ADD COLUMN temporal_consistency_score FLOAT DEFAULT 0.5,  -- 0-1
ADD COLUMN entity_type_likelihood_score FLOAT DEFAULT 0.5;  -- 0-1

-- Create INDEX for performance
CREATE INDEX idx_confidence_signals ON evidence_archive(
  mention_frequency,
  external_db_match_count,
  corroborating_source_count,
  nato_source_reliability
);
```

### 1.4 Replace Old Confidence Column

```sql
-- Old column may have been called "confidence_score" or "llm_confidence"
-- Rename it for archival
ALTER TABLE evidence_archive
RENAME COLUMN confidence_score TO llm_self_rated_confidence;

-- Add new column for composite score
ALTER TABLE evidence_archive
ADD COLUMN composite_confidence_score FLOAT DEFAULT NULL;

-- Mark which scoring method was used
ALTER TABLE evidence_archive
ADD COLUMN confidence_calculation_method TEXT
  CHECK (confidence_calculation_method IN ('llm_self_rated', 'post_hoc_composite', 'ensemble_agreement', 'conformal_prediction'));
```

---

## PHASE 2: CORE SCORING LIBRARY (Day 3-4)

### 2.1 Create TypeScript Module

**File:** `src/lib/confidenceScoring.ts`

```typescript
import { Database } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentSource {
  type: 'sworn_testimony' | 'plea_agreement' | 'court_order' | 'fbi_report' |
         'government_filing' | 'credible_journalism' | 'academic_research' |
         'leaked_document' | 'news_article' | 'interview_transcript' |
         'social_media' | 'address_book' | 'email' | 'rumor' | 'unknown';
  title: string;
  date: Date;
  nato_source_reliability?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export interface ExtractedEntity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event';
  source_quote: string;
  source_document: DocumentSource;
  chunk_count: number;
  external_db_matches: string[];
  corroborating_source_count: number;
  first_mention_date: Date;
  last_mention_date: Date;
}

export interface ConfidenceSignals {
  documentSourceScore: number;
  admiraltyScore: number;
  mentionFrequencyScore: number;
  crossReferenceScore: number;
  corroborationScore: number;
  temporalScore: number;
  entityTypeLikelihoodScore: number;
  compositeConfidence: number;
}

export interface ConfidenceBreakdown {
  entity_id: string;
  signals: ConfidenceSignals;
  weights: Record<string, number>;
  final_score: number;
  nato_grade: string;
  explanation: string;
}

// ============================================================================
// SIGNAL 1: DOCUMENT SOURCE TYPE
// ============================================================================

const DOCUMENT_SOURCE_SCORES: Record<string, number> = {
  'sworn_testimony': 0.95,
  'plea_agreement': 0.93,
  'court_order': 0.92,
  'fbi_report': 0.85,
  'government_filing': 0.80,
  'credible_journalism': 0.65,
  'academic_research': 0.70,
  'leaked_document': 0.60,
  'news_article': 0.55,
  'interview_transcript': 0.50,
  'social_media': 0.30,
  'address_book': 0.25,
  'email': 0.40,
  'rumor': 0.15,
  'unknown': 0.10,
};

function getDocumentSourceScore(docType: string): number {
  return DOCUMENT_SOURCE_SCORES[docType] || 0.10;
}

// ============================================================================
// SIGNALS 2 & 3: NATO ADMIRALTY CODE
// ============================================================================

const NATO_ADMIRALTY_MATRIX: Record<string, Record<string, number>> = {
  'A': { '1': 0.95, '2': 0.93, '3': 0.90, '4': 0.70, '5': 0.40, '6': 0.30 },
  'B': { '1': 0.88, '2': 0.85, '3': 0.80, '4': 0.60, '5': 0.35, '6': 0.25 },
  'C': { '1': 0.80, '2': 0.75, '3': 0.70, '4': 0.50, '5': 0.30, '6': 0.20 },
  'D': { '1': 0.70, '2': 0.60, '3': 0.50, '4': 0.35, '5': 0.20, '6': 0.15 },
  'E': { '1': 0.45, '2': 0.35, '3': 0.25, '4': 0.15, '5': 0.10, '6': 0.05 },
  'F': { '1': 0.30, '2': 0.25, '3': 0.20, '4': 0.15, '5': 0.10, '6': 0.05 },
};

function getMilitaryAdmiraltyScore(sourceGrade: string, infoGrade: string | number): number {
  const infoGradeStr = String(infoGrade);
  return NATO_ADMIRALTY_MATRIX[sourceGrade]?.[infoGradeStr] || 0.10;
}

function getInformationCredibilityGrade(entity: ExtractedEntity): string {
  if (entity.corroborating_source_count >= 3) return '1';
  if (entity.corroborating_source_count >= 1 && entity.external_db_matches.length > 0) return '2';
  if (entity.chunk_count >= 2) return '3';
  if (!isTemporallyConsistent(entity)) return '4';
  if (isLogicallyImpossible(entity)) return '5';
  return '6';
}

// ============================================================================
// SIGNAL 4: MENTION FREQUENCY
// ============================================================================

function getMentionFrequencyScore(chunkCount: number): number {
  // Appears 10+ times = high confidence
  // Appears 1 time = low confidence
  return Math.min(chunkCount / 10, 1.0);
}

// ============================================================================
// SIGNAL 5: CROSS-REFERENCE VALIDATION
// ============================================================================

function getCrossReferenceScore(externalDbMatches: string[]): number {
  // One match = 0.70 confidence boost
  // More than one = 0.70 (additional matches don't compound)
  return externalDbMatches.length > 0 ? 0.70 : 0.0;
}

// ============================================================================
// SIGNAL 6: CORROBORATION
// ============================================================================

function getCorroborationScore(corroboratingSourceCount: number): number {
  // 3+ independent sources = max confidence
  // 1-2 sources = partial
  // 0 sources = no boost
  return Math.min(corroboratingSourceCount / 3, 1.0);
}

// ============================================================================
// SIGNAL 7: TEMPORAL CONSISTENCY
// ============================================================================

function isTemporallyConsistent(entity: ExtractedEntity): boolean {
  // Check if dates make logical sense
  // (e.g., not mentioning dead person as alive later)
  // Implement with domain knowledge
  return true; // placeholder
}

function isLogicallyImpossible(entity: ExtractedEntity): boolean {
  // Check for impossible scenarios
  // (e.g., person couldn't have done action if deceased)
  return false; // placeholder
}

function getTemporalConsistencyScore(entity: ExtractedEntity): number {
  const daysSinceFirstMention =
    (new Date().getTime() - new Date(entity.first_mention_date).getTime()) /
    (1000 * 60 * 60 * 24);

  // Recent mentions = higher confidence (not yet contradicted)
  const temporalDecay = Math.exp(-daysSinceFirstMention / (365 * 10)); // 10-year half-life

  // Date span consistency
  const daysSpan =
    (new Date(entity.last_mention_date).getTime() -
     new Date(entity.first_mention_date).getTime()) /
    (1000 * 60 * 60 * 24);

  const consistencyScore = 1.0 / (1.0 + daysSpan / 365);

  return (consistencyScore + temporalDecay) / 2;
}

// ============================================================================
// SIGNAL 8: ENTITY TYPE LIKELIHOOD
// ============================================================================

function getEntityTypeLikelihoodScore(type: string, name: string): number {
  if (type === 'person') {
    const isProperlyCapitalized = /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name);
    const notInitialsOnly = !/^[A-Z]\.\s*[A-Z]\./.test(name);
    return (isProperlyCapitalized && notInitialsOnly) ? 0.8 : 0.4;
  }

  if (type === 'organization') {
    const hasLLC = /LLC|Inc|Corp|Foundation|Ltd/.test(name);
    return hasLLC ? 0.9 : 0.6;
  }

  if (type === 'location') {
    // Would check against known cities
    return 0.7;
  }

  if (type === 'event') {
    return 0.7;
  }

  return 0.5;
}

// ============================================================================
// MAIN CALCULATION: COMPOSITE CONFIDENCE
// ============================================================================

export function calculateCompositeConfidence(entity: ExtractedEntity): ConfidenceSignals {
  const documentSourceScore = getDocumentSourceScore(entity.source_document.type);
  const infoGrade = getInformationCredibilityGrade(entity);
  const sourceGrade = entity.source_document.nato_source_reliability || 'F';
  const admiraltyScore = getMilitaryAdmiraltyScore(sourceGrade, infoGrade);
  const mentionFrequencyScore = getMentionFrequencyScore(entity.chunk_count);
  const crossReferenceScore = getCrossReferenceScore(entity.external_db_matches);
  const corroborationScore = getCorroborationScore(entity.corroborating_source_count);
  const temporalScore = getTemporalConsistencyScore(entity);
  const entityTypeScore = getEntityTypeLikelihoodScore(entity.type, entity.name);

  // Weights (sum = 1.0)
  const weights = {
    documentSource: 0.30,
    admiralty: 0.25,
    mentionFrequency: 0.15,
    crossReference: 0.10,
    corroboration: 0.10,
    temporal: 0.05,
    entityType: 0.05,
  };

  const compositeConfidence =
    documentSourceScore * weights.documentSource +
    admiraltyScore * weights.admiralty +
    mentionFrequencyScore * weights.mentionFrequency +
    crossReferenceScore * weights.crossReference +
    corroborationScore * weights.corroboration +
    temporalScore * weights.temporal +
    entityTypeScore * weights.entityType;

  return {
    documentSourceScore,
    admiraltyScore,
    mentionFrequencyScore,
    crossReferenceScore,
    corroborationScore,
    temporalScore,
    entityTypeLikelihoodScore: entityTypeScore,
    compositeConfidence: Math.max(0, Math.min(compositeConfidence, 1.0)),
  };
}

// ============================================================================
// QUARANTINE STATUS DETERMINATION
// ============================================================================

export enum QuarantineStatus {
  AUTO_APPROVED = 'auto_approved',
  PEER_REVIEW = 'peer_review',
  FLAGGED_FOR_EXPERT = 'flagged_for_expert',
  SPECULATIVE_HOLD = 'speculative_hold',
}

export function determineQuarantineStatus(
  entity: ExtractedEntity,
  confidence: number
): QuarantineStatus {
  if (confidence >= 0.90) {
    // Auto-approve if sworn testimony + corroborated + external DB match
    if (entity.source_document.type === 'sworn_testimony' &&
        entity.corroborating_source_count > 0 &&
        entity.external_db_matches.length > 0) {
      return QuarantineStatus.AUTO_APPROVED;
    }
  }

  if (confidence >= 0.70) {
    return QuarantineStatus.PEER_REVIEW;
  }

  if (confidence >= 0.50) {
    return QuarantineStatus.FLAGGED_FOR_EXPERT;
  }

  return QuarantineStatus.SPECULATIVE_HOLD;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

export async function updateEntityConfidence(
  db: Database,
  entityId: string,
  entity: ExtractedEntity
): Promise<void> {
  const signals = calculateCompositeConfidence(entity);
  const status = determineQuarantineStatus(entity, signals.compositeConfidence);

  await db
    .from('evidence_archive')
    .update({
      composite_confidence_score: signals.compositeConfidence,
      confidence_calculation_method: 'post_hoc_composite',
      quarantine_status: status,
    })
    .eq('id', entityId);
}

export async function bulkUpdateEntityConfidences(
  db: Database,
  entities: Array<{ id: string; entity: ExtractedEntity }>
): Promise<void> {
  const updates = entities.map(({ id, entity }) => {
    const signals = calculateCompositeConfidence(entity);
    return {
      id,
      composite_confidence_score: signals.compositeConfidence,
      confidence_calculation_method: 'post_hoc_composite',
    };
  });

  // Batch update (50 at a time to avoid timeout)
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    await db.from('evidence_archive').upsert(batch);
  }
}

// ============================================================================
// HUMAN-READABLE EXPLANATION
// ============================================================================

export function getConfidenceExplanation(signals: ConfidenceSignals): string {
  const high = signals.compositeConfidence > 0.80;
  const medium = signals.compositeConfidence > 0.60;

  if (high) {
    return `High confidence (${(signals.compositeConfidence * 100).toFixed(0)}%) based on ` +
           `strong document source + NATO-grade confirmation + multiple mentions + external validation.`;
  } else if (medium) {
    return `Moderate confidence (${(signals.compositeConfidence * 100).toFixed(0)}%) — ` +
           `credible source but limited corroboration. Recommend peer review.`;
  } else {
    return `Low confidence (${(signals.compositeConfidence * 100).toFixed(0)}%) — ` +
           `speculative mention. Requires expert review before network inclusion.`;
  }
}
```

---

## PHASE 3: INTEGRATION WITH QUARANTINE (Day 5-6)

### 3.1 Update Quarantine Route

**File:** `src/app/api/quarantine/route.ts`

```typescript
import { calculateCompositeConfidence, determineQuarantineStatus } from '@/lib/confidenceScoring';
import { Database } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { entity_id, entity_data } = await request.json();

  const db = createSupabaseClient();

  // Calculate composite confidence
  const signals = calculateCompositeConfidence(entity_data);
  const status = determineQuarantineStatus(entity_data, signals.compositeConfidence);

  // Determine if auto-approval
  const shouldAutoApprove =
    status === 'AUTO_APPROVED' &&
    entity_data.source_document.type === 'sworn_testimony' &&
    signals.compositeConfidence > 0.90;

  await db
    .from('data_quarantine')
    .insert({
      entity_id,
      entity_data,
      composite_confidence_score: signals.compositeConfidence,
      quarantine_status: shouldAutoApprove ? 'verified' : 'pending_review',
      nato_grade: `${entity_data.source_document.nato_source_reliability}${getInformationCredibilityGrade(entity_data)}`,
      created_at: new Date().toISOString(),
    });

  return Response.json({
    success: true,
    confidence: signals.compositeConfidence,
    status,
    auto_approved: shouldAutoApprove,
  });
}
```

### 3.2 Update Quarantine Review Panel

**File:** `src/components/QuarantineReviewPanel.tsx`

```typescript
import { ConfidenceBreakdown } from '@/lib/confidenceScoring';

interface QuarantineCardProps {
  entity: ExtractedEntity;
  confidence: ConfidenceBreakdown;
}

export function QuarantineCard({ entity, confidence }: QuarantineCardProps) {
  const statusColor = confidence.final_score > 0.80 ? 'green' :
                      confidence.final_score > 0.60 ? 'yellow' :
                      'red';

  return (
    <div className={`border-l-4 border-${statusColor}-500 p-4`}>
      <h3>{entity.name}</h3>

      <div className="mt-4">
        <div className="text-sm">
          <h4>Confidence: {(confidence.final_score * 100).toFixed(0)}% ({confidence.nato_grade})</h4>

          <div className="mt-2 space-y-1 text-xs">
            <div>Document Source: {(confidence.signals.documentSourceScore * 100).toFixed(0)}%</div>
            <div>NATO Grade: {(confidence.signals.admiraltyScore * 100).toFixed(0)}%</div>
            <div>Mention Frequency: {(confidence.signals.mentionFrequencyScore * 100).toFixed(0)}%</div>
            <div>Cross-Reference: {(confidence.signals.crossReferenceScore * 100).toFixed(0)}%</div>
            <div>Corroboration: {(confidence.signals.corroborationScore * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">{confidence.explanation}</p>

      <div className="mt-4 flex gap-2">
        {confidence.final_score > 0.90 && (
          <button className="bg-green-600 text-white px-3 py-1 rounded text-xs">
            Auto-Approved
          </button>
        )}
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">
          Review & Approve
        </button>
        <button className="bg-red-600 text-white px-3 py-1 rounded text-xs">
          Reject
        </button>
      </div>
    </div>
  );
}
```

---

## PHASE 4: VISUALIZATION UPDATES (Day 7-8)

### 4.1 Node Visualization

**File:** `src/components/Truth3DScene.tsx`

```typescript
function getNodeMaterial(confidence: number) {
  // Size scales with confidence
  const scale = Math.pow(Math.max(confidence, 0.1), 0.5) * 1.5;

  // Glow color: red if confident, gray if uncertain
  const emissive = confidence > 0.7 ? 0xff0000 : 0x333333;

  // Opacity scales with confidence
  const opacity = Math.max(confidence, 0.3);

  return {
    scale,
    emissive,
    opacity,
    borderStyle: confidence > 0.7 ? 'solid' :
                 confidence > 0.5 ? 'dashed' : 'dotted',
  };
}

function renderNode(node: Node3D, confidence: number) {
  const material = getNodeMaterial(confidence);

  mesh.scale.set(material.scale, material.scale, material.scale);
  mesh.material.emissive.setHex(material.emissive);
  mesh.material.opacity = material.opacity;
  // Apply border style via shader
}
```

### 4.2 Link Visualization

```typescript
function getLinkVisualization(link: Link, confidence: number) {
  return {
    linewidth: Math.max(0.5, confidence * 3),
    dashArray: confidence > 0.7 ? [] :
               confidence > 0.5 ? [10, 5] : [3, 3],
    color: confidence > 0.7 ? '#ff0000' :
           confidence > 0.5 ? '#ff8800' :
           confidence > 0.3 ? '#ffff00' : '#888888',
    pulseFrequency: Math.max(0, confidence * 3),
  };
}
```

---

## PHASE 5: TESTING & VALIDATION (Day 9-10)

### 5.1 Unit Tests

**File:** `src/lib/__tests__/confidenceScoring.test.ts`

```typescript
import { calculateCompositeConfidence } from '@/lib/confidenceScoring';

describe('Confidence Scoring', () => {
  it('should score sworn testimony high', () => {
    const entity = {
      // sworn testimony, corroborated, external DB match
      source_document: { type: 'sworn_testimony' },
      chunk_count: 5,
      corroborating_source_count: 2,
      external_db_matches: ['opensanctions'],
    };

    const signals = calculateCompositeConfidence(entity as any);
    expect(signals.compositeConfidence).toBeGreaterThan(0.85);
  });

  it('should score address book mention low', () => {
    const entity = {
      source_document: { type: 'address_book' },
      chunk_count: 1,
      corroborating_source_count: 0,
      external_db_matches: [],
    };

    const signals = calculateCompositeConfidence(entity as any);
    expect(signals.compositeConfidence).toBeLessThan(0.35);
  });
});
```

### 5.2 Integration Tests

```typescript
describe('Integration with Quarantine', () => {
  it('should auto-approve high-confidence sworn testimony', () => {
    const confidence = 0.92;
    const status = determineQuarantineStatus(entity, confidence);
    expect(status).toBe('AUTO_APPROVED');
  });

  it('should flag low-confidence for expert review', () => {
    const confidence = 0.35;
    const status = determineQuarantineStatus(entity, confidence);
    expect(status).toBe('FLAGGED_FOR_EXPERT');
  });
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] Run database migrations (schema updates)
- [ ] Deploy confidenceScoring.ts library
- [ ] Update quarantine route with new logic
- [ ] Update 3D visualization (node/link rendering)
- [ ] Backfill confidence scores for existing entities (bulk operation)
- [ ] Update UI components (quarantine cards, hover tooltips)
- [ ] Run unit tests (target: 95%+ pass rate)
- [ ] Integration tests on staging
- [ ] Manual testing on 5 real networks
- [ ] Update documentation
- [ ] Deploy to production

---

## ROLLBACK PROCEDURE

If issues arise:

```sql
-- Revert to LLM self-rated confidence
UPDATE evidence_archive
SET composite_confidence_score = llm_self_rated_confidence,
    confidence_calculation_method = 'llm_self_rated'
WHERE confidence_calculation_method = 'post_hoc_composite';

-- Restore quarantine statuses
UPDATE data_quarantine
SET quarantine_status = 'pending_review'
WHERE quarantine_status = 'auto_approved';
```

---

## PERFORMANCE EXPECTATIONS

**Computation Time:**
- Single entity: ~5ms (8 signal calculations)
- Batch of 1000: ~5 seconds (can parallelize)
- Database write: ~50ms per 50 entities

**Storage Impact:**
- 4 new FLOAT columns: +32 bytes per row
- 1000 entities = ~32KB additional storage

**Query Performance:**
- Index on (mention_frequency, nato_source_reliability): <10ms
- Full scan with new columns: <100ms for 10K entities

---

## NEXT STEPS (For Raşit)

1. **Approve this plan** — Schedule 15min review with engineering
2. **Assign Phase owners:**
   - Phase 1-2: Backend engineer (database + TypeScript library)
   - Phase 3-4: Full-stack engineer (quarantine + 3D viz integration)
   - Phase 5: QA engineer (testing)
3. **Set weekly milestones** — Should ship in 2-3 weeks
4. **Communicate with users** — "Confidence scores are now meaningful; here's why"

---

**Report Status:** IMPLEMENTATION READY
**Questions?** Contact engineering team

