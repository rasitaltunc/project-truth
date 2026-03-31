// ============================================
// SYSTEM PULSE PANEL
// Yaşayan organizmanın kalp atışı
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity, Heart, Zap, TrendingUp, AlertTriangle, Check, X,
    Clock, Users, FileText, Link2, Eye, RefreshCw, Sparkles,
    ChevronRight, Bell, Bot, Cpu, Database, GitBranch
} from 'lucide-react';
import {
    getSystemPulse,
    getActivityFeed,
    getGrowthMetrics,
    getPendingDiscoveries,
    applyDiscovery,
    rejectDiscovery,
    getSystemStats,
    type SystemPulse,
    type Activity as ActivityType,
    type GrowthMetric,
    type AutoDiscovery,
    type SystemStats
} from '@/lib/selfGrowingEngine';

// ============================================
// TYPES
// ============================================

interface Props {
    isModal?: boolean;
    onClose?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function SystemPulsePanel({ isModal = false, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<'pulse' | 'activity' | 'discoveries' | 'growth'>('pulse');
    const [pulse, setPulse] = useState<SystemPulse | null>(null);
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [discoveries, setDiscoveries] = useState<AutoDiscovery[]>([]);
    const [growth, setGrowth] = useState<GrowthMetric[]>([]);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [pulseAnimation, setPulseAnimation] = useState(false);

    // Fetch all data
    const fetchData = useCallback(async () => {
        try {
            const [pulseData, activityData, discoveryData, growthData, statsData] = await Promise.all([
                getSystemPulse(),
                getActivityFeed(30),
                getPendingDiscoveries(10),
                getGrowthMetrics(14),
                getSystemStats()
            ]);

            setPulse(pulseData);
            setActivities(activityData);
            setDiscoveries(discoveryData);
            setGrowth(growthData);
            setStats(statsData);

            // Trigger pulse animation
            setPulseAnimation(true);
            setTimeout(() => setPulseAnimation(false), 1000);

        } catch (err) {
            console.error('System pulse fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and polling
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Handle discovery actions
    const handleApproveDiscovery = async (id: string) => {
        const result = await applyDiscovery(id);
        if (result.success) {
            setDiscoveries(prev => prev.filter(d => d.id !== id));
            fetchData();
        }
    };

    const handleRejectDiscovery = async (id: string) => {
        await rejectDiscovery(id);
        setDiscoveries(prev => prev.filter(d => d.id !== id));
    };

    const content = (
        <div style={{
            backgroundColor: '#0a0a0a',
            borderRadius: isModal ? '12px' : '0',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    14% { transform: scale(1.3); }
                    28% { transform: scale(1); }
                    42% { transform: scale(1.3); }
                    70% { transform: scale(1); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 5px rgba(220, 38, 38, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.6); }
                }
                @keyframes spinPulse {
                    0% { transform: rotate(0deg) scale(1); opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { transform: rotate(360deg) scale(1); opacity: 1; }
                }
                @keyframes orbitPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(220, 38, 38, 0.4), inset 0 0 10px rgba(220, 38, 38, 0.2); }
                    50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(220, 38, 38, 0.8), inset 0 0 20px rgba(220, 38, 38, 0.4); }
                }
                @keyframes textBlink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0.3; }
                }
                @keyframes scanLine {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }
                .discovery-card:hover {
                    background-color: rgba(220, 38, 38, 0.1) !important;
                }
                .tab-btn:hover {
                    background-color: rgba(220, 38, 38, 0.2) !important;
                }
            `}</style>

            {/* HEADER */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #7f1d1d40',
                background: 'linear-gradient(180deg, #1a0505 0%, #0a0a0a 100%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#7f1d1d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: pulseAnimation ? 'heartbeat 1s ease' : 'none'
                        }}>
                            <Heart size={24} style={{ color: '#fca5a5' }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#fecaca' }}>
                                SYSTEM PULSE
                            </h2>
                            <div style={{
                                fontSize: '11px',
                                color: '#991b1b',
                                fontFamily: 'monospace',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: pulse?.healthScore && pulse.healthScore > 70 ? '#22c55e' : '#dc2626',
                                    animation: 'glow 2s ease-in-out infinite'
                                }} />
                                {pulse ? `HEALTH: ${pulse.healthScore}%` : 'CONNECTING...'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={fetchData}
                            style={{
                                padding: '8px',
                                backgroundColor: 'transparent',
                                border: '1px solid #7f1d1d40',
                                borderRadius: '4px',
                                color: '#991b1b',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={16} />
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* TABS */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '1rem'
                }}>
                    {[
                        { id: 'pulse', label: 'Pulse', icon: Activity },
                        { id: 'activity', label: 'Activity', icon: Bell, count: activities.length },
                        { id: 'discoveries', label: 'Discoveries', icon: Sparkles, count: discoveries.length },
                        { id: 'growth', label: 'Growth', icon: TrendingUp }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            className="tab-btn"
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: '8px 16px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                backgroundColor: activeTab === tab.id ? '#dc262630' : 'transparent',
                                border: `1px solid ${activeTab === tab.id ? '#dc2626' : '#7f1d1d40'}`,
                                borderRadius: '4px',
                                color: activeTab === tab.id ? '#fca5a5' : '#991b1b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span style={{
                                    padding: '2px 6px',
                                    backgroundColor: '#dc2626',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    color: '#fecaca'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                {loading ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        padding: '4rem 1.5rem',
                        minHeight: '400px',
                        gap: '2rem',
                        position: 'relative'
                    }}>
                        {/* Main Pulsing Orbital Circle */}
                        <div style={{
                            position: 'relative',
                            width: '120px',
                            height: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Outer Orbit Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                border: '2px solid #dc262630',
                                animation: 'spinPulse 3s linear infinite'
                            }} />

                            {/* Middle Orbit Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%',
                                border: '1.5px dashed #991b1b40',
                                animation: 'spinPulse 4s linear infinite reverse'
                            }} />

                            {/* Inner Pulsing Core */}
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                backgroundColor: '#1a0505',
                                border: '2px solid #dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'orbitPulse 2s ease-in-out infinite',
                                position: 'relative',
                                zIndex: 2
                            }}>
                                {/* Heart Icon Center */}
                                <Heart size={24} style={{ color: '#fca5a5' }} />
                            </div>
                        </div>

                        {/* Loading Text with Blink Effect */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                color: '#dc2626',
                                fontWeight: 'bold',
                                letterSpacing: '0.1em',
                                animation: 'textBlink 1.5s ease-in-out infinite'
                            }}>
                                SISTEM AÇILIYOR
                            </div>

                            {/* Animated Dots */}
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                height: '8px',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#dc2626',
                                    animation: 'pulse 1.4s ease-in-out 0s infinite'
                                }} />
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#dc2626',
                                    animation: 'pulse 1.4s ease-in-out 0.2s infinite'
                                }} />
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#dc2626',
                                    animation: 'pulse 1.4s ease-in-out 0.4s infinite'
                                }} />
                            </div>

                            {/* Status Text */}
                            <div style={{
                                fontSize: '11px',
                                color: '#991b1b',
                                fontFamily: 'monospace',
                                marginTop: '8px',
                                textAlign: 'center',
                                lineHeight: 1.6
                            }}>
                                <div>VERİ YÜKLENIYOR...</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>Lütfen bekleyiniz</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* PULSE TAB */}
                        {activeTab === 'pulse' && pulse && stats && (
                            <div>
                                {/* Main Stats Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: '1rem',
                                    marginBottom: '2rem'
                                }}>
                                    <StatCard
                                        icon={Database}
                                        label="Total Nodes"
                                        value={stats.totalNodes}
                                        color="#dc2626"
                                    />
                                    <StatCard
                                        icon={GitBranch}
                                        label="Connections"
                                        value={stats.totalConnections}
                                        color="#f59e0b"
                                    />
                                    <StatCard
                                        icon={FileText}
                                        label="Evidence"
                                        value={stats.totalEvidence}
                                        color="#3b82f6"
                                    />
                                    <StatCard
                                        icon={Users}
                                        label="Users"
                                        value={stats.totalUsers}
                                        color="#22c55e"
                                    />
                                </div>

                                {/* Processing Stats */}
                                <h3 style={{
                                    fontSize: '12px',
                                    color: '#991b1b',
                                    fontFamily: 'monospace',
                                    marginBottom: '1rem'
                                }}>
                                    PROCESSING ENGINE
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '1rem',
                                    marginBottom: '2rem'
                                }}>
                                    <MiniStatCard
                                        label="Queue Depth"
                                        value={pulse.queueDepth}
                                        icon={Cpu}
                                        status={pulse.queueDepth > 10 ? 'warning' : 'ok'}
                                    />
                                    <MiniStatCard
                                        label="Active Jobs"
                                        value={pulse.activeJobs}
                                        icon={Zap}
                                        status={pulse.activeJobs > 0 ? 'active' : 'idle'}
                                    />
                                    <MiniStatCard
                                        label="Rate/Hour"
                                        value={pulse.processingRate}
                                        icon={TrendingUp}
                                        status="ok"
                                    />
                                </div>

                                {/* Today's Stats */}
                                <h3 style={{
                                    fontSize: '12px',
                                    color: '#991b1b',
                                    fontFamily: 'monospace',
                                    marginBottom: '1rem'
                                }}>
                                    TODAY'S ACTIVITY
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '2rem',
                                    padding: '1rem',
                                    backgroundColor: '#0f0505',
                                    borderRadius: '8px',
                                    border: '1px solid #7f1d1d20'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
                                            {pulse.completedToday}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                                            COMPLETED
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
                                            {pulse.failedToday}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                                            FAILED
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                                            {stats.pendingVerifications}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                                            PENDING
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a855f7' }}>
                                            {stats.autoDiscoveries}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                                            DISCOVERIES
                                        </div>
                                    </div>
                                </div>

                                {/* Health Bar */}
                                <div style={{ marginTop: '2rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{ fontSize: '11px', color: '#991b1b', fontFamily: 'monospace' }}>
                                            SYSTEM HEALTH
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            color: pulse.healthScore > 70 ? '#22c55e' : pulse.healthScore > 40 ? '#f59e0b' : '#ef4444',
                                            fontFamily: 'monospace',
                                            fontWeight: 'bold'
                                        }}>
                                            {pulse.healthScore}%
                                        </span>
                                    </div>
                                    <div style={{
                                        height: '8px',
                                        backgroundColor: '#1a0505',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${pulse.healthScore}%`,
                                            height: '100%',
                                            backgroundColor: pulse.healthScore > 70 ? '#22c55e' : pulse.healthScore > 40 ? '#f59e0b' : '#ef4444',
                                            borderRadius: '4px',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY TAB */}
                        {activeTab === 'activity' && (
                            <div>
                                {activities.length === 0 ? (
                                    <EmptyState message="No recent activity" />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activities.map((activity, index) => (
                                            <ActivityCard key={activity.id} activity={activity} index={index} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DISCOVERIES TAB */}
                        {activeTab === 'discoveries' && (
                            <div>
                                {discoveries.length === 0 ? (
                                    <EmptyState message="No pending discoveries" />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {discoveries.map((discovery, index) => (
                                            <DiscoveryCard
                                                key={discovery.id}
                                                discovery={discovery}
                                                index={index}
                                                onApprove={() => handleApproveDiscovery(discovery.id)}
                                                onReject={() => handleRejectDiscovery(discovery.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GROWTH TAB */}
                        {activeTab === 'growth' && (
                            <div>
                                <GrowthChart data={growth} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    // Modal positioning is now handled by the parent component (page.tsx) to prevent z-index wars
    return content;
}


// ============================================
// SUB COMPONENTS
// ============================================

function StatCard({ icon: Icon, label, value, color }: {
    icon: any;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div style={{
            padding: '1rem',
            backgroundColor: '#0f0505',
            borderRadius: '8px',
            border: '1px solid #7f1d1d20'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={16} style={{ color }} />
                <span style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                    {label.toUpperCase()}
                </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fecaca' }}>
                {value.toLocaleString()}
            </div>
        </div>
    );
}

function MiniStatCard({ label, value, icon: Icon, status }: {
    label: string;
    value: number;
    icon: any;
    status: 'ok' | 'warning' | 'active' | 'idle';
}) {
    const colors = {
        ok: '#22c55e',
        warning: '#f59e0b',
        active: '#3b82f6',
        idle: '#6b7280'
    };

    return (
        <div style={{
            padding: '1rem',
            backgroundColor: '#0f0505',
            borderRadius: '8px',
            border: `1px solid ${colors[status]}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
            <Icon size={20} style={{ color: colors[status] }} />
            <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fecaca' }}>
                    {value}
                </div>
                <div style={{ fontSize: '9px', color: '#991b1b', fontFamily: 'monospace' }}>
                    {label.toUpperCase()}
                </div>
            </div>
        </div>
    );
}

function ActivityCard({ activity, index }: { activity: ActivityType; index: number }) {
    const getActivityIcon = (type: string) => {
        const icons: Record<string, any> = {
            document_submitted: FileText,
            document_analyzed: Bot,
            entity_created: Users,
            connection_created: Link2,
            evidence_added: FileText,
            verification_completed: Check,
            auto_discovery: Sparkles,
            job_completed: Check,
            job_failed: AlertTriangle,
            user_joined: Users,
            system_event: Cpu
        };
        return icons[type] || Activity;
    };

    const Icon = getActivityIcon(activity.type);
    const date = new Date(activity.createdAt);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            backgroundColor: '#0f0505',
            borderRadius: '6px',
            border: '1px solid #7f1d1d20',
            animation: `slideIn 0.2s ease ${index * 0.03}s both`
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#7f1d1d30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={14} style={{ color: '#fca5a5' }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#e5e5e5' }}>
                    {activity.message}
                </div>
                <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                    {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}

function DiscoveryCard({ discovery, index, onApprove, onReject }: {
    discovery: AutoDiscovery;
    index: number;
    onApprove: () => void;
    onReject: () => void;
}) {
    const getTypeIcon = (type: string) => {
        const icons: Record<string, any> = {
            entity: Users,
            connection: Link2,
            pattern: GitBranch,
            anomaly: AlertTriangle
        };
        return icons[type] || Sparkles;
    };

    const Icon = getTypeIcon(discovery.type);

    return (
        <div
            className="discovery-card"
            style={{
                padding: '1rem',
                backgroundColor: '#0f0505',
                borderRadius: '8px',
                border: '1px solid #7f1d1d40',
                animation: `slideIn 0.2s ease ${index * 0.05}s both`,
                transition: 'background-color 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} style={{ color: '#dc2626' }} />
                    <span style={{
                        fontSize: '9px',
                        padding: '2px 8px',
                        backgroundColor: '#dc262620',
                        color: '#fca5a5',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                    }}>
                        {discovery.type.toUpperCase()}
                    </span>
                    <span style={{
                        fontSize: '9px',
                        color: discovery.confidence > 70 ? '#22c55e' : '#f59e0b',
                        fontFamily: 'monospace'
                    }}>
                        %{discovery.confidence} GÜVENİLİRLİK
                    </span>
                </div>
            </div>

            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fecaca' }}>
                {discovery.title}
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#a8a8a8', lineHeight: 1.4 }}>
                {discovery.description}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onApprove}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#22c55e20',
                        border: '1px solid #22c55e40',
                        borderRadius: '4px',
                        color: '#22c55e',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <Check size={14} />
                    ONAYLA
                </button>
                <button
                    onClick={onReject}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid #7f1d1d40',
                        borderRadius: '4px',
                        color: '#991b1b',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <X size={14} />
                    REDDET
                </button>
            </div>
        </div>
    );
}

function GrowthChart({ data }: { data: GrowthMetric[] }) {
    if (data.length === 0) {
        return <EmptyState message="No growth data available" />;
    }

    const maxValue = Math.max(
        ...data.flatMap(d => [d.newNodes, d.newConnections, d.newEvidence])
    ) || 1;

    return (
        <div>
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1rem',
                fontSize: '10px',
                fontFamily: 'monospace'
            }}>
                <span style={{ color: '#dc2626' }}>● Nodes</span>
                <span style={{ color: '#f59e0b' }}>● Connections</span>
                <span style={{ color: '#3b82f6' }}>● Evidence</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '200px' }}>
                {data.map((day, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                        }}
                    >
                        <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '160px' }}>
                            <div style={{
                                width: '8px',
                                height: `${(day.newNodes / maxValue) * 100}%`,
                                backgroundColor: '#dc2626',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.newNodes > 0 ? '4px' : '0'
                            }} />
                            <div style={{
                                width: '8px',
                                height: `${(day.newConnections / maxValue) * 100}%`,
                                backgroundColor: '#f59e0b',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.newConnections > 0 ? '4px' : '0'
                            }} />
                            <div style={{
                                width: '8px',
                                height: `${(day.newEvidence / maxValue) * 100}%`,
                                backgroundColor: '#3b82f6',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.newEvidence > 0 ? '4px' : '0'
                            }} />
                        </div>
                        <span style={{
                            fontSize: '8px',
                            color: '#991b1b',
                            fontFamily: 'monospace',
                            transform: 'rotate(-45deg)',
                            whiteSpace: 'nowrap'
                        }}>
                            {new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#0f0505',
                borderRadius: '8px',
                border: '1px solid #7f1d1d20'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#991b1b', fontFamily: 'monospace' }}>
                    LAST 14 DAYS SUMMARY
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                            +{data.reduce((sum, d) => sum + d.newNodes, 0)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                            NEW NODES
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                            +{data.reduce((sum, d) => sum + d.newConnections, 0)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                            NEW CONNECTIONS
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                            +{data.reduce((sum, d) => sum + d.newEvidence, 0)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#991b1b', fontFamily: 'monospace' }}>
                            NEW EVIDENCE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            color: '#991b1b'
        }}>
            <Eye size={48} style={{ opacity: 0.3 }} />
            <p style={{ marginTop: '1rem', fontFamily: 'monospace' }}>{message}</p>
        </div>
    );
}

export default SystemPulsePanel;
