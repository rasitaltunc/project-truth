'use client';

/**
 * ConsensusBanner — Community verdict reached
 *
 * Research ref: Collaborative consensus visualization
 * — Shows majority decision with vote count
 * — Confidence bar (how strong the consensus)
 * — Minimal, doesn't steal attention from next task
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Vote, Check, X, AlertTriangle } from 'lucide-react';
import type { ConsensusResult } from '@/store/investigationGameStore';

interface ConsensusBannerProps {
  result: ConsensusResult;
}

export default function ConsensusBanner({ result }: ConsensusBannerProps) {
  const color =
    result.decision === 'approved' ? '#10b981' :
    result.decision === 'rejected' ? '#ef4444' : '#f59e0b';

  const label =
    result.decision === 'approved' ? 'CONSENSUS: VERIFIED' :
    result.decision === 'rejected' ? 'CONSENSUS: REJECTED' : 'CONSENSUS: DISPUTED';

  const icon =
    result.decision === 'approved' ? <Check size={12} strokeWidth={3} /> :
    result.decision === 'rejected' ? <X size={12} strokeWidth={3} /> :
    <AlertTriangle size={12} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="mb-3 rounded-lg px-3 py-2.5"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}18`,
      }}
    >
      <div className="flex items-center gap-2">
        <div style={{ color }}>{icon}</div>
        <span
          className="text-[10px] font-bold font-mono tracking-[0.12em]"
          style={{ color }}
        >
          {label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Vote size={9} className="text-neutral-600" />
            <span className="text-[9px] font-mono text-neutral-600">
              {result.total_reviews}
            </span>
          </div>
          <span className="text-[9px] font-mono" style={{ color }}>
            {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${result.confidence * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </motion.div>
  );
}
