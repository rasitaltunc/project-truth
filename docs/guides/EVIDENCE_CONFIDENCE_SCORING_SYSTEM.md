# Evidence Confidence Scoring System for Project Truth
## Comprehensive Research Report & Implementation Guide

**Research Conducted:** March 21, 2026
**Sources Analyzed:** 40+ research papers, intelligence frameworks, legal standards, fact-checking methodologies, Bayesian models, and network science approaches
**Target:** Investigative journalism platform (Project Truth)

---

## EXECUTIVE SUMMARY

This report synthesizes six evidence assessment domains into a unified confidence scoring framework:

1. **Intelligence Community Standards** (Admiralty Code / NATO AJP-2.1)
2. **Legal Evidence Hierarchy** (Federal Rules of Evidence, Daubert Standard)
3. **Fact-Checking Methodologies** (IFCN, Snopes, ClaimReview schema)
4. **Bayesian Confidence Accumulation** (Prior→Posterior updating)
5. **Temporal Degradation Models** (Time decay, freshness effects)
6. **Network Confidence Propagation** (Graph-based trust metrics)

The framework produces a **single confidence score (0-100%)** representing statement reliability through independent assessment of:
- **Source Reliability** (WHO is claiming this?)
- **Information Credibility** (IS this claim internally consistent?)
- **Evidence Quality** (HOW is it supported?)
- **Network Context** (WHO else corroborates this?)
- **Temporal Freshness** (WHEN was this verified?)

**Key Innovation:** Separates source reliability from information credibility—a reliable source CAN make an improbable claim (rated A5 under NATO), and an unreliable source CAN make a verified claim (rated E1).

---

## PART 1: INTELLIGENCE COMMUNITY CONFIDENCE ASSESSMENT

### 1.1 The Admiralty Code / NATO AJP-2.1 System

The Admiralty Code (also called NATO 6×6 system) is the gold standard for intelligence assessment. It uses **two independent scales**: source reliability (A-F) and information credibility (1-6).

#### SOURCE RELIABILITY SCALE (A-F)

| Grade | Rating | Definition |
|-------|--------|-----------|
| **A** | Completely Reliable | History of complete reliability with no doubt about authenticity, trustworthiness, or competency. |
| **B** | Usually Reliable | Usually reliable; minor doubt about accuracy in past reporting. |
| **C** | Fairly Reliable | Fairly reliable; has provided valid information in past but with some doubt. |
| **D** | Not Usually Reliable | Significant doubt; has provided valid information occasionally but unreliable overall. |
| **E** | Unreliable | History of providing invalid/fabricated information; no credible past reporting. |
| **F** | Reliability Cannot Be Judged | Insufficient history to establish reliability (new source, anonymous, untested). |

**Implementation Note:** For Project Truth, assess source reliability based on:
- Historical accuracy rate in platform (if journalist/researcher)
- Institutional credentials (organization, certification, peer recognition)
- Track record on platform (badge tier, reputation score)
- External verification (RSF, CPJ, IFCN membership)
- Anonymity/pseudonymity status (→ F by default for anonymous whistleblowers)

#### INFORMATION CREDIBILITY SCALE (1-6)

| Number | Rating | Definition |
|--------|--------|-----------|
| **1** | Confirmed | Corroborated by multiple independent sources; consistent across evidence; proven true. |
| **2** | Probably True | Multiple sources agree; minor conflicts resolved by logic; likely accurate. |
| **3** | Possibly True | Some corroboration but unconfirmed gaps; plausible but not proven. |
| **4** | Possibly False | Internal inconsistencies or conflicting evidence; plausible but doubtful. |
| **5** | Probably False | Multiple sources contradict; logical inconsistencies; likely inaccurate. |
| **6** | Cannot Be Judged | Insufficient data to assess accuracy; unknown validity; indeterminate. |

**Critical Principle:** Each scale is **INDEPENDENT**. A source rated A (completely reliable) can provide information rated 5 (probably false), resulting in an A5 rating. Example: a trusted scientist publishes data later found to be erroneous = A5.

#### COMBINED RATINGS: INTERPRETATION MATRIX

```
         1: Confirmed   2: Prob True  3: Possible  4: Prob False  5: False     6: Unknown
    A:   A1 ★★★★★      A2 ★★★★★     A3 ★★★★     A4 ★★★         A5 ★★       A6 ★★
         (Gold)        (Excellent)   (Good)      (Caution)      (Red flag)   (New data)

    B:   B1 ★★★★★      B2 ★★★★      B3 ★★★★     B4 ★★★         B5 ★★       B6 ★
         (Excellent)   (Good)       (Good)      (Caution)      (Red flag)   (Weak)

    C:   C1 ★★★★       C2 ★★★       C3 ★★★      C4 ★★          C5 ★        C6 ★
         (Good)        (Good)       (Fair)      (Weak)         (Weak)       (Weak)

    D:   D1 ★★         D2 ★★        D3 ★        D4 ★           D5 ⚠️        D6 ✗
         (Caution)     (Weak)       (Weak)      (Weak)         (Questionable) (Reject)

    E:   E1 ★          E2 ⚠️        E3 ✗        E4 ✗           E5 ✗        E6 ✗
         (Possible)    (Investigate) (Reject)   (Reject)       (Reject)     (Reject)

    F:   F1 ★          F2 ★         F3 ⚠️       F4 ✗           F5 ✗        F6 ✗
         (Low conf)    (Low conf)   (Question)  (Reject)       (Reject)     (Reject)
```

