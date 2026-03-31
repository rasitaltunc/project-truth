'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, AlertTriangle, Fingerprint, Scale, FileText, Users, Clock,
    ExternalLink, Shield, ShieldCheck, ShieldAlert, ShieldQuestion,
    Globe, Lightbulb, ChevronRight, Link2, MapPin, Calendar,
    ThumbsUp, ThumbsDown, Flag, Award, Building2, UserCheck
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useThreadingStore } from '@/store/threadingStore';
import EvidenceSubmitModal from './EvidenceSubmitModal';

// ============================================
// TIER LABELS MAPPING
// ============================================
const TIER_LABELS: Record<number, string> = {
    1: '1 — MASTERMIND',
    2: '2 — KEY PLAYER',
    3: '3 — CONNECTED',
    4: '4 — PERIPHERAL'
};

// ============================================
// TYPES
// ============================================
interface ArchiveNode {
    id: string;
    label: string;
    img?: string | null;
    type?: string;
    tier?: number;
    risk?: number;
    is_alive?: boolean;
    role?: string;
    summary?: string;
    nationality?: string;
    occupation?: string;
    birth_date?: string;
    death_date?: string;
    country_tags?: string[];
    verification_level?: 'unverified' | 'community' | 'journalist' | 'official';
    connections?: Array<{
        id: string;
        label: string;
        type: string;
        strength: number;
    }>;
    evidence?: Array<{
        id: string;
        title: string;
        evidence_type: string;
        description?: string;
        source_name: string;
        source_url?: string;
        source_date?: string;
        verification_status: string;
        is_primary_source?: boolean;
        country_tags?: string[];
        language?: string;
    }>;
    timeline?: Array<{
        id: string;
        event_date: string;
        event_type: string;
        title: string;
        description?: string;
        location?: string;
        source_url?: string;
        is_verified?: boolean;
        importance?: string;
    }>;
}

type TabType = 'overview' | 'connections' | 'evidence' | 'timeline';

// ============================================
// DAKTILO EFEKTI
// ============================================
const TypewriterText = ({ text, speed = 15 }: { text: string; speed?: number }) => {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
            else clearInterval(interval);
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);
    return <span>{displayed}<span className="animate-pulse text-red-500">█</span></span>;
};

// ============================================
// VERIFICATION BADGE
// ============================================
const VerificationBadge = ({ level }: { level?: string }) => {
    const config = {
        official: { icon: ShieldCheck, color: '#22c55e', label: 'OFFICIAL VERIFICATION', bg: '#22c55e20' },
        journalist: { icon: Shield, color: '#3b82f6', label: 'JOURNALIST VERIFICATION', bg: '#3b82f620' },
        community: { icon: ShieldQuestion, color: '#f59e0b', label: 'COMMUNITY', bg: '#f59e0b20' },
        unverified: { icon: ShieldAlert, color: '#6b7280', label: 'UNVERIFIED', bg: '#6b728020' },
    };
    const cfg = config[level as keyof typeof config] || config.unverified;
    const Icon = cfg.icon;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.color}40`,
            borderRadius: '4px',
            fontSize: '9px',
            color: cfg.color,
            letterSpacing: '0.1em',
            fontWeight: 600
        }}>
            <Icon size={12} />
            {cfg.label}
        </div>
    );
};

// ============================================
// SOURCE OF TRUTH BADGE (C3)
// ============================================
const SourceOfTruthBadge = ({ source }: { source?: string }) => {
    const config: Record<string, { icon: any; color: string; label: string; bg: string }> = {
        official: { icon: Building2, color: '#22c55e', label: 'OFFICIAL DOCUMENT', bg: '#22c55e15' },
        court: { icon: Scale, color: '#3b82f6', label: 'COURT RECORD', bg: '#3b82f615' },
        journalist: { icon: Shield, color: '#a855f7', label: 'JOURNALIST INVESTIGATION', bg: '#a855f715' },
        community_verified: { icon: UserCheck, color: '#f59e0b', label: 'COMMUNITY APPROVED', bg: '#f59e0b15' },
    };
    const cfg = config[source || ''] || config.official;
    const Icon = cfg.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30`,
            borderRadius: '3px', fontSize: '9px', color: cfg.color, letterSpacing: '0.05em', fontWeight: 600
        }}>
            <Icon size={10} /> {cfg.label}
        </span>
    );
};

// ============================================
// COMMUNITY EVIDENCE CARD
// ============================================
interface CommunityEvidence {
    id: string;
    node_id: string;
    evidence_type: string;
    title: string;
    description?: string;
    source_name: string;
    source_url?: string;
    submitted_by: string;
    status: 'pending' | 'rejected' | 'promoted';
    vote_count: number;
    vote_weight: number;
    helpful_count?: number;
    created_at: string;
}

