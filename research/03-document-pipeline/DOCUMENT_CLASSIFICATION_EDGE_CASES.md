# EDGE CASES & ADVANCED CLASSIFICATION SCENARIOS
## For Project Truth Document Type Detection

**Date:** March 22, 2026
**Focus:** Real-world challenges and solutions

---

## 1. COMPOUND DOCUMENTS (Multiple docs in one PDF)

### Problem
FBI FOIA releases often contain 10-50 sub-documents concatenated into one PDF:
```
[FD-302 #1: Page 1-3]
[EC #1: Page 4-5]
[FD-302 #2: Page 6-9]
[Search Warrant: Page 10-15]
```

Current system: classifies entire PDF as single type (Wrong!)
Desired: identify each sub-document and classify separately.

### Solution: Boundary Detection Algorithm

```typescript
interface DocumentBoundary {
  startPage: number;
  endPage: number;
  type: DocumentType;
  confidence: number;
  pageCount: number;
}

async function detectDocumentBoundaries(
  pages: Array<{ text: string; pageNum: number }>,
): Promise<DocumentBoundary[]> {

  const boundaries: DocumentBoundary[] = [];
  let currentBoundary = {
    startPage: 0,
    type: null as DocumentType | null,
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageText = page.text;

    // ─── Signal 1: New Header ───
    const lines = pageText.split('\n');
    const firstLine = lines[0];
    const headerMatch = /^(?:UNITED STATES|IN THE|FD-302|FEDERAL BUREAU)/i.test(firstLine);

    if (headerMatch && i > currentBoundary.startPage + 2) {
      // Start of new document
      if (currentBoundary.type) {
        const classified = await classifyByRules(
          pages.slice(currentBoundary.startPage, i).map(p => p.text).join('\n'),
          `pages_${currentBoundary.startPage}_${i}`
        );

        boundaries.push({
          startPage: currentBoundary.startPage,
          endPage: i - 1,
          type: classified.type,
          confidence: classified.confidence,
          pageCount: i - currentBoundary.startPage,
        });
      }

      currentBoundary = {
        startPage: i,
        type: null,
      };
    }

    // ─── Signal 2: Page Number Reset ───
    const pageNumMatch = pageText.match(/(?:Page|p\.)\s*(\d+)/);
    if (pageNumMatch && i > 0) {
      const currentPageNum = parseInt(pageNumMatch[1]);
      if (currentPageNum === 1 && i > currentBoundary.startPage + 2) {
        // Page numbering reset = new document boundary
        if (currentBoundary.type) {
          const classified = await classifyByRules(
            pages.slice(currentBoundary.startPage, i).map(p => p.text).join('\n'),
            `pages_${currentBoundary.startPage}_${i}`
          );

          boundaries.push({
            startPage: currentBoundary.startPage,
            endPage: i - 1,
            type: classified.type,
            confidence: classified.confidence,
            pageCount: i - currentBoundary.startPage,
          });
        }

        currentBoundary = {
          startPage: i,
          type: null,
        };
      }
    }

    // ─── Signal 3: Case Number Change ───
    const caseNumMatch = pageText.match(/(\d{2}-[CV]{2}-\d{5,})/g);
    if (caseNumMatch && i > currentBoundary.startPage) {
      // Compare with previous page's case number
      if (i > 0) {
        const prevPageCaseNum = pages[i - 1].text.match(/(\d{2}-[CV]{2}-\d{5,})/)?.[0];
        if (caseNumMatch[0] !== prevPageCaseNum) {
          // Case number changed = likely new document
          if (currentBoundary.type && i > currentBoundary.startPage + 2) {
            const classified = await classifyByRules(
              pages.slice(currentBoundary.startPage, i).map(p => p.text).join('\n'),
              `pages_${currentBoundary.startPage}_${i}`
            );

            boundaries.push({
              startPage: currentBoundary.startPage,
              endPage: i - 1,
              type: classified.type,
              confidence: classified.confidence,
              pageCount: i - currentBoundary.startPage,
            });

            currentBoundary = {
              startPage: i,
              type: null,
            };
          }
        }
      }
    }

    // ─── Signal 4: Content Type Change (classification discontinuity) ───
    if (i > currentBoundary.startPage && i % 5 === 0) {
      // Every 5 pages, check if classification changes
      const partialText = pages.slice(currentBoundary.startPage, i).map(p => p.text).join('\n');
      const classified = await classifyByRules(
        partialText,
        `check_pages_${currentBoundary.startPage}_${i}`
      );

      // If classification is dramatically different (FBI report → Court filing)
      // mark potential boundary
      if (currentBoundary.type && classified.type !== currentBoundary.type) {
        if (classified.confidence > 0.85) {
          // Strong signal of new document
          boundaries.push({
            startPage: currentBoundary.startPage,
            endPage: i - 1,
            type: currentBoundary.type,
            confidence: 0.75,
            pageCount: i - currentBoundary.startPage,
          });

          currentBoundary = {
            startPage: i,
            type: classified.type,
          };
        }
      }
    }
  }

  // Push final boundary
  if (currentBoundary.startPage < pages.length) {
    const finalText = pages.slice(currentBoundary.startPage).map(p => p.text).join('\n');
    const classified = await classifyByRules(
      finalText,
      `pages_${currentBoundary.startPage}_end`
    );

    boundaries.push({
      startPage: currentBoundary.startPage,
      endPage: pages.length - 1,
      type: classified.type,
      confidence: classified.confidence,
      pageCount: pages.length - currentBoundary.startPage,
    });
  }

  return boundaries;
}

// API Endpoint: GET /api/documents/[id]/boundaries
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;

  // Fetch document pages
  const { data: document } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Extract pages from PDF
  const pages = await extractPDFPages(document.file_path);

  // Detect boundaries
  const boundaries = await detectDocumentBoundaries(pages);

  return NextResponse.json({
    documentId,
    totalPages: pages.length,
    subDocumentCount: boundaries.length,
    boundaries,
  });
}
```

