# Evidence Confidence Scoring — Quick Reference Guide
## Project Truth Investigative Platform

---

## ADMIRALTY CODE MATRIX (1-PAGE CHEAT SHEET)

```
         1: CONFIRMED     2: PROB TRUE    3: POSSIBLE    4: PROB FALSE   5: FALSE        6: UNKNOWN
    A    A1 ⭐⭐⭐⭐⭐     A2 ⭐⭐⭐⭐⭐    A3 ⭐⭐⭐⭐    A4 ⭐⭐⭐      A5 ⭐⭐       A6 ⭐⭐
    :    Excellent       Excellent      Good           Caution        Red flag       New data

    B    B1 ⭐⭐⭐⭐⭐     B2 ⭐⭐⭐⭐     B3 ⭐⭐⭐      B4 ⭐⭐        B5 ⭐         B6 ⭐
         Excellent       Good           Good           Caution        Red flag       Weak

    C    C1 ⭐⭐⭐⭐      C2 ⭐⭐⭐      C3 ⭐⭐        C4 ⭐⭐        C5 ⭐         C6 ⭐
         Good            Good           Fair           Weak           Weak           Weak

    D    D1 ⭐⭐         D2 ⭐⭐        D3 ⭐          D4 ⭐          D5 ⚠️         D6 ✗
         Caution         Weak           Weak           Weak           Question       Reject

    E    E1 ⭐          E2 ⚠️         E3 ✗           E4 ✗           E5 ✗          E6 ✗
         Possible        Investigate    Reject         Reject         Reject         Reject

    F    F1 ⭐          F2 ⭐         F3 ⚠️          F4 ✗           F5 ✗          F6 ✗
         Low conf        Low conf       Question       Reject         Reject         Reject

KEY:
⭐⭐⭐⭐⭐ = 95-100% confidence (VERIFIED)
⭐⭐⭐⭐   = 85-94% confidence (LIKELY)
⭐⭐⭐    = 70-84% confidence (PROBABLE)
⭐⭐     = 50-69% confidence (POSSIBLE)
⭐      = 30-49% confidence (UNLIKELY)
✗      = Below 30% (DISPUTED)
⚠️      = Investigate further
```

---

## SOURCE RELIABILITY SCALE (A-F)

| Grade | Definition | Example |
|-------|-----------|---------|
| **A** | Completely reliable; no doubt | Court documents, official seals |
| **B** | Usually reliable; minor doubt | Published journalist, peer-reviewed study |
| **C** | Fairly reliable; some doubt | Anonymous whistleblower, second-hand account |
| **D** | Not usually reliable | Rumor, unverified blog, known unreliable source |
| **E** | Unreliable | Known liar, fraudster, fabricator |
| **F** | Cannot be judged | New anonymous source, untested |

---

## INFORMATION CREDIBILITY SCALE (1-6)

| Grade | Definition | Example |
|-------|-----------|---------|
| **1** | Confirmed | Corroborated by 3+ independent sources |
| **2** | Probably true | Multiple sources agree, minor conflicts |
| **3** | Possibly true | Some corroboration but unconfirmed gaps |
| **4** | Possibly false | Conflicting evidence; plausible but doubtful |
| **5** | Probably false | Multiple sources contradict; inconsistencies |
| **6** | Cannot be judged | Insufficient data; unknown validity |

---

## CONFIDENCE SCORE FORMULA (THE MATH)

```
CONFIDENCE_FINAL =
    0.30 × Source_Reliability +
    0.25 × Information_Credibility +
    0.20 × Evidence_Quality +
    0.15 × Network_Consensus +
    0.10 × Temporal_Freshness

RANGE: 0-100%
```

---

## COMPONENT WEIGHTS (WHY THESE PERCENTAGES?)

```
Source Reliability (30%)      ← Who is saying this? MOST important
Information Credibility (25%) ← Is it internally consistent?
Evidence Quality (20%)        ← How is it supported? (chain of custody)
Network Consensus (15%)       ← Do others corroborate it?
Temporal Freshness (10%)      ← When was it verified? (least important)
```

**Rationale:** Who you trust matters most. Even a reliable source can make mistakes, but multiple independent corroborations overcome source unreliability.

---

## TEMPORAL DECAY MODELS

### Linear Decay (Court Records)
```
Confidence(t) = Initial × (1 - 0.001 × days)
Bottoms out at: 10%
Use for: Official documents, archives, legal filings

Example:
- Court filing from year 2000: 95% → 2026: 60%
- Court filing from year 1995: 95% → 2026: ~3% (document likely lost/archived)
```

### Exponential Decay (News, Rumors)
```
Confidence(t) = Initial × e^(-0.003 × days)
Half-life: 231 days (~8 months)
Use for: News articles, allegations, hearsay

Example:
- News article 6 months old: 85% → 48%
- News article 2 years old: 85% → 8.5%
```

