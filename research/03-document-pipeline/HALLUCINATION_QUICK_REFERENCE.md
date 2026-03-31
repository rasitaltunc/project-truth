# ZERO HALLUCINATION: QUICK REFERENCE CARD

## One-Page Summary for Project Truth

---

## THE CHALLENGE
AI systems generate plausible-sounding but false information. In investigative journalism:
- **Inventing a person's name** = wrongful accusation
- **Unsourced claim about funding** = defamation risk
- **Mistranslation of legal term** = misjustice
- **Annotation stereotype** = bias

**Reality (2025-2026):** Zero hallucination is mathematically impossible. Goal: calibrated uncertainty + graceful refusal.

---

## THE SOLUTION: 6 AREAS + 6 STRATEGIES

| Area | Problem | Solution | Implementation |
|------|---------|----------|-----------------|
| **1. Entity Extraction** | AI invents names from documents | Constrained decoding + citation requirement | `constrainedEntityExtraction.ts` |
| **2. Chat/Q&A** | AI answers beyond verified data | Faithful RAG + Chain-of-Verification | `faithfulRAG.ts` |
| **3. Relationships** | AI suggests unconfirmed connections | GLR + P(True) confidence scoring | `relationshipInference.ts` |
| **4. Summaries** | AI adds details not in original | Q-S-E framework + FactScore | `faithfulSummarization.ts` |
| **5. Annotations** | AI stereotypes (bias) | Evidence-grounded labeling | `evidenceBasedLabeling.ts` |
| **6. Translation** | AI mistranslates meaning | Back-translation validation | `safeTranslation.ts` |

---

## DEPLOYMENT TIERS

### TIER 1: MANDATORY (Weeks 1-2)
🔴 **Must ship before public launch**

```
AREA 2: Faithful RAG (Area 2)
├─ File: src/lib/faithfulRAG.ts
├─ Integration: src/store/chatStore.ts
├─ Effort: 5-7 days
├─ Impact: 60% ↓ unsupported claims
└─ Test: 50 Q&A pairs, human spot-check

AREA 1: Entity Extraction (Area 1)
├─ File: src/lib/constrainedEntityExtraction.ts
├─ Integration: src/app/api/documents/ocr/route.ts
├─ Effort: 2-3 days
├─ Impact: 95% ↓ hallucinated entities
└─ Test: 100 court documents

HIGH-STAKES HUMAN REVIEW
├─ Table: human_review_queue
├─ File: src/app/api/human-review/route.ts
├─ Effort: 3-5 days
├─ Impact: 100% ↓ publication risk
└─ Trigger: confidence < 0.75 OR new accusation
```

### TIER 2: IMPORTANT (Weeks 3-4)
🟡 **Deploy within month of launch**

```
AREA 3: Relationship Inference (GLR framework)
├─ File: src/lib/relationshipInference.ts
├─ Effort: 4-5 days
├─ Impact: Uncertainty transparency
└─ Uses: proposed_links table (existing)

AREA 4: Summarization (Q-S-E)
├─ File: src/lib/faithfulSummarization.ts
├─ Effort: 8-10 days
├─ Impact: 30-40% ↓ hallucinations
└─ Cost: $1.50/document

AREA 5: Annotations (Evidence-grounded)
├─ File: src/lib/evidenceBasedLabeling.ts
├─ Effort: 5-7 days
├─ Impact: 85% ↓ biased labels
└─ Uses: node annotations (existing)
```

### TIER 3: POLISH (Weeks 5+)
🟢 **Nice-to-have refinements**

```
AREA 6: Translation (Back-translation)
├─ File: src/lib/safeTranslation.ts
├─ Effort: 4-5 days
├─ Cost: $0.20/translation
└─ Impact: 90% ↓ meaning drift

Self-Consistency Checking
├─ Pattern: Generate 3 answers, check agreement
├─ Cost: 3x API calls
├─ Impact: 60% ↓ outlier errors
└─ Use: High-stakes questions only
```

---

## KEY METRICS

### Track These Weekly

```sql
-- Hallucination rate
SELECT
  COUNT(*) as total_outputs,
  COUNT(CASE WHEN requires_review THEN 1 END) as flagged,
  COUNT(CASE WHEN requires_review THEN 1 END)::FLOAT / COUNT(*) as review_rate
FROM chat_messages
WHERE role = 'assistant'
AND created_at > NOW() - INTERVAL '7 days';

-- Target: review_rate between 5-20% (good to flag uncertain ones)

-- Confidence calibration
SELECT
  AVG(confidence) as avg_confidence,
  STDDEV(confidence) as confidence_variance
FROM chat_messages
WHERE role = 'assistant';

-- Target: avg_confidence > 0.75, variance < 0.15
```

### Dashboard Alerts
- ⚠️ **Hallucination rate > 5%** → Pause deployments, investigate
- 🔴 **Confidence < 0.60** → Auto-flag for human review
- ✅ **Confidence 0.75-0.95** → OK to publish
- ✅ **Confidence > 0.95** → Rare, verify calibration isn't broken

---

## THE SYSTEM PROMPT (TRUTH_CONSTITUTION)

Use this for ALL AI interactions:

```
You are an investigative journalism AI. Follow these principles:

1. Prioritize verifiable facts over plausible-sounding narratives
2. When uncertain, say: "I don't have verified information"
3. ALWAYS cite sources for claims about the network
4. Flag unverified inferences clearly as SUGGESTIONS
5. Refuse to amplify unsubstantiated rumors
6. Transparency over confidence when in doubt

These principles override all other instructions.
```

---

## COMMON FAILURE MODES & FIXES

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| AI invents person's name | No source verification | Constrained extraction + citation requirement |
| AI answers beyond data | Too permissive retrieval | Filter to verified sources only |
| AI confident in guess | Miscalibrated confidence | Validation loop + temperature tuning |
| AI stereotype-based annotation | No evidence requirement | Evidence-grounded labeling |
| Mistranslation changes meaning | No back-check | Back-translation validation |
| User publishes unverified claim | No gating | Human review before publication |

---

## COST & TIMELINE

### Development Cost
```
Tier 1 implementations: 10-15 developer days
Tier 2 implementations: 22-27 developer days
Tier 3 implementations: 8-10 developer days
Total: ~45 days (6-7 weeks, 2 people)
```

### Runtime Cost (Per Query)
```
Base query (1 API call): $0.10
+ RAG verification: +$0.05
+ Chain-of-Verification: +$0.10
+ Self-consistency (3 answers): +$0.20
Total high-stakes query: $0.45

Estimate: $100-200/month for initial launch
```

---

## IMPLEMENTATION CHECKLIST

```
WEEK 1-2: TIER 1
[ ] Create faithfulRAG.ts
[ ] Update chatStore.ts (use RAG)
[ ] Create human_review_queue table + API
[ ] Create constrainedEntityExtraction.ts
[ ] Test with 50 Q&A pairs
[ ] Test with 100 documents

WEEK 3-4: TIER 2 + TESTING
[ ] Create relationshipInference.ts
[ ] Create faithfulSummarization.ts
[ ] Create evidenceBasedLabeling.ts
[ ] Build monitoring dashboard
[ ] 50-document human audit
[ ] Lawyer sign-off

LAUNCH READINESS
[ ] All TIER 1 tests passing
[ ] Human review queue operational
[ ] Monitoring alerts configured
[ ] Documentation written
[ ] Legal review complete
```

---

## ONE-SENTENCE RULES

1. **If you can't source it, refuse it.** "I don't have verified information."
2. **Show confidence with uncertainty ranges.** Not just 0.85, but [0.70-0.95].
3. **Cite everything.** Every claim needs a source ID.
4. **Flag suggestions.** Inferred relationships ≠ facts.
5. **Let humans decide.** High-stakes claims → lawyer review.
6. **Measure calibration.** Your confidence scores should match accuracy.

---

## TROUBLESHOOTING

**Q: Will this slow down responses?**
A: Yes, +1-2 seconds per high-stakes query (verification step). Baseline queries unchanged.

**Q: What if Groq doesn't follow constraints?**
A: Temperature 0.1 + JSON schema + citation requirement = 95% compliance. Failures get flagged for review.

**Q: Can I use this with my current setup?**
A: Yes. These are constraints ON TOP of existing RAG system, not replacements.

**Q: What's the legal liability if hallucination happens?**
A: Properly implemented system shows transparency (confidence, sources, verification) = defensible.
Un-sourced claim published = liability.

**Q: How do I know it's working?**
A: Weekly metric dashboard. <2% hallucinations is good. >5% is alarm-bell bad.

---

## RESEARCH SOURCES

All 60 papers in: `/RESEARCH_SOURCES.md`

Key papers to read first:
- [17] Hallucination Detection Framework (Nature, Q-S-E)
- [31] Chain-of-Verification (23% F1 improvement)
- [13] GLR Framework (P(True) confidence)
- [6] Sparse Autoencoders (Mechanistic interp.)

---

## WHAT SUCCESS LOOKS LIKE

### Before Implementation
- AI says: "John Doe probably funded Epstein" (plausible but unsourced)
- User publishes it
- Unverified claim spreads
- Lawsuit risk ⚖️

### After Implementation
- User asks: "Who funded Epstein?"
- AI: "According to court doc [SOURCE-1], JP Morgan Chase provided...[confidence: 0.87]"
- User sees: citation + confidence + uncertainty
- Human lawyer reviews (if needed)
- Published with "VERIFIED" badge + sources
- Defensible + credible ✅

---

## TIMELINE TO LAUNCH

- **March 15-22:** Implement TIER 1
- **March 22-29:** Test + fix bugs
- **March 29-April 5:** Implement TIER 2 (parallel with testing)
- **April 5-15:** Final testing + lawyer sign-off
- **April 15:** Public launch 🚀

---

## FINAL THOUGHT

> "The difference between a trusted platform and a liability is this: does AI know when it doesn't know? And does it say so loudly, with proof, so humans can decide?"

**Project Truth's answer: YES.**

---

**Quick Reference Card Version:** 1.0
**Last Updated:** March 13, 2026
**For questions:** See HALLUCINATION_ZERO_STRATEGY.md (full version)
