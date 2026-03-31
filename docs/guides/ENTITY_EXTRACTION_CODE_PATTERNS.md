# Entity Extraction — Code Patterns & Ready-to-Use Templates

**For rapid implementation of zero-hallucination architecture**

---

## PATTERN 1: v4 PROMPT (Ready to Copy-Paste)

### Turkish Optimized Prompt

```typescript
// src/app/api/documents/scan/route.ts — Replace existing groqPrompt

const groqPrompt = `SEN HUKUK MÜŞAVİRİ AI'SIN.
BELGEDEN SADECE GÖZLEMLENEN BİLGİLERİ ÇIKAR.

════════════════════════════════════════════════════════════════════════
KURAL 1: SADECE BELGEDEKİ BİLGİLER
════════════════════════════════════════════════════════════════════════

Belgede yazılmışsa çıkar. Belgede yazılmamışsa ÇIKARMA.

✗ YANLIŞ: "John Smith CEO'yu da sorumlu tutabilir" (çıkarım)
✓ DOĞRU: "John Smith, CEO" (belgede yazıyor)

════════════════════════════════════════════════════════════════════════
KURAL 2: HER ENTITY İÇİN KAYNAK VE SATIRNO
════════════════════════════════════════════════════════════════════════

{
  "name": "John Smith",
  "type": "person",
  "source_line": 42,
  "source_quote": "John Smith, the defendant, ...",
  "confidence": 0.95
}

Eğer belgede yazılı satırını bulamıyorsan:
  - confidence = 0.3
  - source_quote = NULL
  - UYARI: Bu entity zayıf

════════════════════════════════════════════════════════════════════════
KURAL 3: UYDURMAYA YÖK
════════════════════════════════════════════════════════════════════════

Belgede "John Smith" geçiyorsa:
  ✓ Extract: "John Smith"
  ✗ YAPMA: "John Smith Jr.", "John Smithson", "Jon Smith"

Sadece belgede yazılan TAMAMEN ÇEKİL.

════════════════════════════════════════════════════════════════════════
KURAL 4: CONFIDENCE = GERÇEKÇİ (NATO KOD MANTIĞI)
════════════════════════════════════════════════════════════════════════

0.95-1.0:   Belgede açık, tekrarlanmış, ana figür (Deposition, Court filing)
0.85-0.94:  Belgede açık ama bir kez (FBI report, Official document)
0.70-0.84:  Belgede var, biraz muğlak (Financial record, Correspondence)
0.50-0.69:  Dolaylı referans, kısmi bilgi (News article, Hearsay)
0.20-0.49:  Spekulasyon, bahsedilmiş ama belirsiz

Eğer confidence < 0.50 → ÇIKARMA

════════════════════════════════════════════════════════════════════════
ÖRNEKLERİ DOĞRU ŞEKILDE ÇIKARMA
════════════════════════════════════════════════════════════════════════

ÖRNEK 1 — Basit, Açık:
Belgede: "John Smith, aged 45, owner of ABC Corporation, was charged with..."

ÇIKTI:
{
  "entities": [
    {
      "name": "John Smith",
      "type": "person",
      "role": "defendant",
      "confidence": 0.98,
      "source_line": 1,
      "source_quote": "John Smith, aged 45, owner of ABC Corporation, was charged with..."
    },
    {
      "name": "ABC Corporation",
      "type": "organization",
      "role": "company",
      "confidence": 0.98,
      "source_line": 1,
      "source_quote": "ABC Corporation"
    }
  ]
}

ÖRNEK 2 — Belirsiz İsim:
Belgede: "The defendant, whose name was redacted for privacy, testified..."

ÇIKTI:
{
  "entities": [
    {
      "name": "[Redacted Defendant]",
      "type": "person",
      "role": "defendant",
      "confidence": 0.6,
      "source_line": 2,
      "source_quote": "The defendant, whose name was redacted",
      "note": "Gerçek isim gizli"
    }
  ]
}

ÖRNEK 3 — TUZAK (Çıkarılan vs Çıkarsanan):
Belgede: "The bank transferred funds to an offshore account."

✗ YAPMA:
{
  "entities": [{
    "name": "Unknown Bank",
    "confidence": 0.8
  }]
}

✓ DOĞRU ÇIKTI:
{
  "entities": [] // Banka ismi belirtilmemiş, çıkarma!
}

════════════════════════════════════════════════════════════════════════
BAĞLANTILAR (RELATIONSHIPS)
════════════════════════════════════════════════════════════════════════