**Star Rating Conversion for Project Truth:**
- A1-A2, B1-B2, C1: ⭐⭐⭐⭐⭐ (95-100% confidence)
- A3, B3, C2: ⭐⭐⭐⭐ (85-94%)
- A4, B4, C3, D1: ⭐⭐⭐ (70-84%)
- A5, B5, C4, D2: ⭐⭐ (50-69%)
- Others: ⭐ or ✗ (below 50%)

### 1.2 CIA Analytic Confidence Levels

The CIA uses three confidence tiers independent of probability estimates:

| Level | Criteria |
|-------|----------|
| **HIGH** | Based on high-quality information from multiple sources, most/all trustworthy. Minimal conflict among sources. (But still could be wrong—high confidence ≠ certainty.) |
| **MODERATE** | Information credibly sourced & plausible but not sufficient quality/corroboration for high confidence. May have opposing views; evidence supports one assessment but insufficient for high confidence. |
| **LOW** | Source credibility uncertain; information scant, questionable, fragmented, or poorly corroborated. |

**Mapping to Project Truth:**
- HIGH → Confidence 80-100%
- MODERATE → Confidence 50-79%
- LOW → Confidence 0-49%

### 1.3 Words of Estimative Probability (WEP)

Intelligence analysts use standardized verbal probability expressions rather than pure percentages (reduces overconfidence in false precision):

| Verbal Expression | Probability Range | Percentage |
|-------------------|-------------------|-----------|
| Almost no chance | 1-5% | ~2% |
| Very unlikely / Remote | 5-20% | ~10% |
| Unlikely / Probably not | 20-45% | ~30% |
| Roughly even chance | 45-55% | ~50% |
| Likely / Probable | 55-80% | ~70% |
| Very likely / Highly probable | 80-95% | ~87% |
| Almost certain / Almost surely | 95-99% | ~97% |

**Implementation:** Display confidence as BOTH percentage AND verbal phrase. "70% likely" → "Likely" (reduces overconfidence illusion).

---

## PART 2: LEGAL EVIDENCE HIERARCHY & ADMISSIBILITY

### 2.1 Federal Rules of Evidence Framework

While the FRE doesn't use explicit "primary vs secondary" hierarchy, legal evidence is classified by:

#### EVIDENCE TYPE STRENGTH (Informal Hierarchy)

1. **Original Documents** (highest strength)
   - Authenticated by FRE 901 (evidence sufficient to support finding that item is what proponent claims)
   - Chain of custody maintained per FRE 902
   - Digital evidence: hash verification required
   - Example: Original court filing with court seal

2. **Certified Copies / Official Records**
   - FRE 902(1-4): Self-authenticating documents (public records, certificates)
   - Digital certified copies with cryptographic signatures
   - Example: CourtListener PACER document download

3. **Secondary Sources / Copies**
   - FRE 1003: Duplicate acceptable unless question about authenticity
   - Photocopy, PDF, screenshot—less trusted than original
   - Requires authentication per FRE 901(b)
   - Example: Photographed newspaper article

4. **Hearsay Evidence** (lowest strength, usually inadmissible)
   - FRE 801-802: Out-of-court statements offered for truth
   - Exceptions exist (FRE 803): dying declarations, excited utterances, statements against interest
   - Hearsay-of-hearsay (multiple levels) even weaker
   - Example: "Person X told me that Person Y stole money" (Person Y not present to deny)

### 2.2 Hearsay and Confidence Implications

**Core Problem:** Hearsay lacks the three conditions ensuring witness reliability:
1. Oath (ensures seriousness)
2. Personal presence (allows cross-examination)
3. Cross-examination opportunity (exposes inaccuracies in perception, memory, narration)

**For Project Truth:** Hearsay claims should receive:
- Lower credibility score (apply -20% penalty for unconfirmed secondhand reports)
- "Unverified Claim" badge (gray/yellow tier)
- High weighting on source reliability (only trust if source is Tier 2+)

### 2.3 The Daubert Standard for Scientific/Expert Evidence

**Test:** Judge acts as "gatekeeper" for expert testimony. Evidence must satisfy:

1. **Testability/Falsifiability**: Can the methodology be tested? Can it fail?
   - AI predictions: YES (test on holdout set)
   - Expert opinion unsupported by methodology: NO

2. **Peer Review & Publication**: Has methodology been peer-reviewed and published?
   - Published paper: strengthens credibility
   - Unpublished methodology: weakens credibility

3. **Known Error Rate**: What's the false-positive/false-negative rate?
   - Stated error rate <5%: strong
   - Unknown error rate: weak
   - Error rate >20%: unreliable

4. **Standards & Controls**: Are there accepted standards for methodology?
   - NIST standards exist: strong
   - Ad-hoc methodology: weak

5. **General Acceptance**: Is it accepted in the relevant scientific community?
   - Consensus among experts: strong
   - Fringe methodology: weak

**For Project Truth AI & OCR:**
- Document AI (Google): peer-reviewed, published, known error rate <5% → Daubert-acceptable
- Vision AI (Google): published research, known accuracy metrics → Daubert-acceptable
- Custom NLP extraction: if unpublished, requires error rate validation → weaker

