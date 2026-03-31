// ============================================
// TRUTH PROTOCOL - Profile Panel
// Sprint 6A: Badge, Reputation, Leaderboard, Nominations
// ============================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Shield, BarChart2, Clock, Users, ClipboardList, ChevronRight, Zap, FileText, Target, Lock, Inbox } from 'lucide-react';
import { useBadgeStore, getBadgeTier } from '@/store/badgeStore';
import BadgeDisplay from './BadgeDisplay';
import BadgeUpgradePanel from './BadgeUpgradePanel';
import LeaderboardPanel from './LeaderboardPanel';
import ReputationHistory from './ReputationHistory';
import NominationModal from './NominationModal';
import EvidenceReviewQueue from './EvidenceReviewQueue';

// ============================================
// TYPES
// ============================================

type Tab = 'progress' | 'leaderboard' | 'history' | 'nominations';

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    networkId?: string;
}

// ============================================
// TAB CONFIG
// ============================================

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'progress',     label: 'PROGRESS',  icon: <Shield size={12} /> },
    { id: 'leaderboard',  label: 'LEADERBOARD',  icon: <BarChart2 size={12} /> },
    { id: 'history',      label: 'HISTORY',   icon: <Clock size={12} /> },
    { id: 'nominations',  label: 'NOMINATIONS',   icon: <Users size={12} /> },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfilePanel({ isOpen, onClose, networkId }: ProfilePanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('progress');
    const [showReviewQueue, setShowReviewQueue] = useState(false);
    const [showNominationModal, setShowNominationModal] = useState(false);
    const [pendingCount, setPendingCount] = useState<number | null>(null);

    const {
        userFingerprint,
        globalBadge,
        reputation,
        fetchReputation,
        fetchReputationHistory,
        fetchLeaderboard,
        fetchNominations,
        canDoAction,
        getEffectiveTier,
        isLoadingBadge,
    } = useBadgeStore();

    const tierId = globalBadge?.badge_tier || 'anonymous';
    const tierInfo = getBadgeTier(tierId);
    const effectiveTier = getEffectiveTier(networkId);
    const canReview = canDoAction('verify_evidence', networkId);
    const canNominate = canDoAction('nominate', networkId);

    const totalScore = reputation?.score ?? 0;
    const contributionCount = reputation?.verified_contributions ?? 0;
    const accuracyRate = reputation?.accuracy_rate ?? 0;

    const shortFp = userFingerprint
        ? userFingerprint.substring(0, 16) + '...'
        : 'ANON';

    // Fetch data when panel opens
    useEffect(() => {
        if (isOpen && userFingerprint) {
            fetchReputation(userFingerprint);
            fetchReputationHistory(userFingerprint, 30);
            fetchLeaderboard(networkId);
            fetchNominations(userFingerprint);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userFingerprint, networkId]);

    // Fetch pending evidence count for review badge
    useEffect(() => {
        if (isOpen && canReview) {
            fetch('/api/evidence/pending')
                .then(r => r.json())
                .then(d => setPendingCount(d?.evidence?.length ?? 0))
                .catch(() => setPendingCount(0));
        }
    }, [isOpen, canReview]);

    // ESC key to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showReviewQueue) { setShowReviewQueue(false); return; }
                if (showNominationModal) { setShowNominationModal(false); return; }
                onClose();
            }
        };
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, showReviewQueue, showNominationModal, onClose]);

    if (!isOpen) return null;

    const tierColor = effectiveTier?.color || '#6b7280';

    return (
        <>
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulseGlow6A {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>

            {/* === OVERLAY === */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 75,
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* === PANEL === */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '420px',
                zIndex: 80,
                backgroundColor: 'rgba(5, 5, 5, 0.98)',
                borderLeft: `1px solid ${tierColor}40`,
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.3s ease-out',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                overflow: 'hidden',
            }}>

                {/* ── HEADER ── */}
                <div style={{
                    padding: '20px',
                    borderBottom: `1px solid ${tierColor}20`,
                    background: `linear-gradient(180deg, ${tierColor}08, transparent)`,
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '9px', color: tierColor, letterSpacing: '0.3em', fontWeight: 700, marginBottom: '16px' }}>
                            KULLANICI PROFİLİ
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none', border: 'none',
                                color: '#6b7280', cursor: 'pointer', padding: '4px',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#e5e5e5')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Badge + Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <BadgeDisplay
                            tierId={tierId}
                            size="lg"
                            reputation={totalScore}
                            accuracy={accuracyRate}
                            showTooltip={true}
                            showLabel={false}
                            showStats={false}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Tier Name */}
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: tierColor,
                                letterSpacing: '0.05em',
                                marginBottom: '4px',
                            }}>
                                {effectiveTier?.name_tr || 'ANONİM'}
                            </div>
                            {/* Fingerprint */}
                            <div style={{
                                fontSize: '10px',
                                color: '#4b5563',
                                letterSpacing: '0.05em',
                                marginBottom: '8px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                ID: {shortFp}
                            </div>
                            {/* Stats row */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <StatPill icon={<Zap size={10} />} value={totalScore} label="PUAN" color={tierColor} />
                                <StatPill icon={<FileText size={10} />} value={contributionCount} label="KATKI" color="#6b7280" />
                                {accuracyRate > 0 && (
                                    <StatPill icon={<Target size={10} />} value={`${(accuracyRate * 100).toFixed(0)}%`} label="DOĞRULUK" color="#6b7280" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #1a1a1a',
                    backgroundColor: '#030303',
                    flexShrink: 0,
                }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1,
                                    padding: '10px 4px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: isActive ? `2px solid ${tierColor}` : '2px solid transparent',
                                    color: isActive ? tierColor : '#4b5563',
                                    fontSize: '9px',
                                    letterSpacing: '0.1em',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontFamily: 'inherit',
                                    backgroundColor: isActive ? `${tierColor}08` : 'transparent',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.color = '#999';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.color = '#4b5563';
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── TAB CONTENT ── */}
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                    {activeTab === 'progress' && (
                        <div style={{ padding: '0' }}>
                            <BadgeUpgradePanel
                                networkId={networkId}
                                onClose={onClose}
                            />
                        </div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <div style={{ padding: '0' }}>
                            <LeaderboardPanel
                                networkId={networkId}
                                limit={20}
                                compact={true}
                            />
                        </div>
                    )}

                    {activeTab === 'history' && userFingerprint && (
                        <div style={{ padding: '0' }}>
                            <ReputationHistory
                                fingerprint={userFingerprint}
                                networkId={networkId}
                                limit={30}
                                compact={true}
                            />
                        </div>
                    )}

                    {activeTab === 'nominations' && (
                        <NominationsTab
                            networkId={networkId}
                            canNominate={canNominate}
                            onOpenModal={() => setShowNominationModal(true)}
                        />
                    )}
                </div>

                {/* ── EVIDENCE REVIEW QUEUE BANNER (Tier 2+) ── */}
                {canReview && (
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid #1a1a1a',
                        flexShrink: 0,
                        backgroundColor: '#030303',
                    }}>
                        <button
                            onClick={() => setShowReviewQueue(true)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #f59e0b30',
                                color: '#f59e0b',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: 'inherit',
                                fontSize: '10px',
                                letterSpacing: '0.1em',
                                fontWeight: 700,
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = '#0f0f0f';
                                e.currentTarget.style.borderColor = '#f59e0b60';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.15)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = '#0a0a0a';
                                e.currentTarget.style.borderColor = '#f59e0b30';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardList size={14} />
                                <span>İNCELEME KUYRUĞU</span>
                                {pendingCount !== null && pendingCount > 0 && (
                                    <span style={{
                                        backgroundColor: '#f59e0b',
                                        color: '#000',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        animation: 'pulseGlow6A 2s infinite',
                                    }}>
                                        {pendingCount}
                                    </span>
                                )}
                                {pendingCount === 0 && (
                                    <span style={{ fontSize: '9px', color: '#4b5563' }}>— temiz</span>
                                )}
                            </div>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── EVIDENCE REVIEW QUEUE MODAL ── */}
            {showReviewQueue && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                }}>
                    <div
                        onClick={() => setShowReviewQueue(false)}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
                    />
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #f59e0b40',
                        borderTop: '3px solid #f59e0b',
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        {/* Modal header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #1a1a1a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardList size={16} style={{ color: '#f59e0b' }} />
                                <span style={{ fontSize: '11px', color: '#f59e0b', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                                    KANIT İNCELEME KUYRUĞU
                                </span>
                            </div>
                            <button
                                onClick={() => setShowReviewQueue(false)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <EvidenceReviewQueue networkId={networkId} onClose={() => setShowReviewQueue(false)} />
                    </div>
                </div>
            )}

            {/* ── NOMINATION MODAL ── */}
            {showNominationModal && (
                <NominationModal
                    networkId={networkId || 'default'}
                    onClose={() => setShowNominationModal(false)}
                />
            )}
        </>
    );
}

