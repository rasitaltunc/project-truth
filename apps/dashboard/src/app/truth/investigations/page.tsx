'use client';

// ============================================
// PROJECT TRUTH: INVESTIGATION FEED
// /truth/investigations — published investigations
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitFork, ThumbsUp, Eye, Clock, TrendingUp } from 'lucide-react';
import { useInvestigationStore } from '@/store/investigationStore';

interface Investigation {
  id: string;
  author_name: string;
  title: string;
  description: string;
  status: string;
  parent_id: string | null;
  fork_count: number;
  step_count: number;
  upvote_count: number;
  significance_score: number;
  view_count: number;
  published_at: string;
  created_at: string;
}

type SortMode = 'significance' | 'newest' | 'forks';

export default function InvestigationFeedPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('significance');
  const [votingId, setVotingId] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);

  const { fingerprint, initFingerprint, forkInvestigation } = useInvestigationStore();

  useEffect(() => {
    initFingerprint();
  }, []);

  useEffect(() => {
    loadFeed();
  }, [sort]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/investigation/feed?sort=${sort}&limit=30`);
      const data = await res.json();
      setInvestigations(data.investigations || []);
    } catch (e) {
      console.error('Feed load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (id: string) => {
    if (!fingerprint || votingId) return;
    setVotingId(id);
    try {
      const res = await fetch('/api/investigation/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigationId: id, fingerprint }),
      });
      const data = await res.json();
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === id ? { ...inv, upvote_count: data.upvote_count } : inv
        )
      );
    } finally {
      setVotingId(null);
    }
  };

  const handleFork = async (id: string) => {
    if (!fingerprint || forkingId) return;
    setForkingId(id);
    try {
      const result = await forkInvestigation(id);
      if (result) {
        // Fork başarılı — truth sayfasına yönlendir
        window.location.href = '/truth';
      }
    } finally {
      setForkingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const sortButtons: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: 'significance', label: 'MOST SIGNIFICANT', icon: <TrendingUp size={12} /> },
    { key: 'newest', label: 'NEWEST', icon: <Clock size={12} /> },
    { key: 'forks', label: 'MOST FORKED', icon: <GitFork size={12} /> },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030303',
      fontFamily: 'system-ui, sans-serif',
      color: '#e5e5e5',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: 'linear-gradient(180deg, rgba(127,29,29,0.1), transparent)',
      }}>
        <Link
          href="/truth"
          style={{
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          <ArrowLeft size={14} /> BACK
        </Link>

        <div style={{ flex: 1 }}>
          <div style={{
            color: '#dc2626',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace',
            letterSpacing: '0.2em',
            marginBottom: '4px',
          }}>
            PROJECT TRUTH
          </div>
          <h1 style={{
            color: '#e5e5e5',
            fontSize: '22px',
            fontWeight: 'bold',
            margin: 0,
          }}>
            Investigation Archive
          </h1>
          <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>
            Community-initiated investigations — continue, vote, contribute
          </div>
        </div>

        <Link
          href="/truth"
          style={{
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            color: '#fca5a5',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          + NEW INVESTIGATION
        </Link>
      </div>

      {/* Sort Tabs */}
      <div style={{
        padding: '16px 32px',
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {sortButtons.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: sort === key ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
              border: `1px solid ${sort === key ? 'rgba(220, 38, 38, 0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: sort === key ? '#fca5a5' : '#6b7280',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '2px solid #7f1d1d',
              borderTopColor: '#dc2626',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', letterSpacing: '0.1em' }}>
              LOADING...
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : investigations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#4b5563',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔦</div>
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: '14px', marginBottom: '8px', color: '#6b7280' }}>
              No published investigations yet
            </div>
            <div style={{ fontSize: '13px', marginBottom: '24px' }}>
              Be the first to start an investigation — query the 3D network and publish
            </div>
            <Link
              href="/truth"
              style={{
                background: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                color: '#fca5a5',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'Courier New, monospace',
                textDecoration: 'none',
              }}
            >
              START INVESTIGATING →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {investigations.map((inv, index) => (
              <InvestigationCard
                key={inv.id}
                investigation={inv}
                rank={index + 1}
                fingerprint={fingerprint}
                isVoting={votingId === inv.id}
                isForking={forkingId === inv.id}
                onVote={() => handleVote(inv.id)}
                onFork={() => handleFork(inv.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// INVESTIGATION CARD
// ============================================
function InvestigationCard({
  investigation: inv,
  rank,
  fingerprint,
  isVoting,
  isForking,
  onVote,
  onFork,
  formatDate,
}: {
  investigation: Investigation;
  rank: number;
  fingerprint: string;
  isVoting: boolean;
  isForking: boolean;
  onVote: () => void;
  onFork: () => void;
  formatDate: (s: string) => string;
}) {
  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(220, 38, 38, 0.15)',
      borderRadius: '8px',
      padding: '20px 24px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(220, 38, 38, 0.35)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.05)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(220, 38, 38, 0.15)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Rank */}
        <div style={{
          color: '#7f1d1d',
          fontSize: '18px',
          fontWeight: 'bold',
          fontFamily: 'Courier New, monospace',
          minWidth: '32px',
          paddingTop: '2px',
        }}>
          #{rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Fork badge */}
          {inv.parent_id && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              color: '#6b7280',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '10px',
              fontFamily: 'Courier New, monospace',
              marginBottom: '8px',
            }}>
              <GitFork size={9} /> FORK
            </div>
          )}

          {/* Title */}
          <Link
            href={`/truth/investigations/${inv.id}`}
            style={{ textDecoration: 'none' }}
          >
            <h3 style={{
              color: '#e5e5e5',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '0 0 6px',
              lineHeight: 1.4,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fca5a5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#e5e5e5')}
            >
              {inv.title || 'Başlıksız Soruşturma'}
            </h3>
          </Link>

          {/* Description */}
          {inv.description && (
            <p style={{
              color: '#6b7280',
              fontSize: '13px',
              margin: '0 0 10px',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {inv.description}
            </p>
          )}

          {/* Meta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <span style={{
              color: '#991b1b',
              fontSize: '12px',
              fontFamily: 'Courier New, monospace',
            }}>
              {inv.author_name}
            </span>

            <span style={{ color: '#374151', fontSize: '11px' }}>
              {formatDate(inv.published_at)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4b5563', fontSize: '11px', fontFamily: 'Courier New, monospace' }}>
              <span style={{ color: '#dc2626' }}>{inv.step_count}</span> ADIM
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4b5563', fontSize: '11px' }}>
              <Eye size={11} />
              <span>{inv.view_count}</span>
            </div>

            {inv.fork_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4b5563', fontSize: '11px' }}>
                <GitFork size={11} />
                <span>{inv.fork_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          {/* Upvote */}
          <button
            onClick={onVote}
            disabled={!fingerprint || isVoting}
            title="Oy ver"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: fingerprint && !isVoting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              color: '#dc2626',
            }}
            onMouseEnter={e => {
              if (fingerprint && !isVoting) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.2)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.1)';
            }}
          >
            <ThumbsUp size={14} />
            <span style={{ fontSize: '11px', fontFamily: 'Courier New, monospace', fontWeight: 'bold' }}>
              {inv.upvote_count}
            </span>
          </button>

          {/* Fork / Devam Et */}
          <button
            onClick={onFork}
            disabled={!fingerprint || isForking}
            title="Bu soruşturmadan devam et"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(107, 114, 128, 0.08)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: fingerprint && !isForking ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              color: '#6b7280',
            }}
            onMouseEnter={e => {
              if (fingerprint && !isForking) {
                (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(156, 163, 175, 0.4)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(107, 114, 128, 0.2)';
            }}
          >
            {isForking ? (
              <div style={{ width: '14px', height: '14px', border: '1px solid #6b7280', borderTopColor: '#9ca3af', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <GitFork size={14} />
            )}
            <span style={{ fontSize: '10px', fontFamily: 'Courier New, monospace' }}>
              {isForking ? '...' : 'DEVAM'}
            </span>
          </button>

          {/* İncele */}
          <Link
            href={`/truth/investigations/${inv.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#4b5563',
              fontSize: '10px',
              fontFamily: 'Courier New, monospace',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#4b5563';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <Eye size={14} />
            İNCELE
          </Link>
        </div>
      </div>
    </div>
  );
}
