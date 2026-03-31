'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Lightbulb, FileText, Scale, Camera, Video, Users,
    Newspaper, DollarSign, Send, AlertTriangle, CheckCircle, Loader2, Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EvidenceSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeId: string;
    nodeName: string;
}

type EvidenceType = 'document' | 'legal' | 'media' | 'photo' | 'video' | 'testimony' | 'news' | 'financial';

const EVIDENCE_TYPES: { value: EvidenceType; label: string; icon: any }[] = [
    { value: 'document', label: 'Document', icon: FileText },
    { value: 'legal', label: 'Legal', icon: Scale },
    { value: 'media', label: 'Media', icon: Newspaper },
    { value: 'photo', label: 'Photo', icon: Camera },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'testimony', label: 'Testimony', icon: Users },
    { value: 'news', label: 'News', icon: Newspaper },
    { value: 'financial', label: 'Financial', icon: DollarSign },
];

const LANGUAGES = [
    { value: 'tr', label: '🇹🇷 Türkçe' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
    { value: 'es', label: '🇪🇸 Español' },
];

export default function EvidenceSubmitModal({ isOpen, onClose, nodeId, nodeName }: EvidenceSubmitModalProps) {
    const { user, isAuthenticated, canSubmitEvidence, setShowAuthModal, setAuthModalMode, trustLevel } = useAuth();

    const [formData, setFormData] = useState({
        evidence_type: 'document' as EvidenceType,
        title: '',
        description: '',
        source_name: '',
        source_url: '',
        source_date: '',
        language: 'tr',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.title.trim()) {
            setErrorMessage('Başlık zorunludur');
            return;
        }
        if (!formData.source_name.trim()) {
            setErrorMessage('Kaynak adı zorunludur');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            // ✅ Community API'ye gönder — ANA AĞI ETKİLEMEZ
            const response = await fetch('/api/community/evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node_id: nodeId,
                    submitted_by: user?.anonymous_id || 'anonymous',
                    evidence_type: formData.evidence_type,
                    title: formData.title,
                    description: formData.description,
                    source_name: formData.source_name,
                    source_url: formData.source_url,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSubmitStatus('success');
                // Reset form
                setTimeout(() => {
                    setFormData({
                        evidence_type: 'document',
                        title: '',
                        description: '',
                        source_name: '',
                        source_url: '',
                        source_date: '',
                        language: 'tr',
                    });
                    setSubmitStatus('idle');
                    onClose();
                }, 2000);
            } else {
                setSubmitStatus('error');
                setErrorMessage(data.error || 'Bir hata oluştu');
            }
        } catch (error) {
            setSubmitStatus('error');
            setErrorMessage('Bağlantı hatası');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(4px)'
                    }}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #7f1d1d',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #7f1d1d30',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(180deg, #7f1d1d20 0%, transparent 100%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Lightbulb size={24} style={{ color: '#fbbf24' }} />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontWeight: 700 }}>
                                    IŞIK TUT
                                </h2>
                                <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
                                    {nodeName} için kanıt ekle
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                padding: '8px'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Auth Gate - Giriş yapmadan kanıt gönderilemez */}
                    {!isAuthenticated ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem 2rem',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                backgroundColor: '#7f1d1d20',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <Lock size={36} style={{ color: '#dc2626' }} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px', color: '#ffffff' }}>
                                Giriş Gerekli
                            </h3>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '13px', color: '#6b7280', maxWidth: '280px' }}>
                                Kanıt eklemek için giriş yapmanız veya anonim bir hesap oluşturmanız gerekiyor.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    setAuthModalMode('register');
                                    setShowAuthModal(true);
                                }}
                                style={{
                                    padding: '12px 32px',
                                    backgroundColor: '#dc2626',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                🔐 Giriş Yap / Kayıt Ol
                            </button>
                            <p style={{ margin: '1rem 0 0 0', fontSize: '11px', color: '#4b5563' }}>
                                Kimliğiniz anonim kalacaktır
                            </p>
                        </div>
                    ) : !canSubmitEvidence ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem 2rem',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                backgroundColor: '#f59e0b20',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <AlertTriangle size={36} style={{ color: '#f59e0b' }} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px', color: '#ffffff' }}>
                                Yetki Seviyesi Yetersiz
                            </h3>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: '#6b7280', maxWidth: '280px' }}>
                                Mevcut güven seviyeniz: <span style={{ color: trustLevel?.color }}>{trustLevel?.icon} {trustLevel?.name}</span>
                            </p>
                            <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', maxWidth: '280px' }}>
                                Kanıt göndermek için en az <strong style={{ color: '#f59e0b' }}>Doğrulanmış İnsan</strong> seviyesinde olmanız gerekiyor.
                            </p>
                        </div>
                    ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                        {/* Evidence Type */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.1em' }}>
                                EVIDENCE TYPE *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {EVIDENCE_TYPES.map(type => {
                                    const Icon = type.icon;
                                    const isSelected = formData.evidence_type === type.value;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, evidence_type: type.value }))}
                                            style={{
                                                padding: '12px 8px',
                                                backgroundColor: isSelected ? '#7f1d1d30' : '#0f0f0f',
                                                border: `1px solid ${isSelected ? '#dc2626' : '#333'}`,
                                                borderRadius: '4px',
                                                color: isSelected ? '#fca5a5' : '#6b7280',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Icon size={18} />
                                            <span style={{ fontSize: '10px' }}>{type.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Title */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                BAŞLIK *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Kanıtın kısa başlığı..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#0f0f0f',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                AÇIKLAMA
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Kanıtın detaylı açıklaması..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#0f0f0f',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Source Name & URL */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                    KAYNAK ADI *
                                </label>
                                <input
                                    type="text"
                                    value={formData.source_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, source_name: e.target.value }))}
                                    placeholder="örn: BBC News, NYT..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0f0f0f',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                    KAYNAK URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.source_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                                    placeholder="https://..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0f0f0f',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Date & Language */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                    KAYNAK TARİHİ
                                </label>
                                <input
                                    type="date"
                                    value={formData.source_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, source_date: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0f0f0f',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.1em' }}>
                                    DİL
                                </label>
                                <select
                                    value={formData.language}
                                    onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0f0f0f',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Warning */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#7f1d1d10',
                            border: '1px solid #7f1d1d30',
                            borderRadius: '4px',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                        }}>
                            <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>
                                Eklediğiniz kanıtlar <strong style={{ color: '#fca5a5' }}>topluluk katkısı</strong> olarak işaretlenecek ve
                                moderatör onayından sonra görünür olacaktır. Yanlış bilgi paylaşımı hesabınızın askıya alınmasına neden olabilir.
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#dc262620',
                                border: '1px solid #dc262650',
                                borderRadius: '4px',
                                marginBottom: '1rem',
                                color: '#fca5a5',
                                fontSize: '12px'
                            }}>
                                {errorMessage}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || submitStatus === 'success'}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: submitStatus === 'success' ? '#16a34a' : '#7f1d1d',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                letterSpacing: '0.1em',
                                cursor: isSubmitting ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    GÖNDERİLİYOR...
                                </>
                            ) : submitStatus === 'success' ? (
                                <>
                                    <CheckCircle size={18} />
                                    EVIDENCE ADDED!
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    SUBMIT EVIDENCE
                                </>
                            )}
                        </button>

                        {/* User Info */}
                        <div style={{
                            marginTop: '1rem',
                            padding: '10px',
                            backgroundColor: '#0f0f0f',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: `${trustLevel?.color}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px'
                            }}>
                                {trustLevel?.icon}
                            </span>
                            <div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Gönderen:</div>
                                <code style={{ fontSize: '12px', color: '#22d3ee' }}>{user?.anonymous_id}</code>
                            </div>
                        </div>
                    </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
