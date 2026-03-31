'use client';

import { useMemo } from 'react';
import { X, ChevronRight, ChevronLeft, Play, Calendar, ExternalLink, Shield, Star } from 'lucide-react';
import { useLinkEvidenceStore, EvidencePulse } from '@/store/linkEvidenceStore';
import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';

// ═══════════════════════════════════════════
// LINK EVIDENCE PANEL — Sprint 6C "Konuşan İpler"
// Link tıklandığında açılan floating evidence paneli
// ═══════════════════════════════════════════

// Derive from single source of truth + add panel-specific extras
const EVIDENCE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = Object.fromEntries(
    Object.entries(EVIDENCE_TYPE_CONFIG).map(([key, cfg]) => [
        key,
        { label: cfg.labelTR.toUpperCase(), icon: cfg.icon, color: cfg.color }
    ])
);
// Add panel-specific types not in the master config
EVIDENCE_TYPE_LABELS['media_report'] = { label: 'MEDYA HABERİ', icon: '📰', color: EVIDENCE_TYPE_CONFIG.news_major?.color ?? '#3b82f6' };
EVIDENCE_TYPE_LABELS['photograph'] = { label: 'FOTOĞRAF', icon: '📷', color: EVIDENCE_TYPE_CONFIG.academic_paper?.color ?? '#6366f1' };

const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
    verified: { label: 'VERIFIED', color: '#22c55e' },
    credible: { label: 'CREDIBLE', color: '#3b82f6' },
    disputed: { label: 'DISPUTED', color: '#f59e0b' },
    unverified: { label: 'UNVERIFIED', color: '#6b7280' },
    pending: { label: 'PENDING', color: '#a855f7' },
};

