'use client';

/**
 * DateClaimVerificationDesk — Date and Claim verification
 *
 * For date_verification:
 *   Shows the claimed date + context
 *   User can confirm, reject, or suggest an alternative date
 *
 * For claim_verification:
 *   Shows the claim text + supporting evidence
 *   User evaluates if the claim is substantiated
 *
 * Both share the same layout: central card with details
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, MessageSquare, AlertCircle, Shield,
  ExternalLink, Database, Clock, FileText, Quote,
} from 'lucide-react';
import type { InvestigationTask, DocumentContext } from '@/store/investigationGameStore';

// ─── Helpers ────────────────────────────────────────────────────────

function getSourceBadge(provider?: string): { label: string; color: string } {
  switch (provider?.toLowerCase()) {
    case 'icij': return { label: 'ICIJ', color: '#f59e0b' };
    case 'opensanctions': return { label: 'OpenSanctions', color: '#8b5cf6' };
    case 'courtlistener': return { label: 'CourtListener', color: '#3b82f6' };
    case 'groq': return { label: 'AI Extraction', color: '#ef4444' };
    default: return { label: provider || 'Unknown', color: '#6b7280' };
  }
}

// ─── Main Component ────────────────────────────────────────────────

interface DateClaimVerificationDeskProps {
  task: InvestigationTask;
  document: DocumentContext | null;
}

export default function DateClaimVerificationDesk({ task, document }: DateClaimVerificationDeskProps) {
  const { task_data, context_data } = task;
  const isDate = task.task_type === 'date_verification';
  const isClaim = task.task_type === 'claim_verification';

  const sourceBadge = getSourceBadge(task_data.source_provider);
  const sourceUrl = task_data.source_url || (context_data as Record<string, string>)?.source_url;
  const [alternativeDate, setAlternativeDate] = useState('');

  const accentColor = isDate ? '#f59e0b' : '#ef4444';
  const Icon = isDate ? Calendar : MessageSquare;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4">
      {/* Source document context */}
      <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Database size={12} className="text-neutral-600" />
        <span className="text-[9px] font-mono text-neutral-500 tracking-wider uppercase">SOURCE:</span>
        {document && (
          <span className="text-[10px] text-neutral-400">{document.title}</span>
        )}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono"
          style={{
            background: sourceBadge.color + '15',
            color: sourceBadge.color,
            border: `1px solid ${sourceBadge.color}25`,
          }}
        >
          <Shield size={8} />
          {sourceBadge.label}
        </span>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors ml-auto"
          >
            <ExternalLink size={9} /> View source
          </a>
        )}
      </div>

      {/* ═══ MAIN CARD ═══ */}
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4"
        >
          <div
            className="p-2 rounded-lg"
            style={{
              background: accentColor + '12',
              color: accentColor,
            }}
          >
            <Icon size={16} />
          </div>
          <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: accentColor }}>
            {isDate ? 'DATE VERIFICATION' : 'CLAIM VERIFICATION'}
          </span>
        </motion.div>

        {/* The main data card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-xl mb-4"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${accentColor}20`,
          }}
        >
          {isDate && (
            <>
              {/* Date display */}
              <div className="flex items-center gap-3 mb-4">
                <Clock size={20} style={{ color: accentColor }} />
                <div>
                  <div className="text-xl font-bold text-neutral-100 font-mono">
                    {task_data.date_value || task_data.entity_name || '—'}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Extracted date value
                  </div>
                </div>
              </div>

              {/* Context */}
              {(task_data.date_context || task_data.raw_data?.description) && (
                <div
                  className="p-3 rounded-lg mb-4"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-[8px] font-mono text-neutral-600 tracking-wider uppercase block mb-1">
                    CONTEXT
                  </span>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {task_data.date_context || (task_data.raw_data?.description as string) || '—'}
                  </p>
                </div>
              )}

              {/* Alternative date input */}
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <label className="text-[9px] font-mono text-neutral-600 tracking-wider uppercase block mb-1.5">
                  SUGGEST ALTERNATIVE DATE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  placeholder="e.g., 2005-03-15 or March 2005"
                  className="w-full px-3 py-2 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 font-mono"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                />
                <span className="text-[8px] text-neutral-700 mt-1 block">
                  If you reject the date, providing the correct one helps the network.
                </span>
              </div>
            </>
          )}

          {isClaim && (
            <>
              {/* Claim text */}
              <div className="mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <Quote size={14} style={{ color: accentColor }} className="mt-0.5 flex-shrink-0" />
                  <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: accentColor }}>
                    CLAIMED
                  </span>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${accentColor}40`,
                  }}
                >
                  <p className="text-sm text-neutral-200 leading-relaxed">
                    {task_data.entity_name || '—'}
                  </p>
                </div>
              </div>

              {/* Supporting evidence / context */}
              {task_data.raw_data && Object.keys(task_data.raw_data).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-neutral-600 tracking-wider uppercase">
                    EXTRACTED CONTEXT
                  </span>
                  {Object.entries(task_data.raw_data).slice(0, 8).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-[10px]">
                      <span className="text-neutral-600 font-mono w-28 flex-shrink-0 uppercase">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-neutral-400 break-all">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Metadata row */}
        <div
          className="flex items-center gap-4 p-3 rounded-lg mb-4 text-[9px] font-mono"
          style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.03)',
          }}
        >
          <span className="text-neutral-600">
            Confidence: <span style={{ color: task_data.confidence >= 0.7 ? '#10b981' : '#f59e0b' }}>
              {Math.round(task_data.confidence * 100)}%
            </span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-600">
            Source: {task_data.source_type?.replace(/_/g, ' ')}
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-600">
            Reviews: {task.completed_count}/{task.required_reviews}
          </span>
        </div>

        {/* Verification guide */}
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <AlertCircle size={11} className="text-neutral-700 mt-0.5 flex-shrink-0" />
          <span className="text-[9px] text-neutral-600 leading-relaxed">
            {isDate
              ? 'Verify that this date is accurate according to the source document. If the date is wrong, you can suggest the correct one above before rejecting.'
              : 'Evaluate whether this claim is substantiated by the source evidence. Consider the confidence level and source reliability.'
            }
          </span>
        </div>
      </div>
    </div>
  );
}
