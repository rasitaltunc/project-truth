'use client';

/**
 * CalibrationFeedback — "CALIBRATION MISMATCH" not "WRONG!"
 *
 * Research ref: Dark Souls "Git Gud" philosophy
 * — Correct = warm confirmation, incorrect = "calibration mismatch" (neutral framing)
 * — Shows known answer for learning
 * — Auto-dismiss after delay (parent handles timing)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertOctagon, Info } from 'lucide-react';
import type { CalibrationResult } from '@/store/investigationGameStore';

interface CalibrationFeedbackProps {
  result: CalibrationResult;
}

export default function CalibrationFeedback({ result }: CalibrationFeedbackProps) {
  const isCorrect = result.is_correct;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="mb-3 rounded-lg overflow-hidden"
      style={{
        background: isCorrect
          ? 'rgba(16,185,129,0.08)'
          : 'rgba(239,68,68,0.08)',
        border: `1px solid ${isCorrect
          ? 'rgba(16,185,129,0.18)'
          : 'rgba(239,68,68,0.18)'
        }`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {isCorrect ? (
          <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
        ) : (
          <AlertOctagon size={13} className="text-red-500 flex-shrink-0" />
        )}
        <span
          className="text-[10px] font-bold font-mono tracking-[0.15em]"
          style={{ color: isCorrect ? '#10b981' : '#ef4444' }}
        >
          {isCorrect ? 'CALIBRATION CONFIRMED' : 'CALIBRATION MISMATCH'}
        </span>
      </div>

      {/* Message */}
      <div className="px-3 pb-2.5">
        <p className="text-[10px] text-neutral-500 leading-relaxed">
          {result.message}
        </p>

        {/* Known answer hint (for learning) */}
        {!isCorrect && result.known_answer && Object.keys(result.known_answer).length > 0 && (
          <div
            className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded text-[9px]"
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.1)',
            }}
          >
            <Info size={9} className="text-indigo-500/70 mt-0.5 flex-shrink-0" />
            <span className="text-indigo-400/70 font-mono">
              Expected: {JSON.stringify(result.known_answer)}
            </span>
          </div>
        )}
      </div>

      {/* Pulse accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="h-px origin-left"
        style={{
          background: isCorrect
            ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)',
        }}
      />
    </motion.div>
  );
}