### Step Function (Status Changes)
```
Confidence(t) = Initial × multiplier based on new evidence

Multipliers:
- Contradicted: ×0.4
- Debunked: ×0.1
- Retracted: ×0.05
- New evidence supports: ×1.5 (resets)

Example:
- Study published 2020: 90% confidence
- Retraction announced 2025: 90% × 0.05 = 4.5%
```

---

## BAYESIAN UPDATING FORMULA

**Single Evidence:**
```
P(H|D) = P(D|H) × P(H) / P(D)

P(H|D) = Posterior (belief AFTER evidence)
P(D|H) = Likelihood (evidence probability IF hypothesis true)
P(H) = Prior (initial belief)
P(D) = Evidence probability
```

**Multiple Independent Sources:**
```
Posterior Odds = Prior Odds × LR₁ × LR₂ × LR₃ × ... × LRₙ

Where LR = P(Evidence|Hypothesis) / P(Evidence|¬Hypothesis)
```

**Quick Example:**
```
Prior: Defendant guilty = 30%
DNA Match LR = 100:1
→ Posterior: 99.7% guilty

Three independent sources with LR = 3, 5, 10:
→ Combined LR = 3 × 5 × 10 = 150
→ Posterior: ~99.97% likely
```

---

## CONFIDENCE CONFIDENCE LABELS

| Score | Label | Verbal | Example |
|-------|-------|--------|---------|
| 95-100% | ⭐⭐⭐⭐⭐ | **VERIFIED / Almost Certain** | Multiple corroborated sources with strong chain of custody |
| 80-94% | ⭐⭐⭐⭐ | **LIKELY / Very Likely** | 3+ good sources, some documentation |
| 70-79% | ⭐⭐⭐ | **PROBABLE / Likely** | 2 good sources or mixed evidence |
| 50-69% | ⭐⭐ | **POSSIBLE / Roughly Even** | Single good source or conflicting evidence |
| 30-49% | ⭐ | **UNLIKELY / Probably Not** | Weak sources, hearsay, limited corroboration |
| <30% | ✗ | **DISPUTED / Very Unlikely** | Contradiction, no reliable sources |

---

## CONFIDENCE BADGE TIERS (PROJECT TRUTH)

```
GREEN ✓ (80%+):  "Verified"
- Showed in main evidence grid
- Counted toward network analysis
- Eligible for legal proceedings

YELLOW ⚠️ (50-79%): "Probable"
- Shown but flagged as "still investigating"
- Footnote required
- Acknowledged as not proven

RED ✗ (<50%):  "Disputed"
- Gray out or collapse by default
- Full context required to expand
- "This claim has significant doubt" warning
```

---

## CHECKLIST: BEFORE ASSIGNING CONFIDENCE SCORE

### Source Reliability Assessment
- [ ] What is the source's track record? (A-F?)
- [ ] What organization/institution back them? (badge tier?)
- [ ] Are they incentivized to lie/omit? (conflict of interest?)
- [ ] Have they been wrong before? (CIA level?)

### Information Credibility Assessment
- [ ] Does the claim pass internal logic test? (1-6?)
- [ ] Are there contradictions? (6=unknown, 5=false, 4=false, 3=possible)
- [ ] Can it be independently verified?
- [ ] What % of sources agree?

### Evidence Quality Assessment
- [ ] Is chain of custody intact? (hash verification?)
- [ ] What's the original source type? (document, photo, testimony?)
- [ ] Does it pass Daubert test? (testable, published, known error rates?)
- [ ] Are there certified copies/seals?

### Network Consensus Assessment
- [ ] How many independent sources confirm? (1=50%, 2=75%, 3+=90%)
- [ ] Are sources interconnected? (apply independence penalty)
- [ ] Any bidirectional linking? (apply 0.5x weight)
- [ ] Consensus or contradiction?

### Temporal Assessment
- [ ] When was this verified? (freshness multiplier)
- [ ] What type of evidence? (linear vs exponential decay)
- [ ] Any newer contradictory info? (apply step decay)
- [ ] Cold case? (slower decay)

---

## COMMON SCENARIOS & SCORING

### Scenario 1: Court Document + Certified Copy
```
Source: Court system (A)
Credibility: Confirmed (1)
Evidence: Original + seal + hash (95%)
Network: Single source (50%)
Temporal: 5 years old, linear decay (90%)

= 0.30(95) + 0.25(95) + 0.20(95) + 0.15(50) + 0.10(90)
= 28.5 + 23.75 + 19 + 7.5 + 9
= 87.75% → "LIKELY" ⭐⭐⭐⭐
```