### Test Case: Maxwell Discovery FD-302 Bundle

```
Input: 1 PDF, 47 pages, 12 sub-documents
Expected Output:
  - FD-302 (1): Pages 1-5 (confidence: 0.97)
  - FD-302 (2): Pages 6-10 (confidence: 0.96)
  - Electronic Communication: Pages 11-15 (confidence: 0.94)
  - Search Warrant: Pages 16-22 (confidence: 0.95)
  - Affidavit in Support: Pages 23-30 (confidence: 0.93)
  - Court Order: Pages 31-35 (confidence: 0.91)
  - Deposition: Pages 36-47 (confidence: 0.89)

Accuracy Target: Detect all 12 boundaries with > 85% confidence
```

---

## 2. PARTIALLY REDACTED DOCUMENTS

### Problem
Many government documents have blackouts/redactions:
```
[Visible header showing court]
[Visible name: "JOHN SMITH"]
[REDACTED████████████████]
[REDACTED████████████████]
[Visible signature area]
```

Current system: may fail to classify if critical sections redacted.
Solution: classify based on visible sections + metadata.

```typescript
async function classifyPartiallyRedacted(
  content: string,
  metadata?: { filename?: string; createdBy?: string }
): Promise<ClassificationResult & { redactionLevel: number }> {

  // Estimate redaction level (0-1)
  const redactionPattern = /[█▓░]|(\[REDACTED\])|(\*{10,})/g;
  const redactionMatches = content.match(redactionPattern) || [];
  const redactionLevel = Math.min(redactionMatches.length / content.length, 1);

  // If > 70% redacted, rely more on metadata
  if (redactionLevel > 0.7) {
    // Boost confidence if metadata provides clues
    const basename = metadata?.filename?.toLowerCase() || '';

    if (basename.includes('affidavit') || basename.includes('aff')) {
      return {
        type: 'affidavit',
        confidence: 0.72,  // Lower confidence due to redactions
        signals: [
          `${Math.round(redactionLevel * 100)}% redacted`,
          'Filename suggests: affidavit',
        ],
        reasoning: 'Filename + metadata-based classification (high redaction)',
        redactionLevel,
      };
    }

    if (basename.includes('fbi') || basename.includes('fd-302')) {
      return {
        type: 'fbi_report',
        confidence: 0.75,
        signals: [
          `${Math.round(redactionLevel * 100)}% redacted`,
          'Filename suggests: FBI report',
        ],
        reasoning: 'Filename + metadata-based classification',
        redactionLevel,
      };
    }
  }

  // Otherwise, use normal classification on visible text
  const result = await classifyByRules(content, metadata?.filename || 'redacted.pdf');

  return {
    ...result,
    confidence: result.confidence * (1 - redactionLevel * 0.2),  // Slight penalty for redaction
    redactionLevel,
  };
}
```

