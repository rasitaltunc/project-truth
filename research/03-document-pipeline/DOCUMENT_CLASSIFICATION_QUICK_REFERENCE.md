# QUICK REFERENCE: Document Type Classification
## Lookup Tables & Checklists for Project Truth

**Last Updated:** March 22, 2026
**Use Case:** Copy/paste reference while implementing

---

## DOCUMENT TYPES: BASELINE CONFIDENCE

```
TYPE                      BASELINE*    TYPICAL EVIDENCE              MIN SIGNALS
─────────────────────────────────────────────────────────────────────────────
indictment                0.95-1.00    "TRUE BILL" header, grand jury    2+
complaint                 0.90-0.95    "COMPLAINT" + "UNITED STATES"     2+
plea_agreement            0.92-0.98    "PLEA AGREEMENT" keyword          1+
court_order               0.85-0.90    "ORDERED & ADJUDGED"              1+
affidavit                 0.90-0.95    "SWORN TESTIMONY" / "PERJURY"     1+
deposition                0.88-0.93    "Q:" "A:" patterns (>10 pairs)    10+
fbi_report                0.95-0.99    "FD-302" or "FEDERAL BUREAU"      1+
search_warrant            0.90-0.95    "SEARCH WARRANT" + "PROBABLE"     2+
police_report             0.78-0.85    "INCIDENT REPORT" + "BADGE"       2+
grand_jury_transcript     0.85-0.90    "GRAND JURY" + "TRANSCRIPT"       2+
wiretap_application       0.92-0.97    "WIRETAP" + "INTERCEPTION"        2+
court_filing              0.70-0.80    General court header              1+
government_filing         0.75-0.82    Agency letterhead                 1+
credible_journalism       0.80-0.90    Byline + publication name         2+
sworn_testimony           0.85-0.92    Oath language + court context     2+
legal_correspondence      0.80-0.88    Attorney letterhead + formal      2+
deposition_reference      0.70-0.80    References to deposition          2+

*Baseline = confidence floor when document clearly matches type
 Penalties applied for: redaction, OCR errors, language, corruption
```

---

## HEADER PATTERNS: REGEX COOKBOOK

**Copy these directly into code:**

