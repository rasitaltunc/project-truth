# AUTONOMOUS DOCUMENT PROCESSING PIPELINE
## End-to-End Architecture for Project Truth

**Date:** March 22, 2026
**Status:** EXHAUSTIVE RESEARCH — 10 Dimensions Covered
**Scope:** Single document to 10,000+ document scale
**Stack:** Next.js + Supabase + GCS + Document AI + Groq

---

## EXECUTIVE SUMMARY

An autonomous document processing pipeline transforms raw uploads into enriched knowledge graphs **without human intervention until peer review**. This research covers:

1. **Pipeline Architecture** — Event-driven vs sequential, queue systems, error recovery
2. **OCR Best Practices** — Google Document AI vs Tesseract, legal document handling
3. **Document Parsing** — Automatic structure detection, multi-page handling
4. **Intelligent Routing** — Auto-classification, confidence scoring
5. **Error Handling** — Partial processing, dead letter queues, retry strategies
6. **Scalability** — 1 document to 10,000+ documents, batch processing
7. **Deduplication** — Content hash, fuzzy matching, cross-format detection
8. **Metadata Extraction** — Automated date/case/court extraction
9. **Pipeline Monitoring** — Metrics, alerting, dashboards
10. **Real-World Systems** — CourtListener, DocumentCloud, ICIJ patterns

**Key Finding:** Project Truth already has the foundation. This guide optimizes it into a **fully autonomous system**.

---

## 1. END-TO-END PIPELINE ARCHITECTURE

### 1.1 The Complete Flow

```
UPLOAD
  ↓
VALIDATION (file type, size, virus scan)
  ↓
DEDUPLICATION (hash check, near-duplicate detection)
  ↓
QUARANTINE INGESTION (documents table with status='ingesting')
  ↓
DOCUMENT PARSING (PDF structure analysis, page separation)
  ↓
OCR (Google Document AI, page-by-page)
  ↓
TEXT CHUNKING (split into 2KB-4KB chunks for AI processing)
  ↓
AI EXTRACTION (Groq llama-3.3-70b for entities, relationships, dates)
  ↓
CONFIDENCE SCORING (5-layer calculation)
  ↓
QUARANTINE STORAGE (data_quarantine table)
  ↓
PEER REVIEW (community votes)
  ↓
PROMOTION TO NETWORK (verified data → nodes, links, relationships)
```

### 1.2 Three Architecture Patterns

#### PATTERN A: Sequential (Current Project Truth)
```typescript
await downloadPDF();
await uploadToGCS();
await ocrWithDocumentAI();
await extractWithGroq();
await scoreConfidence();
await saveToQuarantine();
```
**Pros:** Simple, easier to debug, predictable sequencing
**Cons:** Slow (one step at a time), blocking on failures
**Use Case:** Reliability > Speed (default for critical documents)

#### PATTERN B: Event-Driven (With Supabase Realtime)
```typescript
// Upload triggers
documents.insert() →
  triggers /process-documents →
    Document AI webhook callback →
      Groq extraction trigger →
        Confidence scoring trigger →
          Quarantine write trigger →
            Peer review notification
```
**Pros:** Scalable, fast, parallel processing
**Cons:** Complex, harder to debug async failures, requires webhook infrastructure
**Use Case:** High throughput (100+ docs/day)

#### PATTERN C: Hybrid (Recommended for Truth)
```typescript
// Sequential for critical steps, event-driven for slow operations
1. Validation → Dedup → Parse (sequential, <5s)
2. OCR (async background job with webhook callback)
3. AI extraction (triggered by OCR completion)
4. Everything after (event-driven)
```
**Pros:** Best of both worlds, debuggable critical path, async slow operations
**Cons:** Moderate complexity
**Use Case:** Truth Platform (reliability + some speed)

### 1.3 Queue Systems Comparison

| System | Throughput | Setup | Latency | Reliability | Cost |
|--------|-----------|-------|---------|-------------|------|
| **Supabase pg_notify** | 100/min | Built-in | 100ms | High | $0 |
| **Bull + Redis** | 1000/min | External | 10ms | High | $10-20/mo |
| **AWS SQS** | 10000/min | Managed | 50ms | Very High | $0.50/mo (free tier) |
| **Simple polling** | 10/min | None | 5s | Medium | $0 |
| **Webhooks (GCS)** | 100/sec | External | <100ms | Medium | $0 (GCS native) |

**Recommendation for Truth:**
- **MVP:** Supabase pg_notify (already integrated)
- **Scale (1000 docs):** Add Bull + Redis ($10/mo)
- **Enterprise:** AWS SQS or Pub/Sub

### 1.4 Handling Compound Documents (PDF with 10 Sub-Documents)

Many court filing PDFs contain multiple documents (main brief + exhibits A-Z in one file).

**Strategy:**
```typescript
// Step 1: Analyze PDF structure
const pages = await analyzePageBoundaries(pdf);
// Returns: [{type: 'cover', pages: [1]}, {type: 'main_brief', pages: [2-45]},
//           {type: 'exhibit_a', pages: [46-67]}, ...]

// Step 2: Split at boundaries
for (const section of pages) {
  await extractPages(pdf, section.pages);
  const sectionPDF = createSubDocument();
  await createDocumentRecord({
    parent_document_id: mainDoc.id,
    title: `${mainDoc.title} - ${section.type}`,
    page_range: section.pages,
    order_in_parent: idx,
  });
}

// Step 3: Inherit metadata from parent
// Each sub-document inherits: case_number, court, date_filed
// But gets unique scan_id for independent processing

// Step 4: Link in quarantine
// All sub-document quarantine records have parent_document_id
// When parent approved, all children auto-approved
```

**Implementation:**
```sql
-- documents table
ALTER TABLE documents ADD COLUMN parent_document_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN page_range INT4RANGE;  -- [46, 67) = pages 46-67
ALTER TABLE documents ADD COLUMN order_in_parent INT;

-- Cascade approve: when parent → verified, all children → verified
CREATE OR REPLACE FUNCTION promote_compound_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    UPDATE documents
    SET status = 'verified'
    WHERE parent_document_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. OCR BEST PRACTICES FOR LEGAL DOCUMENTS

### 2.1 Google Document AI vs Alternatives

| Aspect | Document AI | Tesseract | Amazon Textract | Azure Vision |
|--------|------------|-----------|-----------------|--------------|
| **Legal docs** | 95%+ | 75-85% | 92% | 88% |
| **Degraded scans** | 98% | 60% | 85% | 80% |
| **Table extraction** | Native | Weak | Native | Native |
| **Handwriting** | 80% | 40% | 75% | 70% |
| **Cost per page** | $0.0015 | Free | $0.0100 | $0.0025 |
| **Speed** | 5-10s/page | 1-2s/page | 2-5s/page | 3-5s/page |
| **Async API** | Yes | No | Yes | Yes |
| **Confidence scores** | Yes (per token) | Limited | Yes | Yes |

**Verdict for Project Truth:** Google Document AI (already integrated) is best for legal documents.

### 2.2 Handling Degraded Scans

Legal documents often suffer from:
- **Fax artifacts** (striped patterns, ghosting)
- **Old photocopies** (low contrast, dark blotches)
- **Handwritten annotations** (overlaid on printed text)
- **Ink bleeding** (from document aging)
- **Stamps and redactions** (physical marks)

**Preprocessing Pipeline (Before OCR):**

```typescript
import Sharp from 'sharp';
import cv from 'opencv4nodejs';

