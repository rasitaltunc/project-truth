# PRACTICAL IMPLEMENTATION GUIDE
## Integrating Automatic Document Type Detection into Project Truth

**For:** Engineering Team (React/Next.js, TypeScript, Supabase)
**Date:** March 22, 2026
**Scope:** 5-week implementation roadmap

---

## PHASE 1: RULE-BASED FOUNDATION (Weeks 1-2)

### Week 1: Core Algorithm

**Objective:** Implement rules-based classifier, achieve 87%+ accuracy, zero external dependencies.

#### Task 1.1: Create Classifier Library
```typescript
// src/lib/documentClassifier/rulesClassifier.ts

import { z } from 'zod';

export type DocumentType =
  | 'indictment'
  | 'complaint'
  | 'plea_agreement'
  | 'court_order'
  | 'affidavit'
  | 'deposition'
  | 'fbi_report'
  | 'search_warrant'
  | 'police_report'
  | 'grand_jury_transcript'
  | 'wiretap_application'
  | 'court_filing'
  | 'government_filing'
  | 'credible_journalism'
  | 'sworn_testimony'
  | 'legal_correspondence'
  | 'deposition_reference';

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  signals: string[];
  reasoning: string;
}

// Header patterns (precompiled regex for performance)
const HEADER_REGEX = {
  indictment: /^(?:A |)(?:TRUE )?BILL OF INDICTMENT|^(?:THE |)(?:UNITED STATES |)GRAND JURY (?:OF|FOR) .* (?:INDICTS|PRESENTS)/i,
  complaint: /^(?:UNITED STATES OF AMERICA |)(?:OF AMERICA )?COMPLAINT|^CRIMINAL COMPLAINT/i,
  // ... (18 patterns total, see full research doc)
};

const KEYWORD_CONFIG = {
  indictment: {
    keywords: ['true bill', 'grand jury', 'indicts', 'charges', 'accused'],
    weight: 1.0,
    threshold: 2,
  },
  // ... (rest of keywords)
};

export async function classifyByRules(
  content: string,
  filename: string,
  metadata?: Record<string, any>
): Promise<ClassificationResult> {

  const lines = content.split('\n');
  const headerText = lines.slice(0, 10).join('\n');
  const signals: string[] = [];
  const scores: Record<DocumentType, number> = {};

  const types: DocumentType[] = [
    'indictment', 'complaint', 'plea_agreement', 'court_order',
    'affidavit', 'deposition', 'fbi_report', 'search_warrant',
    'police_report', 'grand_jury_transcript', 'wiretap_application',
    'court_filing', 'government_filing', 'credible_journalism',
    'sworn_testimony', 'legal_correspondence', 'deposition_reference'
  ];

  types.forEach(t => { scores[t] = 0; });

  // --- Header Pattern Matching (0.4 weight) ---
  for (const [docType, pattern] of Object.entries(HEADER_REGEX)) {
    if (pattern.test(headerText)) {
      const weight = 0.4;
      const typeName = docType as DocumentType;
      if (scores.hasOwnProperty(typeName)) {
        scores[typeName] += weight;
        signals.push(`Header match: ${docType}`);
      }
    }
  }

  // --- Keyword Frequency (0.3 weight) ---
  const contentLower = content.toLowerCase();
  for (const [docType, config] of Object.entries(KEYWORD_CONFIG)) {
    let keywordCount = 0;
    for (const kw of config.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = contentLower.match(regex);
      keywordCount += matches ? matches.length : 0;
    }

    if (keywordCount >= config.threshold) {
      const weight = 0.3 * config.weight * Math.min(keywordCount / 5, 1);
      const typeName = docType as DocumentType;
      if (scores.hasOwnProperty(typeName)) {
        scores[typeName] += weight;
        signals.push(`${keywordCount} keyword matches for ${docType}`);
      }
    }
  }

  // --- Q&A Pattern (for deposition) ---
  const qaMatch = content.match(/Q\s*:\s+.+\nA\s*:\s+.+/gi);
  if (qaMatch && qaMatch.length > 10) {
    scores['deposition'] += 0.35;
    scores['deposition_reference'] += 0.2;
    signals.push(`${qaMatch.length} Q&A exchanges detected`);
  }

  // --- Winner Takes All ---
  const [bestType, bestScore] = Object.entries(scores).reduce((a, b) =>
    b[1] > a[1] ? b : a
  ) as [DocumentType, number];

  return {
    type: bestType,
    confidence: Math.min(bestScore, 1.0),
    signals,
    reasoning: `${bestType} (score: ${bestScore.toFixed(2)}) based on: ${signals.slice(0, 3).join('; ')}`
  };
}
```

