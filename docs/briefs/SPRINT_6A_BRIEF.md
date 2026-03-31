# SPRINT 6A BRIEF — Badge & Verification System
## "Güven Altyapısı" — The Trust Foundation Layer

**Project:** Project Truth (ai-os monorepo)
**App:** `apps/dashboard` (Next.js 16 + React 19 + Three.js + Supabase)
**Sprint Goal:** Transform the existing basic trust-level system into a production-grade, research-backed badge & verification ecosystem.

---

## 1. CONTEXT & EXISTING CODE

### What Already Exists
The codebase already has a basic trust/verification system:

- **`lib/auth.ts`** — 5 trust levels (0-4): Anonim Ziyaretçi → İsimli Kaynak
- **`lib/verification.ts`** — Evidence voting (verify/dispute/flag), trust upgrade requests, cross-reference detection, vote weighting by trust level
- **`components/UserBadge.tsx`** — Shows trust level icon + color + reputation score
- **`components/UserProfileModal.tsx`** — User profile with verification status
- **`components/AuthModal.tsx`** — Login/signup UI
- **`contexts/AuthContext.tsx`** — Auth state provider
- **DB tables:** `truth_users`, `user_verifications`, `evidence_votes`, `trust_upgrade_requirements`, `community_evidence`, `community_votes`
- **RLS Policies:** Read-public, write-authenticated on most tables

### What Needs to Change (Research-Backed Decisions)

Based on 16 deep-research documents covering Wikipedia, Stack Overflow, Reddit, Bellingcat, ICIJ, OCCRP, Kleros DAO, and JTI (Journalism Trust Initiative), the following architectural upgrades are needed:

---

## 2. NEW BADGE ARCHITECTURE (4 Tiers)

### Tier System

Replace the current 5-level numeric system with a **4-tier named badge system**:

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 4: KURUMSAL (Institutional)                           │
│  Color: #22c55e (Green)   Icon: 🏛️                         │
│  Auth: OAuth 2.0 (Google Workspace, Microsoft Azure AD)     │
│  Grants: Create official networks, approve verifications,   │
│          institutional theme, unlimited rate limits          │
│  Revocation: Auto-revoke when removed from org OAuth        │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: GAZETECİ (Journalist/Researcher)                   │
│  Color: #8b5cf6 (Purple)  Icon: 🔍                          │
│  Auth: JTI membership OR manual review + portfolio          │
│  Grants: Create networks, verify evidence, publish          │
│          investigations, higher vote weight (3x)            │
│  Revocation: Annual review, misconduct = immediate revoke   │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: PLATFORM KURDU (Community Contributor)             │
│  Color: #f59e0b (Amber)   Icon: 🐺                          │
│  Auth: Organic — earned through contributions               │
│  Requirements: 50+ verified contributions, 80%+ accuracy,   │
│                90+ days active, 3+ peer nominations          │
│  Grants: Edit networks, vote on evidence (2x weight),      │
│          nominate others, moderate flagged content           │
│  Revocation: Reputation drops below threshold               │
├─────────────────────────────────────────────────────────────┤
│  TIER 1: ANONİM (Anonymous)                                 │
│  Color: #6b7280 (Gray)    Icon: 👤                           │
│  Auth: None — cryptographic fingerprint only                │
│  Grants: View all public networks, ask questions, submit    │
│          evidence (requires review), basic voting (1x)      │
│  Rate limits: 1 evidence/hour, 5 votes/day                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions (from research)