---

## 3. DOCUMENTS IN OTHER LANGUAGES

### Problem
European/international documents in French, German, Spanish, etc.

```typescript
// Language detection + classifier adaptation

import { detect } from 'tinyld';  // Language detection library

async function classifyMultilingual(
  content: string,
  filename: string
): Promise<ClassificationResult & { language: string }> {

  // Detect language
  const language = detect(content.slice(0, 500));

  // Adapt patterns for language
  const languagePatterns: Record<string, Record<DocumentType, RegExp>> = {
    'fr': {  // French
      indictment: /^MISE EN EXAMEN|^ACTE D'ACCUSATION/i,
      complaint: /^PLAINTE|^DÉNONCIATION/i,
      affidavit: /^AFFIDAVIT|^DÉCLARATION SOUS SERMENT/i,
      court_filing: /^DOCUMENT JUDICIAIRE|^DÉPOSÉ AU TRIBUNAL/i,
    },
    'de': {  // German
      indictment: /^ANKLAGESCHRIFT|^ANKLAGE/i,
      complaint: /^BESCHWERDE|^EINSPRUCH/i,
      affidavit: /^EIDESSTATTLICHE VERSICHERUNG/i,
      court_filing: /^GERICHTLICHE URKUNDE|^EINGEREICHT BEI GERICHT/i,
    },
    'es': {  // Spanish
      indictment: /^ACUSACIÓN|^AUTO DE PROCESAMIENTO/i,
      complaint: /^DEMANDA|^QUERELLA/i,
      affidavit: /^DECLARACIÓN JURADA|^DECLARACIÓN BAJO PENA/i,
      court_filing: /^ESCRITO JUDICIAL|^PRESENTADO EN JUZGADO/i,
    },
  };

  // Classify with language-specific patterns
  const patterns = languagePatterns[language] || languagePatterns['en'] || {};

  let bestMatch: DocumentType = 'court_filing';
  let bestScore = 0;

  for (const [docType, pattern] of Object.entries(patterns)) {
    if (pattern.test(content.slice(0, 500))) {
      bestMatch = docType as DocumentType;
      bestScore = 0.85;
      break;
    }
  }

  // Fallback to rule-based
  if (bestScore === 0) {
    const result = await classifyByRules(content, filename);
    return {
      ...result,
      language,
    };
  }

  return {
    type: bestMatch,
    confidence: bestScore,
    signals: [`Language: ${language}`, 'Language-specific pattern match'],
    reasoning: `${language.toUpperCase()} document classified as ${bestMatch}`,
    language,
  };
}
```

---

## 4. HANDWRITTEN DOCUMENTS

### Problem
Old court records often handwritten; OCR quality poor.

```typescript
async function classifyHandwritten(
  ocrContent: string,
  ocrConfidence: number,  // 0-1, how confident OCR was
  imageAnalysis?: {
    blur: number;
    contrast: number;
    inkColor: string;
  }
): Promise<ClassificationResult & { handwritingQuality: string }> {

  // If OCR confidence too low, rely on visual analysis
  if (ocrConfidence < 0.5) {
    // Analyze document structure visually
    const isSignaturePage = imageAnalysis?.inkColor === 'blue' &&
                           ocrContent.includes('Signature');

    if (isSignaturePage) {
      return {
        type: 'affidavit',
        confidence: 0.55,  // Low confidence
        signals: [
          `OCR confidence: ${(ocrConfidence * 100).toFixed(0)}% (poor)`,
          'Visual analysis: signature page detected',
        ],
        reasoning: 'Handwritten document; low OCR confidence; visual classification',
        handwritingQuality: 'poor',
      };
    }
  }

  // Otherwise classify normally with confidence penalty
  const result = await classifyByRules(ocrContent, 'handwritten.pdf');

  return {
    ...result,
    confidence: result.confidence * ocrConfidence,  // Multiply by OCR confidence
    handwritingQuality: ocrConfidence > 0.8 ? 'good' : 'poor',
  };
}
```