```typescript
// Copy-paste ready regex patterns (order matters - test in sequence)

const HEADER_PATTERNS_ORDERED = [
  // ─── Tier 0: Maximum Signal Strength ───
  { pattern: /^A TRUE BILL OF INDICTMENT/i, type: 'indictment', weight: 1.0 },
  { pattern: /^THE GRAND JURY[^\n]*(?:INDICTS|PRESENTS)/i, type: 'indictment', weight: 1.0 },
  { pattern: /^(?:UNITED STATES OF AMERICA|).*?(?:INDICTS|INDICATES|CHARGES)/i, type: 'indictment', weight: 1.0 },

  // ─── FBI Reports ───
  { pattern: /^(?:FEDERAL BUREAU OF INVESTIGATION|FD-302)/i, type: 'fbi_report', weight: 1.0 },
  { pattern: /^(?:ELECTRONIC COMMUNICATION|EC\s*$)/i, type: 'fbi_report', weight: 0.95 },
  { pattern: /^FBI FORM \d{3,}/i, type: 'fbi_report', weight: 0.90 },
  { pattern: /SAC:\s+|AIRTEL|^\[FBI\]/i, type: 'fbi_report', weight: 0.85 },

  // ─── Complaint ───
  { pattern: /^(?:UNITED STATES OF AMERICA )?(?:CRIMINAL )?COMPLAINT/i, type: 'complaint', weight: 1.0 },
  { pattern: /^(?:CRIMINAL )?INFORMATION/i, type: 'complaint', weight: 0.85 },
  { pattern: /^COMPLAINT FOR ARREST/i, type: 'complaint', weight: 0.95 },

  // ─── Plea Agreement ───
  { pattern: /^.*?(?:PLEA AGREEMENT|PLEA BARGAIN)/i, type: 'plea_agreement', weight: 1.0 },
  { pattern: /^(?:GUILTY PLEA|PLEA OF GUILTY)/i, type: 'plea_agreement', weight: 0.95 },
  { pattern: /^(?:PLEA AGREEMENT AND )?SENTENCING MEMORANDUM/i, type: 'plea_agreement', weight: 0.90 },

  // ─── Court Order ───
  { pattern: /^(?:UNITED STATES )?(?:DISTRICT|CIRCUIT) COURT[^\n]*ORDER/i, type: 'court_order', weight: 0.95 },
  { pattern: /^ORDER[\s:]|^FINAL ORDER/i, type: 'court_order', weight: 0.80 },
  { pattern: /^JUDGMENT AND COMMITMENT/i, type: 'court_order', weight: 0.90 },

  // ─── Deposition ───
  { pattern: /^(?:VIDEOTAPE\s+)?DEPOSITION[^\n]*(?:TRANSCRIPT|UPON ORAL)/i, type: 'deposition', weight: 1.0 },
  { pattern: /^(?:IN THE )?MATTER OF.*DEPOSITION/i, type: 'deposition', weight: 0.95 },

  // ─── Affidavit ───
  { pattern: /^AFFIDAVIT[^\n]*(?:SUPPORT|OBJECTION)/i, type: 'affidavit', weight: 1.0 },
  { pattern: /^(?:SWORN )?AFFIDAVIT|^AFFIDAVIT OF/i, type: 'affidavit', weight: 0.95 },
  { pattern: /^DECLARATION (?:UNDER PENALTY OF PERJURY|OF)/i, type: 'affidavit', weight: 0.92 },

  // ─── Search Warrant ───
  { pattern: /^(?:APPLICATION FOR )?(?:AN?\s+)?SEARCH WARRANT/i, type: 'search_warrant', weight: 1.0 },
  { pattern: /^AFFIDAVIT IN SUPPORT OF.*SEARCH/i, type: 'search_warrant', weight: 0.98 },
  { pattern: /^WARRANT FOR SEARCH OF/i, type: 'search_warrant', weight: 0.95 },

  // ─── Police Report ───
  { pattern: /^(?:INCIDENT|POLICE|OFFENSE|LAW ENFORCEMENT) REPORT/i, type: 'police_report', weight: 0.95 },
  { pattern: /^REPORT OF (?:INVESTIGATION|INCIDENT|OFFENSE)/i, type: 'police_report', weight: 0.90 },
  { pattern: /^(?:CASE|REPORT|INCIDENT)\s+#\s*\d+[\s:].*(?:POLICE|INCIDENT)/i, type: 'police_report', weight: 0.85 },

  // ─── Grand Jury Transcript ───
  { pattern: /^(?:SEALED\s+)?(?:SECRET\s+)?GRAND JURY (?:PROCEEDINGS?|TESTIMONY|TRANSCRIPT)/i, type: 'grand_jury_transcript', weight: 1.0 },
  { pattern: /^BEFORE THE GRAND JURY/i, type: 'grand_jury_transcript', weight: 0.95 },
  { pattern: /^GRAND JURY SESSION/i, type: 'grand_jury_transcript', weight: 0.90 },

  // ─── Wiretap Application ───
  { pattern: /^(?:APPLICATION FOR|IN SUPPORT OF).*(?:WIRETAP|INTERCEPTION)/i, type: 'wiretap_application', weight: 1.0 },
  { pattern: /^SEALED AFFIDAVIT.*ORDER AUTHORIZING INTERCEPTION/i, type: 'wiretap_application', weight: 0.98 },

  // ─── Court Filing (general) ───
  { pattern: /^IN THE (?:UNITED STATES )?(?:DISTRICT|CIRCUIT) COURT/i, type: 'court_filing', weight: 0.85 },
  { pattern: /^(?:WESTERN|EASTERN|NORTHERN|SOUTHERN) DISTRICT OF/i, type: 'court_filing', weight: 0.80 },
  { pattern: /^MOTION (?:FOR|TO|REGARDING)/i, type: 'court_filing', weight: 0.80 },
  { pattern: /^BRIEF (?:IN SUPPORT|ON BEHALF)/i, type: 'court_filing', weight: 0.80 },

  // ─── Government Filing ───
  { pattern: /^(?:DEPARTMENT OF|FEDERAL|OFFICE OF|AGENCY)/i, type: 'government_filing', weight: 0.75 },
  { pattern: /^(?:IRS|SEC|EPA|OSHA)\s+(?:FORM|FILING|DOCUMENT)/i, type: 'government_filing', weight: 0.85 },

  // ─── News Article ───
  { pattern: /^(?:ASSOCIATED PRESS|REUTERS|AFP|BBC|CNN|WSJ|NYT|GUARDIAN)/i, type: 'credible_journalism', weight: 0.90 },
  { pattern: /^By\s+\w+.*?\d{4}|^(?:Published|Posted).*(?:20\d{2}|yesterday|today)/i, type: 'credible_journalism', weight: 0.75 },
];

// Usage:
function findBestHeaderMatch(headerText: string) {
  for (const { pattern, type, weight } of HEADER_PATTERNS_ORDERED) {
    if (pattern.test(headerText)) {
      return { type, confidence: weight };
    }
  }
  return null;
}
```

