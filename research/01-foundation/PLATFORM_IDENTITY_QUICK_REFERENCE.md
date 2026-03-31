# Platform Identity Models — Quick Reference Card

## THE SIX MODELS IN 60 SECONDS

```
1. PURE CONDUIT (ISP)
   Liability: MINIMAL
   Defense: "We just pass data through"
   Truth Fit: ✗ NO — Truth curates

2. PLATFORM (Section 230)
   Liability: MINIMAL
   Defense: "User-generated content, we moderate"
   Truth Fit: ⚠️ PARTIAL — Only for community voting system

3. PUBLIC INFRASTRUCTURE (Library)
   Liability: LOW
   Defense: "We curate, don't publish; innocent dissemination"
   Truth Fit: ✓ YES — Core model for documents & visualization

4. HYBRID (Wikipedia)
   Liability: LOW-MODERATE
   Defense: "Community creates, we govern process"
   Truth Fit: ✓ YES — For voting/peer review system

5. PUBLISHER (Journalism)
   Liability: HIGH
   Defense: "Truth, opinion, privilege"
   Truth Fit: ✗ NO — Creates full liability

6. TOOL PROVIDER (Software)
   Liability: MINIMAL
   Defense: "Tool is general-purpose"
   Truth Fit: ⚠️ PARTIAL — Only for visualization engine
```

---

## TRUTH'S THREE-LAYER MODEL

```
┌─────────────────────────────────────────────────┐
│ LAYER 3: AI ANALYSIS (Limited Publisher)        │
│ Chat, Daily Questions, AI Extractions           │
│ Liability: HIGH | Defense: Editorial Standards   │
│ Safeguards Required: Confidence Thresholds,     │
│ Peer Review, Insurance                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ LAYER 2: INVESTIGATION TOOLS (Research Tools)  │
│ Gap Analysis, Heat Maps, Statistics, Export     │
│ Liability: MODERATE | Defense: "Research Aid"   │
│ Safeguards Required: Source Verification        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ LAYER 1: INFRASTRUCTURE (Library Model)         │
│ Documents, Visualization, Search, Community Voting│
│ Liability: LOW | Defense: Innocent Dissemination│
│ Safeguards Required: Transparency, Error Report │
└─────────────────────────────────────────────────┘
```

---

## CRITICAL DECISION TREE

```
Does Truth claim "These connections are VERIFIED FACTS"?
├─ YES → You are a PUBLISHER → HIGH liability
└─ NO  → Proceed ↓

Will Truth use AI to GENERATE new connections?
├─ YES → Those are Truth-created content → HIGH liability
└─ NO  → Proceed ↓

Will Truth have ERROR REPORTING & REMOVAL MECHANISM?
├─ YES → Innocent dissemination defense works
└─ NO  → Defamation liability exposure HIGH

Will Truth get MEDIA LIABILITY INSURANCE?
├─ YES → Legal defensibility much higher
└─ NO  → Single lawsuit can bankrupt project

Will Truth implement CONFIDENCE THRESHOLDS for AI?
├─ YES → Can claim "exploratory, not verified"
└─ NO  → Implicit endorsement of AI accuracy

RESULT: If all YES → Public Infrastructure Model
        If any NO → Consult legal counsel immediately
```

---

## WHAT DEFAMATION LAWSUIT LOOKS LIKE

```
SCENARIO: AI extracts "John Smith connected to Illegal Organization"
          from document about witness testimony

WITHOUT SAFEGUARDS:
- John Smith sues Truth for defamation
- Truth claims: "Data came from public document"
- John replies: "Truth's AI emphasized connection to make me look guilty"
- Truth loses: "You curated and displayed connection knowing it was sensitive"
- Damages: $500K-$1M
- Insurance: None (no safeguards policy) → Truth pays everything

WITH SAFEGUARDS:
- John Smith sues Truth for defamation
- Truth shows:
  * "Connection marked 'unverified' and 'confidence: 68%'"
  * "Error report filed within 24 hours, removed within 48 hours"
  * "Corrected explanation posted publicly"
  * "Truth has error correction policy (document #X)"
- Court sees: Good faith effort to prevent/correct harm
- Damages: $50-200K (reduced)
- Insurance: Covers it
- Result: Truth survives with financial cushion
```