1. **Slashing Economics** (from Kleros/Stack Overflow research):
   - When a user submits evidence, they "stake" reputation points
   - If evidence is verified by higher-tier users → reputation returned + bonus
   - If evidence is disputed/flagged → reputation slashed (lose 2x what you'd gain)
   - This creates economic incentive for accuracy (asymmetric risk)

2. **OAuth Auto-Revocation** (from research on institutional verification):
   - When an organization removes a user from Google Workspace/Azure AD, badge drops within minutes
   - No orphaned institutional badges
   - Organization admin manages who has Tier 4, not the platform

3. **Peer Nomination for Tier 2** (from Wikipedia/Reddit r/AskHistorians research):
   - Cannot self-nominate to Platform Kurdu
   - Need 3+ nominations from existing Tier 2+ users
   - Plus automated threshold checks (contributions, accuracy, time)
   - Prevents gaming the system

4. **Network-Scoped Badges** (architectural decision):
   - A user can be Tier 4 on "Epstein Network" but Tier 1 on "Turkey Files"
   - Badge authority is per-network, not global
   - Global reputation score exists separately

---

## 3. DATABASE SCHEMA

### New Tables

```sql
-- Badge definitions (seeded, not user-created)
CREATE TABLE badge_tiers (
  id TEXT PRIMARY KEY,  -- 'anonymous', 'community', 'journalist', 'institutional'
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  vote_weight NUMERIC DEFAULT 1,
  rate_limit_evidence_per_hour INT DEFAULT 1,
  rate_limit_votes_per_day INT DEFAULT 5,
  can_create_networks BOOLEAN DEFAULT false,
  can_verify_evidence BOOLEAN DEFAULT false,
  can_moderate BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

-- User badges (per-network scope)
CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id),  -- NULL = global badge
  badge_tier TEXT REFERENCES badge_tiers(id) DEFAULT 'anonymous',
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by TEXT,  -- fingerprint of granter (for audit)
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  oauth_provider TEXT,  -- 'google', 'microsoft', NULL
  oauth_org_id TEXT,    -- organization identifier
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_fingerprint, network_id)
);

-- Peer nominations (for Tier 2 advancement)
CREATE TABLE badge_nominations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nominee_fingerprint TEXT NOT NULL,
  nominator_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nominee_fingerprint, nominator_fingerprint, network_id)
);

-- Reputation ledger (slashing economics)
CREATE TABLE reputation_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fingerprint TEXT NOT NULL,
  network_id UUID REFERENCES networks(id),
  transaction_type TEXT NOT NULL,  -- 'evidence_submit', 'evidence_verified', 'evidence_disputed', 'nomination_received', 'moderation_action', 'daily_bonus'
  amount INT NOT NULL,  -- positive = gain, negative = slash
  reference_id UUID,    -- evidence_id, investigation_id, etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- OAuth organization registry
CREATE TABLE verified_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,  -- 'nytimes.com', 'bbc.co.uk'
  oauth_provider TEXT NOT NULL,  -- 'google', 'microsoft', 'manual'
  oauth_config JSONB,  -- provider-specific config
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Alter Existing Tables

```sql
-- Add badge reference to truth_users
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS global_badge_tier TEXT DEFAULT 'anonymous' REFERENCES badge_tiers(id);
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS total_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS verified_contributions INT DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC DEFAULT 0;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS first_active_at TIMESTAMPTZ;
ALTER TABLE truth_users ADD COLUMN IF NOT EXISTS nomination_count INT DEFAULT 0;

-- Update evidence_votes to use new weight system
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS staked_reputation INT DEFAULT 0;
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE evidence_votes ADD COLUMN IF NOT EXISTS resolution TEXT;  -- 'verified', 'disputed', 'inconclusive'
```

### RPC Functions

```sql
-- Get user's effective badge for a specific network
CREATE OR REPLACE FUNCTION get_user_badge(p_fingerprint TEXT, p_network_id UUID)
RETURNS TABLE(badge_tier TEXT, vote_weight NUMERIC, can_create_networks BOOLEAN, can_verify BOOLEAN, can_moderate BOOLEAN)
AS $$ ... $$;

-- Submit evidence with reputation staking
CREATE OR REPLACE FUNCTION submit_staked_evidence(p_fingerprint TEXT, p_evidence JSONB, p_stake INT)
RETURNS JSONB AS $$ ... $$;

-- Resolve evidence vote (verify/dispute) with slashing
CREATE OR REPLACE FUNCTION resolve_evidence(p_evidence_id UUID, p_resolution TEXT, p_resolver_fingerprint TEXT)
RETURNS JSONB AS $$ ... $$;

-- Check and auto-promote to Tier 2
CREATE OR REPLACE FUNCTION check_tier2_eligibility(p_fingerprint TEXT, p_network_id UUID)
RETURNS JSONB AS $$ ... $$;

-- Nominate user for Tier 2
CREATE OR REPLACE FUNCTION nominate_for_tier2(p_nominator TEXT, p_nominee TEXT, p_network_id UUID, p_reason TEXT)
RETURNS JSONB AS $$ ... $$;

-- Get reputation leaderboard
CREATE OR REPLACE FUNCTION get_reputation_leaderboard(p_network_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE(fingerprint TEXT, badge_tier TEXT, reputation INT, accuracy NUMERIC, contributions INT)
AS $$ ... $$;

-- Calculate reputation score (called after each transaction)
CREATE OR REPLACE FUNCTION recalculate_reputation(p_fingerprint TEXT)
RETURNS INT AS $$ ... $$;
```

### RLS Policies

```sql
-- badge_tiers: public read, no user writes
-- user_badges: public read, admin/system write
-- badge_nominations: authenticated read own, authenticated insert (with tier check)
-- reputation_transactions: public read, system-only write (via RPC)
-- verified_organizations: public read, admin write
```

---

## 4. API ROUTES

### New Routes

```
POST   /api/badge                    — Get or create user badge
GET    /api/badge?fingerprint=X      — Get user's badge info (all networks)
POST   /api/badge/nominate           — Nominate user for Tier 2
GET    /api/badge/nominations?fp=X   — Get nominations for a user
POST   /api/badge/check-promotion    — Check Tier 2 eligibility
GET    /api/badge/leaderboard?nid=X  — Reputation leaderboard

POST   /api/evidence/submit          — Submit evidence WITH reputation stake
POST   /api/evidence/resolve         — Resolve evidence (verify/dispute)
GET    /api/evidence/pending         — Get pending evidence for review

POST   /api/org/register             — Register organization for OAuth
POST   /api/org/verify-member        — OAuth callback to verify member
GET    /api/org/list                 — List verified organizations

GET    /api/reputation/history?fp=X  — Reputation transaction history
GET    /api/reputation/stats?fp=X    — Reputation summary stats
```

### Integration Points

Update existing routes:
- **`/api/chat/route.ts`** — Include user's badge tier in Groq context, weight AI response trust indicators
- **`/api/investigation/route.ts`** — Check badge permissions before create/publish
- **`/api/truth/route.ts`** — Include badge info in node verification_level responses
- **`/api/node-stats/route.ts`** — Weight stats by voter badge tier

---

## 5. UI COMPONENTS

### New Components

```
BadgeDisplay.tsx          — Visual badge with tier icon, color, tooltip
                            Shows: tier name, reputation score, accuracy %
                            Animated glow for Tier 3/4

BadgeUpgradePanel.tsx     — Shows progress toward next tier
                            Progress bars: contributions, accuracy, time, nominations
                            "What you need" checklist

NominationModal.tsx       — Nominate another user for Tier 2
                            Search by fingerprint/display name
                            Required: reason text (min 50 chars)

ReputationHistory.tsx     — Timeline of reputation gains/losses
                            Green = gain, Red = slash
                            Filterable by type

LeaderboardPanel.tsx      — Top contributors by network
                            Shows: rank, badge, reputation, accuracy
                            Tabs: This Week / All Time / By Network

EvidenceReviewQueue.tsx   — For Tier 2+ users: review pending evidence
                            Card stack UI: Verify / Dispute / Skip
                            Shows staked reputation at risk

OrgRegistrationFlow.tsx   — Multi-step org registration
                            Step 1: Enter domain
                            Step 2: DNS TXT verification OR OAuth setup
                            Step 3: Invite members
                            Step 4: Customize badge appearance
```

### Modified Components

```
UserBadge.tsx             — Replace trust_level display with new badge system
                            Use BadgeDisplay sub-component
                            Click → BadgeUpgradePanel instead of basic profile

ChatPanel.tsx             — Show badge next to user messages
                            AI acknowledges user's expertise level

Truth3DScene.tsx          — Node verification badges use new badge data
                            Higher-badge verifications = brighter glow

ArchiveModal.tsx          — Evidence tab shows staked reputation
                            Verify/Dispute buttons check user badge permissions
```

### Store Updates

```typescript
// New: badgeStore.ts
interface BadgeState {
  userBadge: UserBadge | null;
  networkBadges: Map<string, UserBadge>;
  reputationHistory: ReputationTransaction[];
  leaderboard: LeaderboardEntry[];
  pendingNominations: Nomination[];

  fetchUserBadge: (fingerprint: string) => Promise<void>;
  fetchNetworkBadge: (fingerprint: string, networkId: string) => Promise<void>;
  submitEvidence: (evidence: Evidence, stake: number) => Promise<void>;
  resolveEvidence: (evidenceId: string, resolution: string) => Promise<void>;
  nominateUser: (nominee: string, networkId: string, reason: string) => Promise<void>;
  checkPromotion: (networkId: string) => Promise<PromotionCheck>;
  fetchLeaderboard: (networkId: string) => Promise<void>;
}
```

---

## 6. REPUTATION ECONOMICS

### Point Values

| Action | Points | Condition |
|--------|--------|-----------|
| Submit evidence | -5 (staked) | Pending until resolved |
| Evidence verified | +15 | Resolved as verified |
| Evidence disputed | -10 | Resolved as disputed (lose stake + penalty) |
| Vote on evidence (correct) | +2 | Your vote aligned with resolution |
| Vote on evidence (wrong) | -1 | Your vote opposed resolution |
| Receive peer nomination | +10 | From Tier 2+ user |
| First discovery bonus | +20 | First to query an unqueried node |
| Investigation published | +25 | Published and not disputed in 7 days |
| Daily active bonus | +1 | At least 1 meaningful action per day |
| Moderation action | +5 | Flagged content confirmed by higher tier |

### Tier 2 Auto-Promotion Thresholds

| Requirement | Value |
|-------------|-------|
| Minimum reputation | 200 |
| Verified contributions | 50+ |
| Accuracy rate | 80%+ |
| Days active | 90+ |
| Peer nominations | 3+ (from Tier 2+) |

### Slashing Rules (Asymmetric Risk)

- Submitting **disputed evidence**: Lose 2x the potential gain (-10 instead of +15)
- Submitting **false flag**: Lose 3x (-15) + 24-hour cooldown
- **Repeat offenders** (3+ slashes in 30 days): Automatic demotion to Tier 1

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Database + Core Logic (2-3 days)
1. Create SQL migration with all new tables + RPCs
2. Seed badge_tiers with 4 tiers
3. Migrate existing trust_level data to new badge system
4. Implement `badgeStore.ts`
5. Create `/api/badge` routes

### Phase 2: Evidence Staking (2-3 days)
1. Update evidence submission flow with staking
2. Create resolution workflow (verify/dispute)
3. Implement reputation transaction ledger
4. Create `/api/evidence/submit` and `/api/evidence/resolve`
5. Update `/api/reputation` routes

### Phase 3: UI Components (3-4 days)
1. `BadgeDisplay.tsx` — visual badge component
2. `BadgeUpgradePanel.tsx` — progress tracker
3. `ReputationHistory.tsx` — transaction timeline
4. `LeaderboardPanel.tsx` — top contributors
5. `EvidenceReviewQueue.tsx` — review pending evidence
6. Update `UserBadge.tsx` to use new system
7. Update `ChatPanel.tsx` badge display
8. Update `Truth3DScene.tsx` badge glow

### Phase 4: Nomination System (1-2 days)
1. `NominationModal.tsx`
2. Nomination API + auto-promotion check
3. Notification when nominated / promoted

### Phase 5: OAuth (Future — Sprint 6A.5)
1. `OrgRegistrationFlow.tsx`
2. Google Workspace OAuth integration
3. DNS TXT verification fallback
4. Auto-revocation webhook

---

## 8. TECH STACK DECISIONS

| Decision | Choice | Reason |
|----------|--------|--------|
| Badge storage | Supabase PostgreSQL | Already in use, RLS support |
| State management | Zustand (new badgeStore) | Consistent with existing stores |
| Reputation calc | Server-side RPC | Prevent client manipulation |
| Vote weight | Badge-tier based | Research showed trust hierarchy works |
| Rate limiting | Per-badge-tier | Anonymous = restricted, Institutional = unlimited |
| Slashing | Asymmetric (-2x/-3x) | Research: economic pain drives accuracy |
| OAuth | Google Workspace first | Most common for news orgs |
| Badge UI | Animated SVG + Framer Motion | Consistent with existing animations |

---

## 9. SUCCESS CRITERIA

- [ ] 4-tier badge system visible on all user interactions
- [ ] Evidence submission requires reputation staking
- [ ] Verified evidence returns reputation + bonus
- [ ] Disputed evidence slashes reputation (2x penalty)
- [ ] Peer nomination system works for Tier 2 promotion
- [ ] Leaderboard shows top contributors per network
- [ ] ChatPanel shows user badge next to messages
- [ ] 3D node verification glow reflects badge tier
- [ ] Rate limiting enforced by badge tier
- [ ] Existing trust_level data migrated to new system

---

## 10. FILES TO MODIFY

### Must Modify
- `lib/auth.ts` — Replace trust levels with badge tiers
- `lib/verification.ts` — Add staking + slashing logic
- `components/UserBadge.tsx` — New badge display
- `store/truthStore.ts` — Add badge data to network fetch
- `app/api/chat/route.ts` — Include badge in AI context
- `app/api/investigation/route.ts` — Badge permission checks

### Must Create
- `store/badgeStore.ts` — New Zustand store
- `app/api/badge/route.ts` — Badge CRUD
- `app/api/badge/nominate/route.ts` — Nominations
- `app/api/evidence/submit/route.ts` — Staked evidence
- `app/api/evidence/resolve/route.ts` — Resolution
- `app/api/reputation/route.ts` — Reputation queries
- `components/BadgeDisplay.tsx` — Visual badge
- `components/BadgeUpgradePanel.tsx` — Progress tracker
- `components/NominationModal.tsx` — Nominate UI
- `components/ReputationHistory.tsx` — Transaction log
- `components/LeaderboardPanel.tsx` — Leaderboard
- `components/EvidenceReviewQueue.tsx` — Review queue
- `docs/SPRINT_6A_MIGRATION.sql` — All SQL

---

**Document Version:** 1.0
**Date:** March 6, 2026
**Author:** Claude (Opus) + Raşit Altunç
**Research Base:** 16 deep-research documents covering identity systems, verification, reputation economics, and platform governance
