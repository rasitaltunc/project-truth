# CONSENSUS SCORING — QUICK REFERENCE CARD

**Print this. Keep it visible. Reference daily.**

---

## THE SEVEN DEFENSE LAYERS

| # | Layer | What | When | How |
|---|-------|------|------|-----|
| 1 | **Quality** | Estimate reviewer accuracy | Nightly cron | Dawid-Skene EM algorithm |
| 2 | **Bridging** | Require cross-expertise agreement | During review | Matrix factorization |
| 3 | **Quorum** | Adapt # reviews to difficulty | Per item | Dynamic formula |
| 4 | **Cross-doc** | Combine confidence across sources | On promotion | Dempster-Shafer theorem |
| 5 | **Sybil** | Detect fake accounts | Nightly cron | Graph-based SybilRank |
| 6 | **Coord** | Detect group voting | Real-time | Pearson + temporal |
| 7 | **Behavior** | Detect account hijacking | Daily cron | CUSUM change detection |

---

## KEY FORMULAS (Bookmark These)

### Condorcet Jury Theorem
```
P(correct | n reviewers, accuracy p) improves as n increases
BUT ONLY if p > 0.5

If p < 0.5: More reviewers = worse outcome
THEREFORE: Must maintain p > 0.70 at all times
```

### Dempster-Shafer Combination
```
combined = (conf1 × conf2) / (1 - conflict)
where conflict = (conf1 × (1-conf2)) + ((1-conf1) × conf2)

Example: 0.92 + 0.88 = 0.9883 (strengthens, not averages)
```

### Dynamic Quorum
```
required = 3 + difficulty_penalty + disagreement_penalty + quality_penalty

Penalties: 0-2 each, capped at 9 total

Easy item (99% AI confident): 3 reviews
Hard item (40% AI confident): 7-9 reviews
```

### Consensus Decision
```
approval_score = (approve - reject) / total
status = {
  VERIFIED if approval_score > 0.6 AND reviews ≥ required,
  WEAK_APPROVAL if approval_score > 0,
  DISPUTED if -0.2 < approval_score < 0.2,
  REJECTED if approval_score < -0.2
}
```

---

## ATTACK SCENARIOS & DETECTION

| Attack | How It Works | Detection | Time |
|--------|-------------|-----------|------|
| **Sybil** | 5 fake accounts vote together | SybilRank isolation | 5 min |
| **Coordinated** | 3 colleagues vote identically | Pearson >0.8 correlation | Real-time |
| **Farming** | Only verify easy items | Difficulty distribution | 1 day |
| **Sleeper** | Build reputation, then flip | CUSUM behavior change | 2-3 weeks |
| **Ring** | Group nominating each other | Graph cycle detection | 1 day |

---

## RED FLAGS (STOP & INVESTIGATE)

- [ ] Average reviewer accuracy < 0.65 → System unreliable
- [ ] >20% reviewers flagged in first month → Hiring problem
- [ ] Single reviewer > 10% of weight → Power concentration
- [ ] Temporal burst: 5+ reviews in 5 minutes → Coordination
- [ ] Pearson correlation >0.9 between two reviewers → Investigate
- [ ] Reviewer flips from 0.90 → 0.40 accuracy → Behavior change

---

## WEEKLY METRICS DASHBOARD

Track these every Monday:

```
Accuracy Metrics:
  □ Average reviewer accuracy: _____ (target: >0.75)
  □ Median accuracy: _____ (target: >0.80)
  □ Reviewers flagged: _____ (target: <5%)

Consensus Health:
  □ Avg consensus score: _____ (target: >0.60)
  □ Promotion rate: _____ (target: 60-80%)
  □ Rejection rate: _____ (target: 5-15%)
  □ Disputed rate: _____ (target: 5-10%)

Anti-Gaming:
  □ Sybil attacks detected: _____ (target: 0)
  □ Coordinated voting incidents: _____ (target: <1/week)
  □ Reputation farming flags: _____ (target: <5)

Performance:
  □ Median quorum required: _____ (target: 3-4)
  □ Median time to consensus: _____ hours (target: <24)
```

---

## IMPLEMENTATION SPRINT CHECKLIST

### Sprint 18 (Weeks 1-2): Foundation
- [ ] Database schema deployed
- [ ] Reviewer quality profiles table ✓
- [ ] Consensus history table ✓
- [ ] Cron infrastructure setup ✓

### Sprint 19 (Weeks 3-4): Dawid-Skene
- [ ] EM algorithm implemented
- [ ] Accuracy measurement working
- [ ] Nightly cron job running
- [ ] Accuracy reports generated

### Sprint 20 (Weeks 5-6): Bridging
- [ ] Matrix factorization code done
- [ ] Bridging score calculation working
- [ ] Cross-expertise requirement enforced
- [ ] Expertise mapping complete

