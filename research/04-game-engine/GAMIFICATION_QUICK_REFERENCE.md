# GAMIFICATION QUICK REFERENCE CARD
## Copy this, print it, post it by your desk

---

## REPUTATION POINTS (Exact Values)

### Verification Tasks
- Verify simple (basic "yes/no"): **+3 pts**
- Verify with link (add evidence): **+8 pts**
- Verify detailed (full reasoning): **+15 pts**
- Dispute wrong verification: **-5 pts** (cost to prevent gaming)
- Correct after dispute: **+5 pts** (reward for contrarian)

### Documents & Evidence
- Upload document: **+2 pts**
- Scan document (AI extraction): **+10 pts**
- Document used in 3+ verifications: **+5 bonus pts**

### Investigations
- Publish investigation: **+5 pts** (one-time)
- Reach 10 supporters: **+10 bonus pts**

### Cross-References
- Cross-reference found: **+8 pts**
- Honeypot caught (AI hallucination): **+10 pts**

### Streaks & Consistency
- Daily login: **+1 pt** (max +7/week)
- 5-day streak: **+5 bonus pts**
- 30-day streak: **+20 bonus pts**

### Milestones
- Reach Tier 2: **+50 bonus pts** (one-time)
- Reach Tier 3: **+100 bonus pts** (one-time)

---

## TIER REQUIREMENTS

| Tier | Rep Points | Contributions | Accuracy | Guarantors | Privileges |
|------|-----------|---|---|---|---|
| **1** | 0-199 | 0+ | 70%+ | None | Read, vote 0.5x |
| **2** | 200-999 | 20+ | 80%+ | 3 peers | Create investigations, dispute, vote 2x |
| **3** | 1000+ | 100+ | 85%+ | 5 peers | Full access, arbitrate, vote 5x |

---

## BADGES (15 Total)

### Tier 1: Common (Bronze)
1. First Step (first verification)
2. Verifier (10 verifications)
3. Honeypot Hunter (caught AI-generated entity)

### Tier 2: Uncommon (Silver)
4. Perfect Week (100% accuracy, 1 week)
5. Streak Builder (5-day streak)
6. Evidence Master (upload 10 documents)

### Tier 3: Rare (Gold)
7. Expert Verifier (50 verifications)
8. Accuracy Expert (95%+ accuracy)
9. Story Finder (10 cross-references)

### Tier 4: Epic (Purple)
10. Tier 2 Achieved (community trusted)
11. 30-Day Streak (legendary)
12. Investigation Published (50+ supporters)

### Tier 5: Legendary (Gold Crown)
13. Tier 3 Achieved (expert authority)
14. 100+ Day Active Streak
15. Community Arbitrator (helped resolve 10+ disputes)

---

## CONFIDENCE-WEIGHTED ALGORITHM

**Formula:** verdict_score = SUM(tier_weight × confidence/100)

**Tier Weights:**
- Tier 1: 1.0x
- Tier 2: 2.0x
- Tier 3: 5.0x

**Verdicts (YES ratio):**
- VERIFIED: **> 70%**
- LIKELY_TRUE: **> 55%**
- DISPUTED: **45-55%**
- LIKELY_FALSE: **< 45%**
- REFUTED: **< 30%**

**Math Example:**
```
Tier 3 at 95% confidence YES: 5.0 × 0.95 = 4.75
Tier 1 at 50% confidence YES: 1.0 × 0.50 = 0.50

Expert wins ✓
(This is why careless voting fails)
```

---

## HONEYPOT RULES

**What:** Mix 15% known-answer questions into review queue
**Why:** Catches careless/bot reviewers immediately
**Threshold:** 80% accuracy required on honeypots
**Action if < 80%:** Auto-pause + suggest retraining

---

## TASK TYPES (5)