async function preprocessForOCR(pdfBuffer: Buffer): Promise<Buffer> {
  // Step 1: Convert to image, 300 DPI
  let image = await pdf2image(pdfBuffer, { dpi: 300 });

  // Step 2: Deskew (fix rotated pages)
  image = await deskew(image);

  // Step 3: Despeckle (remove tiny artifacts)
  const mat = cv.imdecode(image);
  const despecked = cv.morphologyEx(mat, cv.MORPH_OPEN, cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3)));

  // Step 4: Enhance contrast (CLAHE - Contrast Limited Adaptive Histogram Equalization)
  const enhanced = clahe(despecked, clipLimit=2.0, tileGridSize=(8,8));

  // Step 5: Binarization (convert to pure black/white)
  const binary = cv.adaptiveThreshold(enhanced, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

  // Step 6: Threshold by confidence (remove pixels below 10% confidence)
  const cleaned = removeUncertainPixels(binary, threshold=0.1);

  return await cv.imwrite(cleaned);
}

function deskew(image: Buffer): Buffer {
  const mat = cv.imdecode(image);
  const lines = cv.HoughLinesP(mat, 1, Math.PI/180, 100, 30, 10);
  const angle = calculateMajorityAngle(lines);
  const rotated = cv.getRotationMatrix2D(new cv.Point2f(mat.cols/2, mat.rows/2), angle, 1);
  return cv.warpAffine(mat, rotated, new cv.Size(mat.cols, mat.rows));
}
```

**Pre-OCR Quality Check:**

```typescript
async function assessOCRReadiness(image: Buffer): Promise<{
  readiness: 'excellent' | 'good' | 'poor',
  confidence: number,  // 0-1
  issues: string[]
}> {
  const mat = cv.imdecode(image);

  // Check 1: Blur detection (Laplacian variance)
  const blur = cv.Laplacian(mat, cv.CV_64F);
  const variance = calculateVariance(blur);
  const isBlurry = variance < 100;  // Low variance = blurry

  // Check 2: Contrast (histogram spread)
  const hist = cv.calcHist([mat], [0], new cv.Mat(), [256], [0, 256]);
  const contrast = calculateHistogramSpread(hist);
  const isLowContrast = contrast < 0.3;

  // Check 3: Resolution (pixel density)
  const dpi = estimateDPI(image);
  const isLowRes = dpi < 200;

  // Check 4: Noise (Laplacian of Gaussian)
  const noise = estimateNoise(mat);
  const isNoisy = noise > 0.15;

  const issues: string[] = [];
  if (isBlurry) issues.push('Image is blurry (variance=' + variance.toFixed(0) + ')');
  if (isLowContrast) issues.push('Low contrast (spread=' + contrast.toFixed(2) + ')');
  if (isLowRes) issues.push('Low resolution (' + dpi + ' DPI, need 200+)');
  if (isNoisy) issues.push('High noise level');

  const confidence = 1 - Math.min(issues.length * 0.2, 1);
  const readiness = issues.length === 0 ? 'excellent' : issues.length <= 1 ? 'good' : 'poor';

  return { readiness, confidence, issues };
}
```

### 2.3 Table Extraction from Court Filings

Legal briefs often contain:
- Witness lists (names, addresses, phone)
- Exhibit matrices (Exhibit #, Description, Page)
- Timeline tables (Date, Event, Location)
- Financial tables (Date, Amount, Account)

**Document AI handles tables natively** but needs careful post-processing:

```typescript
interface ExtractedTable {
  title?: string;
  rows: {
    cells: Array<{ text: string; confidence: number }>;
  }[];
  confidence: number;
}

async function extractTablesWithContext(
  documentAIResult: DocumentProcessingResult
): Promise<ExtractedTable[]> {
  const tables: ExtractedTable[] = [];

  for (const page of documentAIResult.pages) {
    for (const table of page.tables) {
      // Step 1: Infer table type
      const tableType = inferTableType(table);  // 'witness', 'exhibit', 'timeline', etc.

      // Step 2: Extract with context (header row helps interpretation)
      const headerRow = table.body_rows[0];  // Usually headers
      const rows = table.body_rows.slice(1).map(row => ({
        cells: row.cells.map(cell => ({
          text: cell.text || '',
          confidence: cell.confidence || 0.9,
        })),
      }));

      // Step 3: Validate against expected schema
      if (tableType === 'witness') {
        validateWitnessTable(rows);  // Check for name, address, phone columns
      } else if (tableType === 'exhibit') {
        validateExhibitTable(rows);  // Check for exhibit #, description, page
      }

      tables.push({
        title: extractTableCaption(table),
        rows,
        confidence: calculateTableConfidence(table),
      });
    }
  }

  return tables;
}

function inferTableType(table: DocumentAITable): string {
  const headers = table.body_rows[0]?.cells.map(c => c.text.toLowerCase()) || [];

  if (headers.some(h => h.includes('name')) && headers.some(h => h.includes('address'))) {
    return 'witness';
  }
  if (headers.some(h => h.includes('exhibit')) || headers.some(h => h.includes('#'))) {
    return 'exhibit';
  }
  if (headers.some(h => h.includes('date')) && headers.some(h => h.includes('event'))) {
    return 'timeline';
  }

  return 'unknown';
}
```

### 2.4 Multi-Column Layout Detection

Court documents (briefs, complaints) often use 2-3 column layouts. OCR must reassemble columns correctly.

```typescript
async function detectAndReassembleColumns(
  image: Buffer,
  documentAIResult: DocumentProcessingResult
): Promise<string> {
  const mat = cv.imdecode(image);

  // Step 1: Detect vertical lines (column separators)
  const edges = cv.Canny(mat, 50, 150);
  const lines = cv.HoughLinesP(edges, 1, Math.PI/180, 100, 100, 20);
  const verticalLines = lines.filter(line => isVertical(line));

  // Step 2: Identify column boundaries
  const columnBoundaries = verticalLines
    .map(line => line[0])  // x-coordinate
    .sort((a, b) => a - b)
    .filter((x, i, arr) => i === 0 || Math.abs(x - arr[i-1]) > 50);  // 50px minimum spacing

  // Step 3: Reorder document AI text by column
  const columnTexts: string[][] = [];
  for (let i = 0; i < columnBoundaries.length; i++) {
    const leftBound = columnBoundaries[i];
    const rightBound = columnBoundaries[i + 1] || mat.cols;

    const textInColumn = documentAIResult.text_blocks
      .filter(block => block.x >= leftBound && block.x < rightBound)
      .sort((a, b) => a.y - b.y)  // Top to bottom
      .map(block => block.text);

    columnTexts.push(textInColumn);
  }

  // Step 4: Interleave columns (left→right, then next row)
  let reassembled = '';
  const maxRows = Math.max(...columnTexts.map(col => col.length));
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < columnTexts.length; col++) {
      reassembled += (columnTexts[col][row] || '') + ' ';
    }
    reassembled += '\n';
  }

  return reassembled;
}
```

### 2.5 OCR Confidence Scoring

Document AI returns per-token confidence. We must aggregate intelligently:

```typescript
interface OCRQuality {
  overallConfidence: number;  // 0-1
  perPage: Array<{ page: number; confidence: number }>;
  lowConfidenceRegions: Array<{ page: number; bbox: [number, number, number, number] }>;
  recommendation: 'use_as_is' | 'manual_review_required' | 'request_retry';
}