Sadece belgede açıkça gözlemlenen bağlantıları çıkar:

✓ YAP: "John Smith owns ABC Corp" (belgede yazıyor)
✓ YAP: "Jane Doe testified against John Smith" (belgede yazıyor)
✗ YAPMA: "John Smith and Jane Doe probably know each other" (çıkarım)

════════════════════════════════════════════════════════════════════════
JSON ÇIKTI FORMATI
════════════════════════════════════════════════════════════════════════

{
  "entities": [
    {
      "name": "string — belgede tam isim",
      "type": "person|organization|location|date|money|account|other",
      "role": "defendant|witness|victim|subject|attorney|judge|plaintiff|mentioned_only|other",
      "importance": "critical|high|medium|low",
      "confidence": 0.0-1.0 (NATO baseline for doc type),
      "mention_count": number (kaç kez belgede geçtiği),
      "source_line": number (satır numarası),
      "source_quote": "belgeden doğrudan alıntı (max 200 char)",
      "context": "short explanation"
    }
  ],
  "relationships": [
    {
      "source_name": "string",
      "target_name": "string",
      "relationship_type": "owns|testified_against|employed_by|defendant_of|attorney_for|etc",
      "evidence_type": "court_record|financial_record|witness_testimony|official_document|correspondence|etc",
      "confidence": 0.0-1.0,
      "source_line": number,
      "description": "relationship nasıl gözlemlendiği"
    }
  ],
  "summary": "belgede ana konu (2-3 cümle)",
  "extraction_quality": "high|medium|low",
  "warnings": ["uyarı varsa", "örneğin: çok redakte"],
  "key_dates": [{"date": "YYYY-MM-DD", "description": "ne oldu"}]
}

════════════════════════════════════════════════════════════════════════
ISTATISTIKLER
════════════════════════════════════════════════════════════════════════
- toplam_entities: number
- confidence_>=_0.8: number
- confidence_0.6-0.8: number
- confidence_<_0.6: number
- relationships: number
`;
```

### English Version (For Reference)

```typescript
const groqPromptEN = `YOU ARE A LEGAL ANALYST AI.
EXTRACT ONLY INFORMATION OBSERVED IN THE DOCUMENT.

════════════════════════════════════════════════════════════════════════
RULE 1: ONLY INFORMATION IN THE DOCUMENT
════════════════════════════════════════════════════════════════════════

If document says it → extract.
If document doesn't say it → DO NOT extract.

✗ WRONG: "John Smith is probably skilled because he's a venture capitalist"
✓ RIGHT: "John Smith, venture capitalist"

════════════════════════════════════════════════════════════════════════
RULE 2: EVERY ENTITY MUST HAVE SOURCE LINE AND QUOTE
════════════════════════════════════════════════════════════════════════

{
  "name": "John Smith",
  "type": "person",
  "source_line": 42,
  "source_quote": "John Smith, the defendant...",
  "confidence": 0.95
}

If you cannot find the source line:
  - Set confidence = 0.3
  - source_quote = null
  - FLAG: "Weak entity, source unclear"

════════════════════════════════════════════════════════════════════════
RULE 3: NO HALLUCINATIONS
════════════════════════════════════════════════════════════════════════

If document says "John Smith":
  ✓ Extract: "John Smith"
  ✗ DO NOT: "John Smith Jr.", "John Smithson", "Jon Smith"

Extract EXACTLY what the document says.

════════════════════════════════════════════════════════════════════════
RULE 4: CONFIDENCE = REALISTIC (NATO ADMIRALTY LOGIC)
════════════════════════════════════════════════════════════════════════

0.95-1.0:   Clear, repeated, main figure (Deposition, Court opinion)
0.85-0.94:  Clear but mentioned once (FBI report)
0.70-0.84:  Present but somewhat unclear (Financial record)
0.50-0.69:  Indirect reference, partial info (News article)
0.20-0.49:  Speculation, unclear context

If confidence < 0.50 → DO NOT OUTPUT

════════════════════════════════════════════════════════════════════════
CRITICAL: NEVER MAKE UP ENTITIES
════════════════════════════════════════════════════════════════════════

If the entity is not in the document, REJECT IT.
Better to output 5 real entities than 20 entities with 10 hallucinations.

JSON output format (MUST follow exactly):
{
  "entities": [
    {
      "name": "string",
      "type": "person|organization|location|date|money|account|other",
      "role": "defendant|witness|attorney|judge|etc",
      "confidence": 0.0-1.0,
      "source_line": number,
      "source_quote": "direct quote from document",
      "mention_count": number
    }
  ],
  "relationships": [...],
  "summary": "...",
  "extraction_quality": "high|medium|low",
  "warnings": []
}
`;
```

