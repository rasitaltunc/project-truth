'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { useLinkEvidenceStore, EvidencePulse } from '@/store/linkEvidenceStore';
import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';

// ═══════════════════════════════════════════
// CORRIDOR OVERLAY V2 — Kronolojik Koridor
// Checkpoint panelleri + okunabilir UI + akıcı geçişler
// ═══════════════════════════════════════════

const EVIDENCE_TYPE_COLORS: Record<string, string> = Object.fromEntries(
    Object.entries(EVIDENCE_TYPE_CONFIG).map(([key, cfg]) => [key, cfg.color])
);

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
    court_record: 'MAHKEME KAYDI',
    financial_record: 'FİNANSAL KAYIT',
    witness_testimony: 'TANIK İFADESİ',
    news_major: 'ANA AKIM HABER',
    official_document: 'RESMİ BELGE',
    leaked_document: 'SIZDIRILAN BELGE',
    photograph: 'FOTOĞRAF',
    social_media: 'SOSYAL MEDYA',
    inference: 'ÇIKARIM',
    flight_record: 'UÇUŞ KAYDI',
    academic_paper: 'AKADEMİK',
    rumor: 'SÖYLENTİ',
};

function formatDate(dateStr: string | null, precision: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (precision === 'year') return d.getFullYear().toString();
    if (precision === 'month') return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// UUID mi yoksa gerçek isim mi kontrol et
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function displayLabel(label: string): string {
    if (!label || isUUID(label)) return '???';
    return label;
}

// ═══ CHECKPOINT POPUP PANEL ═══
// Her evidence noktasına geldiğinde yukarı açılan kaliteli kart
// phase: 'exiting' → hızla aşağı kayar, 'entering' → yukarı süzülür, 'visible' → sabit
type PanelPhase = 'visible' | 'exiting' | 'entering';

function CheckpointPanel({ evidence, phase }: { evidence: EvidencePulse; phase: PanelPhase }) {
    const typeColor = EVIDENCE_TYPE_COLORS[evidence.evidenceType] || '#6b7280';
    const typeLabel = EVIDENCE_TYPE_LABELS[evidence.evidenceType] || evidence.evidenceType?.replace(/_/g, ' ').toUpperCase() || 'BİLİNMEYEN';

    const getTransform = () => {
        switch (phase) {
            case 'exiting': return 'translateX(-50%) translateY(40px) scale(0.95)';
            case 'entering': return 'translateX(-50%) translateY(-12px) scale(1)';
            case 'visible': return 'translateX(-50%) translateY(-12px) scale(1)';
        }
    };

    const getTransition = () => {
        switch (phase) {
            case 'exiting': return 'all 0.18s cubic-bezier(0.4, 0, 1, 1)'; // hızlı düşüş
            case 'entering': return 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'; // yavaş yükseliş (spring)
            case 'visible': return 'none';
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: getTransform(),
            opacity: phase === 'exiting' ? 0 : 1,
            transition: getTransition(),
            pointerEvents: phase === 'visible' ? 'auto' : 'none',
            width: '420px',
            maxWidth: '90vw',
            zIndex: 80,
        }}>
            <div style={{
                backgroundColor: 'rgba(8, 8, 8, 0.96)',
                backdropFilter: 'blur(16px)',
                borderRadius: '6px',
                borderTop: `2px solid ${typeColor}`,
                borderLeft: `1px solid ${typeColor}30`,
                borderRight: `1px solid ${typeColor}30`,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '16px 20px',
                boxShadow: `0 -8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 ${typeColor}15`,
            }}>
                {/* Üst satır: Tip badge + Tarih */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {evidence.isKeystone && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                padding: '2px 8px',
                                backgroundColor: '#f59e0b18',
                                border: '1px solid #f59e0b40',
                                borderRadius: '3px',
                            }}>
                                <Star size={10} fill="#f59e0b" color="#f59e0b" />
                                <span style={{ fontSize: '8px', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
                                    KİLİT OLAY
                                </span>
                            </div>
                        )}
                        <span style={{
                            fontSize: '9px',
                            letterSpacing: '0.12em',
                            color: typeColor,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            padding: '2px 8px',
                            backgroundColor: `${typeColor}12`,
                            borderRadius: '3px',
                        }}>
                            {typeLabel}
                        </span>
                    </div>
                    <span style={{
                        fontSize: '11px',
                        color: '#888',
                        fontFamily: 'monospace',
                    }}>
                        {formatDate(evidence.eventDate, evidence.datePrecision)}
                    </span>
                </div>

                {/* Başlık */}
                <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#f5f5f5',
                    lineHeight: 1.35,
                    marginBottom: '6px',
                }}>
                    {evidence.title}
                </div>

                {/* Özet */}
                {evidence.summary && (
                    <div style={{
                        fontSize: '12px',
                        color: '#a3a3a3',
                        lineHeight: 1.55,
                        marginBottom: '10px',
                    }}>
                        {evidence.summary}
                    </div>
                )}

                {/* Alt bilgi: Güven + Kaynak */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Güven barı */}
                    <div style={{ flex: 1, maxWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '8px', color: '#555', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                GÜVEN
                            </span>
                            <span style={{ fontSize: '9px', color: typeColor, fontFamily: 'monospace', fontWeight: 700 }}>
                                %{Math.round(evidence.confidence * 100)}
                            </span>
                        </div>
                        <div style={{ height: '3px', backgroundColor: '#1a1a1a', borderRadius: '2px' }}>
                            <div style={{
                                width: `${evidence.confidence * 100}%`,
                                height: '100%',
                                backgroundColor: typeColor,
                                borderRadius: '2px',
                                transition: 'width 0.6s ease-out',
                            }} />
                        </div>
                    </div>

                    {/* Kaynak */}
                    {evidence.sourceName && (
                        <span style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                            {evidence.sourceUrl ? (
                                <a
                                    href={evidence.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#666', textDecoration: 'none' }}
                                >
                                    📎 {evidence.sourceName}
                                </a>
                            ) : (
                                <>📎 {evidence.sourceName}</>
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Alt ok (pointer) */}
            <div style={{
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${typeColor}40`,
                margin: '0 auto',
            }} />
        </div>
    );
}

// ═══ ANA OVERLAY ═══
export default function CorridorOverlay() {
    const {
        corridorMode, corridorPaused, corridorProgress,
        data, activeEvidenceIndex,
        exitCorridorMode, toggleCorridorPause,
        nextEvidence, prevEvidence, setCorridorProgress,
    } = useLinkEvidenceStore();

    const animRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const [panelPhase, setPanelPhase] = useState<PanelPhase>('visible');
    const [displayedIndex, setDisplayedIndex] = useState(activeEvidenceIndex);
    const prevIndexRef = useRef(activeEvidenceIndex);

    // Index değiştiğinde: eski kart hızla aşağı → yeni kart yukarı süzülür
    useEffect(() => {
        if (prevIndexRef.current !== activeEvidenceIndex) {
            // Faz 1: Eski kart hızla aşağı kayar (180ms)
            setPanelPhase('exiting');

            // Faz 2: Eski kart çıktıktan sonra yeni kartı hazırla (görünmez konumda)
            const swapTimer = setTimeout(() => {
                setDisplayedIndex(activeEvidenceIndex);
                setPanelPhase('entering');
            }, 200);

            // Faz 3: Yeni kart süzüldükten sonra sabit
            const settleTimer = setTimeout(() => {
                setPanelPhase('visible');
            }, 560); // 200 + 360ms enter animation

            prevIndexRef.current = activeEvidenceIndex;
            return () => {
                clearTimeout(swapTimer);
                clearTimeout(settleTimer);
            };
        }
    }, [activeEvidenceIndex]);

    // ESC + klavye kontrolleri
    useEffect(() => {
        if (!corridorMode) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') exitCorridorMode();
            if (e.key === ' ') { e.preventDefault(); toggleCorridorPause(); }
            if (e.key === 'ArrowRight') nextEvidence();
            if (e.key === 'ArrowLeft') prevEvidence();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [corridorMode, exitCorridorMode, toggleCorridorPause, nextEvidence, prevEvidence]);

    // Auto-play animasyonu
    useEffect(() => {
        if (!corridorMode || corridorPaused) return;
        const SPEED = 0.03;
        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;
            const newProgress = Math.min(1, corridorProgress + SPEED * delta);
            setCorridorProgress(newProgress);
            if (newProgress >= 1) return;
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [corridorMode, corridorPaused, corridorProgress, setCorridorProgress]);

    if (!corridorMode || !data) return null;

    const evidences = data.evidences;
    const activeEvidence = evidences[activeEvidenceIndex];
    const linkInfo = data.link;
    const typeColor = EVIDENCE_TYPE_COLORS[activeEvidence?.evidenceType] || '#6b7280';
    const srcLabel = displayLabel(linkInfo.sourceLabel);
    const tgtLabel = displayLabel(linkInfo.targetLabel);

    return (
        <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 60,
            pointerEvents: 'auto',
            animation: 'corridorSlideUp 0.4s ease-out',
        }}>
            {/* Üst gradient (fade efekti) */}
            <div style={{
                height: '80px',
                background: 'linear-gradient(to bottom, transparent, rgba(5,5,5,0.95))',
                pointerEvents: 'none',
            }} />

            {/* Ana panel */}
            <div style={{
                backgroundColor: 'rgba(5, 5, 5, 0.98)',
                borderTop: `1px solid ${typeColor}40`,
                padding: '0 24px 20px',
                position: 'relative',
            }}>
                {/* Checkpoint popup — aktif evidence'ın paneli */}
                {evidences[displayedIndex] && (
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        height: '0px', // Pozisyon için yer kaplamaz, absolute child render
                        overflow: 'visible',
                    }}>
                        <CheckpointPanel
                            evidence={evidences[displayedIndex]}
                            phase={panelPhase}
                        />
                    </div>
                )}

                {/* Progress bar */}
                <div style={{
                    height: '4px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '2px',
                    marginBottom: '14px',
                    position: 'relative',
                    cursor: 'pointer',
                }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    setCorridorProgress(Math.max(0, Math.min(1, x)));
                }}
                >
                    {/* İlerleme çubuğu */}
                    <div style={{
                        width: `${corridorProgress * 100}%`,
                        height: '100%',
                        backgroundColor: '#dc2626',
                        borderRadius: '2px',
                        transition: 'width 0.1s linear',
                    }} />

                    {/* Evidence checkpoint noktaları */}
                    {evidences.map((ev, idx) => {
                        const isActive = idx === activeEvidenceIndex;
                        const evColor = EVIDENCE_TYPE_COLORS[ev.evidenceType] || '#dc2626';
                        return (
                            <div key={ev.timelineId} style={{
                                position: 'absolute',
                                left: `${ev.pulsePosition * 100}%`,
                                top: '50%',
                                transform: `translate(-50%, -50%) scale(${isActive ? 1.4 : 1})`,
                                width: ev.isKeystone ? '14px' : '10px',
                                height: ev.isKeystone ? '14px' : '10px',
                                borderRadius: '50%',
                                backgroundColor: isActive ? '#fff' : (ev.isKeystone ? '#f59e0b' : evColor),
                                border: isActive ? `2px solid ${typeColor}` : '2px solid #1a1a1a',
                                cursor: 'pointer',
                                zIndex: isActive ? 5 : 2,
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isActive
                                    ? `0 0 12px ${typeColor}80, 0 0 24px ${typeColor}30`
                                    : (ev.isKeystone ? '0 0 8px rgba(245,158,11,0.4)' : 'none'),
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCorridorProgress(ev.pulsePosition);
                            }}
                            />
                        );
                    })}
                </div>

                {/* Kontrol satırı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                    {/* Sol: Link bilgisi */}
                    <div style={{ minWidth: '180px' }}>
                        <div style={{
                            fontSize: '8px',
                            letterSpacing: '0.25em',
                            color: '#dc262680',
                            fontFamily: 'monospace',
                            marginBottom: '3px',
                        }}>
                            KRONOLOJİK KORİDOR
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5' }}>
                            {srcLabel}
                            <span style={{ color: '#dc2626', margin: '0 6px' }}>→</span>
                            {tgtLabel}
                        </div>
                        {data.dateRange && (
                            <div style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace', marginTop: '2px' }}>
                                {new Date(data.dateRange.earliest).getFullYear()} — {new Date(data.dateRange.latest).getFullYear()}
                            </div>
                        )}
                    </div>

                    {/* Orta: Aktif kanıt özet — kısa, okunabilir */}
                    {activeEvidence && (
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{
                                fontSize: '9px',
                                color: typeColor,
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                marginBottom: '2px',
                            }}>
                                {activeEvidence.isKeystone && '⭐ '}
                                {EVIDENCE_TYPE_LABELS[activeEvidence.evidenceType] || 'ÇIKARIM'}
                            </div>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#e5e5e5',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '400px',
                                margin: '0 auto',
                            }}>
                                {activeEvidence.title}
                            </div>
                        </div>
                    )}

                    {/* Sağ: Navigasyon kontrolleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                            {formatDate(activeEvidence?.eventDate, activeEvidence?.datePrecision || 'day')}
                        </span>

                        <div style={{ width: '1px', height: '20px', backgroundColor: '#333', margin: '0 4px' }} />

                        <button
                            onClick={prevEvidence}
                            style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                backgroundColor: '#1a1a1a', border: '1px solid #333',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: activeEvidenceIndex > 0 ? '#e5e5e5' : '#333',
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            onClick={toggleCorridorPause}
                            style={{
                                width: '38px', height: '38px', borderRadius: '50%',
                                backgroundColor: '#dc262620', border: '1px solid #dc2626',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#dc2626',
                            }}
                        >
                            {corridorPaused ? <Play size={16} /> : <Pause size={16} />}
                        </button>

                        <button
                            onClick={nextEvidence}
                            style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                backgroundColor: '#1a1a1a', border: '1px solid #333',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: activeEvidenceIndex < evidences.length - 1 ? '#e5e5e5' : '#333',
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>

                        <span style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', marginLeft: '4px' }}>
                            {activeEvidenceIndex + 1} / {evidences.length}
                        </span>

                        <div style={{ width: '1px', height: '20px', backgroundColor: '#333', margin: '0 4px' }} />

                        <button
                            onClick={exitCorridorMode}
                            style={{
                                padding: '5px 12px', fontSize: '9px',
                                backgroundColor: 'transparent', border: '1px solid #333',
                                borderRadius: '3px', cursor: 'pointer',
                                color: '#666', fontFamily: 'monospace', letterSpacing: '0.1em',
                            }}
                        >
                            ESC ÇIKIŞ
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes corridorSlideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
