// ============================================
// TRUTH PROTOCOL - Reputation Dashboard
// İtibar ve Etki Gösterge Paneli
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, TrendingUp, Users, Shield, Star, Award,
    ChevronUp, ChevronDown, Globe, FileCheck, Link2,
    Clock, Target, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    UserStats,
    LeaderboardEntry,
    GlobalStats,
    Badge,
    getUserStats,
    getLeaderboard,
    getGlobalStats,
    getProgressToNextTier,
    BADGES,
    REPUTATION_TIERS
} from '@/lib/reputation';

// ============================================
// MAIN DASHBOARD
// ============================================

export function ReputationDashboard() {
    const { user, isAuthenticated } = useAuth();
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [activeTab, setActiveTab] = useState<'stats' | 'badges' | 'leaderboard'>('stats');
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, [user?.id]);

    const loadData = async () => {
        setLoading(true);
        setErrors({});

        try {
            // OPTIMIZATION: Fetch all data in PARALLEL instead of sequential
            // Using async IIFE pattern with try/catch for each function (no .catch() on them)
            const globalStatsResult = await (async () => {
                try {
                    return await getGlobalStats();
                } catch (err) {
                    console.error('Global stats error:', err);
                    setErrors(prev => ({ ...prev, global: 'Küresel istatistikler yüklenemedi' }));
                    return null;
                }
            })();

            const userStatsResult = user?.id ? await (async () => {
                try {
                    return await getUserStats(user.id);
                } catch (err) {
                    console.error('User stats error:', err);
                    setErrors(prev => ({ ...prev, user: 'Kullanıcı istatistikleri yüklenemedi' }));
                    return null;
                }
            })() : null;

            const leaderboardResult = await (async () => {
                try {
                    return await getLeaderboard(10);
                } catch (err) {
                    console.error('Leaderboard error:', err);
                    setErrors(prev => ({ ...prev, leaderboard: 'Lider tablosu yüklenemedi' }));
                    return [];
                }
            })();

            setGlobalStats(globalStatsResult);
            setUserStats(userStatsResult);
            setLeaderboard(leaderboardResult || []);

        } catch (err) {
            console.error('Reputation dashboard load error:', err);
            setErrors(prev => ({ ...prev, general: 'Veriler yüklenirken hata oluştu' }));
        } finally {
            setLoading(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    };

    const errorStyle: React.CSSProperties = {
        padding: '12px 16px',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        color: '#fca5a5',
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    return (
        <div style={containerStyle}>
            {/* Error Messages */}
            {errors.general && (
                <div style={errorStyle}>
                    ⚠️ {errors.general}
                </div>
            )}

            {/* Global Stats Bar */}
            <GlobalStatsBar stats={globalStats} error={errors.global} />

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(220, 38, 38, 0.3)',
                paddingBottom: '12px',
                paddingTop: '8px'
            }}>
                {['stats', 'badges', 'leaderboard'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 500,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            letterSpacing: '0.1em',
                            border: 'none',
                            backgroundColor: activeTab === tab ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                            color: activeTab === tab ? '#fca5a5' : '#6b7280',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-out',
                            borderBottom: activeTab === tab ? '2px solid #dc2626' : '2px solid transparent',
                            textTransform: 'uppercase',
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab) {
                                e.currentTarget.style.color = '#e5e5e5';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab) {
                                e.currentTarget.style.color = '#6b7280';
                            }
                        }}
                    >
                        {tab === 'stats' && '📊 İstatistikler'}
                        {tab === 'badges' && '🏆 Rozetler'}
                        {tab === 'leaderboard' && '🥇 Lider Tablosu'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: '48px',
                    paddingBottom: '48px'
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        style={{
                            width: '32px',
                            height: '32px',
                            border: '2px solid #dc2626',
                            borderTopColor: 'transparent',
                            borderRadius: '50%'
                        }}
                    />
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {activeTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {errors.user && (
                                <div style={errorStyle}>
                                    ⚠️ {errors.user}
                                </div>
                            )}
                            {isAuthenticated && userStats ? (
                                <UserStatsPanel stats={userStats} />
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    paddingTop: '32px',
                                    paddingBottom: '32px',
                                    color: 'rgba(220, 38, 38, 0.4)'
                                }}>
                                    <Shield size={48} style={{
                                        margin: '0 auto 16px auto',
                                        color: 'rgba(220, 38, 38, 0.3)',
                                        display: 'block'
                                    }} />
                                    <p style={{
                                        fontSize: '14px',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        letterSpacing: '0.05em'
                                    }}>İstatistiklerinizi görmek için giriş yapın</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'badges' && (
                        <motion.div
                            key="badges"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <BadgesPanel userBadges={userStats?.badges || []} />
                        </motion.div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {errors.leaderboard && (
                                <div style={errorStyle}>
                                    ⚠️ {errors.leaderboard}
                                </div>
                            )}
                            <LeaderboardPanel
                                entries={leaderboard}
                                currentUserId={user?.id}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}

// ============================================
// GLOBAL STATS BAR
// ============================================

function GlobalStatsBar({ stats, error }: { stats: GlobalStats | null; error?: string }) {
    const containerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px'
    };

    const errorContainerStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    };

    if (error) {
        return (
            <div style={errorContainerStyle}>
                <p>{error}</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div style={errorContainerStyle}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #dc2626',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        margin: '0 auto'
                    }}
                />
            </div>
        );
    }

    const items = [
        { icon: Users, label: 'Kullanıcı', value: stats.totalUsers, color: '#fca5a5' },
        { icon: FileCheck, label: 'Katkı', value: stats.totalContributions, color: '#dc2626' },
        { icon: Shield, label: 'Doğrulanmış', value: stats.verifiedEvidence, color: '#991b1b' },
        { icon: Link2, label: 'Düğüm', value: stats.nodesTracked, color: '#fca5a5' },
        { icon: Globe, label: 'Ülke', value: stats.countriesCovered, color: '#dc2626' },
    ];

    return (
        <div style={containerStyle}>
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                        padding: '16px 12px',
                        backgroundColor: 'rgba(10, 10, 10, 0.8)',
                        border: '1px solid rgba(220, 38, 38, 0.25)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <item.icon size={18} style={{ color: item.color }} />
                    <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#e5e5e5',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        letterSpacing: '0.1em'
                    }}>
                        {item.value.toLocaleString()}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                    }}>
                        {item.label}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// USER STATS PANEL