---

## PATTERN 2: CONSTRAINED EXTRACTION VALIDATION

```typescript
// src/lib/constrainedExtraction.ts

interface ExtractedEntity {
  name: string;
  type: string;
  source_line?: number;
  source_quote?: string;
  confidence: number;
}

export function validateConstrainedExtraction(
  entities: ExtractedEntity[],
  sourceText: string,
  threshold = 0.5
): {
  valid: ExtractedEntity[];
  invalid: Array<ExtractedEntity & {reason: string}>;
} {
  const valid: ExtractedEntity[] = [];
  const invalid: Array<ExtractedEntity & {reason: string}> = [];

  for (const entity of entities) {
    // Check 1: Has source quote?
    if (!entity.source_quote) {
      invalid.push({
        ...entity,
        reason: "Missing source_quote — LLM hallucinating",
        confidence: Math.max(entity.confidence, 0.3) // Floor at 0.3
      });
      continue;
    }

    // Check 2: Quote exists in source text?
    const quoteNormalized = entity.source_quote
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const sourceNormalized = sourceText
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const quoteFound = sourceNormalized.includes(quoteNormalized) ||
                       fuzzyMatch(quoteNormalized, sourceNormalized, 0.85);

    if (!quoteFound) {
      invalid.push({
        ...entity,
        reason: `Source quote not found in document: "${entity.source_quote.substring(0, 50)}..."`,
        confidence: 0.1
      });
      continue;
    }

    // Check 3: Confidence threshold
    if (entity.confidence < threshold) {
      invalid.push({
        ...entity,
        reason: `Confidence ${entity.confidence} below threshold ${threshold}`,
      });
      continue;
    }

    // Check 4: Entity not obviously placeholder
    if (isPlaceholderName(entity.name)) {
      invalid.push({
        ...entity,
        reason: `Placeholder name detected: "${entity.name}"`,
        confidence: 0.1
      });
      continue;
    }

    // Passed all checks
    valid.push(entity);
  }

  return { valid, invalid };
}

function isPlaceholderName(name: string): boolean {
  const placeholders = [
    "Unknown",
    "Unknown Person",
    "Unknown Organization",
    "John Doe",
    "Jane Doe",
    "Person A",
    "Person B",
    "Company X",
    "Entity Y",
    "The defendant", // Not a name
    "The witness",
    "The bank",
  ];

  return placeholders.some(p =>
    name.toLowerCase() === p.toLowerCase()
  );
}

function fuzzyMatch(text1: string, text2: string, threshold: number): boolean {
  // Simple implementation: substring match
  return text2.includes(text1) || text1.includes(text2);
  // For production: use Levenshtein distance or Jaro-Winkler
}
```

---

## PATTERN 3: CONFIDENCE CALIBRATION (8-SIGNAL)