---

## LEGAL SAFE HARBOR CHECKLIST

**You have legal defensibility IF you can check all boxes:**

- [ ] Every connection shows source document (link + snippet)
- [ ] AI-generated content labeled "AI Analysis"
- [ ] Confidence levels displayed (70%+ for assertions)
- [ ] Error reporting button on every node/link
- [ ] Errors removed within 48 hours of confirmation
- [ ] Correction explanation posted (transparency)
- [ ] Public moderation log (shows objectivity)
- [ ] Peer review required before publishing AI connections
- [ ] TOS clearly states platform model (infrastructure, not publisher)
- [ ] Media liability insurance secured ($2-3M minimum)
- [ ] Incident response plan documented
- [ ] Community guidelines published

**Count:** _____ out of 12

**Result:**
- 12/12: Excellent defensibility
- 10-11/12: Good defensibility
- 8-9/12: Moderate defensibility
- <8/12: HIGH RISK — Legal consultation required

---

## TERMS OF SERVICE — CORE LANGUAGE

### What NOT to Say

```
❌ "Project Truth verifies all connections"
❌ "Our network shows who is connected to crime"
❌ "Relationships you see have been independently verified"
❌ "You can trust this data to make decisions"
❌ "We investigate and report findings"
```

### What TO Say

```
✓ "Project Truth visualizes public court documents"
✓ "Community proposes connections; we do not verify them"
✓ "All connections show source documents; you must verify accuracy"
✓ "Some connections are marked 'unverified' until peer review"
✓ "You are responsible for fact-checking before taking action"
✓ "AI-generated analysis is exploratory research assistance"
✓ "We remove confirmed false information within 48 hours"
```

---

## COMPARATIVE RISK MATRIX

| Platform | Model | Liability Risk | Insurance Cost | Defensibility | Jury Sympathy |
|----------|-------|---|---|---|---|
| Pure ISP | Conduit | Very Low | $5K | Excellent | High |
| YouTube | Platform | Low | $15K | Excellent | High |
| **Truth (Recommended)** | **Infrastructure + Publisher** | **Moderate** | **$25K** | **Good** | **Moderate** |
| ProPublica | Publisher | High | $100K | Excellent | Excellent |
| Bellingcat | Publisher | High | $100K | Excellent | Excellent |

**Key:** Truth's model is middle path. Higher risk than pure platforms, lower risk than full publishers.

---

## THE CORE TRADE-OFF

```
CHOICE A: No Safeguards
├─ Faster launch (weeks)
├─ Lower upfront costs
├─ Higher liability exposure (75% higher damages)
├─ First lawsuit could kill project
└─ Risk: Unacceptable for responsible founders

CHOICE B: Recommended Model (All Safeguards)
├─ Slower launch (2-3 months)
├─ Higher upfront costs ($70-100K)
├─ Lower liability exposure (75% lower damages)
├─ Legal defensibility even if sued
└─ Risk: Acceptable, manageable, insurable
```

**Recommended:** CHOICE B

---

## SPECIFIC REQUIREMENTS BY FEATURE

| Feature | Model | Safeguard | Status |
|---------|-------|-----------|--------|
| 3D Visualization | Tool | None needed | ✓ |
| Court Documents | Library | Source links | ✓ |
| Search/Filter | Tool | None needed | ✓ |
| Network Layout | Tool | None needed | ✓ |
| Community Voting | Platform (Sec. 230) | Peer review | IN PROGRESS |
| Node Annotations | Editorial | Clear sourcing | TODO |
| AI Chat | Publisher | Confidence level + error reporting | TODO |
| Gap Analysis | Tool/Advisory | Marked as "suggestion" | TODO |
| Daily Question | Publisher | AI label + source | TODO |
| AI Extraction | Publisher | Peer review quarantine | DONE (Sprint 17) |
| Error Reporting | Infrastructure | Public tracker | TODO |
| Insurance | Required | $2-3M policy | TODO |

