'use client';

/**
 * ExistingReviews — Previous investigators' verdicts
 *
 * Research ref: Papers Please docket + rubber stamps
 * — Each review as a mini docket card with decision stamp
 * — Review time shown (fast = suspicious, slow = thorough)
 * — Reasoning in italic quotes (deposition feel)
 * — Collapsible like ProvenanceTrail
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, ChevronUp, Clock, Check, X, AlertTriangle } from 'lucide-react';
import type { ExistingReview } from '@/store/investigationGameStore';

// ─── Decision Visual System ─────────────────────────────────────────

function getDecisionVisual(decision: string): {
  color: string;
  label: string;
  icon: React.ReactNode;
} {
  switch (decision) {
    case 'approve':
      return { color: '#10b981', label: 'VERIFIED', icon: <Check size={8} strokeWidth={3} /> };
    case 'reject':
      return { color: '#ef4444', label: 'REJECTED', icon: <X size={8} strokeWidth={3} /> };
    case 'dispute':
      return { color: '#f59e0b', label: 'DISPUTED', icon: <AlertTriangle size={8} /> };
    default:
      return { color: '#6b7280', label: decision?.toUpperCase() || 'UNKNOWN', icon: null };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

// ─── Main Component ─────────────────────────────────────────────────

interface ExistingReviewsProps {
  reviews: ExistingReview[];
}

export default function ExistingReviews({ reviews }: ExistingReviewsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (reviews.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="mt-2"
    >
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.02]"
        style={{
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Users size={10} className="text-neutral-600" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-neutral-600 font-mono uppercase">
          PRIOR REVIEWS
        </span>
        <span className="text-[9px] text-neutral-700 font-mono">
          ({reviews.length})
        </span>
        <div className="ml-auto">
          {isExpanded
            ? <ChevronUp size={10} className="text-neutral-600" />
            : <ChevronDown size={10} className="text-neutral-600" />
          }
        </div>
      </button>

      {/* Review Cards */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {reviews.map((review, i) => {
                const visual = getDecisionVisual(review.response.decision);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="px-3 py-2.5 rounded-lg"
                    style={{
                      background: `${visual.color}06`,
                      border: `1px solid ${visual.color}12`,
                    }}
                  >
                    {/* Header: reviewer ID + decision stamp + meta */}
                    <div className="flex items-center gap-2">
                      {/* Reviewer pseudonym */}
                      <span className="text-[8px] text-neutral-600 font-mono truncate max-w-[80px]">
                        {review.reviewer}
                      </span>

                      {/* Decision stamp — mini rubber stamp */}
                      <div
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider"
                        style={{
                          background: `${visual.color}15`,
                          color: visual.color,
                          border: `1px solid ${visual.color}25`,
                        }}
                      >
                        {visual.icon}
                        <span>{visual.label}</span>
                      </div>

                      {/* Confidence */}
                      {review.confidence > 0 && (
                        <span className="text-[8px] text-neutral-700 font-mono">
                          {(review.confidence * 100).toFixed(0)}%
                        </span>
                      )}

                      {/* Response time */}
                      {review.response_time_ms > 0 && (
                        <div className="ml-auto flex items-center gap-0.5">
                          <Clock size={7} className="text-neutral-700" />
                          <span
                            className="text-[8px] font-mono"
                            style={{
                              color: review.response_time_ms < 3000
                                ? '#ef4444'  // suspiciously fast
                                : review.response_time_ms > 30000
                                  ? '#10b981'  // thorough
                                  : '#6b7280',
                            }}
                          >
                            {formatDuration(review.response_time_ms)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reasoning quote */}
                    {review.reasoning && (
                      <div className="mt-1.5 text-[9px] text-neutral-500 italic leading-relaxed pl-1"
                        style={{ borderLeft: `1px solid ${visual.color}20` }}
                      >
                        &ldquo;{review.reasoning}&rdquo;
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