### Sprint 21 (Weeks 7-8): Anti-Gaming
- [ ] SybilRank detection live
- [ ] Coordinated voting detection live
- [ ] Reputation farming detection live
- [ ] Behavior change detection live

### Sprint 22 (Weeks 9-10): Dynamic Quorum
- [ ] Difficulty penalties implemented
- [ ] Disagreement penalties working
- [ ] Quality penalties enforced
- [ ] Quorum calculation API live

### Sprint 23 (Weeks 11-12): Cross-Document
- [ ] Dempster-Shafer combination coded
- [ ] Cascade rollback mechanism working
- [ ] Network confidence recomputation automatic
- [ ] Tested with forged document scenario

### Sprint 24+ (Testing & Launch)
- [ ] All E2E tests passing
- [ ] Adversarial testing completed
- [ ] Security team sign-off
- [ ] Production deployment ready

---

## TROUBLESHOOTING

### Problem: Consensus Calculation Takes >10 seconds
**Solution:** Implement caching, run async
```sql
-- Cache consensus results for 1 hour
REFRESH MATERIALIZED VIEW consensus_cache;
```

### Problem: Reviewer Accuracy Drops Suddenly
**Investigation:**
1. Check for temporal burst attacks
2. Verify device fingerprints
3. Look for behavior change (CUSUM)
4. Consider account compromise

### Problem: High Disagreement on Easy Items
**Possible causes:**
1. AI confidence score miscalibrated
2. Ambiguous item data
3. Reviewer disagreement is legitimate (accept it)

### Problem: Sybil Alert Fires But Users Claim Innocence
**Response:**
1. Don't immediately ban, just down-weight
2. Monitor for 2 weeks
3. If behavior improves, restore weight
4. If persists, escalate to Tier 4 review

---

## CRITICAL NUMBERS TO REMEMBER

- **3** = minimum safe quorum (Condorcet theorem)
- **0.70** = minimum acceptable reviewer accuracy
- **0.80** = target average reviewer accuracy
- **0.85** = high-confidence structural data threshold
- **0.70** = medium-difficulty AI-assisted threshold
- **0.40** = low-confidence speculative data threshold
- **9** = maximum quorum (diminishing returns)
- **5** = minutes to detect Sybil attack (SybilRank)
- **2-3 weeks** = time to detect sleeper agent (CUSUM)
- **0.80** = Pearson correlation threshold (coordinated voting)

---

## ONE-LINER EXPLANATIONS

**Condorcet:** "More votes beats fewer votes, if voters are good."

**Dempster-Shafer:** "Two good sources agree better than each alone."

**Dawid-Skene:** "Find truth and trustworthiness at the same time."

**Bridging:** "Consensus requires agreement across different groups."

**SybilRank:** "Fake accounts cluster together; real users don't."

**CUSUM:** "Sudden behavior flip is detectable mathematically."

---

## DECISION TREE: Is Item Ready to Promote?

```
START: Item in quarantine with N reviews

├─ N < required_reviews?
│  └─ YES → Need more reviews (wait)
│
├─ approval_score > 0.6?
│  ├─ YES → VERIFIED (promote immediately)
│  └─ NO → Continue below
│
├─ approval_score > 0?
│  ├─ YES → WEAK_APPROVAL (promote with flag)
│  └─ NO → Continue below
│
├─ -0.2 < approval_score < 0.2?
│  ├─ YES → DISPUTED (request expert panel)
│  └─ NO → Proceed
│
└─ REJECTED (archive, unlikely to recover)
```

---

## GLOSSARY

**Consensus Score:** (-1 to +1) measure of agreement. 1=unanimous approval, -1=unanimous rejection.

**Approval Ratio:** (0 to 1) fraction of reviewers who approved.

**Quorum:** Minimum number of reviews required before decision made.

**Sybil Attack:** Attacker creates multiple fake accounts to swing vote.

**Coordinated Voting:** Real people voting together to manipulate outcome.

**Reputation Farming:** Gaming the system by verifying only easy items.

**Sleeper Agent:** Account hijacked or compromised, behavior suddenly changes.

**Bridging:** Requiring agreement across different expertise groups, not just majority.

**Dempster-Shafer:** Mathematical method for combining independent evidence.

**Dawid-Skene:** EM algorithm for finding truth + trustworthiness simultaneously.

---

## LINKS TO FULL DOCS

- **Technical Deep Dive:** `CONSENSUS_SCORING_ANTI_GAMING_ARCHITECTURE.md`
- **Implementation Code:** `CONSENSUS_IMPLEMENTATION_GUIDE.md`
- **Executive Summary:** `CONSENSUS_EXECUTIVE_SUMMARY.md`
- **This Card:** `CONSENSUS_QUICK_REFERENCE.md`

---

**Last Updated:** March 23, 2026
**Status:** READY FOR IMPLEMENTATION
**Next Action:** Engineering team review & sprint planning
