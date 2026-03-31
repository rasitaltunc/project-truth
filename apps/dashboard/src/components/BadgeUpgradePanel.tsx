'use client';
// ============================================
// SPRINT 6A: BADGE UPGRADE PANEL
// Tier yükseltme ilerleme takibi — Federal Indictment Aesthetic
// ============================================

import React, { useEffect, useState } from 'react';
import { Shield, Search, CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useBadgeStore, PromotionCheck, getBadgeTier } from '@/store/badgeStore';

interface BadgeUpgradePanelProps {
  networkId?: string;
  onClose?: () => void;
}

interface RequirementRowProps {
  label: string;
  current: number;
  required: number;
  met: boolean;
  unit?: string;
  formatValue?: (v: number) => string;
}

function RequirementRow({ label, current, required, met, unit = '', formatValue }: RequirementRowProps) {
  const pct = Math.min((current / required) * 100, 100);
  const display = formatValue ? formatValue(current) : `${current}${unit}`;
  const reqDisplay = formatValue ? formatValue(required) : `${required}${unit}`;

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        marginBottom: '4px',
      }}>
        <span style={{ color: met ? '#22c55e' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {met ? <CheckCircle size={10} /> : <Circle size={10} />}
          {label}
        </span>
        <span style={{ color: met ? '#22c55e' : '#6b7280', letterSpacing: '0.05em' }}>
          {display} / {reqDisplay}
        </span>
      </div>
      <div style={{ height: '2px', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: met ? '#22c55e' : '#f59e0b',
          transition: 'width 0.7s ease',
        }} />
      </div>
    </div>
  );
}