// ============================================

function UserStatsPanel({ stats }: { stats: UserStats }) {
    const tierProgress = getProgressToNextTier(stats.reputationScore);

    const mainCardStyle: React.CSSProperties = {
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.9) 0%, rgba(15, 15, 15, 0.9) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px'
    };

    const tierInfoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    const tierIconStyle: React.CSSProperties = {
        fontSize: '32px',
        lineHeight: '1'
    };

    const tierNameStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const tierLabelStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 700,
        color: '#e5e5e5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em'
    };

    const rankStyle: React.CSSProperties = {
        fontSize: '12px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const scoreStyle: React.CSSProperties = {
        textAlign: 'right' as const,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const scoreValueStyle: React.CSSProperties = {
        fontSize: '28px',
        fontWeight: 700,
        color: tierProgress.current.color,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em'
    };

    const scoreLabelStyle: React.CSSProperties = {
        fontSize: '10px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
    };

    const progressStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const progressHeaderStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px'
    };

    const progressLabelStyle: React.CSSProperties = {
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const progressPercentStyle: React.CSSProperties = {
        color: '#e5e5e5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const progressBarContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '6px',
        backgroundColor: 'rgba(107, 114, 128, 0.2)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        overflow: 'hidden'
    };

    const progressTextStyle: React.CSSProperties = {
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
    };

    const badgesContainerStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const badgesTitleStyle: React.CSSProperties = {
        fontSize: '11px',
        fontWeight: 500,
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
    };

    const badgesWrapperStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    };

    const moreStyle: React.CSSProperties = {
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '4px',
        paddingBottom: '4px',
        backgroundColor: 'rgba(15, 15, 15, 0.8)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: '2px',
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    };

    return (
        <div style={containerStyle}>
            {/* Main Stats Card */}
            <div style={mainCardStyle}>
                <div style={headerStyle}>
                    <div style={tierInfoStyle}>
                        <div style={tierIconStyle}>{tierProgress.current.icon}</div>
                        <div style={tierNameStyle}>
                            <h3 style={tierLabelStyle}>{tierProgress.current.name}</h3>
                            <p style={rankStyle}>Sıralama: #{stats.rank}</p>
                        </div>
                    </div>
                    <div style={scoreStyle}>
                        <div style={scoreValueStyle}>{stats.reputationScore.toLocaleString()}</div>
                        <div style={scoreLabelStyle}>İtibar Puanı</div>
                    </div>
                </div>

                {/* Progress to next tier */}
                {tierProgress.next && (
                    <div style={progressStyle}>
                        <div style={progressHeaderStyle}>
                            <span style={progressLabelStyle}>Sonraki: {tierProgress.next.name}</span>
                            <span style={progressPercentStyle}>{tierProgress.progress}%</span>
                        </div>
                        <div style={progressBarContainerStyle}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${tierProgress.progress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                style={{
                                    height: '100%',
                                    backgroundColor: tierProgress.next.color,
                                    opacity: 0.8
                                }}
                            />
                        </div>
                        <div style={progressTextStyle}>
                            {tierProgress.next.min - stats.reputationScore} puan daha gerekli
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div style={gridStyle}>
                <StatCard
                    icon={FileCheck}
                    label="Toplam Katkı"
                    value={stats.contributionsCount}
                    color="#fca5a5"
                />
                <StatCard
                    icon={Shield}
                    label="Doğrulanmış"
                    value={stats.verifiedContributions}
                    color="#dc2626"
                />
                <StatCard
                    icon={Target}
                    label="Doğruluk"
                    value={`%${stats.accuracyRate}`}
                    color={stats.accuracyRate >= 90 ? '#dc2626' : stats.accuracyRate >= 70 ? '#f59e0b' : '#991b1b'}
                />
                <StatCard
                    icon={Zap}
                    label="Etki Skoru"
                    value={stats.impactScore}
                    color="#991b1b"
                />
            </div>

            {/* Top Badges */}
            {stats.badges.length > 0 && (
                <div style={badgesContainerStyle}>
                    <h4 style={badgesTitleStyle}>Kazanılan Rozetler</h4>
                    <div style={badgesWrapperStyle}>
                        {stats.badges.slice(0, 6).map(badge => (
                            <BadgeChip key={badge.id} badge={badge} size="md" />
                        ))}
                        {stats.badges.length > 6 && (
                            <span style={moreStyle}>
                                +{stats.badges.length - 6} daha
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// STAT CARD
// ============================================

function StatCard({
    icon: Icon,
    label,
    value,
    color
}: {
    icon: any;
    label: string;
    value: number | string;
    color: string;
}) {
    const cardStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const valueStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 700,
        color: '#e5e5e5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '10px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
    };

    return (
        <div style={cardStyle}>
            <Icon size={18} style={{ color, marginBottom: '4px' }} />
            <div style={valueStyle}>{value}</div>
            <div style={labelStyle}>{label}</div>
        </div>
    );
}

// ============================================
// BADGES PANEL
// ============================================

function BadgesPanel({ userBadges }: { userBadges: Badge[] }) {
    const earnedIds = new Set(userBadges.map(b => b.id));
    const allBadges = Object.values(BADGES);

    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

    const sortedBadges = [...allBadges].sort((a, b) => {
        const aEarned = earnedIds.has(a.id) ? 0 : 1;
        const bEarned = earnedIds.has(b.id) ? 0 : 1;
        if (aEarned !== bEarned) return aEarned - bEarned;
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    });

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em'
    };

    const rarityFilterStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px'
    };

    const rarityLabelStyle: React.CSSProperties = {
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
        fontSize: '10px',
        borderRadius: '2px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px'
    };

    const badgeCardStyle = (earned: boolean): React.CSSProperties => ({
        padding: '16px',
        backgroundColor: earned ? 'rgba(15, 15, 15, 0.9)' : 'rgba(10, 10, 10, 0.6)',
        border: earned ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(220, 38, 38, 0.15)',
        opacity: earned ? 1 : 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'all 0.2s ease-out'
    });

    const badgeHeaderStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    const badgeIconStyle: React.CSSProperties = {
        fontSize: '28px',
        lineHeight: '1'
    };

    const rarityDotStyle = (rarity: string): React.CSSProperties => ({
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: getRarityColor(rarity),
        flexShrink: 0
    });

    const badgeNameStyle = (earned: boolean): React.CSSProperties => ({
        fontSize: '13px',
        fontWeight: 500,
        color: earned ? '#e5e5e5' : '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    });

    const badgeDescStyle: React.CSSProperties = {
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.4'
    };

    const lockStyle: React.CSSProperties = {
        marginTop: '8px',
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={headerStyle}>
                <h4 style={titleStyle}>
                    Rozetler ({userBadges.length}/{allBadges.length})
                </h4>
                <div style={rarityFilterStyle}>
                    {['legendary', 'epic', 'rare'].map(rarity => (
                        <span
                            key={rarity}
                            style={{
                                ...rarityLabelStyle,
                                backgroundColor: getRarityColor(rarity) + '20',
                                color: getRarityColor(rarity),
                                textTransform: 'uppercase'
                            }}
                        >
                            {rarity}
                        </span>
                    ))}
                </div>
            </div>

            <div style={gridStyle}>
                {sortedBadges.map(badge => {
                    const earned = earnedIds.has(badge.id);
                    return (
                        <motion.div
                            key={badge.id}
                            whileHover={{ scale: 1.02 }}
                            style={badgeCardStyle(earned)}
                        >
                            <div style={badgeHeaderStyle}>
                                <span style={badgeIconStyle}>{badge.icon}</span>
                                <div
                                    style={rarityDotStyle(badge.rarity)}
                                    title={badge.rarity}
                                />
                            </div>
                            <h5 style={badgeNameStyle(earned)}>
                                {badge.name}
                            </h5>
                            <p style={badgeDescStyle}>{badge.description}</p>
                            {!earned && (
                                <div style={lockStyle}>🔒 Kilitli</div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// LEADERBOARD PANEL
// ============================================

function LeaderboardPanel({
    entries,
    currentUserId
}: {
    entries: LeaderboardEntry[];
    currentUserId?: string;
}) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const rankColors: Record<number, { bg: string; text: string; medal: string }> = {
        1: { bg: 'rgba(217, 119, 6, 0.15)', text: '#f59e0b', medal: '🥇' },
        2: { bg: 'rgba(107, 114, 128, 0.15)', text: '#d1d5db', medal: '🥈' },
        3: { bg: 'rgba(234, 88, 12, 0.15)', text: '#fb923c', medal: '🥉' }
    };

    const entryStyle = (isCurrentUser: boolean): React.CSSProperties => ({
        padding: '16px',
        backgroundColor: isCurrentUser ? 'rgba(220, 38, 38, 0.1)' : 'rgba(10, 10, 10, 0.8)',
        border: isCurrentUser ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid rgba(220, 38, 38, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.2s ease-out'
    });

    const rankStyle = (rank: number): React.CSSProperties => {
        const rankColor = rankColors[rank] || { bg: 'rgba(15, 15, 15, 0.9)', text: '#6b7280', medal: `#${rank}` };
        return {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            backgroundColor: rankColor.bg,
            color: rankColor.text,
            fontSize: rank <= 3 ? '16px' : '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            flexShrink: 0
        };
    };

    const userInfoStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    };

    const userNameLineStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
    };

    const userNameStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 500,
        color: '#e5e5e5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    };

    const tierBadgeStyle = (tier: any): React.CSSProperties => ({
        fontSize: '11px',
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingTop: '3px',
        paddingBottom: '3px',
        borderRadius: '2px',
        backgroundColor: tier.color + '20',
        color: tier.color,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    });

    const userIdStyle: React.CSSProperties = {
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const badgesStyle: React.CSSProperties = {
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
    };

    const badgeIconStyle: React.CSSProperties = {
        fontSize: '14px'
    };

    const statsStyle: React.CSSProperties = {
        textAlign: 'right' as const,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: '80px'
    };

    const scoreStyle = (color: string): React.CSSProperties => ({
        fontSize: '16px',
        fontWeight: 700,
        color: color,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.1em'
    });

    const verifiedStyle: React.CSSProperties = {
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const emptyStateStyle: React.CSSProperties = {
        textAlign: 'center',
        paddingTop: '32px',
        paddingBottom: '32px',
        color: '#6b7280'
    };

    const emptyTrophyStyle: React.CSSProperties = {
        margin: '0 auto 16px auto',
        opacity: 0.4,
        display: 'block'
    };

    const emptyTextStyle: React.CSSProperties = {
        fontSize: '14px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    return (
        <div style={containerStyle}>
            {entries.map((entry, i) => {
                const isCurrentUser = entry.userId === currentUserId;
                const tier = REPUTATION_TIERS.find(t => entry.reputationScore >= t.min) || REPUTATION_TIERS[0];

                return (
                    <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={entryStyle(isCurrentUser)}
                    >
                        {/* Rank */}
                        <div style={rankStyle(entry.rank)}>
                            {entry.rank <= 3
                                ? rankColors[entry.rank].medal
                                : `#${entry.rank}`
                            }
                        </div>

                        {/* User Info */}
                        <div style={userInfoStyle}>
                            <div style={userNameLineStyle}>
                                <span style={userNameStyle}>
                                    {entry.displayName || entry.anonymousId.split('_')[0]}
                                </span>
                                <span style={tierBadgeStyle(tier)}>
                                    {tier.icon} {tier.name}
                                </span>
                            </div>
                            <code style={userIdStyle}>{entry.anonymousId}</code>
                        </div>

                        {/* Badges */}
                        {entry.badges.length > 0 && (
                            <div style={badgesStyle}>
                                {entry.badges.slice(0, 3).map(badge => (
                                    <span key={badge.id} style={badgeIconStyle} title={badge.name}>
                                        {badge.icon}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Stats */}
                        <div style={statsStyle}>
                            <div style={scoreStyle(tier.color)}>
                                {entry.reputationScore.toLocaleString()}
                            </div>
                            <div style={verifiedStyle}>
                                {entry.verifiedContributions} doğrulanmış
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {entries.length === 0 && (
                <div style={emptyStateStyle}>
                    <Trophy size={32} style={emptyTrophyStyle} />
                    <p style={emptyTextStyle}>Henüz lider tablosu oluşmadı</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// BADGE CHIP
// ============================================

function BadgeChip({ badge, size = 'sm' }: { badge: Badge; size?: 'sm' | 'md' }) {
    const padding = size === 'md'
        ? { paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px' }
        : { paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' };

    const fontSize = size === 'md' ? '12px' : '11px';

    const chipStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...padding,
        backgroundColor: badge.color + '20',
        border: `1px solid ${badge.color}40`,
        borderRadius: '2px',
        fontSize: fontSize,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em'
    };

    const textStyle: React.CSSProperties = {
        color: badge.color
    };

    return (
        <div
            style={chipStyle}
            title={badge.description}
        >
            <span>{badge.icon}</span>
            <span style={textStyle}>{badge.name}</span>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
        common: '#6b7280',
        uncommon: '#22c55e',
        rare: '#3b82f6',
        epic: '#8b5cf6',
        legendary: '#f59e0b'
    };
    return colors[rarity] || colors.common;
}

export default ReputationDashboard;
