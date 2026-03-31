'use client';

/**
 * EmptyState + LoadingState + ErrorState
 *
 * Research ref: CRT terminal boot sequence aesthetic
 * — Loading: Scanning animation with terminal cursor blink
 * — Empty (no tasks): Mission complete + generate option
 * — Error: Glitchy retry with connection feel
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Radio, RefreshCw, AlertCircle, Terminal } from 'lucide-react';

// ─── Loading State ──────────────────────────────────────────────────

export function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Scanning animation */}
      <div className="relative w-10 h-10 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(220,38,38,0.1)',
            borderTopColor: '#dc2626',
          }}
        />
        <Radio size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600/60" />
      </div>

      {/* Terminal text */}
      <div className="text-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[10px] font-mono text-neutral-600 tracking-wider"
        >
          SCANNING QUARANTINE ZONE...
        </motion.div>
        <div className="text-[9px] font-mono text-neutral-800 mt-1">
          Retrieving next investigation task
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State (No Tasks Available) ───────────────────────────────

interface EmptyStateProps {
  onGenerate: () => void;
  isGenerating: boolean;
  generationResult: { generated: number; total_quarantine: number } | null;
}

export function EmptyState({ onGenerate, isGenerating, generationResult }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* Terminal icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.1)',
        }}
      >
        <Terminal size={20} className="text-red-600/50" />
      </div>

      <div className="text-center mb-4">
        <div className="text-[11px] font-mono font-semibold text-neutral-400 tracking-wider mb-1">
          QUEUE EMPTY
        </div>
        <div className="text-[10px] text-neutral-600 leading-relaxed max-w-[240px]">
          All pending tasks reviewed. Generate new tasks from the quarantine zone.
        </div>
      </div>

      {/* Generate button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-semibold font-mono tracking-wider transition-all disabled:opacity-40"
        style={{
          background: 'rgba(220,38,38,0.1)',
          border: '1px solid rgba(220,38,38,0.2)',
          color: '#dc2626',
        }}
      >
        <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
        {isGenerating ? 'GENERATING...' : 'GENERATE TASKS'}
      </motion.button>

      {/* Generation result */}
      {generationResult && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-[9px] font-mono text-emerald-600"
        >
          {generationResult.generated} tasks generated
          <span className="text-neutral-700 ml-1">
            (quarantine: {generationResult.total_quarantine})
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Error State ────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string | null;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <motion.div
        animate={{ x: [-1, 1, -1, 0] }}
        transition={{ duration: 0.3, repeat: 2 }}
      >
        <AlertCircle size={24} className="text-red-500/60 mb-3" />
      </motion.div>

      <div className="text-center mb-4">
        <div className="text-[10px] font-mono font-semibold text-red-500/80 tracking-wider mb-1">
          CONNECTION INTERRUPTED
        </div>
        <div className="text-[9px] text-neutral-600 max-w-[220px] leading-relaxed font-mono">
          {message || 'Failed to reach investigation server'}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-semibold font-mono tracking-wider transition-all"
        style={{
          background: 'rgba(220,38,38,0.1)',
          border: '1px solid rgba(220,38,38,0.2)',
          color: '#dc2626',
        }}
      >
        <RefreshCw size={10} />
        RETRY
      </motion.button>
    </motion.div>
  );
}