---

## 5. LETTER vs MEMORANDUM DISTINCTION

### Problem
Both look similar; need to distinguish:
- **Letter:** From → To, formal greeting, signature
- **Memorandum:** Memo header, To/From/Subject/Date, no closing

```typescript
function classifyLetterVsMemo(content: string): 'legal_correspondence' | 'government_filing' {

  // Letter signals
  const letterSignals = {
    'Dear Sir': 2,
    'Dear Madam': 2,
    'To Whom It May Concern': 2,
    'Sincerely': 1,
    'Respectfully': 1,
    'Very truly yours': 2,
    'Yours truly': 1,
  };

  // Memo signals
  const memoSignals = {
    'MEMORANDUM': 3,
    'TO:': 2,
    'FROM:': 2,
    'DATE:': 1,
    'SUBJECT:': 2,
    'RE:': 1,
  };

  let letterScore = 0;
  let memoScore = 0;

  for (const [signal, weight] of Object.entries(letterSignals)) {
    if (content.includes(signal)) letterScore += weight;
  }

  for (const [signal, weight] of Object.entries(memoSignals)) {
    if (content.includes(signal)) memoScore += weight;
  }

  return memoScore > letterScore ? 'government_filing' : 'legal_correspondence';
}
```

---

## 6. EMPTY or CORRUPTED DOCUMENTS

### Problem
What if OCR fails completely? PDF is corrupted?

```typescript
async function classifyWithErrorHandling(
  content: string | null,
  filename: string,
  fileMetadata?: {
    fileSize: number;
    createdDate: Date;
    createdBy: string;
  }
): Promise<ClassificationResult & { errorLevel: 'none' | 'partial' | 'severe' }> {

  // No content = severe error
  if (!content || content.trim().length === 0) {
    // Fall back to filename + metadata
    const basename = filename.toLowerCase();

    if (basename.includes('indictment')) {
      return {
        type: 'indictment',
        confidence: 0.35,  // Very low confidence
        signals: ['No readable content; filename-based guess'],
        reasoning: 'Document unreadable; classification based on filename only',
        errorLevel: 'severe',
      };
    }

    // Default fallback
    return {
      type: 'court_filing',
      confidence: 0.20,
      signals: ['Document unreadable'],
      reasoning: 'Unable to classify; content extraction failed',
      errorLevel: 'severe',
    };
  }

  // Partial content (too short)
  if (content.length < 100) {
    return {
      type: 'court_filing',
      confidence: 0.50,
      signals: ['Content too brief for reliable classification'],
      reasoning: 'Partial content available',
      errorLevel: 'partial',
    };
  }

  // Normal classification
  const result = await classifyByRules(content, filename);

  return {
    ...result,
    errorLevel: 'none',
  };
}
```

---

## 7. MIXED-TYPE DOCUMENTS

### Problem
Single document contains multiple types:
- **Brief** with attached **Exhibit A** (deposition excerpt)
- **Motion** with embedded **Affidavit**

