# Learning Prompt System: Exhaustive Research & Architecture
## A Self-Evolving AI Prompt Framework for Project Truth (Document Analysis Platform)

**Research Date:** March 23, 2026
**Classification:** Core Architecture Research
**Scope:** 10 Research Areas, 50+ Academic Citations, Complete Production Architecture
**Target System:** Project Truth — Investigative Document Analysis & Entity Extraction Platform

---

## EXECUTIVE SUMMARY

A **Learning Prompt System** is a fundamentally different approach to AI improvement: instead of fine-tuning the underlying model, we train the **prompt itself** using human feedback from the quarantine system. Every time a user approves or rejects an extracted entity, that feedback enriches the prompt for future document scans.

This approach offers Project Truth three critical advantages:
1. **No model retraining:** Uses Groq API (llama-3.3-70b) without modification
2. **Rapid improvement:** System learns within minutes of each feedback cycle
3. **Transparency:** Every prompt change is versioned, auditable, and community-reviewable

This research synthesizes 10 scientific domains, proposes a production architecture, and provides implementation roadmaps.

---

## TABLE OF CONTENTS

1. [Area 1: Few-Shot Learning from Approved Entities](#area-1-few-shot-learning)
2. [Area 2: Rejection Pattern Mining](#area-2-rejection-pattern-mining)
3. [Area 3: Retrieval-Augmented Prompting](#area-3-retrieval-augmented-prompting)
4. [Area 4: Prompt Versioning & A/B Testing](#area-4-prompt-versioning)
5. [Area 5: Confidence Scoring Without Training](#area-5-confidence-scoring)
6. [Area 6: Knowledge Graph as Memory](#area-6-knowledge-graph-memory)
7. [Area 7: Community-Driven Prompt Evolution](#area-7-community-evolution)
8. [Area 8: Production Architecture](#area-8-production-architecture)
9. [Area 9: State of the Art](#area-9-state-of-art)
10. [Area 10: Ethical Framework](#area-10-ethical-framework)
11. [Complete System Architecture](#complete-system-architecture)
12. [Implementation Roadmap](#implementation-roadmap)

---

## AREA 1: FEW-SHOT LEARNING FROM APPROVED ENTITIES

### State of the Art Research

**Few-Shot Example Selection Metrics**

The most critical research finding: selecting the **right** few-shot examples matters more than the number of examples. [Designing Informative Metrics for Few-Shot Example Selection (arXiv 2403.03861)](https://arxiv.org/html/2403.03861v3) demonstrates that complexity-based example retrieval (CP retrieval) significantly outperforms random selection.

Key metrics used in production systems:
- **Normalized sentence similarity score** (semantic match with test document)
- **Normalized length similarity** (document length balance)
- **Label entropy** (diversity of extracted entity types)

**Optimal Number of Examples: The Few-Shot Dilemma**

Recent research reveals a critical finding often missed in tutorials: there exists a **model-specific optimal number** of few-shot examples, after which performance **collapses**. [The Few-shot Dilemma: Over-prompting Large Language Models (arXiv 2509.13196)](https://arxiv.org/html/2509.13196v1) tested this across 7 major models (GPT-4o, GPT-3.5, DeepSeek-V3, Gemma, LLaMA 3.1/3.2, Mistral):

- **2 examples:** Foundation, often sufficient
- **3-5 examples:** Sweet spot for most tasks (70-80% of benefit)
- **6-8 examples:** Diminishing returns appear
- **8+ examples:** Risk of over-prompting, accuracy collapse (25-35% drop observed)

**Diversity-Based Selection**

[Information Extraction in Low-Resource Scenarios (arXiv 2202.08063)](https://arxiv.org/html/2202.08063v5) emphasizes that diversity matters more than similarity:
- Don't select 5 examples of "person extraction" — select 3 persons, 1 organization, 1 location
- Maximize **representativeness** across entity types and document contexts
- Use **active learning strategies** that identify informativeness, representativeness, and learnability

### Implementation for Project Truth

**Few-Shot Pool Construction**

```typescript
// From quarantine_reviews table, select approved entities
interface ApprovedEntity {
  entity_id: string;
  document_id: string;
  extracted_text: string;
  entity_type: string;
  document_type: string;
  context_window: string; // 100 chars before + 100 after
  approval_date: Date;
  approver_tier: number; // tier 1-3
  confidence_score: number; // post-hoc calibrated
}

// Diversity sampling algorithm
async function selectDiverseFewShotExamples(
  candidatePool: ApprovedEntity[],
  targetCount: number = 4
): Promise<ApprovedEntity[]> {

  // Step 1: Cluster by entity type
  const entityTypeClusters = groupBy(candidatePool, e => e.entity_type);

  // Step 2: For each type, select most semantically diverse
  const selectedByType: ApprovedEntity[] = [];
  for (const [type, entities] of Object.entries(entityTypeClusters)) {
    const count = Math.ceil(targetCount / Object.keys(entityTypeClusters).length);

    // Use vector similarity to select diverse subset
    const embeddings = await embedBatch(entities.map(e => e.context_window));
    const diverse = greedyMaximalMarginalRelevance(embeddings, count, diversity_weight=0.3);
    selectedByType.push(...diverse);
  }

  // Step 3: Sort by approval recency + approver tier
  return selectedByType
    .sort((a, b) =>
      (b.approver_tier - a.approver_tier) ||
      (b.approval_date.getTime() - a.approval_date.getTime())
    )
    .slice(0, targetCount);
}
```

**Dynamic Few-Shot Injection**

Instead of static examples in the system prompt, inject the 4 best examples dynamically for each scan:

```typescript
async function buildDynamicPrompt(
  documentId: string,
  previousHighlights?: string[] // context from last query
): Promise<string> {

  // Fetch 4 most relevant approved examples
  const fewShotExamples = await selectDiverseFewShotExamples(
    approvedEntityPool,
    targetCount: 4
  );

  const exampleText = fewShotExamples.map(e => `
Example:
Document Type: ${e.document_type}
Context: "${e.context_window}"
Extracted: ${e.extracted_text}
Type: ${e.entity_type}
`).join('\n---\n');

  return `
You are an investigative document analysis AI for Project Truth.
Extract entities (people, organizations, dates, financial amounts) from legal/investigative documents.

${exampleText}

CURRENT DOCUMENT:
[document content here]

Extract entities matching the patterns above.
  `;
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Few-shot pool contaminated with errors | Tier-weight selection (Tier 2+ counts 2x) + require 2 approvals for official examples |
| Over-fitting to recent feedback | Maintain historical diversity (sample from all time periods, weight recent 60%) |
| Example explosion (>8 examples) | Enforce hard cap at 4, monitor accuracy drop at boundaries |

---

## AREA 2: REJECTION PATTERN MINING

### State of the Art Research

**Learning from Negative Examples**

Revolutionary finding: [Failures Are the Stepping Stones to Success (arXiv 2507.23211)](https://arxiv.org/html/2507.23211) demonstrates that **negative examples** (rejected extractions) contain as much information as positive ones — if properly categorized.

Key insight: Negative prompting (e.g., "DON'T extract X") often fails, but **negative examples with categories** work well:
- "This was rejected because it's too generic (John Smith appears in 100+ documents)"
- "This was rejected because it's a hallucination (no source text for this)"
- "This was rejected because it's a type error (appears to be a document, not a person)"

**Error Pattern Classification**

[Machine Learning with a Reject Option: A Survey (arXiv 2107.11277)](https://arxiv.org/html/2107.11277v3) identifies three rejection types:

1. **Ambiguity Rejection** — Entity is real but context is unclear
2. **Distance Rejection** — Entity is outside known distribution (outlier)
3. **Confidence Rejection** — Model confidence is below threshold

[A Quick Guide to Error Analysis (Analytics Vidhya)](https://www.analyticsvidhya.com/blog/2021/08/a-quick-guide-to-error-analysis-error-analysis-machine-learning/) shows systematic error analysis:
- Group errors by category (hallucination, type error, boundary error, duplicate)
- Identify patterns (e.g., "all hallucinations involve proper nouns + dates")
- Convert patterns into exclusion rules

### Implementation for Project Truth

**Rejection Reason Taxonomy**

```typescript
enum RejectionReason {
  // Hallucination (entity has no source text)
  HALLUCINATED = "hallucinated",

  // Entity type mismatch (extracted as person, is organization)
  TYPE_ERROR = "type_error",

  // Entity is too generic (John Smith, USA, 2024)
  TOO_GENERIC = "too_generic",

  // Entity is duplicate of another (same person, different spelling)
  DUPLICATE = "duplicate",

  // Boundary error (partial entity extraction)
  BOUNDARY_ERROR = "boundary_error",

  // Cross-document contamination (entity from different case)
  CROSS_DOCUMENT = "cross_document",

  // PII sensitivity (shouldn't extract this type)
  PII_VIOLATION = "pii_violation",

  // Ambiguous context
  AMBIGUOUS = "ambiguous",
}
```

**Rejection Pattern Mining Pipeline**

```typescript
interface RejectionPattern {
  reason: RejectionReason;
  trigger_keywords: string[]; // e.g., ["January", "of"] for date hallucinations
  entity_type: string;
  frequency: number;
  confidence: number;
}

async function mineRejectionPatterns(): Promise<RejectionPattern[]> {

  // Fetch all rejected entities from quarantine
  const rejected = await db
    .from('data_quarantine')
    .select('extracted_entity, rejection_reason, entity_type, document_context')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1000);

  // Group by rejection reason
  const byReason = groupBy(rejected, r => r.rejection_reason);

  const patterns: RejectionPattern[] = [];

  for (const [reason, entities] of Object.entries(byReason)) {
    // Extract common tokens from rejected entities
    const tokenCounts: Map<string, number> = new Map();

    for (const entity of entities) {
      const tokens = entity.extracted_entity
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 2);

      tokens.forEach(token => {
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
      });
    }

    // Find tokens that appear in >20% of rejections
    const threshold = entities.length * 0.2;
    const triggerKeywords = Array.from(tokenCounts.entries())
      .filter(([_, count]) => count > threshold)
      .map(([token, _]) => token);

    if (triggerKeywords.length > 0) {
      patterns.push({
        reason,
        trigger_keywords: triggerKeywords,
        entity_type: entities[0].entity_type,
        frequency: entities.length,
        confidence: Math.min(0.9, entities.length / 100),
      });
    }
  }

  return patterns;
}
```

**Convert Patterns to Negative Instructions**

```typescript
function buildNegativeInstructions(patterns: RejectionPattern[]): string {
  return patterns
    .filter(p => p.confidence > 0.7)
    .map(p => {
      const keywords = p.trigger_keywords.join(", ");

      switch (p.reason) {
        case RejectionReason.HALLUCINATED:
          return `DO NOT extract entities with these patterns if they don't appear verbatim in source: ${keywords}`;

        case RejectionReason.TOO_GENERIC:
          return `DO NOT extract overly generic entities: ${keywords}. These appear too frequently to be meaningful.`;

        case RejectionReason.DUPLICATE:
          return `If you extract "${p.trigger_keywords[0]}", check against known entities list before returning.`;

        case RejectionReason.TYPE_ERROR:
          return `${p.entity_type} entities should NOT contain: ${keywords}`;

        default:
          return `[PATTERN: ${p.reason}] Avoid extracting: ${keywords}`;
      }
    })
    .join('\n');
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Negative instructions confuse model | Frame as "positive exclusions" + include positive counter-example |
| Patterns overfit to recent rejections | Only mine patterns with 20+ examples + recalibrate weekly |
| Rejection reasons are themselves wrong | Require peer-review (2nd opinion) on rejection classification |

---

## AREA 3: RETRIEVAL-AUGMENTED PROMPTING

### State of the Art Research

**RAG for Entity Extraction**

[Retrieval-Augmented Generation-based Relation Extraction (arXiv 2404.13397)](https://arxiv.org/html/2404.13397v1) shows that injecting relevant context from past documents dramatically improves extraction:
- Baseline entity extraction: F1 = 0.72
- RAG-augmented extraction: F1 = 0.89 (23% improvement)

[Clinical Entity Augmented Retrieval (Nature npj Digital Medicine)](https://www.nature.com/articles/s41746-024-01377-1) demonstrates in production clinical extraction:
- Retrieves note chunks containing similar entities
- Average F1: 0.90 across clinical variables
- Inference time: 4.95 seconds per note (acceptable)

**Semantic Similarity for Document Retrieval**

The key to RAG effectiveness is retrieving documents **similar in structure and content** to the current one. Using pgvector in Supabase:

[pgvector: Embeddings and Vector Similarity (Supabase Docs)](https://supabase.com/docs/guides/database/extensions/pgvector) shows:
- Store document embeddings (384-1536 dimensions depending on model)
- Query with cosine distance: `<=>` operator
- Filter by document type first, then similarity
- Typical query: <100ms with proper indexing

### Implementation for Project Truth

**Document Similarity Pool**

```typescript
// Each scanned document gets an embedding
interface DocumentEmbedding {
  document_id: string;
  document_type: string; // "court_record", "deposition", "financial", etc.
  embedding: number[]; // 768 dimensions (using Sentence Transformers)
  scan_count: number; // how many times extracted from this doc
  approved_entity_count: number;
  avg_confidence: number;
  created_at: Date;
}

// Store in Supabase with pgvector
async function storeDocumentEmbedding(
  documentId: string,
  documentType: string,
  content: string
): Promise<void> {

  // Generate embedding
  const embedding = await embedText(content);

  await db
    .from('document_embeddings')
    .upsert({
      document_id: documentId,
      document_type: documentType,
      embedding: embedding,
      created_at: new Date(),
    });
}
```

**RAG-Augmented Extraction Prompt**

```typescript
async function buildRAGAugmentedPrompt(
  documentContent: string,
  documentType: string,
  documentId: string
): Promise<string> {

  // Generate embedding of current document
  const currentEmbedding = await embedText(documentContent);

  // Find 3 most similar previously-scanned documents
  const similarDocs = await db.rpc('get_similar_documents', {
    embedding: currentEmbedding,
    doc_type: documentType,
    limit: 3,
  });

  // Fetch approved entities from similar documents
  const contextExamples: string[] = [];
  for (const doc of similarDocs) {
    const entities = await db
      .from('quarantine_reviews')
      .select('extracted_entity, entity_type, entity_source')
      .eq('document_id', doc.document_id)
      .eq('status', 'verified')
      .order('approval_count', { ascending: false })
      .limit(5);

    if (entities.length > 0) {
      contextExamples.push(`
From similar document ${doc.document_id}:
${entities.map(e => `- ${e.extracted_text} (${e.entity_type})`).join('\n')}
      `);
    }
  }

  return `
You are extracting entities from an investigative document of type: ${documentType}

Here are entities from 3 similar previously-scanned documents:
${contextExamples.join('\n---\n')}

CURRENT DOCUMENT:
${documentContent}

Extract entities in the same format and categories as shown above.
  `;
}
```

**pgvector SQL Helper**

```sql
-- Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for document embeddings
CREATE TABLE document_embeddings (
  document_id UUID PRIMARY KEY,
  document_type TEXT NOT NULL,
  embedding vector(768),
  scan_count INT DEFAULT 0,
  approved_entity_count INT DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- IVFFLAT index for fast similarity search
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC function for similarity search
CREATE OR REPLACE FUNCTION get_similar_documents(
  embedding vector(768),
  doc_type TEXT,
  limit INT = 3
)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.document_id,
    de.document_type,
    (1 - (de.embedding <=> embedding))::NUMERIC AS similarity_score
  FROM document_embeddings de
  WHERE de.document_type = doc_type
  ORDER BY de.embedding <=> embedding
  LIMIT limit;
END;
$$ LANGUAGE plpgsql;
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| RAG retrieves low-quality documents | Filter by `approved_entity_count > 10` + avg_confidence > 0.7 |
| Context injection increases token cost | Limit to 3 documents max + cache embeddings (Groq caching) |
| Documents drift over time | Periodically re-embed (monthly) + use Sentence Transformers for stability |

---

## AREA 4: PROMPT VERSIONING & A/B TESTING

### State of the Art Research

**DSPy Framework for Automated Optimization**

[Systematic LLM Prompt Engineering Using DSPy Optimization (Towards Data Science)](https://towardsdatascience.com/systematic-llm-prompt-engineering-using-dspy-optimization/) shows that systematic prompt optimization beats manual tinkering:
- COPRO optimizer: generates and refines instructions with coordinate ascent
- MIPROv2: generates instructions + few-shot examples, uses Bayesian optimization
- Typical improvement: 15-25% F1 score increase

[DSPy GitHub](https://github.com/stanfordnlp/dspy) demonstrates production systems that abstract prompts as modular Python code:
- Define task signature (input/output schema)
- Select optimization strategy
- Let optimizer iterate on instructions and examples

**PromptBreeder: Self-Referential Evolution**

[PromptBreeder: Self-Referential Self-Improvement (arXiv 2309.16797)](https://arxiv.org/abs/2309.16797) proposes evolving the mutations themselves:
- Population of task-prompts (initial: 20-50 variations)
- Mutation-prompts that modify task-prompts (evolved alongside)
- Hyper-mutation-prompts that modify mutation-prompts (meta-level)
- Result: prompts that beat Chain-of-Thought and Plan-and-Solve

### Implementation for Project Truth

**Prompt Version Storage**

```typescript
interface PromptVersion {
  version_id: string; // semantic: "1.2.3"
  created_at: Date;
  created_by_user_id: string;
  prompt_components: {
    system_instruction: string;
    few_shot_examples: ApprovedEntity[];
    negative_instructions: string;
    rag_context_count: number;
  };

  // Performance metrics
  metrics: {
    avg_extraction_f1: number;
    approved_count: number;
    rejected_count: number;
    avg_confidence_score: number;
    user_satisfaction: number; // 1-5 rating
  };

  // A/B test assignment
  ab_test_id?: string;
  ab_test_variant: 'control' | 'treatment';

  // Change log
  change_summary: string;
  change_reason: string; // "Fixed hallucination pattern", "Improved biomedical extraction", etc.
}

// Store in Supabase
await db
  .from('prompt_versions')
  .insert({
    version_id: '1.2.3',
    created_at: new Date(),
    created_by_user_id: userId,
    prompt_components: {
      system_instruction: '...',
      few_shot_examples: examples,
      negative_instructions: '...',
      rag_context_count: 3,
    },
    change_summary: 'Added 2 new rejection patterns for hallucination detection',
    change_reason: 'Response to 47 rejections last week',
  });
```

**A/B Testing Framework**

```typescript
interface ABTestAssignment {
  test_id: string;
  user_id: string;
  variant: 'control' | 'treatment';
  assigned_at: Date;

  // Metrics from this variant
  scan_count: number;
  approved_entities: number;
  rejected_entities: number;
  avg_extraction_f1: number;
  avg_confidence_score: number;
}

async function runABTest(
  controlVersion: PromptVersion,
  treatmentVersion: PromptVersion,
  sampleSize: number = 100
): Promise<ABTestResult> {

  // Assign users randomly
  const allUsers = await getAllActiveUsers();
  const shuffled = shuffle(allUsers);

  const controlUsers = shuffled.slice(0, sampleSize / 2);
  const treatmentUsers = shuffled.slice(sampleSize / 2, sampleSize);

  // Run for 1 week
  await Promise.all([
    // Control assignment
    ...controlUsers.map(u =>
      db.from('ab_test_assignments').insert({
        test_id: `ab_${Date.now()}`,
        user_id: u.id,
        variant: 'control',
        assigned_at: new Date(),
      })
    ),

    // Treatment assignment
    ...treatmentUsers.map(u =>
      db.from('ab_test_assignments').insert({
        test_id: `ab_${Date.now()}`,
        user_id: u.id,
        variant: 'treatment',
        assigned_at: new Date(),
      })
    ),
  ]);

  // Wait 7 days, then analyze
  await sleep(7 * 24 * 60 * 60 * 1000);

  // Calculate metrics
  const controlMetrics = await aggregateMetricsByVariant('control');
  const treatmentMetrics = await aggregateMetricsByVariant('treatment');

  // Statistical test (t-test)
  const pValue = calculateTTest(
    controlMetrics.f1_scores,
    treatmentMetrics.f1_scores
  );

  const isSignificant = pValue < 0.05;

  return {
    test_id: `ab_${Date.now()}`,
    control_f1: controlMetrics.avg_f1,
    treatment_f1: treatmentMetrics.avg_f1,
    improvement_percent: ((treatmentMetrics.avg_f1 - controlMetrics.avg_f1) / controlMetrics.avg_f1) * 100,
    p_value: pValue,
    is_significant: isSignificant,
    winner: isSignificant && treatmentMetrics.avg_f1 > controlMetrics.avg_f1 ? 'treatment' : 'control',
  };
}
```

**Automatic Prompt Optimization Loop**

```typescript
async function autoOptimizePrompt(): Promise<PromptVersion> {

  // Collect recent feedback
  const recentReviews = await db
    .from('quarantine_reviews')
    .select('*')
    .gte('created_at', subDays(new Date(), 7));

  // Mine patterns
  const fewShotCandidates = await selectDiverseFewShotExamples(
    recentReviews.filter(r => r.status === 'verified'),
    4
  );

  const rejectionPatterns = await mineRejectionPatterns();
  const negativeInstructions = buildNegativeInstructions(rejectionPatterns);

  // Try 3 prompt variations
  const variations = [
    // V1: Add negative instructions
    buildPromptVariation(fewShotCandidates, negativeInstructions, 'with_negations'),

    // V2: Increase few-shot from 3 to 5
    buildPromptVariation(
      await selectDiverseFewShotExamples(recentReviews.filter(r => r.status === 'verified'), 5),
      negativeInstructions,
      'more_examples'
    ),

    // V3: Add RAG context injection
    buildPromptVariation(fewShotCandidates, negativeInstructions, 'with_rag'),
  ];

  // Test on holdout set
  const testSet = recentReviews.slice(0, 50);
  const results = await Promise.all(
    variations.map(v => evaluatePromptVariation(v, testSet))
  );

  // Select best performer
  const bestIndex = results.indexOf(Math.max(...results.map(r => r.f1_score)));
  const bestVariation = variations[bestIndex];

  // Create new version
  const newVersion: PromptVersion = {
    version_id: incrementVersion(getCurrentVersion()),
    created_at: new Date(),
    created_by_user_id: 'system',
    prompt_components: bestVariation.components,
    metrics: {
      avg_extraction_f1: results[bestIndex].f1_score,
      approved_count: recentReviews.filter(r => r.status === 'verified').length,
      rejected_count: recentReviews.filter(r => r.status === 'rejected').length,
      avg_confidence_score: results[bestIndex].avg_confidence,
      user_satisfaction: 4.0, // placeholder
    },
    change_summary: `Auto-optimized: ${results[bestIndex].variant}`,
    change_reason: 'Weekly automated improvement cycle',
  };

  // Store and announce
  await db.from('prompt_versions').insert(newVersion);
  await announcePromptChange(newVersion);

  return newVersion;
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| A/B test too short (underpowered) | Run minimum 1 week, require 50+ samples per variant |
| Prompt oscillates (v1→v2→v1) | Track rolling 30-day metrics, only deploy if >3% improvement |
| Community confusion about versioning | Maintain changelog with plain-English explanations |

---

## AREA 5: CONFIDENCE SCORING WITHOUT TRAINING

### State of the Art Research

**Post-Hoc Calibration Methods**

Key insight: [Post-hoc Confidence Refinement Modules](https://www.emergentmind.com/topics/post-hoc-confidence-refinement-modules) are model-agnostic, lightweight procedures that can improve confidence scores **without retraining**:
- Isotonic regression
- Histogram binning
- Temperature scaling
- Logistic regression calibration

[A study of calibration in biomedical NLP (PMC 12249208)](https://pmc.ncbi.nlm.gov/articles/PMC12249208/) shows:
- Base LLM confidence is poorly calibrated (ECE = 0.3-0.7, ideal is <0.1)
- Post-hoc methods reduce calibration error by 30-50%
- Temperature scaling: effective but model-specific

**Multi-Signal Confidence (8-Signal System)**

[Confidence Calibration and Rationalization for LLMs (arXiv 2404.09127)](https://arxiv.org/html/2404.09127v3) proposes multi-agent deliberation:
- Ask LLM multiple times in different ways
- Measure agreement (disagreement = lower confidence)
- Combine with structural signals

For entity extraction specifically, we propose **8-signal composite scoring**:

1. **Document Type Affinity** (0.0-1.0)
   - Is entity type common in this document type?
   - Court records have dates, financial records have amounts

2. **Source Reliability** (0.0-1.0)
   - Does entity appear verbatim in document?
   - Check exact string match

3. **Cross-Reference Frequency** (0.0-1.0)
   - Does this entity appear in 3+ other documents?
   - High frequency = higher confidence it's real

4. **LLM Token Probability** (0.0-1.0)
   - Log probabilities of generated tokens
   - Lower entropy = higher confidence

5. **Consensus Among Reviewers** (0.0-1.0)
   - How many reviewers approved vs rejected?
   - Simple: approved / (approved + rejected)

6. **Historical Accuracy** (0.0-1.0)
   - Entity types extracted by this prompt version have what approval rate?
   - If persons from this extraction has 85% approval, +0.85

7. **Network Consistency** (0.0-1.0)
   - Does entity fit existing knowledge graph?
   - Known politician appearing in new document = high confidence
   - Unknown person with isolated mentions = lower confidence

8. **Temporal Plausibility** (0.0-1.0)
   - Are dates/timelines reasonable?
   - Birth date after death date = 0.0
   - Recent date in 50-year-old document = lower confidence

### Implementation for Project Truth

**8-Signal Confidence Calculation**

```typescript
interface ConfidenceSignals {
  doc_type_affinity: number;
  source_reliability: number;
  cross_reference_frequency: number;
  llm_token_probability: number;
  community_consensus: number;
  historical_accuracy: number;
  network_consistency: number;
  temporal_plausibility: number;
}

interface CalibrationWeights {
  doc_type_affinity: number;
  source_reliability: number;
  cross_reference_frequency: number;
  llm_token_probability: number;
  community_consensus: number;
  historical_accuracy: number;
  network_consistency: number;
  temporal_plausibility: number;
}

async function calculateCompositeConfidence(
  extractedEntity: string,
  entityType: string,
  documentType: string,
  documentContent: string,
  llmTokenProbs: number[],
  promptVersionId: string
): Promise<{
  confidence: number;
  signals: ConfidenceSignals;
}> {

  // Signal 1: Document Type Affinity
  const entityTypeDistribution = await db.rpc('get_entity_type_distribution_by_doc_type', {
    entity_type: entityType,
    doc_type: documentType,
  });
  const docTypeAffinity = entityTypeDistribution.frequency / entityTypeDistribution.total;

  // Signal 2: Source Reliability (exact string match)
  const sourceReliability = documentContent.includes(extractedEntity) ? 1.0 : 0.0;

  // Signal 3: Cross-Reference Frequency
  const occurrenceCount = await db
    .from('quarantine_reviews')
    .select('count')
    .ilike('extracted_entity', `%${extractedEntity}%`)
    .eq('status', 'verified');
  const crossRefFrequency = Math.min(occurrenceCount[0]?.count / 10, 1.0); // Saturate at 10

  // Signal 4: LLM Token Probability
  const avgTokenProb = llmTokenProbs.reduce((a, b) => a + b, 0) / llmTokenProbs.length;
  const tokenProbSignal = Math.exp(avgTokenProb); // Convert log-prob to 0-1

  // Signal 5: Community Consensus
  const reviews = await db
    .from('quarantine_reviews')
    .select('status')
    .eq('extracted_entity', extractedEntity)
    .eq('entity_type', entityType);
  const approved = reviews.filter(r => r.status === 'verified').length;
  const rejected = reviews.filter(r => r.status === 'rejected').length;
  const consensus = approved / (approved + rejected + 1); // +1 to avoid div by 0

  // Signal 6: Historical Accuracy (of this prompt version)
  const versionMetrics = await db
    .from('prompt_versions')
    .select('metrics')
    .eq('version_id', promptVersionId)
    .single();
  const historicalAccuracy = versionMetrics.metrics.avg_extraction_f1;

  // Signal 7: Network Consistency
  const existingEntity = await findEntityInGraph(extractedEntity, entityType);
  const networkConsistency = existingEntity ? 0.9 : 0.5; // Known = higher

  // Signal 8: Temporal Plausibility
  const temporalScore = validateTemporalConsistency(extractedEntity, entityType, documentContent);

  const signals: ConfidenceSignals = {
    doc_type_affinity: docTypeAffinity,
    source_reliability: sourceReliability,
    cross_reference_frequency: crossRefFrequency,
    llm_token_probability: tokenProbSignal,
    community_consensus: consensus,
    historical_accuracy: historicalAccuracy,
    network_consistency: networkConsistency,
    temporal_plausibility: temporalScore,
  };

  // Weighted average (initially equal weights, tune over time)
  const weights: CalibrationWeights = {
    doc_type_affinity: 0.125,
    source_reliability: 0.125,
    cross_reference_frequency: 0.125,
    llm_token_probability: 0.125,
    community_consensus: 0.125,
    historical_accuracy: 0.125,
    network_consistency: 0.125,
    temporal_plausibility: 0.125,
  };

  const confidence = Object.keys(signals).reduce((sum, key) => {
    return sum + (signals[key as keyof ConfidenceSignals] * weights[key as keyof CalibrationWeights]);
  }, 0);

  return { confidence, signals };
}
```

**Bayesian Confidence Updating**

As community feedback accumulates, update confidence using Bayesian inference:

```typescript
interface BayesianConfidenceState {
  entity_id: string;
  alpha: number; // successes + 1
  beta: number; // failures + 1
  total_reviews: number;
}

async function updateBayesianConfidence(
  entityId: string,
  wasApproved: boolean
): Promise<BayesianConfidenceState> {

  // Fetch current state
  let state = await db
    .from('bayesian_confidence')
    .select('*')
    .eq('entity_id', entityId)
    .single();

  // Initialize if new
  if (!state) {
    state = { entity_id: entityId, alpha: 1, beta: 1, total_reviews: 0 };
  }

  // Update with new evidence (Beta-Bernoulli conjugate prior)
  if (wasApproved) {
    state.alpha += 1;
  } else {
    state.beta += 1;
  }
  state.total_reviews += 1;

  // Calculate posterior mean: α / (α + β)
  const posteriorMean = state.alpha / (state.alpha + state.beta);

  // Save
  await db.from('bayesian_confidence').upsert(state);

  return state;
}

// Usage: Bayesian posterior becomes new confidence
function bayesianConfidenceToScore(state: BayesianConfidenceState): number {
  // Mean of Beta distribution
  return state.alpha / (state.alpha + state.beta);
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Weights are arbitrary | Empirically tune weights on 100+ manual annotations |
| Signal drift over time | Recalibrate weights monthly using isotonic regression |
| Confidence becomes meaningless | Monitor calibration error (ECE) — maintain <0.15 |

---

## AREA 6: KNOWLEDGE GRAPH AS MEMORY

### State of the Art Research

**Knowledge-Aware Information Extraction**

[Knowledge Graph Enhanced Named Entity Recognition (arXiv 2503.15737)](https://arxiv.org/abs/2503.15737) demonstrates that injecting graph knowledge into NER improves F1 by 12-18%.

[Knowledge Graph Construction from LLM Extraction (Nature)](https://www.nature.com/articles/s41598-026-38066-w) shows that extracting relationships simultaneously with entities is more effective than entity-first approaches.

[GraphRAG: Graph-based Retrieval-Augmented Generation](https://www.puppygraph.com/blog/graphrag-knowledge-graph) builds a structured graph from document content, enabling:
- Subgraph retrieval (fetch relevant nodes + edges)
- Path queries (how are two entities connected?)
- Community detection (find clusters of related entities)

### Implementation for Project Truth

**Entity & Relationship Cross-Reference**

The existing Project Truth network (nodes + links) becomes memory:

```typescript
async function crossReferenceWithGraph(
  extractedEntity: string,
  entityType: string,
  documentId: string
): Promise<{
  existingNode: Node | null;
  connectingEntities: Node[];
  confidence_boost: number;
}> {

  // Query existing graph
  const existingNode = await queryExistingEntity(extractedEntity, entityType);

  if (existingNode) {
    // Entity already in graph
    return {
      existingNode,
      connectingEntities: [],
      confidence_boost: 0.15, // Known entity = +0.15 confidence
    };
  }

  // Find related entities in document
  const allExtractedInDoc = await getDocumentExtractions(documentId);

  const connectingEntities: Node[] = [];
  for (const extracted of allExtractedInDoc) {
    const knownNode = await queryExistingEntity(extracted.text, extracted.type);

    if (knownNode) {
      // Check if connected to other entities
      const connections = await getEntityConnections(knownNode.id);
      connectingEntities.push(...connections);
    }
  }

  // If new entity connects to known entities, higher confidence
  const confidence_boost = connectingEntities.length > 0 ? 0.1 : 0.0;

  return { existingNode: null, connectingEntities, confidence_boost };
}
```

**Sub-Graph Retrieval for Context**

When extracting, pull relevant subgraph for additional context:

```typescript
async function retrieveRelevantSubgraph(
  documentContent: string,
  entityType: string
): Promise<{
  nodes: Node[];
  edges: Link[];
}> {

  // Extract key concepts from document
  const keywords = await extractKeywords(documentContent, 10);

  // Query graph for related entities
  const relevantNodes: Node[] = [];
  const nodeIds = new Set<string>();

  for (const keyword of keywords) {
    const matches = await db
      .from('nodes')
      .select('*')
      .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .limit(3);

    matches.forEach(m => {
      relevantNodes.push(m);
      nodeIds.add(m.id);
    });
  }

  // Get edges connecting these nodes
  const relevantEdges = await db
    .from('links')
    .select('*')
    .or(
      `source_id.in.(${Array.from(nodeIds).join(',')}),` +
      `target_id.in.(${Array.from(nodeIds).join(',')})`
    )
    .limit(20);

  return {
    nodes: relevantNodes.slice(0, 10),
    edges: relevantEdges,
  };
}
```

**Graph-Augmented Prompt**

Inject subgraph context into prompt:

```typescript
async function buildGraphAugmentedPrompt(
  documentContent: string,
  documentType: string,
  documentId: string
): Promise<string> {

  const subgraph = await retrieveRelevantSubgraph(documentContent, 'person');

  const graphContext = `
KNOWN ENTITIES AND RELATIONSHIPS:
${subgraph.nodes.map(n => `- ${n.name} (${n.type}): ${n.description}`).join('\n')}

CONNECTIONS:
${subgraph.edges.map(e => `- ${e.source_name} --${e.relationship_type}--> ${e.target_name}`).join('\n')}
  `;

  return `
Extract entities similar to those above. Note connections and relationships.

${graphContext}

DOCUMENT:
${documentContent}
  `;
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Graph contains errors (infected with hallucinations) | Only use nodes with confidence > 0.8 for augmentation |
| Subgraph retrieval too slow | Limit to top 10 most relevant nodes, cache results |
| Over-reliance on graph biases extraction | Down-weight graph signals if entity is novel/rare |

---

## AREA 7: COMMUNITY-DRIVEN PROMPT EVOLUTION

### State of the Art Research

**Transparent AI Systems**

[Nine ways to implement more transparent AI (Algolia)](https://www.algolia.com/blog/ai/more-transparent-ai/) identifies key requirements:
- Explain decisions in user-friendly language
- Show confidence/uncertainty
- Reveal limitations
- Version and changelog

**PromptHub & Community Platforms**

[PromptHub: AI Prompt Management](https://www.prompthub.us/) demonstrates community-driven prompt evolution:
- Version control (like Git for prompts)
- Community voting on prompt improvements
- Public changelog with discussions
- Collaborative refinement

[promt.click](https://promt.click/?lang=pl) shows "GitHub-style version history":
- Every change recorded with note
- Rollback capability
- Diff viewing
- Community feed with top prompts

### Implementation for Project Truth

**Transparent Prompt Evolution Dashboard**

```typescript
interface PromptChangeLog {
  version_id: string;
  previous_version_id: string;
  timestamp: Date;
  author_id: string;
  change_type: 'auto_optimization' | 'community_proposal' | 'manual_edit';

  // What changed
  diff: {
    added_examples?: ApprovedEntity[];
    removed_examples?: ApprovedEntity[];
    modified_system_instruction?: string;
    new_negative_rules?: string[];
  };

  // Rationale
  change_reason: string;
  discussion_link?: string; // Link to GitHub discussion

  // Community feedback
  community_votes: {
    helpful: number;
    unhelpful: number;
    unclear: number;
  };

  // Impact
  performance_delta: {
    f1_score_change: number;
    confidence_calibration_change: number;
    approval_rate_change: number;
  };
}

// Public API for viewing changelog
async function getPromptChangelog(
  limit: number = 50
): Promise<PromptChangeLog[]> {

  return await db
    .from('prompt_changelogs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
}
```

**Community Proposal System**

```typescript
interface PromptProposal {
  proposal_id: string;
  proposed_by_user_id: string;
  proposed_at: Date;

  // The proposal
  title: string;
  description: string;
  rationale: string;

  // Changes
  proposed_changes: {
    new_few_shot_example?: ApprovedEntity;
    removal_of_broken_rule?: string;
    new_negative_instruction?: string;
  };

  // Discussion
  discussion: {
    comments: number;
    votes_pro: number;
    votes_against: number;
  };

  status: 'open' | 'accepted' | 'rejected' | 'implemented';
}

async function proposePromptChange(
  userId: string,
  title: string,
  description: string,
  proposedChanges: object
): Promise<string> {

  const proposal: PromptProposal = {
    proposal_id: `proposal_${Date.now()}`,
    proposed_by_user_id: userId,
    proposed_at: new Date(),
    title,
    description,
    rationale: '', // User provides this
    proposed_changes: proposedChanges,
    discussion: { comments: 0, votes_pro: 0, votes_against: 0 },
    status: 'open',
  };

  await db.from('prompt_proposals').insert(proposal);

  // Create GitHub discussion for visibility
  const discussion = await createGitHubDiscussion({
    title: `Prompt Improvement: ${title}`,
    body: `
User ${userId} proposes: ${description}

**Rationale:** ${proposal.rationale}

**Proposed Changes:**
${JSON.stringify(proposedChanges, null, 2)}

Vote in replies if this is helpful!
    `,
  });

  // Link GitHub discussion
  await db
    .from('prompt_proposals')
    .update({ discussion_link: discussion.url })
    .eq('proposal_id', proposal.proposal_id);

  return proposal.proposal_id;
}
```

**Voting & Acceptance**

```typescript
async function voteOnProposal(
  proposalId: string,
  userId: string,
  voteType: 'pro' | 'against'
): Promise<void> {

  // Record vote
  await db.from('proposal_votes').insert({
    proposal_id: proposalId,
    user_id: userId,
    vote: voteType,
    timestamp: new Date(),
  });

  // Update tally
  const proposal = await db
    .from('prompt_proposals')
    .select('*')
    .eq('proposal_id', proposalId)
    .single();

  const votes = await db
    .from('proposal_votes')
    .select('vote')
    .eq('proposal_id', proposalId);

  const pros = votes.filter(v => v.vote === 'pro').length;
  const againsts = votes.filter(v => v.vote === 'against').length;

  // Auto-accept if > 70% pro and > 20 votes
  if (pros / (pros + againsts) > 0.7 && (pros + againsts) > 20) {
    await acceptProposal(proposalId);
  }
}

async function acceptProposal(proposalId: string): Promise<void> {

  const proposal = await db
    .from('prompt_proposals')
    .select('*')
    .eq('proposal_id', proposalId)
    .single();

  // Get current prompt version
  const current = await getCurrentPromptVersion();

  // Apply changes
  const newVersion: PromptVersion = {
    version_id: incrementVersion(current.version_id),
    created_at: new Date(),
    created_by_user_id: 'community',
    prompt_components: applyChanges(current.prompt_components, proposal.proposed_changes),
    change_summary: proposal.title,
    change_reason: `Community proposal #${proposalId}`,
  };

  // Store and announce
  await db.from('prompt_versions').insert(newVersion);
  await announcePromptChange(newVersion);

  // Update proposal status
  await db
    .from('prompt_proposals')
    .update({ status: 'implemented' })
    .eq('proposal_id', proposalId);
}
```

### Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Community proposes invalid changes | Require >3 signatures from Tier 2+ users |
| Malicious proposals (e.g., to extract PII) | Proposal review by ethics committee (3 members) |
| Proposal spam | Rate limit to 1 proposal per user per week |

---

## AREA 8: PRODUCTION ARCHITECTURE FOR LEARNING PROMPTS

### State of the Art Research

**Token Budget Management**

[LLM Token Optimization (Redis Blog 2026)](https://redis.io/blog/llm-token-optimization-speed-up-apps/) identifies key optimization points:
- Verbose prompts waste 20-30% of token budget
- Output token optimization (4-8× cost multiplier on Claude, GPT-4)
- Semantic caching reduces ~33% of tokens on repeated contexts
- Dynamic prompt construction selects template based on query complexity

[Optimizing Token Efficiency (Portkey Blog)](https://portkey.ai/blog/optimize-token-efficiency-in-prompts/) recommends:
- Static content first (examples, instructions)
- Variable content last (document, query)
- Max prompt length: 2000 tokens (Groq limits)
- Batch similar documents to maximize cache hits

**Prompt Caching**

[Prompt Caching (OpenAI Developer Docs)](https://developers.openai.com/api/docs/guides/prompt-caching) and [Prompt Caching (Anthropic)](https://www.anthropic.com/news/prompt-caching) show:
- Cache KV tensors from prefill phase
- 50-85% latency reduction for cached prefixes
- 90% input token cost reduction
- Activation requires minimum 1024 token prefix

For Groq (if supported), enable caching on few-shot examples:

```typescript
// Static prompt components are cached
// Dynamic content (document) is not
const CACHE_MIN_TOKENS = 1024; // Groq minimum

async function buildCachedPrompt(
  documentContent: string,
  fewShotExamples: ApprovedEntity[]
): Promise<string> {

  // CACHED PART (reused across documents of same type)
  const cachedPrompt = `
You are an investigative document analysis AI.

Extract entities from legal/investigative documents.

GUIDELINES:
- Only extract information present in the document
- Do not hallucinate relationships
- Mark confidence for each extraction
- Use entity types: PERSON, ORGANIZATION, LOCATION, DATE, AMOUNT, DOCUMENT

EXAMPLES:
${fewShotExamples.map((e, i) => `
Example ${i + 1}:
Context: "${e.context_window}"
Extracted: ${e.extracted_text}
Type: ${e.entity_type}
`).join('\n')}
  `;

  // UNCACHED PART (document-specific)
  const uncachedPrompt = `
CURRENT DOCUMENT:
${documentContent}

Extract entities in JSON format.
  `;

  // If cached part > 1024 tokens, it's eligible for caching
  const cachedTokens = await estimateTokens(cachedPrompt);

  if (cachedTokens > CACHE_MIN_TOKENS) {
    return { cached: cachedPrompt, uncached: uncachedPrompt, use_cache: true };
  } else {
    return { combined: cachedPrompt + '\n' + uncachedPrompt, use_cache: false };
  }
}
```

### Complete Token Budget Strategy

```typescript
interface TokenBudget {
  max_tokens: number;
  allocated: {
    system_instruction: number;
    few_shot_examples: number;
    rag_context: number;
    document_content: number;
    output: number;
  };
  remaining: number;
}

async function calculateTokenBudget(
  documentSize: number, // characters
  documentType: string
): Promise<TokenBudget> {

  // Groq llama-3.3-70b has 8k context (conservative: use 7.5k)
  const MAX_TOKENS = 7500;

  // Static overhead (system + few-shot)
  const systemTokens = 200; // System instruction
  const fewShotTokens = 400; // 4 examples × 100 tokens each
  const ragContextTokens = 300; // 3 similar documents

  // Document size: estimate 1 token per 4 characters
  const docTokens = Math.ceil(documentSize / 4);

  // Reserve output
  const outputTokens = 1000; // Response budget

  // Check budget
  const totalNeeded = systemTokens + fewShotTokens + ragContextTokens + docTokens + outputTokens;

  if (totalNeeded > MAX_TOKENS) {
    // Need to truncate document
    const available = MAX_TOKENS - (systemTokens + fewShotTokens + ragContextTokens + outputTokens);
    return {
      max_tokens: MAX_TOKENS,
      allocated: {
        system_instruction: systemTokens,
        few_shot_examples: fewShotTokens,
        rag_context: ragContextTokens,
        document_content: available,
        output: outputTokens,
      },
      remaining: 0,
    };
  }

  return {
    max_tokens: MAX_TOKENS,
    allocated: {
      system_instruction: systemTokens,
      few_shot_examples: fewShotTokens,
      rag_context: ragContextTokens,
      document_content: docTokens,
      output: outputTokens,
    },
    remaining: MAX_TOKENS - totalNeeded,
  };
}
```

### Production Metrics & Monitoring

```typescript
interface PromptPerformanceMetrics {
  prompt_version: string;
  timestamp: Date;

  // Extraction quality
  f1_score: number;
  precision: number;
  recall: number;
  approval_rate: number;

  // Confidence calibration
  ece: number; // Expected Calibration Error (ideal <0.1)
  mce: number; // Maximum Calibration Error

  // Cost & latency
  avg_input_tokens: number;
  avg_output_tokens: number;
  avg_latency_ms: number;
  cost_per_extraction: number;

  // Community feedback
  user_satisfaction: number; // 1-5
  net_promoter_score: number; // -100 to 100

  // Errors
  hallucination_rate: number;
  false_positive_rate: number;
  false_negative_rate: number;
}

async function logPromptMetrics(metrics: PromptPerformanceMetrics): Promise<void> {

  await db.from('prompt_metrics').insert(metrics);

  // Alert if metrics degrade
  const previous = await getPreviousMetrics(metrics.prompt_version);

  if (metrics.f1_score < previous.f1_score * 0.95) {
    // 5% degradation
    await alertTeam(`
Prompt ${metrics.prompt_version} F1 degraded:
${previous.f1_score.toFixed(3)} → ${metrics.f1_score.toFixed(3)}
    `);
  }

  if (metrics.ece > 0.15) {
    await alertTeam(`
Prompt confidence calibration poor (ECE=${metrics.ece.toFixed(3)})
Consider re-calibration.
    `);
  }
}
```

---

## AREA 9: STATE OF THE ART

### Self-Improving Systems in Production

**PromptWizard (Microsoft Research)**

[PromptWizard: The Future of Prompt Optimization (Microsoft)](https://www.microsoft.com/en-us/research/blog/promptwizard-the-future-of-prompt-optimization-through-feedback-driven-self-evolving-prompts/) is the closest existing system to what Project Truth needs:

- Iterative feedback loop (3-5 iterations)
- LLM critiques its own prompts and examples
- Self-synthesizing improvements
- Requires no human annotation

**Voyager (Minecraft Agent, 2023)**

[Voyager: An Open-Ended Embodied Agent (arxiv.org)](https://arxiv.org/abs/2305.16291) demonstrates skills library + curriculum learning:
- LLM writes code
- Code is tested in environment (Minecraft)
- Failing code is rejected, succeeding code is archived
- New skills build on proven prior skills

Analogous for Project Truth: extract code (prompt components) tested against quarantine system.

**AlphaEvolve (Google DeepMind, May 2025)**

Evolutionary coding agent that designs and optimizes algorithms using LLMs. Similar evolutionary approach to PromptBreeder.

### Comparable Production Systems

**Clinical Entity Extraction at Scale**

[Clinical Entity Augmented Retrieval (CLEAR)](https://www.nature.com/articles/s41746-024-01377-1) in hospital EHR systems:
- F1 = 0.90 across clinical variables
- RAG-augmented retrieval
- 4.95 seconds per note
- Scales to millions of records

**CourtListener & RECAP (Legal Domain)**

Project Truth's closest analog: [CourtListener](https://www.courtlistener.com/) is a legal case database with hand-curated metadata. While not using learning prompts, it demonstrates the domain where Project Truth operates.

---

## AREA 10: ETHICAL FRAMEWORK

### State of the Art Research

**Transparency Requirements**

[Ethical Prompt Engineering: Addressing Bias, Transparency, and Fairness (ResearchGate)](https://www.researchgate.net/publication/389819761_Ethical_Prompt_Engineering_Addressing_Bias_Transparency_and_Fairness) identifies:
- Explain decisions in plain language
- Show confidence/uncertainty
- Reveal limitations
- Audit trail for decisions

**Bias Detection**

[How to Reduce Bias in AI with Prompt Engineering (Latitude)](https://latitude.so/blog/how-to-reduce-bias-in-ai-with-prompt-engineering/) recommends:
- Test prompts with diverse demographics
- Compare outputs across groups
- Continuous monitoring
- Involve domain experts and ethicists

**Right to Be Forgotten**

[Right to Be Forgotten & AI (CSA 2025)](https://cloudsecurityalliance.org/blog/2025/04/11/the-right-to-be-forgotten-but-can-ai-forget) raises the hard problem:
- User can request data deletion (GDPR Art. 17)
- But if data trained the prompt, deleting breaks prompt
- Solution: modular prompts (per-example storage) so individual examples can be removed

### Implementation for Project Truth

**Transparency Report Template**

```markdown
# Project Truth Learning Prompt System — Transparency Report
## Q1 2026

### Prompt Evolution Summary
- **Active Version:** 1.4.2 (deployed 2026-03-15)
- **Total Versions:** 14
- **Community Proposals:** 23 (18 accepted, 3 rejected, 2 pending)

### Performance Metrics
- F1 Score: 0.87 (vs 0.82 baseline)
- Confidence Calibration (ECE): 0.12 (target: <0.1)
- Hallucination Rate: 2.1% (vs 5.3% baseline)
- Approval Rate: 84% (target: >80%)

### Changes This Quarter
1. **v1.2.0** (2026-01-10): Added temporal plausibility checks
2. **v1.3.1** (2026-02-14): Improved few-shot diversity selection
3. **v1.4.2** (2026-03-15): Cross-document hallucination pattern mining

### Community Engagement
- 14,237 users
- 3,456 quarantine reviews submitted
- 23 prompt improvement proposals
- Tier 2+ council: 14 members

### Bias Analysis
- Tested across 5 demographic distributions
- Extracted entity types show <3% variance across groups
- Gender bias in pronouns: addressed in v1.3.1
- Organizational bias: ongoing investigation

### Limitations
- Only trained on English legal documents
- May underperform on hand-written documents (OCR-dependent)
- Requires 2+ sources to verify entities
- Cannot detect visual deepfakes

### Right to Be Forgotten Requests
- 0 approved, 0 pending
- Process documented at /docs/privacy/data-deletion.md

---

**Issued by:** Project Truth Ethics Council
**Date:** 2026-03-31
**Next Report:** 2026-06-30
```

**Bias Detection Pipeline**

```typescript
async function analyzePromptForBias(
  promptVersionId: string
): Promise<BiasReport> {

  // Test across demographic groups
  const testCases = generateTestCases([
    { gender: ['male', 'female', 'neutral'] },
    { ethnicity: ['names_from_various_regions'] },
    { organizational_affiliation: ['corporate', 'ngo', 'government'] },
  ]);

  const results: Map<string, ExtractionResult[]> = new Map();

  for (const [group, cases] of Object.entries(testCases)) {
    const groupResults: ExtractionResult[] = [];

    for (const testCase of cases) {
      const extraction = await runPromptVersion(promptVersionId, testCase);
      groupResults.push(extraction);
    }

    results.set(group, groupResults);
  }

  // Calculate statistical measures of fairness
  const biasMetrics = {
    demographic_parity: calculateDemographicParity(results),
    equalized_odds: calculateEqualizedOdds(results),
    treatment_equality: calculateTreatmentEquality(results),
  };

  // Generate report
  const report: BiasReport = {
    version_id: promptVersionId,
    timestamp: new Date(),
    test_cases_count: testCases.flat().length,
    bias_metrics: biasMetrics,
    violations: identifyBiasViolations(biasMetrics),
    recommendations: generateBiasRecommendations(biasMetrics),
  };

  return report;
}
```

**Right to Be Forgotten Handler**

```typescript
async function handleDataDeletionRequest(
  userId: string,
  dataType: 'personal_data' | 'feedback_data'
): Promise<void> {

  if (dataType === 'personal_data') {
    // Delete user's submitted quarantine reviews
    // (does not affect trained prompts — user feedback is aggregated)
    await db
      .from('quarantine_reviews')
      .delete()
      .eq('submitted_by_user_id', userId);

    // Delete user's prompt proposals
    await db
      .from('prompt_proposals')
      .delete()
      .eq('proposed_by_user_id', userId);
  }

  if (dataType === 'feedback_data') {
    // HARD CASE: User wants feedback removed from prompts
    // Solution: Retrain prompt without this user's approved examples

    const userExamplesUsedInPrompts = await findUserExamplesInPrompts(userId);

    if (userExamplesUsedInPrompts.length > 0) {
      // Create new prompt version without user's examples
      const currentVersion = await getCurrentPromptVersion();

      const newExamples = currentVersion.prompt_components.few_shot_examples
        .filter(e => e.approver_id !== userId);

      if (newExamples.length >= 3) { // Minimum viable prompt
        const newVersion: PromptVersion = {
          version_id: incrementVersion(currentVersion.version_id),
          created_at: new Date(),
          created_by_user_id: 'system',
          prompt_components: {
            ...currentVersion.prompt_components,
            few_shot_examples: newExamples,
          },
          change_summary: `Data deletion request by user ${userId}`,
          change_reason: 'GDPR Article 17 — Right to be forgotten',
        };

        await db.from('prompt_versions').insert(newVersion);

        // Only deploy if performance doesn't degrade
        const oldMetrics = currentVersion.metrics;
        const newMetrics = await evaluatePromptVersion(newVersion, testSet);

        if (newMetrics.f1_score >= oldMetrics.avg_extraction_f1 * 0.95) {
          // Acceptable degradation
          await deployPromptVersion(newVersion);
        } else {
          // Unable to delete without harming system
          // Log for manual review
          await logDeletionImpossibility(userId, newVersion);
          throw new Error('GDPR Article 17 conflict: data deletion would degrade system');
        }
      } else {
        throw new Error('Cannot delete user data: would reduce prompt below minimum viability');
      }
    }
  }

  // Audit log
  await auditLog({
    event: 'data_deletion_request',
    user_id: userId,
    data_type: dataType,
    timestamp: new Date(),
    status: 'completed',
  });
}
```

---

## COMPLETE SYSTEM ARCHITECTURE

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNING PROMPT SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

1. DOCUMENT INGESTION
   ┌────────────────┐
   │ New Document   │─→ Generate embedding
   │ (PDF/Images)   │→ Store in pgvector
   └────────────────┘

2. PROMPT COMPOSITION
   ┌──────────────────┐
   │ Few-Shot Selector├─→ Select 4 diverse approved entities
   ├──────────────────┤
   │ RAG Retriever    ├─→ Find 3 similar documents
   ├──────────────────┤
   │ Rejection Miner  ├─→ Extract patterns from 1000+ rejections
   ├──────────────────┤
   │ Graph Augmenter  ├─→ Inject subgraph context
   └──────────────────┘
           ↓
   ┌──────────────────────────┐
   │ Dynamic Prompt Assembly  │
   │ • System instruction     │
   │ • Few-shot examples      │
   │ • Negative rules         │
   │ • RAG context            │
   │ • Graph augmentation     │
   └──────────────────────────┘

3. EXTRACTION (Groq API)
   ┌────────────────────────────┐
   │ Groq llama-3.3-70b         │
   │ Extract entities + links   │
   └────────────────────────────┘
           ↓
   ┌────────────────────────────┐
   │ Entity Deduplication       │
   │ (Check for duplicates)     │
   └────────────────────────────┘

4. CONFIDENCE SCORING (8-Signal)
   ┌──────────────────────┐
   │ Document Type        │──┐
   ├──────────────────────┤  │
   │ Source Reliability   │  │
   ├──────────────────────┤  │ 8-signal
   │ Cross-Reference      │  ├──→ Composite
   ├──────────────────────┤  │ Confidence
   │ LLM Token Prob       │  │ Score
   ├──────────────────────┤  │
   │ Community Consensus  │  │
   ├──────────────────────┤  │
   │ Historical Accuracy  │  │
   ├──────────────────────┤  │
   │ Network Consistency  │  │
   ├──────────────────────┤  │
   │ Temporal Plausibility│──┘
   └──────────────────────┘

5. QUARANTINE
   ┌────────────────────┐
   │ data_quarantine    │
   │ status=quarantined │
   │ confidence<0.8     │
   └────────────────────┘
           ↓
   ┌────────────────────┐
   │ Peer Review Queue  │
   │ (Tier 2+ users)    │
   └────────────────────┘

6. COMMUNITY FEEDBACK
   ┌────────────────────┐
   │ Approved (verified)│
   └────────────────────┘
           ↓
   ┌────────────────────────────────┐
   │ Learn from Feedback:           │
   │ • Add to few-shot pool         │
   │ • Update Bayesian confidence   │
   │ • Adjust network consistency   │
   │ • Feed into next optimization  │
   └────────────────────────────────┘

7. PROMPT OPTIMIZATION (Weekly)
   ┌────────────────────────────────┐
   │ Analyze recent feedback:       │
   │ • Mine new rejection patterns  │
   │ • Update few-shot diversity    │
   │ • Recalibrate confidence       │
   │ • Test 3 variations            │
   └────────────────────────────────┘
           ↓
   ┌────────────────────────────────┐
   │ A/B Test (7 days):             │
   │ • Control vs Treatment         │
   │ • Measure F1, calibration      │
   │ • Statistical significance     │
   └────────────────────────────────┘
           ↓
   ┌────────────────────────────────┐
   │ Deploy Winner:                 │
   │ • Version increment            │
   │ • Changelog announcement       │
   │ • Community discussion          │
   └────────────────────────────────┘

8. TRANSPARENCY & GOVERNANCE
   ┌────────────────────────────┐
   │ Prompt Changelog           │
   │ (Immutable, auditable)     │
   └────────────────────────────┘
   ┌────────────────────────────┐
   │ Community Proposals        │
   │ (GitHub discussions)       │
   └────────────────────────────┘
   ┌────────────────────────────┐
   │ Quarterly Bias Reports     │
   └────────────────────────────┘
```

### Database Schema

```sql
-- Core Tables (existing)
CREATE TABLE networks (id UUID PRIMARY KEY, ...);
CREATE TABLE nodes (id UUID PRIMARY KEY, ...);
CREATE TABLE links (id UUID PRIMARY KEY, ...);

-- New: Learning Prompt System
CREATE TABLE prompt_versions (
  version_id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  created_by_user_id TEXT,
  prompt_components JSONB,
  metrics JSONB,
  ab_test_id TEXT,
  ab_test_variant TEXT,
  change_summary TEXT,
  change_reason TEXT
);

CREATE TABLE prompt_changelogs (
  changelog_id UUID PRIMARY KEY,
  version_id TEXT REFERENCES prompt_versions,
  previous_version_id TEXT,
  timestamp TIMESTAMP,
  author_id TEXT,
  change_type TEXT,
  diff JSONB,
  change_reason TEXT,
  community_votes JSONB,
  performance_delta JSONB
);

CREATE TABLE document_embeddings (
  document_id UUID PRIMARY KEY,
  document_type TEXT,
  embedding vector(768),
  scan_count INT,
  approved_entity_count INT,
  avg_confidence NUMERIC,
  created_at TIMESTAMP
);

CREATE INDEX on document_embeddings USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE few_shot_pool (
  entity_id UUID PRIMARY KEY,
  extracted_text TEXT,
  entity_type TEXT,
  document_type TEXT,
  context_window TEXT,
  approval_date TIMESTAMP,
  approver_tier INT,
  confidence_score NUMERIC,
  usage_count INT DEFAULT 0
);

CREATE TABLE rejection_patterns (
  pattern_id UUID PRIMARY KEY,
  rejection_reason TEXT,
  trigger_keywords TEXT[],
  entity_type TEXT,
  frequency INT,
  confidence NUMERIC,
  created_at TIMESTAMP,
  last_updated TIMESTAMP
);

CREATE TABLE bayesian_confidence (
  entity_id UUID PRIMARY KEY,
  alpha INT DEFAULT 1, -- successes + 1
  beta INT DEFAULT 1,  -- failures + 1
  total_reviews INT DEFAULT 0,
  posterior_mean NUMERIC GENERATED ALWAYS AS (alpha::NUMERIC / (alpha + beta)) STORED
);

CREATE TABLE prompt_proposals (
  proposal_id TEXT PRIMARY KEY,
  proposed_by_user_id TEXT,
  proposed_at TIMESTAMP,
  title TEXT,
  description TEXT,
  rationale TEXT,
  proposed_changes JSONB,
  discussion_link TEXT,
  status TEXT,
  votes_pro INT DEFAULT 0,
  votes_against INT DEFAULT 0
);

CREATE TABLE prompt_metrics (
  metric_id UUID PRIMARY KEY,
  prompt_version TEXT REFERENCES prompt_versions,
  timestamp TIMESTAMP,
  f1_score NUMERIC,
  precision NUMERIC,
  recall NUMERIC,
  approval_rate NUMERIC,
  ece NUMERIC,
  mce NUMERIC,
  avg_input_tokens INT,
  avg_output_tokens INT,
  avg_latency_ms INT,
  cost_per_extraction NUMERIC,
  user_satisfaction NUMERIC,
  nps NUMERIC,
  hallucination_rate NUMERIC,
  false_positive_rate NUMERIC,
  false_negative_rate NUMERIC
);

CREATE TABLE ab_test_assignments (
  test_id TEXT,
  user_id TEXT,
  variant TEXT,
  assigned_at TIMESTAMP,
  PRIMARY KEY (test_id, user_id)
);

-- RLS Policies for sensitive data
ALTER TABLE prompt_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayesian_confidence ENABLE ROW LEVEL SECURITY;
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Basic learning loop operational

- [ ] Week 1:
  - Implement few-shot selection algorithm
  - Build DynamicPromptBuilder utility
  - Create PromptVersion table + versioning API

- [ ] Week 2:
  - Implement rejection pattern mining (basic clustering)
  - Build NegativeInstructionBuilder
  - Test on 500 existing quarantine reviews

- [ ] Week 3:
  - Integrate RAG retrieval with pgvector
  - Implement DocumentEmbedding storage
  - Test similarity search latency

- [ ] Week 4:
  - Deploy 8-signal confidence scoring
  - Calibrate weights empirically on 100 manual annotations
  - Set up MetricsLogger + dashboard

**Success Metrics:**
- Few-shot selection F1: >0.75
- Confidence calibration ECE: <0.20
- Latency: <2s per document (including Groq call)

### Phase 2: Community & Transparency (Weeks 5-8)
**Goal:** Community-driven evolution

- [ ] Week 5:
  - Implement PromptChangeLog system
  - Create public Transparency Dashboard
  - Wire up GitHub integration for discussions

- [ ] Week 6:
  - Build PromptProposal submission form
  - Implement community voting system
  - Auto-acceptance rules (>70% pro, >20 votes)

- [ ] Week 7:
  - Create PromptHub-like "Prompt Marketplace"
  - Document prompts with plain-English descriptions
  - Launch community feedback survey

- [ ] Week 8:
  - First community proposal review cycle
  - Adjust acceptance criteria based on feedback
  - Document governance process in CONTRIBUTING.md

**Success Metrics:**
- >5 community proposals submitted
- Public changelog with 20+ versions
- Transparency dashboard accessible and updated weekly

### Phase 3: Optimization (Weeks 9-12)
**Goal:** Automated prompt improvement

- [ ] Week 9:
  - Implement DSPy-style prompt optimizer (simplified version)
  - Test 3-5 prompt variations weekly
  - Deploy A/B testing infrastructure

- [ ] Week 10:
  - Automatic weekly optimization cycle
  - F1 > 0.85 as target
  - Confidence calibration ECE < 0.15

- [ ] Week 11:
  - Implement PromptBreeder-style evolution (if resources allow)
  - Track prompt genealogy (version → parent → grandparent)
  - Analyze evolutionary patterns

- [ ] Week 12:
  - Quarterly bias audit + report
  - GDPR compliance audit
  - Performance retrospective

**Success Metrics:**
- F1 score improvement: +5% from baseline
- Confidence calibration: ECE < 0.15
- Hallucination rate: <2%
- Community adoption: >50% of users follow changelog

### Phase 4: Production Hardening (Weeks 13-16)
**Goal:** Production-ready system

- [ ] Week 13-14:
  - Load testing (1000+ concurrent document scans)
  - Token budget optimization
  - Prompt caching implementation

- [ ] Week 15:
  - Security audit (prompt injection resistance)
  - Right to be forgotten implementation
  - Data deletion testing

- [ ] Week 16:
  - Documentation complete
  - Training for ethics council
  - Monitoring + alerting configured

**Success Metrics:**
- 99% uptime SLA
- <2s latency at 100 req/s
- 0 prompt injection exploits found in audit

---

## RISK MATRIX & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Few-shot pool polluted with errors | Medium | High | Tier-weight selection (Tier 2+ = 2×) |
| Over-fitting to recent feedback | Medium | High | Historical diversity sampling (60% recent, 40% historical) |
| Prompt oscillates across versions | Low | Medium | Track rolling 30-day metrics, >3% improvement required |
| Community rejects governance | Low | High | Transparent decision-making, open appeals process |
| Confidence scores become uncalibrated | Medium | Medium | Monthly recalibration, ECE monitoring |
| Token budget exceeded (hallucinations) | Low | Medium | Hard cap on prompt size, truncation strategy |
| GDPR right-to-be-forgotten impossible | Low | High | Modular prompt storage, selective deletion |
| Bias emerges in learned patterns | Medium | High | Quarterly bias audits across 5 demographic groups |

---

## CONCLUSION

The **Learning Prompt System** represents a fundamentally new approach to AI improvement: training the prompt rather than the model. For Project Truth, this enables:

1. **Rapid iteration** (weekly improvements vs. quarterly model retraining)
2. **Transparency** (every prompt change is versioned and explainable)
3. **Community ownership** (users shape system improvement)
4. **No model dependency** (works with any LLM API)
5. **Ethical guardrails** (bias detection, right to be forgotten, audit trails)

The research synthesis across 10 scientific domains, combined with the production architecture and implementation roadmap, provides a complete blueprint for deploying learning prompts at scale.

**Next Step:** Implement Phase 1 foundation (few-shot selection + rejection mining) and run for 2 weeks to validate hypothesis that human feedback improves extraction quality.

---

## REFERENCES & SOURCES

### Few-Shot Learning
- [Designing Informative Metrics for Few-Shot Example Selection (arXiv 2403.03861)](https://arxiv.org/html/2403.03861v3)
- [The Few-shot Dilemma (arXiv 2509.13196)](https://arxiv.org/html/2509.13196v1)
- [Information Extraction in Low-Resource Scenarios (arXiv 2202.08063)](https://arxiv.org/html/2202.08063v5)
- [Automatic Combination of Sample Selection Strategies (arXiv 2402.03038)](https://arxiv.org/html/2402.03038v1)

### Rejection Learning & Error Analysis
- [Failures Are Stepping Stones to Success (arXiv 2507.23211)](https://arxiv.org/html/2507.23211)
- [Machine Learning with a Reject Option (arXiv 2107.11277)](https://arxiv.org/html/2107.11277v3)
- [A Quick Guide to Error Analysis (Analytics Vidhya)](https://www.analyticsvidhya.com/blog/2021/08/a-quick-guide-to-error-analysis-error-analysis-machine-learning/)

### Retrieval-Augmented Prompting
- [Retrieval Augmented Generation for LLMs (Prompt Engineering Guide)](https://www.promptingguide.ai/techniques/rag)
- [Clinical Entity Augmented Retrieval (Nature)](https://www.nature.com/articles/s41746-024-01377-1)
- [RAG-Based Relation Extraction (arXiv 2404.13397)](https://arxiv.org/html/2404.13397v1)
- [pgvector: Embeddings and Vector Similarity (Supabase)](https://supabase.com/docs/guides/database/extensions/pgvector)

### Prompt Optimization
- [DSPy: The Framework for Programming Language Models (GitHub)](https://github.com/stanfordnlp/dspy)
- [PromptBreeder (arXiv 2309.16797)](https://arxiv.org/abs/2309.16797)
- [Confidence Calibration in LLMs (arXiv 2404.09127)](https://arxiv.org/html/2404.09127v3)

### Production Systems
- [LLM Token Optimization (Redis 2026)](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Prompt Caching (OpenAI)](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Prompt Caching Explained (DigitalOcean)](https://www.digitalocean.com/community/tutorials/prompt-caching-explained)

### Transparency & Ethics
- [Nine ways to implement more transparent AI (Algolia)](https://www.algolia.com/blog/ai/more-transparent-ai/)
- [Ethical Prompt Engineering (ResearchGate)](https://www.researchgate.net/publication/389819761_Ethical_Prompt_Engineering_Addressing_Bias_Transparency_and_Fairness)
- [How to Reduce Bias in AI (Latitude)](https://latitude.so/blog/how-to-reduce-bias-in-ai-with-prompt-engineering/)
- [Right to Be Forgotten & AI (CSA 2025)](https://cloudsecurityalliance.org/blog/2025/04/11/the-right-to-be-forgotten-but-can-ai-forget)

### Knowledge Graphs & Entity Extraction
- [Knowledge Graph Enhanced NER (arXiv 2503.15737)](https://arxiv.org/abs/2503.15737)
- [Knowledge Graph Construction from LLM (Nature)](https://www.nature.com/articles/s41598-026-38066-w)
- [GraphRAG: Graph-based RAG](https://www.puppygraph.com/blog/graphrag-knowledge-graph)

---

**Document Version:** 1.0
**Last Updated:** March 23, 2026
**Research Depth:** 10+ areas, 50+ academic citations, complete architecture
**Status:** Ready for implementation
**Audience:** Project Truth engineering team, Raşit Altunç

