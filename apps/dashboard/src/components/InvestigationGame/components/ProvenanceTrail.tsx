'use client';

/**
 * ProvenanceTrail — Chain of custody timeline
 *
 * Research ref: Forensic evidence chain + blockchain-style immutable log
 * — Vertical timeline with connected dots
 * — Action type drives color (created=blue, reviewed=green, flagged=red)
 * — Trace IDs shown for auditability
 * — Collapsible by default, expands on demand
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProvenanceEntry } from '@/store/investigationGameStore';

// ─── Action Type Colors ─────────────────────────────────────────────

function getActionColor(actionType: string): string {
  if (actionType.includes('created') || actionType.includes('extracted')) return '#3b82f6';
  if (actionType.includes('reviewed') || actionType.includes('verified')) return '#10b981';
  if (actionType.includes('flagged') || actionType.includes('rejected')) return '#ef4444';
  if (actionType.includes('promoted')) return '#f59e0b';
  return '#6b7280';
}

function getActionLabel(actionType: string): string {
  return actionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main Component ─────────────────────────────────────────────────

interface ProvenanceTrailProps {
  entries: ProvenanceEntry[];
}

export default function ProvenanceTrail({ entries }: ProvenanceTrailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-3"
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
        <Eye size={10} className="text-neutral-600" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-neutral-600 font-mono uppercase">
          PROVENANCE TRAIL
        </span>
        <span className="text-[9px] text-neutral-700 font-mono">
          ({entries.length})
        </span>
        <div className="ml-auto">
          {isExpanded
            ? <ChevronUp size={10} className="text-neutral-600" />
            : <ChevronDown size={10} className="text-neutral-600" />
          }
        </div>
      </button>

      {/* Timeline Entries */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pt-2 pb-1">
              {entries.map((entry, i) => {
                const color = getActionColor(entry.action_type);
                const isLast = i === entries.length - 1;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex gap-3 relative"
                  >
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                        style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
                      />
                      {!isLast && (
                        <div
                          className="w-px flex-1 min-h-[16px]"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 ${isLast ? 'pb-1' : 'pb-2.5'}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[9px] font-semibold font-mono"
                          style={{ color }}
                        >
                          {getActionLabel(entry.action_type)}
                        </span>
                        <span className="text-[8px] text-neutral-700 font-mono">
                          {entry.trace_id}
                        </span>
                      </div>
                      <div className="text-[8px] text-neutral-700 font-mono mt-0.5">
                        {new Date(entry.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <span className="text-neutral-800 ml-1.5">
                          · {entry.actor_type}
                        </span>
                      </div>
                    </div>
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