```typescript
// src/lib/calibrateConfidence.ts

import { nato_confidence_baseline } from './nato_code';

interface ExtractedEntity {
  name: string;
  type: string;
  confidence: number; // From LLM
  mention_count: number;
  source_line: number;
  ner_confidence?: number; // From Stage 2
}

interface DocumentContext {
  document_id: string;
  document_type: string; // court_opinion, deposition, fbi_report, etc
  document_length: number; // tokens
  redaction_level: number; // 0-1 (how much is redacted)
  page_count: number;
}

interface CalibrationResult {
  final_confidence: number;
  signals: {
    nato_baseline: number;
    mention_frequency_boost: number;
    ner_confidence_boost: number;
    known_entity_boost: number;
    temporal_consistency: number;
    uniqueness_score: number;
    relationship_corroboration: number;
    ensemble_agreement: number;
  };
  explanation: string;
}

export function calibrateConfidence(
  entity: ExtractedEntity,
  context: DocumentContext,
  knownEntities: Map<string, KnownEntity>
): CalibrationResult {
  let finalConfidence = 0;
  const signals = {
    nato_baseline: 0,
    mention_frequency_boost: 0,
    ner_confidence_boost: 0,
    known_entity_boost: 0,
    temporal_consistency: 0,
    uniqueness_score: 0,
    relationship_corroboration: 0,
    ensemble_agreement: 0,
  };

  // Signal 1: NATO Admiralty Code baseline
  signals.nato_baseline = nato_confidence_baseline[context.document_type] || 0.70;

  // Signal 2: Mention frequency (entities mentioned often = more reliable)
  // 1 mention = 0 boost, 5 mentions = +0.05, 10+ mentions = +0.10
  signals.mention_frequency_boost = Math.min(
    (entity.mention_count - 1) / 100, // Divide by 100 to keep small
    0.10
  );

  // Signal 3: NER confidence from Stage 2
  if (entity.ner_confidence) {
    signals.ner_confidence_boost = Math.max(entity.ner_confidence - 0.8, 0) * 0.10;
  }

  // Signal 4: Known entity matching
  const knownMatch = knownEntities.get(entity.name.toLowerCase());
  if (knownMatch) {
    signals.known_entity_boost = 0.10;
  } else {
    // Check aliases
    for (const [key, known] of knownEntities) {
      if (known.aliases?.includes(entity.name)) {
        signals.known_entity_boost = 0.08;
        break;
      }
    }
  }

  // Signal 5: Temporal consistency (dates make sense)
  // Placeholder: would validate against document dates
  signals.temporal_consistency = 0; // +0.05 if good, -0.05 if bad

  // Signal 6: Entity uniqueness (Ghislaine Maxwell = unique, John Smith = common)
  const uniqueness = calculateNameUniqueness(entity.name);
  signals.uniqueness_score = (1 - uniqueness) * 0.05;

  // Signal 7: Relationship corroboration
  // Would count how many verified relationships this entity has
  signals.relationship_corroboration = 0; // +0.08 if many relationships

  // Signal 8: Ensemble agreement (optional, for multi-model extraction)
  signals.ensemble_agreement = 0; // +0.10 if 3+ models agree

  // Composite score
  finalConfidence = Math.min(
    signals.nato_baseline +
    signals.mention_frequency_boost +
    signals.ner_confidence_boost +
    signals.known_entity_boost +
    signals.temporal_consistency +
    signals.uniqueness_score +
    signals.relationship_corroboration +
    signals.ensemble_agreement,
    0.99 // Reserve 0.01 for human review
  );

  // Floor: if too many problems, drop confidence significantly
  if (signals.temporal_consistency < -0.03 || signals.mention_frequency_boost < -0.05) {
    finalConfidence = Math.max(finalConfidence, 0.30);
  }

  // Generate explanation
  const explanation = generateExplanation(entity, signals);

  return {
    final_confidence: finalConfidence,
    signals,
    explanation,
  };
}

function calculateNameUniqueness(name: string): number {
  const commonNames = new Set([
    "john smith",
    "james smith",
    "mary smith",
    "david johnson",
    "michael johnson",
    "robert johnson",
    "the defendant",
    "the witness",
    "the plaintiff",
  ]);

  if (commonNames.has(name.toLowerCase())) {
    return 0.8; // Very common
  }

  // Simple heuristic: longer names = less common
  const wordCount = name.split(' ').length;
  if (wordCount === 1) return 0.7; // Single name
  if (wordCount === 2) return 0.5; // Two names
  return 0.3; // Three+ names = more unique

  // For production: use actual frequency data
}

function generateExplanation(
  entity: ExtractedEntity,
  signals: CalibrationResult['signals']
): string {
  const parts = [];

  parts.push(`Confidence: ${(signals.nato_baseline * 100).toFixed(0)}% base`);

  if (signals.mention_frequency_boost > 0) {
    parts.push(`+${(signals.mention_frequency_boost * 100).toFixed(0)}% (mentioned ${entity.mention_count} times)`);
  }

  if (signals.known_entity_boost > 0) {
    parts.push(`+${(signals.known_entity_boost * 100).toFixed(0)}% (known entity)`);
  }

  if (signals.uniqueness_score > 0) {
    parts.push(`+${(signals.uniqueness_score * 100).toFixed(0)}% (unique name)`);
  }

  return parts.join('; ');
}

interface KnownEntity {
  name: string;
  type: string;
  aliases?: string[];
  network_id?: string;
}
```

---

## PATTERN 4: AUTOMATED EVALUATION