**Green items:** Can launch today
**Yellow items:** Implement before public launch
**Red items:** CRITICAL path blocker

---

## INSURANCE QUICK-START

### What You Need

```
Policy Name: Media Liability (or "Errors & Omissions" for tech)
Coverage Limits:
  - Defamation, Invasion of Privacy, Copyright Infringement: $2-3M
  - Cyber Liability (data breach): $5M
  - Product Liability (if applicable): $1M

Annual Cost: $20-30K (typical for startup civic tech)

Insurers to Contact:
  - Reed Group
  - ISU
  - XL Catlin
  - Munich Re

Timeline: 4-6 weeks for policy issuance
Timing: Get this BEFORE public launch
```

---

## RED FLAGS — DO NOT LAUNCH WITHOUT ADDRESSING

```
🚩 TOS says "verified connections"
🚩 AI outputs displayed without confidence levels
🚩 No error reporting mechanism
🚩 Community voting shown as "peer review" (it's not)
🚩 No insurance secured
🚩 No incident response plan
🚩 Defamatory content not removable
🚩 Private individuals portrayed as criminals without judicial process
🚩 AI chat makes legal accusations (e.g., "likely money laundering")
🚩 No source links visible for connections
```

**If any of these exist: DO NOT LAUNCH. Consult legal counsel first.**

---

## INVESTOR/BOARD TALKING POINTS

### If asked: "What's the liability?"

**Say This:**
"Truth operates as civic infrastructure with three legal tiers. Our core infrastructure layer (documents, visualization) has low liability, similar to a library or archive. Our AI analysis layer has higher liability, which we manage through insurance, peer review, and rapid error correction. We've benchmarked our model against Wikipedia, OpenSecrets, and LittleSis. Single-lawsuit exposure is $50-200K with safeguards in place (vs. $500K-$1M without)."

### If asked: "Do you need insurance?"

**Say This:**
"Yes, $2-3M media liability policy. This is non-negotiable. Cost is ~$25K/year. ROI is 6-13x if we face a defamation claim. Industry standard for platforms with user-facing data. Investors expect this."

### If asked: "How do you avoid being sued?"

**Say This:**
"We can't avoid lawsuits. But we can reduce damages by 75% through transparency, error correction, and peer review. Every connection shows source. Users can report errors. We remove false information within 48 hours. This creates good faith defense in court and jury sympathy."

---

## FINAL CHECKLIST — BEFORE LAUNCH

### Legal (weeks 1-2)
- [ ] Engage legal counsel for TOS review
- [ ] Draft incident response plan
- [ ] Create user terms with three-layer model
- [ ] Legal review of chat/AI disclaimers

### Operations (weeks 1-4)
- [ ] Implement error reporting mechanism
- [ ] Create public moderation log
- [ ] Build peer review system (quarantine)
- [ ] Set confidence thresholds in code

### Safety (weeks 2-4)
- [ ] Bias testing protocol designed
- [ ] Source verification automated
- [ ] Hallucination detection implemented
- [ ] AI output labeling added to UI

### Insurance (weeks 3-6)
- [ ] Broker contacted
- [ ] Quotes received
- [ ] Policy selected and issued
- [ ] Payment processed

### Communication (weeks 1-4)
- [ ] Community guidelines written
- [ ] FAQ prepared (explaining model)
- [ ] Terms of Service finalized
- [ ] Privacy policy updated

### Testing (weeks 4-6)
- [ ] Internal testing of error reporting
- [ ] Test removal workflow
- [ ] Verify confidence levels display
- [ ] Check insurance coverage applies

**Total Timeline: 6 weeks**
**Go-Live Readiness: Yes (week 6)**
**Launch Confidence: HIGH**

---

**Document Version:** 1.0
**Last Updated:** March 14, 2026
**Review Frequency:** Before each major feature launch
**Owner:** Raşit Altunç

