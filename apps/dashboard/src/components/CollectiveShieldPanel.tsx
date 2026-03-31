'use client';

// ═══════════════════════════════════════════════════════
// SPRINT 13: KOLEKTİF KALKAN PANELİ
// "Bir gazeteciyi susturduğun anda, belgeleri binlerce kişiye ulaşır."
// Federal Indictment Aesthetic — sharp corners, monospace, dark
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, Users, Link2, Bell, AlertTriangle, AlertOctagon,
  CheckCircle, XCircle, Clock, ChevronRight, Plus, RefreshCw,
  Pause, Play, X, Eye, Vote, Lock, Unlock, Activity,
} from 'lucide-react';
import {
  useCollectiveShieldStore,
  getStatusLabel,
  getAlertLevelLabel,
  getTimeUntilNextCheckin,
  type CollectiveDMS,
  type HeldShard,
  type CollectiveAlert,
} from '@/store/collectiveShieldStore';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ─── Ana Panel ──────────────────────────────────────────

interface CollectiveShieldPanelProps {
  fingerprint: string;
  displayName?: string;
  onClose: () => void;
}

export default function CollectiveShieldPanel({ fingerprint, displayName, onClose }: CollectiveShieldPanelProps) {
  const {
    ownDms, heldShards, chainLength, activeAlerts,
    isLoading, error, activeTab,
    fetchAll, setActiveTab, clearError,
  } = useCollectiveShieldStore();

  useEffect(() => {
    if (fingerprint) fetchAll(fingerprint);
  }, [fingerprint, fetchAll]);

  // Kefil bekleme sayısı
  const pendingGuarantorApprovals = heldShards.filter(
    s => s.is_guarantor && !s.guarantor_approved && s.dms_status === 'pending_guarantors'
  ).length;

  // Alert sayısı
  const alertCount = activeAlerts.length + heldShards.filter(
    s => s.dms_status === 'silent_alarm' || s.dms_status === 'yellow_alarm' || s.dms_status === 'red_alarm'
  ).length;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 420, maxWidth: '100vw',
      background: '#0a0a0a', borderLeft: '1px solid #dc2626',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      fontFamily: mono, color: '#e5e5e5',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={18} color="#dc2626" />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#dc2626' }}>
            COLLECTIVE SHIELD
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Zincir uzunluğu badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', border: '1px solid #22c55e33',
            fontSize: 10, color: '#22c55e',
          }}>
            <Activity size={10} />
            <span>CHAIN: {chainLength}</span>
          </div>
          <button onClick={() => fetchAll(fingerprint)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#666',
          }}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#666',
          }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #1a1a1a',
      }}>
        {[
          { key: 'my_shields' as const, label: 'MY SHIELDS', icon: Shield, count: ownDms.length },
          { key: 'held_shards' as const, label: 'MY GUARANTEES', icon: Users, count: pendingGuarantorApprovals || undefined },
          { key: 'alerts' as const, label: 'ALERTS', icon: Bell, count: alertCount || undefined },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 0',
              background: activeTab === tab.key ? '#1a1a1a' : 'transparent',
              border: 'none', borderBottom: activeTab === tab.key ? '2px solid #dc2626' : '2px solid transparent',
              color: activeTab === tab.key ? '#e5e5e5' : '#666',
              fontSize: 9, fontFamily: mono, letterSpacing: '0.1em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <tab.icon size={11} />
            {tab.label}
            {tab.count ? (
              <span style={{
                background: tab.key === 'alerts' ? '#dc2626' : '#f59e0b',
                color: '#fff', fontSize: 8, padding: '1px 4px',
                fontWeight: 700, minWidth: 14, textAlign: 'center',
              }}>{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '8px 12px', padding: '8px 12px',
          background: '#dc262615', border: '1px solid #dc262644',
          fontSize: 10, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <XCircle size={12} />
          {error}
          <button onClick={clearError} style={{
            marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
          }}><X size={10} /></button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeTab === 'my_shields' && (
          <MyShieldsTab fingerprint={fingerprint} displayName={displayName} />
        )}
        {activeTab === 'held_shards' && (
          <HeldShardsTab fingerprint={fingerprint} />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab fingerprint={fingerprint} />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Kalkanlarım ───────────────────────────────────

function MyShieldsTab({ fingerprint, displayName }: { fingerprint: string; displayName?: string }) {
  const { ownDms, checkIn, pauseShield, resumeShield } = useCollectiveShieldStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (ownDms.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Shield size={32} color="#333" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em', marginBottom: 16 }}>
          NO COLLECTIVE SHIELDS YET
        </div>
        <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Kolektif Kalkan, belgelerinizi şifreler ve key parçalarını güvendiğiniz gazetecilere dağıtır.
          Size bir şey olursa, belgeler otomatik olarak herkese açılır.
        </div>
        {/* Create butonu — şimdilik placeholder, tam form Sprint 13.5'te */}
        <button
          disabled
          title="Bu özellik yakında aktif olacak (Tier 2+ gerekli)"
          style={{
            marginTop: 20, padding: '10px 20px',
            background: '#dc2626', border: 'none',
            color: '#fff', fontSize: 10, fontFamily: mono,
            letterSpacing: '0.15em', cursor: 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            opacity: 0.5,
          }}
        >
          <Plus size={12} />
          CREATE SHIELD
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ownDms.map(dms => {
        const status = getStatusLabel(dms.status);
        const timer = getTimeUntilNextCheckin(dms);
        const expanded = expandedId === dms.id;

        return (
          <div key={dms.id} style={{
            border: `1px solid ${status.color}33`,
            background: '#0f0f0f',
          }}>
            {/* Card header */}
            <button
              onClick={() => setExpandedId(expanded ? null : dms.id)}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left', color: '#e5e5e5',
              }}
            >
              <Shield size={14} color={status.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: mono }}>
                  {dms.name || 'COLLECTIVE SHIELD'}
                </div>
                <div style={{ fontSize: 9, color: '#666', marginTop: 2, fontFamily: mono }}>
                  {dms.threshold}/{dms.total_shards} SHARD &middot; {dms.approved_guarantors}/{dms.required_guarantors} KEFİL
                </div>
              </div>
              <div style={{
                padding: '2px 8px', fontSize: 8, fontWeight: 700,
                fontFamily: mono, letterSpacing: '0.1em',
                color: status.color, border: `1px solid ${status.color}44`,
              }}>
                {status.text}
              </div>
              <ChevronRight size={12} color="#444"
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>

            {/* Expanded detail */}
            {expanded && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a1a1a' }}>
                {/* Timer */}
                {dms.status === 'active' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 0', fontSize: 10, fontFamily: mono,
                    color: timer.isOverdue ? '#ef4444' : '#22c55e',
                  }}>
                    <Clock size={11} />
                    {timer.isOverdue
                      ? `${timer.hours} SAAT GEÇTİ — CHECK-IN YAPIN!`
                      : `SONRAKİ CHECK-IN: ${timer.hours} SAAT`
                    }
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {dms.status === 'active' && (
                    <>
                      <ActionButton
                        icon={<CheckCircle size={10} />}
                        label="CHECK-IN"
                        color="#22c55e"
                        onClick={() => checkIn(fingerprint, dms.id)}
                      />
                      <ActionButton
                        icon={<Pause size={10} />}
                        label="DURAKLAT"
                        color="#f59e0b"
                        onClick={() => pauseShield(fingerprint, dms.id)}
                      />
                    </>
                  )}
                  {dms.status === 'paused' && (
                    <ActionButton
                      icon={<Play size={10} />}
                      label="DEVAM ET"
                      color="#22c55e"
                      onClick={() => resumeShield(fingerprint, dms.id)}
                    />
                  )}
                </div>

                {/* Info grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 1, marginTop: 10, background: '#1a1a1a',
                }}>
                  <InfoCell label="OLUŞTURULMA" value={new Date(dms.created_at).toLocaleDateString('tr-TR')} />
                  <InfoCell label="SON CHECK-IN" value={new Date(dms.last_checkin).toLocaleDateString('tr-TR')} />
                  <InfoCell label="ARALIK" value={`${dms.checkin_interval_hours}s`} />
                  <InfoCell label="ÜLKE RİSKİ" value={`${dms.country_code || '—'} (${dms.risk_score || 50})`} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Kefaletlerim (Başkalarının DMS'leri) ──────────

function HeldShardsTab({ fingerprint }: { fingerprint: string }) {
  const { heldShards, approveGuarantor, verifyContent } = useCollectiveShieldStore();

  if (heldShards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Users size={32} color="#333" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em' }}>
          HENÜZ KEFALETİNİZ YOK
        </div>
        <div style={{ fontSize: 10, color: '#444', marginTop: 8, lineHeight: 1.6 }}>
          Başka gazeteciler sizi kefil olarak seçtiğinde burada görünür.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {heldShards.map(shard => {
        const dmsStatus = getStatusLabel(shard.dms_status);
        const needsApproval = shard.is_guarantor && !shard.guarantor_approved && shard.dms_status === 'pending_guarantors';
        const isAlarm = ['silent_alarm', 'yellow_alarm', 'red_alarm'].includes(shard.dms_status);

        return (
          <div key={shard.shard_id} style={{
            border: `1px solid ${isAlarm ? '#dc262644' : '#222'}`,
            background: isAlarm ? '#dc262608' : '#0f0f0f',
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {shard.is_guarantor ? <Shield size={12} color="#f59e0b" /> : <Lock size={12} color="#666" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: mono }}>
                  {shard.dms_name || 'COLLECTIVE SHIELD'}
                </div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: mono }}>
                  {shard.dms_owner_name || 'Anonim'} &middot; SHARD #{shard.shard_x}
                </div>
              </div>
              <span style={{
                fontSize: 8, fontWeight: 700, fontFamily: mono,
                padding: '2px 6px', color: dmsStatus.color,
                border: `1px solid ${dmsStatus.color}44`, letterSpacing: '0.05em',
              }}>
                {dmsStatus.text}
              </span>
            </div>

            {/* Kefil onay butonu */}
            {needsApproval && (
              <ActionButton
                icon={<CheckCircle size={10} />}
                label="KEFALETİ ONAYLA"
                color="#22c55e"
                onClick={() => approveGuarantor(fingerprint, shard.collective_dms_id)}
                fullWidth
              />
            )}

            {/* Belge doğrulama */}
            {shard.is_guarantor && !shard.has_verified_content && shard.dms_status === 'active' && (
              <ActionButton
                icon={<Eye size={10} />}
                label="VERIFY DOCUMENT"
                color="#8b5cf6"
                onClick={() => verifyContent(fingerprint, shard.collective_dms_id)}
                fullWidth
                style={{ marginTop: 6 }}
              />
            )}

            {/* Doğrulanmış badge */}
            {shard.has_verified_content && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                marginTop: 6, fontSize: 9, color: '#22c55e', fontFamily: mono,
              }}>
                <CheckCircle size={10} /> DOCUMENT VERIFIED
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Alarmlar ──────────────────────────────────────

function AlertsTab({ fingerprint }: { fingerprint: string }) {
  const { activeAlerts, heldShards, voteOnAlert } = useCollectiveShieldStore();

  // Alarm gerektiren shard'lar
  const alarmShards = heldShards.filter(
    s => ['silent_alarm', 'yellow_alarm', 'red_alarm'].includes(s.dms_status) && s.is_guarantor
  );

  if (activeAlerts.length === 0 && alarmShards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={32} color="#22c55e33" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em' }}>
          AKTİF ALARM YOK
        </div>
        <div style={{ fontSize: 10, color: '#444', marginTop: 8 }}>
          Tüm gazeteciler güvende.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Kendi DMS'lerine ait alarmlar */}
      {activeAlerts.map(alert => {
        const level = getAlertLevelLabel(alert.alert_level);
        const LevelIcon = alert.alert_level === 'red' ? AlertOctagon
          : alert.alert_level === 'yellow' ? AlertTriangle : Bell;

        return (
          <div key={alert.id} style={{
            border: `1px solid ${level.color}44`,
            background: `${level.color}08`,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LevelIcon size={14} color={level.color} />
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: mono,
                letterSpacing: '0.1em', color: level.color,
              }}>
                {level.text}
              </span>
            </div>
            {alert.missed_checkin_hours && (
              <div style={{ fontSize: 10, color: '#888', fontFamily: mono }}>
                {alert.missed_checkin_hours} SAAT CHECK-IN YOK
              </div>
            )}
            {(['resolved', 'false_alarm'].includes(alert.alert_level) || alert.alert_level === 'red') ? (
              <div style={{
                display: 'flex', gap: 12, marginTop: 8, fontSize: 9, fontFamily: mono,
              }}>
                <span style={{ color: '#ef4444' }}>ULAŞILAMAZ: {alert.votes_unreachable}</span>
                <span style={{ color: '#22c55e' }}>GÜVENDE: {alert.votes_safe}</span>
              </div>
            ) : (
              <div style={{
                display: 'flex', gap: 12, marginTop: 8, fontSize: 9, fontFamily: mono, color: '#666',
              }}>
                OYLAR GİZLİ
              </div>
            )}
          </div>
        );
      })}

      {/* Başkalarının alarmları (kefil olarak oy verme) */}
      {alarmShards.map(shard => {
        const dmsStatus = getStatusLabel(shard.dms_status);
        // Alert ID'yi DMS ID'den bulalım
        const correspondingAlert = activeAlerts.find(a => a.collective_dms_id === shard.collective_dms_id);
        const alertId = correspondingAlert?.id;

        return (
          <div key={shard.shard_id} style={{
            border: `1px solid ${dmsStatus.color}44`,
            background: `${dmsStatus.color}08`,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={14} color={dmsStatus.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: mono }}>
                  {shard.dms_owner_name || 'Anonim'}
                </div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: mono }}>
                  {shard.dms_name} &middot; {dmsStatus.text}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#ccc', marginBottom: 10, fontFamily: mono, lineHeight: 1.5 }}>
              Bu gazeteci check-in yapmadı. Durumunu biliyor musunuz?
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <ActionButton
                icon={<XCircle size={10} />}
                label="ULAŞAMIYORUM"
                color="#ef4444"
                onClick={() => {
                  if (alertId) voteOnAlert(fingerprint, alertId, 'unreachable');
                }}
                fullWidth
              />
              <ActionButton
                icon={<CheckCircle size={10} />}
                label="GÜVENDE"
                color="#22c55e"
                onClick={() => {
                  if (alertId) voteOnAlert(fingerprint, alertId, 'safe');
                }}
                fullWidth
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────

function ActionButton({ icon, label, color, onClick, fullWidth, style }: {
  icon: React.ReactNode; label: string; color: string;
  onClick: () => void; fullWidth?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '6px 12px',
        background: `${color}15`, border: `1px solid ${color}33`,
        color, fontSize: 9, fontFamily: mono, fontWeight: 600,
        letterSpacing: '0.08em', cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '6px 10px', background: '#0a0a0a',
    }}>
      <div style={{ fontSize: 8, color: '#555', fontFamily: mono, letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#ccc', fontFamily: mono, marginTop: 2 }}>{value}</div>
    </div>
  );
}