1. **EXISTENCE** (2 min, +3 pts): Does this person exist?
2. **FACT** (3 min, +8 pts): Does this fact match the document?
3. **CROSS_REFERENCE** (4 min, +10 pts): Find entity in other documents?
4. **RELATIONSHIP** (5 min, +15 pts): What's the relationship between 2 people?
5. **HONEYPOT** (3 min, +10 pts): Is this real or AI-generated?

---

## MOBILE TASK DESIGN

- **Time limit:** 2-5 minutes per task
- **UI:** Vertical stack (not side-by-side)
- **Buttons:** Large (thumb-friendly, 48px minimum)
- **Load time:** < 5 seconds
- **Offline:** Download documents for offline review

---

## DAILY CAPS (Soft Limits)

| Tier | Max Tasks/Day | Honeypots/Day | Notes |
|------|---|---|---|
| **1** | 10 | 2 | New users |
| **2** | 50 | 5 | Trusted community |
| **3** | 100 | 10 | Journalists/experts |

**Rule:** If accuracy drops, system reduces cap temporarily

---

## ANTI-GAMING SAFEGUARDS

✅ **Account Age Penalty:** 0-7 days = 0.1x weight, 8-30 days = 0.3x, 31-90 days = 0.7x, 90+ = 1.0x

✅ **Honeypot Testing:** 15% of tasks are known-answer validation

✅ **Behavioral Fingerprinting:** Detect bot patterns (too fast, 100% accuracy, same IP)

✅ **Covariance Detection:** Identify voting rings (accounts voting identically)

✅ **Geographic Anomalies:** Flag coordinated voting from same IP block

✅ **Economic Barriers:** Disputing costs 5 reputation (prevents low-effort gaming)

✅ **Proof of Life Chain:** Multi-month account age requirement for tier upgrade

---

## LEADERBOARD DISPLAY

**Frequency:** Weekly (refresh Sunday 00:00 UTC)

**Rankings:**
- Top 50 (show names, tiers, reputation)
- All-time top 100 (show cumulative stats)
- "This Month" (current month only)

**Show:**
- Rank #
- User name/pseudonym
- Reputation score
- Accuracy %
- Verifications count
- Top 3 badges earned

---

## SUCCESS METRICS (12-WEEK TARGET)

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Daily active reviewers | 200 | 1000+ | 5x |
| Verifications/day | 500 | 5000+ | 10x |
| Accuracy | 78% | 92% | +14% |
| Tier 2 adoption | 15% | 30% | 2x |
| Retention week 4 | 40% | 75% | +87% |

---

## IMPLEMENTATION PHASES

```
WEEK 1-2:   Reputation core + point values (database + API)
WEEK 3-4:   Badges + leaderboards (15 badges, weekly refresh)
WEEK 5-6:   Task system + role routing (4 roles: journalist, researcher, lawyer, general)
WEEK 7-8:   Quality control + honeypots (inter-rater agreement, anomaly detection)
WEEK 9:     Integration testing + bug fixes
WEEK 10:    Closed beta (100 trusted users)
WEEK 11:    Feedback iteration (adjust point values, task difficulty)
WEEK 12:    Public launch
```

---

## ROLE-BASED TASK ROUTING

**Journalist:**
- Sees: Relationship, story connection, narrative verification
- Reward: +2x points
- Skill: Story sense, quote verification

**Researcher:**
- Sees: Cross-reference, database search, source validation
- Reward: +1.5x academic, +2x cross-ref
- Skill: Database searching, citation validation

**Lawyer:**
- Sees: Court documents, legal interpretation, evidence evaluation
- Reward: +2x court docs, +1.5x evidence
- Skill: Document authentication, legal knowledge

**General Community:**
- Sees: Existence, simple facts, plagiarism detection
- Reward: Streaks incentivized
- Skill: Careful attention, diverse perspectives

---

## WHAT TO AVOID

❌ Too many badges (>15)
❌ Free downvoting (causes voting wars)
❌ AI final authority (always add human review)
❌ Aggressive moderation (need appeals)
❌ Ignoring burnout (soft caps, breaks encouraged)
❌ Visible hallucinations (honeypots catch them first)

---

