// ============================================
// PROJECT TRUTH: BADGE STORE
// Sprint 6A — "Güven Altyapısı"
// Badge & Verification Trust Layer
// LOCAL-FIRST: Supabase olmadan da çalışır
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type BadgeTierId = 'anonymous' | 'community' | 'journalist' | 'institutional';

export interface BadgeTier {
  id: BadgeTierId;
  name_tr: string;
  name_en: string;
  description_tr?: string;
  color: string;
  icon: string;
  vote_weight: number;
  rate_limit_evidence_per_hour: number;
  rate_limit_votes_per_day: number;
  can_create_networks: boolean;
  can_verify_evidence: boolean;
  can_moderate: boolean;
  can_nominate: boolean;
  sort_order: number;
  min_reputation_for_tier: number;
}

export interface UserBadge {
  id?: string;
  user_fingerprint: string;
  network_id: string | null; // null = global
  badge_tier: BadgeTierId;
  granted_at: string;
  granted_by?: string;
  revoked_at?: string;
  is_active: boolean;
  oauth_provider?: string;
  oauth_org_id?: string;
  metadata?: Record<string, any>;
}

export interface ReputationTransaction {
  id?: string;
  user_fingerprint: string;
  network_id?: string;
  transaction_type:
    | 'evidence_submit_stake'
    | 'evidence_verified'
    | 'evidence_disputed'
    | 'evidence_inconclusive_return'
    | 'nomination_received'
    | 'moderation_confirmed'
    | 'daily_bonus'
    | 'first_discovery'
    | 'investigation_published'
    | 'vote_correct'
    | 'vote_wrong'
    | 'slash_false_flag'
    | 'admin_adjustment';
  amount: number; // positive = gain, negative = slash
  reference_id?: string;
  description: string;
  created_at: string;
}