---

## KEYWORD FREQUENCY TABLE

**Use these to weight classification confidence:**

```typescript
const KEYWORD_WEIGHTS: Record<DocumentType, {
  keywords: string[];
  weight: number;
  minCount: number;
}> = {
  indictment: {
    keywords: ['true bill', 'grand jury', 'indicts', 'charges', 'defendant', 'count i', 'count ii'],
    weight: 1.0,
    minCount: 2,
  },
  plea_agreement: {
    keywords: ['plea agreement', 'defendant agrees', 'government recommends', 'sentencing recommendation'],
    weight: 1.0,
    minCount: 1,
  },
  affidavit: {
    keywords: ['sworn', 'penalty of perjury', 'declare under', 'affiant', 'signature'],
    weight: 0.95,
    minCount: 1,
  },
  deposition: {
    keywords: ['deposition', 'sworn testimony', 'stenographer', 'examination', 'page and line'],
    weight: 0.90,
    minCount: 1,
  },
  fbi_report: {
    keywords: ['federal bureau', 'special agent', 'fc-', 'fd-302', 'confidential informant', 'subject'],
    weight: 1.0,
    minCount: 2,
  },
  search_warrant: {
    keywords: ['search warrant', 'probable cause', 'seizure', 'aforesaid premises', 'officer'],
    weight: 0.95,
    minCount: 2,
  },
  police_report: {
    keywords: ['incident', 'offense', 'complainant', 'suspect', 'badge', 'apprehended', 'uniform'],
    weight: 0.85,
    minCount: 2,
  },
  court_order: {
    keywords: ['ordered', 'adjudged', 'decreed', 'judgment', 'ordered and decreed'],
    weight: 0.90,
    minCount: 1,
  },
  credible_journalism: {
    keywords: ['published', 'reported', 'according to', 'spokesperson', 'journalist', 'staff writer'],
    weight: 0.80,
    minCount: 2,
  },
};

// USAGE: Count keyword matches in document
function scoreByKeywords(content: string, docType: DocumentType): number {
  const config = KEYWORD_WEIGHTS[docType];
  if (!config) return 0;

  const lower = content.toLowerCase();
  let matches = 0;

  for (const keyword of config.keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const found = lower.match(regex);
    if (found) matches += found.length;
  }

  if (matches < config.minCount) return 0;
  return config.weight * Math.min(matches / 5, 1);  // Diminishing returns
}
```

