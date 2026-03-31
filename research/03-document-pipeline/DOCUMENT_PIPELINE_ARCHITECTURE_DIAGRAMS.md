# DOCUMENT PROCESSING PIPELINE — ARCHITECTURE DIAGRAMS
## Visual Reference for Project Truth Pipeline

**Date:** March 22, 2026

---

## 1. END-TO-END PROCESSING FLOW

```
USER UPLOAD
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 1: INGESTION (0 cost)                            │
├─────────────────────────────────────────────────────────┤
│ ✓ File format validation (PDF, DOCX, PNG)             │
│ ✓ File size check (<50MB)                             │
│ ✓ SHA-256 hash calculation                            │
│ ✓ Virus scan placeholder                              │
│ ✓ Store in GCS with signed URL                        │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 2: DEDUPLICATION (0.1 cost)                      │
├─────────────────────────────────────────────────────────┤
│ Fast: SHA-256 exact match (60% catch rate)           │
│ Medium: Text similarity Jaccard >0.95 (30% more)     │
│ Slow: Fuzzy entity matching (10% remaining)          │
│ → If duplicate: Skip, return duplicate_id             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 3: PRE-PROCESSING (Optional, 0 cost)             │
├─────────────────────────────────────────────────────────┤
│ IF degraded (low DPI, grain, blur):                    │
│   ✓ Deskew (straighten tilted scans)                  │
│   ✓ Denoise (remove grain + speckles)                │
│   ✓ Binarization (black & white only)                │
│   ✓ Contrast enhancement (CLAHE)                     │
│ ELSE: Skip (saves processing, ~2-5 sec/page)         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 4: OCR & FILTERING (0.6-1.5 cost/1000 pages)    │
├─────────────────────────────────────────────────────────┤
│ Choice: Google Doc AI (95.8%) vs AWS Textract (94.2%) │
│         → Hybrid: Google default, AWS for tables      │
│                                                         │
│ Filter document type:                                 │
│   PROCEDURAL_FILLER? → REJECT                        │
│   HEAVILY_REDACTED (>80% black)? → REJECT            │
│   LOW_VALUE (<50 words)? → REJECT                    │
│   ✓ FLIGHT_LOG → Mark "flight_log"                  │
│   ✓ FINANCIAL → Mark "financial"                    │
│   ✓ EMAIL → Mark "email"                            │
│   ✓ LEGAL → Default classification                  │
│                                                         │
│ Output confidence: 0.60-0.95                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 5: MULTI-PASS EXTRACTION (0.01-0.03 cost)        │
├─────────────────────────────────────────────────────────┤
│ Pass 1: Entity extraction                              │
│   → PERSON, ORGANIZATION, LOCATION, DATE, MONEY      │
│   → Groq llama-3.3-70b with JSON output              │
│                                                         │
│ Pass 2: Relationship extraction                        │
│   → EMPLOYED_BY, OWNS, PAID_TO, ASSOCIATED_WITH      │
│   → Given entity list, find connections              │
│                                                         │
│ Pass 3: Metadata extraction                            │
│   → Court, case_number, parties, judges, dates       │
│                                                         │
│ Pass 4: Document classification                       │
│   → court_filing, deposition, email, financial, etc. │
│                                                         │
│ Deduplication: Keep highest confidence version        │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 6: VALIDATION (0 cost)                           │
├─────────────────────────────────────────────────────────┤
│ Hallucination check:                                  │
│   ✓ Entity in text? (exact OR fuzzy >0.85)          │
│   ✓ Relationship endpoints both valid?               │
│   → Reject ungrounded claims                         │
│                                                         │
│ Redaction compliance:                                 │
│   ✓ Detect visual redactions (Vision API)            │
│   ✓ Scan for protected patterns (SSN, witness name) │
│   → If exposed PII: QUARANTINE                       │
│                                                         │
│ NATO reliability code assignment:                      │
│   A = Court document or official                      │
│   B = Published news + >85% confidence                │
│   C = Fairly reliable (>75% confidence)              │
│   D = Not usually reliable (>60%)                    │
│   E = Unreliable (<50%)                             │
│   F = Cannot judge                                   │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 7: GRAPH INTEGRATION                             │
├─────────────────────────────────────────────────────────┤
│ Supabase: Save to truth_nodes + truth_links tables   │
│ Neo4j: (Future) Relationship graph queries            │
│ Quarantine: If any validation failed → hold review   │
└─────────────────────────────────────────────────────────┘
    │
    ▼
PUBLISHED TO NETWORK (or held in quarantine)
```

---

## 2. HALLUCINATION DETECTION WATERFALL