export interface BadgeNomination {
  id?: string;
  nominee_fingerprint: string;
  nominator_fingerprint: string;
  network_id?: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export interface LeaderboardEntry {
  fingerprint: string;
  badge_tier: BadgeTierId;
  reputation: number;
  accuracy: number;
  contributions: number;
  rank?: number;
}

export interface PromotionCheck {
  eligible: boolean;
  currentTier: BadgeTierId;
  nextTier: BadgeTierId | null;
  requirements: {
    reputation: { current: number; required: number; met: boolean };
    contributions: { current: number; required: number; met: boolean };
    accuracy: { current: number; required: number; met: boolean };
    daysActive: { current: number; required: number; met: boolean };
    nominations: { current: number; required: number; met: boolean };
  };
}

export interface UserReputation {
  fingerprint: string;
  score: number;
  total_contributions: number;
  verified_contributions: number;
  accuracy_rate: number;
  nomination_count: number;
  days_active: number;
}

// ============================================
// BADGE TIER DEFINITIONS (local fallback)
// ============================================
export const BADGE_TIERS: BadgeTier[] = [
  {
    id: 'anonymous',
    name_tr: 'Anonim',
    name_en: 'Anonymous',
    description_tr: 'Ağı incele, soru sor, temel oy kullan',
    color: '#6b7280',
    icon: '👤',
    vote_weight: 1,
    rate_limit_evidence_per_hour: 1,
    rate_limit_votes_per_day: 5,
    can_create_networks: false,
    can_verify_evidence: false,
    can_moderate: false,
    can_nominate: false,
    sort_order: 1,
    min_reputation_for_tier: 0,
  },
  {
    id: 'community',
    name_tr: 'Platform Kurdu',
    name_en: 'Community Contributor',
    description_tr: 'Katkılarıyla güven kazanmış topluluk üyesi',
    color: '#f59e0b',
    icon: '🐺',
    vote_weight: 2,
    rate_limit_evidence_per_hour: 5,
    rate_limit_votes_per_day: 20,
    can_create_networks: false,
    can_verify_evidence: true,
    can_moderate: true,
    can_nominate: true,
    sort_order: 2,
    min_reputation_for_tier: 200,
  },
  {
    id: 'journalist',
    name_tr: 'Gazeteci',
    name_en: 'Journalist/Researcher',
    description_tr: 'Doğrulanmış gazeteci veya araştırmacı',
    color: '#8b5cf6',
    icon: '🔍',
    vote_weight: 3,
    rate_limit_evidence_per_hour: 999,
    rate_limit_votes_per_day: 999,
    can_create_networks: true,
    can_verify_evidence: true,
    can_moderate: true,
    can_nominate: true,
    sort_order: 3,
    min_reputation_for_tier: 0,
  },
  {
    id: 'institutional',
    name_tr: 'Kurumsal',
    name_en: 'Institutional',
    description_tr: 'Doğrulanmış kurum temsilcisi',
    color: '#22c55e',
    icon: '🏛️',
    vote_weight: 5,
    rate_limit_evidence_per_hour: 999,
    rate_limit_votes_per_day: 999,
    can_create_networks: true,
    can_verify_evidence: true,
    can_moderate: true,
    can_nominate: true,
    sort_order: 4,
    min_reputation_for_tier: 0,
  },
];

export function getBadgeTier(tierId: BadgeTierId): BadgeTier {
  return BADGE_TIERS.find((t) => t.id === tierId) ?? BADGE_TIERS[0];
}

// ============================================
// REPUTATION POINT VALUES
// ============================================
export const REPUTATION_POINTS: Record<string, number> = {
  evidence_submit_stake: -5,      // staked on submission (pending)
  evidence_verified: 15,          // stake returned + bonus
  evidence_disputed: -10,         // stake lost + penalty
  evidence_inconclusive_return: 5, // stake returned, no bonus
  nomination_received: 10,
  moderation_confirmed: 5,
  daily_bonus: 1,
  first_discovery: 20,
  investigation_published: 25,
  vote_correct: 2,
  vote_wrong: -1,
};

// ============================================
// STORE STATE
// ============================================
interface BadgeState {
  // Current user's badge info
  userFingerprint: string | null;
  globalBadge: UserBadge | null;
  networkBadges: Record<string, UserBadge>; // keyed by networkId
  reputation: UserReputation | null;

  // Reputation history
  reputationHistory: ReputationTransaction[];

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  leaderboardNetworkId: string | null;

  // Nominations
  pendingNominations: BadgeNomination[]; // nominations for current user
  sentNominations: BadgeNomination[];    // nominations sent by current user

  // All tier definitions
  tiers: BadgeTier[];

  // Loading states
  isLoadingBadge: boolean;
  isLoadingLeaderboard: boolean;
  isLoadingNominations: boolean;

  // Error
  lastError: string | null;

  // ============================================
  // ACTIONS
  // ============================================

  // Initialize fingerprint
  initFingerprint: () => string;

  // Fetch badge data
  fetchUserBadge: (fingerprint?: string) => Promise<void>;
  fetchNetworkBadge: (networkId: string, fingerprint?: string) => Promise<void>;
  fetchReputation: (fingerprint?: string) => Promise<void>;
  fetchReputationHistory: (fingerprint?: string, limit?: number) => Promise<void>;
  fetchLeaderboard: (networkId?: string) => Promise<void>;
  fetchNominations: (fingerprint?: string) => Promise<void>;