## WHAT YOU ALREADY HAVE

✅ 3-guarantor system (Sybil-resistant)
✅ Tier system (Tier 0-3, clear progression)
✅ Quarantine queue (quality-first)
✅ Reputation decay (prevents stale accounts)
✅ RLS policies (row-level security)

**Focus:** Add gamification ON TOP

---

## CODE TO START WITH

**File:** `/src/lib/reputation.ts`

Already has:
- `awardReputation()` — Award points
- `getUserBadges()` — Get earned badges
- `getLeaderboard()` — Leaderboard ranking
- `getReputationTier()` — Tier calculation
- Dynamic staking system

**What's new:**
- Point values (all specific amounts)
- Badge list (15 total)
- Confidence-weighted algorithm
- Honeypot system
- Task queue generation

---

## KEY DECISION

**Decision:** Full system (12 weeks) or MVP (4 weeks)?

**MVP Path (Week 1-4):**
- Reputation + point values only
- Simple badges (5 total)
- Basic leaderboard
- NO honeypots yet, NO role routing

**Full Path (Week 1-12):**
- Everything above +
- 15 badges
- Honeypot system
- Role-based routing
- Quality control (Kappa, anomaly detection)

**Recommendation:** Start MVP (Week 1-4), then expand (Week 5-12)

---

## QUESTIONS FOR YOUR TEAM

Before Week 1:

1. **Point values feel right?** (+3, +8, +15 for verifications)
2. **Honeypot source?** (Suggest: Maxwell network + 5 AI-generated false entities)
3. **Tier requirements locked in?** (3 guarantors, 200/1000 reputation thresholds)
4. **Launch strategy?** (Soft beta 100 users then big bang)
5. **Leaderboard anonymity?** (Recommend: Pseudonyms only, no real names)
6. **Daily caps fair?** (10/50/100 for Tier 1/2/3)

---

## FILES TO READ (IN ORDER)

1. **This file** (5 min) ← You are here
2. **GAMIFICATION_RESEARCH_INDEX.md** (10 min) — Overview
3. **GAMIFICATION_IMPLEMENTATION_GUIDE.md** (2 hours) — Engineering path
4. **GAMIFIED_VERIFICATION_CROWDSOURCED_TRUTH.md** (4 hours) — Deep dive
5. **CONFIDENCE_WEIGHTED_VERIFICATION_ALGORITHM.md** (1 hour) — Math deep dive

**Total reading:** ~7 hours
**Action items:** Start coding Week 1

---

## EXPECTED WEEK-BY-WEEK PROGRESS

```
WEEK 1-2:
  ✅ Reputation scoring live
  ✅ Points awarded on verification
  ✅ API endpoints working
  ✅ Basic UI showing reputation

WEEK 3-4:
  ✅ 15 badges defined
  ✅ Leaderboard live (weekly)
  ✅ Badge UI components done
  ✅ Notifications on tier up

WEEK 5-6:
  ✅ Task queue system live
  ✅ 4 task types working
  ✅ Role assignment in onboarding
  ✅ Mobile task UI complete

WEEK 7-8:
  ✅ Honeypot system live
  ✅ Kappa calculations automated
  ✅ Anomaly detection running
  ✅ Auto-pause on low accuracy

WEEK 9:
  ✅ Integration testing complete
  ✅ All bugs fixed
  ✅ Performance optimized

WEEK 10:
  ✅ 100 beta users enrolled
  ✅ Feedback collected
  ✅ Bugs reported and tracked

WEEK 11:
  ✅ Point values adjusted (based on user behavior)
  ✅ Task difficulty ramping refined
  ✅ UX issues fixed

WEEK 12:
  ✅ Public launch
  ✅ Press announcements
  ✅ Expect 5-10x engagement spike
```

---

**Print this page. Keep it by your desk. Reference it constantly.**

**Questions?** See main research documents.

**Ready to build?** Hand this to engineering.

---

**Last updated:** March 22, 2026
**Status:** ✅ Complete & ready to implement

