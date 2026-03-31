# Entity Extraction Implementation Checklist

**Tactical guide to move from 42% accuracy to 95% verified accuracy**

---

## PHASE 1: WEEK 1-2 — FOUNDATION (Stage 1-3)

### Week 1: Structural Extraction + NER Deployment

- [ ] **1.1 Regex Pattern Library** (2 hours)
  - [ ] Case numbers: `/\b(\d{2}-cv-\d{5})\b/g`
  - [ ] Dates: Multiple formats (DD/MM/YYYY, Month DD, YYYY, etc.)
  - [ ] Monetary amounts: `/\$[\d,]+(\.\d{2})?/g`
  - [ ] Judge patterns: `/(?:Hon\.|Judge)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g`
  - [ ] Attorney patterns from signature blocks
  - [ ] Court names (SDNY, EDNY, etc.)
  - [ ] Test on 5 sample documents

- [ ] **1.2 spaCy Legal Model Deployment** (3 hours)
  - [ ] Install `en_core_web_trf` (transformer-based, highest accuracy)
  - [ ] Create `NERPipeline.ts` class
  - [ ] Method: `extractEntities(text: string): NEREntity[]`
  - [ ] Handle chunking for long documents (transformer limit ~512 tokens)
  - [ ] Test on 5 documents, measure baseline F1 score
  - [ ] Document expected accuracy: 91% F1

- [ ] **1.3 Current Groq Prompt Documentation** (1 hour)
  - [ ] Audit current v2 prompt in `/api/documents/scan/route.ts`
  - [ ] Identify problems: no quotes, no line numbers, no thresholds
  - [ ] Document current accuracy: 42%
  - [ ] Create test harness for A/B testing prompts

### Week 1 Success Criteria
- [ ] Regex patterns tested on 5 documents
- [ ] spaCy model running locally, produces NER output
- [ ] Current extraction pipeline documented with accuracy baseline
- [ ] **Commit to git:** `feature/stage1-regex-extraction` + `feature/stage2-ner-integration`

---

### Week 2: Prompt Redesign (v3 → v4)