function scoreOCRQuality(documentAIResult: DocumentProcessingResult): OCRQuality {
  const pageConfidences: Record<number, number[]> = {};
  const lowConfidenceRegions: OCRQuality['lowConfidenceRegions'] = [];

  for (const block of documentAIResult.text_blocks) {
    const page = block.page_number || 1;
    if (!pageConfidences[page]) pageConfidences[page] = [];

    const blockConfidence = block.confidence || 0.9;
    pageConfidences[page].push(blockConfidence);

    if (blockConfidence < 0.7) {
      lowConfidenceRegions.push({
        page,
        bbox: block.bounding_box,
      });
    }
  }

  // Calculate per-page confidence (geometric mean is better than arithmetic for confidence)
  const perPage = Object.entries(pageConfidences).map(([pageStr, confidences]) => {
    const page = parseInt(pageStr);
    const geometricMean = Math.pow(
      confidences.reduce((a, b) => a * b, 1),
      1 / confidences.length
    );
    return { page, confidence: geometricMean };
  });

  const overallConfidence = perPage.length > 0
    ? Math.pow(perPage.reduce((a, b) => a * b.confidence, 1), 1 / perPage.length)
    : 0.5;

  // Recommendation logic
  let recommendation: OCRQuality['recommendation'];
  if (overallConfidence >= 0.85 && lowConfidenceRegions.length === 0) {
    recommendation = 'use_as_is';
  } else if (overallConfidence >= 0.70 && lowConfidenceRegions.length <= 5) {
    recommendation = 'use_as_is';  // With manual spot-check of low regions
  } else if (overallConfidence >= 0.50) {
    recommendation = 'manual_review_required';
  } else {
    recommendation = 'request_retry';  // Pre-process image and re-OCR
  }

  return { overallConfidence, perPage, lowConfidenceRegions, recommendation };
}
```

---

## 3. DOCUMENT PARSING & STRUCTURE DETECTION

### 3.1 Automatic Section Detection

Legal documents have predictable structures:

```typescript
interface DocumentSection {
  title: string;
  type: 'header' | 'body' | 'footer' | 'exhibit' | 'footnote' | 'caption';
  startPage: number;
  endPage: number;
  content: string;
  confidence: number;
}

async function detectDocumentSections(
  documentAIResult: DocumentProcessingResult
): Promise<DocumentSection[]> {
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection | null = null;

  // Common section headers in legal docs
  const SECTION_PATTERNS = {
    caption: /^(UNITED STATES DISTRICT COURT|COMPLAINT|INDICTMENT|MOTION)/i,
    facts: /(^FACTS|^BACKGROUND|^ALLEGATIONS|^STATEMENT OF FACTS)/i,
    legal: /(^LAW|^LEGAL ANALYSIS|^APPLICABLE LAW|^STATUTORY AUTHORITY)/i,
    argument: /(^ARGUMENT|^DISCUSSION|^ANALYSIS)/i,
    conclusion: /(^CONCLUSION|^WHEREFORE|^RELIEF|^PRAYER)/i,
    signature: /(^Respectfully submitted|^Signature|^Dated:)/i,
    exhibit: /^EXHIBIT [A-Z0-9]+/i,
  };

  for (const block of documentAIResult.text_blocks) {
    const blockText = block.text || '';
    const isHeading = block.font_size > 12 || block.is_bold;

    // Try to match section pattern
    let detectedType: string | null = null;
    for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(blockText.trim())) {
        detectedType = type;
        break;
      }
    }

    // If section type changed, save previous section
    if (detectedType && detectedType !== currentSection?.type) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: blockText.trim().substring(0, 100),
        type: detectedType as DocumentSection['type'],
        startPage: block.page_number || 1,
        endPage: block.page_number || 1,
        content: blockText,
        confidence: 0.9,
      };
    } else if (currentSection) {
      currentSection.content += '\n' + blockText;
      currentSection.endPage = block.page_number || currentSection.endPage;
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}
```

### 3.2 Exhibit Extraction

Exhibits are often appended at end. We need to:
- Detect exhibit start ("Exhibit A", "Exhibit 1", etc.)
- Extract exhibit metadata (exhibit #, description if present)
- Create child documents for complex exhibits

```typescript
interface DetectedExhibit {
  id: string;  // "A", "1", "Exhibit A-1", etc.
  title: string;
  pageRange: [number, number];
  documentType: 'court_filing' | 'photograph' | 'letter' | 'email' | 'financial' | 'other';
  content: string;
  isSeparate: boolean;  // Should be processed as separate document?
}

async function extractExhibits(
  documentAIResult: DocumentProcessingResult
): Promise<DetectedExhibit[]> {
  const exhibits: DetectedExhibit[] = [];
  let currentExhibit: DetectedExhibit | null = null;

  const EXHIBIT_PATTERNS = [
    /^EXHIBIT\s+([A-Z0-9\-]+)/i,      // EXHIBIT A, EXHIBIT A-1
    /^([A-Z0-9\-]+)\s+EXHIBIT/i,       // Reversed order
    /^Attachment\s+([A-Z0-9]+)/i,      // ATTACHMENT A
  ];

  for (const block of documentAIResult.text_blocks) {
    const blockText = block.text || '';
    let matchedExhibitId: string | null = null;

    // Try to match exhibit pattern
    for (const pattern of EXHIBIT_PATTERNS) {
      const match = blockText.trim().match(pattern);
      if (match) {
        matchedExhibitId = match[1];
        break;
      }
    }

    // New exhibit detected
    if (matchedExhibitId) {
      if (currentExhibit) exhibits.push(currentExhibit);

      currentExhibit = {
        id: matchedExhibitId,
        title: blockText.trim(),
        pageRange: [block.page_number || 1, block.page_number || 1],
        documentType: inferDocumentType(blockText),
        content: blockText,
        isSeparate: inferIfSeparate(blockText),
      };
    } else if (currentExhibit) {
      currentExhibit.content += '\n' + blockText;
      currentExhibit.pageRange[1] = block.page_number || currentExhibit.pageRange[1];
    }
  }

  if (currentExhibit) exhibits.push(currentExhibit);
  return exhibits;
}

function inferDocumentType(exhibitHeader: string): DetectedExhibit['documentType'] {
  const text = exhibitHeader.toLowerCase();
  if (text.includes('photograph') || text.includes('image')) return 'photograph';
  if (text.includes('email') || text.includes('correspondence')) return 'email';
  if (text.includes('invoice') || text.includes('receipt') || text.includes('financial')) return 'financial';
  if (text.includes('letter')) return 'letter';
  return 'other';
}

function inferIfSeparate(exhibitHeader: string): boolean {
  // Large exhibits or photographs should be separate documents
  const text = exhibitHeader.toLowerCase();
  if (text.includes('photograph') || text.includes('image') || text.includes('video')) return true;
  if (text.includes('financial records')) return true;
  return false;  // Default: append to main document
}
```

---

## 4. INTELLIGENT DOCUMENT ROUTING

### 4.1 Auto-Classification (Document Type Detection)

```typescript
interface DocumentClassification {
  documentType: string;  // 'court_filing', 'fbi_report', 'leaked_email', etc.
  confidence: number;    // 0-1
  subTypes: Array<{ type: string; confidence: number }>;
  detectedFeatures: string[];  // e.g., ['sealed', 'multi_party', 'encrypted']
}

