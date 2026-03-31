'use client';

/**
 * TaskCard — The case file you open
 *
 * Each task type gets different visual morphology (mise-en-scène).
 * Research ref: Papers Please document inspection + Obra Dinn deduction
 *
 * Entity Verification: Split-screen comparison, chiaroscuro lighting
 * Relationship: Node canvas with dotted ghost link
 * Date: Timeline with floating event placement
 * Document: Deduction board with fill-in-the-blanks
 * Claim: Evidence weighing scale
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Search, Link2, Calendar, FileText, Scale,
  ExternalLink, Database, AlertTriangle, Fingerprint
} from 'lucide-react';
import type { InvestigationTask } from '@/store/investigationGameStore';

// ─── Task type visual system ────────────────────────────────────────

const TASK_VISUAL: Record<string, {
  color: string;
  bgGlow: string;
  icon: React.ReactNode;
  label: string;
  labelShort: string;
}> = {
  entity_verification: {
    color: '#3b82f6',
    bgGlow: 'rgba(59,130,246,0.06)',
    icon: <Search size={14} />,
    label: 'ENTITY VERIFICATION',
    labelShort: 'ENTITY',
  },
  relationship_verification: {
    color: '#8b5cf6',
    bgGlow: 'rgba(139,92,246,0.06)',
    icon: <Link2 size={14} />,
    label: 'RELATIONSHIP ANALYSIS',
    labelShort: 'LINK',
  },
  date_verification: {
    color: '#f59e0b',
    bgGlow: 'rgba(245,158,11,0.06)',
    icon: <Calendar size={14} />,
    label: 'TIMELINE VERIFICATION',
    labelShort: 'DATE',
  },
  claim_verification: {
    color: '#ef4444',
    bgGlow: 'rgba(239,68,68,0.06)',
    icon: <Scale size={14} />,
    label: 'CLAIM ASSESSMENT',
    labelShort: 'CLAIM',
  },
  entity_resolution: {
    color: '#10b981',
    bgGlow: 'rgba(16,185,129,0.06)',
    icon: <Fingerprint size={14} />,
    label: 'ENTITY RESOLUTION',
    labelShort: 'RESOLVE',
  },
  source_verification: {
    color: '#6366f1',
    bgGlow: 'rgba(99,102,241,0.06)',
    icon: <FileText size={14} />,
    label: 'SOURCE VERIFICATION',
    labelShort: 'SOURCE',
  },
};

// ─── Difficulty blocks ──────────────────────────────────────────────

function DifficultyIndicator({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm transition-all"
          style={{
            height: i <= level ? 8 + i * 2 : 6,
            background: i <= level ? color : 'rgba(255,255,255,0.08)',
            opacity: i <= level ? 0.8 + (i / 5) * 0.2 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Confidence bar (AI's confidence — not yours) ───────────────────

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  const barColor = value > 0.7 ? '#10b981' : value > 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-neutral-600 font-mono uppercase tracking-wider">
        AI CONF.
      </span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color: barColor }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Main TaskCard ──────────────────────────────────────────────────

interface TaskCardProps {
  task: InvestigationTask;
}

export default function TaskCard({ task }: TaskCardProps) {
  const visual = TASK_VISUAL[task.task_type] || TASK_VISUAL.entity_verification;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl overflow-hidden"
      style={{
        background: visual.bgGlow,
        border: `1px solid ${visual.color}18`,
      }}
    >
      {/* ── File Header (classified document top bar) ── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: `linear-gradient(135deg, ${visual.color}10 0%, transparent 100%)`,
          borderBottom: `1px solid ${visual.color}15`,
        }}
      >
        {/* Task type icon + label */}
        <div className="flex items-center gap-2" style={{ color: visual.color }}>
          {visual.icon}
          <span
            className="text-[10px] font-bold tracking-[0.18em]"
            style={{ fontFamily: '"Courier New", monospace' }}
          >
            {visual.label}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DifficultyIndicator level={task.difficulty} color={visual.color} />

          {/* Trace ID — forensic stamp */}
          <span
            className="text-[8px] px-1.5 py-0.5 rounded font-mono"
            style={{
              color: 'rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              letterSpacing: '0.05em',
            }}
          >
            {task.trace_id}
          </span>
        </div>
      </div>

      {/* ── Evidence Section ── */}
      <div className="px-4 py-4">
        {/* Entity name — the subject under investigation */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="mb-3"
        >
          <h3
            className="text-lg font-semibold text-neutral-100 leading-tight"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {task.task_data.entity_name && task.task_data.entity_name !== 'Unknown'
              ? task.task_data.entity_name
              : task.task_data.source_entity
                ? `${task.task_data.source_entity} → ${task.task_data.relationship_type || 'bağlantı'} → ${task.task_data.target_entity || '?'}`
                : 'İsimsiz Varlık'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider"
              style={{
                background: `${visual.color}12`,
                color: `${visual.color}cc`,
                border: `1px solid ${visual.color}20`,
              }}
            >
              {task.task_data.entity_type}
            </span>
            {task.task_data.source_provider && (
              <span className="text-[10px] text-neutral-600 flex items-center gap-1">
                <Database size={9} />
                {task.task_data.source_provider}
              </span>
            )}
          </div>
        </motion.div>

        {/* Relationship display — two nodes with ghost link */}
        {task.task_data.relationship_type && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-3 p-3 rounded-lg"
            style={{
              background: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.12)',
            }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-purple-300">
                {task.task_data.source_entity}
              </span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-px" style={{
                  background: 'repeating-linear-gradient(90deg, rgba(139,92,246,0.4) 0px, rgba(139,92,246,0.4) 4px, transparent 4px, transparent 8px)',
                }} />
                <span className="text-[9px] px-1.5 py-0.5 rounded text-purple-400 bg-purple-500/10 font-mono uppercase">
                  {task.task_data.relationship_type}
                </span>
                <div className="flex-1 h-px" style={{
                  background: 'repeating-linear-gradient(90deg, rgba(139,92,246,0.4) 0px, rgba(139,92,246,0.4) 4px, transparent 4px, transparent 8px)',
                }} />
              </div>
              <span className="font-semibold text-purple-300">
                {task.task_data.target_entity}
              </span>
            </div>
          </motion.div>
        )}

        {/* Date display */}
        {task.task_data.date_value && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-3 p-3 rounded-lg flex items-center gap-3"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.12)',
            }}
          >
            <Calendar size={14} className="text-amber-500/70" />
            <div>
              <span className="text-sm font-mono text-amber-400">
                {task.task_data.date_value}
              </span>
              {task.task_data.date_context && (
                <span className="text-xs text-neutral-600 ml-2">
                  — {task.task_data.date_context}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Confidence bar */}
        <div className="mb-3">
          <ConfidenceBar value={task.task_data.confidence || 0} color={visual.color} />
        </div>

        {/* Source link */}
        {task.task_data.source_url && (
          <a
            href={task.task_data.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-blue-500/70 hover:text-blue-400 transition-colors font-mono mb-3"
          >
            <ExternalLink size={9} />
            {task.task_data.source_url.length > 55
              ? task.task_data.source_url.substring(0, 55) + '...'
              : task.task_data.source_url
            }
          </a>
        )}

        {/* Review progress */}
        <div className="flex items-center gap-3 text-[10px] text-neutral-600">
          <span className="font-mono">
            REVIEWS: {task.completed_count}/{task.required_reviews}
          </span>
          <span>·</span>
          <span className="font-mono uppercase">
            {task.task_data.source_type}
          </span>
          {task.is_calibration && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle size={9} />
                CALIBRATION
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
