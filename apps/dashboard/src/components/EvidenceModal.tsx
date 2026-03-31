'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Fingerprint, Scale, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';

// DAKTİLO EFEKTİ
const TypewriterText = ({ text, speed = 20 }: { text: string; speed?: number }) => {
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
    return <span className="font-mono">{displayed}<span className="animate-pulse text-red-500">█</span></span>;
};

export default function EvidenceModal() {
    const { isArchiveOpen, activeEvidence, closeArchive } = useStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (isArchiveOpen) {
            setTimeout(() => setReady(true), 200);
        } else {
            setReady(false);
        }
    }, [isArchiveOpen, activeEvidence]);

    if (!isArchiveOpen || !activeEvidence) return null;

    const initials = activeEvidence.label?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || '??';

    return (
        <div
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
                fontFamily: 'monospace'
            }}
        >
            {/* BACKDROP */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeArchive}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.92)',
                    backdropFilter: 'blur(4px)'
                }}
            />

            {/* MODAL CARD */}
            <motion.div
                initial={{ scale: 1.1, opacity: 0, y: -30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '85vh',
                    backgroundColor: '#0a0a0a',
                    border: '2px solid #7f1d1d',
                    boxShadow: '0 0 60px rgba(127, 29, 29, 0.3)',
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'hidden'
                }}
            >
                {/* TOP BANNER */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '28px',
                    background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                }}>
                    <span style={{ fontSize: '9px', letterSpacing: '0.5em', color: '#fecaca', fontWeight: 'bold' }}>
                        ● CLASSIFIED ● TOP SECRET ● CLASSIFIED ●
                    </span>
                </div>

                {/* LEFT PANEL - MUGSHOT */}
                <div style={{
                    width: '280px',
                    minWidth: '280px',
                    backgroundColor: '#050505',
                    borderRight: '1px solid #7f1d1d30',
                    padding: '3rem 1.5rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* PHOTO/INITIALS */}
                    <div style={{
                        width: '100%',
                        aspectRatio: '3/4',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #7f1d1d50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        position: 'relative'
                    }}>
                        {activeEvidence.img ? (
                            <img
                                src={activeEvidence.img}
                                alt="Subject"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}
                            />
                        ) : (
                            <span style={{ fontSize: '4rem', fontWeight: 900, color: '#dc2626' }}>{initials}</span>
                        )}

                        {/* STATUS STAMP */}
                        <div style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(-12deg)',
                            border: `3px solid ${activeEvidence.status === 'DECEASED' ? '#6b7280' : '#dc2626'}`,
                            padding: '4px 12px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: activeEvidence.status === 'DECEASED' ? '#6b7280' : '#dc2626',
                            fontWeight: 900,
                            fontSize: '14px'
                        }}>
                            {activeEvidence.status}
                        </div>
                    </div>

                    {/* SUBJECT INFO */}
                    <div style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '9px', color: '#991b1b80', letterSpacing: '0.2em' }}>SUBJECT</span>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: '4px 0 0', textTransform: 'uppercase' }}>
                            {activeEvidence.label}
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #7f1d1d20' }}>
                        <div>
                            <span style={{ fontSize: '9px', color: '#991b1b80', letterSpacing: '0.2em' }}>ROLE</span>
                            <p style={{ color: '#9ca3af', textTransform: 'uppercase', margin: '4px 0 0', fontSize: '12px' }}>{activeEvidence.role}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '9px', color: '#991b1b80', letterSpacing: '0.2em' }}>TIER</span>
                            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '12px' }}>LEVEL {activeEvidence.tier || '?'}</p>
                        </div>
                    </div>

                    {/* RISK BAR */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #7f1d1d20' }}>
                        <span style={{ fontSize: '9px', color: '#991b1b80', letterSpacing: '0.2em' }}>RISK ASSESSMENT</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activeEvidence.risk}%` }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                    style={{
                                        height: '100%',
                                        backgroundColor: activeEvidence.risk > 70 ? '#dc2626' : activeEvidence.risk > 40 ? '#d97706' : '#16a34a'
                                    }}
                                />
                            </div>
                            <span style={{ color: '#6b7280', fontSize: '12px', width: '40px', textAlign: 'right' }}>{activeEvidence.risk}%</span>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '2rem', opacity: 0.05 }}>
                        <Fingerprint size={80} style={{ margin: '0 auto', display: 'block' }} />
                    </div>
                </div>

                {/* RIGHT PANEL - CONTENT */}
                <div style={{ flex: 1, padding: '3rem 1.5rem 1.5rem', overflowY: 'auto' }}>
                    {/* HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #7f1d1d30' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Scale size={24} style={{ color: '#dc2626' }} />
                                FEDERAL INDICTMENT
                            </h1>
                            <p style={{ fontSize: '10px', color: '#991b1b80', letterSpacing: '0.2em', marginTop: '4px' }}>
                                CASE #{activeEvidence.id?.slice(0, 8).toUpperCase() || 'UNKNOWN'}
                            </p>
                        </div>
                        <button
                            onClick={closeArchive}
                            style={{
                                padding: '8px',
                                backgroundColor: 'transparent',
                                border: '1px solid transparent',
                                borderRadius: '4px',
                                color: '#6b7280',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7f1d1d30'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* CHARGES */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <AlertTriangle size={12} /> CRIMINAL CHARGES
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {["Human Trafficking", "Racketeering", "Obstruction", "Money Laundering"].map((charge, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                    style={{
                                        backgroundColor: '#0c0c0c',
                                        borderLeft: '2px solid #7f1d1d',
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        color: '#9ca3af',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {charge}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* INTEL SUMMARY */}
                    <div>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <FileText size={12} /> INTELLIGENCE SUMMARY
                        </h3>
                        <div style={{
                            backgroundColor: '#080808',
                            border: '1px solid #7f1d1d30',
                            padding: '1rem',
                            fontSize: '13px',
                            color: '#9ca3af',
                            lineHeight: 1.6
                        }}>
                            {ready && (
                                <TypewriterText
                                    text={`Subject ${activeEvidence.label} identified as Tier ${activeEvidence.tier || '?'} associate in ongoing federal investigation. Risk assessment: ${activeEvidence.risk > 70 ? 'EXTREME' : activeEvidence.risk > 40 ? 'HIGH' : 'MODERATE'} (${activeEvidence.risk}%). Role classification: ${activeEvidence.role?.toUpperCase() || 'UNKNOWN'}. Multiple documented connections to primary targets. Further investigation warranted.`}
                                    speed={15}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
