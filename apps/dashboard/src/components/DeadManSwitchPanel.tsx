// ============================================
// TRUTH PROTOCOL - Dead Man's Switch Panel
// Kullanıcının switch'lerini yönetme arayüzü
// PROJECT TRUTH Aesthetic (Dark Mode)
// ============================================

'use client';

// Add pulse animation
if (typeof document !== 'undefined' && !document.getElementById('dms-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'dms-pulse-style';
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Clock, AlertTriangle, CheckCircle, Plus, Trash2,
    Play, Pause, Key, Copy, Eye, EyeOff, Send, Users, Mail,
    Globe, Scale, User, RefreshCw, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    DeadManSwitch,
    DMSRecipient,
    getUserSwitches,
    createDeadManSwitch,
    checkIn,
    cancelSwitch,
    pauseSwitch,
    formatTimeUntilTrigger,
    getTimeUntilTrigger
} from '@/lib/deadManSwitch';

// ============================================
// MAIN PANEL
// ============================================

export function DeadManSwitchPanel() {
    const { user, isAuthenticated, trustLevel, setShowAuthModal } = useAuth();
    const [switches, setSwitches] = useState<DeadManSwitch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSwitch, setSelectedSwitch] = useState<DeadManSwitch | null>(null);

    // Load switches
    useEffect(() => {
        if (user?.id) {
            loadSwitches();
        }
    }, [user?.id]);

    const loadSwitches = async () => {
        if (!user?.id) return;
        setLoading(true);
        const { switches: data } = await getUserSwitches(user.id);
        setSwitches(data);
        setLoading(false);
    };

    // Handle check-in
    const handleCheckIn = async () => {
        if (!user?.id) return;
        await checkIn(user.id);
        await loadSwitches();
    };

    // If not authenticated
    if (!isAuthenticated || !user) {
        return (
            <div style={{
                padding: '24px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #7f1d1d40',
                textAlign: 'center'
            }}>
                <Shield size={48} style={{ margin: '0 auto 16px', color: '#999999' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5e5e5', marginBottom: '8px' }}>Dead Man's Switch</h3>
                <p style={{ color: '#808080', fontSize: '14px', marginBottom: '16px' }}>
                    Koruma mekanizmasını kullanmak için giriş yapmanız gerekiyor.
                </p>
                <button
                    onClick={() => setShowAuthModal(true)}
                    style={{
                        padding: '8px 24px',
                        backgroundColor: '#dc2626',
                        border: '1px solid #dc2626',
                        color: '#e5e5e5',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                        fontSize: '13px',
                        cursor: 'pointer',
                        letterSpacing: '0.15em',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#991b1b';
                    }}
                    onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                    }}
                >
                    GİRİŞ YAP
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#dc262640',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #7f1d1d'
                    }}>
                        <Shield size={20} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#e5e5e5',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            letterSpacing: '0.15em'
                        }}>DEAD MAN'S SWITCH</h3>
                        <p style={{ fontSize: '10px', color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>Koruma Mekanizması</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Global Check-in Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCheckIn}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0a0a0a',
                            border: '1px solid #22c55e',
                            color: '#22c55e',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            cursor: 'pointer',
                            letterSpacing: '0.15em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <RefreshCw size={14} />
                        CHECK-IN
                    </motion.button>

                    {/* Create New */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc2626',
                            border: '1px solid #dc2626',
                            color: '#e5e5e5',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            cursor: 'pointer',
                            letterSpacing: '0.15em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#991b1b';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                        }}
                    >
                        <Plus size={14} />
                        YENİ OLUŞTUR
                    </motion.button>
                </div>
            </div>

            {/* Info Box */}
            <div style={{
                padding: '16px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #7f1d1d',
                display: 'flex',
                gap: '12px'
            }}>
                <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <p style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                        letterSpacing: '0.15em',
                        marginBottom: '8px'
                    }}>NASIL ÇALIŞIR?</p>
                    <p style={{ color: '#c0c0c0', fontSize: '12px', lineHeight: '1.5' }}>
                        Belirlediğiniz süre içinde check-in yapmazsanız, şifreli içeriğiniz
                        otomatik olarak seçtiğiniz alıcılara gönderilir. Bu, bilgi sahibi
                        olup tehlike altında olan kişileri korur.
                    </p>
                </div>
            </div>

            {/* Switches List */}
            {loading ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{
                            width: '32px',
                            height: '32px',
                            border: '2px solid #dc2626',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            margin: '0 auto'
                        }}
                    />
                </div>
            ) : switches.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: '#808080' }}>
                    <Shield size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ fontSize: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>Henüz aktif switch yok</p>
                    <p style={{ fontSize: '10px', marginTop: '4px' }}>Koruma mekanizması oluşturmak için "YENİ OLUŞTUR" butonuna tıklayın</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {switches.map(dms => (
                        <SwitchCard
                            key={dms.id}
                            dms={dms}
                            onRefresh={loadSwitches}
                            onClick={() => setSelectedSwitch(dms)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateSwitchModal
                        userId={user.id}
                        onClose={() => setShowCreateModal(false)}
                        onCreated={loadSwitches}
                    />
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSwitch && (
                    <SwitchDetailModal
                        dms={selectedSwitch}
                        onClose={() => setSelectedSwitch(null)}
                        onRefresh={loadSwitches}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// SWITCH CARD
// ============================================

function SwitchCard({
    dms,
    onRefresh,
    onClick
}: {
    dms: DeadManSwitch;
    onRefresh: () => void;
    onClick: () => void;
}) {
    const { user } = useAuth();
    const timeInfo = getTimeUntilTrigger(dms);
    const timeString = formatTimeUntilTrigger(dms);

    const statusColors = {
        active: '#22c55e',
        paused: '#eab308',
        triggered: '#dc2626',
        cancelled: '#808080'
    };

    const handlePause = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) return;
        await pauseSwitch(user.id, dms.id, dms.status !== 'paused');
        onRefresh();
    };

    const isOverdueActive = timeInfo.isOverdue && dms.status === 'active';

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={onClick}
            style={{
                padding: '16px',
                backgroundColor: isOverdueActive ? '#dc262610' : '#0a0a0a',
                border: `1px solid ${isOverdueActive ? '#dc2626' : '#7f1d1d'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Status indicator */}
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: statusColors[dms.status],
                        animation: dms.status === 'active' && !timeInfo.isOverdue ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }} />

                    <div>
                        <h4 style={{ color: '#e5e5e5', fontWeight: '600', fontSize: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.1em' }}>{dms.name}</h4>
                        <p style={{ fontSize: '10px', color: '#808080', marginTop: '2px' }}>{dms.description || 'Açıklama yok'}</p>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontSize: '12px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                        color: isOverdueActive ? '#dc2626' : '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'flex-end'
                    }}>
                        <Clock size={12} />
                        {dms.status === 'active' ? timeString : dms.status.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#808080', marginTop: '4px' }}>
                        {dms.recipients.length} alıcı
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #7f1d1d'
            }}>
                <button
                    onClick={handlePause}
                    style={{
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                        backgroundColor: dms.status === 'paused' ? '#22c55e20' : '#eab30820',
                        color: dms.status === 'paused' ? '#22c55e' : '#eab308',
                        border: `1px solid ${dms.status === 'paused' ? '#22c55e' : '#eab308'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0.1em',
                        fontWeight: 'bold'
                    }}
                >
                    {dms.status === 'paused' ? (
                        <><Play size={12} /> DEVAM</>
                    ) : (
                        <><Pause size={12} /> DURAKLAT</>
                    )}
                </button>

                <span style={{ fontSize: '10px', color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                    {dms.triggerType === 'no_checkin' && `Her ${dms.triggerDays} günde check-in`}
                    {dms.triggerType === 'scheduled' && `Tarih: ${new Date(dms.triggerDate!).toLocaleDateString('tr-TR')}`}
                </span>
            </div>
        </motion.div>
    );
}

// ============================================
// CREATE MODAL
// ============================================

function CreateSwitchModal({
    userId,
    onClose,
    onCreated
}: {
    userId: string;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        triggerType: 'no_checkin' | 'scheduled';
        triggerDays: number;
        triggerDate: string;
        content: string;
        recipients: DMSRecipient[];
    }>({
        name: '',
        description: '',
        triggerType: 'no_checkin',
        triggerDays: 7,
        triggerDate: '',
        content: '',
        recipients: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [keySavedConfirmed, setKeySavedConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addRecipient = (type: DMSRecipient['type']) => {
        setFormData(prev => ({
            ...prev,
            recipients: [...prev.recipients, { type, value: '', name: '' }]
        }));
    };

    const updateRecipient = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            recipients: prev.recipients.map((r, i) =>
                i === index ? { ...r, [field]: value } : r
            )
        }));
    };

    const removeRecipient = (index: number) => {
        setFormData(prev => ({
            ...prev,
            recipients: prev.recipients.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await createDeadManSwitch(userId, {
                name: formData.name,
                description: formData.description,
                triggerType: formData.triggerType,
                triggerDays: formData.triggerType === 'no_checkin' ? formData.triggerDays : undefined,
                triggerDate: formData.triggerType === 'scheduled' ? formData.triggerDate : undefined,
                content: formData.content,
                recipients: formData.recipients
            });

            if (!result.success) {
                // Creation failed
                setError(result.error || 'Dead Man\'s Switch oluşturulamadı. Lütfen tekrar deneyin.');
                setIsSubmitting(false);
                return;
            }

            if (!result.recoveryKey) {
                // Creation succeeded but no recovery key (should not happen)
                setError('Şifreleme hatası: Kurtarma anahtarı üretilenemedi. Lütfen tekrar deneyin.');
                setIsSubmitting(false);
                return;
            }

            // Success
            setRecoveryKey(result.recoveryKey);
            setStep(4); // Recovery key step
        } catch (err: any) {
            setError(err.message || 'Bilinmeyen bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyKey = () => {
        if (recoveryKey) {
            navigator.clipboard.writeText(recoveryKey);
        }
    };

    const finishAndClose = () => {
        onCreated();
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '500px',
                    backgroundColor: '#030303',
                    border: '1px solid #7f1d1d',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #7f1d1d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={24} style={{ color: '#dc2626' }} />
                        <div>
                            <h3 style={{ color: '#e5e5e5', fontWeight: 'bold', fontSize: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em' }}>DEAD MAN'S SWITCH OLUŞTUR</h3>
                            <p style={{ fontSize: '9px', color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>ADIM {step}/4</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: '#808080', cursor: 'pointer', fontSize: '20px', padding: '0' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Error Alert */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#dc262620',
                        border: '1px solid #dc2626',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                    }}>
                        <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: '#dc2626', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', lineHeight: '1.4' }}>
                            {error}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>İSİM *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Örn: Kişisel Sigorta"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #7f1d1d',
                                        color: '#e5e5e5',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>AÇIKLAMA</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Bu switch'in amacı..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #7f1d1d',
                                        color: '#e5e5e5',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                        fontSize: '13px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>TETİKLEME TİPİ</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, triggerType: 'no_checkin' }))}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: formData.triggerType === 'no_checkin' ? '#dc262620' : '#0a0a0a',
                                            border: `1px solid ${formData.triggerType === 'no_checkin' ? '#dc2626' : '#7f1d1d'}`,
                                            color: '#e5e5e5',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            fontSize: '11px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Clock size={16} style={{ color: '#dc2626', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e5e5e5' }}>Check-in Yok</div>
                                        <div style={{ fontSize: '10px', color: '#808080', marginTop: '4px' }}>X gün giriş yapmazsan</div>
                                    </button>
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, triggerType: 'scheduled' }))}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: formData.triggerType === 'scheduled' ? '#dc262620' : '#0a0a0a',
                                            border: `1px solid ${formData.triggerType === 'scheduled' ? '#dc2626' : '#7f1d1d'}`,
                                            color: '#e5e5e5',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            fontSize: '11px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <AlertTriangle size={16} style={{ color: '#dc2626', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e5e5e5' }}>Zamanlanmış</div>
                                        <div style={{ fontSize: '10px', color: '#808080', marginTop: '4px' }}>Belirli bir tarihte</div>
                                    </button>
                                </div>
                            </div>
                            {formData.triggerType === 'no_checkin' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>KAÇ GÜN? *</label>
                                    <select
                                        value={formData.triggerDays}
                                        onChange={e => setFormData(p => ({ ...p, triggerDays: parseInt(e.target.value) }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #7f1d1d',
                                            color: '#e5e5e5',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value={3}>3 gün</option>
                                        <option value={7}>7 gün</option>
                                        <option value={14}>14 gün</option>
                                        <option value={30}>30 gün</option>
                                        <option value={60}>60 gün</option>
                                        <option value={90}>90 gün</option>
                                    </select>
                                </div>
                            )}
                            {formData.triggerType === 'scheduled' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>TARİH *</label>
                                    <input
                                        type="date"
                                        value={formData.triggerDate}
                                        onChange={e => setFormData(p => ({ ...p, triggerDate: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #7f1d1d',
                                            color: '#e5e5e5',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>GİZLİ İÇERİK *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                                    placeholder="Tetiklendiğinde paylaşılacak bilgi..."
                                    rows={8}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #7f1d1d',
                                        color: '#e5e5e5',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                        fontSize: '12px',
                                        resize: 'vertical'
                                    }}
                                />
                                <p style={{ fontSize: '10px', color: '#808080', marginTop: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                                    Bu içerik AES-256 ile şifrelenecek. Sadece siz (kurtarma anahtarıyla) veya
                                    tetiklendiğinde alıcılar görebilir.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '10px', color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>ALICILAR</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => addRecipient('email')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '9px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #7f1d1d',
                                            color: '#808080',
                                            cursor: 'pointer',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            letterSpacing: '0.1em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <Mail size={12} />EMAIL
                                    </button>
                                    <button
                                        onClick={() => addRecipient('public')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '9px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #7f1d1d',
                                            color: '#808080',
                                            cursor: 'pointer',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            letterSpacing: '0.1em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <Globe size={12} />AÇIK
                                    </button>
                                    <button
                                        onClick={() => addRecipient('journalist')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '9px',
                                            backgroundColor: '#0a0a0a',
                                            border: '1px solid #7f1d1d',
                                            color: '#808080',
                                            cursor: 'pointer',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            letterSpacing: '0.1em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <Users size={12} />GAZETECİ
                                    </button>
                                </div>
                            </div>

                            {formData.recipients.length === 0 ? (
                                <div style={{ textAlign: 'center', paddingTop: '16px', paddingBottom: '16px', color: '#808080', fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                                    En az bir alıcı ekleyin
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.recipients.map((recipient, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#0a0a0a', border: '1px solid #7f1d1d' }}>
                                            <span style={{ fontSize: '9px', color: '#808080', width: '60px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{recipient.type}</span>
                                            {recipient.type === 'public' ? (
                                                <span style={{ fontSize: '12px', color: '#22c55e', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>Herkese açık yayınlanacak</span>
                                            ) : (
                                                <input
                                                    type={recipient.type === 'email' ? 'email' : 'text'}
                                                    value={recipient.value}
                                                    onChange={e => updateRecipient(index, 'value', e.target.value)}
                                                    placeholder={recipient.type === 'email' ? 'email@örnek.com' : 'İsim veya kurum'}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        backgroundColor: '#030303',
                                                        border: '1px solid #7f1d1d40',
                                                        fontSize: '12px',
                                                        color: '#e5e5e5',
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
                                                    }}
                                                />
                                            )}
                                            <button
                                                onClick={() => removeRecipient(index)}
                                                style={{
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    color: '#808080',
                                                    cursor: 'pointer',
                                                    padding: '0',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        recoveryKey ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto',
                                    borderRadius: '50%',
                                    backgroundColor: '#22c55e20',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle size={32} style={{ color: '#22c55e' }} />
                                </div>
                                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e5e5e5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em' }}>SWITCH OLUŞTURULDU!</h4>

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#dc262610',
                                    border: '1px solid #dc2626'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Key size={16} style={{ color: '#dc2626' }} />
                                        <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'bold', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em' }}>KURTARMA ANAHTARI</span>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <code style={{
                                            display: 'block',
                                            padding: '8px',
                                            backgroundColor: '#030303',
                                            fontSize: '9px',
                                            color: '#dc2626',
                                            wordBreak: 'break-all',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            border: '1px solid #7f1d1d',
                                            letterSpacing: '0.1em'
                                        }}>
                                            {showKey ? recoveryKey : '•'.repeat(64)}
                                        </code>
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            style={{
                                                position: 'absolute',
                                                right: '32px',
                                                top: '8px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#808080',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                padding: '0'
                                            }}
                                        >
                                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button
                                            onClick={copyKey}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '8px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#808080',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                padding: '0'
                                            }}
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '9px', color: '#dc2626', marginTop: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                                        ⚠️ BU ANAHTARI GÜVENLİ BİR YERE KAYDEDIN!
                                        İçeriğinizi sadece bu anahtarla kurtarabilirsiniz.
                                    </p>
                                </div>

                                {/* SECURITY B12: Key saved confirmation + memory cleanup */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '12px',
                                    backgroundColor: keySavedConfirmed ? '#22c55e10' : '#ffffff08',
                                    border: `1px solid ${keySavedConfirmed ? '#22c55e40' : '#ffffff20'}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={keySavedConfirmed}
                                        onChange={(e) => setKeySavedConfirmed(e.target.checked)}
                                        style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '10px', color: keySavedConfirmed ? '#22c55e' : '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.1em' }}>
                                        Anahtarımı güvenli bir yere kaydettim
                                    </span>
                                </label>

                                {keySavedConfirmed && (
                                    <button
                                        onClick={() => {
                                            // SECURITY B12: Clear recovery key from memory after confirmation
                                            setRecoveryKey(null);
                                            setShowKey(false);
                                            setKeySavedConfirmed(false);
                                            onClose();
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#22c55e',
                                            color: '#030303',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                            letterSpacing: '0.15em',
                                            fontSize: '11px',
                                            width: '100%'
                                        }}
                                    >
                                        TAMAMLANDI — PANELİ KAPAT
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        border: '2px solid #dc2626',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        margin: '0 auto'
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: '#808080', marginTop: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>Kurtarma anahtarı yükleniyor...</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid #7f1d1d',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    {step < 4 ? (
                        <>
                            <button
                                onClick={() => {
                                    setError(null);
                                    step > 1 ? setStep(step - 1) : onClose();
                                }}
                                disabled={isSubmitting}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #7f1d1d',
                                    color: isSubmitting ? '#80808080' : '#808080',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                    fontSize: '11px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.15em',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    if (!isSubmitting) {
                                        (e.target as HTMLButtonElement).style.color = '#e5e5e5';
                                        (e.target as HTMLButtonElement).style.borderColor = '#e5e5e5';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSubmitting) {
                                        (e.target as HTMLButtonElement).style.color = '#808080';
                                        (e.target as HTMLButtonElement).style.borderColor = '#7f1d1d';
                                    }
                                }}
                            >
                                {step === 1 ? 'İPTAL' : 'GERİ'}
                            </button>
                            <button
                                onClick={() => {
                                    setError(null);
                                    step < 3 ? setStep(step + 1) : handleSubmit();
                                }}
                                disabled={isSubmitting || (step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: isSubmitting || (step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0) ? '#dc262640' : '#dc2626',
                                    border: '1px solid #dc2626',
                                    color: isSubmitting || (step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0) ? '#80808080' : '#e5e5e5',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                    fontSize: '11px',
                                    cursor: isSubmitting || (step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0) ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.15em',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={e => {
                                    if (!isSubmitting && !((step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0))) {
                                        (e.target as HTMLButtonElement).style.backgroundColor = '#991b1b';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSubmitting && !((step === 1 && !formData.name) || (step === 2 && !formData.content) || (step === 3 && formData.recipients.length === 0))) {
                                        (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                                    }
                                }}
                            >
                                {isSubmitting && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            border: '1px solid #e5e5e5',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%'
                                        }}
                                    />
                                )}
                                {isSubmitting ? 'OLUŞTURULUYOR...' : step === 3 ? 'OLUŞTUR' : 'DEVAM'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={finishAndClose}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                backgroundColor: '#22c55e',
                                border: '1px solid #22c55e',
                                color: '#e5e5e5',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                fontSize: '11px',
                                cursor: 'pointer',
                                letterSpacing: '0.15em',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                (e.target as HTMLButtonElement).style.backgroundColor = '#16a34a';
                            }}
                            onMouseLeave={e => {
                                (e.target as HTMLButtonElement).style.backgroundColor = '#22c55e';
                            }}
                        >
                            ANAHTARI KAYDETTİM, KAPAT
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// DETAIL MODAL
// ============================================

function SwitchDetailModal({
    dms,
    onClose,
    onRefresh
}: {
    dms: DeadManSwitch;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const { user } = useAuth();

    const handleCancel = async () => {
        if (!user?.id) return;
        if (confirm('Bu switch\'i iptal etmek istediğinizden emin misiniz?')) {
            await cancelSwitch(user.id, dms.id);
            onRefresh();
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: '#030303',
                    border: '1px solid #7f1d1d',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #7f1d1d'
                }}>
                    <h3 style={{ color: '#e5e5e5', fontWeight: 'bold', fontSize: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em' }}>{dms.name}</h3>
                    <p style={{ fontSize: '10px', color: '#808080', marginTop: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>{dms.description}</p>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px' }}>
                        <div>
                            <span style={{ color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 'bold' }}>DURUM:</span>
                            <div style={{ marginTop: '4px', color: '#e5e5e5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>{dms.status}</div>
                        </div>
                        <div>
                            <span style={{ color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 'bold' }}>TİP:</span>
                            <div style={{ marginTop: '4px', color: '#e5e5e5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>{dms.triggerType}</div>
                        </div>
                        <div>
                            <span style={{ color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 'bold' }}>SON CHECK-IN:</span>
                            <div style={{ marginTop: '4px', color: '#e5e5e5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: '11px' }}>{new Date(dms.lastCheckin).toLocaleString('tr-TR')}</div>
                        </div>
                        <div>
                            <span style={{ color: '#808080', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 'bold' }}>ALICILAR:</span>
                            <div style={{ marginTop: '4px', color: '#e5e5e5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>{dms.recipients.length}</div>
                        </div>
                    </div>

                    <div style={{
                        padding: '12px',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #7f1d1d'
                    }}>
                        <div style={{ fontSize: '10px', color: '#808080', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.15em', fontWeight: 'bold' }}>KALAN SÜRE</div>
                        <div style={{
                            fontSize: '14px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            color: '#dc2626',
                            letterSpacing: '0.1em',
                            fontWeight: 'bold'
                        }}>
                            {formatTimeUntilTrigger(dms)}
                        </div>
                    </div>

                    {dms.status !== 'cancelled' && (
                        <button
                            onClick={handleCancel}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                backgroundColor: '#dc262610',
                                border: '1px solid #dc2626',
                                color: '#dc2626',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                                fontSize: '11px',
                                cursor: 'pointer',
                                letterSpacing: '0.15em',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                                (e.target as HTMLButtonElement).style.color = '#e5e5e5';
                            }}
                            onMouseLeave={e => {
                                (e.target as HTMLButtonElement).style.backgroundColor = '#dc262610';
                                (e.target as HTMLButtonElement).style.color = '#dc2626';
                            }}
                        >
                            <Trash2 size={14} />
                            SWITCH'İ İPTAL ET
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default DeadManSwitchPanel;
