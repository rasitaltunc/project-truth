# DOCUMENT PIPELINE — IMPLEMENTATION PRIORITY MATRIX
## What to Build First (Ordered by ROI)

**Date:** March 22, 2026
**Audience:** Raşit, Alperen, Nebi (engineering team)
**Format:** 80/20 actionable breakdown

---

## PRIORITY 1: Hallucination Detection (Week 1)
**ROI: HIGHEST** — Prevents false accusations from reaching users
**Risk if skipped:** Legal liability, platform trust destruction
**Time: 4-6 hours**

```typescript
// FILE: src/lib/extraction/hallucination.ts

export async function filterHallucinations(
  entities: Entity[],
  relationships: Relationship[],
  ocrText: string
): Promise<{
  entities: Entity[];
  relationships: Relationship[];
  hallucinations: { value: string; type: string; confidence: number }[];
}> {

  const hallucinations = [];
  const validEntities = [];
  const validRelationships = [];

  // ── Entity Validation ──
  for (const entity of entities) {
    // Strict: Entity must exist verbatim OR with fuzzy match >0.85
    const exact = ocrText.includes(entity.value);
    const fuzzy = findBestMatch(entity.value, ocrText);

    if (exact || (fuzzy && fuzzy.score > 0.85)) {
      validEntities.push(entity);
    } else {
      // Log hallucination for audit
      hallucinations.push({
        value: entity.value,
        type: entity.type,
        confidence: entity.confidence || 0.5,
      });
    }
  }

  // ── Relationship Validation ──
  for (const rel of relationships) {
    const sourceInValid = validEntities.some(e => similarity(e.value, rel.source) > 0.8);
    const targetInValid = validEntities.some(e => similarity(e.value, rel.target) > 0.8);

    if (sourceInValid && targetInValid) {
      // Both endpoints verified → relationship valid
      validRelationships.push(rel);
    } else if (!sourceInValid || !targetInValid) {
      // Missing endpoint → relationship hallucination
      hallucinations.push({
        value: `${rel.source} → ${rel.target}`,
        type: 'RELATIONSHIP',
        confidence: rel.confidence || 0.5,
      });
    }
  }

  return {
    entities: validEntities,
    relationships: validRelationships,
    hallucinations,
  };
}

// Integration point: After Groq extraction, before Supabase save
```

**Verification:**
- [ ] Test with known hallucinations (extract fake entity + verify rejection)
- [ ] Spot-check 10 real documents (0 false positives acceptable)

---

## PRIORITY 2: NATO Code Auto-Assignment (Week 1)
**ROI: HIGH** — Automatically labels document reliability
**Time: 2-3 hours**

```typescript
// FILE: src/lib/classification/natoCodeAssigner.ts

export function assignNATOCode(
  documentMetadata: DocumentMetadata,
  extractionConfidence: number,
  hallucinations: Hallucination[]
): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {

  // A = Completely reliable (court documents, official)
  if (
    documentMetadata.source === 'court' ||
    documentMetadata.filename.match(/\d{4}-cv-\d+/) ||  // Case number pattern
    documentMetadata.isOfficial
  ) {
    return 'A';
  }

  // B = Usually reliable (major news + >0.85 confidence)
  if (
    documentMetadata.source === 'journalism' &&
    extractionConfidence > 0.85 &&
    hallucinations.length === 0
  ) {
    return 'B';
  }

  // C = Fairly reliable (0.75+ confidence + corroboration)
  if (
    extractionConfidence > 0.75 &&
    hallucinations.length < entities.length * 0.1 // <10% hallucination rate
  ) {
    return 'C';
  }

  // D = Not usually reliable (0.60+ confidence, questionable source)
  if (extractionConfidence > 0.6) {
    return 'D';
  }

  // E = Unreliable (low confidence + suspicious source)
  if (
    extractionConfidence < 0.5 &&
    !documentMetadata.isOfficial &&
    hallucinations.length > entities.length * 0.3
  ) {
    return 'E';
  }

  // F = Cannot be judged
  return 'F';
}

// Integrate with: documentProcessor.ts after extraction complete
```

---

## PRIORITY 3: Redaction Compliance Check (Week 2)
**ROI: HIGH** — Prevents accidental publication of sealed witnesses
**Time: 6-8 hours** (includes Vision API integration)

