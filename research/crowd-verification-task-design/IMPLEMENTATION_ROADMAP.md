# IMPLEMENTATION ROADMAP: LEGAL DOCUMENT VERIFICATION TASKS
## Prioritized, Sprint-Ready Action Plan

---

## PHASE 1: MVP (Sprint 20-21 — 2-3 weeks)

### Goal
Launch minimal viable task system with **Existence Verification** template. Collect data on engagement, accuracy, and failure modes with real users (Maxwell trial exhibits).

### Deliverables
1. **VerificationTask.tsx component** (React)
   - Conditional branching (existence → detail match)
   - Confidence slider
   - Real-time feedback

2. **Task generation pipeline**
   - Load documents from evidence_archive
   - Extract entities from AI tagging
   - Create 100 seed tasks

3. **Consensus aggregation**
   - 3-person vote required
   - Store disagreements
   - Escalation queue for >1 disagreement

4. **User feedback loop**
   - Show accuracy in real-time
   - Display network impact ("You added 2 people")
   - Simple leaderboard (names only, no financial incentives)

5. **Quality monitoring**
   - Honeypot tracking (every 10th task)
   - Accuracy floor enforcement
   - Session rate limiting (max 30 tasks)

### Database Changes (REQUIRED)
```sql
-- Add to existing schemas
ALTER TABLE nodes ADD COLUMN verified_by_crowd BOOLEAN DEFAULT false;
ALTER TABLE nodes ADD COLUMN verification_count INT DEFAULT 0;
ALTER TABLE nodes ADD COLUMN verification_accuracy FLOAT;

CREATE TABLE verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(50), -- 'existence', 'detail_match', 'relationship'
  primary_entity_id UUID REFERENCES nodes(id),
  document_id UUID REFERENCES documents(id),
  document_excerpt TEXT,
  honeypot BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

CREATE TABLE verification_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES verification_tasks(id),
  user_fingerprint VARCHAR(64),
  answer VARCHAR(50),
  confidence INT (1-5),
  reasoning TEXT,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(task_id, user_fingerprint) -- One response per user per task
);

CREATE TABLE verification_consensus (
  task_id UUID PRIMARY KEY REFERENCES verification_tasks(id),
  response_count INT,
  agreed_answer VARCHAR(50),
  agreement_percentage FLOAT,
  status VARCHAR(50), -- 'consensus', 'disputed', 'escalated'
  updated_at TIMESTAMP DEFAULT now()
);
```

### Success Criteria
- 50+ users complete verification tasks
- 85%+ accuracy with 3-person consensus
- <10% quit rate during session
- Honeypot catch rate >80%

### Timeline
- Week 1: Database + component build + testing
- Week 2: 100 seed tasks, launch with beta group (10 users)
- Week 2-3: Monitor, iterate, expand to 50 users

---

## PHASE 2: DETAIL MATCHING & RELATIONSHIPS (Sprint 22-23 — 2 weeks)

### Goal
Add conditional branching and relationship verification. Train users to handle more complex tasks.

### Deliverables
1. **Conditional task routing**
   - If existence = YES → show detail match
   - Reuse 80% of component logic

2. **Relationship verification template** (Template 3)
   - Evidence type classification
   - Source confidence ranking
   - Nuanced scale (definitely/probably/etc.)

3. **Tier 2 unlock system**
   - Users with 20+ correct verifications
   - Can see relationship tasks
   - Can propose new connections

4. **Anti-gaming measures**
   - Streak bonus system
   - Asymmetric scoring (correct +1, wrong -2)
   - Accuracy floor (< 65% = pause + tutorial)

### Database Changes
```sql
-- User progression tracking
CREATE TABLE user_verification_profile (
  user_fingerprint VARCHAR(64) PRIMARY KEY,
  tier INT DEFAULT 1,
  total_tasks INT,
  correct_answers INT,
  accuracy FLOAT,
  streak INT,
  last_task_date TIMESTAMP,
  tier_2_unlocked_date TIMESTAMP
);

-- Relationship verification tasks
ALTER TABLE verification_tasks ADD COLUMN secondary_entity_id UUID REFERENCES nodes(id);
ALTER TABLE verification_tasks ADD COLUMN evidence_type JSONB; -- ['communication', 'meeting', etc.]
ALTER TABLE verification_tasks ADD COLUMN source_confidence VARCHAR(20); -- 'primary', 'secondary', 'tertiary'
```

### Success Criteria
- 30+ users reach Tier 2
- Relationship accuracy >78%
- <15% quit rate on harder tasks
- 80%+ of reasoning fields filled

### Timeline
- Week 1: Component build, conditional routing, relationship template
- Week 2: Launch with Tier 1 users, monitor unlock rate

---

## PHASE 3: EXPERT REVIEW & DISPUTE RESOLUTION (Sprint 24 — 1-2 weeks)

### Goal
Add Tier 3 (expert) tasks. Create clear escalation path for disputed verifications.

### Deliverables
1. **Expert Review panel** (Template 4)
   - Show community disagreement
   - Expert makes binding decision
   - Reasoning captured for audit trail