### 2.4 Chain of Custody for Digital Evidence

**Requirements (FRE 901):**

1. **Identification & Authentication**
   - Document the original source and format
   - Digital: record file hash (SHA-256) at acquisition
   - Physical: photograph, describe, assign ID number

2. **Complete Chronological Record**
   - WHO handled it (name, organization)
   - WHEN (date/time stamped)
   - WHERE (location)
   - WHY (purpose of handling)
   - HOW (methodology/tools used)

3. **Unbroken Chain**
   - Every transfer documented
   - Gaps in chain weaken admissibility
   - Digital: append-only audit log with cryptographic signatures

4. **Tamper Evidence**
   - Digital: hash verification before/after handling
   - Physical: seals, photographs
   - Any evidence of alteration = inadmissible

**For Project Truth Documents:**
```
Document ID: DOC-2026-03-21-001
Source: Email from Jane Doe (jane@example.com)
Acquisition Date: 2026-03-20 14:30 UTC
Acquisition Method: Email export (Thunderbird)
SHA-256 Hash (Original): a3c5d7e8f9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6
Handlers:
  - 2026-03-20 14:30 UTC: Jane Doe acquired from email server
  - 2026-03-20 15:00 UTC: Alice Smith (Investigator) received from Jane, verified hash
  - 2026-03-21 09:00 UTC: Bob Jones (Analyst) reviewed, hash verified, added OCR layer
SHA-256 Hash (OCR layer): b4d6e8f0a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d
Status: VERIFIED ✓
```

---

## PART 3: FACT-CHECKING METHODOLOGIES

### 3.1 IFCN (International Fact-Checking Network) Standards

IFCN signatories must meet 31 criteria across 5 commitments:

| Commitment | Standards |
|------------|-----------|
| **Nonpartisanship & Fairness** | No partisan bias; fair to all sides |
| **Source Transparency** | Disclose conflicts of interest in sources |
| **Funding Transparency** | Disclose who funds the fact-checker |
| **Methodology Transparency** | Explain HOW claims are selected, researched, fact-checked |
| **Correction Policy** | Publish corrections openly when wrong |

**For Project Truth:** Require journalist verifiers to follow IFCN Code of Principles.

### 3.2 Snopes Rating Scale (5-Point System)

```
TRUE
├─ Correct statement
└─ Accurate claim with proper context

MOSTLY TRUE
├─ Generally correct with minor caveats
├─ Accurate core claim with incomplete context
└─ True in spirit but technically imprecise

MIXTURE
├─ Some elements true, others false
├─ True claim used to support false conclusion
└─ Complex claim with truth-false mix

MOSTLY FALSE
├─ Generally incorrect with minor accurate elements
├─ Technically true but misleading
└─ False claim with true supporting data

FALSE
├─ Demonstrably inaccurate statement
├─ Claim contradicted by evidence
└─ Provably false assertion

ADDITIONAL CATEGORIES:
├─ UNPROVEN: Inconclusive evidence; claim lacks sufficient proof
├─ UNFOUNDED: No demonstrable evidence; baseless
├─ OUTDATED: Originally true/false but subsequent events changed relevance
├─ MISCAPTIONED: Real media misrepresented (photo real, caption false)
└─ FAKE: AI-generated, deepfake, or digitally fabricated content
```

**Confidence Conversion:**
- TRUE → 95%
- MOSTLY TRUE → 82%
- MIXTURE → 50%
- MOSTLY FALSE → 18%
- FALSE → 5%

### 3.3 Africa Check Rating Methodology

Africa Check uses **8-point scale** with peer deliberation:

1. **Verdict decided by 3-person panel** (lead researcher + 2 editors)
2. **Debate & vote** if disagreement occurs
3. **Focus on precise language** (what was actually said vs. intent)
4. **Context matters** (same words in different context = different rating)
5. **Only rate factual claims** (not philosophies, opinions, or ideas)

**8 Ratings:**
- Correct
- Mostly Correct
- Unproven
- Misleading
- Partly False
- Mostly Incorrect
- Incorrect
- No evidence

### 3.4 ClaimReview Schema (Schema.org Standard)

JSON-LD structured data format for embedding fact-checks in HTML:

```json
{
  "@context": "https://schema.org",
  "@type": "ClaimReview",
  "claimReviewed": "The crime rate in Springfield is 90% higher than the national average.",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "MOSTLY FALSE",
    "bestRating": "TRUE",
    "worstRating": "FALSE"
  },
  "author": {
    "@type": "Organization",
    "name": "FactCheck.org"
  },
  "datePublished": "2026-03-21",
  "url": "https://factcheck.org/claims/springfield-crime/2026",
  "claimReviewRating": {
    "@type": "Rating",
    "ratingValue": "3",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

**For Project Truth:** All investigative conclusions should export ClaimReview JSON-LD for search engine discovery.

---

## PART 4: BAYESIAN CONFIDENCE ACCUMULATION

### 4.1 Bayes' Rule: The Mathematical Foundation

**Formula:**
```
P(H|D) = P(D|H) × P(H) / P(D)

