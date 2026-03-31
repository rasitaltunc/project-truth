# GAMIFIED VERIFICATION - QUICK START GUIDE
## What to Implement First (Priority Order)

**Date:** March 22, 2026
**For:** Raşit & Engineering Team
**Scope:** 12-week implementation roadmap
**Output:** Ready-to-code specifications

---

## THE 3 CORE PROBLEMS YOU'RE SOLVING

1. **Engagement:** Getting 1000+ daily active reviewers (not 200)
2. **Quality:** Maintaining 92% accuracy (not 78%)
3. **Sybil Resistance:** Preventing gaming of the verification system

Your existing infrastructure handles #3 well (tier system, guarantors, RLS).
This guide focuses on #1 & #2.

---

## IMPLEMENTATION PHASES

### PHASE 1: CORE REPUTATION (WEEK 1-2)

**What:** Point-based reputation system

**Database:**
```sql
ALTER TABLE truth_users
ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS accuracy_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

CREATE TABLE reputation_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'verify', 'dispute', 'document_upload', etc
  amount INT NOT NULL, -- positive or negative
  reference_id UUID, -- evidence_id or investigation_id
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reputation_user ON reputation_transactions(user_fingerprint);
CREATE INDEX idx_reputation_type ON reputation_transactions(transaction_type);
```

**API Routes:**
```
POST /api/reputation/award
  Body: { fingerprint, type, amount, reason, reference_id }
  Returns: { new_score, milestone_hit?, tier_eligible? }

GET /api/reputation/stats
  Query: { fingerprint }
  Returns: { score, tier, next_tier_at, accuracy, contributions }

GET /api/reputation/history
  Query: { fingerprint, limit=50 }
  Returns: { transactions: [...] }
```

**Code Changes (reputation.ts):**
```typescript
// NEW: Award reputation
export async function awardReputation(
  fingerprint: string,
  type: 'verify' | 'dispute' | 'upload_doc' | 'scan_doc' | 'investigate' | 'cross_ref',
  amount: number,
  reason: string,
  referenceId?: string
) {
  // 1. Insert transaction
  // 2. Update user reputation_score
  // 3. Check tier eligibility
  // 4. Trigger notifications
}

// ENHANCEMENT: Calculate tier progression
export function getTierThreshold(tier: number): number {
  return [0, 200, 1000][tier]; // Tier 0, 1, 2
}

// NEW: Get accuracy rate
export async function updateAccuracyRate(fingerprint: string) {
  const { data: verifications } = await supabase
    .from('evidence_archive')
    .select('verification_status, verified_by')
    .ilike('verified_by', `%${fingerprint}%`);

  const correct = verifications.filter(v => v.verification_status === 'verified').length;
  const accuracy = correct / verifications.length;

  await supabase
    .from('truth_users')
    .update({ accuracy_rate: accuracy })
    .eq('fingerprint', fingerprint);
}
```

**Points to Award (Use These Values):**
```
VERIFICATION ACTIONS:
  verify_simple:       +3    (basic entity verification)
  verify_with_link:    +8    (provided evidence link)
  verify_detailed:     +15   (full written reasoning)

EVIDENCE:
  upload_document:     +2    (each upload)
  scan_document:       +10   (AI entity extraction)

DISPUTES:
  dispute_entity:      -5    (attempting to dispute)
  correct_dispute:     +5    (your dispute was right)

INVESTIGATIONS:
  publish_investigation: +5  (one-time)
  investigation_10_supporters: +10 (milestone)

STREAKS:
  daily_login:         +1    (max +7/week)
  5day_streak:         +5    (completed week)

MILESTONE:
  reach_tier2:         +50   (one-time bonus)
  reach_tier3:         +100  (one-time bonus)
```