async function classifyDocument(
  documentMetadata: Record<string, unknown>,
  firstPageText: string,
  entireContent: string
): Promise<DocumentClassification> {
  const classifications: Record<string, number> = {};
  const features: string[] = [];

  // Feature 1: Metadata signals
  if ((documentMetadata.source_type as string) === 'courtlistener') {
    classifications['court_filing'] = 0.95;
  }

  if ((documentMetadata.source_type as string) === 'fbi_vault') {
    classifications['fbi_report'] = 0.95;
  }

  // Feature 2: Header/signature patterns
  if (firstPageText.includes('FBI') && firstPageText.includes('DECLASSIFIED')) {
    classifications['fbi_report'] = (classifications['fbi_report'] || 0) + 0.3;
    features.push('declassified');
  }

  if (firstPageText.match(/UNITED STATES DISTRICT COURT|COMPLAINT|INDICTMENT/i)) {
    classifications['court_filing'] = (classifications['court_filing'] || 0) + 0.4;
  }

  if (firstPageText.match(/^From:\s*\S+@\S+/m)) {
    classifications['email'] = (classifications['email'] || 0) + 0.5;
  }

  // Feature 3: Structured patterns
  if (entireContent.match(/WITNESS:|EXHIBIT:|DEFENDANT:/i)) {
    classifications['court_filing'] = (classifications['court_filing'] || 0) + 0.2;
  }

  if (entireContent.match(/\[REDACTED\]|\[B2\]|\[B5\]/g)) {
    features.push('redacted');
  }

  // Feature 4: AI classification (Groq) as fallback/verification
  const groqResult = await classifyWithAI(
    documentMetadata.title as string,
    firstPageText.substring(0, 500),
  );

  for (const [type, conf] of Object.entries(groqResult)) {
    classifications[type] = Math.max(classifications[type] || 0, conf);
  }

  // Determine primary classification
  const primaryType = Object.entries(classifications).sort(([, a], [, b]) => b - a)[0];

  return {
    documentType: primaryType?.[0] || 'unknown',
    confidence: primaryType?.[1] || 0.5,
    subTypes: Object.entries(classifications)
      .filter(([type]) => type !== primaryType?.[0])
      .map(([type, conf]) => ({ type, confidence: conf }))
      .filter(({ confidence }) => confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence),
    detectedFeatures: features,
  };
}

async function classifyWithAI(title: string, excerpt: string): Promise<Record<string, number>> {
  const prompt = `Classify this document type. Return confidence scores 0-1 for each type.

  Title: ${title}
  Excerpt: ${excerpt}

  Possible types: court_filing, fbi_report, email, letter, financial, leaked, journalist, interview, policy, other

  Return JSON: { "court_filing": 0.9, "fbi_report": 0.1, ... }`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch {
    return {};
  }
}
```

### 4.2 Confidence Scoring (5-Layer System)

Project Truth uses a sophisticated 5-layer confidence system. The autonomous pipeline must populate all 5 layers:

```typescript
interface ConfidenceScore {
  layer_1_source: number;           // 0.0-1.0 (source authority)
  layer_2_corroboration: number;    // 0.0-1.0 (cross-reference within document)
  layer_3_external: number;         // 0.0-1.0 (external database matches)
  layer_4_temporal: number;         // 0.0-1.0 (timeline consistency)
  layer_5_community: number;        // 0.0-1.0 (pending, becomes active after peer review)
  composite: number;                // weighted average
  evidence_count: number;           // how many supporting docs
}

async function scoreConfidenceForExtractedEntity(
  entity: ExtractedEntity,
  sourceDocument: Document,
  documentContent: string,
  allDocuments: Document[]
): Promise<ConfidenceScore> {

  // LAYER 1: Source Authority
  const sourceScores: Record<string, number> = {
    'court_filing': 0.95,        // Highest — filed in court
    'fbi_report': 0.90,          // Very high — government official
    'deposition': 0.88,          // Sworn testimony
    'leaked': 0.70,              // Lower — unverified origin
    'journalist': 0.75,          // Investigative source
    'email': 0.60,               // Can be forged
    'social_media': 0.30,        // Lowest
  };
  const layer1 = sourceScores[sourceDocument.document_type as string] || 0.5;

  // LAYER 2: Corroboration (within document)
  // How many times is entity mentioned? Mentions + context = confidence
  const mentions = countMentions(documentContent, entity.name);
  const contextual = extractContext(documentContent, entity.name, windowSize=100);
  const contextConfidence = analyzeContext(contextual);  // Is context consistent?
  const layer2 = Math.min(0.95, 0.5 + (mentions * 0.1) + (contextConfidence * 0.3));

  // LAYER 3: External Verification
  // Check against known databases: OpenSanctions, CourtListener, Wikipedia
  const externalMatches = await findExternalMatches(entity);
  const matchConfidence = externalMatches.length > 0
    ? Math.max(...externalMatches.map(m => m.matchScore))
    : 0;
  const layer3 = matchConfidence * 0.8;  // Cap at 0.8 (external sources alone don't guarantee)

  // LAYER 4: Temporal Consistency
  // Do dates/timeline make sense?
  const timeline = extractTimelineForEntity(documentContent, entity);
  const temporalConsistency = checkTemporalConsistency(timeline);  // 0-1
  const layer4 = temporalConsistency;

  // LAYER 5: Community (Pending)
  const layer5 = 0;  // Will be populated after peer review

  // Composite (weighted average)
  const composite = (
    layer1 * 0.30 +      // Source is most important
    layer2 * 0.25 +      // Internal corroboration
    layer3 * 0.20 +      // External verification
    layer4 * 0.15 +      // Temporal consistency
    layer5 * 0.10        // Community (inactive until review)
  );

  // Evidence count: how many other docs mention this entity?
  const evidenceCount = allDocuments.filter(doc =>
    doc.id !== sourceDocument.id &&
    (doc.raw_text || '').includes(entity.name)
  ).length;

  return {
    layer_1_source: layer1,
    layer_2_corroboration: layer2,
    layer_3_external: layer3,
    layer_4_temporal: layer4,
    layer_5_community: layer5,
    composite,
    evidence_count: evidenceCount,
  };
}
```

### 4.3 Multi-Label Classification

A single document can be multiple types:

```typescript
async function multiLabelClassify(document: Document): Promise<string[]> {
  const labels: string[] = [];
  const content = (document.raw_text || '').toLowerCase();

  // Financial evidence
  if (content.includes('bank') || content.includes('transfer') || content.includes('account')) {
    labels.push('evidence:financial');
  }

  // Communication evidence
  if (content.includes('email') || content.includes('phone') || content.includes('message')) {
    labels.push('evidence:communication');
  }

  // Location evidence
  if (content.match(/\d+\s+(?:Street|Ave|Road|Boulevard|Lane)/i)) {
    labels.push('evidence:location');
  }

  // Temporal evidence
  if (content.match(/(?:January|February|March|...)\s+\d{1,2},?\s+\d{4}/i)) {
    labels.push('evidence:temporal');
  }

  // Relationship evidence
  if (content.includes('defendant') || content.includes('witness') || content.includes('associate')) {
    labels.push('evidence:relationship');
  }

  // Sealed/restricted
  if (content.includes('[redacted]') || content.includes('sealed')) {
    labels.push('restriction:sealed');
  }

  // Multiple parties
  if (content.match(/(defendant|plaintiff|respondent).*?and.*(defendant|plaintiff|respondent)/i)) {
    labels.push('characteristic:multi_party');
  }

  return labels;
}
```

---

## 5. ERROR HANDLING & RECOVERY

### 5.1 Partial Processing (PDF with 200 Pages, Fails at Page 47)

```typescript
interface ProcessingState {
  documentId: string;
  pagesProcessed: number;
  totalPages: number;
  lastSuccessfulPage: number;
  lastError?: { page: number; error: string; timestamp: number };
  failureCount: number;
  canRetry: boolean;
}

