'use client';
// ============================================
// SPRINT 6A: REPUTATION HISTORY
// Timeline of reputation gains/losses — Federal Indictment Aesthetic
// ============================================

import React, { useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Star, Shield, Sun, Flashlight, Newspaper, ThumbsUp, ThumbsDown, Clock, Loader2 } from 'lucide-react';
import { useBadgeStore, ReputationTransaction } from '@/store/badgeStore';

interface ReputationHistoryProps {
  fingerprint?: string;
  networkId?: string;
  limit?: number;
  compact?: boolean;
}

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const TX_LABELS: Record<string, string> = {
  evidence_submit: 'Kanıt Gönderildi',
  evidence_verified: 'Kanıt Doğrulandı',
  evidence_disputed: 'Kanıt Reddedildi',
  nomination_received: 'Aday Gösterildi',
  moderation_action: 'Moderasyon',
  daily_bonus: 'Günlük Bonus',
  first_discovery: 'İlk Keşif',
  investigation_published: 'Soruşturma Yayınlandı',
  vote_correct: 'Oy (Doğru Tahmin)',
  vote_wrong: 'Oy (Yanlış Tahmin)',
};

const TX_ICONS: Record<string, React.ReactNode> = {
  evidence_submit: <FileText size={12} />,
  evidence_verified: <CheckCircle size={12} />,
  evidence_disputed: <XCircle size={12} />,
  nomination_received: <Star size={12} />,
  moderation_action: <Shield size={12} />,
  daily_bonus: <Sun size={12} />,
  first_discovery: <Flashlight size={12} />,
  investigation_published: <Newspaper size={12} />,
  vote_correct: <ThumbsUp size={12} />,
  vote_wrong: <ThumbsDown size={12} />,
};

function TransactionRow({ tx, compact = false }: { tx: ReputationTransaction; compact?: boolean }) {
  const isPositive = tx.amount > 0;
  const label = TX_LABELS[tx.transaction_type] ?? tx.transaction_type;
  const icon = TX_ICONS[tx.transaction_type] ?? <FileText size={12} />;
  const date = new Date(tx.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: compact ? '6px 12px' : '10px 12px',
      borderBottom: '1px solid #111',
      fontFamily: monoFont,
    }}>
      <span style={{ flexShrink: 0, color: isPositive ? '#22c55e' : '#ef4444', opacity: 0.7, display: 'flex' }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: '10px', color: '#d4d4d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        {!compact && tx.description && (
          <div style={{ fontSize: '9px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {tx.description}
          </div>
        )}
        {!compact && (
          <div style={{ fontSize: '9px', color: '#374151', marginTop: '2px' }}>{timeAgo}</div>
        )}
      </div>
      <div style={{
        fontSize: '11px', fontWeight: 700, flexShrink: 0,
        color: isPositive ? '#22c55e' : '#ef4444', letterSpacing: '0.02em',
      }}>
        {isPositive ? '+' : ''}{tx.amount}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  if (minutes > 0) return `${minutes} dakika önce`;
  return 'Az önce';
}

export default function ReputationHistory({
  fingerprint,
  networkId,
  limit = 20,
  compact = false,
}: ReputationHistoryProps) {
  const { reputationHistory, fetchReputationHistory, reputation, userFingerprint, initFingerprint } =
    useBadgeStore();

  const fp = fingerprint || userFingerprint || initFingerprint();

  useEffect(() => {
    fetchReputationHistory(fp, limit);
  }, [fp, limit]);

  const totalGain = reputationHistory.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalLoss = reputationHistory.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  if (reputationHistory.length === 0) {
    return (
      <div style={{
        padding: '32px 16px', textAlign: 'center', fontFamily: monoFont,
        color: '#2a2a2a', fontSize: '10px', letterSpacing: '0.05em',
      }}>
        <Clock size={20} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
        <div>Henüz reputation geçmişin yok.</div>
        <div style={{ marginTop: '6px', color: '#1a1a1a' }}>Kanıt ekle veya oy kullan, reputation kazan.</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: monoFont }}>
      {/* Summary */}
      {!compact && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px',
          backgroundColor: '#111', margin: '0', padding: '0',
        }}>
          <div style={{
            padding: '12px', textAlign: 'center', backgroundColor: '#0a0a0a',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e5e5e5' }}>
              {reputation?.score ?? 0}
            </div>
            <div style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.15em', marginTop: '4px' }}>TOPLAM</div>
          </div>
          <div style={{
            padding: '12px', textAlign: 'center', backgroundColor: '#0a0a0a',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>
              +{totalGain}
            </div>
            <div style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.15em', marginTop: '4px' }}>KAZANILAN</div>
          </div>
          <div style={{
            padding: '12px', textAlign: 'center', backgroundColor: '#0a0a0a',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
              {totalLoss}
            </div>
            <div style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.15em', marginTop: '4px' }}>KESİLEN</div>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div>
        {reputationHistory.slice(0, limit).map((tx, i) => (
          <TransactionRow key={tx.id ?? i} tx={tx} compact={compact} />
        ))}
      </div>

      {reputationHistory.length >= limit && (
        <div style={{
          textAlign: 'center', fontSize: '9px', color: '#374151',
          padding: '8px', letterSpacing: '0.05em',
        }}>
          Son {limit} işlem gösteriliyor
        </div>
      )}
    </div>
  );
}