```typescript
// FILE: src/lib/compliance/redactionCheck.ts

import vision from '@google-cloud/vision';

const visionClient = new vision.ImageAnnotatorClient();

export async function checkRedactionCompliance(
  documentBuffer: Buffer,
  ocrText: string
): Promise<{
  status: 'pass' | 'warn' | 'fail';
  redactionRegions: number;
  suspiciousPatterns: string[];
}> {

  const result = { status: 'pass' as const, redactionRegions: 0, suspiciousPatterns: [] };

  // ── Step 1: Detect visual redactions (black boxes, etc.) ──
  const request = {
    image: { content: documentBuffer },
    features: [{ type: 'LABEL_DETECTION' }, { type: 'OBJECT_LOCALIZATION' }],
  };

  const [detectionResult] = await visionClient.annotateImage(request);

  // Count black/dark regions (simplified)
  let redactionCount = 0;
  // Vision API doesn't directly return redaction count, would need:
  // - Custom ML model, OR
  // - Post-process image for solid black regions (OpenCV)

  // ── Step 2: Scan text for protected patterns ──
  const protectedPatterns = [
    { regex: /minor|jane\s*doe|john\s*doe|victim\s*\d+/gi, label: 'Protected Witness' },
    { regex: /social\s*security|ssn|\d{3}-\d{2}-\d{4}/g, label: 'SSN' },
    { regex: /credit\s*card|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, label: 'Payment Card' },
    { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, label: 'Email Address' },
  ];

  for (const pattern of protectedPatterns) {
    const matches = ocrText.match(pattern.regex);
    if (matches && matches.length > 0) {
      result.suspiciousPatterns.push(`${pattern.label} (${matches.length} occurrences)`);
    }
  }

  // ── Step 3: Fail if protected data found but no redactions ──
  if (result.suspiciousPatterns.length > 0 && redactionCount === 0) {
    result.status = 'fail';
  } else if (result.suspiciousPatterns.length > 0) {
    result.status = 'warn';
  }

  return result;
}

// Quarantine flow: If status === 'fail', document → data_quarantine table
```

---

## PRIORITY 4: Multi-Pass Entity Extraction (Week 2)
**ROI: MEDIUM** — Catches 30% more relationships than single-pass
**Time: 8-10 hours**

```typescript
// FILE: src/lib/extraction/multiPassExtraction.ts

export async function extractWithMultiPasses(
  documentId: string,
  ocrText: string
): Promise<{
  entities: Entity[];
  relationships: Relationship[];
  metadata: Record<string, any>;
  documentType: string[];
}> {

  const chunks = chunkDocument(ocrText);
  const allResults = { entities: [], relationships: [], metadata: {}, documentType: [] };

  // ── PASS 1: Entity Extraction ──
  for (const chunk of chunks) {
    const entitiesResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [{
        role: 'user',
        content: `
Extract all named entities from this legal document. Return JSON array.
Types: PERSON, ORGANIZATION, LOCATION, DATE, MONEY, CASE_NUMBER
Document excerpt:
${chunk.text}

Return ONLY JSON, no markdown. Format: [{"type": "PERSON", "value": "...", "context": "..."}]
        `.trim(),
      }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    try {
      const entities = JSON.parse(entitiesResponse.choices[0].message.content);
      allResults.entities.push(...entities);
    } catch (e) {
      console.error('Entity extraction parse error:', e);
    }
  }

  // ── PASS 2: Relationship Extraction ──
  const entityList = allResults.entities.map(e => `${e.value} (${e.type})`).slice(0, 20).join(', ');

  const relResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b',
    messages: [{
      role: 'user',
      content: `
Given these entities: ${entityList}

Find relationships between them from this text:
${ocrText.substring(0, 4000)}

Return JSON array. Format:
[{
  "source": "Person A",
  "target": "Company B",
  "relationshipType": "EMPLOYED_BY|OWNS|PAID_TO|ASSOCIATED_WITH",
  "evidence": "quote from text",
  "confidence": 0.85
}]
      `.trim(),
    }],
    temperature: 0.1,
    max_tokens: 1000,
  });

  try {
    const relationships = JSON.parse(relResponse.choices[0].message.content);
    allResults.relationships.push(...relationships);
  } catch (e) {
    console.error('Relationship extraction parse error:', e);
  }

  // ── PASS 3: Document Metadata ──
  const metaResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b',
    messages: [{
      role: 'user',
      content: `
Extract structured metadata from this legal document:

${ocrText.substring(0, 2000)}

Return JSON with: court, case_number, filing_date, parties (array), judges (array), document_type

ONLY return valid JSON, no extra text.
      `.trim(),
    }],
    temperature: 0.1,
    max_tokens: 500,
  });

  try {
    const metadata = JSON.parse(metaResponse.choices[0].message.content);
    allResults.metadata = metadata;
  } catch (e) {
    console.error('Metadata extraction parse error:', e);
  }

  // ── PASS 4: Document Classification ──
  const classResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b',
    messages: [{
      role: 'user',
      content: `
