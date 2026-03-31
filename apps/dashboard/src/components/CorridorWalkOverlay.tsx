'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Star, Eye, Zap } from 'lucide-react';
import { useLinkEvidenceStore, EvidencePulse } from '@/store/linkEvidenceStore';
import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';

// ═══════════════════════════════════════════
// CORRIDOR WALK OVERLAY — Sprint 14 "Kanıt Yürüyüşü"
// 3D ip üzerinde yürürken görünen sinematik UI
// AR-style floating evidence panelleri + HUD kontrolleri
// ═══════════════════════════════════════════

const EVIDENCE_TYPE_COLORS: Record<string, string> = Object.fromEntries(
    Object.entries(EVIDENCE_TYPE_CONFIG).map(([key, cfg]) => [key, cfg.color])
);

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
    court_record: 'COURT',
    financial_record: 'FINANCIAL',
    witness_testimony: 'TESTIMONY',
    news_major: 'NEWS',
    official_document: 'OFFICIAL',
    leaked_document: 'LEAKED',
    photograph: 'PHOTOGRAPH',
    social_media: 'SOCIAL',
    inference: 'INFERENCE',
};

const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
    verified: { label: 'VERIFIED', color: '#22c55e' },
    credible: { label: 'CREDIBLE', color: '#3b82f6' },
    disputed: { label: 'DISPUTED', color: '#f59e0b' },
    pending: { label: 'PENDING', color: '#6b7280' },
    debunked: { label: 'DEBUNKED', color: '#ef4444' },
};

// UUID mi yoksa gerçek isim mi kontrol et
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function displayLabel(label: string): string {
    if (!label || isUUID(label)) return '???';
    return label;
}