---

## CONFIDENCE ADJUSTMENT MATRIX

**Apply multipliers based on document conditions:**

```typescript
interface ConfidenceAdjustments {
  redaction: number;           // 1.0 = no redaction, 0.5 = 50% redacted
  ocrConfidence: number;       // 0-1, how good is OCR
  languageBonus: number;       // 1.0 = English, 0.9 = translated
  ageOfDocument: number;       // 1.0 = recent, 0.95 = old
  sourceReliability: number;   // 1.0 = official, 0.8 = leaked
}

function adjustConfidence(
  baseConfidence: number,
  adjustments: ConfidenceAdjustments
): number {
  let adjusted = baseConfidence;

  // Redaction penalty
  adjusted *= (1 - adjustments.redaction * 0.25);

  // OCR quality multiplier
  adjusted *= adjustments.ocrConfidence;

  // Language penalty
  adjusted *= adjustments.languageBonus;

  // Age penalty (documents > 50 years may have transcription errors)
  adjusted *= adjustments.ageOfDocument;

  // Source reliability (leaked docs get lower confidence)
  adjusted *= adjustments.sourceReliability;

  return Math.max(adjusted, 0);  // Never go negative
}

// EXAMPLE:
const adjusted = adjustConfidence(0.95, {
  redaction: 0.2,          // 20% redacted
  ocrConfidence: 0.85,     // Good OCR
  languageBonus: 1.0,      // English
  ageOfDocument: 0.98,     // Document is old
  sourceReliability: 1.0,  // Official source
});
// Result: 0.95 * 0.8 * 0.85 * 0.98 * 1.0 = 0.63 (still good)
```

---

## DECISION TREE: Manual Review Threshold

**When to flag for human review:**

```
START
│
├─ Confidence >= 0.85?
│  └─ YES: Accept automatically ✓
│  └─ NO: Continue...
│
├─ Confidence >= 0.70 & >= 2 signals?
│  └─ YES: Accept automatically ✓
│  └─ NO: Continue...
│
├─ Redaction > 60%?
│  └─ YES: Flag for review ⚠️
│  └─ NO: Continue...
│
├─ Did rules & ML disagree?
│  └─ YES: Flag for review ⚠️
│  └─ NO: Continue...
│
├─ OCR confidence < 0.5?
│  └─ YES: Flag for review ⚠️
│  └─ NO: Accept automatically ✓
│
└─ Confidence >= 0.60?
   └─ YES: Accept with lower confidence (alert user)
   └─ NO: Flag for review ⚠️
```

---

## QUICK TEST: Is My Classifier Working?

```typescript
// Run these 5 tests to validate implementation

async function validateClassifier() {
  const tests = [
    {
      name: 'FBI Report Header',
      content: 'FEDERAL BUREAU OF INVESTIGATION\nFD-302\nDate: 03/15/2025',
      expectedType: 'fbi_report',
      minConfidence: 0.90,
    },
    {
      name: 'Indictment',
      content: 'A TRUE BILL OF INDICTMENT\nThe Grand Jury of New York County\nindicts the defendant',
      expectedType: 'indictment',
      minConfidence: 0.90,
    },
    {
      name: 'Deposition (Q&A)',
      content: 'Q: State your name.\nA: John Smith.\nQ: What is your occupation?\nA: Attorney.',
      expectedType: 'deposition',
      minConfidence: 0.80,
    },
    {
      name: 'Affidavit',
      content: 'AFFIDAVIT\nI, Jane Doe, being duly sworn under penalty of perjury...',
      expectedType: 'affidavit',
      minConfidence: 0.85,
    },
    {
      name: 'Plea Agreement',
      content: 'PLEA AGREEMENT\nDefendant agrees to plead guilty.\nThe Government recommends...',
      expectedType: 'plea_agreement',
      minConfidence: 0.85,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await classifyByRules(test.content, 'test.txt');

    const isCorrect = result.type === test.expectedType && result.confidence >= test.minConfidence;

    if (isCorrect) {
      console.log(`✓ PASS: ${test.name}`);
      passed++;
    } else {
      console.log(
        `✗ FAIL: ${test.name}\n` +
        `  Expected: ${test.expectedType} (>= ${test.minConfidence})\n` +
        `  Got: ${result.type} (${result.confidence.toFixed(2)})`
      );
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}
```

