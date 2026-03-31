'use client';

/**
 * DecisionEngine — The stamp mechanic
 *
 * Research ref: Papers Please stamp (temporal ventriloquism)
 * — heavy mühür, screen shake, mechanical sound
 *
 * Mandatory reasoning (minimum 10 chars)
 * Speed anomaly warning (< 3 seconds)
 * Calibration Mismatch framing (not "WRONG!")
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, SkipForward, Send } from 'lucide-react';

interface DecisionEngineProps {
  onSubmit: (decision: 'approve' | 'reject' | 'dispute' | 'skip', reasoning: string, confidence: number) => void;
  isSubmitting: boolean;
  taskType: string;
  taskColor: string;
}

export default function DecisionEngine({
  onSubmit,
  isSubmitting,
  taskType,
  taskColor,
}: DecisionEngineProps) {
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(0.5);
  const [stampAnimation, setStampAnimation] = useState<'approve' | 'reject' | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [speedWarning, setSpeedWarning] = useState(false);
  const taskOpenTime = useRef(Date.now());

  // Reset open time when component mounts (new task)
  React.useEffect(() => {
    taskOpenTime.current = Date.now();
    setReasoning('');
    setConfidence(0.5);
    setStampAnimation(null);
    setSpeedWarning(false);
  }, [taskType]);

  const handleDecision = useCallback((decision: 'approve' | 'reject' | 'dispute' | 'skip') => {
    if (isSubmitting) return;

    // Skip doesn't need reasoning
    if (decision === 'skip') {
      onSubmit(decision, '', confidence);
      return;
    }

    // Check reasoning minimum
    if (reasoning.trim().length < 10) return;

    // Speed check — deliberate friction
    const elapsed = Date.now() - taskOpenTime.current;
    if (elapsed < 3000 && !speedWarning) {
      setSpeedWarning(true);
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 400);
      return;
    }

    // Trigger stamp animation for approve/reject
    if (decision === 'approve' || decision === 'reject') {
      setStampAnimation(decision);
      // Submit after stamp lands
      setTimeout(() => {
        onSubmit(decision, reasoning, confidence);
      }, 600);
    } else {
      onSubmit(decision, reasoning, confidence);
    }
  }, [reasoning, confidence, isSubmitting, onSubmit, speedWarning]);

  const isReasoningValid = reasoning.trim().length >= 10;

  return (
    <motion.div
      animate={shakeScreen ? { x: [-6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.35 }}
      className="relative"
    >
      {/* ── STAMP OVERLAY ── */}
      <AnimatePresence>
        {stampAnimation && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 0.85, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 18,
              mass: 0.5,
            }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="px-8 py-4 rounded-sm border-4 font-bold text-2xl tracking-[0.3em] uppercase"
              style={{
                fontFamily: '"Courier New", monospace',
                color: stampAnimation === 'approve' ? '#10b981' : '#ef4444',
                borderColor: stampAnimation === 'approve' ? '#10b981' : '#ef4444',
                background: stampAnimation === 'approve'
                  ? 'rgba(16,185,129,0.08)'
                  : 'rgba(239,68,68,0.08)',
                transform: `rotate(${stampAnimation === 'approve' ? -8 : 6}deg)`,
                textShadow: stampAnimation === 'approve'
                  ? '0 0 30px rgba(16,185,129,0.5)'
                  : '0 0 30px rgba(239,68,68,0.5)',
              }}
            >
              {stampAnimation === 'approve' ? 'VERIFIED' : 'REJECTED'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Speed Warning ── */}
      <AnimatePresence>
        {speedWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-start gap-2 p-3 rounded-lg text-[11px]"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.15)',
                color: '#f59e0b',
              }}
            >
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold font-mono text-[10px] tracking-wider mb-0.5">
                  SPEED ANOMALY DETECTED
                </div>
                <div className="text-neutral-500 text-[10px] leading-relaxed">
                  Investigation concluded at suspicious speed. Please review evidence
                  and provenance logs before submitting.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reasoning Input ── */}
      <div className="mb-3">
        <label className="block text-[10px] text-neutral-600 mb-1.5 font-mono uppercase tracking-wider">
          INVESTIGATION NOTES <span className="text-neutral-700">— mandatory</span>
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Why do you believe this data is accurate or inaccurate? Reference sources..."
          disabled={isSubmitting || !!stampAnimation}
          className="w-full rounded-lg text-xs text-neutral-200 resize-vertical placeholder:text-neutral-700 focus:outline-none focus:ring-1 transition-all"
          style={{
            minHeight: 72,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${isReasoningValid ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
            fontFamily: 'inherit',
          }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-mono" style={{
            color: isReasoningValid ? '#10b981' : 'rgba(255,255,255,0.2)',
          }}>
            {reasoning.length}/10 MIN
          </span>
          {!isReasoningValid && reasoning.length > 0 && (
            <span className="text-[9px] text-neutral-700 font-mono">
              {10 - reasoning.length} more chars needed
            </span>
          )}
        </div>
      </div>

      {/* ── Confidence Slider ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
            YOUR CONFIDENCE
          </label>
          <span className="text-[11px] font-mono font-semibold" style={{
            color: confidence > 0.7 ? '#10b981' : confidence > 0.4 ? '#f59e0b' : '#ef4444',
          }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.05"
          value={confidence}
          onChange={(e) => setConfidence(parseFloat(e.target.value))}
          disabled={isSubmitting || !!stampAnimation}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(90deg, ${taskColor} ${confidence * 100}%, rgba(255,255,255,0.06) ${confidence * 100}%)`,
            accentColor: taskColor,
          }}
        />
      </div>

      {/* ── Decision Buttons — The Stamps ── */}
      <div className="flex gap-2">
        {/* VERIFY */}
        <motion.button
          whileHover={isReasoningValid ? { scale: 1.02 } : {}}
          whileTap={isReasoningValid ? { scale: 0.97 } : {}}
          onClick={() => handleDecision('approve')}
          disabled={isSubmitting || !isReasoningValid || !!stampAnimation}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: isReasoningValid ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.05)',
            border: `1px solid ${isReasoningValid ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)'}`,
            color: isReasoningValid ? '#10b981' : 'rgba(16,185,129,0.3)',
          }}
        >
          <Check size={13} strokeWidth={3} />
          <span className="font-mono tracking-wider text-[11px]">VERIFY</span>
        </motion.button>

        {/* REJECT */}
        <motion.button
          whileHover={isReasoningValid ? { scale: 1.02 } : {}}
          whileTap={isReasoningValid ? { scale: 0.97 } : {}}
          onClick={() => handleDecision('reject')}
          disabled={isSubmitting || !isReasoningValid || !!stampAnimation}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: isReasoningValid ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isReasoningValid ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)'}`,
            color: isReasoningValid ? '#ef4444' : 'rgba(239,68,68,0.3)',
          }}
        >
          <X size={13} strokeWidth={3} />
          <span className="font-mono tracking-wider text-[11px]">REJECT</span>
        </motion.button>

        {/* DISPUTE */}
        <motion.button
          whileHover={isReasoningValid ? { scale: 1.02 } : {}}
          whileTap={isReasoningValid ? { scale: 0.97 } : {}}
          onClick={() => handleDecision('dispute')}
          disabled={isSubmitting || !isReasoningValid || !!stampAnimation}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-[10px] font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.15)',
            color: isReasoningValid ? '#f59e0b' : 'rgba(245,158,11,0.3)',
          }}
        >
          <AlertTriangle size={11} />
        </motion.button>

        {/* SKIP — always available */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDecision('skip')}
          disabled={isSubmitting || !!stampAnimation}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-[10px] transition-all duration-200 disabled:opacity-30"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          <SkipForward size={11} />
        </motion.button>
      </div>
    </motion.div>
  );
}