**UI: ReputationBadge Component**
```tsx
// Show in header
export function ReputationBadge({ fingerprint }) {
  const { reputation, tier, nextTierAt } = useReputation(fingerprint);

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm font-bold">{reputation} pts</div>
      <div className="text-xs">{getTierName(tier)}</div>
      <ProgressBar value={reputation} max={nextTierAt} />
    </div>
  );
}
```

---

### PHASE 2: BADGES & LEADERBOARDS (WEEK 3-4)

**Database:**
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint VARCHAR(50) NOT NULL,
  badge_id VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_fingerprint, badge_id)
);

CREATE TABLE leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INT,
  user_fingerprint VARCHAR(50),
  reputation INT,
  accuracy DECIMAL(5,2),
  verifications INT,
  week_starting DATE,
  UNIQUE(user_fingerprint, week_starting)
);

-- Populate weekly leaderboard with CRON job (every Monday)
-- SELECT * FROM truth_users ORDER BY reputation_score DESC LIMIT 100
-- → INSERT INTO leaderboard_weekly
```

**Badge Definitions:**
```typescript
export const BADGES = {
  // Contribution badges (6 total)
  first_verification: {
    id: 'first_verification',
    name: 'First Step',
    icon: '🌱',
    color: '#22c55e',
    rarity: 'common',
    requirement: (user) => user.contributions_count >= 1
  },
  ten_verifications: {
    id: 'ten_verifications',
    name: 'Verifier',
    icon: '✓',
    color: '#3b82f6',
    rarity: 'common',
    requirement: (user) => user.contributions_count >= 10
  },
  fifty_verifications: {
    id: 'fifty_verifications',
    name: 'Expert Verifier',
    icon: '⭐',
    color: '#f59e0b',
    rarity: 'uncommon',
    requirement: (user) => user.contributions_count >= 50
  },

  // Accuracy badges (3 total)
  perfect_week: {
    id: 'perfect_week',
    name: 'Perfect Week',
    icon: '💯',
    color: '#ec4899',
    rarity: 'uncommon',
    requirement: (user) => user.weekly_accuracy >= 1.0
  },
  expert_accuracy: {
    id: 'expert_accuracy',
    name: 'Accuracy Expert',
    icon: '🎯',
    color: '#8b5cf6',
    rarity: 'rare',
    requirement: (user) => user.accuracy_rate >= 0.95
  },

  // Streak badges (3 total)
  five_day_streak: {
    id: 'five_day_streak',
    name: 'Streak Builder',
    icon: '🔥',
    color: '#ef4444',
    rarity: 'uncommon',
    requirement: (user) => user.current_streak >= 5
  },
  thirty_day_streak: {
    id: 'thirty_day_streak',
    name: 'Legendary',
    icon: '👑',
    color: '#fbbf24',
    rarity: 'legendary',
    requirement: (user) => user.current_streak >= 30
  },

  // Tier badges (3 total)
  tier_2_achieved: {
    id: 'tier_2_achieved',
    name: 'Community Trusted',
    icon: '🛡️',
    color: '#06b6d4',
    rarity: 'rare',
    requirement: (user) => user.tier >= 2
  },
  tier_3_achieved: {
    id: 'tier_3_achieved',
    name: 'Expert Authority',
    icon: '👑',
    color: '#22c55e',
    rarity: 'epic',
    requirement: (user) => user.tier >= 3
  },

  // Special badges (3 total)
  story_finder: {
    id: 'story_finder',
    name: 'Story Finder',
    icon: '📖',
    color: '#6366f1',
    rarity: 'rare',
    requirement: (user) => user.cross_references >= 10
  },
  investigation_published: {
    id: 'investigation_published',
    name: 'Published Investigator',
    icon: '🔍',
    color: '#7c3aed',
    rarity: 'epic',
    requirement: (user) => user.investigations_published >= 1
  },
};