- [ ] **2.1 Negative Examples Addition** (2 hours)
  - [ ] Identify 3-5 common hallucinations from current v2 output
  - [ ] Create YAPILMAMASI (don't do this) examples
  - [ ] Add to v4 prompt section: "ÖRNEKLERİ YAPMA"
  - [ ] Test on 10 documents, compare v2 vs v3 accuracy

- [ ] **2.2 Constrained Extraction** (3 hours)
  - [ ] Add requirement: "source_line" + "source_quote" for every entity
  - [ ] Modify JSON output format to include source references
  - [ ] Add validation: if no quote found, reject entity or reduce confidence to 0.3
  - [ ] Test: Document reduction in hallucinations (target: 35% → 15%)
  - [ ] Measure recall loss from quote requirement (expect 5-10%)

- [ ] **2.3 LLM Classification Mode** (2 hours)
  - [ ] Rethink Groq task: NOT entity extraction, but entity CLASSIFICATION
  - [ ] Input: entities from Stage 2 (NER) + document context
  - [ ] Task: Assign role, importance, relationships — ONLY among Stage 2 entities
  - [ ] Output: role, importance, relationships with confidence
  - [ ] NO NEW ENTITIES from LLM (no hallucinations possible)
  - [ ] Test on 5 documents

- [ ] **2.4 Confidence Thresholds** (1 hour)
  - [ ] Add explicit thresholds to v4 prompt:
    - 0.95-1.0: Critical importance
    - 0.80-0.94: High importance
    - 0.60-0.79: Medium
    - 0.40-0.59: Mention only
    - <0.40: Do NOT output
  - [ ] Test on 10 documents, measure confidence distribution

### Week 2 Success Criteria
- [ ] v4 prompt with negative examples + constrained extraction implemented
- [ ] 10-document test shows accuracy ≥ 82% (vs 42% baseline)
- [ ] Hallucination rate drops to <15%
- [ ] **Commit to git:** `feature/stage3-v4-prompt-redesign`

---

## PHASE 2: WEEK 3-4 — CALIBRATION (Stage 4)

### Week 3: Gold Standard Dataset + Evaluation Framework

- [ ] **3.1 Select Gold Standard Documents** (2 hours)
  - [ ] Pick 10-15 representative legal documents
  - [ ] Criteria: Mix of types (deposition, court filing, FBI report, financial)
  - [ ] At least 200-300 entities total across all docs
  - [ ] Store in `/test-data/gold-standard/`

- [ ] **3.2 Manual Annotation** (16 hours = 2 per document)
  - [ ] Recruit 2-3 annotators (internal team)
  - [ ] Use standardized annotation guidelines (see CLAUDE.md)
  - [ ] Each annotator independently tags entities (blind review)
  - [ ] Calculate inter-annotator agreement (target: IAA > 0.85)
  - [ ] Resolve disagreements through discussion
  - [ ] Create consensus gold standard

- [ ] **3.3 Automated Evaluation Framework** (3 hours)
  - [ ] Create `evaluateExtraction()` function (see Appendix A3)
  - [ ] Metrics: Precision, Recall, F1, ECE, Hallucination Rate
  - [ ] Create test harness: `npm run test:extraction -- --model=groq-v4`
  - [ ] Output: CSV per document, summary statistics
  - [ ] Dashboard: Monthly metrics tracking

### Week 3 Success Criteria
- [ ] 10-15 gold standard documents with consensus annotations
- [ ] Inter-annotator agreement ≥ 0.85
- [ ] Automated evaluation framework running
- [ ] Baseline metrics: v2 vs v3 vs v4 prompts on gold standard
- [ ] **Commit to git:** `test-data/gold-standard/` + `src/lib/evaluateExtraction.ts`

---

### Week 4: Confidence Calibration Implementation

- [ ] **4.1 NATO Code Baseline Map** (1 hour)
  - [ ] Create mapping: document_type → nato_baseline_confidence
  - [ ] E.g., "court_opinion" → 0.92, "leaked_document" → 0.60
  - [ ] Store in `/src/lib/nato_code.ts`

- [ ] **4.2 Implement 8-Signal Calibration** (4 hours)
  - [ ] Signal 1: Document source type (NATO baseline)
  - [ ] Signal 2: Mention frequency (count occurrences)
  - [ ] Signal 3: NER confidence from Stage 2
  - [ ] Signal 4: Known entity matching (dictionary lookup)
  - [ ] Signal 5: Temporal consistency (dates valid?)
  - [ ] Signal 6: Name uniqueness (Ghislaine Maxwell vs John Smith)
  - [ ] Signal 7: Relationship corroboration (appears in multiple relationships)
  - [ ] Signal 8: Ensemble agreement (cross-model validation — optional)
  - [ ] Implement in `calibrateConfidence()` function (see Appendix A2)
  - [ ] Test on gold standard documents

- [ ] **4.3 ECE Measurement** (2 hours)
  - [ ] Implement calibration error calculation
  - [ ] Bin predictions: [0.9-1.0], [0.8-0.9], [0.7-0.8], [0.6-0.7], [0.0-0.6]
  - [ ] For each bin: measure |predicted_confidence - actual_accuracy|
  - [ ] Target ECE < 0.15
  - [ ] If ECE > 0.20, adjust signal weights

- [ ] **4.4 Threshold Tuning** (1 hour)
  - [ ] Measure precision-recall tradeoff at different thresholds
  - [ ] Plot P-R curve
  - [ ] Set default threshold: confidence ≥ 0.70 → quarantine, 0.90+ → consider auto-approve
  - [ ] Make threshold configurable per document_type

### Week 4 Success Criteria
- [ ] Calibration function implemented + tested on gold standard
- [ ] ECE < 0.15 on gold standard (confidence meaningful)
- [ ] **Commit to git:** `src/lib/calibrateConfidence.ts`
- [ ] Test results: 95%+ accuracy, <1% hallucination on gold standard

---

## PHASE 3: WEEK 5-6 — INTEGRATION (Stage 5)

### Week 5: End-to-End Pipeline Integration

- [ ] **5.1 Update `/api/documents/scan/route.ts`** (4 hours)
  - [ ] Refactor to 5-stage architecture:
    ```typescript
    // Stage 1: Regex extraction
    const structuralData = extractStructural(documentText);

    // Stage 2: NER
    const nerEntities = await nerPipeline.extract(documentText);

    // Stage 3: LLM classification (CONSTRAINED)
    const classified = await groqClassify(nerEntities, documentText);

    // Stage 4: Calibration
    const calibrated = nerEntities.map(e =>
      ({...e, confidence: calibrateConfidence(e, context)})
    );

    // Stage 5: Quarantine (insert into data_quarantine)
    await insertIntoQuarantine(calibrated, documentId);
    ```
  - [ ] Keep backward compatibility (don't break existing endpoints)
  - [ ] Add feature flag: `USE_FULL_PIPELINE=true` env var
  - [ ] Test on 10 documents end-to-end

- [ ] **5.2 Quarantine System Integration** (2 hours)
  - [ ] Ensure all extracted entities → data_quarantine table
  - [ ] Status: "pending_review" by default
  - [ ] Only verified entities can be promoted to network
  - [ ] Create validation: cannot have entity in network with confidence < 0.70
  - [ ] Test on 5 documents

- [ ] **5.3 Review Queue UI** (3 hours)
  - [ ] Ensure QuarantineReviewPanel.tsx displays calibrated confidence
  - [ ] Show confidence breakdown (signal contributions)
  - [ ] Add explanations: "Why this confidence? [NATO baseline 0.92] [mention frequency +0.05]..."
  - [ ] Reviewers see human-understandable confidence rationale
  - [ ] Test UI with 5-10 entities

### Week 5 Success Criteria
- [ ] Full pipeline running end-to-end
- [ ] 10 test documents processed through all 5 stages
- [ ] Quarantine system receives calibrated entities
- [ ] **Commit to git:** `feature/stage4-integration-full-pipeline`

---

### Week 6: Testing & Refinement

- [ ] **6.1 100-Document Test Batch** (8 hours)
  - [ ] Run 100 documents through full pipeline
  - [ ] Sample across document types: 30 court filings, 30 depositions, 20 FBI reports, 20 financial docs
  - [ ] Measure:
    - [ ] Accuracy by document type
    - [ ] Hallucination rate
    - [ ] ECE per document type
    - [ ] Confidence distribution
    - [ ] Processing time
  - [ ] Create summary report

- [ ] **6.2 Error Analysis** (4 hours)
  - [ ] For each false positive, categorize:
    - [ ] Hallucinated entity (never in text)
    - [ ] Boundary error (right entity, wrong span)
    - [ ] Type error (person→organization)
    - [ ] Confidence miscalibration
  - [ ] Top 10 error categories
  - [ ] Propose fixes for top 3 categories

- [ ] **6.3 Peer Review Feedback Integration** (2 hours)
  - [ ] Set up feedback mechanism
  - [ ] When peer rejects entity, capture reason: "hallucinated", "wrong type", "boundary error"
  - [ ] Log feedback to database
  - [ ] Week 7+ will use feedback for prompt optimization

- [ ] **6.4 Documentation Update** (2 hours)
  - [ ] Document new pipeline architecture
  - [ ] Update API docs for `/api/documents/scan`
  - [ ] Create runbook for peer reviewers (how to assess calibrated confidence)
  - [ ] Update CLAUDE.md with new extraction approach

### Week 6 Success Criteria
- [ ] 100 documents tested
- [ ] Error analysis complete (top categories identified)
- [ ] Feedback mechanism ready
- [ ] **Commit to git:** `test-results/100-document-batch-results.json`
- [ ] Ready for production pilot

---

## PHASE 4: WEEK 7+ — SCALING & OPTIMIZATION

### Week 7: Batch Processing Setup

- [ ] **7.1 Document Queue System** (4 hours)
  - [ ] Implement `GroqQueue` class (see Appendix B1)
  - [ ] Rate limit handling: 30 req/min
  - [ ] Batch processing: 30 documents per minute
  - [ ] Retry logic for 429 errors
  - [ ] Status tracking: pending, processing, complete, failed

- [ ] **7.2 Monitoring Dashboard** (3 hours)
  - [ ] Real-time processing metrics
  - [ ] Documents processed today/week/month
  - [ ] Accuracy metrics trending
  - [ ] Confidence distribution
  - [ ] Error rates by document type
  - [ ] Peer review backlog
  - [ ] Create Grafana dashboard or simple JSON endpoint

- [ ] **7.3 Batch Configuration** (2 hours)
  - [ ] Environment-based settings:
    - Production: full pipeline, 4-stage output
    - Staging: full pipeline, verbose logging
    - Development: mock/sample data
  - [ ] Configurable thresholds (per environment)
  - [ ] Configurable stage pipeline (skip stages if needed)

### Week 7 Success Criteria
- [ ] Batch processing queue working
- [ ] Can process 1000+ documents with rate limit handling
- [ ] Monitoring dashboard live
- [ ] **Commit to git:** `src/lib/GroqQueue.ts`

---

### Week 8+: Feedback-Driven Optimization

- [ ] **8.1 Monthly Feedback Analysis** (recurring)
  - [ ] Aggregate peer review rejections
  - [ ] Categorize: hallucinations, type errors, boundary errors, miscalibration
  - [ ] Identify top 5 failure patterns
  - [ ] Create issue tickets for each pattern

- [ ] **8.2 Prompt Optimization (DSPy framework)** (2 hours/month)
  - [ ] For top error pattern, generate 3-5 new prompt variants
  - [ ] Test variants on last month's feedback data
  - [ ] A/B test on new documents
  - [ ] If accuracy improves >2%, adopt new prompt
  - [ ] Document prompt evolution

- [ ] **8.3 Confidence Calibration Tuning** (1 hour/month)
  - [ ] Recalculate signal weights based on feedback
  - [ ] If hallucinations increasing, reduce known_entity_boost
  - [ ] If false negatives increasing, reduce thresholds slightly
  - [ ] Maintain ECE < 0.15

- [ ] **8.4 Entity Dictionary Growth** (ongoing)
  - [ ] Every verified entity added to KNOWN_ENTITIES map
  - [ ] Track aliases, variations
  - [ ] Feed back to confidence calibration (+0.10 boost)
  - [ ] Monthly report: +X new entities, +Y aliases

---

## CRITICAL CHECKPOINTS

### Checkpoint 1: Week 2 (End of v4 Prompt)
**Must pass:**
- [ ] 10-document test: accuracy ≥ 82%
- [ ] Hallucination rate < 15%
- [ ] No false accusations from hallucinations

**If fails:** Return to prompt redesign, add more negative examples

---

### Checkpoint 2: Week 4 (Calibration Complete)
**Must pass:**
- [ ] Gold standard: ECE < 0.15
- [ ] Gold standard: precision > 0.95
- [ ] Confidence thresholds validated
- [ ] No miscalibrated entities entering network

**If fails:** Re-weight signals, expand gold standard, measure more signals

---

### Checkpoint 3: Week 6 (100-Document Test)
**Must pass:**
- [ ] Accuracy ≥ 95% on manually reviewed documents
- [ ] Hallucination rate < 1%
- [ ] No false accusations
- [ ] Confidence calibration holds across document types
- [ ] Processing time < 5s per document

**If fails:** Do not proceed to scaling. Debug error categories.

---

### Checkpoint 4: Week 8 (Feedback Loop Working)
**Must pass:**
- [ ] Peer review feedback being captured
- [ ] Error analysis monthly reports generated
- [ ] Prompt optimization cycle working
- [ ] Monthly accuracy trending stable or improving

**If fails:** Platform cannot self-improve. Review feedback mechanism.

---

## RISK MITIGATION

### Risk 1: Hallucinated Accusations in Network
**Mitigation:**
- [ ] Mandatory quarantine for all AI extraction (no auto-approve)
- [ ] Manual review by Tier 2+ before network entry
- [ ] Monthly accuracy audits on random 50-document sample
- [ ] "Redaction + review" for any entity about victims

### Risk 2: Confidence Miscalibration
**Mitigation:**
- [ ] ECE must stay < 0.15 (check monthly)
- [ ] If ECE drifts, recalibrate signals before scaling
- [ ] Confidence scores in UI must show signal breakdown
- [ ] Reviewers trained on interpretation of scores

### Risk 3: High False Negative Rate
**Mitigation:**
- [ ] Monitor recall monthly (target: >0.85)
- [ ] If recall drops, lower thresholds slightly
- [ ] False negatives → quarantine anyway (no harm)
- [ ] Better to miss 15% than hallucinate 5%

### Risk 4: Rate Limiting Blocking Batch Processing
**Mitigation:**
- [ ] Implement GroqQueue with 30 req/min limit
- [ ] Expect 8+ hours for 1000 documents
- [ ] Plan batch runs off-peak hours
- [ ] Monitor Groq API status dashboard

---

## DELIVERABLES CHECKLIST

### End of Phase 1 (Week 2)
- [ ] v4 prompt in production
- [ ] 10-document test results
- [ ] Commit: `feature/stage3-v4-prompt-redesign`

### End of Phase 2 (Week 4)
- [ ] Gold standard dataset (10-15 docs)
- [ ] Automated evaluation framework
- [ ] Calibration function
- [ ] Test results: accuracy metrics
- [ ] Commit: `src/lib/calibrateConfidence.ts`

### End of Phase 3 (Week 6)
- [ ] Full 5-stage pipeline running
- [ ] 100-document test batch results
- [ ] Error analysis report
- [ ] Updated documentation
- [ ] Commit: `feature/stage4-integration-full-pipeline`

### End of Phase 4+ (Week 7+)
- [ ] Batch processing system
- [ ] Monitoring dashboard
- [ ] Monthly feedback analysis
- [ ] Prompt optimization cycle
- [ ] Monthly accuracy report

---

## DEFINITION OF SUCCESS

**Target Metrics:**

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Accuracy | 95% | 42% | 53pp |
| Hallucination Rate | <1% | 35% | 34pp |
| ECE (Calibration) | <0.15 | 0.7 | 0.55 |
| Precision | >0.95 | ? | ? |
| Recall | >0.85 | ? | ? |
| False Accusations | 0 | 5-10% | Critical |

**Launch Criteria:**
1. ✓ Accuracy ≥ 95% on test batch
2. ✓ Hallucination rate < 1%
3. ✓ ECE < 0.15
4. ✓ Zero false accusations in 100-document audit
5. ✓ Peer review process documented + trained
6. ✓ Monitoring system live

---

## QUESTIONS FOR RAŞIT

Before starting Phase 1:

1. **Annotation Resources:** Can we get 2-3 team members for 4 hours each to build gold standard? (Total: 12 hours)
2. **Groq Budget:** Cost is ~$16 per 10,000 documents. Is $340 GCP credit sufficient for initial scale?
3. **Peer Review Capacity:** How many reviewers can we mobilize for quarantine review? (Need ~1 reviewer per 500 docs)
4. **Timeline:** Is 6-8 weeks acceptable, or need faster?
5. **Risk Tolerance:** Can we deploy with mandatory human review (slower but safer), or need auto-approve?

---

**Status:** Ready for implementation. All prerequisites identified.