2. **Escalation automation**
   - If 2/3 users disagree → auto-escalate
   - If 1/3 choose "unsure" → auto-escalate
   - Assign to Tier 3 pool

3. **Expert tier (Tier 3) unlock**
   - 100+ correct verifications AND
   - 90%+ accuracy (calibration check)
   - Manual invitation (reputation-based)

4. **Conflict resolution metrics**
   - Track which experts agree with each other
   - Detect outlier experts
   - Recalibration mechanism

### Success Criteria
- 5-10 Tier 3 experts active
- Expert decision acceptance >95%
- Expert-to-expert agreement >85%
- Escalation rate <5%

### Timeline
- Sprint 24: Build expert panel + escalation logic
- Launch with first 5 experts, iterate

---

## PHASE 4: GAMIFICATION & COMMUNITY (Sprint 25-26 — 2 weeks)

### Goal
Add leaderboards, streaks, and community recognition (WITHOUT financial incentives).

### Deliverables
1. **Leaderboard system**
   - Top 10 "Verified Investigators" (weekly, monthly, all-time)
   - Public profiles (verification count, accuracy, tier)
   - Community badges

2. **Achievement system**
   - Bronze Verifier (10 correct)
   - Silver Investigator (50 correct)
   - Gold Detective (100 correct)
   - Platinum Expert (500 correct)

3. **Streak mechanics**
   - Visible streak counter
   - +2 bonus on 5-streak
   - +5 bonus on 20-streak
   - Reset on incorrect answer

4. **User dashboard**
   - Personal stats (accuracy, streak, rank)
   - Network contribution ("You added 47 people")
   - Next tier progress
   - Recent achievements

5. **Community messaging**
   - Highlights top contributors in Maxwell case
   - Shows network growing ("147 people verified")
   - Links to live visualization ("See your impact")

### Success Criteria
- 40%+ user retention (session 2+)
- Top 10 leaderboard is stable (not gaming artifacts)
- <1% users with suspicious accuracy patterns

### Timeline
- Week 1: Leaderboard + achievement system
- Week 2: Dashboard + messaging integration
- Launch to full community

---

## PHASE 5: ADVANCED FEATURES (Sprint 27+ — Optional)

### Only if MVP succeeds (>50% retention, >85% accuracy)

**Option 1: Multi-Case Expansion**
- Add Panama Papers documents
- Add Pandora Papers
- Users specialize per case (expertise signals)

**Option 2: Automated Retraining**
- Periodic honeypot recalibration
- Accuracy floor retraining
- Updated tutorials based on failure patterns

**Option 3: Open Community Dataset**
- Publish verified-only nodes + links
- JSON API for researchers
- Academic citations