// Check & award badges
export async function checkAndAwardBadges(fingerprint: string) {
  const user = await getUserStats(fingerprint);

  for (const [badgeId, badgeDef] of Object.entries(BADGES)) {
    if (badgeDef.requirement(user)) {
      await awardBadge(fingerprint, badgeId);
    }
  }
}
```

**Leaderboard API:**
```
GET /api/leaderboard/weekly
  Returns: { entries: [{ rank, user, reputation, accuracy, badges }] }

GET /api/leaderboard/alltime
  Returns: { entries: [...], your_rank, your_stats }
```

**UI: LeaderboardPanel**
```tsx
export function LeaderboardPanel() {
  const { entries, loading } = useLeaderboard('weekly');

  return (
    <div className="space-y-2">
      <Tabs defaultValue="weekly">
        <Tab value="weekly">This Week</Tab>
        <Tab value="alltime">All Time</Tab>
      </Tabs>

      {entries.map((entry, i) => (
        <LeaderboardRow
          rank={i + 1}
          user={entry}
          isCurrentUser={entry.fingerprint === getCurrentUser()}
          badges={entry.badges.slice(0, 3)}
        />
      ))}
    </div>
  );
}
```

---

### PHASE 3: TASK SYSTEM & QUEUES (WEEK 5-6)

**Database:**
```sql
CREATE TABLE verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID,
  entity_id UUID NOT NULL,
  task_type VARCHAR(50) NOT NULL, -- 'existence', 'fact', 'relationship', 'cross_ref'
  difficulty INT NOT NULL (1-5),
  assigned_to_fingerprint VARCHAR(50),
  completed_at TIMESTAMPTZ,
  reviewer_answer TEXT,
  is_correct BOOLEAN,
  is_honeypot BOOLEAN DEFAULT FALSE,
  honeypot_correct_answer TEXT,
  points_awarded INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON verification_tasks(assigned_to_fingerprint, completed_at);
CREATE INDEX idx_tasks_honeypot ON verification_tasks(is_honeypot);
```

**Task Types:**
```typescript
export enum TaskType {
  EXISTENCE = 'existence',      // Does this person/entity exist?
  FACT = 'fact',                // Does this fact match the document?
  CROSS_REFERENCE = 'cross_ref', // Find this entity in other documents
  RELATIONSHIP = 'relationship',  // What's the relationship between 2 entities?
  HALLUCINATION = 'hallucination' // Is this real or AI-generated? (honeypot)
}

export interface VerificationTask {
  id: string;
  type: TaskType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  entityId: string;
  isHoneypot: boolean;
  timeLimit: number; // seconds
  context: {
    document?: string; // Excerpt showing entity
    relatedEntity?: string; // For relationships
    claimText?: string; // For fact verification
  };
}