```
┌─ LLM Extracts Entity ─────────────────────────────────┐
│ E.g., "John Smith works at Goldman Sachs"            │
└──────────────────────┬────────────────────────────────┘
                       │
                       ▼
        ┌─ CHECK 1: Literal Text Match ─┐
        │ (String.includes logic)        │
        │                                │
        │ "John Smith" ∈ OCR text?      │
        │ YES ──→ VALID (confidence=0.95)
        │ NO  ──→ Check 2                │
        └────────────────┬───────────────┘
                         │
                         ▼
         ┌─ CHECK 2: Fuzzy Match (Jaro-Winkler) ─┐
         │ Threshold: >0.85                       │
         │                                         │
         │ "John Smith" ~= "Jon Smith"?          │
         │ SCORE: 0.89 ──→ VALID (conf=0.85)    │
         │ SCORE: 0.72 ──→ Check 3               │
         └────────────────┬────────────────────────┘
                          │
                          ▼
         ┌─ CHECK 3: Contextual Existence ─┐
         │ Is similar entity elsewhere?      │
         │                                   │
         │ "John Smith" appears in author   │
         │ metadata? ──→ PARTIAL VALID     │
         │ (confidence=0.65)                │
         │                                   │
         │ ELSE ──→ HALLUCINATED!          │
         └─────────────────────────────────┘
                     │
                     ▼
        ┌─ DISPOSITION ────────────────┐
        │ VALID    ──→ Add to entities  │
        │ INVALID  ──→ Log + discard    │
        │ PARTIAL  ──→ Quarantine check │
        └──────────────────────────────┘

RESULT:
  Original: 87 entities from Groq
  Filtered: 72 entities (82.8% kept)
  Hallucinated: 15 entities (17.2% rejected)
```

---

## 3. DOCUMENT CHUNKING STRATEGY

```
INPUT: 30,000 character FBI report

┌─────────────────────────────────────────────────────────┐
│ CHUNK STRATEGY: 6000 chars + 500 char overlap          │
└─────────────────────────────────────────────────────────┘

CHUNK 1:                   (chars 0-6000)
┌────────────────────────────────────────────────────────┐
│ [Header: "FEDERAL INVESTIGATION REPORT"]               │
│ [Evidence about Person A]                              │
│ [Evidence about Person B relationship]                 │
│ [Evidence about......]                                 │
└────────────────────────────────────────────────────────┘
          │ Overlap: 500 chars
          ▼
CHUNK 2:                   (chars 5500-11500)
┌────────────────────────────────────────────────────────┐
│ [Evidence about.....] ← (repeated from Chunk 1 tail)  │
│ [Person B financial records]                           │
│ [Timeline of events]                                   │
│ [Court findings...]                                    │
└────────────────────────────────────────────────────────┘
          │ Overlap: 500 chars
          ▼
CHUNK 3:                   (chars 11000-17000)
CHUNK 4:                    (chars 16500-22500)
CHUNK 5 (LAST):           (chars 22000-END, capped)

BENEFITS:
├─ Overlap prevents context loss at boundaries
├─ 5-chunk limit prevents token explosion (6000 chars ≈ 1500 tokens)
├─ Semantic boundary detection prefers paragraph breaks
└─ Cost: 4-5 Groq API calls @ ~1700 tokens each = ~$0.07/doc
```

---

## 4. OCR ENGINE DECISION TREE

```
                    Document Arrives
                           │
                           ▼
                ┌─────────────────────────────┐
                │ Examine First Page          │
                │ (5KB text extraction)       │
                └──────────────┬──────────────┘
                               │
                   ┌───────────┼───────────┐
                   │           │           │
                   ▼           ▼           ▼
             Has Tables?  Has Forms?  Has Financial Data?
             "TABLE"      "FORM"      "$1,234,567"
                   │           │           │
                   YES         YES         YES
                   │           │           │
                   └─────┬─────┴─────┬─────┘
                         │
                         ▼
                  USE AWS TEXTRACT
              (Better table: 82% vs 40%)
              (Cost: ~$1.50 per 1000 pages)
              (Speed: 45-90 sec per page)
                         │
                         ▼
           [Textract returns JSON with
            cells, confidence, bounding boxes]
                         │
                         ▼
           ✓ ROUTE TO FINANCIAL EXTRACTION
           ✓ TABLE PARSER PIPELINE

          ───────────────────────────────────

             No Tables / No Forms
                     │
                     ▼
            USE GOOGLE DOCUMENT AI
          (General OCR: 95.8% accuracy)
          (Cost: ~$0.60 per 1000 pages at scale)
          (Speed: 30-60 sec per page)
                     │
                     ▼
        [Google returns text + confidence + layout]
                     │
                     ▼
        ✓ ROUTE TO ENTITY EXTRACTION
        ✓ STANDARD PROCESSING PIPELINE

COST OPTIMIZATION:
├─ Project Truth capacity: $340 GCP credit
├─ 80% Google Doc AI: ~$186 (saves cost)
├─ 20% AWS Textract: ~$47 (for complex tables)
└─ Total budget: $233.25 + $106.75 buffer
   → Can process ~155,500 pages (4,000-5,000 documents)
```