// ============================================
// HELPER: Stat Pill
// ============================================

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color, opacity: 0.8, display: 'flex' }}>{icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color, letterSpacing: '0.02em' }}>{value}</span>
            <span style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.05em' }}>{label}</span>
        </div>
    );
}

// ============================================
// HELPER: Nominations Tab Content
// ============================================

function NominationsTab({
    networkId,
    canNominate,
    onOpenModal,
}: {
    networkId?: string;
    canNominate: boolean;
    onOpenModal: () => void;
}) {
    const { pendingNominations, sentNominations, userFingerprint } = useBadgeStore();

    const incoming = pendingNominations || [];
    const outgoing = sentNominations || [];

    return (
        <div style={{ padding: '16px' }}>
            {/* Nominate Button (if eligible) */}
            {canNominate ? (
                <button
                    onClick={onOpenModal}
                    style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '16px',
                        backgroundColor: '#f59e0b15',
                        border: '1px solid #f59e0b40',
                        color: '#f59e0b',
                        fontSize: '11px',
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#f59e0b25';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.2)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#f59e0b15';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <Users size={14} />
                    + YENİ ADAY GÖSTER
                </button>
            ) : (
                <div style={{
                    padding: '12px',
                    marginBottom: '16px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    fontSize: '10px',
                    color: '#4b5563',
                    letterSpacing: '0.05em',
                    textAlign: 'center',
                }}>
                    <Lock size={10} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Aday göstermek için Platform Kurdu seviyesi gerekli
                </div>
            )}

            {/* Incoming Nominations */}
            {incoming.length > 0 && (
                <section style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 700 }}>
                        GELEN ADAYLIKLAR ({incoming.length})
                    </div>
                    {incoming.map((nom: any) => (
                        <NominationRow key={nom.id} nomination={nom} type="incoming" />
                    ))}
                </section>
            )}

            {/* Outgoing Nominations */}
            {outgoing.length > 0 && (
                <section>
                    <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 700 }}>
                        GÖNDERİLEN ADAYLIKLAR ({outgoing.length})
                    </div>
                    {outgoing.map((nom: any) => (
                        <NominationRow key={nom.id} nomination={nom} type="outgoing" />
                    ))}
                </section>
            )}

            {incoming.length === 0 && outgoing.length === 0 && (
                <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#2a2a2a',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                }}>
                    <Inbox size={20} style={{ marginBottom: '8px', opacity: 0.3, margin: '0 auto 8px' }} />
                    Henüz adaylık yok
                </div>
            )}
        </div>
    );
}

function NominationRow({ nomination, type }: { nomination: any; type: 'incoming' | 'outgoing' }) {
    const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        approved: '#10b981',
        rejected: '#ef4444',
    };
    const statusColor = statusColors[nomination.status] || '#6b7280';
    const fp = type === 'incoming' ? nomination.nominator_fingerprint : nomination.nominee_fingerprint;
    const shortFp = fp ? fp.substring(0, 12) + '...' : '?';

    return (
        <div style={{
            padding: '10px 12px',
            marginBottom: '6px',
            backgroundColor: '#0a0a0a',
            border: `1px solid ${statusColor}20`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
        }}>
            <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                flexShrink: 0,
                marginTop: '3px',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', color: '#e5e5e5', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shortFp}
                </div>
                {nomination.reason && (
                    <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {nomination.reason}
                    </div>
                )}
            </div>
            <div style={{ fontSize: '8px', color: statusColor, letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>
                {nomination.status?.toUpperCase()}
            </div>
        </div>
    );
}