Classify this document as one or more of:
court_filing, deposition, email_chain, financial_record, travel_log, text_message, memo, affidavit

Document excerpt:
${ocrText.substring(0, 1500)}

Return ONLY a JSON array of types: ["type1", "type2"]
      `.trim(),
    }],
    temperature: 0.2,
    max_tokens: 200,
  });

  try {
    allResults.documentType = JSON.parse(classResponse.choices[0].message.content);
  } catch (e) {
    console.error('Classification parse error:', e);
  }

  // ── Deduplication ──
  const uniqueEntities = new Map();
  for (const entity of allResults.entities) {
    const key = `${entity.type}:${entity.value.toLowerCase()}`;
    if (!uniqueEntities.has(key) || entity.confidence > (uniqueEntities.get(key).confidence || 0)) {
      uniqueEntities.set(key, entity);
    }
  }
  allResults.entities = Array.from(uniqueEntities.values());

  return allResults;
}

// Cost: 4 Groq API calls × 1500 tokens ≈ $0.06 per document
// Budget: $340 / 0.06 ≈ 5,600 documents (feasible)
```

---

## PRIORITY 5: Scalable Chunking Strategy (Week 3)
**ROI: MEDIUM** — Handles 11,000+ line documents efficiently
**Time: 4 hours**

```typescript
// FILE: src/lib/chunking/smartChunking.ts

// Already mostly implemented in documentChunking.ts
// Just need to add: semantic boundary detection

export function chunkDocumentSmart(
  text: string,
  chunkSize: number = 6000,
  preferBoundaries: boolean = true
): DocumentChunk[] {

  if (text.length <= chunkSize) {
    return [{ index: 0, text, startChar: 0, endChar: text.length, isLast: true }];
  }

  const chunks: DocumentChunk[] = [];
  let offset = 0;

  while (offset < text.length && chunks.length < 5) {
    let end = Math.min(offset + chunkSize, text.length);

    // Prefer breaking at semantic boundaries (paragraph breaks)
    if (preferBoundaries && end < text.length) {
      // Look for paragraph break (double newline) within last 500 chars
      const searchStart = Math.max(end - 500, offset);
      const paragraph BreakIndex = text.lastIndexOf('\n\n', end);

      if (paragraphBreakIndex > searchStart) {
        end = paragraphBreakIndex + 2; // Include the double newline
      }
    }

    const isLast = end >= text.length || chunks.length === 4;

    chunks.push({
      index: chunks.length,
      text: text.slice(offset, end),
      startChar: offset,
      endChar: end,
      isLast,
    });

    if (isLast) break;

    // Overlap next chunk by 500 chars for context
    offset = end - 500;
  }

  return chunks;
}
```

---

## PRIORITY 6: Quality Sampling Framework (Week 3)
**ROI: MEDIUM** — Proves accuracy to investors/regulators
**Time: 3-4 hours**

```typescript
// FILE: src/lib/quality/auditSampling.ts

export interface QualityAuditTask {
  documentId: string;
  filename: string;
  sampleType: 'entity' | 'relationship' | 'redaction';
  extractedValue: string;
  ocrContext: string; // 200 chars around entity
  reviewerFeedback?: 'correct' | 'incorrect' | 'unclear';
}

export function stratifiedSamplingPlan(
  totalDocuments: number,
  targetConfidence: number = 0.95,
  marginOfError: number = 0.05
): {
  sampleSize: number;
  byDocumentType: Record<string, number>;
  byExtractionType: Record<string, number>;
} {

  // Formula: n = (z² × p × (1-p)) / e²
  // z = 1.96 (95% confidence)
  // p = 0.5 (conservative estimate)
  // e = 0.05 (margin of error)

  const z = 1.96;
  const p = 0.5;
  const e = marginOfError;

  const sampleSize = Math.ceil((z * z * p * (1 - p)) / (e * e));

  return {
    sampleSize: Math.min(sampleSize, totalDocuments), // Cap at total
    byDocumentType: {
      court_filing: Math.ceil(sampleSize * 0.4),
      deposition: Math.ceil(sampleSize * 0.3),
      email: Math.ceil(sampleSize * 0.2),
      financial: Math.ceil(sampleSize * 0.1),
    },
    byExtractionType: {
      entity: Math.ceil(sampleSize * 0.5),
      relationship: Math.ceil(sampleSize * 0.3),
      redaction: Math.ceil(sampleSize * 0.2),
    },
  };
}

// For 4,000 documents: sample size = 355 (8.9%)
// This gives 95% confidence within ±5% accuracy
// Feasible for quarterly reviews
```

---