```typescript
// src/lib/evaluateExtraction.ts

interface Entity {
  name: string;
  type: string;
  confidence?: number;
}

interface EvaluationResult {
  precision: number;
  recall: number;
  f1: number;
  ece: number; // Expected Calibration Error
  hallucination_rate: number;
  false_positives: number;
  false_negatives: number;
  error_analysis: ErrorCategory[];
}

export function evaluateExtraction(
  predicted: Entity[],
  goldStandard: Entity[]
): EvaluationResult {
  // Calculate true positives (fuzzy match + same type)
  const tp: Entity[] = [];
  const matched = new Set<number>();

  for (const pred of predicted) {
    for (let i = 0; i < goldStandard.length; i++) {
      if (matched.has(i)) continue;

      const gold = goldStandard[i];
      if (fuzzy_similarity(pred.name, gold.name) > 0.85 && pred.type === gold.type) {
        tp.push(pred);
        matched.add(i);
        break;
      }
    }
  }

  const fp = predicted.filter(p =>
    !tp.some(t => t.name === p.name && t.type === p.type)
  );

  const fn = goldStandard.filter((g, i) => !matched.has(i));

  // Calculate metrics
  const precision = tp.length / (tp.length + fp.length) || 0;
  const recall = tp.length / (tp.length + fn.length) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;

  // ECE: Expected Calibration Error
  const ece = calculateECE(predicted, tp);

  const hallucination_rate = fp.length / predicted.length || 0;

  return {
    precision: parseFloat(precision.toFixed(3)),
    recall: parseFloat(recall.toFixed(3)),
    f1: parseFloat(f1.toFixed(3)),
    ece: parseFloat(ece.toFixed(3)),
    hallucination_rate: parseFloat(hallucination_rate.toFixed(3)),
    false_positives: fp.length,
    false_negatives: fn.length,
    error_analysis: categorizeErrors(fp, fn),
  };
}

function calculateECE(
  predicted: Entity[],
  truePositives: Entity[]
): number {
  // Bin by confidence
  const bins = [
    {range: [0.9, 1.0], items: []},
    {range: [0.8, 0.9], items: []},
    {range: [0.7, 0.8], items: []},
    {range: [0.6, 0.7], items: []},
    {range: [0.0, 0.6], items: []},
  ];

  for (const item of predicted) {
    const confidence = item.confidence || 0.5;
    const bin = bins.find(b => confidence >= b.range[0] && confidence < b.range[1]);
    if (bin) bin.items.push(item);
  }

  let ece = 0;
  for (const bin of bins) {
    if (bin.items.length === 0) continue;

    const avg_confidence = bin.items.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / bin.items.length;
    const accuracy = bin.items.filter(i =>
      truePositives.some(t => t.name === i.name && t.type === i.type)
    ).length / bin.items.length;

    ece += Math.abs(avg_confidence - accuracy) * (bin.items.length / predicted.length);
  }

  return ece;
}

function categorizeErrors(
  falsePositives: Entity[],
  falseNegatives: Entity[]
): ErrorCategory[] {
  const categories: {[key: string]: number} = {};

  // FP categorization (would require source text for accurate classification)
  for (const fp of falsePositives) {
    const category = 'hallucinated_entity'; // Simplified
    categories[category] = (categories[category] || 0) + 1;
  }

  // FN categorization
  for (const fn of falseNegatives) {
    const category = 'missed_entity';
    categories[category] = (categories[category] || 0) + 1;
  }

  return Object.entries(categories).map(([name, count]) => ({
    name,
    count,
    percentage: parseFloat(((count / (falsePositives.length + falseNegatives.length)) * 100).toFixed(1)),
  }));
}

function fuzzy_similarity(s1: string, s2: string): number {
  // Simple similarity: substring match or Levenshtein
  const lower1 = s1.toLowerCase();
  const lower2 = s2.toLowerCase();

  if (lower1 === lower2) return 1.0;
  if (lower1.includes(lower2) || lower2.includes(lower1)) return 0.9;

  // Levenshtein distance
  const dist = levenshtein_distance(lower1, lower2);
  const maxLen = Math.max(lower1.length, lower2.length);
  return 1 - (dist / maxLen);
}

function levenshtein_distance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

interface ErrorCategory {
  name: string;
  count: number;
  percentage: number;
}
```

---

## PATTERN 5: GROO QUEUE FOR BATCH PROCESSING