---

## 5. QUALITY AUDIT SAMPLING MATRIX

```
Total Documents: 4,000
Target Confidence: 95%
Margin of Error: ±5%
Sample Size Needed: 355 documents (8.9% of total)

STRATIFIED BY DOCUMENT TYPE:
┌─────────────────────┬──────────────────┬────────────┐
│ Document Type       │ Population       │ Sample     │
├─────────────────────┼──────────────────┼────────────┤
│ Court Filings       │ 1,600 (40%)      │ 142 (40%)  │
│ Depositions         │ 1,200 (30%)      │ 107 (30%)  │
│ Emails              │ 800 (20%)        │ 71 (20%)   │
│ Financial Records   │ 400 (10%)        │ 35 (10%)   │
└─────────────────────┴──────────────────┴────────────┘

STRATIFIED BY EXTRACTION TYPE (within sample):
┌──────────────────────┬──────────────────┬──────────────┐
│ Extraction Type      │ Items to Check   │ Accuracy    │
├──────────────────────┼──────────────────┼──────────────┤
│ Entity Extraction    │ 177 samples      │ Target: >90% │
│ Relationship Extract │ 107 samples      │ Target: >85% │
│ Redaction Compliance │ 71 samples       │ Target: 100% │
└──────────────────────┴──────────────────┴──────────────┘

AUDIT WORKFLOW:
                   355 Sampled Docs
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    Entity Review  Relationship Review  Redaction Check
    (1-3 min each) (2-4 min each)      (1-2 min each)
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
               Compile Accuracy Report
                  (355 results)
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    Entity Accuracy  Rel Accuracy     Redaction Safety
    87.8%           83.2%            99.7%
    (target: 90%)   (target: 85%)    (target: 100%)
                          │
                          ▼
         Confidence Interval: [92.3%, 97.7%]
         (95% confidence true accuracy within ±5%)
```

---

## 6. QUEUE SYSTEM ARCHITECTURE

```
CURRENT PHASE (<100 docs/day): BullMQ + Redis

┌─────────────────────────────────────────────────┐
│ DOCUMENT UPLOAD                                 │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
          ┌─ Create job object ─┐
          │ { documentId, buffer │
          │   filename, source } │
          └─────────┬────────────┘
                    │
                    ▼
         ┌─ Add to BullMQ Queue ─┐
         │ redis.lpush(          │
         │   "documents",        │
         │   JSON.stringify(job) │
         │ )                     │
         └─────────┬─────────────┘
                   │
        ┌──────────┴──────────┐
        │  Queue Persistence  │
        │  (Redis expires     │
        │   in 24 hours)      │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
 Worker 1      Worker 2      Worker N
 (process)     (process)     (process)
    │              │              │
    └──────────────┼──────────────┘
                   │
                   ▼
       ┌─ Extraction Pipeline ─┐
       │  5 stages (see above)  │
       └──────────┬─────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    SUCCESS            FAILURE
    └─ Save to DB    ├─ Retry (exponential backoff)
    └─ Publish       │  Attempt 1: 2 sec delay
       to network    │  Attempt 2: 10 sec delay
    └─ Update UI     │  Attempt 3: 60 sec delay
                     ├─ After 3 attempts → DLQ
                     └─ Alert admin for manual review

FUTURE PHASE (>1000 docs/day): Temporal.io or Inngest
├─ Durable execution (survives worker restart)
├─ Event sourcing (replay any step for debugging)
├─ Multi-region redundancy
└─ $100-300/mo managed service
```

---

## 7. DATA FLOW: USER SEES RESULTS