```typescript
interface MixedDocumentSection {
  startLine: number;
  endLine: number;
  type: DocumentType;
  confidence: number;
  isMainContent: boolean;
}

async function classifyMixedDocument(
  content: string
): Promise<{
  primaryType: DocumentType;
  confidence: number;
  sections: MixedDocumentSection[];
}> {

  const lines = content.split('\n');
  const sections: MixedDocumentSection[] = [];

  // Identify section markers
  const sectionMarkers = [
    { pattern: /^EXHIBIT\s+[A-Z]/i, type: 'deposition_reference' },
    { pattern: /^AFFIDAVIT/i, type: 'affidavit' },
    { pattern: /^MOTION/i, type: 'court_filing' },
    { pattern: /^Declaration\s+/i, type: 'sworn_testimony' },
    { pattern: /^Schedule\s+[A-Z]/i, type: 'court_filing' },
  ];

  let currentSection = { start: 0, type: null as DocumentType | null };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const marker of sectionMarkers) {
      if (marker.pattern.test(line)) {
        // New section found
        if (currentSection.type) {
          sections.push({
            startLine: currentSection.start,
            endLine: i - 1,
            type: currentSection.type,
            confidence: 0.80,
            isMainContent: false,
          });
        }

        currentSection = {
          start: i,
          type: marker.type,
        };

        break;
      }
    }
  }

  // Push final section
  if (currentSection.type) {
    sections.push({
      startLine: currentSection.start,
      endLine: lines.length - 1,
      type: currentSection.type,
      confidence: 0.80,
      isMainContent: sections.length === 0,  // First section is main
    });
  }

  // Primary type = first/main section
  const mainSection = sections[0] || { type: 'court_filing' as DocumentType };

  return {
    primaryType: mainSection.type,
    confidence: mainSection.confidence,
    sections,
  };
}
```

---

## 8. CONFIDENCE SCORE CALIBRATION

### Problem
LLM says "0.95 confidence" but is wrong 30% of the time = poorly calibrated.

```typescript
// Expected Calibration Error (ECE) - from academic literature

interface CalibrationMetrics {
  expectedCalibrationError: number;  // Should be < 0.10 for production
  reliabilityDiagram: Array<{ confidenceBin: string; accuracy: number }>;
  overconfident: boolean;
}

function calculateECE(
  predictions: Array<{
    predictedType: DocumentType;
    confidence: number;
    actualType: DocumentType;
  }>
): CalibrationMetrics {

  const bins = 10;
  const binSize = 1.0 / bins;
  const binMetrics: Array<{ confidenceBin: string; accuracy: number }> = [];

  let totalECE = 0;

  for (let b = 0; b < bins; b++) {
    const minConf = b * binSize;
    const maxConf = (b + 1) * binSize;

    // Predictions in this confidence bin
    const binPredictions = predictions.filter(
      p => p.confidence >= minConf && p.confidence < maxConf
    );

    if (binPredictions.length === 0) continue;

    // Accuracy in this bin
    const correct = binPredictions.filter(
      p => p.predictedType === p.actualType
    ).length;

    const accuracy = correct / binPredictions.length;
    const avgConfidence = binPredictions.reduce((a, p) => a + p.confidence, 0) / binPredictions.length;

    // ECE contribution: |confidence - accuracy|
    const calibrationError = Math.abs(avgConfidence - accuracy);
    totalECE += calibrationError * (binPredictions.length / predictions.length);

    binMetrics.push({
      confidenceBin: `${(minConf * 100).toFixed(0)}-${(maxConf * 100).toFixed(0)}%`,
      accuracy: accuracy * 100,
    });
  }

  return {
    expectedCalibrationError: totalECE,
    reliabilityDiagram: binMetrics,
    overconfident: totalECE > 0.10,  // Production threshold
  };
}

// USE CASE: After training BERT or collecting LLM predictions,
// validate that confidence scores match actual accuracy
```

---

## SUMMARY TABLE: Edge Case Handling

| Scenario | Detection Signal | Handling Strategy | Confidence Impact |
|----------|-----------------|------------------|-------------------|
| Compound PDF (12 docs) | Page breaks + case numbers | Boundary detection | Per-doc accuracy |
| 80% Redacted | [REDACTED] markers | Metadata + filename | -0.25 to confidence |
| French Document | Language detection | Language-specific patterns | -0.05 to confidence |
| Handwritten OCR | OCR confidence < 0.5 | Visual classification | × OCR confidence |
| Letter vs Memo | "Dear Sir" vs "MEMORANDUM" | Signal weighting | Normal |
| Corrupted PDF | Content length < 100 chars | Default type | 0.20 max |
| Brief + Exhibit | "EXHIBIT" markers | Section detection | Composite score |
| Miscalibrated Conf | ECE > 0.10 | Retrain or post-hoc scaling | Calibration adjust |

