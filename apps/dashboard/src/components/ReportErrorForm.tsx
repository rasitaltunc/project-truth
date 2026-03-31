'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Send, CheckCircle } from 'lucide-react';

// ============================================
// REPORT ERROR FORM
// "Bu bilgi yanlış" butonu — Sprint 18 Legal Fortress requirement
// Kullanıcıların yanlış bilgi bildirmesi için form
// ============================================

export interface ReportErrorProps {
  /** What is being reported (node, link, evidence, annotation) */
  targetType: 'node' | 'link' | 'evidence' | 'annotation';
  /** ID of the reported item */
  targetId: string;
  /** Display name of the reported item */
  targetName: string;
  /** Network ID context */
  networkId?: string;
  /** Close handler */
  onClose: () => void;
  /** Optional: user fingerprint for tracking */
  fingerprint?: string;
}

const REPORT_REASONS = [
  { id: 'inaccurate', label: 'Yanlış bilgi içeriyor', labelEn: 'Contains inaccurate information' },
  { id: 'outdated', label: 'Güncel değil', labelEn: 'Information is outdated' },
  { id: 'no_evidence', label: 'Kanıt yetersiz', labelEn: 'Insufficient evidence' },
  { id: 'misleading', label: 'Yanıltıcı bağlam', labelEn: 'Misleading context' },
  { id: 'privacy', label: 'Gizlilik ihlali', labelEn: 'Privacy violation' },
  { id: 'harmful', label: 'Zararlı içerik', labelEn: 'Harmful content' },
  { id: 'duplicate', label: 'Yinelenen bilgi', labelEn: 'Duplicate information' },
  { id: 'other', label: 'Diğer', labelEn: 'Other' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['id'];

export default function ReportErrorForm({
  targetType,
  targetId,
  targetName,
  networkId,
  onClose,
  fingerprint,
}: ReportErrorProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [correctInfo, setCorrectInfo] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) return;
    if (!details.trim()) {
      setError('Lütfen detay açıklaması yazın.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          targetName,
          networkId,
          reason,
          details: details.trim().slice(0, 2000),
          correctInfo: correctInfo.trim().slice(0, 2000),
          sourceUrl: sourceUrl.trim().slice(0, 500),
          email: email.trim().slice(0, 200),
          fingerprint,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gönderim başarısız');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid #22c55e40',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
        }}>
          <CheckCircle size={48} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
          <h3 style={{
            fontSize: '14px',
            color: '#22c55e',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.15em',
            marginBottom: '8px',
          }}>
            BİLDİRİM ALINDI
          </h3>
          <p style={{ fontSize: '12px', color: '#808080', marginBottom: '20px' }}>
            Bildiriminiz incelenecek ve gerekli düzeltmeler yapılacaktır.
            Teşekkür ederiz.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              backgroundColor: '#22c55e20',
              color: '#22c55e',
              border: '1px solid #22c55e40',
              cursor: 'pointer',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              fontSize: '11px',
            }}
          >
            KAPAT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: '#0a0a0a',
        border: '1px solid #dc262640',
        maxWidth: '480px',
        width: '90%',
        maxHeight: '85vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #dc262630',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: '#dc2626' }} />
            <h3 style={{
              fontSize: '12px',
              color: '#dc2626',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.15em',
              fontWeight: 'bold',
            }}>
              HATA BİLDİR
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#808080',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target info */}
          <div style={{
            padding: '10px',
            backgroundColor: '#ffffff08',
            border: '1px solid #ffffff15',
            fontSize: '11px',
          }}>
            <span style={{ color: '#808080' }}>Bildirilen: </span>
            <span style={{ color: '#e5e5e5', fontWeight: 'bold' }}>
              {targetName}
            </span>
            <span style={{ color: '#808080', fontSize: '10px', marginLeft: '8px' }}>
              ({targetType})
            </span>
          </div>

          {/* Reason selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#808080',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              NEDEN *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: reason === r.id ? '#dc262615' : 'transparent',
                    border: `1px solid ${reason === r.id ? '#dc262640' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    style={{ accentColor: '#dc2626' }}
                  />
                  <span style={{ fontSize: '11px', color: '#e5e5e5' }}>{r.label}</span>
                  <span style={{ fontSize: '9px', color: '#606060' }}>({r.labelEn})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#808080',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}>
              DETAY AÇIKLAMASI * (max 2000 karakter)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              placeholder="Neyin yanlış olduğunu açıklayın..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0f0f0f',
                border: '1px solid #ffffff20',
                color: '#e5e5e5',
                fontSize: '12px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: '9px', color: '#606060' }}>{details.length}/2000</span>
          </div>

          {/* Correct information (optional) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#808080',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}>
              DOĞRU BİLGİ (opsiyonel)
            </label>
            <textarea
              value={correctInfo}
              onChange={(e) => setCorrectInfo(e.target.value.slice(0, 2000))}
              placeholder="Doğru bilgiyi biliyorsanız paylaşın..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0f0f0f',
                border: '1px solid #ffffff20',
                color: '#e5e5e5',
                fontSize: '12px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Source URL (optional) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#808080',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}>
              KAYNAK URL (opsiyonel)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value.slice(0, 500))}
              placeholder="https://..."
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0f0f0f',
                border: '1px solid #ffffff20',
                color: '#e5e5e5',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Email (optional) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#808080',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}>
              E-POSTA (opsiyonel — sonuç bildirimi için)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 200))}
              placeholder="ornek@email.com"
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#0f0f0f',
                border: '1px solid #ffffff20',
                color: '#e5e5e5',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: '8px',
              backgroundColor: '#dc262615',
              border: '1px solid #dc262640',
              color: '#dc2626',
              fontSize: '11px',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #dc262630',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#606060' }}>
            Bildirimler anonim olarak işlenir.
          </span>
          <button
            onClick={handleSubmit}
            disabled={!reason || !details.trim() || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              backgroundColor: reason && details.trim() ? '#dc2626' : '#dc262640',
              color: '#ffffff',
              border: 'none',
              cursor: reason && details.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              fontSize: '11px',
              fontWeight: 'bold',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Send size={12} />
            {isSubmitting ? 'GÖNDERİLİYOR...' : 'BİLDİR'}
          </button>
        </div>
      </div>
    </div>
  );
}