function formatDate(dateStr: string | null, precision: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (precision === 'year') return d.getFullYear().toString();
    if (precision === 'month') return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CorridorWalkOverlay() {
    const {
        corridorWalkMode, corridorWalkProgress, corridorWalkPhase,
        corridorWalkPaused, corridorWalkSpeed, corridorWalkEvidenceIndex,
        data,
        exitCorridorWalk, toggleCorridorWalkPause,
        setCorridorWalkProgress, setCorridorWalkSpeed,
        nextWalkEvidence, prevWalkEvidence,
    } = useLinkEvidenceStore();

    const [showEntrance, setShowEntrance] = useState(false);
    const [entranceOpacity, setEntranceOpacity] = useState(1);
    const animRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // ═══ CARD TRANSITION ═══
    type CardPhase = 'visible' | 'exiting' | 'entering';
    const [cardPhase, setCardPhase] = useState<CardPhase>('visible');
    const [displayedWalkIndex, setDisplayedWalkIndex] = useState(corridorWalkEvidenceIndex);
    const prevWalkIdxRef = useRef(corridorWalkEvidenceIndex);

    useEffect(() => {
        if (prevWalkIdxRef.current !== corridorWalkEvidenceIndex) {
            // Faz 1: Eski kart sağa kayarak çıkar (180ms)
            setCardPhase('exiting');

            // Faz 2: Yeni kartı hazırla
            const swapTimer = setTimeout(() => {
                setDisplayedWalkIndex(corridorWalkEvidenceIndex);
                setCardPhase('entering');
            }, 200);

            // Faz 3: Yerleş
            const settleTimer = setTimeout(() => {
                setCardPhase('visible');
            }, 560);

            prevWalkIdxRef.current = corridorWalkEvidenceIndex;
            return () => {
                clearTimeout(swapTimer);
                clearTimeout(settleTimer);
            };
        }
    }, [corridorWalkEvidenceIndex]);

    // ═══ KEYBOARD CONTROLS ═══
    useEffect(() => {
        if (!corridorWalkMode) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') exitCorridorWalk();
            if (e.key === ' ') { e.preventDefault(); toggleCorridorWalkPause(); }
            if (e.key === 'ArrowRight') nextWalkEvidence();
            if (e.key === 'ArrowLeft') prevWalkEvidence();
            if (e.key === '1') setCorridorWalkSpeed(0.5);
            if (e.key === '2') setCorridorWalkSpeed(1.0);
            if (e.key === '3') setCorridorWalkSpeed(2.0);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [corridorWalkMode, exitCorridorWalk, toggleCorridorWalkPause, nextWalkEvidence, prevWalkEvidence, setCorridorWalkSpeed]);

    // ═══ ENTRANCE ANIMATION ═══
    useEffect(() => {
        if (corridorWalkMode && corridorWalkPhase === 'entering') {
            setShowEntrance(true);
            setEntranceOpacity(1);
            const innerTimerRef = { current: null as ReturnType<typeof setTimeout> | null };
            // Fade out after 1.5s
            const timer = setTimeout(() => {
                setEntranceOpacity(0);
                innerTimerRef.current = setTimeout(() => setShowEntrance(false), 600);
            }, 1500);
            return () => {
                clearTimeout(timer);
                if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
            };
        } else {
            setShowEntrance(false);
        }
    }, [corridorWalkMode, corridorWalkPhase]);

    // ═══ AUTO-PLAY ANIMATION ═══
    useEffect(() => {
        if (!corridorWalkMode || corridorWalkPaused || corridorWalkPhase !== 'walking') return;

        const BASE_SPEED = 0.02; // saniyede %2 ilerleme

        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            const newProgress = Math.min(1, corridorWalkProgress + BASE_SPEED * corridorWalkSpeed * delta);
            setCorridorWalkProgress(newProgress);

            if (newProgress >= 1) return;

            animRef.current = requestAnimationFrame(animate);
        };

        lastTimeRef.current = 0;
        animRef.current = requestAnimationFrame(animate);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [corridorWalkMode, corridorWalkPaused, corridorWalkPhase, corridorWalkProgress, corridorWalkSpeed, setCorridorWalkProgress]);

    // Early return — hooks'lardan SONRA
    if (!corridorWalkMode || !data) return null;

    const evidences = data.evidences;
    const activeEvidence = evidences[corridorWalkEvidenceIndex];
    const linkInfo = data.link;
    const typeColor = EVIDENCE_TYPE_COLORS[activeEvidence?.evidenceType] || '#6b7280';

    return (
        <>
            {/* ═══ FAZ D: ENTRANCE ANIMATION ═══ */}
            {showEntrance && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 70,
                    pointerEvents: 'none',
                    opacity: entranceOpacity,
                    transition: 'opacity 0.6s ease-out',
                }}>
                    {/* Letterbox barları */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: '10vh',
                        background: '#000',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: '10vh',
                        background: '#000',
                    }} />

                    {/* Vignette */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
                    }} />

                    {/* Scan lines */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
                        mixBlendMode: 'overlay',
                    }} />

                    {/* Başlık */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontSize: '8px',
                            letterSpacing: '0.5em',
                            color: '#dc262680',
                            fontFamily: 'monospace',
                            marginBottom: '8px',
                            animation: 'corridorFadeIn 0.8s ease-out',
                        }}>
                            CLASSIFIED // EVIDENCE CORRIDOR
                        </div>
                        <div style={{
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#dc2626',
                            fontFamily: 'Georgia, serif',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            animation: 'corridorFadeIn 1s ease-out 0.3s both',
                            textShadow: '0 0 30px rgba(220,38,38,0.4)',
                        }}>
                            KANIT YÜRÜYÜŞÜ
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: '#666',
                            fontFamily: 'monospace',
                            marginTop: '12px',
                            animation: 'corridorFadeIn 1s ease-out 0.6s both',
                        }}>
                            {displayLabel(linkInfo.sourceLabel)} ↔ {displayLabel(linkInfo.targetLabel)}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ WALKING MODE: Persistent vignette + scan-lines ═══ */}
            {corridorWalkPhase === 'walking' && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 59,
                    pointerEvents: 'none',
                }}>
                    {/* Hafif vignette */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
                    }} />
                    {/* Sinema barları (ince) */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: '5vh',
                        background: 'linear-gradient(to bottom, #000, transparent)',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: '5vh',
                        background: 'linear-gradient(to top, #000, transparent)',
                    }} />
                </div>
            )}

            {/* ═══ FAZ C: FLOATING EVIDENCE CARD (aktif kanıt) ═══ */}
            {corridorWalkPhase === 'walking' && evidences[displayedWalkIndex] && (
                <div style={{
                    position: 'fixed',
                    top: '15%',
                    right: '40px',
                    width: '360px',
                    zIndex: 65,
                    pointerEvents: cardPhase === 'visible' ? 'auto' : 'none',
                    opacity: cardPhase === 'exiting' ? 0 : 1,
                    transform: cardPhase === 'exiting'
                        ? 'translateX(40px) scale(0.95)'
                        : 'translateX(0) scale(1)',
                    transition: cardPhase === 'exiting'
                        ? 'all 0.18s cubic-bezier(0.4, 0, 1, 1)'
                        : cardPhase === 'entering'
                            ? 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                            : 'none',
                }}>
                    <EvidenceCard evidence={evidences[displayedWalkIndex]} isActive={true} />
                </div>
            )}

            {/* ═══ FAZ C: SECONDARY CARDS (önceki ve sonraki) ═══ */}
            {corridorWalkPhase === 'walking' && (
                <>
                    {/* Önceki kanıt (sol üst, soluk) */}
                    {corridorWalkEvidenceIndex > 0 && (
                        <div style={{
                            position: 'fixed',
                            top: '20%',
                            left: '40px',
                            width: '240px',
                            zIndex: 64,
                            opacity: 0.3,
                            transform: 'scale(0.85)',
                            pointerEvents: 'none',
                            transition: 'all 0.5s ease-out',
                        }}>
                            <EvidenceCard evidence={evidences[corridorWalkEvidenceIndex - 1]} isActive={false} />
                        </div>
                    )}
                    {/* Sonraki kanıt (sağ alt, çok soluk) */}
                    {corridorWalkEvidenceIndex < evidences.length - 1 && (
                        <div style={{
                            position: 'fixed',
                            bottom: '20%',
                            right: '40px',
                            width: '200px',
                            zIndex: 64,
                            opacity: 0.15,
                            transform: 'scale(0.75)',
                            pointerEvents: 'none',
                            transition: 'all 0.5s ease-out',
                        }}>
                            <EvidenceCard evidence={evidences[corridorWalkEvidenceIndex + 1]} isActive={false} />
                        </div>
                    )}
                </>
            )}

            {/* ═══ FAZ E: CONTROL HUD ═══ */}
            {corridorWalkPhase === 'walking' && (
                <div style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    zIndex: 70,
                    pointerEvents: 'auto',
                    animation: 'corridorSlideUp 0.4s ease-out',
                }}>
                    {/* Üst gradient */}
                    <div style={{
                        height: '40px',
                        background: 'linear-gradient(to bottom, transparent, rgba(5,5,5,0.95))',
                        pointerEvents: 'none',
                    }} />

                    <div style={{
                        backgroundColor: 'rgba(5, 5, 5, 0.98)',
                        borderTop: `1px solid ${typeColor}30`,
                        padding: '12px 24px 16px',
                    }}>
                        {/* Progress bar */}
                        <div style={{
                            height: '3px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '2px',
                            marginBottom: '10px',
                            position: 'relative',
                            cursor: 'pointer',
                        }}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = (e.clientX - rect.left) / rect.width;
                            setCorridorWalkProgress(Math.max(0, Math.min(1, x)));
                        }}
                        >
                            <div style={{
                                width: `${corridorWalkProgress * 100}%`,
                                height: '100%',
                                backgroundColor: '#dc2626',
                                borderRadius: '2px',
                                transition: 'width 0.1s linear',
                            }} />

                            {/* Evidence dots on progress bar */}
                            {evidences.map((ev, idx) => (
                                <div key={ev.timelineId} style={{
                                    position: 'absolute',
                                    left: `${ev.pulsePosition * 100}%`,
                                    top: '-3px',
                                    width: ev.isKeystone ? '10px' : '6px',
                                    height: ev.isKeystone ? '10px' : '6px',
                                    borderRadius: '50%',
                                    backgroundColor: idx === corridorWalkEvidenceIndex
                                        ? '#fff'
                                        : (ev.isKeystone ? '#f59e0b' : EVIDENCE_TYPE_COLORS[ev.evidenceType] || '#dc2626'),
                                    border: idx === corridorWalkEvidenceIndex ? '2px solid #dc2626' : 'none',
                                    transform: 'translateX(-50%)',
                                    cursor: 'pointer',
                                    zIndex: 2,
                                    transition: 'all 0.3s',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCorridorWalkProgress(ev.pulsePosition);
                                }}
                                />
                            ))}
                        </div>

                        {/* Controls row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Sol: Başlık */}
                            <div style={{ minWidth: '180px' }}>
                                <div style={{
                                    fontSize: '7px',
                                    letterSpacing: '0.3em',
                                    color: '#dc262660',
                                    fontFamily: 'monospace',
                                    marginBottom: '2px',
                                }}>
                                    KANIT YÜRÜYÜŞÜ
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5' }}>
                                    {displayLabel(linkInfo.sourceLabel)}
                                    <span style={{ color: '#dc2626', margin: '0 4px' }}>→</span>
                                    {displayLabel(linkInfo.targetLabel)}
                                </div>
                            </div>

                            {/* Orta: Navigation */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={prevWalkEvidence}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        backgroundColor: '#1a1a1a', border: '1px solid #333',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: corridorWalkEvidenceIndex > 0 ? '#e5e5e5' : '#333',
                                    }}
                                >
                                    <ChevronLeft size={14} />
                                </button>

                                <button
                                    onClick={toggleCorridorWalkPause}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        backgroundColor: '#dc262620', border: '1px solid #dc2626',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#dc2626',
                                    }}
                                >
                                    {corridorWalkPaused ? <Play size={16} /> : <Pause size={16} />}
                                </button>

                                <button
                                    onClick={nextWalkEvidence}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        backgroundColor: '#1a1a1a', border: '1px solid #333',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: corridorWalkEvidenceIndex < evidences.length - 1 ? '#e5e5e5' : '#333',
                                    }}
                                >
                                    <ChevronRight size={14} />
                                </button>

                                <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace', marginLeft: '8px' }}>
                                    {corridorWalkEvidenceIndex + 1} / {evidences.length}
                                </span>
                            </div>

                            {/* Sağ: Hız + Çıkış */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px', justifyContent: 'flex-end' }}>
                                {[0.5, 1, 2].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setCorridorWalkSpeed(s)}
                                        style={{
                                            padding: '3px 8px',
                                            fontSize: '9px',
                                            fontFamily: 'monospace',
                                            backgroundColor: corridorWalkSpeed === s ? '#dc262630' : 'transparent',
                                            border: corridorWalkSpeed === s ? '1px solid #dc2626' : '1px solid #333',
                                            borderRadius: '2px',
                                            cursor: 'pointer',
                                            color: corridorWalkSpeed === s ? '#dc2626' : '#666',
                                        }}
                                    >
                                        {s}x
                                    </button>
                                ))}

                                <div style={{ width: '1px', height: '20px', backgroundColor: '#333', margin: '0 4px' }} />

                                <button
                                    onClick={exitCorridorWalk}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '8px',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #333',
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        color: '#666',
                                        fontFamily: 'monospace',
                                        letterSpacing: '0.1em',
                                    }}
                                >
                                    ESC ÇIKIŞ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes corridorSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes corridorFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes corridorCardSlide {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes corridorKeystoneGlow {
                    0%, 100% { box-shadow: 0 0 12px rgba(245,158,11,0.3); }
                    50% { box-shadow: 0 0 24px rgba(245,158,11,0.6); }
                }
            `}</style>
        </>
    );
}


// ═══════════════════════════════════════════
// EVIDENCE CARD — Tek kanıt kartı
// ═══════════════════════════════════════════
function EvidenceCard({ evidence, isActive }: { evidence: EvidencePulse; isActive: boolean }) {
    const typeColor = EVIDENCE_TYPE_COLORS[evidence.evidenceType] || '#6b7280';
    const typeLabel = EVIDENCE_TYPE_LABELS[evidence.evidenceType] || evidence.evidenceType?.replace(/_/g, ' ').toUpperCase() || 'BİLİNMEYEN';
    const verif = VERIFICATION_LABELS[evidence.verificationStatus] || VERIFICATION_LABELS.pending;

    return (
        <div style={{
            backgroundColor: 'rgba(5, 5, 5, 0.92)',
            borderLeft: `3px solid ${typeColor}`,
            borderTop: evidence.isKeystone ? '1px solid #f59e0b40' : '1px solid #ffffff08',
            borderRight: '1px solid #ffffff08',
            borderBottom: '1px solid #ffffff08',
            borderRadius: '3px',
            padding: isActive ? '14px 16px' : '10px 12px',
            backdropFilter: 'blur(12px)',
            animation: evidence.isKeystone && isActive ? 'corridorKeystoneGlow 2s ease-in-out infinite' : undefined,
            transition: 'all 0.4s ease-out',
        }}>
            {/* Header: Type + Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {evidence.isKeystone && (
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                    )}
                    <span style={{
                        fontSize: '9px',
                        letterSpacing: '0.12em',
                        color: typeColor,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                    }}>
                        {typeLabel}
                    </span>
                </div>
                <span style={{
                    fontSize: '10px',
                    color: '#666',
                    fontFamily: 'monospace',
                }}>
                    {formatDate(evidence.eventDate, evidence.datePrecision)}
                </span>
            </div>

            {/* Title */}
            <div style={{
                fontSize: isActive ? '16px' : '12px',
                fontWeight: 700,
                color: '#f5f5f5',
                marginBottom: '6px',
                lineHeight: 1.35,
            }}>
                {evidence.title}
            </div>

            {/* Summary (only active) */}
            {isActive && evidence.summary && (
                <div style={{
                    fontSize: '12px',
                    color: '#a3a3a3',
                    lineHeight: 1.55,
                    marginBottom: '10px',
                }}>
                    {evidence.summary}
                </div>
            )}

            {/* Confidence bar */}
            {isActive && (
                <div style={{ marginBottom: '6px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                    }}>
                        <span style={{ fontSize: '8px', color: '#555', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                            GÜVEN
                        </span>
                        <span style={{ fontSize: '9px', color: typeColor, fontFamily: 'monospace', fontWeight: 700 }}>
                            %{Math.round(evidence.confidence * 100)}
                        </span>
                    </div>
                    <div style={{
                        height: '3px',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '1px',
                    }}>
                        <div style={{
                            width: `${evidence.confidence * 100}%`,
                            height: '100%',
                            backgroundColor: typeColor,
                            borderRadius: '1px',
                            transition: 'width 0.5s ease-out',
                        }} />
                    </div>
                </div>
            )}

            {/* Verification badge + Source */}
            {isActive && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '8px',
                        letterSpacing: '0.1em',
                        color: verif.color,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '3px 8px',
                        backgroundColor: `${verif.color}15`,
                        borderRadius: '2px',
                    }}>
                        {verif.label}
                    </span>
                    {evidence.sourceName && (
                        <span style={{
                            fontSize: '9px',
                            color: '#666',
                            fontFamily: 'monospace',
                        }}>
                            {evidence.sourceUrl ? (
                                <a
                                    href={evidence.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#555', textDecoration: 'none' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = typeColor)}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                                >
                                    📎 {evidence.sourceName}
                                </a>
                            ) : (
                                <>📎 {evidence.sourceName}</>
                            )}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