**Testing:** Create test suite
```typescript
// src/__tests__/rulesClassifier.test.ts

import { classifyByRules } from '@/lib/documentClassifier/rulesClassifier';

describe('Rules-Based Classifier', () => {
  it('should classify indictment correctly', async () => {
    const content = `A TRUE BILL OF INDICTMENT

United States of America
v.
Ghislaine Maxwell

THE GRAND JURY OF THE COUNTY OF NEW YORK
accuses the defendant of the following offenses...`;

    const result = await classifyByRules(content, 'indictment.pdf');
    expect(result.type).toBe('indictment');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  // ... (10+ test cases covering all types)
});
```

**Deadline:** Friday EOD Week 1

#### Task 1.2: Integrate into Documents API

```typescript
// src/app/api/documents/classify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { classifyByRules } from '@/lib/documentClassifier/rulesClassifier';
import { validateBody } from '@/lib/validationSchemas';
import { z } from 'zod';

const classifySchema = z.object({
  document_id: z.string().uuid(),
  content: z.string().max(50000).optional(),
  filename: z.string().max(500),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(classifySchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { document_id, content, filename } = validation.data;

    // If content not provided, fetch from documents table
    let documentContent = content;
    if (!documentContent) {
      // Fetch from GCS or Supabase
      documentContent = await fetchDocumentContent(document_id);
    }

    const classification = await classifyByRules(
      documentContent,
      filename
    );

    // Save to database
    await supabaseAdmin
      .from('documents')
      .update({
        document_type_auto: classification.type,
        classification_confidence: classification.confidence,
        classification_signals: classification.signals,
        classification_reasoning: classification.reasoning,
      })
      .eq('id', document_id);

    return NextResponse.json({
      success: true,
      classification,
    });

  } catch (error: any) {
    console.error('[Classify API]', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}
```

**Deadline:** Friday EOD Week 1

### Week 2: Database & UI

#### Task 2.1: Database Migrations

```sql
-- docs/SPRINT_20_CLASSIFICATION_MIGRATION.sql

-- Add classification columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS (
  document_type_original VARCHAR(100),
  document_type_auto VARCHAR(100),
  classification_confidence DECIMAL(3,2),
  classification_signals TEXT[],
  classification_reasoning TEXT,
  requires_manual_review BOOLEAN DEFAULT false,
  manual_override_by UUID,
  manual_override_reason TEXT,
  manual_override_at TIMESTAMP,
  last_classification_at TIMESTAMP
);

-- Create classification history table
CREATE TABLE IF NOT EXISTS document_classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  classifier_version VARCHAR(50),
  classified_as VARCHAR(100),
  confidence DECIMAL(3,2),
  signals TEXT[],
  reasoning TEXT,
  inference_time_ms INT,
  was_overridden BOOLEAN DEFAULT false,
  final_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  created_by VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_class_pending ON documents(requires_manual_review)
  WHERE requires_manual_review = true;

CREATE INDEX IF NOT EXISTS idx_doc_type_confidence ON documents(document_type_auto, classification_confidence);
```

**Deadline:** Monday EOD Week 2

#### Task 2.2: UI Component for Manual Review

