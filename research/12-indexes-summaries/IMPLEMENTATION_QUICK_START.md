# ZERO HALLUCINATION: QUICK START FOR PROJECT TRUTH

## TL;DR: What to Do This Week

### TIER 1 (Next 2 weeks — Do these first)

1. **Entity Extraction** (Area 1)
   - File: `src/lib/constrainedEntityExtraction.ts` (NEW)
   - Add constrained decoding + citation requirement to Document AI OCR pipeline
   - Integration: `src/app/api/documents/ocr/route.ts`
   - Test: 20 court documents, measure hallucinated entities

2. **Faithful RAG** (Area 2)
   - File: `src/lib/faithfulRAG.ts` (NEW)
   - Override current chatStore.ts sendMessage() to use evidence-filtered retrieval
   - Only use `verification_level = 'official' OR 'journalist'` data
   - Add Chain-of-Verification automatic step
   - Integration: `src/components/ChatPanel.tsx`
   - Test: 50 Q&A pairs, measure unsupported claims

3. **High-Stakes Human Review** (CRITICAL)
   - Add flagging logic to chatStore.ts
   - If confidence < 0.75 OR names new individuals → flag for lawyer review
   - Create new `human_review_queue` table (2 fields: `id, pending_claim`)
   - Update `truth/page.tsx` to show pending review items
   - No AI output published until approved

---

## File Structure: Where to Add New Code

```
src/
├── lib/
│   ├── faithfulRAG.ts                    (NEW — replace current chat logic)
│   ├── constrainedEntityExtraction.ts    (NEW — entity extraction with citations)
│   ├── relationshipInference.ts          (NEW — P(True) confidence scoring)
│   ├── faithfulSummarization.ts          (NEW — Q-S-E framework)
│   ├── evidenceBasedLabeling.ts          (NEW — annotation with evidence)
│   └── safeTranslation.ts                (NEW — back-translation validation)
├── app/
│   └── api/
│       ├── hallucination-check/
│       │   └── route.ts                  (NEW — confidence calibration endpoint)
│       └── human-review/
│           └── route.ts                  (NEW — lawyer review queue API)
└── store/
    └── hallucination-store.ts            (NEW — track metrics)
```

---

## PRIORITY 1: Faithful RAG (Area 2) — START HERE

### Why First?
- Touches 40% of user interactions (chat)
- Easiest to implement (3-4 days)
- Biggest impact on credibility

### Implementation Steps

#### Step 1: Create `src/lib/faithfulRAG.ts`

```typescript
// Pseudocode — full version in HALLUCINATION_ZERO_STRATEGY.md

import { supabase } from './supabaseClient';

export interface FaithfulAnswer {
  answer: string;
  confidence: number; // 0.0-1.0
  sources: { id: string; title: string }[];
  requiresHumanReview: boolean;
}

export async function generateFaithfulAnswer(
  question: string,
  networkId: string,
  userId: string
): Promise<FaithfulAnswer> {
  // 1. Retrieve ONLY verified evidence
  const evidence = await supabase
    .from('evidence_archive')
    .select('id, title, content, evidence_type, verification_level')
    .eq('network_id', networkId)
    .in('verification_level', ['official', 'journalist']) // NO community
    .textSearch('content', question)
    .limit(5);

  // 2. If no evidence, refuse
  if (!evidence.data?.length) {
    return {
      answer: "I don't have verified information about this in our database.",
      confidence: 0,
      sources: [],
      requiresHumanReview: false
    };
  }

  // 3. Build grounded prompt
  const prompt = `Answer ONLY based on this verified evidence. If not supported, say "I don't have verified information."

Question: ${question}