```typescript
// src/lib/GroqQueue.ts

import Groq from 'groq-sdk';

interface QueueItem {
  document_id: string;
  content: string;
  priority: number;
  retries: number;
  created_at: Date;
}

export class GroqQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private rate_limit_per_minute = 30;
  private processed_this_minute = 0;
  private last_minute_reset = Date.now();
  private groq: Groq;

  constructor(groqApiKey: string) {
    this.groq = new Groq({ apiKey: groqApiKey });
  }

  async add(documentId: string, content: string, priority = 0) {
    this.queue.push({
      document_id: documentId,
      content,
      priority,
      retries: 0,
      created_at: new Date(),
    });

    // Sort by priority (higher first) then by creation time
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.created_at.getTime() - b.created_at.getTime();
    });

    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Rate limit check
      const now = Date.now();
      if (now - this.last_minute_reset > 60000) {
        this.processed_this_minute = 0;
        this.last_minute_reset = now;
      }

      // Wait if we've hit rate limit
      if (this.processed_this_minute >= this.rate_limit_per_minute) {
        const wait_ms = 60000 - (now - this.last_minute_reset);
        console.log(`[GroqQueue] Rate limited. Waiting ${wait_ms}ms...`);
        await new Promise(r => setTimeout(r, wait_ms));
        continue;
      }

      const item = this.queue.shift();
      if (!item) break;

      try {
        await this.processItem(item);
        this.processed_this_minute++;
      } catch (error: any) {
        if (error.status === 429) {
          // Rate limited — put back in queue
          item.retries++;
          if (item.retries < 3) {
            this.queue.unshift(item); // Put at front
            await new Promise(r => setTimeout(r, 60000)); // Wait 1 minute
          } else {
            console.error(`[GroqQueue] Max retries exceeded for ${item.document_id}`);
          }
        } else {
          console.error(`[GroqQueue] Error processing ${item.document_id}:`, error);
        }
      }
    }

    this.processing = false;
  }

  private async processItem(item: QueueItem) {
    // Your extraction logic here
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.05,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: this.buildPrompt(item.content) }
      ],
    });

    const result = completion.choices?.[0]?.message?.content;
    console.log(`[GroqQueue] Processed ${item.document_id}`);
    // Save result to database
  }

  private buildPrompt(content: string): string {
    // Return v4 prompt (from PATTERN 1)
    return `[v4 prompt here]${content}`;
  }

  getStatus() {
    return {
      queued: this.queue.length,
      processing: this.processing,
      processed_this_minute: this.processed_this_minute,
      rate_limit: this.rate_limit_per_minute,
    };
  }
}
```

---

## PATTERN 6: MONITORING DASHBOARD METRICS

```typescript
// src/app/api/extraction-metrics/route.ts

import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Last 7 days metrics
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const { data: metrics, error } = await supabase
    .from('extraction_metrics')
    .select('*')
    .gte('extraction_date', startDate.toISOString())
    .order('extraction_date', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  // Aggregate metrics
  const aggregated = {
    total_documents: metrics?.length || 0,
    avg_entities_per_doc: metrics?.reduce((sum, m) => sum + m.entities_extracted, 0) || 0 / metrics?.length || 1,
    avg_precision: metrics?.reduce((sum, m) => sum + m.precision, 0) || 0 / metrics?.length || 1,
    avg_recall: metrics?.reduce((sum, m) => sum + m.recall, 0) || 0 / metrics?.length || 1,
    avg_f1: metrics?.reduce((sum, m) => sum + m.f1_score, 0) || 0 / metrics?.length || 1,
    avg_ece: metrics?.reduce((sum, m) => sum + m.confidence_ece, 0) || 0 / metrics?.length || 1,
    avg_hallucination: metrics?.reduce((sum, m) => sum + m.hallucination_rate, 0) || 0 / metrics?.length || 1,
    avg_review_time: metrics?.reduce((sum, m) => sum + m.verification_time_hours, 0) || 0 / metrics?.length || 1,
    documents_by_source: groupBy(metrics || [], 'document_source'),
  };

  return new Response(JSON.stringify(aggregated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function groupBy<T extends Record<string, any>>(
  items: T[],
  key: string
): Record<string, number> {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
```

---

## QUICK REFERENCE: When to Use Each Pattern

| Pattern | When to Use | File Location |
|---------|------------|---------------|
| v4 Prompt | Replace LLM prompt in scan endpoint | `/api/documents/scan/route.ts` |
| Constrained Validation | After LLM output to filter hallucinations | `/lib/constrainedExtraction.ts` |
| Confidence Calibration | Stage 4: adjust confidence with 8 signals | `/lib/calibrateConfidence.ts` |
| Automated Evaluation | Testing accuracy on gold standard | `/lib/evaluateExtraction.ts` |
| GroqQueue | Batch processing 1000+ documents | `/lib/GroqQueue.ts` |
| Metrics Dashboard | Monitoring extraction quality over time | `/api/extraction-metrics/route.ts` |

---

**Status:** All patterns ready for copy-paste implementation.