async function robustPDFProcessing(
  documentId: string,
  pdfBuffer: Buffer,
  resumeFromPage?: number
): Promise<ProcessingState> {
  const totalPages = await getPageCount(pdfBuffer);
  const startPage = resumeFromPage || 0;
  const state: ProcessingState = {
    documentId,
    pagesProcessed: startPage,
    totalPages,
    lastSuccessfulPage: startPage - 1,
    failureCount: 0,
    canRetry: true,
  };

  const results: Array<{ page: number; text: string; ocrConfidence: number }> = [];

  for (let pageNum = startPage; pageNum < totalPages; pageNum++) {
    try {
      // Extract page
      const pageBuffer = await extractPage(pdfBuffer, pageNum);

      // OCR with timeout
      const ocrResult = await Promise.race([
        processWithDocumentAI(pageBuffer),
        sleep(30000).then(() => { throw new Error('OCR timeout'); }),
      ]);

      results.push({
        page: pageNum,
        text: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
      });

      state.pagesProcessed = pageNum + 1;
      state.lastSuccessfulPage = pageNum;
      state.failureCount = 0;  // Reset on success

    } catch (err) {
      state.failureCount++;
      state.lastError = {
        page: pageNum,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
      };

      // After 3 failures, stop and mark for retry
      if (state.failureCount >= 3) {
        state.canRetry = true;
        break;
      }

      // Otherwise, skip this page and continue
      console.warn(`[ProcessPDF] Page ${pageNum} failed, skipping:`, err);
      results.push({
        page: pageNum,
        text: `[OCR FAILED ON PAGE ${pageNum}]`,
        ocrConfidence: 0,
      });
    }

    // Rate limiting (Document AI has quotas)
    await sleep(200);  // 200ms between pages
  }

  // Save results even if partial
  await saveOCRResults(documentId, results, state);

  return state;
}

async function retryFailedPages(
  documentId: string,
  state: ProcessingState
): Promise<ProcessingState> {
  if (!state.canRetry) {
    throw new Error('Cannot retry: state indicates no retry possible');
  }

  // Retry from last successful page + 1
  const resumeFrom = Math.max(0, state.lastSuccessfulPage + 1);
  return robustPDFProcessing(documentId, /* fetch PDF */, resumeFrom);
}
```

### 5.2 Dead Letter Queue

Documents that fail consistently go to a dead letter queue for manual review:

```sql
-- documents table
ALTER TABLE documents ADD COLUMN dlq_reason TEXT;
ALTER TABLE documents ADD COLUMN dlq_attempts INT DEFAULT 0;

-- Dead Letter Queue table
CREATE TABLE document_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  reason TEXT,  -- 'ocr_failed', 'ai_timeout', 'corruption', etc.
  last_attempt TIMESTAMP,
  attempts INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  assigned_to UUID REFERENCES auth.users(id)  -- Admin assigned to manual review
);

CREATE INDEX idx_document_dlq_reason ON document_dlq(reason);
CREATE INDEX idx_document_dlq_assigned ON document_dlq(assigned_to) WHERE assigned_to IS NOT NULL;
```

**DLQ Logic:**

```typescript
async function moveToDeadLetterQueue(
  documentId: string,
  reason: string,
  attempts: number,
  metadata: Record<string, unknown>
) {
  // Only DLQ after 3+ failures
  if (attempts < 3) return;

  await supabaseAdmin
    .from('document_dlq')
    .insert({
      document_id: documentId,
      reason,
      attempts,
      metadata,
      last_attempt: new Date(),
    });

  // Mark document as DLQ'd
  await supabaseAdmin
    .from('documents')
    .update({
      scan_status: 'dlq',
      dlq_reason: reason,
      dlq_attempts: attempts,
    })
    .eq('id', documentId);
}
```

### 5.3 Graceful Degradation

If OCR fails, extract what we can. If AI extraction times out, use simpler extraction:

```typescript
async function extractEntitiesWithFallback(
  documentId: string,
  ocrText: string
): Promise<ExtractedEntity[]> {

  // Try 1: Full AI extraction (Groq)
  try {
    return await extractWithGroq(ocrText);
  } catch (err) {
    console.warn(`[Entity Extraction] Groq failed, falling back:`, err);
  }

  // Try 2: Regex-based extraction (no AI)
  try {
    return extractWithRegex(ocrText);
  } catch (err) {
    console.warn(`[Entity Extraction] Regex failed:`, err);
  }

  // Try 3: Metadata-only (no extraction)
  return [];
}

function extractWithRegex(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Names (capitalized words)
  const nameMatches = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
  for (const name of [...new Set(nameMatches)]) {
    entities.push({
      type: 'person',
      name,
      confidence: 0.5,  // Lower confidence for regex-based
      source: 'regex',
    });
  }

  // Dates
  const dateMatches = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
  for (const dateStr of [...new Set(dateMatches)]) {
    entities.push({
      type: 'date',
      value: dateStr,
      confidence: 0.7,
      source: 'regex',
    });
  }

  // Emails
  const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
  for (const email of [...new Set(emailMatches)]) {
    entities.push({
      type: 'email',
      value: email,
      confidence: 0.9,  // High confidence for regex email
      source: 'regex',
    });
  }

  return entities;
}
```

### 5.4 Rate Limit Handling (Groq, Document AI)

```typescript
interface RateLimitConfig {
  groq: { requestsPerMinute: 30; retryDelays: [5000, 15000, 30000] };
  documentAI: { requestsPerDay: 50000; burstSize: 100 };
}