### Scenario 2: Journalist Investigation + Phone Records + Witness Testimony
```
Source: Journalist (B) = 75%
Credibility: Probably True (2) = 80%
Evidence: Mixed (scan + testimony) = 75%
Network: 3 independent sources = 90%
Temporal: 3 years old, linear = 88%

= 0.30(75) + 0.25(80) + 0.20(75) + 0.15(90) + 0.10(88)
= 22.5 + 20 + 15 + 13.5 + 8.8
= 79.8% → "PROBABLE" ⭐⭐⭐
```

### Scenario 3: Anonymous Whistleblower, No Corroboration
```
Source: Anonymous (F) = 10%
Credibility: Cannot be judged (6) = 10%
Evidence: Digital file, no chain of custody = 20%
Network: Single source = 50%
Temporal: Just received = 100%

= 0.30(10) + 0.25(10) + 0.20(20) + 0.15(50) + 0.10(100)
= 3 + 2.5 + 4 + 7.5 + 10
= 27% → "DISPUTED" ✗ (→ Karantina queue)
```

### Scenario 4: Wikipedia Article (Crowd-Sourced, Multiple Editors)
```
Source: Community editor (C) = 60%
Credibility: Probably True (2) = 80%
Evidence: Multiple citations = 70%
Network: 10+ sources cited = 92%
Temporal: Recently updated = 100%

= 0.30(60) + 0.25(80) + 0.20(70) + 0.15(92) + 0.10(100)
= 18 + 20 + 14 + 13.8 + 10
= 75.8% → "PROBABLE" ⭐⭐⭐
```

---

## NETWORK CONFIDENCE RULES

### Prevent Echo Chambers
```
✓ Link A→B: Trust weight = 0.95
✓ Link A→C→B (indirect): Trust weight = 0.95 × 0.85² = 0.69
→ Only use stronger direct link, ignore weaker path
```

### Detect Circular Reinforcement
```
✗ Magazine A → Magazine B → Magazine A (mutual citations)
→ Apply 0.5x penalty
→ Flag as "same source quoted twice"
```

### Independence Factor
```
0 shared sources:  independence_factor = 1.0 (100%)
1 shared source:   independence_factor = 0.7 (70%)
Multiple shared:   independence_factor = 0.4 (40%)

Consensus_Score = Avg(sources) × 1.25 (for 3+) × independence_factor
```

---

## CALIBRATION: KEEP CONFIDENCE HONEST

**Monthly Audit:**
1. Sample 20-50 claims rated 70%+ from past month
2. Have Tier 2+ reviewer verify actual accuracy
3. Calculate Expected Calibration Error (ECE):
   ```
   ECE = |Stated Confidence - Actual Accuracy|
   Target: ECE < 5%
   ```
4. If ECE > 10%, retrain confidence thresholds

**Red Flags (Recalibrate):**
- Claims stated "80% likely" but only 50% actually correct → OVERCONFIDENT
- Claims stated "50% likely" but 95% actually correct → UNDERCONFIDENT
- Specific badge tier consistently wrong → Apply multiplier adjustment

---

## API QUICK START

```python
# Python example: Calculate confidence

import requests

response = requests.post(
    "https://truth.app/api/confidence/calculate",
    json={
        "evidenceId": "evidence-uuid",
        "admiraltySourceGrade": "B",          # Usually reliable
        "admiraltyCredibilityGrade": 2,        # Probably true
        "evidenceQuality": 75,                 # Fair chain of custody
        "networkConsensus": 85,                # 3 corroborating sources
        "temporalDecayType": "linear"          # Court documents
    }
)

result = response.json()
print(f"Confidence: {result['finalConfidence']}%")
print(f"Label: {result['confidenceLabel']}")
print(f"Components:")
print(f"  Source Reliability: {result['sourceReliability']}%")
print(f"  Information Credibility: {result['informationCredibility']}%")
print(f"  Evidence Quality: {result['evidenceQuality']}%")
print(f"  Network Consensus: {result['networkConsensus']}%")
print(f"  Temporal Freshness: {result['temporalFreshness']}%")
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Score too high? | Check for circular references; reduce network consensus |
| Score too low? | Add corroborating sources; verify chain of custody |
| Recent evidence flagged old? | Check temporal_decay_type; may need reset with new discovery |
| Biased toward single source? | Network consensus should balance it; verify independence_factor |
| Hearsay inflating confidence? | Apply -20% penalty for unconfirmed secondhand; require "Unverified Claim" badge |

---

## FURTHER READING

1. **Full Implementation Guide:** `EVIDENCE_CONFIDENCE_SCORING_SYSTEM.md`
2. **SQL Functions & Database:** `CONFIDENCE_SCORING_TECHNICAL_IMPLEMENTATION.sql`
3. **Admiralty Code Standard:** NATO AJP-2.1
4. **Fact-Checking Standard:** IFCN Code of Principles
5. **Legal Standards:** Federal Rules of Evidence (FRE), Daubert Standard

---

**Last Updated:** March 21, 2026
**Version:** 1.0
**Maintainer:** Project Truth Evidence Team