export default function BadgeUpgradePanel({ networkId, onClose }: BadgeUpgradePanelProps) {
  const { getEffectiveBadge, checkPromotion, requestJournalistBadge, userFingerprint, initFingerprint } =
    useBadgeStore();

  const [promotionCheck, setPromotionCheck] = useState<PromotionCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'community' | 'journalist'>('community');
  const [journalistForm, setJournalistForm] = useState({ portfolioUrl: '', reason: '' });
  const [journalistStatus, setJournalistStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fp = userFingerprint || initFingerprint();
  const badge = getEffectiveBadge(networkId);
  const currentTier = getBadgeTier(badge?.badge_tier ?? 'anonymous');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const check = await checkPromotion(networkId);
      setPromotionCheck(check);
      setIsLoading(false);
    };
    load();
  }, [networkId]);

  const handleJournalistRequest = async () => {
    if (journalistForm.portfolioUrl.length < 5 || journalistForm.reason.length < 100) return;
    setIsSubmitting(true);
    const result = await requestJournalistBadge(journalistForm.portfolioUrl, journalistForm.reason);
    setJournalistStatus(result);
    setIsSubmitting(false);
  };

  const isAlreadyElevated = ['journalist', 'institutional'].includes(badge?.badge_tier ?? 'anonymous');

  const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  return (
    <div style={{ fontFamily: monoFont, color: '#e5e5e5', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '4px' }}>
          ROZET YÜKSELTMESİ
        </div>
        <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.05em' }}>
          Mevcut: <span style={{ color: currentTier.color }}>{currentTier.name_tr}</span>
        </div>
      </div>

      {isAlreadyElevated ? (
        <div style={{
          padding: '24px 16px', textAlign: 'center',
          border: `1px solid ${currentTier.color}20`, backgroundColor: `${currentTier.color}08`,
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.05em' }}>
            <span style={{ color: currentTier.color, fontWeight: 700 }}>{currentTier.name_tr}</span> rozetine sahipsiniz.
          </div>
        </div>
      ) : (
        <>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('community')}
              style={{
                flex: 1, padding: '8px 12px', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700,
                fontFamily: monoFont, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                border: `1px solid ${activeTab === 'community' ? '#f59e0b40' : '#1a1a1a'}`,
                color: activeTab === 'community' ? '#f59e0b' : '#4b5563',
                backgroundColor: activeTab === 'community' ? '#f59e0b08' : 'transparent',
              }}
            >
              <Shield size={11} />
              PLATFORM KURDU
            </button>
            <button
              onClick={() => setActiveTab('journalist')}
              style={{
                flex: 1, padding: '8px 12px', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700,
                fontFamily: monoFont, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                border: `1px solid ${activeTab === 'journalist' ? '#8b5cf640' : '#1a1a1a'}`,
                color: activeTab === 'journalist' ? '#8b5cf6' : '#4b5563',
                backgroundColor: activeTab === 'journalist' ? '#8b5cf608' : 'transparent',
              }}
            >
              <Search size={11} />
              GAZETECİ
            </button>
          </div>

          {activeTab === 'community' && (
            <div>
              <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.03em', marginBottom: '16px', lineHeight: 1.5 }}>
                Platform Kurdu rozeti organik olarak kazanılır. Katkılarınla güven inşa et.
              </div>

              {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#4b5563', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  İlerleme hesaplanıyor...
                </div>
              ) : promotionCheck?.requirements ? (
                <>
                  <RequirementRow
                    label="Reputation Puanı"
                    current={promotionCheck.requirements.reputation.current}
                    required={promotionCheck.requirements.reputation.required}
                    met={promotionCheck.requirements.reputation.met}
                  />
                  <RequirementRow
                    label="Doğrulanmış Katkı"
                    current={promotionCheck.requirements.contributions.current}
                    required={promotionCheck.requirements.contributions.required}
                    met={promotionCheck.requirements.contributions.met}
                    unit=" katkı"
                  />
                  <RequirementRow
                    label="Doğruluk Oranı"
                    current={promotionCheck.requirements.accuracy.current}
                    required={promotionCheck.requirements.accuracy.required}
                    met={promotionCheck.requirements.accuracy.met}
                    unit="%"
                  />
                  <RequirementRow
                    label="Aktif Gün"
                    current={promotionCheck.requirements.daysActive.current}
                    required={promotionCheck.requirements.daysActive.required}
                    met={promotionCheck.requirements.daysActive.met}
                    unit=" gün"
                  />
                  <RequirementRow
                    label="Peer Nomination"
                    current={promotionCheck.requirements.nominations.current}
                    required={promotionCheck.requirements.nominations.required}
                    met={promotionCheck.requirements.nominations.met}
                    unit=" aday"
                  />

                  {promotionCheck.eligible && (
                    <div style={{
                      marginTop: '12px', padding: '12px', textAlign: 'center',
                      border: '1px solid #22c55e30', backgroundColor: '#22c55e08',
                      fontSize: '10px', color: '#22c55e', letterSpacing: '0.1em', fontWeight: 700,
                    }}>
                      TÜM ŞARTLAR KARŞILANDI — ROZET AKTİF
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '10px', color: '#4b5563' }}>İlerleme verileri yüklenemedi.</div>
              )}

              {/* How to earn reputation */}
              <div style={{
                marginTop: '16px', padding: '12px',
                border: '1px solid #1a1a1a', backgroundColor: '#0a0a0a',
                fontSize: '9px', color: '#4b5563', letterSpacing: '0.03em',
              }}>
                <div style={{ fontWeight: 700, color: '#6b7280', marginBottom: '6px', letterSpacing: '0.15em', fontSize: '8px' }}>
                  REPUTATION KAYNAKLARI
                </div>
                <div style={{ lineHeight: 1.8 }}>
                  Kanıt ekle + doğrulanırsa → +15 puan<br/>
                  Oy ver (doğru tahmin) → +2 puan<br/>
                  İlk keşif bonus → +20 puan<br/>
                  Soruşturma yayınla → +25 puan<br/>
                  Günlük aktif bonus → +1 puan
                </div>
              </div>
            </div>
          )}

          {activeTab === 'journalist' && (
            <div>
              <div style={{ fontSize: '10px', color: '#4b5563', letterSpacing: '0.03em', marginBottom: '16px', lineHeight: 1.5 }}>
                Gazeteci/araştırmacı iseniz manuel inceleme ile rozet alabilirsiniz.
                İnceleme 3-5 iş günü sürer.
              </div>

              {journalistStatus ? (
                <div style={{
                  padding: '12px', fontSize: '10px',
                  border: `1px solid ${journalistStatus.success ? '#22c55e30' : '#ef444430'}`,
                  backgroundColor: journalistStatus.success ? '#22c55e08' : '#ef444408',
                  color: journalistStatus.success ? '#22c55e' : '#ef4444',
                }}>
                  {journalistStatus.message}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', letterSpacing: '0.15em', marginBottom: '6px' }}>
                      PORTFOLYO / YAYIN URL
                    </label>
                    <input
                      type="url"
                      value={journalistForm.portfolioUrl}
                      onChange={(e) => setJournalistForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                      placeholder="https://..."
                      style={{
                        width: '100%', backgroundColor: 'transparent', border: '1px solid #1a1a1a',
                        padding: '8px 12px', fontSize: '11px', color: '#e5e5e5',
                        fontFamily: monoFont, outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#8b5cf640'}
                      onBlur={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', letterSpacing: '0.15em', marginBottom: '6px' }}>
                      BAŞVURU SEBEBİ (min 100 karakter)
                    </label>
                    <textarea
                      value={journalistForm.reason}
                      onChange={(e) => setJournalistForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Kim olduğunuzu, neden bu platformu kullanmak istediğinizi ve katkılarınızın nasıl doğrulanabileceğini açıklayın..."
                      rows={4}
                      style={{
                        width: '100%', backgroundColor: 'transparent', border: '1px solid #1a1a1a',
                        padding: '8px 12px', fontSize: '11px', color: '#e5e5e5', resize: 'none',
                        fontFamily: monoFont, outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#8b5cf640'}
                      onBlur={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                    />
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#4b5563', marginTop: '4px' }}>
                      {journalistForm.reason.length}/100
                    </div>
                  </div>
                  <button
                    onClick={handleJournalistRequest}
                    disabled={
                      isSubmitting ||
                      journalistForm.portfolioUrl.length < 5 ||
                      journalistForm.reason.length < 100
                    }
                    style={{
                      width: '100%', padding: '10px', fontSize: '10px', fontWeight: 700,
                      letterSpacing: '0.15em', fontFamily: monoFont, cursor: 'pointer',
                      border: '1px solid #8b5cf640', color: '#8b5cf6',
                      backgroundColor: 'transparent', transition: 'all 0.2s',
                      opacity: (isSubmitting || journalistForm.portfolioUrl.length < 5 || journalistForm.reason.length < 100) ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseEnter={e => {
                      if (!isSubmitting) e.currentTarget.style.backgroundColor = '#8b5cf608';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Search size={12} />
                    {isSubmitting ? 'SUBMITTING...' : 'APPLY'}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