---

## DATABASE QUERIES: Common Operations

```sql
-- Find documents needing manual review
SELECT id, document_type_auto, classification_confidence
FROM documents
WHERE requires_manual_review = true
  AND classification_confidence < 0.70
ORDER BY classification_confidence ASC
LIMIT 50;

-- Classification accuracy by type
SELECT
  document_type_auto,
  COUNT(*) as total,
  COUNT(CASE WHEN manual_override_by IS NULL THEN 1 END) as accepted,
  ROUND(100.0 * COUNT(CASE WHEN manual_override_by IS NULL THEN 1 END) / COUNT(*), 1) as acceptance_rate,
  ROUND(AVG(classification_confidence)::NUMERIC, 3) as avg_confidence
FROM documents
WHERE document_type_auto IS NOT NULL
GROUP BY document_type_auto
ORDER BY total DESC;

-- Find false positives (overridden classifications)
SELECT
  document_type_auto as classifier_result,
  (SELECT document_type FROM documents d2 WHERE d2.id = d1.id) as final_type,
  COUNT(*) as count
FROM documents d1
WHERE manual_override_by IS NOT NULL
GROUP BY document_type_auto, final_type;

-- Performance metrics (last 7 days)
SELECT
  DATE_TRUNC('day', last_classification_at) as day,
  COUNT(*) as classified_count,
  ROUND(AVG(CASE WHEN requires_manual_review THEN 1 ELSE 0 END) * 100, 1) as review_rate_pct,
  ROUND(AVG(classification_confidence)::NUMERIC, 3) as avg_confidence
FROM documents
WHERE last_classification_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', last_classification_at)
ORDER BY day DESC;
```

---

## TROUBLESHOOTING GUIDE

| Symptom | Cause | Fix |
|---------|-------|-----|
| Classifier returns 0.5 confidence for everything | Model not tuned; too many types | Reduce types or retrain BERT |
| False positives (wrong type, high confidence) | LLM hallucinating | Add keyword filters; reduce LLM temp |
| Many "manual review" flags | Threshold too strict (> 0.85) | Lower threshold to 0.70 |
| Slow classification (> 500ms) | Using LLM for all docs | Switch to hybrid: rules first, LLM fallback only |
| Poor OCR documents misclassified | OCR errors changing header | Add robustness: multiple header patterns |
| Q&A documents wrongly classified | Deposition pattern weak | Require >= 15 Q:A pairs, not 10 |
| Redacted docs fail | No metadata fallback | Add filename-based classification |

---

## PRODUCTION CHECKLIST

Before deploying to production:

```
✓ Rules-based classifier
  ✓ All 17 document types covered
  ✓ Tested on 150+ real documents
  ✓ Accuracy >= 87%
  ✓ Latency < 10ms per doc

✓ Database
  ✓ Schema migration applied
  ✓ Indexes created
  ✓ Audit trail working

✓ API Endpoint
  ✓ /api/documents/classify route exists
  ✓ Input validation passing
  ✓ Error handling complete
  ✓ Rate limiting applied

✓ Manual Override
  ✓ Override form displays
  ✓ Confidence bars render
  ✓ Audit log captures overrides

✓ Monitoring
  ✓ Alerts set for > 20% manual reviews
  ✓ Daily accuracy reports running
  ✓ Cost tracking enabled

✓ Documentation
  ✓ Deployment runbook written
  ✓ Team trained
  ✓ Rollback plan prepared
```
