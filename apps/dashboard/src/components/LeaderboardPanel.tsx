'use client';
// ============================================
// SPRINT 6A: LEADERBOARD PANEL
// Top contributors — Federal Indictment Aesthetic
// ============================================

import React, { useEffect, useState } from 'react';
import { BarChart2, Loader2 } from 'lucide-react';
import { useBadgeStore, LeaderboardEntry, getBadgeTier } from '@/store/badgeStore';
import BadgeDisplay from './BadgeDisplay';

interface LeaderboardPanelProps {
  networkId?: string;
  limit?: number;
  compact?: boolean;
}

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

function getRankDisplay(rank: number): { label: string; color: string } {
  if (rank === 1) return { label: '#1', color: '#fbbf24' };
  if (rank === 2) return { label: '#2', color: '#9ca3af' };
  if (rank === 3) return { label: '#3', color: '#b45309' };
  return { label: `#${rank}`, color: '#4b5563' };
}

function LeaderboardRow({
  entry,
  isCurrentUser,
  compact,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  compact: boolean;
}) {
  const tier = getBadgeTier(entry.badge_tier);
  const shortFp = entry.fingerprint.slice(0, 10) + '...';
  const rank = getRankDisplay(entry.rank ?? 0);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: compact ? '6px 12px' : '10px 12px',
      borderBottom: '1px solid #111',
      backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.03)' : 'transparent',
      fontFamily: monoFont,
    }}>
      {/* Rank */}
      <div style={{
        width: '28px', textAlign: 'center', fontSize: '11px',
        fontWeight: 700, color: rank.color, flexShrink: 0,
        letterSpacing: '0.05em',
      }}>
        {rank.label}
      </div>

      {/* Badge */}
      <BadgeDisplay tierId={entry.badge_tier} size="xs" showTooltip={false} />

      {/* User info */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: '10px', color: '#9ca3af',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shortFp}
          {isCurrentUser && (
            <span style={{ marginLeft: '6px', fontSize: '9px', color: '#22c55e', letterSpacing: '0.1em' }}>(SEN)</span>
          )}
        </div>
        {!compact && (
          <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '2px' }}>
            {entry.contributions} katkı · %{Math.round(entry.accuracy * 100)} doğruluk
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: tier.color }}>
          {entry.reputation}
        </div>
        {!compact && (
          <div style={{ fontSize: '8px', color: '#4b5563', letterSpacing: '0.1em' }}>PUAN</div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPanel({ networkId, limit = 20, compact = false }: LeaderboardPanelProps) {
  const { leaderboard, fetchLeaderboard, isLoadingLeaderboard, userFingerprint } = useBadgeStore();
  const [tab, setTab] = useState<'network' | 'global'>('network');

  useEffect(() => {
    fetchLeaderboard(tab === 'network' ? networkId : undefined);
  }, [tab, networkId]);

  const currentUserEntry = leaderboard.find((e) => e.fingerprint === userFingerprint);

  return (
    <div style={{ fontFamily: monoFont }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #1a1a1a', padding: '0 12px',
      }}>
        {(['network', 'global'] as const).map(t => {
          const isActive = tab === t;
          const label = t === 'network' ? 'BU AĞ' : 'GLOBAL';
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px', fontSize: '9px', letterSpacing: '0.15em',
                fontWeight: 700, fontFamily: monoFont, cursor: 'pointer',
                border: 'none', background: 'none',
                borderBottom: isActive ? '2px solid #dc2626' : '2px solid transparent',
                color: isActive ? '#dc2626' : '#4b5563',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isLoadingLeaderboard ? (
        <div style={{
          padding: '32px', textAlign: 'center', color: '#4b5563', fontSize: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Yükleniyor...
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{
          padding: '32px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: '10px',
          letterSpacing: '0.05em',
        }}>
          <BarChart2 size={20} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          Henüz liderlik tablosu verisi yok.
        </div>
      ) : (
        <div>
          {leaderboard.slice(0, limit).map((entry) => (
            <LeaderboardRow
              key={entry.fingerprint}
              entry={entry}
              isCurrentUser={entry.fingerprint === userFingerprint}
              compact={compact}
            />
          ))}

          {/* Current user's position if not in top N */}
          {currentUserEntry && !leaderboard.slice(0, limit).includes(currentUserEntry) && (
            <>
              <div style={{ margin: '4px 12px', borderTop: '1px dashed #1a1a1a' }} />
              <LeaderboardRow
                entry={currentUserEntry}
                isCurrentUser={true}
                compact={compact}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