```typescript
// src/components/DocumentClassificationPanel.tsx

import { useState, useEffect } from 'react';
import { DocumentType, ClassificationResult } from '@/lib/documentClassifier/rulesClassifier';

export function DocumentClassificationPanel({
  documentId,
  currentType,
  currentConfidence,
  signals,
  requiresManualReview,
}: {
  documentId: string;
  currentType: DocumentType;
  currentConfidence: number;
  signals: string[];
  requiresManualReview: boolean;
}) {

  const [overrideType, setOverrideType] = useState<DocumentType>(currentType);
  const [overrideReason, setOverrideReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOverride = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/classify-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: overrideType,
          reason: overrideReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Override failed');
      }

      // Success - reload or update state
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg mb-4">Document Classification</h3>

      {/* Current classification */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Classified as:</p>
            <p className="font-semibold text-lg">{currentType.replace(/_/g, ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Confidence:</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-300 rounded">
                <div
                  className={`h-full rounded transition-all ${
                    currentConfidence > 0.8 ? 'bg-green-500' :
                    currentConfidence > 0.6 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${currentConfidence * 100}%` }}
                />
              </div>
              <span className="font-semibold">{(currentConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Warning if requires review */}
        {requiresManualReview && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm">
            ⚠️ This classification requires manual review (confidence too low)
          </div>
        )}
      </div>

      {/* Detection signals */}
      {signals && signals.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Detection Signals:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {signals.map((signal, i) => (
              <li key={i} className="text-gray-700">{signal}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual override section */}
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3">Manual Override</h4>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Correct Document Type:
          </label>
          <select
            value={overrideType}
            onChange={(e) => setOverrideType(e.target.value as DocumentType)}
            className="w-full p-2 border rounded"
          >
            {[
              'indictment', 'complaint', 'plea_agreement', 'court_order',
              'affidavit', 'deposition', 'fbi_report', 'search_warrant',
              'police_report', 'grand_jury_transcript', 'wiretap_application',
              'court_filing', 'government_filing', 'credible_journalism',
              'sworn_testimony', 'legal_correspondence', 'deposition_reference'
            ].map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Reason for override:
          </label>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Explain why the auto-classification was incorrect..."
            rows={3}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={handleOverride}
          disabled={isLoading || overrideType === currentType}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Saving...' : 'Save Override'}
        </button>
      </div>
    </div>
  );
}
```

**Deadline:** Friday EOD Week 2

---

## PHASE 2: ML ENHANCEMENT (Weeks 3-4)

### Week 3: BERT Integration

#### Task 3.1: Setup Transformers Library

```bash
npm install --save @xenova/transformers onnxruntime-web
```

#### Task 3.2: BERT Classifier Wrapper

```typescript
// src/lib/documentClassifier/mlClassifier.ts

import { pipeline } from '@xenova/transformers';

export async function classifyWithBERT(
  content: string,
  model: string = 'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1'
): Promise<ClassificationResult> {

  const candidateLabels = [
    'indictment',
    'complaint',
    'plea agreement',
    'court order',
    'affidavit',
    'deposition',
    'FBI report',
    'search warrant',
    'police report',
    'grand jury transcript',
  ];

  // Truncate to 512 tokens
  const tokens = content.split(/\s+/).slice(0, 500);
  const inputText = tokens.join(' ');

  try {
    const classifier = await pipeline(
      'zero-shot-classification',
      model
    );

    const result = await classifier(inputText, candidateLabels, {
      multi_class: false,
    });

    const [topLabel] = result.labels;
    const [topScore] = result.scores;

    return {
      type: normalizeLabel(topLabel),
      confidence: topScore,
      signals: [`BERT: ${topLabel} (${(topScore * 100).toFixed(1)}%)`],
      reasoning: `BERT zero-shot classification with ${(topScore * 100).toFixed(1)}% confidence`,
    };

  } catch (error) {
    console.error('[BERT Classifier]', error);
    throw error;
  }
}

function normalizeLabel(label: string): DocumentType {
  const mapping: Record<string, DocumentType> = {
    'indictment': 'indictment',
    'complaint': 'complaint',
    'plea agreement': 'plea_agreement',
    'court order': 'court_order',
    'affidavit': 'affidavit',
    'deposition': 'deposition',
    'fbi report': 'fbi_report',
    'search warrant': 'search_warrant',
    'police report': 'police_report',
    'grand jury transcript': 'grand_jury_transcript',
  };

  return mapping[label.toLowerCase()] || 'court_filing';
}
```

**Deadline:** Wednesday EOD Week 3

### Week 4: Ensemble Logic

#### Task 4.1: Hybrid Classifier

```typescript
// src/lib/documentClassifier/hybridClassifier.ts

export async function classifyDocumentHybrid(
  content: string,
  filename: string,
  metadata?: Record<string, any>
): Promise<ClassificationResult & { stage: string }> {

  // Stage 1: Rules-based (fast)
  const ruleResult = await classifyByRules(content, filename, metadata);

  // If high confidence, return immediately
  if (ruleResult.confidence >= 0.80) {
    return {
      ...ruleResult,
      stage: 'rule-based (high confidence)',
    };
  }

  // Stage 2: ML-based (if available)
  let mlResult: ClassificationResult | null = null;
  try {
    mlResult = await classifyWithBERT(content);

    // If ML confidence significantly higher, use ML
    if (mlResult.confidence - ruleResult.confidence >= 0.10) {
      return {
        ...mlResult,
        stage: 'ml (confidence boost)',
      };
    }

    // Ensemble agreement
    if (mlResult.confidence >= 0.75 && mlResult.type === ruleResult.type) {
      const ensembleConfidence = (ruleResult.confidence + mlResult.confidence) / 2 + 0.05;
      return {
        type: ruleResult.type,
        confidence: Math.min(ensembleConfidence, 0.98),
        signals: [...ruleResult.signals, ...mlResult.signals],
        reasoning: `Ensemble consensus from rules + ML`,
        stage: 'ensemble (agreement)',
      };
    }

  } catch (error) {
    console.warn('[Hybrid] ML classification failed, using rules-based:', error);
  }

  // Return best result with stage info
  return {
    ...(mlResult && mlResult.confidence >= 0.70 ? mlResult : ruleResult),
    stage: 'ml (available)' || 'rule-based (fallback)',
  };
}
```

**Deadline:** Friday EOD Week 4

---

## PHASE 3: LLM FALLBACK (Week 5)

#### Task 5.1: Groq Integration

```typescript
// src/lib/documentClassifier/llmClassifier.ts

import Groq from 'groq-sdk';

export async function classifyWithLLM(
  content: string,
  filename: string,
  priorResult: ClassificationResult
): Promise<ClassificationResult> {

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const contentPreview = content
    .split('\n')
    .slice(0, 50)
    .join('\n')
    .slice(0, 3000);

  const systemPrompt = `You are an expert legal document classifier. Analyze the document and classify it into ONE of these types:

- indictment: Grand jury formal accusation
- complaint: Initial civil/criminal pleading
- plea_agreement: Guilty plea agreement
- court_order: Judge's written decision
- affidavit: Sworn statement
- deposition: Sworn testimony (Q&A format)
- fbi_report: FBI report (FD-302, etc.)
- search_warrant: Judicial search authorization
- police_report: Police incident report
- grand_jury_transcript: Grand jury transcript
- wiretap_application: Wiretap authorization application
- court_filing: General court document
- government_filing: Government document
- credible_journalism: Published news article
- sworn_testimony: Court testimony
- legal_correspondence: Attorney letter
- deposition_reference: Deposition reference/excerpt

Respond with JSON: { "type": "...", "confidence": 0.95, "reasoning": "..." }`;

  const userPrompt = `Classify this document:

FILENAME: ${filename}

CONTENT:
${contentPreview}

PRIOR CLASSIFICATION:
${priorResult.type} (confidence: ${priorResult.confidence.toFixed(2)})

Provide JSON response.`;

  try {
    const message = await groq.messages.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.1,
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return priorResult;  // Fallback
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type: parsed.type as DocumentType,
      confidence: Math.min(parsed.confidence, 0.99),
      signals: [`LLM: ${parsed.type}`, `LLM reasoning: ${parsed.reasoning}`],
      reasoning: `LLM classification: ${parsed.reasoning}`,
    };

  } catch (error) {
    console.warn('[LLM Classifier]', error);
    return priorResult;  // Fallback
  }
}
```

**Deadline:** Friday EOD Week 5

---

## PHASE 4: MONITORING & OPTIMIZATION (Week 6-7)

### Dashboard Metrics

```typescript
// src/components/ClassificationMetrics.tsx

export function ClassificationMetrics({
  timeRange = '7d'
}: {
  timeRange?: '1d' | '7d' | '30d';
}) {

  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch(`/api/documents/metrics?timeRange=${timeRange}`)
      .then(r => r.json())
      .then(setMetrics);
  }, [timeRange]);

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      <MetricCard
        label="Documents Classified"
        value={metrics.totalClassified}
        trend={metrics.classificationTrend}
      />
      <MetricCard
        label="Avg Confidence"
        value={`${(metrics.avgConfidence * 100).toFixed(1)}%`}
        trend={metrics.confidenceTrend}
      />
      <MetricCard
        label="Manual Reviews"
        value={metrics.manualReviews}
        trend={metrics.reviewTrend}
      />
      <MetricCard
        label="Avg Latency"
        value={`${metrics.avgLatencyMs}ms`}
        trend={metrics.latencyTrend}
      />
    </div>
  );
}
```

---

## TESTING CHECKLIST

```
Week 1: Rules-Based
  ✓ 90+ unit tests for rules classifier
  ✓ 150 document validation set tested
  ✓ API integration test
  ✓ Database schema verified

Week 2: Database & UI
  ✓ Migration successful
  ✓ Manual override form works
  ✓ Dashboard displays classifications
  ✓ Confidence scores calculated correctly

Week 3-4: ML Integration
  ✓ BERT model loads correctly
  ✓ Ensemble logic tested on 150 documents
  ✓ BERT + rules agreement >= 75%
  ✓ Performance acceptable (< 200ms per doc)

Week 5: LLM Fallback
  ✓ Groq API integration works
  ✓ JSON parsing reliable
  ✓ Cost tracking accurate
  ✓ Fallback to rules works

Production Acceptance
  ✓ Accuracy > 95% on test set
  ✓ Latency < 100ms average
  ✓ Cost < $0.001 per doc
  ✓ Zero data loss
  ✓ Audit trail complete
```

---

## COST PROJECTION

```
Week 1-2: $0 (local development)
Week 3-4: $50-100 (BERT inference API if not local GPU)
Week 5: ~$10-20 (Groq API testing)
Week 6-7: ~$5-10 (monitoring & optimization)

Total: ~$75-150 for development

Production Scale:
100,000 documents/month:
  - Rules-based: $0
  - LLM fallback (20%): ~$33
  - Total: ~$33/month

ROI: ~$50K (1000+ hours annual time saved)
```
