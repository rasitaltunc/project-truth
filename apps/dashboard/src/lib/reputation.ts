// ============================================
// TRUTH PROTOCOL - Reputation & Impact System
// İtibar ve Etki Sistemi
// ============================================

import { supabase } from './auth';

// ============================================
// TYPES
// ============================================

export interface UserStats {
    userId: string;
    anonymousId: string;
    displayName?: string;
    trustLevel: number;
    reputationScore: number;
    contributionsCount: number;
    verifiedContributions: number;
    falseContributions: number;
    accuracyRate: number;
    rank: number;
    badges: Badge[];
    impactScore: number;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    earnedAt?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface GlobalStats {
    totalUsers: number;
    totalContributions: number;
    verifiedEvidence: number;
    activeNetworks: number;
    nodesTracked: number;
    countriesCovered: number;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    anonymousId: string;
    displayName?: string;
    trustLevel: number;
    reputationScore: number;
    verifiedContributions: number;
    badges: Badge[];
}

export interface ImpactMetrics {
    evidenceVerified: number;
    crossReferencesFound: number;
    falseInfoPrevented: number;
    newConnectionsDiscovered: number;
    timelineEventsAdded: number;
    usersHelped: number;
}

// ============================================
// BADGES DEFINITION
// ============================================

export const BADGES: Record<string, Badge> = {
    // Contribution badges
    first_contribution: {
        id: 'first_contribution',
        name: 'İlk Adım',
        description: 'İlk katkınızı yaptınız',
        icon: '🌱',
        color: '#22c55e',
        rarity: 'common'
    },
    contributor_10: {
        id: 'contributor_10',
        name: 'Aktif Katılımcı',
        description: '10 katkı yaptınız',
        icon: '📝',
        color: '#dc2626',
        rarity: 'common'
    },
    contributor_50: {
        id: 'contributor_50',
        name: 'Düzenli Katkıcı',
        description: '50 katkı yaptınız',
        icon: '📚',
        color: '#8b5cf6',
        rarity: 'uncommon'
    },
    contributor_100: {
        id: 'contributor_100',
        name: 'Uzman Katkıcı',
        description: '100 katkı yaptınız',
        icon: '🏆',
        color: '#f59e0b',
        rarity: 'rare'
    },
    contributor_500: {
        id: 'contributor_500',
        name: 'Efsane Katkıcı',
        description: '500 katkı yaptınız',
        icon: '👑',
        color: '#ef4444',
        rarity: 'legendary'
    },

    // Accuracy badges
    accuracy_90: {
        id: 'accuracy_90',
        name: 'Güvenilir Kaynak',
        description: '%90+ doğruluk oranı (min 10 katkı)',
        icon: '✓',
        color: '#22c55e',
        rarity: 'uncommon'
    },
    accuracy_95: {
        id: 'accuracy_95',
        name: 'Altın Standart',
        description: '%95+ doğruluk oranı (min 25 katkı)',
        icon: '⭐',
        color: '#fbbf24',
        rarity: 'rare'
    },
    perfect_accuracy: {
        id: 'perfect_accuracy',
        name: 'Mükemmel Kayıt',
        description: '%100 doğruluk (min 50 katkı)',
        icon: '💎',
        color: '#dc2626',
        rarity: 'epic'
    },

    // Trust level badges
    verified_human: {
        id: 'verified_human',
        name: 'Doğrulanmış İnsan',
        description: 'Güven seviyesi 1\'e ulaştınız',
        icon: '👤',
        color: '#f59e0b',
        rarity: 'common'
    },
    verified_witness: {
        id: 'verified_witness',
        name: 'Doğrulanmış Tanık',
        description: 'Güven seviyesi 2\'ye ulaştınız',
        icon: '👁️',
        color: '#dc2626',
        rarity: 'uncommon'
    },
    verified_insider: {
        id: 'verified_insider',
        name: 'Doğrulanmış İçeriden',
        description: 'Güven seviyesi 3\'e ulaştınız',
        icon: '🔑',
        color: '#8b5cf6',
        rarity: 'rare'
    },
    named_source: {
        id: 'named_source',
        name: 'İsimli Kaynak',
        description: 'Güven seviyesi 4\'e ulaştınız',
        icon: '🌟',
        color: '#22c55e',
        rarity: 'epic'
    },

    // Special badges
    cross_reference_finder: {
        id: 'cross_reference_finder',
        name: 'Bağlantı Ustası',
        description: '10 çapraz referans buldunuz',
        icon: '🔗',
        color: '#ec4899',
        rarity: 'rare'
    },
    early_adopter: {
        id: 'early_adopter',
        name: 'Öncü',
        description: 'İlk 1000 kullanıcıdan biri',
        icon: '🚀',
        color: '#6366f1',
        rarity: 'epic'
    },
    truth_guardian: {
        id: 'truth_guardian',
        name: 'Hakikat Koruyucusu',
        description: '100 kanıtı doğruladınız',
        icon: '🛡️',
        color: '#14b8a6',
        rarity: 'rare'
    },
    dead_man_switch: {
        id: 'dead_man_switch',
        name: 'Sigortalı',
        description: 'Dead Man\'s Switch oluşturdunuz',
        icon: '💀',
        color: '#ef4444',
        rarity: 'uncommon'
    }
};

// ============================================
// REPUTATION FUNCTIONS
// ============================================

/**
 * Get user's full stats (OPTIMIZED)
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
    try {
        // Get user data - use maybeSingle() since user might not exist
        const { data: user, error } = await supabase
            .from('truth_users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error || !user) {
            console.warn('User not found:', userId, error);
            return null;
        }

        // Calculate accuracy rate
        const total = user.contributions_count || 0;
        const verified = user.verified_contributions || 0;
        const accuracyRate = total > 0 ? Math.round((verified / total) * 100) : 0;

        // OPTIMIZATION: Fetch rank and badges in parallel
        const [rankResult, badges] = await Promise.all([
            supabase
                .from('truth_users')
                .select('*', { count: 'exact', head: true })
                .gt('reputation_score', user.reputation_score),
            getUserBadges(userId)
        ]);

        const rank = ((rankResult?.count as number) || 0) + 1;

        // Calculate impact score
        const impactScore = calculateImpactScore(user, badges);

        return {
            userId: user.id,
            anonymousId: user.anonymous_id,
            displayName: user.display_name,
            trustLevel: user.trust_level,
            reputationScore: user.reputation_score,
            contributionsCount: total,
            verifiedContributions: verified,
            falseContributions: user.false_contributions || 0,
            accuracyRate,
            rank,
            badges,
            impactScore
        };

    } catch (err) {
        console.error('Get user stats error:', err);
        return null;
    }
}

/**
 * Get user's earned badges (OPTIMIZED - parallel checks)
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
    const badges: Badge[] = [];

    try {
        // Use maybeSingle() since user might not exist
        const { data: user, error: userError } = await supabase
            .from('truth_users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (userError || !user) {
            console.warn('User not found for badges:', userId);
            return badges;
        }

        // Check contribution badges (synchronous)
        if (user.contributions_count >= 1) badges.push(BADGES.first_contribution);
        if (user.contributions_count >= 10) badges.push(BADGES.contributor_10);
        if (user.contributions_count >= 50) badges.push(BADGES.contributor_50);
        if (user.contributions_count >= 100) badges.push(BADGES.contributor_100);
        if (user.contributions_count >= 500) badges.push(BADGES.contributor_500);

        // Check accuracy badges
        const total = user.contributions_count || 0;
        const verified = user.verified_contributions || 0;
        const accuracy = total > 0 ? (verified / total) * 100 : 0;

        if (total >= 10 && accuracy >= 90) badges.push(BADGES.accuracy_90);
        if (total >= 25 && accuracy >= 95) badges.push(BADGES.accuracy_95);
        if (total >= 50 && accuracy === 100) badges.push(BADGES.perfect_accuracy);

        // Check trust level badges
        if (user.trust_level >= 1) badges.push(BADGES.verified_human);
        if (user.trust_level >= 2) badges.push(BADGES.verified_witness);
        if (user.trust_level >= 3) badges.push(BADGES.verified_insider);
        if (user.trust_level >= 4) badges.push(BADGES.named_source);

        // OPTIMIZATION: Check DMS and early adopter in PARALLEL (wrapped in try/catch since tables may not exist)
        const [dmsResult, userCountResult] = await Promise.all([
            (async () => {
                try {
                    const { count } = await supabase
                        .from('dead_man_switches')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    return { count };
                } catch { return { count: 0 }; }
            })(),
            (async () => {
                try {
                    const { count } = await supabase
                        .from('truth_users')
                        .select('*', { count: 'exact', head: true })
                        .lt('created_at', user.created_at);
                    return { count };
                } catch { return { count: 0 }; }
            })()
        ]);

        if (dmsResult && dmsResult.count && dmsResult.count > 0) {
            badges.push(BADGES.dead_man_switch);
        }

        if (userCountResult && userCountResult.count !== null && userCountResult.count < 1000) {
            badges.push(BADGES.early_adopter);
        }

    } catch (err) {
        console.error('Get badges error:', err);
    }

    return badges;
}

/**
 * Calculate impact score
 */
function calculateImpactScore(user: any, badges: Badge[]): number {
    let score = 0;

    // Base from reputation
    score += user.reputation_score || 0;

    // Bonus for trust level
    score += (user.trust_level || 0) * 50;

    // Bonus for accuracy
    const total = user.contributions_count || 0;
    const verified = user.verified_contributions || 0;
    if (total > 0) {
        const accuracy = verified / total;
        score += Math.round(accuracy * 100);
    }

    // Bonus for badges
    const rarityBonus: Record<string, number> = {
        common: 5,
        uncommon: 15,
        rare: 30,
        epic: 50,
        legendary: 100
    };
    for (const badge of badges) {
        score += rarityBonus[badge.rarity] || 0;
    }

    return score;
}

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

/**
 * Get global leaderboard (OPTIMIZED - parallel badge fetching)
 */
export async function getLeaderboard(
    limit: number = 10,
    offset: number = 0
): Promise<LeaderboardEntry[]> {
    try {
        const { data: users, error } = await supabase
            .from('truth_users')
            .select('id, anonymous_id, display_name, trust_level, reputation_score, verified_contributions, contributions_count')
            .order('reputation_score', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error || !users) return [];

        // OPTIMIZATION: Fetch all badges in parallel instead of sequential
        const badgesPromises = users.map((user: any) => getUserBadges(user.id));
        const allBadges = await Promise.all(badgesPromises);

        const entries: LeaderboardEntry[] = users.map((user: any, i: any) => ({
            rank: offset + i + 1,
            userId: user.id,
            anonymousId: user.anonymous_id,
            displayName: user.display_name,
            trustLevel: user.trust_level,
            reputationScore: user.reputation_score,
            verifiedContributions: user.verified_contributions,
            badges: allBadges[i].slice(0, 3) // Top 3 badges
        }));

        return entries;

    } catch (err) {
        console.error('Get leaderboard error:', err);
        return [];
    }
}

/**
 * Get user's rank
 */
export async function getUserRank(userId: string): Promise<number> {
    try {
        // Use maybeSingle() since user might not exist
        const { data: user, error } = await supabase
            .from('truth_users')
            .select('reputation_score')
            .eq('id', userId)
            .maybeSingle();

        if (error || !user) return 0;

        const { count } = await supabase
            .from('truth_users')
            .select('*', { count: 'exact', head: true })
            .gt('reputation_score', user.reputation_score);

        return (count || 0) + 1;

    } catch (err) {
        console.error('Get rank error:', err);
        return 0;
    }
}

// ============================================
// GLOBAL STATS
// ============================================

/**
 * Get global platform statistics (OPTIMIZED - parallel queries)
 */
export async function getGlobalStats(): Promise<GlobalStats> {
    try {
        // OPTIMIZATION: Fetch all stats in PARALLEL (wrapped in async IIFE for error safety)
        const safeQuery = async (fn: () => Promise<any>, fallback: any) => {
            try { return await fn(); } catch { return fallback; }
        };

        const [
            { count: totalUsers },
            { count: totalContributions },
            { count: verifiedEvidence },
            { count: nodesTracked },
            { data: countries }
        ] = await Promise.all([
            safeQuery(() => supabase.from('truth_users').select('*', { count: 'exact', head: true }), { count: 0 }),
            safeQuery(() => supabase.from('user_contributions').select('*', { count: 'exact', head: true }), { count: 0 }),
            safeQuery(() => supabase.from('evidence_archive').select('*', { count: 'exact', head: true }).filter('verification_status', 'in', '(verified,community_verified)'), { count: 0 }),
            safeQuery(() => supabase.from('nodes').select('*', { count: 'exact', head: true }), { count: 0 }),
            safeQuery(() => supabase.from('evidence_archive').select('country_tags'), { data: [] })
        ]);

        const uniqueCountries = new Set<string>();
        if (countries) {
            for (const row of countries) {
                for (const tag of row.country_tags || []) {
                    uniqueCountries.add(tag);
                }
            }
        }

        return {
            totalUsers: totalUsers || 0,
            totalContributions: totalContributions || 0,
            verifiedEvidence: verifiedEvidence || 0,
            activeNetworks: 1, // Currently just Epstein network
            nodesTracked: nodesTracked || 0,
            countriesCovered: uniqueCountries.size || 0
        };

    } catch (err) {
        console.error('Get global stats error:', err);
        return {
            totalUsers: 0,
            totalContributions: 0,
            verifiedEvidence: 0,
            activeNetworks: 0,
            nodesTracked: 0,
            countriesCovered: 0
        };
    }
}

// ============================================
// IMPACT TRACKING
// ============================================

/**
 * Record an impact event
 */
export async function recordImpact(
    userId: string,
    impactType: string,
    details?: any
): Promise<void> {
    try {
        // This would insert into an impact_events table
        // For now, we just update reputation
        let reputationBonus = 0;

        switch (impactType) {
            case 'evidence_verified':
                reputationBonus = 10;
                break;
            case 'cross_reference_found':
                reputationBonus = 15;
                break;
            case 'false_info_prevented':
                reputationBonus = 20;
                break;
            case 'new_connection_discovered':
                reputationBonus = 25;
                break;
        }

        if (reputationBonus > 0) {
            await supabase
                .from('truth_users')
                .update({
                    reputation_score: supabase.rpc('increment_by', { amount: reputationBonus })
                })
                .eq('id', userId);
        }

    } catch (err) {
        console.error('Record impact error:', err);
    }
}

// ============================================
// SPRINT 6B: DİNAMİK STAKİNG SİSTEMİ
// Sabit -5/+15/-10 yerine kanıt tipine ve kullanıcı seçimine dayalı dinamik model
// ============================================

export type EvidenceSourceType =
  | 'court_record' | 'official_document' | 'leaked_document'
  | 'financial_record' | 'witness_testimony' | 'news_major'
  | 'news_minor' | 'academic_paper' | 'social_media'
  | 'rumor' | 'inference';

export type ResolveSeverity = 'good_faith' | 'misleading' | 'malicious';

// Kanıt tipi → ödül çarpanı
const EVIDENCE_TYPE_MULTIPLIERS: Record<string, number> = {
  court_record: 2.0,
  official_document: 1.8,
  leaked_document: 1.6,
  financial_record: 1.7,
  witness_testimony: 1.3,
  news_major: 1.2,
  news_minor: 1.0,
  academic_paper: 1.4,
  social_media: 0.8,
  rumor: 0.5,
  inference: 0.6,
};

// Severity → ceza çarpanı
const SEVERITY_MULTIPLIERS: Record<ResolveSeverity, number> = {
  good_faith: 0.5,
  misleading: 1.0,
  malicious: 2.0,
};

/**
 * Dinamik stake miktarını hesapla
 * Kullanıcı itibarının %1-10'u arasında seçer
 */
export function calculateDynamicStake(userReputation: number, stakePercent: number): number {
  const clampedPercent = Math.max(1, Math.min(10, stakePercent));
  const stake = Math.floor(userReputation * (clampedPercent / 100));
  return Math.max(1, stake); // Minimum 1 puan stake
}

/**
 * Onaylanan kanıt için ödül hesapla
 * Ödül = stake × evidence_type_multiplier
 */
export function calculateReward(stake: number, evidenceType: string): number {
  const multiplier = EVIDENCE_TYPE_MULTIPLIERS[evidenceType] || 1.0;
  return Math.floor(stake * multiplier);
}

/**
 * Reddedilen kanıt için ceza hesapla
 * Ceza = stake × severity_multiplier × correlation_penalty
 */
export function calculateSlash(
  stake: number,
  severity: ResolveSeverity,
  consecutiveRejects: number
): number {
  const severityMult = SEVERITY_MULTIPLIERS[severity];
  // Correlation penalty: 1.0 → 1.5 → 2.5 → 4.0 (üstel artış)
  const correlationPenalty = Math.pow(1.5, Math.min(consecutiveRejects, 4));
  return Math.floor(stake * severityMult * correlationPenalty);
}

/**
 * Half-life decay uygula
 * Her 60 günde reputation %50 azalır (katkı yoksa)
 */
export function applyHalfLifeDecay(reputation: number, daysInactive: number): number {
  if (daysInactive <= 0) return reputation;
  const halfLifeDays = 60;
  return Math.floor(reputation * Math.pow(0.5, daysInactive / halfLifeDays));
}

/**
 * Kanıt tipi çarpanını al (UI gösterimi için)
 */
export function getEvidenceTypeMultiplier(evidenceType: string): number {
  return EVIDENCE_TYPE_MULTIPLIERS[evidenceType] || 1.0;
}

/**
 * Tüm kanıt tipi çarpanlarını al (UI gösterimi için)
 */
export function getAllEvidenceMultipliers(): Record<string, number> {
  return { ...EVIDENCE_TYPE_MULTIPLIERS };
}

// ============================================
// REPUTATION TIERS
// ============================================

export const REPUTATION_TIERS = [
    { min: 0, name: 'Başlangıç', color: '#6b7280', icon: '👤' },
    { min: 10, name: 'Yeni', color: '#22c55e', icon: '🌱' },
    { min: 50, name: 'Aktif', color: '#dc2626', icon: '📝' },
    { min: 200, name: 'Güvenilir', color: '#8b5cf6', icon: '🛡️' },
    { min: 500, name: 'Uzman', color: '#f59e0b', icon: '⭐' },
    { min: 1000, name: 'Efsane', color: '#ef4444', icon: '👑' },
    { min: 5000, name: 'Yıldız', color: '#ec4899', icon: '💫' },
    { min: 10000, name: 'Efendi', color: '#fbbf24', icon: '🏆' }
];

/**
 * Get reputation tier for a score
 */
export function getReputationTier(score: number): typeof REPUTATION_TIERS[0] {
    for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
        if (score >= REPUTATION_TIERS[i].min) {
            return REPUTATION_TIERS[i];
        }
    }
    return REPUTATION_TIERS[0];
}

/**
 * Get progress to next tier
 */
export function getProgressToNextTier(score: number): {
    current: typeof REPUTATION_TIERS[0];
    next: typeof REPUTATION_TIERS[0] | null;
    progress: number;
} {
    const current = getReputationTier(score);
    const currentIndex = REPUTATION_TIERS.findIndex(t => t.min === current.min);
    const next = currentIndex < REPUTATION_TIERS.length - 1
        ? REPUTATION_TIERS[currentIndex + 1]
        : null;

    if (!next) {
        return { current, next: null, progress: 100 };
    }

    const range = next.min - current.min;
    const progress = Math.min(100, Math.round(((score - current.min) / range) * 100));

    return { current, next, progress };
}