function formatDate(dateStr: string | null, precision: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (precision === 'year') return d.getFullYear().toString();
    if (precision === 'month') return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function EvidenceCard({ evidence, isActive }: { evidence: EvidencePulse; isActive: boolean }) {
    const typeInfo = EVIDENCE_TYPE_LABELS[evidence.evidenceType] || EVIDENCE_TYPE_LABELS.inference;
    const verInfo = VERIFICATION_LABELS[evidence.verificationStatus] || VERIFICATION_LABELS.pending;

    return (
        <div style={{
            padding: '12px 14px',
            backgroundColor: isActive ? 'rgba(220, 38, 38, 0.15)' : 'rgba(30, 30, 30, 0.6)',
            borderTop: `1px solid ${isActive ? '#dc2626' : '#333'}`,
            borderRight: `1px solid ${isActive ? '#dc2626' : '#333'}`,
            borderBottom: `1px solid ${isActive ? '#dc2626' : '#333'}`,
            borderLeft: `3px solid ${typeInfo.color}`,
            borderRadius: '4px',
            transition: 'all 0.3s ease',
            transform: isActive ? 'scale(1.02)' : 'scale(1)',
        }}>
            {/* Üst satır: tip + tarih */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{
                    fontSize: '9px', letterSpacing: '0.15em', color: typeInfo.color,
                    fontFamily: 'monospace', fontWeight: 700,
                }}>
                    {typeInfo.icon} {typeInfo.label}
                </span>
                <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>
                    <Calendar size={9} style={{ display: 'inline', marginRight: '3px' }} />
                    {formatDate(evidence.eventDate, evidence.datePrecision)}
                </span>
            </div>

            {/* Başlık */}
            <div style={{
                fontSize: '12px', fontWeight: 600, color: '#e5e5e5',
                marginBottom: evidence.summary ? '4px' : 0,
            }}>
                {evidence.isKeystone && <Star size={11} style={{ display: 'inline', color: '#f59e0b', marginRight: '4px' }} />}
                {evidence.title}
            </div>

            {/* Özet */}
            {evidence.summary && (
                <div style={{ fontSize: '10px', color: '#999', lineHeight: 1.4 }}>
                    {evidence.summary}
                </div>
            )}

            {/* Alt satır: güven + doğrulama + kaynak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                {/* Güven barı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={9} color={verInfo.color} />
                    <div style={{
                        width: '40px', height: '3px', backgroundColor: '#333',
                        borderRadius: '2px', overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${evidence.confidence * 100}%`, height: '100%',
                            backgroundColor: verInfo.color,
                            borderRadius: '2px',
                        }} />
                    </div>
                    <span style={{ fontSize: '8px', color: verInfo.color, fontFamily: 'monospace' }}>
                        {verInfo.label}
                    </span>
                </div>

                {/* Kaynak link */}
                {evidence.sourceUrl && (
                    <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: '8px', color: '#666', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: '2px',
                        }}
                    >
                        <ExternalLink size={8} />
                        {evidence.sourceName || 'Kaynak'}
                    </a>
                )}

                {/* Topluluk oyları */}
                {evidence.communityVotes > 0 && (
                    <span style={{ fontSize: '8px', color: '#555', fontFamily: 'monospace' }}>
                        ▲ {evidence.communityVotes}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function LinkEvidencePanel() {
    const {
        activeLink, data, loading, error,
        corridorMode, activeEvidenceIndex,
        clearActiveLink, enterCorridorMode,
        nextEvidence, prevEvidence,
    } = useLinkEvidenceStore();

    // Panel kapalıysa, veri yoksa veya koridor modundaysa render etme
    if (!activeLink || (!data && !loading) || corridorMode) return null;

    const evidences = data?.evidences || [];
    const linkInfo = data?.link;
    const keystoneCount = data?.keystoneCount || 0;

    // Helper functions for UUID detection
    const isUUID = (str: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const displayLabel = (label: string): string => (!label || isUUID(label)) ? '???' : label;

    return (
        <div style={{
            position: 'fixed',
            right: '1.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '340px',
            maxHeight: '70vh',
            zIndex: 50,
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #dc262640',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s ease-out',
        }}>
            {/* HEADER */}
            <div style={{
                padding: '14px 16px 10px',
                borderBottom: '1px solid #dc262630',
                background: 'linear-gradient(180deg, rgba(220,38,38,0.08) 0%, transparent 100%)',
            }}>
                {/* Kapat butonu */}
                <button
                    onClick={clearActiveLink}
                    style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#666', padding: '4px',
                    }}
                >
                    <X size={14} />
                </button>

                {/* Link bilgisi */}
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#dc2626', fontFamily: 'monospace', marginBottom: '6px' }}>
                    CONNECTION EVIDENCE FILE
                </div>
                {linkInfo && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5' }}>
                        {displayLabel(linkInfo.sourceLabel)}
                        <span style={{ color: '#dc2626', margin: '0 6px' }}>↔</span>
                        {displayLabel(linkInfo.targetLabel)}
                    </div>
                )}

                {/* İstatistikler */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <span style={{ fontSize: '9px', color: '#888', fontFamily: 'monospace' }}>
                        📄 {evidences.length} EVIDENCE
                    </span>
                    {keystoneCount > 0 && (
                        <span style={{ fontSize: '9px', color: '#f59e0b', fontFamily: 'monospace' }}>
                            ⭐ {keystoneCount} KİLİT OLAY
                        </span>
                    )}
                    {data?.dateRange && (
                        <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>
                            {new Date(data.dateRange.earliest).getFullYear()}–{new Date(data.dateRange.latest).getFullYear()}
                        </span>
                    )}
                </div>

                {/* Koridor modu butonu */}
                {evidences.length >= 2 && (
                    <button
                        onClick={enterCorridorMode}
                        style={{
                            marginTop: '8px', padding: '6px 12px',
                            backgroundColor: '#dc262620', border: '1px solid #dc262660',
                            borderRadius: '3px', cursor: 'pointer',
                            color: '#dc2626', fontSize: '9px', fontFamily: 'monospace',
                            letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Play size={10} />
                        KRONOLOJİK KORİDOR
                    </button>
                )}
            </div>

            {/* LOADING STATE */}
            {loading && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{
                        width: '20px', height: '20px', border: '2px solid #dc262640',
                        borderTop: '2px solid #dc2626', borderRadius: '50%',
                        margin: '0 auto 8px',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                        EVIDENCE FILE LOADING...
                    </div>
                </div>
            )}

            {/* ERROR STATE */}
            {error && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'monospace' }}>
                        ❌ {error}
                    </div>
                </div>
            )}

            {/* EVIDENCE LIST */}
            {!loading && evidences.length > 0 && (
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                    {/* Zaman çizgisi çubuğu */}
                    <div style={{
                        height: '2px', backgroundColor: '#222', borderRadius: '1px',
                        position: 'relative', margin: '4px 0 8px',
                    }}>
                        {evidences.map((ev, idx) => (
                            <div key={ev.timelineId} style={{
                                position: 'absolute',
                                left: `${ev.pulsePosition * 100}%`,
                                top: '-3px',
                                width: ev.isKeystone ? '8px' : '6px',
                                height: ev.isKeystone ? '8px' : '6px',
                                borderRadius: '50%',
                                backgroundColor: ev.isKeystone ? '#f59e0b' : '#dc2626',
                                border: idx === activeEvidenceIndex ? '2px solid #fff' : 'none',
                                transform: 'translateX(-50%)',
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                            }} />
                        ))}
                    </div>

                    {/* Kanıt kartları */}
                    {evidences.map((ev, idx) => (
                        <EvidenceCard key={ev.timelineId} evidence={ev} isActive={idx === activeEvidenceIndex} />
                    ))}
                </div>
            )}

            {/* BOŞ DURUM */}
            {!loading && evidences.length === 0 && !error && (
                <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Bu bağlantı için henüz kanıt kaydı yok.
                    </div>
                    <div style={{ fontSize: '9px', color: '#555', marginTop: '4px', fontFamily: 'monospace' }}>
                        Işık Tut ile kanıt ekleyebilirsiniz.
                    </div>
                </div>
            )}

            {/* NAVİGASYON KONTROLLARI (birden fazla kanıt varsa) */}
            {evidences.length >= 2 && (
                <div style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #dc262620',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <button
                        onClick={prevEvidence}
                        disabled={activeEvidenceIndex <= 0}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeEvidenceIndex > 0 ? '#dc2626' : '#333',
                            padding: '4px',
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>
                        {activeEvidenceIndex + 1} / {evidences.length}
                    </span>
                    <button
                        onClick={nextEvidence}
                        disabled={activeEvidenceIndex >= evidences.length - 1}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeEvidenceIndex < evidences.length - 1 ? '#dc2626' : '#333',
                            padding: '4px',
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateY(-50%) translateX(20px); }
                    to { opacity: 1; transform: translateY(-50%) translateX(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