const CommunityEvidenceCard = ({ ev, index }: { ev: CommunityEvidence; index: number }) => {
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState<string | null>(null);

    const handleVote = async (voteType: 'helpful' | 'not_helpful' | 'flag') => {
        setVoting(true);
        try {
            const res = await fetch('/api/community/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    community_evidence_id: ev.id,
                    voter_id: 'anonymous_voter', // TODO: real user id
                    vote_type: voteType,
                }),
            });
            const data = await res.json();
            if (res.ok) setVoted(voteType);
        } catch (err: any) {
            console.error('🗳️ CLIENT: Vote error', err.message);
        }
        setVoting(false);
    };

    const typeLabels: Record<string, string> = {
        document: 'DOCUMENT', legal: 'LEGAL', media: 'MEDIA', photo: 'PHOTO',
        video: 'VIDEO', testimony: 'TESTIMONY', news: 'NEWS', financial: 'FINANCIAL',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
                backgroundColor: '#080808',
                border: '1px solid #f59e0b20',
                borderLeft: '3px solid #f59e0b40',
                padding: '1rem',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                            fontSize: '9px', padding: '2px 6px', backgroundColor: '#f59e0b20',
                            color: '#f59e0b', borderRadius: '2px', letterSpacing: '0.05em'
                        }}>
                            {typeLabels[ev.evidence_type] || ev.evidence_type?.toUpperCase()}
                        </span>
                        <span style={{
                            fontSize: '9px', padding: '2px 6px', backgroundColor: '#ffffff08',
                            color: '#6b7280', borderRadius: '2px'
                        }}>
                            👥 COMMUNITY
                        </span>
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>{ev.title}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b' }}>
                    <Award size={12} />
                    {ev.vote_weight?.toFixed(1) || '0'}
                </div>
            </div>

            {ev.description && (
                <div style={{
                    fontSize: '12px', color: '#9ca3af', lineHeight: 1.5,
                    marginBottom: '10px', paddingLeft: '8px', borderLeft: '2px solid #f59e0b20'
                }}>
                    {ev.description}
                </div>
            )}

            {/* Footer with votes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>📰 {ev.source_name}</span>
                    <span style={{ fontSize: '10px', color: '#6b727080' }}>
                        {new Date(ev.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {ev.source_url && (
                        <a href={ev.source_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink size={10} />
                        </a>
                    )}
                    <button onClick={() => handleVote('helpful')} disabled={voting || voted !== null}
                        style={{
                            background: voted === 'helpful' ? '#22c55e20' : 'none', border: `1px solid ${voted === 'helpful' ? '#22c55e' : '#333'}`,
                            borderRadius: '3px', padding: '4px 8px', cursor: voting ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px',
                            color: voted === 'helpful' ? '#22c55e' : '#6b7280'
                        }}>
                        <ThumbsUp size={10} /> {ev.helpful_count || 0}
                    </button>
                    <button onClick={() => handleVote('not_helpful')} disabled={voting || voted !== null}
                        style={{
                            background: voted === 'not_helpful' ? '#dc262620' : 'none', border: `1px solid ${voted === 'not_helpful' ? '#dc2626' : '#333'}`,
                            borderRadius: '3px', padding: '4px 8px', cursor: voting ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px',
                            color: voted === 'not_helpful' ? '#dc2626' : '#6b7280'
                        }}>
                        <ThumbsDown size={10} />
                    </button>
                    <button onClick={() => handleVote('flag')} disabled={voting || voted !== null}
                        style={{
                            background: 'none', border: '1px solid #333', borderRadius: '3px',
                            padding: '4px 6px', cursor: voting ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', fontSize: '10px', color: '#6b7280'
                        }}>
                        <Flag size={10} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// COUNTRY TAG
// ============================================
const CountryTag = ({ code }: { code: string }) => {
    const flags: Record<string, string> = {
        USA: '🇺🇸', TUR: '🇹🇷', GBR: '🇬🇧', FRA: '🇫🇷', ISR: '🇮🇱',
        DEU: '🇩🇪', RUS: '🇷🇺', CHN: '🇨🇳', JPN: '🇯🇵', BRA: '🇧🇷',
        VIR: '🇻🇮', ZAF: '🇿🇦', AUS: '🇦🇺', CAN: '🇨🇦', ITA: '🇮🇹',
        ESP: '🇪🇸', MEX: '🇲🇽', IND: '🇮🇳', KOR: '🇰🇷', NLD: '🇳🇱'
    };
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            backgroundColor: '#ffffff08',
            borderRadius: '3px',
            fontSize: '11px',
            color: '#9ca3af'
        }}>
            {flags[code] || '🌍'} {code}
        </span>
    );
};

// ============================================
// CONNECTION TYPE TRANSLATOR
// ============================================
const getConnectionTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
        criminal: 'CRIMINAL ASSOCIATE',
        associate: 'ASSOCIATE',
        financial: 'FINANCIAL',
        professional: 'PROFESSIONAL',
        familial: 'FAMILIAL',
        romantic: 'ROMANTIC',
        witnessed: 'WITNESS',
        victim: 'VICTIM',
        employer: 'EMPLOYER',
        employee: 'EMPLOYEE',
    };
    return types[type?.toLowerCase()] || type?.toUpperCase() || 'UNKNOWN';
};

// ============================================
// TAB BUTTON
// ============================================
const TabButton = ({ active, onClick, icon: Icon, label, count }: {
    active: boolean;
    onClick: () => void;
    icon: any;
    label: string;
    count?: number;
}) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: active ? '#7f1d1d20' : 'transparent',
            border: 'none',
            borderBottom: active ? '2px solid #dc2626' : '2px solid transparent',
            color: active ? '#ffffff' : '#6b7280',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'monospace'
        }}
    >
        <Icon size={14} />
        {label}
        {count !== undefined && (
            <span style={{
                backgroundColor: active ? '#dc2626' : '#374151',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '9px'
            }}>
                {count}
            </span>
        )}
    </button>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function ArchiveModal() {
    const { isArchiveOpen, activeEvidence, closeArchive } = useStore();
    const [ready, setReady] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [communityEvidence, setCommunityEvidence] = useState<CommunityEvidence[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);

    const node = activeEvidence as ArchiveNode | null;

    // Fetch community evidence when modal opens
    const fetchCommunityEvidence = useCallback(async (nodeId: string) => {
        setLoadingCommunity(true);
        try {
            const res = await fetch(`/api/community/evidence?nodeId=${nodeId}&status=pending`);
            if (res.ok) {
                const data = await res.json();
                setCommunityEvidence(data.evidence || []);
            }
        } catch { /* ignore */ }
        setLoadingCommunity(false);
    }, []);

    useEffect(() => {
        if (isArchiveOpen && node?.id) {
            setActiveTab('overview');
            setCommunityEvidence([]);
            fetchCommunityEvidence(node.id);
            setTimeout(() => setReady(true), 200);
        } else {
            setReady(false);
        }
    }, [isArchiveOpen, node?.id, fetchCommunityEvidence]);

    const initials = useMemo(() =>
        node?.label?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || '??',
        [node?.label]
    );

    const status = useMemo(() => {
        if (!node?.is_alive) return 'DECEASED';
        if (node?.role === 'convicted') return 'CONVICTED';
        if (node?.tier === 0 || node?.tier === 1) return 'ACTIVE INVESTIGATION';
        return 'PERSON OF INTEREST';
    }, [node]);

    const statusColor = useMemo(() => {
        if (status === 'DECEASED') return '#6b7280';
        if (status === 'CONVICTED') return '#dc2626';
        return '#f59e0b';
    }, [status]);

    // Real connections from store
    const connections = Array.isArray(node?.connections) ? node.connections : [];

    // Evidence from API
    const evidence = node?.evidence || [];

    // Timeline from API
    const timeline = node?.timeline || [];

    if (!isArchiveOpen || !node) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
        }}>
            {/* BACKDROP */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeArchive}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    backdropFilter: 'blur(8px)'
                }}
            />

            {/* MODAL */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1100px',
                    maxHeight: '90vh',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #7f1d1d',
                    boxShadow: '0 0 80px rgba(127, 29, 29, 0.2), inset 0 0 80px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* TOP BANNER */}
                <div style={{
                    height: '32px',
                    background: 'linear-gradient(90deg, #450a0a 0%, #7f1d1d 50%, #450a0a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px'
                }}>
                    <span style={{ fontSize: '9px', letterSpacing: '0.3em', color: '#fecaca80' }}>
                        ◉ KAYIT #{node.id?.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '9px', letterSpacing: '0.5em', color: '#fecaca', fontWeight: 'bold' }}>
                        CLASSIFIED
                    </span>
                    <button
                        onClick={closeArchive}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fecaca80',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* LEFT PANEL */}
                    <div style={{
                        width: '300px',
                        minWidth: '300px',
                        backgroundColor: '#050505',
                        borderRight: '1px solid #7f1d1d30',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto'
                    }}>
                        {/* PHOTO */}
                        <div style={{
                            width: '100%',
                            aspectRatio: '3/4',
                            backgroundColor: '#0a0a0a',
                            border: '1px solid #7f1d1d40',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {node.img ? (
                                <img
                                    src={node.img}
                                    alt={node.label}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        filter: 'grayscale(30%) contrast(1.1)'
                                    }}
                                />
                            ) : (
                                <span style={{ fontSize: '4rem', fontWeight: 900, color: '#dc2626' }}>{initials}</span>
                            )}

                            {/* STATUS STAMP */}
                            <div style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '50%',
                                transform: 'translateX(-50%) rotate(-8deg)',
                                border: `2px solid ${statusColor}`,
                                padding: '4px 12px',
                                backgroundColor: 'rgba(0,0,0,0.85)',
                                color: statusColor,
                                fontWeight: 900,
                                fontSize: '10px',
                                letterSpacing: '0.1em',
                                whiteSpace: 'nowrap'
                            }}>
                                {status}
                            </div>
                        </div>

                        {/* NAME */}
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '9px', color: '#991b1b60', letterSpacing: '0.2em' }}>SUBJECT</span>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 900,
                                color: '#ffffff',
                                margin: '4px 0 8px',
                                textTransform: 'uppercase',
                                lineHeight: 1.2
                            }}>
                                {node.label}
                            </h2>
                            <VerificationBadge level={node.verification_level} />
                        </div>

                        {/* INFO GRID */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            paddingTop: '1rem',
                            borderTop: '1px solid #7f1d1d20'
                        }}>
                            <div>
                                <span style={{ fontSize: '9px', color: '#991b1b60', letterSpacing: '0.1em' }}>ROL</span>
                                <p style={{ color: '#e5e7eb', margin: '4px 0 0', fontSize: '12px', textTransform: 'uppercase' }}>
                                    {node.role || 'Bilinmiyor'}
                                </p>
                            </div>
                            <div>
                                <span style={{ fontSize: '9px', color: '#991b1b60', letterSpacing: '0.1em' }}>TIER</span>
                                <p style={{ color: '#e5e7eb', margin: '4px 0 0', fontSize: '12px' }}>
                                    {node.tier ? TIER_LABELS[node.tier] || `TIER ${node.tier}` : 'TIER ?'}
                                </p>
                            </div>
                        </div>

                        {/* RISK BAR */}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #7f1d1d20' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '9px', color: '#991b1b60', letterSpacing: '0.1em' }}>RİSK SEVİYESİ</span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: (node.risk || 0) > 70 ? '#dc2626' : (node.risk || 0) > 40 ? '#f59e0b' : '#22c55e'
                                }}>
                                    {node.risk || 0}%
                                </span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${node.risk || 0}%` }}
                                    transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                                    style={{
                                        height: '100%',
                                        background: (node.risk || 0) > 70
                                            ? 'linear-gradient(90deg, #b91c1c, #dc2626)'
                                            : (node.risk || 0) > 40
                                                ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                                                : 'linear-gradient(90deg, #16a34a, #22c55e)'
                                    }}
                                />
                            </div>
                        </div>

                        {/* COUNTRY TAGS */}
                        {(node.country_tags?.length || node.nationality) && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #7f1d1d20' }}>
                                <span style={{ fontSize: '9px', color: '#991b1b60', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Globe size={10} /> COUNTRY CONNECTIONS
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {node.nationality && <CountryTag code={node.nationality} />}
                                    {node.country_tags?.map(tag => <CountryTag key={tag} code={tag} />)}
                                </div>
                            </div>
                        )}

                        {/* IŞIK TUT KAMPANYA WİDGET */}
                        <div style={{ marginTop: 'auto' }}>
                            {/* Community stats mini */}
                            {communityEvidence.length > 0 && (
                                <div style={{
                                    padding: '10px', marginBottom: '8px',
                                    backgroundColor: '#f59e0b08', border: '1px solid #f59e0b15',
                                    borderRadius: '4px', fontSize: '10px', color: '#f59e0b80',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span>👥 {communityEvidence.length} topluluk katkısı</span>
                                    <span style={{ color: '#22c55e80' }}>
                                        🏛️ {evidence.length} doğrulanmış
                                    </span>
                                </div>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsSubmitModalOpen(true)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: '#7f1d1d',
                                    border: 'none',
                                    color: '#fecaca',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.15em',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#991b1b'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                            >
                                <Lightbulb size={16} />
                                IŞIK TUT
                            </motion.button>
                            <div style={{
                                marginTop: '6px', textAlign: 'center', fontSize: '9px',
                                color: '#6b728060', letterSpacing: '0.05em'
                            }}>
                                Topluluk katkıları ana ağı etkilemez
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* TABS */}
                        <div style={{
                            display: 'flex',
                            borderBottom: '1px solid #7f1d1d30',
                            backgroundColor: '#080808'
                        }}>
                            <TabButton
                                active={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                                icon={FileText}
                                label="ÖZET"
                            />
                            <TabButton
                                active={activeTab === 'connections'}
                                onClick={() => setActiveTab('connections')}
                                icon={Users}
                                label="BAĞLANTILAR"
                                count={connections.length}
                            />
                            <TabButton
                                active={activeTab === 'evidence'}
                                onClick={() => setActiveTab('evidence')}
                                icon={Scale}
                                label="EVIDENCE"
                                count={evidence.length + communityEvidence.length}
                            />
                            <TabButton
                                active={activeTab === 'timeline'}
                                onClick={() => setActiveTab('timeline')}
                                icon={Clock}
                                label="ZAMAN ÇİZGİSİ"
                                count={timeline.length}
                            />
                        </div>

                        {/* TAB CONTENT */}
                        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                            <AnimatePresence mode="wait">
                                {/* OVERVIEW TAB */}
                                {activeTab === 'overview' && (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h3 style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: '#dc2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginBottom: '12px'
                                        }}>
                                            <FileText size={14} /> İSTİHBARAT ÖZETİ
                                        </h3>

                                        <div style={{
                                            backgroundColor: '#080808',
                                            border: '1px solid #7f1d1d20',
                                            padding: '1.25rem',
                                            fontSize: '13px',
                                            color: '#d1d5db',
                                            lineHeight: 1.7,
                                            marginBottom: '1.5rem'
                                        }}>
                                            {ready && (
                                                <TypewriterText
                                                    text={node.summary || `${node.label}, identified as Tier ${node.tier ?? '?'} in the ongoing federal investigation. Risk assessment: ${(node.risk || 0) > 70 ? 'CRITICAL' : (node.risk || 0) > 40 ? 'HIGH' : 'MODERATE'} (${node.risk || 0}%). Role: ${node.role?.toUpperCase() || 'UNKNOWN'}. Multiple documented connections to primary targets have been identified.`}
                                                    speed={12}
                                                />
                                            )}
                                        </div>

                                        {/* QUICK STATS */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '12px',
                                            marginBottom: '1.5rem'
                                        }}>
                                            {[
                                                { label: 'CONNECTION', value: connections.length, icon: Link2 },
                                                { label: 'VERIFIED', value: evidence.length, icon: Building2 },
                                                { label: 'COMMUNITY', value: communityEvidence.length, icon: Users },
                                            ].map((stat, i) => (
                                                <div key={i} style={{
                                                    backgroundColor: '#080808',
                                                    border: '1px solid #7f1d1d20',
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                }}>
                                                    <stat.icon size={20} style={{ color: '#7f1d1d', marginBottom: '8px' }} />
                                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{stat.value}</div>
                                                    <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em' }}>{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* WARNING BOX */}
                                        <div style={{
                                            backgroundColor: '#7f1d1d10',
                                            border: '1px solid #7f1d1d40',
                                            borderLeft: '3px solid #dc2626',
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }}>
                                            <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>
                                                    DOĞRULAMA NOTU
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
                                                    Bu kayıttaki bilgiler çeşitli kaynaklardan derlenmiştir.
                                                    Resmi doğrulama için orijinal belgelere başvurunuz.
                                                    Topluluk katkıları moderasyona tabidir.
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* CONNECTIONS TAB */}
                                {activeTab === 'connections' && (
                                    <motion.div
                                        key="connections"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h3 style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: '#dc2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginBottom: '12px'
                                        }}>
                                            <Users size={14} /> DOCUMENTED CONNECTIONS
                                        </h3>

                                        {/* Sprint 10: İP UZAT butonu */}
                                        <motion.button
                                            whileHover={{ scale: 1.02, borderColor: '#dc2626' }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                const store = useStore.getState();
                                                const node = store.activeEvidence;
                                                if (node) {
                                                    useThreadingStore.getState().startThreading(node.id, node.label || node.id);
                                                    store.closeArchive();
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                marginBottom: '12px',
                                                backgroundColor: '#dc262608',
                                                border: '1px dashed #dc262640',
                                                borderRadius: '4px',
                                                color: '#dc2626',
                                                fontSize: '10px',
                                                fontFamily: 'ui-monospace, monospace',
                                                fontWeight: 700,
                                                letterSpacing: '0.15em',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <Link2 size={14} />
                                            CAST A THREAD — PROPOSE NEW CONNECTION
                                        </motion.button>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {connections.length === 0 ? (
                                                <div style={{
                                                    padding: '2rem',
                                                    textAlign: 'center',
                                                    backgroundColor: '#080808',
                                                    border: '1px dashed #7f1d1d30',
                                                }}>
                                                    <Users size={32} style={{ color: '#6b7280', marginBottom: '12px' }} />
                                                    <div style={{ color: '#6b7280', fontSize: '13px' }}>
                                                        Henüz belgelenmiş bağlantı yok
                                                    </div>
                                                    <div style={{ color: '#991b1b', fontSize: '11px', marginTop: '8px' }}>
                                                        Işık Tut ile katkıda bulunun
                                                    </div>
                                                </div>
                                            ) : connections.map((conn, i) => (
                                                <motion.div
                                                    key={conn.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    style={{
                                                        backgroundColor: '#080808',
                                                        border: '1px solid #7f1d1d20',
                                                        padding: '1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    whileHover={{ backgroundColor: '#0f0f0f', borderColor: '#7f1d1d40' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            backgroundColor: '#7f1d1d20',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: '#dc2626'
                                                        }}>
                                                            {conn.label.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>{conn.label}</div>
                                                            <div style={{ color: '#6b7280', fontSize: '11px' }}>{getConnectionTypeLabel(conn.type)}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '9px', color: '#6b7280' }}>CONNECTION STRENGTH</div>
                                                            <div style={{
                                                                width: '60px',
                                                                height: '4px',
                                                                backgroundColor: '#1a1a1a',
                                                                borderRadius: '2px',
                                                                marginTop: '4px'
                                                            }}>
                                                                <div style={{
                                                                    width: `${conn.strength}%`,
                                                                    height: '100%',
                                                                    backgroundColor: '#dc2626',
                                                                    borderRadius: '2px'
                                                                }} />
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} style={{ color: '#6b7280' }} />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* EVIDENCE TAB — İKİ KATMANLI: 🏛️ Doğrulanmış + 👥 Topluluk */}
                                {activeTab === 'evidence' && (
                                    <motion.div
                                        key="evidence"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {/* ═══ LAYER 1: VERIFIED EVIDENCE ═══ */}
                                        <h3 style={{
                                            fontSize: '11px', fontWeight: 'bold', color: '#22c55e',
                                            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px'
                                        }}>
                                            <Building2 size={14} /> VERIFIED EVIDENCE
                                            <span style={{
                                                marginLeft: 'auto', fontSize: '9px', padding: '2px 8px',
                                                backgroundColor: '#22c55e15', color: '#22c55e', borderRadius: '10px'
                                            }}>
                                                🏛️ ANA AĞ
                                            </span>
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                                            {evidence.length === 0 ? (
                                                <div style={{
                                                    padding: '1.5rem', textAlign: 'center',
                                                    backgroundColor: '#080808', border: '1px dashed #22c55e20',
                                                }}>
                                                    <Scale size={28} style={{ color: '#6b7280', marginBottom: '8px' }} />
                                                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                                                        Henüz doğrulanmış kanıt yok
                                                    </div>
                                                </div>
                                            ) : evidence.map((ev, i) => {
                                                const typeLabels: Record<string, string> = {
                                                    document: 'DOCUMENT', legal: 'LEGAL', media: 'MEDIA', photo: 'PHOTO',
                                                    video: 'VIDEO', testimony: 'TESTIMONY', news: 'NEWS', financial: 'FINANCIAL',
                                                };
                                                const typeLabel = typeLabels[ev.evidence_type] || ev.evidence_type?.toUpperCase() || 'UNKNOWN';
                                                const langLabels: Record<string, string> = { en: '🇬🇧 EN', tr: '🇹🇷 TR', fr: '🇫🇷 FR', de: '🇩🇪 DE' };
                                                const langLabel = ev.language ? (langLabels[ev.language] || ev.language.toUpperCase()) : null;

                                                return (
                                                    <motion.div
                                                        key={ev.id || i}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        style={{
                                                            backgroundColor: '#080808',
                                                            border: '1px solid #22c55e20',
                                                            borderLeft: ev.is_primary_source ? '3px solid #22c55e' : '3px solid #22c55e40',
                                                            padding: '1rem',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                                    <span style={{
                                                                        fontSize: '9px', padding: '2px 6px', backgroundColor: '#7f1d1d30',
                                                                        color: '#fca5a5', borderRadius: '2px', letterSpacing: '0.05em'
                                                                    }}>
                                                                        {typeLabel}
                                                                    </span>
                                                                    {ev.is_primary_source && (
                                                                        <span style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#22c55e20', color: '#22c55e', borderRadius: '2px' }}>
                                                                            BİRİNCİL KAYNAK
                                                                        </span>
                                                                    )}
                                                                    <SourceOfTruthBadge source={(ev as any).source_of_truth} />
                                                                    {langLabel && <span style={{ fontSize: '10px', color: '#6b7280' }}>{langLabel}</span>}
                                                                </div>
                                                                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>{ev.title}</div>
                                                            </div>
                                                            <VerificationBadge level={ev.verification_status} />
                                                        </div>
                                                        {ev.description && (
                                                            <div style={{
                                                                fontSize: '12px', color: '#9ca3af', lineHeight: 1.5,
                                                                marginBottom: '10px', paddingLeft: '8px', borderLeft: '2px solid #22c55e20'
                                                            }}>
                                                                {ev.description}
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span style={{ fontSize: '11px', color: '#6b7280' }}>📰 {ev.source_name}</span>
                                                                {ev.source_date && (
                                                                    <span style={{ fontSize: '10px', color: '#6b727080' }}>
                                                                        📅 {new Date(ev.source_date).toLocaleDateString('tr-TR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {ev.source_url && (
                                                                <a href={ev.source_url} target="_blank" rel="noopener noreferrer"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', textDecoration: 'none' }}
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <ExternalLink size={12} /> Kaynağı Görüntüle
                                                                </a>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* ═══ DIVIDER ═══ */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            margin: '0 0 1.5rem 0', padding: '8px 0'
                                        }}>
                                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #f59e0b30, transparent)' }} />
                                            <span style={{ fontSize: '9px', color: '#f59e0b80', letterSpacing: '0.2em' }}>COMMUNITY LAYER</span>
                                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #f59e0b30, transparent)' }} />
                                        </div>

                                        {/* ═══ LAYER 2: COMMUNITY CONTRIBUTIONS ═══ */}
                                        <h3 style={{
                                            fontSize: '11px', fontWeight: 'bold', color: '#f59e0b',
                                            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px'
                                        }}>
                                            <Users size={14} /> COMMUNITY CONTRIBUTIONS
                                            <span style={{
                                                marginLeft: 'auto', fontSize: '9px', padding: '2px 8px',
                                                backgroundColor: '#f59e0b15', color: '#f59e0b', borderRadius: '10px'
                                            }}>
                                                👥 MODERASYON BEKLİYOR
                                            </span>
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {loadingCommunity ? (
                                                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                                                    Topluluk katkıları yükleniyor...
                                                </div>
                                            ) : communityEvidence.length === 0 ? (
                                                <div style={{
                                                    padding: '1.5rem', textAlign: 'center',
                                                    backgroundColor: '#080808', border: '1px dashed #f59e0b20',
                                                }}>
                                                    <Users size={28} style={{ color: '#6b7280', marginBottom: '8px' }} />
                                                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                                                        Henüz topluluk katkısı yok
                                                    </div>
                                                    <div style={{ color: '#f59e0b80', fontSize: '11px', marginTop: '6px' }}>
                                                        Işık Tut ile ilk katkıyı siz yapın
                                                    </div>
                                                </div>
                                            ) : communityEvidence.map((ev, i) => (
                                                <CommunityEvidenceCard key={ev.id} ev={ev} index={i} />
                                            ))}
                                        </div>

                                        {/* Combined summary */}
                                        <div style={{
                                            marginTop: '1.5rem', padding: '10px', backgroundColor: '#080808',
                                            border: '1px dashed #7f1d1d30', textAlign: 'center', fontSize: '11px', color: '#6b7280'
                                        }}>
                                            🏛️ {evidence.length} doğrulanmış • 👥 {communityEvidence.length} topluluk katkısı
                                        </div>
                                    </motion.div>
                                )}

                                {/* TIMELINE TAB */}
                                {activeTab === 'timeline' && (
                                    <motion.div
                                        key="timeline"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h3 style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: '#dc2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginBottom: '12px'
                                        }}>
                                            <Clock size={14} /> ZAMAN ÇİZGİSİ
                                        </h3>

                                        {timeline.length === 0 ? (
                                            <div style={{
                                                padding: '2rem',
                                                textAlign: 'center',
                                                backgroundColor: '#080808',
                                                border: '1px dashed #7f1d1d30',
                                            }}>
                                                <Clock size={32} style={{ color: '#6b7280', marginBottom: '12px' }} />
                                                <div style={{ color: '#6b7280', fontSize: '13px' }}>
                                                    Henüz zaman çizgisi verisi yok
                                                </div>
                                                <div style={{ color: '#991b1b', fontSize: '11px', marginTop: '8px' }}>
                                                    Işık Tut ile katkıda bulunun
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                                {/* Timeline line */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '6px',
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '2px',
                                                    backgroundColor: '#7f1d1d40'
                                                }} />

                                                {timeline.map((event, i) => {
                                                    // Event type colors
                                                    const typeColors: Record<string, string> = {
                                                        birth: '#22c55e',
                                                        death: '#6b7280',
                                                        arrest: '#dc2626',
                                                        conviction: '#dc2626',
                                                        legal: '#f59e0b',
                                                        meeting: '#ef4444',
                                                        travel: '#991b1b',
                                                        media: '#b91c1c',
                                                        other: '#6b7280',
                                                    };
                                                    const dotColor = event.importance === 'critical'
                                                        ? '#dc2626'
                                                        : event.importance === 'high'
                                                            ? '#f59e0b'
                                                            : typeColors[event.event_type] || '#6b7280';

                                                    // Event type labels
                                                    const typeLabels: Record<string, string> = {
                                                        birth: '🎂 DOĞUM',
                                                        death: '💀 ÖLÜM',
                                                        arrest: '🚔 TUTUKLAMA',
                                                        conviction: '⚖️ MAHKUMİYET',
                                                        legal: '⚖️ HUKUKİ',
                                                        meeting: '🤝 BULUŞMA',
                                                        travel: '✈️ SEYAHAT',
                                                        media: '📺 MEDYA',
                                                        other: '📌 DİĞER',
                                                    };
                                                    const typeLabel = typeLabels[event.event_type] || '📌 OLAY';

                                                    // Format date
                                                    const formattedDate = new Date(event.event_date).toLocaleDateString('tr-TR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    });

                                                    return (
                                                        <motion.div
                                                            key={event.id || i}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            style={{
                                                                position: 'relative',
                                                                marginBottom: '1.25rem',
                                                                paddingLeft: '1rem',
                                                                paddingBottom: '1rem',
                                                                borderBottom: i < timeline.length - 1 ? '1px solid #7f1d1d15' : 'none'
                                                            }}
                                                        >
                                                            {/* Dot */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: '-21px',
                                                                top: '4px',
                                                                width: '12px',
                                                                height: '12px',
                                                                borderRadius: '50%',
                                                                backgroundColor: dotColor,
                                                                border: '2px solid #0a0a0a',
                                                                boxShadow: event.importance === 'critical' ? '0 0 8px rgba(220, 38, 38, 0.5)' : 'none'
                                                            }} />

                                                            {/* Header */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                                <span style={{
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold',
                                                                    color: dotColor
                                                                }}>
                                                                    {formattedDate}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '9px',
                                                                    padding: '2px 6px',
                                                                    backgroundColor: `${dotColor}20`,
                                                                    color: dotColor,
                                                                    borderRadius: '2px',
                                                                    letterSpacing: '0.05em'
                                                                }}>
                                                                    {typeLabel}
                                                                </span>
                                                                {event.is_verified && (
                                                                    <span style={{
                                                                        fontSize: '9px',
                                                                        color: '#22c55e'
                                                                    }}>✓</span>
                                                                )}
                                                            </div>

                                                            {/* Title */}
                                                            <div style={{
                                                                fontSize: '13px',
                                                                fontWeight: 600,
                                                                color: '#ffffff',
                                                                marginBottom: '4px'
                                                            }}>
                                                                {event.title}
                                                            </div>

                                                            {/* Description */}
                                                            {event.description && (
                                                                <div style={{
                                                                    fontSize: '12px',
                                                                    color: '#9ca3af',
                                                                    lineHeight: 1.5,
                                                                    marginBottom: '6px'
                                                                }}>
                                                                    {event.description}
                                                                </div>
                                                            )}

                                                            {/* Location */}
                                                            {event.location && (
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    color: '#6b7280',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <MapPin size={12} /> {event.location}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Summary */}
                                        {timeline.length > 0 && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '10px',
                                                backgroundColor: '#080808',
                                                border: '1px dashed #7f1d1d30',
                                                textAlign: 'center',
                                                fontSize: '11px',
                                                color: '#6b7280'
                                            }}>
                                                Toplam {timeline.length} olay •{' '}
                                                {timeline.filter(e => e.importance === 'critical').length} kritik
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* BOTTOM BAR */}
                <div style={{
                    height: '36px',
                    backgroundColor: '#050505',
                    borderTop: '1px solid #7f1d1d20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    fontSize: '9px',
                    color: '#6b7280'
                }}>
                    <span>PROJECT TRUTH • GLOBAL NETWORK</span>
                    <span>SON GÜNCELLEME: {new Date().toLocaleDateString('tr-TR')}</span>
                </div>
            </motion.div>

            {/* IŞIK TUT - Evidence Submit Modal */}
            {node && (
                <EvidenceSubmitModal
                    isOpen={isSubmitModalOpen}
                    onClose={() => setIsSubmitModalOpen(false)}
                    nodeId={node.id}
                    nodeName={node.label}
                />
            )}
        </div>
    );
}