async function executeWithRateLimit(
  operation: () => Promise<any>,
  service: 'groq' | 'documentai'
): Promise<any> {
  const delays = service === 'groq'
    ? [5000, 15000, 30000]
    : [10000, 30000, 60000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      // Check if error is rate limit
      if (err.status === 429 || err.message?.includes('rate')) {
        const delayMs = delays[attempt];
        console.warn(`[${service}] Rate limited, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        throw err;  // Not a rate limit error, re-throw
      }
    }
  }

  throw new Error(`Max retries exceeded for ${service}`);
}
```

---

## 6. SCALABILITY PATTERNS

### 6.1 Single Document (MVP)

**Time breakdown:**
- Validation: 100ms
- Dedup: 50ms
- Parse: 200ms
- OCR (10 pages): 10s × 10 = 100s (Document AI ~1s/page)
- AI extraction: 5s
- Scoring: 1s
- **Total: ~110 seconds**

**Infrastructure needed:**
- Supabase (already deployed)
- GCS (already deployed)
- Document AI quota (included in $340 credit)
- Groq free tier (30 req/min)

### 6.2 Scaling to 100 Documents

**Bottleneck:** OCR and AI extraction (both slow)

**Solution: Batch processing**
```typescript
async function batchProcessDocuments(
  documentIds: string[],
  batchSize: number = 10
): Promise<void> {
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);

    // Process all docs in parallel
    await Promise.all(
      batch.map(docId => processDocument(docId))
    );

    // Between batches, wait (respects rate limits)
    if (i + batchSize < documentIds.length) {
      await sleep(60000);  // 1 minute between batches
    }
  }
}
```

**Cost for 100 documents (10-20 pages each):**
- Document AI OCR: 100 × 15 pages × $0.0015 = $2.25
- Groq: 100 requests × free tier = $0
- GCS storage: 100 × 1MB = $0.01 (first 5GB free)
- **Total: ~$2.30**

### 6.3 Scaling to 1,000+ Documents

**Bottleneck:** Groq rate limit (30 req/min)

**Solution: Add Redis queue**
```typescript
import Bull from 'bull';

const documentProcessingQueue = new Bull('document-processing', {
  redis: { host: 'redis.example.com', port: 6379 },
});

// Producer: enqueue documents
async function enqueueDocuments(documentIds: string[]) {
  for (const id of documentIds) {
    await documentProcessingQueue.add(
      { documentId: id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    );
  }
}

// Consumer: process with rate limiting
documentProcessingQueue.process(async (job) => {
  const { documentId } = job.data;

  // This runs with automatic rate limiting (concurrency: 1)
  await processDocument(documentId);

  return { success: true };
});

// Monitor
documentProcessingQueue.on('completed', (job) => {
  console.log(`Document ${job.data.documentId} processed`);
});

documentProcessingQueue.on('failed', (job, err) => {
  console.error(`Document ${job.data.documentId} failed:`, err);
  // Auto-retry (configured in options)
});
```

**Cost for 1,000 documents:**
- Document AI: 1000 × 15 × $0.0015 = $22.50
- Groq: 1000 × free tier = $0
- Redis (BullMQ): $5-10/month for small instance
- GCS storage: 1000 × 1MB = $0.10
- **Total: ~$27-32/month**

### 6.4 Scaling to 10,000+ Documents (Enterprise)

**Bottleneck:** Cost and infrastructure complexity

**Solution: Conditional processing**
```typescript
async function intelligentProcessing(document: Document) {
  const { documentType, confidence } = await classifyDocument(document);

  // High-value documents get full treatment
  if (['court_filing', 'fbi_report'].includes(documentType) && confidence > 0.8) {
    await ocrDocument(document);        // Full OCR
    await extractEntities(document);    // Full AI extraction
    return;
  }

  // Metadata-only scan for medium-value documents
  if (confidence > 0.5) {
    await extractFromMetadata(document);  // No OCR, just metadata
    return;
  }

  // Skip processing for low-confidence/low-value
  if (confidence < 0.3) {
    await moveToQuarantine(document, { reason: 'low_confidence' });
    return;
  }
}
```

**Cost optimization for 10,000 documents:**
- Only 30% get full OCR (3000 × 15 × $0.0015) = $67.50
- 40% get metadata-only (4000 × free) = $0
- 30% skipped (3000 × free) = $0
- **Total: $67.50 for 10,000 docs** (vs $150 if all full-OCR)

---

## 7. DOCUMENT DEDUPLICATION

### 7.1 Content-Based Hashing

```typescript
import crypto from 'crypto';

interface DocumentHash {
  sha256: string;          // Full document hash
  pageHashes: string[];    // Per-page hashes
  textHash: string;        // Hash of extracted text (invariant to recompression)
}

async function computeDocumentHash(
  buffer: Buffer,
  ocrText: string
): Promise<DocumentHash> {
  // SHA256 of raw bytes (invariant)
  const sha256 = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');

  // Per-page hash (detect partial duplication)
  const pageHashes = await computePageHashes(buffer);

  // Hash of extracted text (ignore formatting/recompression)
  const normalizedText = ocrText
    .toLowerCase()
    .replace(/\s+/g, ' ')  // normalize whitespace
    .trim();
  const textHash = crypto
    .createHash('sha256')
    .update(normalizedText)
    .digest('hex');

  return { sha256, pageHashes, textHash };
}

async function findDuplicates(
  newHash: DocumentHash,
  existingDocuments: Document[]
): Promise<Document[]> {
  const duplicates: Document[] = [];

  for (const doc of existingDocuments) {
    const storedHash = doc.content_hash as DocumentHash;

    // Exact match
    if (storedHash.sha256 === newHash.sha256) {
      duplicates.push(doc);
      continue;
    }

    // Text match (same content, different compression/format)
    if (storedHash.textHash === newHash.textHash) {
      duplicates.push(doc);
      continue;
    }

    // Partial match (most pages identical)
    const commonPages = newHash.pageHashes.filter(ph =>
      storedHash.pageHashes.includes(ph)
    ).length;
    const pageMatchRatio = commonPages / Math.max(
      newHash.pageHashes.length,
      storedHash.pageHashes.length
    );
    if (pageMatchRatio > 0.9) {  // 90% pages match
      duplicates.push(doc);
    }
  }

  return duplicates;
}
```

### 7.2 Fuzzy Matching (Same Document, Different Redactions)

Two PDFs of the same court filing might be released with different redactions at different times.

```typescript
function fuzzyMatchDocuments(
  doc1Text: string,
  doc2Text: string,
  threshold: number = 0.95
): { match: boolean; similarity: number; differences: string[] } {
  // Normalize text (remove redaction markers, whitespace)
  const normalize = (text: string) =>
    text
      .replace(/\[REDACTED\]|\[B5\]|\[WITHHELD\]/gi, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

  const norm1 = normalize(doc1Text);
  const norm2 = normalize(doc2Text);

  // Compute Levenshtein distance (character-level similarity)
  const similarity = levenshteinSimilarity(norm1, norm2);

  // Extract differences (for versioning)
  const differences = findDifferences(doc1Text, doc2Text);

  return {
    match: similarity >= threshold,
    similarity,
    differences,
  };
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const len = Math.max(str1.length, str2.length);
  if (len === 0) return 1.0;

  const distance = computeLevenshteinDistance(str1, str2);
  return 1 - distance / len;
}

function computeLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);

  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
```

### 7.3 Cross-Format Deduplication

Same document may exist as PDF, TXT, image scan, email:

```typescript
async function deduplicateAcrossFormats(
  newDocument: Document
): Promise<{ duplicateOf?: string; confidence: number }> {
  // Extract text from new document (regardless of format)
  let newText: string;

  if (newDocument.mime_type === 'application/pdf') {
    newText = await ocrPDF(newDocument.file_path);
  } else if (newDocument.mime_type?.startsWith('image/')) {
    newText = await recognizeImage(newDocument.file_path);
  } else if (newDocument.mime_type === 'text/plain') {
    newText = await readText(newDocument.file_path);
  } else {
    return { confidence: 0 };  // Can't extract text
  }

  // Compare against all documents regardless of format
  const { data: existingDocs } = await supabaseAdmin
    .from('documents')
    .select('id, extracted_text, mime_type')
    .neq('id', newDocument.id);

  for (const existing of existingDocs || []) {
    const existingText = existing.extracted_text || '';
    const { match, similarity } = fuzzyMatchDocuments(newText, existingText, 0.90);

    if (match) {
      return { duplicateOf: existing.id, confidence: similarity };
    }
  }

  return { confidence: 0 };
}
```

---

## 8. METADATA EXTRACTION

### 8.1 Automatic Date/Case/Court Extraction

```typescript
interface ExtractedMetadata {
  caseNumber?: string;
  court?: string;
  filedDate?: Date;
  parties: string[];
  judge?: string;
  docket?: string;
}

async function extractLegalMetadata(
  documentText: string,
  fileName: string
): Promise<ExtractedMetadata> {
  const metadata: ExtractedMetadata = { parties: [] };

  // Case number patterns (US courts)
  // Format: 1:20-cr-00330 (district:year-type-number)
  const caseMatches = documentText.match(/(\d{1,2}):(\d{2})-([a-z]{2})-(\d{5,})/gi);
  if (caseMatches) {
    metadata.caseNumber = caseMatches[0];
  }

  // Court detection
  const courtPatterns = {
    'SDNY': /(SOUTHERN DISTRICT OF NEW YORK|S\.D\.N\.Y\.)/i,
    'NDIL': /(NORTHERN DISTRICT OF ILLINOIS|N\.D\.I(?:L)?\.)/i,
    'CDCA': /(CENTRAL DISTRICT OF CALIFORNIA|C\.D\.C(?:A)?\.)/i,
  };
  for (const [code, pattern] of Object.entries(courtPatterns)) {
    if (pattern.test(documentText)) {
      metadata.court = code;
      break;
    }
  }

  // Filed date extraction
  const datePatterns = [
    /FILED\s+([A-Z][a-z]+ \d{1,2}, \d{4})/i,
    /Date Filed\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /([A-Z][a-z]+ \d{1,2}, \d{4}).*?[Cc]ourt [Cc]lerk/,
  ];
  for (const pattern of datePatterns) {
    const match = documentText.match(pattern);
    if (match) {
      metadata.filedDate = new Date(match[1]);
      break;
    }
  }

  // Party extraction
  const partyPatterns = [
    /v\.\s+([A-Z][A-Za-z\s]+?)(?:\s*,|$)/g,        // vs. format
    /(PLAINTIFF|DEFENDANT|RESPONDENT)\s+:\s+(.+?)$/gm,
  ];
  for (const pattern of partyPatterns) {
    let match;
    while ((match = pattern.exec(documentText)) !== null) {
      const party = match[1] || match[2];
      if (party && !metadata.parties.includes(party)) {
        metadata.parties.push(party.trim());
      }
    }
  }

  // Judge name extraction
  const judgeMatches = documentText.match(/(?:Hon\.|Honorable)\s+([A-Z][a-z]+ [A-Z][a-z]+)/g);
  if (judgeMatches) {
    metadata.judge = judgeMatches[0].replace(/(?:Hon\.|Honorable)\s+/, '');
  }

  // Docket number (from CourtListener if available)
  const docketMatch = fileName.match(/#(\d+)/);
  if (docketMatch) {
    metadata.docket = docketMatch[1];
  }

  return metadata;
}
```

### 8.2 Timestamp Extraction

Court documents contain multiple timestamps:

```typescript
interface DocumentTimestamps {
  fileCreated: Date;      // /CreationDate in PDF metadata
  fileModified: Date;     // /ModDate in PDF metadata
  filed: Date;            // When filed in court
  signed: Date;           // When attorney signed
  notarized?: Date;       // When notarized
  served?: Date;          // When served on parties
  entered?: Date;         // When entered into court system
}

async function extractTimestamps(
  pdfBuffer: Buffer,
  documentText: string
): Promise<DocumentTimestamps> {
  const timestamps: DocumentTimestamps = {
    fileCreated: new Date(),
    fileModified: new Date(),
    filed: new Date(),
    signed: new Date(),
  };

  // Step 1: PDF metadata timestamps
  const pdfMeta = await extractPDFMetadata(pdfBuffer);
  if (pdfMeta.CreationDate) {
    timestamps.fileCreated = parsePDFDate(pdfMeta.CreationDate);
  }
  if (pdfMeta.ModDate) {
    timestamps.fileModified = parsePDFDate(pdfMeta.ModDate);
  }

  // Step 2: Document text timestamps
  const filedMatch = documentText.match(/FILED\s+([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (filedMatch) {
    timestamps.filed = new Date(filedMatch[1]);
  }

  const signedMatch = documentText.match(/(?:Signed|Dated).*?([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (signedMatch) {
    timestamps.signed = new Date(signedMatch[1]);
  }

  const notarizedMatch = documentText.match(/Notarized?.*?([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (notarizedMatch) {
    timestamps.notarized = new Date(notarizedMatch[1]);
  }

  return timestamps;
}
```

---

## 9. PIPELINE MONITORING

### 9.1 Key Metrics

```typescript
interface PipelineMetrics {
  // Input
  documentsReceived: number;
  bytesReceived: number;

  // Throughput
  documentsProcessed: number;
  averageTimePerDocument: number;  // ms
  throughput: number;              // docs/hour

  // Quality
  ocrSuccessRate: number;          // % with confidence > 0.7
  entityExtractionRate: number;    // % with > 0 entities
  confidenceAverage: number;       // avg confidence score

  // Errors
  failureRate: number;             // % failed
  dlqCount: number;                // dead letter queue size

  // Cost
  estimatedCostUSD: number;
  costPerDocument: number;
}

async function calculateMetrics(): Promise<PipelineMetrics> {
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, scan_status, ocr_confidence, created_at, file_size, extracted_entities');

  const totalDocs = docs?.length || 0;
  const processedDocs = docs?.filter(d => ['scanned', 'dlq'].includes(d.scan_status as string)) || [];
  const failedDocs = docs?.filter(d => d.scan_status === 'dlq') || [];

  const metrics: PipelineMetrics = {
    documentsReceived: totalDocs,
    bytesReceived: (docs || []).reduce((sum, d) => sum + (d.file_size as number || 0), 0),

    documentsProcessed: processedDocs.length,
    averageTimePerDocument: calculateAverageTime(processedDocs),
    throughput: calculateThroughput(processedDocs),

    ocrSuccessRate: processedDocs.length > 0
      ? processedDocs.filter(d => (d.ocr_confidence as number || 0) > 0.7).length / processedDocs.length
      : 0,
    entityExtractionRate: processedDocs.length > 0
      ? processedDocs.filter(d => ((d.extracted_entities as any[]) || []).length > 0).length / processedDocs.length
      : 0,
    confidenceAverage: processedDocs.length > 0
      ? processedDocs.reduce((sum, d) => sum + ((d.ocr_confidence as number) || 0.5), 0) / processedDocs.length
      : 0,

    failureRate: totalDocs > 0 ? failedDocs.length / totalDocs : 0,
    dlqCount: failedDocs.length,

    estimatedCostUSD: calculateCost(processedDocs),
    costPerDocument: calculateCost(processedDocs) / Math.max(processedDocs.length, 1),
  };

  return metrics;
}
```

### 9.2 Alerting Rules

```typescript
interface AlertRule {
  name: string;
  condition: (metrics: PipelineMetrics) => boolean;
  severity: 'info' | 'warning' | 'critical';
  action: (metrics: PipelineMetrics) => Promise<void>;
}

const ALERT_RULES: AlertRule[] = [
  {
    name: 'High Failure Rate',
    condition: (m) => m.failureRate > 0.1,  // > 10% failure
    severity: 'critical',
    action: async (m) => {
      await sendAlert(`Pipeline failure rate: ${(m.failureRate * 100).toFixed(1)}%`);
      // Auto-pause processing
      await pauseProcessing();
    },
  },
  {
    name: 'DLQ Backlog',
    condition: (m) => m.dlqCount > 50,
    severity: 'warning',
    action: async (m) => {
      await sendAlert(`Dead Letter Queue has ${m.dlqCount} documents`);
      // Assign to admin
      await assignDLQToAdmin();
    },
  },
  {
    name: 'Low OCR Quality',
    condition: (m) => m.ocrSuccessRate < 0.7,  // < 70% high-confidence
    severity: 'warning',
    action: async (m) => {
      await sendAlert(`OCR success rate dropped to ${(m.ocrSuccessRate * 100).toFixed(1)}%`);
      // Might indicate document type issues
    },
  },
  {
    name: 'High Cost',
    condition: (m) => m.costPerDocument > 0.05,  // > $0.05/doc
    severity: 'info',
    action: async (m) => {
      await sendAlert(`Cost per document: $${m.costPerDocument.toFixed(3)}`);
      // Might indicate inefficient processing
    },
  },
];
```

### 9.3 Dashboard Query (Supabase Real-time)

```sql
-- Real-time metrics view
CREATE VIEW pipeline_metrics AS
SELECT
  COUNT(*) as total_documents,
  COUNT(CASE WHEN scan_status = 'scanned' THEN 1 END) as scanned_documents,
  COUNT(CASE WHEN scan_status = 'dlq' THEN 1 END) as dlq_documents,
  COUNT(CASE WHEN ocr_confidence > 0.7 THEN 1 END) as high_quality_ocr,
  AVG(ocr_confidence) as avg_ocr_confidence,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 1000 as avg_processing_time_seconds,
  SUM(file_size) / (1024 * 1024) as total_size_mb,
  NOW() as last_updated
FROM documents;

-- Hourly throughput
CREATE VIEW hourly_throughput AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as documents_added,
  COUNT(CASE WHEN scan_status = 'scanned' THEN 1 END) as documents_scanned,
  AVG(file_size) as avg_file_size
FROM documents
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

---

## 10. REAL-WORLD SYSTEMS

### 10.1 CourtListener RECAP Pipeline

CourtListener processes ~100K documents/month from US courts.

**Architecture:**
```
RECAP Extension (browser)
  → User downloads PDF from PACER
  → Automatically uploads to CourtListener
  → Deduplication (SHA256)
  → Document stored in S3
  → Metadata indexed in Elasticsearch
  → Fulltext searchable
```

**Key insights for Truth:**
- **Deduplication is critical** — without it, duplicates would clog the database
- **RECAP = crowd-sourced OCR** — volunteers own the data, platform indexes it
- **Metadata-first strategy** — case number, court, date extracted from URL/filename before OCR
- **Rate limiting by source** — CourtListener rate-limits by user IP to prevent abuse

### 10.2 DocumentCloud Processing

DocumentCloud processes leaked documents, govtdocs, journalistic materials.

**Notable features:**
- **Per-document viewer** — incremental OCR as pages are viewed (lazy loading)
- **User annotation** — notes, highlights saved client-side
- **Bulk processing API** — upload 100 docs, get back searchable text
- **Redaction detection** — CV-based detection of redacted regions (black boxes)
- **Organization workspace** — teams can collaborate on same document set
- **Public/private split** — documents encrypted at rest until published

**Key insights:**
- **Lazy OCR** (OCR on demand) saves infrastructure cost vs upfront OCR
- **Redaction detection** is doable with OpenCV (detect black boxes)
- **Workspace isolation** requires per-org encryption keys or RBAC

### 10.3 ICIJ Offshore Leaks Processing

ICIJ processed **2.6M documents** from Panama Papers, Paradise Papers, Pandora Papers.

**Pipeline (simplified):**
```
Raw leak (Terabytes)
  → Document classification (auto-triage)
  → Language detection
  → OCR (multilingual)
  → Entity extraction (AI)
  → Network graph construction
  → Journalist review (weeks)
  → Public portal launch
```

**Key constraints ICIJ faced:**
- **Time pressure** — had to be perfect on launch (global coordination)
- **Multilingual** — documents in 40+ languages
- **Redaction responsibility** — ICIJ had to redact sensitive PII
- **Archive sustainability** — data must remain accessible 20+ years

**Key insights:**
- **Controlled release** — don't dump all docs at once. Stage by story
- **Language-specific pipelines** — Chinese/Arabic OCR is much harder than English
- **Legal review every step** — redaction decisions are liability-critical
- **Partnership trust** — shared infrastructure with journalists globally

### 10.4 Bellingcat Document Verification

Bellingcat (open-source investigations) has a document verification playbook:

**Authenticity checks (in order):**
1. **Source provenance** — Where did this come from? How did journalists obtain it?
2. **Metadata forensics** — PDF timestamps, fonts, software version
3. **Content pattern matching** — Does it match known authentic documents?
4. **Visual artifacts** — ELA analysis, pixel-level forensics
5. **Cross-reference** — Do other sources corroborate claims?
6. **Expert review** — Show to domain experts (lawyers, accountants, etc.)

**Key insights for Truth:**
- **Layered verification** — no single check is sufficient
- **Metadata is often the first red flag** — fake PDFs often have wrong software versions
- **Community expertise** — lawyers/accountants can spot fake documents instantly
- **Transparent reasoning** — publish WHY you believe document is authentic

---

## IMPLEMENTATION ROADMAP FOR PROJECT TRUTH

### Phase 1 (MVP — Weeks 1-4)
- [x] Foundational infrastructure (GCS, Document AI, Groq) — Done
- [ ] Compound document splitting logic
- [ ] Confidence scoring implementation
- [ ] Simple error handling (retry 3x, then DLQ)

### Phase 2 (Scaling — Weeks 5-8)
- [ ] Deduplication system (SHA256 + fuzzy matching)
- [ ] Metadata extraction (case numbers, dates, courts)
- [ ] Document classification (court_filing, fbi_report, email, etc.)
- [ ] Pipeline monitoring dashboard
- [ ] Alert system

### Phase 3 (Enterprise — Weeks 9-12)
- [ ] Multi-format support (image scans, email, etc.)
- [ ] Multilingual OCR (Turkish, Arabic, Chinese)
- [ ] Advanced redaction detection
- [ ] Async processing with Bull + Redis
- [ ] Cost optimization logic

### Phase 4 (Production Hardening — Weeks 13+)
- [ ] Load testing (1000+ docs)
- [ ] Audit logging (WORM-style immutable logs)
- [ ] Disaster recovery procedures
- [ ] Security hardening (encryption at rest, TLS, etc.)

---

## KEY TAKEAWAYS

**The ideal autonomous pipeline:**
1. **Sequential for critical steps** (validation, dedup, parsing)
2. **Async for slow operations** (OCR, AI extraction)
3. **Graceful degradation** (OCR fails? Use regex. AI times out? Use simpler extraction)
4. **Comprehensive error handling** (DLQ for permanent failures, retry logic for transient failures)
5. **Full observability** (metrics, alerts, dashboards)
6. **Scalable from day 1** (one document or 10,000 documents use same pipeline)

**Project Truth's current position:**
- Infrastructure ✅ (GCS, Document AI, Groq, Supabase)
- Error handling ✅ (basic retry logic exists)
- Monitoring ⏳ (some dashboards exist, needs expansion)
- Deduplication ⏳ (not implemented yet)
- Advanced features ⏳ (compound documents, multilingual, redaction detection)

**Next steps (Priority order):**
1. Implement deduplication (prevents duplicate work)
2. Add monitoring dashboard (visibility into pipeline health)
3. Build compound document handler (many court PDFs are multi-document)
4. Metadata extraction (case numbers, dates automate context)
5. Cost optimization (skip full OCR for low-value documents)