**Option 4: Advanced Verification**
- Timeline consistency checks (dates)
- Entity relationship validation (can't meet 2 years before birth)
- Duplicate detection (name + birth year → same person)

---

## RISK MITIGATION

### Risk 1: Low Engagement (People Don't Show Up)
**Symptoms:** <30 users after Week 2
**Mitigation:**
- Add gamification earlier (shift Phase 4 to Phase 2)
- Reduce tasks per session (15 instead of 30)
- Add immediate email feedback ("You verified 3 people!")
- Promote to existing investigationGameStore users (warm audience)

### Risk 2: Low Accuracy (Can't Reach 85% Consensus)
**Symptoms:** <70% agreement on 3-person vote
**Mitigation:**
- Reduce task complexity (stick with existence only)
- Add more context (show related people in network)
- Improve instruction clarity (test with non-experts)
- Reduce honeypot failure rate threshold (flag at 75% instead of 80%)

### Risk 3: Gaming/Manipulation (Users Optimizing for Points)
**Symptoms:** Top users have <65% accuracy, all "Yes" answers
**Mitigation:**
- Implement honeypot every 5 tasks (not 10)
- Asymmetric scoring (-2 for wrong, +1 for right) applied immediately
- Anti-consensus badge (flag users who disagree with 90%+ consensus)
- Manual review of top leaderboard users (outliers suspicious)

### Risk 4: Task Bottleneck (Not Enough Tasks)
**Symptoms:** "No tasks available" message after 5 minutes
**Mitigation:**
- Pre-generate 500+ tasks from evidence_archive
- Auto-generate tasks from AI extraction (daily batch)
- Extend to other networks (not just Maxwell)
- User-proposed tasks (Tier 2+ can suggest connections)

### Risk 5: Expert Bottleneck (Tier 3 Can't Review)
**Symptoms:** >50 escalated tasks, Tier 3 pool <3 people
**Mitigation:**
- Lower Tier 3 unlock criteria (50 correct instead of 100)
- Add "escalation review" as separate Tier 2.5 (lighter than Tier 3)
- Weekly expert panel review call (batch escalations)
- Auto-accept if 2/2 Tier 3 agree (don't wait for 3rd)

---

## RESOURCE ALLOCATION

### Developer Time (MVP Only)
- Backend API routes: 8-12 hours (consensus, aggregation, escalation)
- Database setup + migrations: 4-6 hours
- React components: 12-16 hours (task UI, feedback, leaderboard)
- Testing + bug fixes: 8-10 hours
- **Total: 40-50 hours (1 developer, 1 week)**

### Product/Design Time
- Task template iterations: 4-6 hours
- User testing with 3-5 beta users: 6-8 hours
- Feedback integration: 4-6 hours
- **Total: 14-20 hours (0.5 developer, 1 week)**

### Ongoing (Per Sprint)
- Bug fixes: 4-6 hours
- User support: 2-4 hours
- Data analysis (accuracy trends): 2-4 hours
- **Total: 8-14 hours/week**

---

## CHECKLIST (MVP LAUNCH)

### Code
- [ ] VerificationTask.tsx component + tests
- [ ] Task generation pipeline
- [ ] Consensus aggregation algorithm
- [ ] User feedback component
- [ ] Rate limiting middleware
- [ ] Honeypot strategy

### Database
- [ ] verification_tasks table
- [ ] verification_responses table
- [ ] verification_consensus table
- [ ] user_verification_profile table
- [ ] RLS policies (users can only see their own responses)

### Product
- [ ] 100 seed tasks (Maxwell trial)
- [ ] Beta user recruitment (10 users)
- [ ] Onboarding flow
- [ ] Help/tutorial content
- [ ] Success feedback messages

### Monitoring
- [ ] Accuracy tracking dashboard (internal)
- [ ] Quit rate alerts
- [ ] Honeypot performance alerts
- [ ] Consensus agreement tracking

### Go-Live
- [ ] 3-person dogfood test
- [ ] Beta launch (invite 10 users)
- [ ] Monitor for 1 week
- [ ] Bug fixes + iterations
- [ ] Public launch (all registered users)

---

## SUCCESS DEFINITION

### MVP Success (Go/No-Go Decision)
- **GO:** 50+ users, 85%+ accuracy, >70% consensus, <10% quit rate
- **ITERATE:** 30-50 users OR 75-84% accuracy (tweak and relaunch)
- **NO-GO:** <30 users OR <75% accuracy (needs bigger redesign)

### Phase 2+ Success
- 200+ active verifiers
- 1000+ verified entities
- Maxwell network expanded from 15 → 100+ people
- Expert panel of 5-10 trusted reviewers
- Published dataset used by journalists

---

## INTEGRATION WITH PROJECT TRUTH CODEBASE

### Where This Lives
```
apps/dashboard/
├── src/
│   ├── components/
│   │   ├── Verification/
│   │   │   ├── VerificationTask.tsx (main component)
│   │   │   ├── ExistenceVerification.tsx
│   │   │   ├── DetailMatching.tsx
│   │   │   ├── RelationshipVerification.tsx
│   │   │   ├── ExpertReview.tsx
│   │   │   └── TaskFeedback.tsx
│   │   └── Leaderboard/ (Phase 4)
│   │       ├── LeaderboardPanel.tsx
│   │       ├── UserStats.tsx
│   │       └── AchievementBadges.tsx
│   │
│   ├── store/
│   │   └── verificationStore.ts (Zustand store)
│   │       ├── currentTask
│   │       ├── userStats
│   │       ├── consensus tracking
│   │       └── submission handling
│   │
│   ├── lib/
│   │   ├── verification/
│   │   │   ├── taskGeneration.ts
│   │   │   ├── consensusAggregation.ts
│   │   │   ├── honeyPotDetection.ts
│   │   │   └── userProgression.ts
│   │   └── supabaseClient.ts (existing)
│   │
│   └── app/api/
│       ├── verification/tasks/route.ts (GET next task)
│       ├── verification/submit/route.ts (POST response)
│       ├── verification/consensus/route.ts (GET task status)
│       └── verification/leaderboard/route.ts (Phase 4)
│
└── public/
    └── verification/ (assets)
        ├── tutorial.mp4
        └── icons/
```

### Entry Point
- Add "VERIFICATION PANEL" button to Truth3DScene (same location as Tunnel, Chat, Board)
- Opens verification modal with task stream
- Shares existing badgeStore, investigationStore, etc.

### Reuses Existing Infrastructure
- ✓ badgeStore (reputation) — verification accuracy feeds into this
- ✓ investigationStore (context) — verified nodes auto-added
- ✓ nodeStatsStore (heat map) — verification count → heat signal
- ✓ truth/page.tsx (main scene) — no changes needed
- ✓ Supabase RLS — existing policies apply

---

## QUESTIONS FOR RAŞIT

1. **Seed tasks:** Should we start with Maxwell (100 documents) or expand to Panama Papers from day 1?

2. **User pool:** Who are the first 50 testers? Bellingcat followers? Democracy Lab community? Cold outreach?

3. **Difficulty curve:** For Tier 2 unlock, keep at 20 correct OR make harder (50 correct)?

4. **Expert pool:** Who are your 5-10 initial Tier 3 experts? Do they already exist in community, or invite externally (journalists, researchers)?

5. **Launch timing:** Which sprint? (I assumed Sprint 20-21, but could be earlier if other work paused)

6. **Scope creep:** Should Phase 2 include "user-proposed connections" or keep to system-generated tasks only?

---

**END OF ROADMAP**