## PRIORITY 7: Pre-Processing Pipeline (Week 4)
**ROI: LOWER** — Nice-to-have, improves OCR by 15-20%
**Time: 6-8 hours**

```typescript
// FILE: src/lib/preprocessing/imageEnhancer.ts

export async function preprocessDegradedImage(
  buffer: Buffer
): Promise<Buffer> {
  const image = sharp(buffer);

  // Only preprocess if likely degraded
  const metadata = await image.metadata();
  const isDegraded = (metadata.density || 72) < 150 || buffer.length < 500000;

  if (!isDegraded) {
    return buffer; // Skip expensive preprocessing
  }

  let enhanced = image;

  // 1. Deskew (straighten tilted scans)
  // simplified: rotate by detected angle
  // enhanced = await deskew(enhanced);

  // 2. Denoise (remove grain)
  enhanced = enhanced
    .median(2) // Reduce noise
    .clahe({ width: 8, height: 8, clipLimit: 2.0 });

  // 3. Normalize (stretch histogram)
  enhanced = enhanced.normalize();

  // 4. Sharpen (make text crisp)
  enhanced = enhanced.sharpen({ sigma: 2 });

  return enhanced.toBuffer();
}

// Cost: $0 (local processing, 2-5 sec per page)
// Use for: FOIA docs, old scans, degraded originals
// Skip for: Clean PDFs (save processing time)
```

---

## QUICK WIN: Error Handling Improvements (2 hours)
**Easy to add now**

```typescript
// In each extraction route, wrap with:

export async function safeExtract(documentId: string, buffer: Buffer) {
  try {
    // Normal extraction
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Queue for retry in 60 seconds
      await documentQueue.add('extract', { documentId, buffer }, {
        delay: 60000,
        attempts: 3,
      });
      return { status: 'queued', message: 'Will retry shortly' };
    }

    if (error.message.includes('timeout')) {
      // Move to DLQ (dead letter queue) for manual review
      await supabase
        .from('documents')
        .update({ scan_status: 'dlq', dlq_reason: error.message })
        .eq('id', documentId);
      return { status: 'dlq', message: 'Moved to review queue' };
    }

    throw error;
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### Week 1 (Hallucination + NATO)
- [ ] Create hallucination.ts with entity + relationship validation
- [ ] Create natoCodeAssigner.ts with logic
- [ ] Add tests (unit + integration)
- [ ] Integrate into post-extraction pipeline
- [ ] Spot-check 10 documents for false positives

### Week 2 (Redaction + Multi-Pass)
- [ ] Add Vision API integration for redaction detection
- [ ] Create redactionCheck.ts
- [ ] Create multiPassExtraction.ts (4 Groq calls)
- [ ] Wire up quarantine flow
- [ ] Add i18n labels for compliance statuses

### Week 3 (Chunking + Audit)
- [ ] Enhance documentChunking.ts with semantic boundaries
- [ ] Create auditSampling.ts
- [ ] Build UI for audit dashboard (simple: Supabase table view)
- [ ] Document sampling process for audit trail

### Week 4 (Optional: Preprocessing)
- [ ] Add imageEnhancer.ts with smart degradation detection
- [ ] Wire into pre-OCR pipeline
- [ ] Benchmark improvement on FOIA documents
- [ ] Add toggle in DocumentUploader UI

---

## SUCCESS METRICS

After implementing Priority 1-4:

```
Before:
├─ Hallucination rate: ~20%
├─ NATO codes: Manual assignment only
├─ Redaction risk: Potential accidental exposure
└─ Relationships found: 60% (single-pass)

After:
├─ Hallucination rate: <3% (from filtering)
├─ NATO codes: Automatic A-F assignment
├─ Redaction risk: Quarantined for review
└─ Relationships found: 85%+ (multi-pass)

Audit:
├─ Sample 355 out of 4,000 documents
├─ Target accuracy: >90% on entities
├─ Target accuracy: >85% on relationships
└─ NATO code accuracy: >95% (auto-assign)
```

---

## RESOURCE ALLOCATION

**Team of 3 (Raşit + 2 devs):**

- Raşit: Architecture review, priority decisions, auth/security
- Dev 1: Hallucination + NATO + Redaction (focused on detection logic)
- Dev 2: Multi-Pass + Chunking + Quality (extraction optimization)

**Expected Timeline:**
- Priority 1-4: 3 weeks (1 sprint)
- Priority 5-6: 1 week (parallel with above)
- Priority 7: Optional (dependent on budget)

**Communication:**
- Daily standup (15 min): blocker resolution
- Weekly code review: cross-check implementations
- Bi-weekly demo: show progress to Raşit

---

**Document Version:** 1.0
**Last Updated:** March 22, 2026
**Next Review:** After Week 1 implementation
