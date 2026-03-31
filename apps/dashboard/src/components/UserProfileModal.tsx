// ============================================
// TRUTH PROTOCOL - User Profile Modal
// Kullanıcı profili ve tüm özelliklere erişim
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Shield, Trophy, Clock, Settings,
    ChevronRight, ExternalLink, Copy, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ReputationDashboard } from './ReputationDashboard';
import { DeadManSwitchPanel } from './DeadManSwitchPanel';
import { getUserStats, UserStats } from '@/lib/reputation';

// ============================================
// TYPES
// ============================================

type TabType = 'overview' | 'reputation' | 'protection' | 'settings';

// ============================================
// MAIN MODAL
// ============================================

export function UserProfileModal({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { user, trustLevel, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user?.id && isOpen) {
            getUserStats(user.id).then(setStats);
        }
    }, [user?.id, isOpen]);

    const copyAnonymousId = () => {
        if (user?.anonymous_id) {
            navigator.clipboard.writeText(user.anonymous_id || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen || !user) return null;

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'reputation', label: 'Reputation', icon: Trophy },
        { id: 'protection', label: 'Protection', icon: Shield },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                }}
                onClick={onClose}
            >
                {/* Backdrop */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    backdropFilter: 'blur(8px)'
                }} />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #7f1d1d',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 0 80px rgba(127, 29, 29, 0.3), inset 0 0 80px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Top Banner */}
                    <div style={{
                        height: '32px',
                        background: 'linear-gradient(90deg, #450a0a 0%, #7f1d1d 50%, #450a0a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px'
                    }}>
                        <span style={{ fontSize: '9px', letterSpacing: '0.3em', color: '#fecaca80' }}>
                            ◉ KULLANICI PROFİLİ
                        </span>
                        <span style={{ fontSize: '9px', letterSpacing: '0.5em', color: '#fecaca', fontWeight: 'bold' }}>
                            TRUTH PROTOCOL
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fecaca',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Header */}
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #7f1d1d40',
                        background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Avatar */}
                                <div
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        backgroundColor: `${trustLevel?.color}20`,
                                        border: `2px solid ${trustLevel?.color}`
                                    }}
                                >
                                    {trustLevel?.icon}
                                </div>

                                {/* Info */}
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                                        {user.display_name || user.anonymous_id?.split('_')[0] || 'Anonim'}
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <code style={{
                                            fontSize: '12px',
                                            color: '#dc2626',
                                            backgroundColor: '#7f1d1d20',
                                            padding: '2px 8px',
                                            border: '1px solid #7f1d1d40'
                                        }}>
                                            {user.anonymous_id || 'N/A'}
                                        </code>
                                        <button
                                            onClick={copyAnonymousId}
                                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                                        >
                                            {copied ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                backgroundColor: `${trustLevel?.color}20`,
                                                color: trustLevel?.color,
                                                border: `1px solid ${trustLevel?.color}40`
                                            }}
                                        >
                                            {trustLevel?.icon} {trustLevel?.name}
                                        </span>
                                        {stats && (
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                                #{stats.rank} sırada
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '1.5rem', borderBottom: '1px solid #7f1d1d30' }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 16px',
                                        backgroundColor: activeTab === tab.id ? '#7f1d1d20' : 'transparent',
                                        border: 'none',
                                        borderBottom: activeTab === tab.id ? '2px solid #dc2626' : '2px solid transparent',
                                        color: activeTab === tab.id ? '#ffffff' : '#6b7280',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.05em',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <OverviewTab user={user} stats={stats} trustLevel={trustLevel} />
                                </motion.div>
                            )}

                            {activeTab === 'reputation' && (
                                <motion.div
                                    key="reputation"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <ReputationDashboard />
                                </motion.div>
                            )}

                            {activeTab === 'protection' && (
                                <motion.div
                                    key="protection"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <DeadManSwitchPanel />
                                </motion.div>
                            )}

                            {activeTab === 'settings' && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <SettingsTab user={user} onLogout={logout} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================
// OVERVIEW TAB
// ============================================

function OverviewTab({
    user,
    stats,
    trustLevel
}: {
    user: any;
    stats: UserStats | null;
    trustLevel: any;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <QuickStat label="İtibar Puanı" value={user.reputation_score || 0} icon="⭐" />
                <QuickStat label="Katkı Sayısı" value={user.contributions_count || 0} icon="📝" />
                <QuickStat label="Doğrulanmış" value={user.verified_contributions || 0} icon="✓" />
                <QuickStat label="Rozet" value={stats?.badges?.length || 0} icon="🏆" />
            </div>

            {/* Trust Level Progress */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#7f1d1d10',
                border: '1px solid #7f1d1d40'
            }}>
                <h3 style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    GÜVEN SEVİYESİ İLERLEMESİ
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {[0, 1, 2, 3, 4].map(level => {
                        const levelInfo = {
                            0: { icon: '👤', name: 'Anonymous' },
                            1: { icon: '✓', name: 'Human' },
                            2: { icon: '👁️', name: 'Witness' },
                            3: { icon: '🔑', name: 'Insider' },
                            4: { icon: '⭐', name: 'Named' },
                        }[level];
                        const isCompleted = user.trust_level >= level;
                        const isCurrent = user.trust_level === level;

                        return (
                            <React.Fragment key={level}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem',
                                            backgroundColor: isCompleted ? '#dc262620' : '#1a1a1a',
                                            border: isCompleted ? '2px solid #dc2626' : '2px solid #333',
                                            boxShadow: isCurrent ? '0 0 0 3px #dc262640' : 'none'
                                        }}
                                    >
                                        {levelInfo?.icon}
                                    </div>
                                    <span style={{
                                        fontSize: '10px',
                                        marginTop: '0.5rem',
                                        color: isCompleted ? '#dc2626' : '#4b5563'
                                    }}>
                                        {levelInfo?.name}
                                    </span>
                                </div>
                                {level < 4 && (
                                    <div style={{
                                        flex: 1,
                                        height: '2px',
                                        backgroundColor: isCompleted ? '#dc2626' : '#333'
                                    }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#7f1d1d10',
                border: '1px solid #7f1d1d40'
            }}>
                <h3 style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    SON AKTİVİTELER
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <ActivityItem icon="📝" text="Kanıt gönderildi" time="2 saat önce" />
                    <ActivityItem icon="✓" text="Kanıt doğrulandı" time="5 saat önce" />
                    <ActivityItem icon="🏆" text="Yeni rozet kazanıldı: İlk Adım" time="1 gün önce" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab({
    user,
    onLogout
}: {
    user: any;
    onLogout: () => void;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Account Info */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#7f1d1d10',
                border: '1px solid #7f1d1d40'
            }}>
                <h3 style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    HESAP BİLGİLERİ
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <SettingRow label="Anonymous ID" value={user.anonymous_id || 'N/A'} />
                    <SettingRow label="Display Name" value={user.display_name || '-'} />
                    <SettingRow label="Language" value={user.preferred_language === 'tr' ? 'Türkçe' : 'English'} />
                    <SettingRow label="Joined" value={new Date(user.created_at).toLocaleDateString('tr-TR')} />
                </div>
            </div>

            {/* Privacy */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#7f1d1d10',
                border: '1px solid #7f1d1d40'
            }}>
                <h3 style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    GİZLİLİK
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ color: '#fff', fontSize: '12px' }}>Anonim Profil</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Gerçek kimliğiniz gizli</div>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '20px',
                            backgroundColor: '#22c55e20',
                            borderRadius: '10px',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: '2px',
                                top: '2px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#22c55e',
                                borderRadius: '50%'
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ color: '#fff', fontSize: '12px' }}>Şifreli İletişim</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>E2E şifreleme aktif</div>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '20px',
                            backgroundColor: '#22c55e20',
                            borderRadius: '10px',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: '2px',
                                top: '2px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#22c55e',
                                borderRadius: '50%'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#dc262610',
                border: '1px solid #dc262640'
            }}>
                <h3 style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    TEHLİKELİ BÖLGE
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={onLogout}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Çıkış Yap
                    </button>
                    <button
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#dc262610',
                            border: '1px solid #dc262640',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Hesabı Sil
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function QuickStat({ label, value, icon }: { label: string; value: number; icon: string; }) {
    return (
        <div style={{
            padding: '1rem',
            backgroundColor: '#7f1d1d10',
            border: '1px solid #7f1d1d40'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span>{icon}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                {value.toLocaleString()}
            </div>
        </div>
    );
}

function ActivityItem({ icon, text, time }: { icon: string; text: string; time: string; }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '12px' }}>
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            <span style={{ flex: 1, color: '#d1d5db' }}>{text}</span>
            <span style={{ color: '#6b7280', fontSize: '10px' }}>{time}</span>
        </div>
    );
}

function SettingRow({ label, value }: { label: string; value: string; }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #7f1d1d20'
        }}>
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>{label}</span>
            <span style={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}>{value}</span>
        </div>
    );
}

export default UserProfileModal;