// Task router based on user expertise
export function getTasksForUser(fingerprint: string, expertise: 'journalist' | 'researcher' | 'lawyer' | 'general') {
  const userTier = getUserTier(fingerprint);
  const userAccuracy = getUserAccuracy(fingerprint);

  let taskWeights: Partial<Record<TaskType, number>> = {};

  switch (expertise) {
    case 'journalist':
      taskWeights = { relationship: 0.4, cross_ref: 0.3, fact: 0.2, existence: 0.1 };
      break;
    case 'researcher':
      taskWeights = { cross_ref: 0.4, fact: 0.3, relationship: 0.2, existence: 0.1 };
      break;
    case 'lawyer':
      taskWeights = { fact: 0.4, existence: 0.3, cross_ref: 0.2, relationship: 0.1 };
      break;
    default:
      taskWeights = { existence: 0.5, fact: 0.3, cross_ref: 0.2 };
  }

  return generateTaskQueue(userTier, userAccuracy, taskWeights);
}
```

**Task Queue Generation:**
```typescript
async function generateTaskQueue(
  fingerprint: string,
  limit: number = 10
): Promise<VerificationTask[]> {
  const user = await getUserStats(fingerprint);
  const tier = user.tier;
  const accuracy = user.accuracy_rate;

  // Difficulty ramping logic
  const baseDifficulty = Math.min(5, Math.max(1, Math.round(accuracy * 5)));
  const adjustedDifficulty = accuracy > 0.8 ? baseDifficulty + 1 : baseDifficulty;

  // 15% honeypots
  const honeypotCount = Math.floor(limit * 0.15);
  const regularCount = limit - honeypotCount;

  const queue: VerificationTask[] = [];

  // Add honeypots
  for (let i = 0; i < honeypotCount; i++) {
    const honeypot = await getRandomHoneypot();
    queue.push({
      ...honeypot,
      isHoneypot: true
    });
  }

  // Add regular tasks
  for (let i = 0; i < regularCount; i++) {
    const task = await getUnverifiedEntity();
    queue.push({
      ...task,
      difficulty: adjustedDifficulty,
      isHoneypot: false
    });
  }

  return shuffleArray(queue);
}
```

**Mobile Task UI:**
```tsx
export function VerificationTaskScreen({ task }: { task: VerificationTask }) {
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(task.timeLimit);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(response: string) {
    const result = await submitVerification(task.id, response);

    if (result.correct) {
      showToast(`✓ +${result.pointsAwarded} points!`, 'success');
    } else {
      showToast(`✗ -2 points. Answer: ${result.correctAnswer}`, 'error');
    }

    // Load next task
    loadNextTask();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between">
        <div>Task {getTaskNumber()} of 5</div>
        <div className={`font-bold ${timeLeft < 10 ? 'text-red-600' : ''}`}>
          ⏱ {timeLeft}s
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">{task.context.entityName}</h2>
        {task.context.document && (
          <p className="text-sm text-gray-600 mt-2">"{task.context.document}"</p>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
        <p className="text-sm">{getTaskPrompt(task.type)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {getAnswerOptions(task.type).map(option => (
          <button
            key={option}
            onClick={() => handleSubmit(option)}
            className="p-3 border rounded font-bold"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        Your accuracy: {getAccuracy()}% (Good!)
      </div>
    </div>
  );
}
```

---

### PHASE 4: QUALITY CONTROL (WEEK 7-8)

**Honeypot System:**
```typescript
export async function initializeHoneypots() {
  const HONEYPOTS = [
    {
      entity: 'Ghislaine Maxwell',
      correct: 'YES',
      difficulty: 1,
      reason: 'Person appears in 500+ court documents'
    },
    {
      entity: 'Vladimir Melnikov (Russian oligarch)',
      correct: 'NO',
      difficulty: 5,
      reason: 'AI-generated entity (no sources found)'
    },
    {
      entity: 'Jeffrey Epstein',
      correct: 'YES',
      difficulty: 1,
      reason: 'Historic criminal, verified in all sources'
    },
    // ... 12 more
  ];

  for (const hp of HONEYPOTS) {
    await supabase.from('verification_tasks').insert({
      is_honeypot: true,
      honeypot_correct_answer: hp.correct,
      entity_name: hp.entity,
      difficulty: hp.difficulty,
      honeypot_reason: hp.reason
    });
  }
}

// Monitor honeypot accuracy
export async function analyzeHoneypotPerformance(fingerprint: string) {
  const honeypots = await supabase
    .from('verification_tasks')
    .select('*')
    .eq('is_honeypot', true)
    .eq('assigned_to_fingerprint', fingerprint);

  const correct = honeypots.filter(h => h.is_correct).length;
  const accuracy = correct / honeypots.length;

  if (accuracy < 0.80) {
    // Auto-trigger retraining
    await suggestRetraining(fingerprint, 'Your honeypot accuracy is lower than expected');

    // Reduce daily cap
    await updateUserCapDaily(fingerprint, 10); // Down from 50
  } else if (accuracy > 0.95) {
    // Boost daily cap
    await updateUserCapDaily(fingerprint, 100);
  }
}
```

**Quality Metrics:**
```typescript
export async function calculateFleisskappa(entityId: string) {
  // Get all verifications for this entity
  const verifications = await supabase
    .from('entity_verifications')
    .select('reviewer_answer, is_correct')
    .eq('entity_id', entityId);

  // Calculate Kappa
  const observed = verifications.filter(v => v.is_correct).length / verifications.length;
  const expected = 0.5; // Assuming 50% base agreement by chance
  const kappa = (observed - expected) / (1 - expected);

  if (kappa < 0.50) {
    // Flag for expert review
    await flagForArbitra(entityId, `Low agreement (k=${kappa})`);
  }

  return kappa;
}
```

**Anomaly Detection:**
```typescript
export async function detectGamersAndBots() {
  // Pattern 1: Impossibly fast reviews
  const fastReviewers = await supabase
    .from('verification_tasks')
    .select('assigned_to_fingerprint, AVG(time_taken)')
    .groupBy('assigned_to_fingerprint')
    .having('AVG(time_taken) < 5'); // < 5 seconds = suspicious

  // Pattern 2: 100% accuracy (literally impossible)
  const perfectScores = await supabase
    .from('truth_users')
    .select('fingerprint')
    .eq('accuracy_rate', 1.0)
    .gt('contributions_count', 50); // Real humans make mistakes

  // Pattern 3: Temporal clustering
  const coordinatedVotes = await detectTemporalClustering();

  for (const suspicious of [...fastReviewers, ...perfectScores, ...coordinatedVotes]) {
    await flagForReview(suspicious);
  }
}
```

---

### PHASE 5-9: TESTING, ITERATION, LAUNCH

**Week 9:** Integration testing (reputation → tasks → badges → leaderboard)
**Week 10:** Closed beta (100 trusted users)
**Week 11:** Feedback iteration (fix bugs, adjust point values based on user behavior)
**Week 12:** Public launch

---

## EXPECTED RESULTS (BY WEEK 12)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Daily active reviewers | 200 | 1000+ | 5x |
| Verifications/day | 500 | 5000+ | 10x |
| Accuracy | 78% | 92% | +14% |
| Tier 2 adoption | 15% | 30% | 2x |
| User retention (week 4) | 40% | 75% | +87% |

---

## WHAT TO BUILD FIRST (THIS WEEK)

Pick ONE of these:

### Option A: Do it quick & dirty (2 days)
- Add `reputation_score` column to `truth_users`
- Create simple `/api/reputation/award` endpoint
- Show badge in header (static design)
- Test with 10 users

**Then launch with game mechanics enabled.**

### Option B: Do it right (1 week)
- Implement full reputation system (database, transactions, API)
- Add badges + leaderboard
- Mobile task UI
- Launch with soft beta (100 users)

---

## KEY NUMBERS TO REMEMBER

**Points:**
- Verify simple: **+3**
- Verify detailed: **+15**
- Dispute wrong: **-5**
- Reach Tier 2: **+50 bonus**

**Tiers:**
- Tier 1: **0-199** pts
- Tier 2: **200-999** pts
- Tier 3: **1000+** pts

**Honeypots:**
- **15%** of tasks
- Accuracy threshold: **80%**
- Auto-pause if below

**Leaderboard:**
- Weekly top **50**
- All-time top **100**
- Refresh **Sunday 00:00 UTC**

---

## QUESTIONS TO ANSWER WITH RAŞIT

1. **Point scaling:** Do +3/+8/+15 feel right? Test with small user group first?
2. **Honeypot strategy:** Where to get 20 known-answer entities?
3. **Tier requirements:** Keep 3-guarantor rule? Add other requirements?
4. **Launch timing:** Soft beta first (100 users) or big bang?
5. **Leaderboard privacy:** Show real names or pseudonyms only?

---

**This document is ready for engineering implementation.**
**Est. effort: 80 hours (2 weeks with 1 engineer, 1 week with 2 engineers)**