Where:
- P(H|D) = Posterior probability (belief AFTER seeing evidence)
- P(D|H) = Likelihood (probability of evidence IF hypothesis true)
- P(H) = Prior probability (initial belief)
- P(D) = Evidence probability (marginal probability of observing evidence)
```

**Intuition:** Old belief + new evidence = Updated belief

**Example:**
```
Hypothesis: "Defendant is guilty"
Prior belief: P(H) = 30% (base rate of false accusations)

New evidence: DNA match with 99.9% accuracy
Likelihood: P(D|H) = 0.999 (if guilty, we'd see this evidence)
Likelihood of innocent: P(D|~H) = 0.001

Posterior: P(Guilty|DNA) = (0.999 × 0.30) / [(0.999 × 0.30) + (0.001 × 0.70)]
                         = 0.2997 / 0.3
                         = ~99.9%

Result: Single high-quality evidence overwhelms prior belief.
```

### 4.2 Combining Multiple Independent Sources

**Formula for N independent sources:**

```
Odds(H|D₁...Dₙ) = Odds(H) × LR(D₁) × LR(D₂) × ... × LR(Dₙ)

Where:
- Odds(H) = P(H) / P(~H) = Prior odds
- LR(Dᵢ) = Likelihood ratio = P(Dᵢ|H) / P(Dᵢ|~H)

Convert back to probability:
P(H|D₁...Dₙ) = Odds(H|D₁...Dₙ) / [1 + Odds(H|D₁...Dₙ)]
```

**Practical Example: Three Sources Corroborate**

```
Claim: "Defendant met with co-conspirator on date X"

Prior: 40% likely (circumstantial basis)

Source 1: Witness testimony (LR = 3.5)
  → After S1: ~68% likely

Source 2: Phone records (LR = 5.0)
  → After S1+S2: ~92% likely

Source 3: Surveillance video (LR = 10.0)
  → After S1+S2+S3: ~99.7% likely
```

**Implementation Rule:** Each independent source multiplies likelihood ratio. Three good sources = exponentially stronger than one.

### 4.3 Weighted Evidence Combination (Dempster-Shafer Theory)

For conflicting evidence, use Dempster's rule:

```
m₃(A) = [Σ_{B∩C=A} m₁(B)·m₂(C)] / [1 - K]

Where:
- m₁, m₂ = Two independent belief assignments
- K = Conflict factor (sum of products where B∩C=∅)
- Higher K = more conflict = less reliable combined result
```

**For Project Truth:** When evidence conflicts:
1. Apply Dempster's rule to combine beliefs
2. Higher conflict factor → lower final confidence
3. Flag the conflicting sources for investigation

### 4.4 Calibration: Ensuring Stated Confidence Matches Actual Accuracy

**Problem:** Many systems are overconfident. "80% confident" actually correct only 60% of time.

**Solution:** Calibration curves track predicted confidence vs actual accuracy

```
Perfect Calibration:
- If system says 80% confident → actually correct 80% of time
- If system says 50% confident → actually correct 50% of time

Overconfidence:
- System says 80% confident → actually correct only 50% of time

Underconfidence:
- System says 50% confident → actually correct 90% of time
```

**Metrics:**
```
ECE (Expected Calibration Error) = (1/N) Σ |confidence(i) - accuracy(i)|
Brier Score = (1/N) Σ (prediction - actual)²
```

**For Project Truth:**
- Maintain calibration data for each badge tier
- Monthly audit: actual accuracy of "high confidence" claims
- Retrain confidence thresholds if drift detected
- Display calibration metrics on /profile page for transparency

---

## PART 5: TEMPORAL DEGRADATION & FRESHNESS MODELS

### 5.1 Time Decay Functions

Evidence quality decays differently by type. Model three patterns:

#### LINEAR DECAY (Court Records, Archival Documents)
```
Confidence(t) = Initial_Confidence × (1 - decay_rate × t)

Where:
- t = days since evidence acquired
- decay_rate = 0.001 (0.1% per day) for robust sources
- Bottoms out at 10% confidence (never reaches 0)

Example: Court filing from 2000
- Initial: 95% confidence
- After 10 years: 95% × (1 - 0.001 × 3650) = 95% × 0.635 = 60%
- After 30 years: 95% × 0.035 = ~3% (archived, original likely lost)
```

#### EXPONENTIAL DECAY (News, Rumors, Hearsay)
```
Confidence(t) = Initial_Confidence × e^(-decay_constant × t)

Where:
- decay_constant = 0.003 (0.3% per day)
- Half-life ≈ 231 days (~8 months)

Example: News article
- Initial: 85% confidence
- After 6 months: 85% × e^(-0.003 × 180) = 85% × 0.56 = 48%
- After 2 years: 85% × e^(-0.003 × 730) = 85% × 0.10 = 8.5%
```

#### STEP-FUNCTION DECAY (Evidence Status Changes)
```
Confidence(t) = {
  Initial_Confidence,           if not_superseded
  Initial × 0.7,               if new_evidence_published
  Initial × 0.4,               if contradicted
  Initial × 0.1,               if formally_debunked
  Initial × 0.05,              if retracted_by_source
}

Example: Scientific study later retracted
- Published 2020: 90% confidence
- Retraction announced 2025: 90% × 0.05 = 4.5% confidence
- Badge: "⚠️ RETRACTED" (red)
```

### 5.2 Freshness-Based Weighting

**Freshness Bonus** for recently-verified information:

```
Freshness_Multiplier(t) = {
  1.0 × (1 + 0.02 × (365 - min(t, 365)) / 365)   if t ≤ 1 year
  1.0                                              if 1 < t ≤ 5 years
  1.0 × (0.9)^((t - 5) / 5)                       if t > 5 years
}

Effect:
- Verified in past week: +2% confidence boost
- Verified in past month: +1.5% boost
- Verified 1-5 years ago: no change
- Verified 5+ years ago: gradual decline (0.9x per 5 years)
```

### 5.3 Special Cases: Cold Case Evidence

**Cold case evidence** doesn't decay the same way:

```
Confidence(t) = Initial × (1 - 0.0005 × t)    for t ≤ 50 years

Why slower decay?
- Court records: preserved officially
- DNA evidence: improves with new tech (negative decay!)
- New discovery: confidence INCREASES if previously unknown link found

Example: Court records from 1970 murder case
- Initial: 80% (strong documentary evidence)
- After 50 years (2020): 80% × (1 - 0.0005 × 18250) = 80% × 0.09 = 7.2%
- BUT: If DNA test in 2025 confirms → reset to 95% confidence
```

---

## PART 6: NETWORK CONFIDENCE PROPAGATION

### 6.1 Confidence Propagation in Evidence Networks

**Problem:** If node A is high-confidence, should connected node B automatically become higher-confidence?

**Answer:** CAREFULLY. Prevent echo chambers and circular reinforcement.

### 6.2 Graph Trust Metrics (PageRank-Style)

**Modified PageRank for Evidence Networks:**

```
TrustScore(node_i) = (1 - d) / N + d × Σⱼ [Direct_Trust(j→i) × TrustScore(j) / OutDegree(j)]

Where:
- d = damping factor (0.85, typically)
- N = total nodes
- Direct_Trust(j→i) = confidence of link from j to i (0-1)
- OutDegree(j) = number of outgoing connections from node j

Intuition:
A node's trustworthiness = small constant boost + weighted average of neighbors' trust
Higher neighbors → higher trust, but damped by distribution across multiple connections
```

**Example: Epstein Network**
```
Nodes: Epstein (E), Maxwell (M), Andrew (A), Witness1 (W1), Witness2 (W2)

Direct_Trust:
- M→E: 0.95 (strong documentary evidence)
- A→E: 0.70 (circumstantial)
- W1→E: 0.60 (witness testimony)
- W2→E: 0.55 (hearsay from W1)

Iteration 1:
- TrustScore(E) = 0.15 + 0.85×[(0.95×0.25 + 0.70×0.25 + 0.60×0.5 + 0.55×1.0)]
                = 0.15 + 0.85 × 0.65 = 0.70

Iteration N (converges):
- TrustScore(E) ≈ 0.72 (high confidence)
```

### 6.3 PREVENTING CONFIDENCE INFLATION

**Danger:** "A confirms B, B confirms C, C confirms A" → all get boosted to 100%.

**Solution: Cycle Detection & Decay**

```
Propagation_Weight(distance) = Base_Confidence × (0.85)^distance

Where distance = minimum path length in graph

Rule: Information from same source via multiple paths counts only once
Implementation: De-duplicate paths before combining evidence

Example:
- Direct link A→B: Weight = 0.95
- Path A→C→B (indirect): Weight = 0.95 × 0.85² = 0.69
- Only use the stronger direct link (ignore indirect)
```

**Bidirectional Link Check:**

```
If Link(A→B) exists AND Link(B→A) exists:
  Apply Causality Weight = 0.5 × Normal_Weight
  Reason: Mutual confirmation suggests possible agreement
          rather than independent verification

Example: Magazine article + magazine source = reciprocal citing
  Normal: 0.8 confidence
  Bidirectional: 0.4 confidence (only one source, quoted twice)
```

### 6.4 Evidence Consensus Scoring

**When multiple sources converge on same claim:**

```
Consensus_Score = (1/N) × Σ Source_Confidence(i)
                × Corroboration_Multiplier
                × Independence_Factor

Corroboration_Multiplier = {
  1.0,            if 1 source
  1.15,           if 2 independent sources
  1.25,           if 3+ independent sources
  0.85,           if sources share funding
  0.70,           if sources are competitor outlets
}

Independence_Factor = 1 - (Σ Shared_Edges / Total_Edges)
  Measures: what % of sources share common connections
  Low factor = likely echo chamber

Example:
- Source A: 90% confidence (mainstream journalist)
- Source B: 85% confidence (academic study)
- Source C: 75% confidence (leaked document)
- All independent sources

Consensus = ((90 + 85 + 75) / 3) × 1.25 × 0.95 = 84.6%
```

---

## PART 7: UNIFIED CONFIDENCE SCORING FORMULA

### 7.1 The Master Formula

```
CONFIDENCE_FINAL =
  0.30 × Score_Source_Reliability
  + 0.25 × Score_Information_Credibility
  + 0.20 × Score_Evidence_Quality
  + 0.15 × Score_Network_Consensus
  + 0.10 × Score_Temporal_Freshness

Where each component is 0-100%
```

**Component Definitions:**

#### 1. Source Reliability Score (30%)
```
Score_Source = (Admiralty_Grade + CIA_Confidence + Badge_Tier) / 3

Mapping:
Admiralty Grade A/B → 95%
Admiralty Grade C → 75%
Admiralty Grade D → 50%
Admiralty Grade E → 25%
Admiralty Grade F → 10%

CIA High → 90%
CIA Moderate → 60%
CIA Low → 30%

Badge Tier 1 (Journalist) → 80%
Badge Tier 2 (Verified) → 70%
Badge Tier 3 (Community) → 50%
Anonymous/New → 20%
```

#### 2. Information Credibility Score (25%)
```
Score_Credibility = (Admiralty_Credibility + Fact_Check_Rating + Internal_Consistency) / 3

Admiralty Credibility 1 → 95%
Admiralty Credibility 2 → 80%
Admiralty Credibility 3 → 60%
Admiralty Credibility 4 → 40%
Admiralty Credibility 5 → 20%
Admiralty Credibility 6 → 10%

Fact Check Ratings:
TRUE → 95%
MOSTLY TRUE → 80%
MIXTURE → 50%
MOSTLY FALSE → 20%
FALSE → 5%

Internal Consistency (logical coherence):
Fully consistent → 90%
Minor conflicts → 60%
Major conflicts → 20%
Self-contradictory → 5%
```

#### 3. Evidence Quality Score (20%)
```
Score_Evidence = (Digital_Chain_of_Custody + Source_Type_Strength + Daubert_Compliance) / 3

Digital Chain of Custody:
Complete hash chain → 95%
Partial audit log → 70%
No documentation → 20%

Source Type:
Original doc + sealed → 95%
Certified copy + signature → 85%
Photocopy + authentication → 65%
Screenshot / social media → 35%
Hearsay → 10%

Daubert Compliance:
✓ Testable, published, known error <5%, standards exist → 90%
✓ Partial compliance → 60%
✗ Untested methodology → 30%
```

#### 4. Network Consensus Score (15%)
```
Score_Network = (Consensus_Agreement + Path_Independence + Bidirectional_Penalty) × 100

Consensus Agreement:
3+ independent sources ≥85% avg → 90%
2 independent sources ≥80% avg → 75%
1 source only → 50%

Path Independence: (1 - overlap_factor) × 100
No shared sources → 100%
1 shared source → 70%
Circular (A→B→A) → 20%

Bidirectional Penalty:
No bidirectional links → 1.0
1 bidirectional pair → 0.85
Multiple bidirectional → 0.60
```

#### 5. Temporal Freshness Score (10%)
```
Score_Freshness = Base_Confidence × Freshness_Multiplier × Decay_Function

Freshness Multiplier:
Verified in past 7 days → 1.10
Verified in past 30 days → 1.05
Verified 1-5 years ago → 1.00
Verified 5-10 years ago → 0.95
Verified 10+ years ago → 0.85

Decay Function:
Court records (linear) → 1 - 0.001×days
News/rumors (exponential) → e^(-0.003×days)
Cold case (very slow) → 1 - 0.0005×days
```

### 7.2 Implementation Example: Full Calculation

**Claim:** "Defendant met with co-conspirator on Date X"

**Source:** Journalist Investigation (Tier 2)
- Admiralty Grade: B (usually reliable)
- CIA Confidence: MODERATE
- Badge Tier: Journalist (Tier 2)
- Score_Source = (75 + 60 + 70) / 3 = **68.3%**

**Information Credibility:**
- Admiralty: 2 (probably true, multiple sources)
- Fact-Check: MOSTLY TRUE (confirmed with minor caveats)
- Internal Consistency: 85% (logically coherent)
- Score_Credibility = (80 + 80 + 85) / 3 = **81.7%**

**Evidence Quality:**
- Chain of Custody: Email + document scan (partial) = 70%
- Source Type: Certified records + testimony = 85%
- Daubert: Partially compliant (witness testimony, no lab error rates) = 60%
- Score_Evidence = (70 + 85 + 60) / 3 = **71.7%**

**Network Consensus:**
- Consensus: 3 sources (witness, document, phone records) ≥85% = 90%
- Independence: 0.8 (one phone company common link) = 80%
- Bidirectional: Phone company + witness (some overlap) = 0.85
- Score_Network = (90 × 0.8 × 0.85) × 100 = **61.2%**

**Temporal Freshness:**
- Verified 3 years ago
- Court records linear decay: 1 - 0.001×1095 = 0.88
- Freshness multiplier: 1.00
- Score_Freshness = 88 × 1.00 = **88%**

**FINAL CONFIDENCE:**
```
CONFIDENCE = 0.30×68.3 + 0.25×81.7 + 0.20×71.7 + 0.15×61.2 + 0.10×88
           = 20.5 + 20.4 + 14.3 + 9.2 + 8.8
           = 73.2%

Rating: ⭐⭐⭐ (75-84%) — Good confidence
Verbal: "Likely" / "High Confidence"
Badge: GREEN ✓ with footnote on missing physical evidence
```

---

## PART 8: IMPLEMENTATION FOR PROJECT TRUTH

### 8.1 Database Schema Extensions

```sql
-- Evidence tracking with Admiralty grades
ALTER TABLE evidence_archive ADD COLUMN (
  admiralty_source_grade CHAR(1) CHECK (admiralty_source_grade IN ('A','B','C','D','E','F')),
  admiralty_credibility_grade INT CHECK (admiralty_credibility_grade IN (1,2,3,4,5,6)),
  information_credibility_score NUMERIC(5,2) CHECK (information_credibility_score BETWEEN 0 AND 100),
  evidence_quality_score NUMERIC(5,2),
  network_consensus_score NUMERIC(5,2),
  temporal_freshness_score NUMERIC(5,2),
  final_confidence_score NUMERIC(5,2) GENERATED ALWAYS AS (
    0.30 * (admiralty_source_grade_numeric + badge_tier_score + cia_confidence_score) / 3 +
    0.25 * information_credibility_score +
    0.20 * evidence_quality_score +
    0.15 * network_consensus_score +
    0.10 * temporal_freshness_score
  ) STORED,
  confidence_last_updated TIMESTAMP,
  confidence_decay_type VARCHAR(50) CHECK (confidence_decay_type IN ('linear','exponential','step','none')),
  chain_of_custody_hash VARCHAR(256) -- SHA-256 of custody log
);

-- Temporal tracking
CREATE TABLE confidence_audit_log (
  id UUID PRIMARY KEY,
  evidence_id UUID REFERENCES evidence_archive(id),
  old_score NUMERIC(5,2),
  new_score NUMERIC(5,2),
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Network consensus tracking
CREATE TABLE network_consensus_paths (
  evidence_id UUID REFERENCES evidence_archive(id),
  source_node_id UUID REFERENCES nodes(id),
  target_node_id UUID REFERENCES nodes(id),
  path_length INT,
  path_confidence NUMERIC(5,2),
  shares_sources BOOLEAN,
  is_bidirectional BOOLEAN
);
```

### 8.2 API Endpoints

```
POST /api/confidence/calculate
  Body: {
    evidenceId: string,
    admiraltySourceGrade: 'A'|'B'|'C'|'D'|'E'|'F',
    admiraltyCredibilityGrade: 1|2|3|4|5|6,
    chainOfCustodyHash: string,
    externalSources?: [{url, confidence}]
  }
  Returns: {
    finalConfidence: 0-100,
    breakdown: {
      sourceReliability: 0-100,
      informationCredibility: 0-100,
      evidenceQuality: 0-100,
      networkConsensus: 0-100,
      temporalFreshness: 0-100
    },
    timeDecayApplied: boolean,
    bayesianUpdate: {priorOdds, likelihoodRatio, posteriorOdds},
    claimReviewJSON: {...}
  }

GET /api/confidence/calibration
  Returns: {
    eceMean: 0-1,
    brerScore: 0-1,
    tierAccuracy: {
      tier1: {stated: 0.85, actual: 0.83},
      tier2: {stated: 0.75, actual: 0.72}
    },
    lastAudit: ISO-8601 timestamp
  }

GET /api/confidence/audit-trail/:evidenceId
  Returns: ChainOfCustody log with hash verification
```

### 8.3 UI Components

**Confidence Badge System:**
```
100%: ⭐⭐⭐⭐⭐ VERIFIED   (Green, "Almost Certain")
80%:  ⭐⭐⭐⭐   LIKELY    (Green, "Likely")
70%:  ⭐⭐⭐    PROBABLE  (Yellow, "Probable")
50%:  ⭐⭐    POSSIBLE   (Orange, "Possible")
30%:  ⭐     UNLIKELY   (Red, "Unlikely")
10%:  ✗     DISPUTED   (Red, "Almost No Chance")

Hover tooltip shows:
- Admiralty rating (A1, B2, etc.)
- Source reliability score
- Credibility grade
- Network consensus
- Time decay applied
- Last verification date
- Refresh button to recalculate
```

**Detailed Score Card:**
```
┌─────────────────────────────────────────┐
│ CONFIDENCE ANALYSIS                     │
├─────────────────────────────────────────┤
│ Final Confidence: 73% ⭐⭐⭐            │
│ Status: Last updated 3 days ago         │
├─────────────────────────────────────────┤
│ Source Reliability         68% (Good)    │
│  └─ Admiralty Grade: B                  │
│  └─ CIA Confidence: Moderate            │
│  └─ Badge: Verified Journalist          │
│                                         │
│ Information Credibility    82% (Good)    │
│  └─ Admiralty: 2/6 (Probably True)     │
│  └─ Fact-Check: Mostly True             │
│  └─ Internal Consistency: 85%           │
│                                         │
│ Evidence Quality           72% (Good)    │
│  └─ Chain of Custody: ✓ Partial        │
│  └─ Source Type: Certified + Testimony  │
│  └─ Daubert Compliance: Partial         │
│                                         │
│ Network Consensus          61% (Fair)    │
│  └─ Sources: 3 Independent              │
│  └─ Shared Links: 1 (Phone Co)         │
│  └─ Bidirectional: 0.85x penalty        │
│                                         │
│ Temporal Freshness         88% (Excellent)│
│  └─ Age: 3 years                        │
│  └─ Decay: Linear (court records)       │
│  └─ Verified recently? No                │
├─────────────────────────────────────────┤
│ [View Full Chain of Custody]            │
│ [Export ClaimReview JSON-LD]            │
│ [Recalculate Bayesian Update]           │
└─────────────────────────────────────────┘
```

---

## PART 9: CALIBRATION MONITORING

### 9.1 Monthly Calibration Audit

**Process:**
1. Gather all claims rated >70% confidence in past 30 days
2. Check actual accuracy (manual review by Tier 2+ verifiers)
3. Compare stated confidence to actual accuracy
4. Adjust thresholds if ECE >0.15 or Brier >0.25

**Example Audit Report:**
```
CALIBRATION AUDIT — March 2026

Claims Analyzed: 247

Stated Confidence 80-89%:
  Count: 52
  Actual Accuracy: 79.4%
  ECE: +0.6% (well-calibrated)

Stated Confidence 70-79%:
  Count: 85
  Actual Accuracy: 66.2%
  ECE: -3.8% (slightly overconfident)
  → Recommendation: Lower threshold from 75% to 74%

Stated Confidence 60-69%:
  Count: 110
  Actual Accuracy: 60.7%
  ECE: +0.7% (well-calibrated)

Overall Brier Score: 0.182 (acceptable)
Overall ECE: 1.2% (excellent)

Actions Taken:
✓ Adjusted Tier 2 confidence multiplier from 1.0 to 0.98
✓ Investigated 5 claims with high error (found data entry errors)
✓ Retrained Bayesian priors with March data
```

---

## PART 10: REFERENCES & SOURCES

### Intelligence & Law Enforcement
- [Admiralty Code - Wikipedia](https://en.wikipedia.org/wiki/Admiralty_code)
- [Intelligence Grading: Why the Admiralty Code Matters](https://www.matthewwold.net/post/intelligence-grading-why-the-admiralty-code-matters)
- [NATO AJP-2.1 Source Reliability & Information Credibility](https://www.researchgate.net/figure/NATO-AJP-21-Source-Reliability-and-Information-Credibility-Scales_tbl1_328858953)
- [CIA Analytic Confidence Levels](https://www.cisecurity.org/ms-isac/services/words-of-estimative-probability-analytic-confidences-and-structured-analytic-techniques)
- [Words of Estimative Probability - Wikipedia](https://en.wikipedia.org/wiki/Words_of_estimative_probability)

### Legal Framework
- [Federal Rules of Evidence - Cornell LII](https://www.law.cornell.edu/rules/fre)
- [Daubert Standard - Cornell LII](https://www.law.cornell.edu/wex/daubert_standard)
- [Chain of Custody Digital Evidence](https://sefcom.asu.edu/publications/CoC-SoK-tps2024.pdf)
- [Hearsay Rule - FRE 801-802](https://www.law.cornell.edu/rules/fre/rule_801)

### Fact-Checking
- [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/)
- [Snopes Rating Scale](https://www.snopes.com/fact-check-ratings/)
- [ClaimReview Schema - Schema.org](https://schema.org/ClaimReview)
- [Africa Check Methodology](https://africacheck.org/how-we-fact-check/how-we-rate-claims/)

### Bayesian Methods
- [Bayesian Inference - Wikipedia](https://en.wikipedia.org/wiki/Bayesian_inference)
- [Bayesian Updating Simply Explained](https://towardsdatascience.com/bayesian-updating-simply-explained-c2ed3e563588/)
- [Dempster-Shafer Evidence Theory](https://arxiv.org/pdf/1005.4978)
- [Combining Multiple Independent Sources](https://academic.oup.com/lpr/article/17/2/163/4990440)

### Temporal & Network Analysis
- [Temporal Quality Degradation in AI Models - Nature](https://www.nature.com/articles/s41598-022-15245-z)
- [Data Freshness in RAG Systems](https://glenrhodes.com/data-freshness-rot-as-the-silent-failure-mode-in-production-rag-systems-and-treating-document-shelf-life-as-a-first-class-reliability-concern-4/)
- [Knowledge Graph Confidence Propagation](https://www.researchgate.net/publication/371384144_Continuous_Knowledge_Graph_Refinement_with_Confidence_Propagation)
- [PageRank & Trust Metrics - Neo4j](https://neo4j.com/docs/graph-data-science/current/algorithms/page-rank/)
- [Trust Propagation in Networks](https://www.sciencedirect.com/science/article/abs/pii/S0950705121008728)

### Calibration
- [Confidence Calibration for Deep Networks - Medium](https://medium.com/data-science/confidence-calibration-for-deep-networks-why-and-how-e2cd4fe4a086)
- [Expected Calibration Error (ECE)](https://confido.institute/encyclopedia/calibration.html)

---

## CONCLUSION

This framework provides Project Truth with a scientifically-grounded, legally-defensible confidence assessment system. Key strengths:

✓ **Separately assesses source reliability and information credibility** (prevents bias)
✓ **Bayesian foundation** (mathematically sound evidence accumulation)
✓ **Temporal awareness** (evidence degrades over time)
✓ **Network-aware** (consensus strengthens confidence, but prevents echo chambers)
✓ **Calibrated** (stated confidence actually matches accuracy)
✓ **Transparent** (users see full breakdown, not black-box percentage)
✓ **Defensible in court** (Daubert-compliant, chain-of-custody tracked)

**Next Steps:**
1. Implement database schema (Week 1)
2. Build confidence calculator endpoints (Week 2-3)
3. Integrate with evidence UI (Week 3-4)
4. Run 3-month calibration pilot (Month 2)
5. Launch public calibration reporting (Month 3)

