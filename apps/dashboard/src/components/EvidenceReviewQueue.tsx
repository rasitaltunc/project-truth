'use client';
// ============================================
// SPRINT 6A: EVIDENCE REVIEW QUEUE
// Pending evidence list for Tier 2+
// Card stack UI: Verify / Dispute / Skip
// ============================================

import React, { useEffect, useState } from 'react';
import { useBadgeStore } from '@/store/badgeStore';

interface PendingEvidence {
  id: string;
  title: string;
  description?: string;
  source_url?: string;
  source_name?: string;
  evidence_type: string;
  staked_reputation: number;
  submitted_by: string;
  created_at: string;
  node_name?: string;
}

interface EvidenceReviewQueueProps {
  networkId?: string;
  onClose?: () => void;
}

export default function EvidenceReviewQueue({ networkId, onClose }: EvidenceReviewQueueProps) {
  const { canDoAction, userFingerprint, initFingerprint, addLocalReputationTransaction } = useBadgeStore();

  const [queue, setQueue] = useState<PendingEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolving, setResolving] = useState<string | null>(null);
  const [results, setResults] = useState<{ id: string; action: string }[]>([]);

  const fp = userFingerprint || initFingerprint();
  const canReview = canDoAction('verify_evidence', networkId);

  useEffect(() => {
    if (!canReview) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const url = networkId
          ? `/api/evidence/pending?networkId=${networkId}`
          : '/api/evidence/pending';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setQueue(data.evidence ?? []);
      } catch (err) {
        console.warn('[EvidenceReviewQueue] load failed:', err);
        setQueue([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [networkId, canReview]);

  const handleAction = async (evidenceId: string, action: 'verify' | 'dispute' | 'skip') => {
    if (action === 'skip') {
      setCurrentIndex((i) => i + 1);
      return;
    }

    setResolving(evidenceId);
    try {
      const res = await fetch('/api/evidence/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceId,
          resolution: action === 'verify' ? 'verified' : 'disputed',
          resolver_fingerprint: fp,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults((r) => [...r, { id: evidenceId, action }]);
        // Optimistic reputation update
        addLocalReputationTransaction({
          user_fingerprint: fp,
          transaction_type: 'moderation_confirmed',
          amount: 5,
          description: `Evidence ${action === 'verify' ? 'verified' : 'rejected'}`,
        });
      }
    } catch (err) {
      console.warn('[EvidenceReviewQueue] resolve failed:', err);
    } finally {
      setResolving(null);
      setCurrentIndex((i) => i + 1);
    }
  };

  const currentEvidence = queue[currentIndex];
  const isFinished = currentIndex >= queue.length;
  const completedCount = results.length;

  if (!canReview) {
    return (
      <div
        className="rounded-xl border p-6 font-mono text-center"
        style={{ borderColor: '#333', backgroundColor: '#0a0a0a', maxWidth: '380px' }}
      >
        <div className="text-3xl mb-3">🔒</div>
        <h3 className="text-sm font-bold text-white mb-2">Review Queue Locked</h3>
        <p className="text-xs text-gray-500">
          You need at least the{' '}
          <span className="text-yellow-400">🐺 Platform Wolf</span> badge to review evidence.
        </p>
        {onClose && (
          <button onClick={onClose} className="mt-4 text-xs text-gray-600 hover:text-white transition-colors">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="font-mono"
      style={{ maxWidth: '440px', minWidth: '340px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">📋 Evidence Review</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLoading ? 'Loading...' : `${queue.length} pending evidence`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-xs text-green-400">{completedCount} completed</span>
          )}
          {onClose && (
            <button onClick={onClose} className="text-gray-600 hover:text-white text-xs transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-600 text-xs">Loading queue...</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-xs">
          <div className="text-2xl mb-2">✅</div>
          <p>No evidence to review.</p>
        </div>
      ) : isFinished ? (
        <div className="text-center py-8 text-xs">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-green-400">All evidence reviewed!</p>
          <p className="text-gray-600 mt-1">{completedCount} evidence processed.</p>
        </div>
      ) : currentEvidence ? (
        <div>
          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>{currentIndex + 1} / {queue.length}</span>
              <span>{Math.round(((currentIndex) / queue.length) * 100)}%</span>
            </div>
            <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-700 rounded-full transition-all duration-500"
                style={{ width: `${(currentIndex / queue.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Evidence card */}
          <div
            className="rounded-lg border p-4 mb-4"
            style={{ borderColor: '#dc262633', backgroundColor: '#0a0a0a' }}
          >
            {/* Metadata */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                style={{ backgroundColor: '#dc262622', color: '#dc2626' }}
              >
                {currentEvidence.evidence_type}
              </span>
              {currentEvidence.staked_reputation > 0 && (
                <span className="text-[10px] text-yellow-600">
                  ⚡ {currentEvidence.staked_reputation} points staked
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-sm font-bold text-white mb-2 leading-snug">
              {currentEvidence.title}
            </h4>

            {/* Node */}
            {currentEvidence.node_name && (
              <div className="text-[10px] text-gray-500 mb-2">
                Node: <span className="text-gray-300">{currentEvidence.node_name}</span>
              </div>
            )}

            {/* Description */}
            {currentEvidence.description && (
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                {currentEvidence.description.slice(0, 200)}
                {currentEvidence.description.length > 200 && '...'}
              </p>
            )}

            {/* Source */}
            {currentEvidence.source_url && (
              <a
                href={currentEvidence.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors block truncate"
              >
                🔗 {currentEvidence.source_name || currentEvidence.source_url}
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAction(currentEvidence.id, 'dispute')}
              disabled={resolving === currentEvidence.id}
              className="py-2.5 rounded border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{
                borderColor: '#ef444466',
                color: '#ef4444',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#ef444411';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ❌ REJECT
            </button>
            <button
              onClick={() => handleAction(currentEvidence.id, 'skip')}
              disabled={!!resolving}
              className="py-2.5 rounded border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{
                borderColor: '#33333366',
                color: '#6b7280',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#33333311';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ⏭ SKIP
            </button>
            <button
              onClick={() => handleAction(currentEvidence.id, 'verify')}
              disabled={resolving === currentEvidence.id}
              className="py-2.5 rounded border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{
                borderColor: '#22c55e66',
                color: '#22c55e',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#22c55e11';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ✅ VERIFY
            </button>
          </div>

          <p className="text-[10px] text-gray-700 text-center mt-2">
            Correct decision: +2 points · Wrong: -1 point
          </p>
        </div>
      ) : null}
    </div>
  );
}