Verified Evidence:
${evidence.data.map((e, i) => `[SOURCE ${i+1}] ${e.title}\n${e.content.substring(0, 300)}...`).join('\n---\n')}`;

  // 4. Call Groq (temperature 0.2 = strict adherence)
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 300
  });

  const answer = response.choices[0].message.content;

  // 5. Chain-of-Verification
  const verification = await verifyAnswerTruth(answer, evidence.data);

  // 6. Flag for human review if risky
  const requiresReview = verification.confidence < 0.75 ||
    answer.match(/\b(likely|possibly|maybe|probably)\b/i) ||
    answer.length > 250; // Complex answers need review

  return {
    answer,
    confidence: verification.confidence,
    sources: evidence.data.map(e => ({ id: e.id, title: e.title })),
    requiresHumanReview: requiresReview
  };
}

async function verifyAnswerTruth(answer: string, sources: any[]) {
  const verifyPrompt = `Is this answer supported by the sources?

Answer: "${answer}"

Sources: ${sources.map(s => s.content.substring(0, 150)).join('\n---\n')}

Respond JSON:
{ "isSupported": boolean, "confidence": 0-1, "issues": [] }`;

  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: verifyPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  return JSON.parse(result.choices[0].message.content);
}
```

#### Step 2: Update `src/store/chatStore.ts`

Replace current `sendMessage()` with:

```typescript
// In chatStore.ts, find sendMessage() action

const sendMessage = async (message: string) => {
  // ... existing code ...

  // BEFORE calling Groq, use faithfulRAG instead:
  const response = await generateFaithfulAnswer(
    message,
    truthStore.currentNetworkId,
    user.id
  );

  // If requires review, add to queue
  if (response.requiresHumanReview) {
    await supabase
      .from('human_review_queue')
      .insert({
        claim: response.answer,
        confidence: response.confidence,
        user_id: user.id,
        network_id: truthStore.currentNetworkId,
        status: 'pending'
      });

    // Show user message
    set(state => ({
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: response.answer,
          confidence: response.confidence,
          sources: response.sources,
          status: 'PENDING_REVIEW' // ← New field
        }
      ]
    }));
  } else {
    // Safe to show
    set(state => ({
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content: response.answer,
          confidence: response.confidence,
          sources: response.sources
        }
      ]
    }));
  }
};
```

#### Step 3: Create `src/app/api/human-review/route.ts`

```typescript
// GET: List pending reviews for lawyer dashboard
// POST: Approve/reject a review

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const { data, error } = await supabase
    .from('human_review_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { id, approved, notes } = await request.json();

  const { error } = await supabase
    .from('human_review_queue')
    .update({
      status: approved ? 'approved' : 'rejected',
      reviewed_at: new Date(),
      reviewer_notes: notes
    })
    .eq('id', id);

  return NextResponse.json({ success: !error, error });
}
```

#### Step 4: Add `human_review_queue` table to Supabase

```sql
CREATE TABLE human_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim TEXT NOT NULL,
  confidence FLOAT,
  user_id UUID NOT NULL,
  network_id UUID NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_human_review_pending ON human_review_queue(status) WHERE status = 'pending';
```

#### Step 5: Test

```typescript
// Test query
const result = await generateFaithfulAnswer(
  "Who funded Epstein?",
  "epstein-network-id",
  "test-user-id"
);

// Expected output:
// {
//   "answer": "According to court documents, JP Morgan Chase provided...",
//   "confidence": 0.82,
//   "sources": [{ id: "ev-123", title: "Court Deposition" }],
//   "requiresHumanReview": false
// }
```

---

## PRIORITY 2: Constrained Entity Extraction (Area 1) — NEXT

### When to do: Week 2 (after RAG is live)

### Implementation: `src/lib/constrainedEntityExtraction.ts`

```typescript
export async function extractEntitiesConstrained(
  documentText: string,
  networkId: string
) {
  // Constrain to entities in document only
  const entities = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Extract entities from this document. ONLY include entities that appear in the text.

Document:
${documentText}

Format JSON:
{
  "entities": [
    {
      "name": "EXACT_NAME_FROM_TEXT",
      "type": "PERSON|ORG|PLACE",
      "citationSpan": "verbatim text",
      "confidence": 0.95
    }
  ]
}`
    }],
    response_format: { type: 'json_object' },
    temperature: 0.05 // VERY low
  });

  const result = JSON.parse(entities.choices[0].message.content);

  // Verify entities exist in document
  return result.entities.filter(e =>
    documentText.includes(e.citationSpan)
  );
}
```

### Integration: `src/app/api/documents/ocr/route.ts`

Replace existing extraction with constrained version:

```typescript
// In ocr/route.ts, after Document AI extracts text:

const constrainedEntities = await extractEntitiesConstrained(
  ocrText,
  networkId
);

// Save with hallucination flag
await supabase
  .from('document_entities')
  .insert(
    constrainedEntities.map(e => ({
      document_id: documentId,
      entity_name: e.name,
      entity_type: e.type,
      citation_span: e.citationSpan,
      confidence: e.confidence,
      hallucination_checked: true
    }))
  );
```

---

## PRIORITY 3: High-Stakes Human Review (Critical Path)

### This is MANDATORY before any public launch

Create simple lawyer dashboard:

1. **Create page:** `src/app/[locale]/truth/review/page.tsx`
2. **Show pending claims:** Query `human_review_queue WHERE status='pending'`
3. **Buttons:** Approve / Reject with notes
4. **Auto-publish:** Approved claims get published with "VERIFIED" badge

---

## MONITORING: Track Metrics

### Create `src/store/hallucination-store.ts`

```typescript
import { create } from 'zustand';

export const useHallucinationMetrics = create((set) => ({
  metrics: {
    totalResponses: 0,
    hallucinatedEntities: 0,
    unsupportedClaims: 0,
    humanReviewsNeeded: 0,
    hallucination_rate: 0
  },

  recordResponse: (supported: boolean) => {
    set(state => ({
      metrics: {
        ...state.metrics,
        totalResponses: state.metrics.totalResponses + 1,
        unsupportedClaims: state.metrics.unsupportedClaims + (supported ? 0 : 1),
        hallucination_rate: (state.metrics.unsupportedClaims + 1) / (state.metrics.totalResponses + 1)
      }
    }));
  }
}));
```

### Weekly Report

```sql
-- Query to run weekly
SELECT
  COUNT(*) as total_ai_outputs,
  COUNT(CASE WHEN requires_human_review THEN 1 END) as flagged,
  COUNT(CASE WHEN requires_human_review THEN 1 END)::FLOAT / COUNT(*) as review_rate,
  AVG(confidence) as avg_confidence
FROM chat_messages
WHERE created_at > NOW() - INTERVAL '7 days'
AND role = 'assistant';
```

---

## DEPLOYMENT CHECKLIST

- [ ] Week 1: Faithful RAG live (Entity Extraction Area 2)
- [ ] Week 1: Human review queue in place
- [ ] Week 2: Constrained entity extraction live (Area 1)
- [ ] Week 2: Monitoring dashboard showing metrics
- [ ] Week 3: Internal testing — 50 Q&A pairs, lawyer signs off
- [ ] Week 4: Public launch ready

---

## TESTING PROTOCOL

### Test Data
```
Q: "Who funded Epstein?"
Expected: "I don't have verified information" (if no official sources)
OR
Expected: "[SOURCE 1] Court document states..." + confidence > 0.75

Q: "How much did Morgan Stanley invest?"
Expected: If only rumor exists → "I don't have verified information"
If court doc exists → Full answer + sources

Q: "Is John Doe a victim?"
Expected: Annotation only if direct evidence
Not: Stereotype-based assumption
```

### Failure Cases
```
❌ FAIL: AI invents a person's name not in document
❌ FAIL: AI answers question beyond available evidence
❌ FAIL: AI skips citing sources
✅ PASS: AI says "I don't have verified information"
✅ PASS: Every claim has 1+ source
✅ PASS: Confidence scores accurate (calibration >0.85)
```

---

## QUESTIONS? ISSUES?

- **Can I still use Groq?** YES — it's the engine, these are constraints ON TOP
- **Will this slow down responses?** Yes, +1-2s per query (for verification step)
- **Can I make this faster?** Cache verified answers, batch verification
- **What if model breaks constraint?** Verify against source, flag for review
- **How much will this cost?** +$0.20 per high-stakes query (2 API calls instead of 1)

---

**Status:** Ready to implement
**Next step:** Start with Faithful RAG this week
**Timeline:** Full deployment by April 15, 2026