  // Badge actions
  nominateUser: (nomineeFingerprint: string, networkId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  checkPromotion: (networkId?: string) => Promise<PromotionCheck | null>;
  requestJournalistBadge: (portfolioUrl: string, reason: string) => Promise<{ success: boolean; message: string }>;

  // Computed helpers
  getEffectiveBadge: (networkId?: string) => UserBadge | null;
  getEffectiveTier: (networkId?: string) => BadgeTier;
  canDoAction: (action: 'create_network' | 'verify_evidence' | 'moderate' | 'nominate', networkId?: string) => boolean;
  getVoteWeight: (networkId?: string) => number;

  // Local optimistic updates
  addLocalReputationTransaction: (tx: Omit<ReputationTransaction, 'id' | 'created_at'>) => void;
}

// ============================================
// FINGERPRINT GENERATOR
// ============================================
function generateFingerprint(): string {
  const nav = typeof window !== 'undefined' ? window.navigator : null;
  const screen = typeof window !== 'undefined' ? window.screen : null;
  const raw = [
    nav?.userAgent || '',
    nav?.language || '',
    screen?.width || 0,
    screen?.height || 0,
    screen?.colorDepth || 0,
    new Date().getTimezoneOffset(),
    Math.random().toString(36).slice(2),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// ============================================
// DEFAULT ANONYMOUS BADGE
// ============================================
function createDefaultBadge(fingerprint: string, networkId: string | null = null): UserBadge {
  return {
    user_fingerprint: fingerprint,
    network_id: networkId,
    badge_tier: 'anonymous',
    granted_at: new Date().toISOString(),
    is_active: true,
  };
}

// ============================================
// STORE IMPLEMENTATION
// ============================================
export const useBadgeStore = create<BadgeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        userFingerprint: null,
        globalBadge: null,
        networkBadges: {},
        reputation: null,
        reputationHistory: [],
        leaderboard: [],
        leaderboardNetworkId: null,
        pendingNominations: [],
        sentNominations: [],
        tiers: BADGE_TIERS,
        isLoadingBadge: false,
        isLoadingLeaderboard: false,
        isLoadingNominations: false,
        lastError: null,

        // ==========================================
        // INIT FINGERPRINT
        // ==========================================
        initFingerprint: () => {
          const existing = get().userFingerprint;
          if (existing) return existing;
          const fp = generateFingerprint();
          set({ userFingerprint: fp });
          return fp;
        },

        // ==========================================
        // FETCH USER BADGE (global)
        // ==========================================
        fetchUserBadge: async (fingerprint?: string) => {
          const fp = fingerprint || get().userFingerprint || get().initFingerprint();
          set({ isLoadingBadge: true, lastError: null });

          try {
            const res = await fetch('/api/badge', {
              headers: { 'X-User-Fingerprint': fp },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            set({
              globalBadge: data.globalBadge ?? createDefaultBadge(fp),
              reputation: data.reputation ?? null,
              isLoadingBadge: false,
            });
          } catch (err) {
            console.warn('[BadgeStore] fetchUserBadge failed, using default:', err);
            const fp2 = fp;
            set({
              globalBadge: createDefaultBadge(fp2),
              isLoadingBadge: false,
              lastError: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        },

        // ==========================================
        // FETCH NETWORK BADGE
        // ==========================================
        fetchNetworkBadge: async (networkId: string, fingerprint?: string) => {
          const fp = fingerprint || get().userFingerprint || get().initFingerprint();
          set({ isLoadingBadge: true, lastError: null });

          try {
            const res = await fetch(
              `/api/badge?networkId=${encodeURIComponent(networkId)}`,
              { headers: { 'X-User-Fingerprint': fp } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const networkBadge = data.networkBadge ?? createDefaultBadge(fp, networkId);
            set((state) => ({
              networkBadges: { ...state.networkBadges, [networkId]: networkBadge },
              globalBadge: data.globalBadge ?? state.globalBadge,
              reputation: data.reputation ?? state.reputation,
              isLoadingBadge: false,
            }));
          } catch (err) {
            console.warn('[BadgeStore] fetchNetworkBadge failed:', err);
            set((state) => ({
              networkBadges: {
                ...state.networkBadges,
                [networkId]: createDefaultBadge(fp, networkId),
              },
              isLoadingBadge: false,
              lastError: err instanceof Error ? err.message : 'Unknown error',
            }));
          }
        },

        // ==========================================
        // FETCH REPUTATION STATS
        // ==========================================
        fetchReputation: async (fingerprint?: string) => {
          const fp = fingerprint || get().userFingerprint || get().initFingerprint();

          try {
            const res = await fetch('/api/reputation/stats', {
              headers: { 'X-User-Fingerprint': fp },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            set({ reputation: data.stats });
          } catch (err) {
            console.warn('[BadgeStore] fetchReputation failed:', err);
          }
        },

        // ==========================================
        // FETCH REPUTATION HISTORY
        // ==========================================
        fetchReputationHistory: async (fingerprint?: string, limit = 50) => {
          const fp = fingerprint || get().userFingerprint || get().initFingerprint();

          try {
            const res = await fetch(
              `/api/reputation/history?limit=${limit}`,
              { headers: { 'X-User-Fingerprint': fp } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            set({ reputationHistory: data.transactions ?? [] });
          } catch (err) {
            console.warn('[BadgeStore] fetchReputationHistory failed:', err);
          }
        },

        // ==========================================
        // FETCH LEADERBOARD
        // ==========================================
        fetchLeaderboard: async (networkId?: string) => {
          set({ isLoadingLeaderboard: true });

          try {
            const url = networkId
              ? `/api/badge/leaderboard?nid=${encodeURIComponent(networkId)}`
              : '/api/badge/leaderboard';
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            set({
              leaderboard: (data.leaderboard ?? []).map(
                (entry: LeaderboardEntry, i: number) => ({ ...entry, rank: i + 1 })
              ),
              leaderboardNetworkId: networkId ?? null,
              isLoadingLeaderboard: false,
            });
          } catch (err) {
            console.warn('[BadgeStore] fetchLeaderboard failed:', err);
            set({ isLoadingLeaderboard: false });
          }
        },

        // ==========================================
        // FETCH NOMINATIONS
        // ==========================================
        fetchNominations: async (fingerprint?: string) => {
          const fp = fingerprint || get().userFingerprint || get().initFingerprint();
          set({ isLoadingNominations: true });

          try {
            const res = await fetch('/api/badge/nominations', {
              headers: { 'X-User-Fingerprint': fp },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            set({
              pendingNominations: data.received ?? [],
              sentNominations: data.sent ?? [],
              isLoadingNominations: false,
            });
          } catch (err) {
            console.warn('[BadgeStore] fetchNominations failed:', err);
            set({ isLoadingNominations: false });
          }
        },

        // ==========================================
        // NOMINATE USER
        // ==========================================
        nominateUser: async (nomineeFingerprint: string, networkId: string, reason: string) => {
          const fp = get().userFingerprint || get().initFingerprint();

          if (reason.length < 50) {
            return { success: false, message: 'Sebep en az 50 karakter olmalı.' };
          }

          const canNominate = get().canDoAction('nominate', networkId);
          if (!canNominate) {
            return {
              success: false,
              message: 'Aday göstermek için en az Platform Kurdu (Tier 2) rozetine ihtiyacın var.',
            };
          }

          try {
            const res = await fetch('/api/badge/nominate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nominator_fingerprint: fp,
                nominee_fingerprint: nomineeFingerprint,
                network_id: networkId,
                reason,
              }),
            });

            const data = await res.json();
            if (!res.ok) return { success: false, message: data.error ?? 'Aday gösterme başarısız.' };

            // Optimistically add to sent nominations
            const newNom: BadgeNomination = {
              nominee_fingerprint: nomineeFingerprint,
              nominator_fingerprint: fp,
              network_id: networkId,
              reason,
              status: 'pending',
              created_at: new Date().toISOString(),
            };
            set((state) => ({ sentNominations: [newNom, ...state.sentNominations] }));

            return { success: true, message: 'Aday gösterme başarıyla gönderildi!' };
          } catch (err) {
            return {
              success: false,
              message: err instanceof Error ? err.message : 'Bir hata oluştu.',
            };
          }
        },

        // ==========================================
        // CHECK PROMOTION ELIGIBILITY
        // ==========================================
        checkPromotion: async (networkId?: string) => {
          const fp = get().userFingerprint || get().initFingerprint();

          try {
            const url = networkId
              ? `/api/badge/check-promotion?nid=${encodeURIComponent(networkId)}`
              : '/api/badge/check-promotion';
            const res = await fetch(url, {
              headers: { 'X-User-Fingerprint': fp },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data.promotionCheck as PromotionCheck;
          } catch (err) {
            console.warn('[BadgeStore] checkPromotion failed:', err);
            return null;
          }
        },

        // ==========================================
        // REQUEST JOURNALIST BADGE
        // ==========================================
        requestJournalistBadge: async (portfolioUrl: string, reason: string) => {
          const fp = get().userFingerprint || get().initFingerprint();

          try {
            const res = await fetch('/api/badge/journalist-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fingerprint: fp, portfolioUrl, reason }),
            });
            const data = await res.json();
            if (!res.ok) return { success: false, message: data.error ?? 'İstek başarısız.' };
            return { success: true, message: 'Gazeteci rozeti talebiniz alındı. İnceleme 3-5 iş günü sürebilir.' };
          } catch (err) {
            return { success: false, message: 'Bir hata oluştu.' };
          }
        },

        // ==========================================
        // COMPUTED: GET EFFECTIVE BADGE
        // Network badge overrides global if higher tier
        // ==========================================
        getEffectiveBadge: (networkId?: string) => {
          const { globalBadge, networkBadges } = get();
          if (!networkId) return globalBadge;

          const networkBadge = networkBadges[networkId];
          if (!networkBadge || !networkBadge.is_active) return globalBadge;

          // Return whichever has the higher tier
          const tierOrder: BadgeTierId[] = ['anonymous', 'community', 'journalist', 'institutional'];
          const globalTierIdx = tierOrder.indexOf(globalBadge?.badge_tier ?? 'anonymous');
          const networkTierIdx = tierOrder.indexOf(networkBadge.badge_tier);

          return networkTierIdx >= globalTierIdx ? networkBadge : globalBadge;
        },

        // ==========================================
        // COMPUTED: GET EFFECTIVE TIER DEFINITION
        // ==========================================
        getEffectiveTier: (networkId?: string) => {
          const badge = get().getEffectiveBadge(networkId);
          return getBadgeTier(badge?.badge_tier ?? 'anonymous');
        },

        // ==========================================
        // COMPUTED: CAN DO ACTION
        // ==========================================
        canDoAction: (action, networkId?) => {
          const tier = get().getEffectiveTier(networkId);
          switch (action) {
            case 'create_network':
              return tier.can_create_networks;
            case 'verify_evidence':
              return tier.can_verify_evidence;
            case 'moderate':
              return tier.can_moderate;
            case 'nominate':
              return tier.can_nominate;
            default:
              return false;
          }
        },

        // ==========================================
        // COMPUTED: GET VOTE WEIGHT
        // ==========================================
        getVoteWeight: (networkId?) => {
          return get().getEffectiveTier(networkId).vote_weight;
        },

        // ==========================================
        // LOCAL OPTIMISTIC: ADD REPUTATION TX
        // ==========================================
        addLocalReputationTransaction: (tx) => {
          const newTx: ReputationTransaction = {
            ...tx,
            id: `local_${Date.now()}`,
            created_at: new Date().toISOString(),
          };

          set((state) => ({
            reputationHistory: [newTx, ...state.reputationHistory],
            reputation: state.reputation
              ? {
                  ...state.reputation,
                  score: state.reputation.score + tx.amount,
                }
              : null,
          }));
        },
      }),
      {
        name: 'project-truth-badges',
        partialize: (state) => ({
          // SECURITY A8: Do NOT persist userFingerprint — single source is auth.ts localStorage
          // Only persist badge display data (non-sensitive)
          globalBadge: state.globalBadge,
          networkBadges: state.networkBadges,
          reputation: state.reputation,
        }),
      }
    ),
    { name: 'BadgeStore' }
  )
);