```
USER VIEWS DOCUMENT ON PLATFORM
           │
           ▼
┌─ Query Supabase ─────────────────┐
│  SELECT * FROM truth_nodes      │
│  WHERE source_document_id = ?   │
│                                 │
│  + trust_verification (badge)   │
│  + data_provenance (source)     │
│  + nato_reliability_code        │
│  + extraction_confidence        │
└────────────┬────────────────────┘
             │
             ▼
┌─ 3D Visualization ────────┐
│  Node size = tier (1-4)   │
│  Node color = NATO code:  │
│    A = Green              │
│    B = Blue               │
│    C = Yellow             │
│    D = Orange             │
│    E = Red                │
│    F = Gray               │
│                           │
│  Node glow = confidence:  │
│    0.9-1.0 = bright      │
│    0.7-0.9 = medium      │
│    <0.7 = dim            │
└───────────┬────────────────┘
            │
            ▼
┌─ Link Visualization ──────────────┐
│  Link color = evidence type:      │
│    court_record = dark red        │
│    official = blue                │
│    leaked = orange                │
│    secondary = gray               │
│                                   │
│  Link glow = confidence:          │
│    Multiple evidence = bright     │
│    Single evidence = dim          │
│                                   │
│  Link style = source hierarchy:   │
│    primary = solid                │
│    secondary = dashed             │
│    tertiary = dotted              │
└───────────┬──────────────────────┘
            │
            ▼
┌─ Hover Tooltip ────────────────┐
│  Entity: "John Smith"          │
│  Type: PERSON                  │
│  Confidence: 0.87 (87%)        │
│  NATO Code: C (fairly reliable)│
│  Source Document: 2024-01-045  │
│  Extraction Date: 2026-03-22   │
│  Hallucination Check: PASSED   │
│  Redaction Check: PASSED       │
└────────────────────────────────┘
            │
            ▼
┌─ Click for Full Context ──────┐
│  [200 char excerpt showing    │
│   entity in original text]    │
│                               │
│  [Link to source document]    │
│  [Report hallucination]       │
│  [Request verification]       │
└───────────────────────────────┘
```

---

## 8. HALLUCINATION FILTERING CASCADE

```
LLM Output: 87 extracted entities + 34 relationships

PASS THROUGH FILTERS:
┌────────────────────────────────────────────┐
│ FILTER 1: Entity in Text?                  │
│ (exact OR fuzzy match >0.85)               │
│                                             │
│ Input: 87 entities                         │
│ Output: 72 entities (82.8% pass)          │
│ Removed: 15 hallucinations                 │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ FILTER 2: Relationship Valid?              │
│ (both endpoints in valid entities)         │
│                                             │
│ Input: 34 relationships                    │
│ Output: 28 relationships (82.4% pass)    │
│ Removed: 6 relationships with missing end │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ FILTER 3: Temporal Sanity Check            │
│ (Person A born after relationship? =ERROR) │
│                                             │
│ Input: 28 relationships                    │
│ Output: 26 relationships (92.9% pass)    │
│ Removed: 2 logical contradictions         │
└────────────────────────────────────────────┘
         │
         ▼
FINAL OUTPUT: 26 verified relationships
              72 verified entities
              HALLUCINATION RATE: 17.2%

CONFIDENCE REPORT:
├─ Original extraction quality: Medium
├─ Post-filter quality: High
├─ Suitable for: Tier C (fairly reliable)
└─ Ready for: Quarantine review before publishing
```

---

## 9. COST & CAPACITY BREAKDOWN

```
PROJECT TRUTH BUDGET: $340 GCP Credit

                                 PAGES       COST         % OF BUDGET
┌────────────────────────────────────────────────────────────────────┐
│ Google Document AI                                                  │
│   OCR (primary)             100,000 × $0.0015 = $150 (44%)        │
│   Table extraction (supplement) (included)                         │
├────────────────────────────────────────────────────────────────────┤
│ AWS Textract                                                        │
│   Complex documents          30,000 × $0.0015 = $45 (13%)         │
│   Table-heavy docs (supplement)                                    │
├────────────────────────────────────────────────────────────────────┤
│ Groq LLM (Entity Extraction)                                        │
│   4 API calls @ 1700 tokens avg                                    │
│   4,000 docs × $0.0001/token = $40 (12%)                         │
├────────────────────────────────────────────────────────────────────┤
│ Vision API (Redaction Detection)                                   │
│   Spot-check: ~500 documents = $5 (1.5%)                         │
├────────────────────────────────────────────────────────────────────┤
│ Subtotal Actual Usage:                            $240 (71%)       │
│ Safety Buffer:                                    $100 (29%)       │
├────────────────────────────────────────────────────────────────────┤
│ TOTAL ALLOCATED:                                  $340 (100%)      │
└────────────────────────────────────────────────────────────────────┘

DOCUMENT CAPACITY:
├─ Total pages: ~155,500 (depends on doc size)
├─ Average doc: 15 pages
├─ Total documents: ~4,000-5,000
├─ Total entities: ~350,000 (average 87/doc)
├─ Total relationships: ~130,000 (average 34/doc)
└─ Timeline: January-March 2026 (Q1)

SCALING PATH:
┌─────────────────┬──────────────┬──────────────┐
│ Scale           │ Monthly Cost │ Monthly Docs │
├─────────────────┼──────────────┼──────────────┤
│ Startup (Q1)    │ $340 (credit)│ 4,000-5,000  │
│ Growth (Q2-Q3)  │ $300-500     │ 2,000        │
│ Scale (Q4+)     │ $5,000-10K   │ 10,000+      │
└─────────────────┴──────────────┴──────────────┘
```

---

**End of Architecture Diagrams**

These diagrams represent the complete document processing pipeline for Project Truth, optimized for legal/investigative documents with built-in hallucination detection and compliance checking.
