'use client';

/**
 * EntityVerificationDesk — Split-screen entity verification
 *
 * LEFT:  Source context — document metadata, extracted text, source URL
 *        The "fosforlu kalem" (highlighter) system lives here.
 *        AI-extracted entities are highlighted in yellow.
 *        User clicks to confirm (stays yellow) or reject (turns red).
 *
 * RIGHT: Entity detail card — what the AI extracted, confidence,
 *        source provider, raw data inspection.
 *
 * Philosophy: The user sees WHERE the data came from (left)
 * and WHAT was extracted (right). They can judge for themselves.
 * Not "click approve and move on" — actually look at the source.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, ExternalLink, User, Building, MapPin, Calendar,
  AlertCircle, CheckCircle2, XCircle, Eye, Shield, Database,
} from 'lucide-react';
import type { InvestigationTask, DocumentContext } from '@/store/investigationGameStore';

// ─── Highlight State ────────────────────────────────────────────────

type HighlightStatus = 'pending' | 'confirmed' | 'rejected';

interface HighlightSpan {
  text: string;
  status: HighlightStatus;
  type: string; // entity type
}

// ─── Entity Type Icons ──────────────────────────────────────────────

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  PERSON: <User size={14} />,
  ORGANIZATION: <Building size={14} />,
  LOCATION: <MapPin size={14} />,
  DATE: <Calendar size={14} />,
};

// ─── Confidence Color ───────────────────────────────────────────────

function getConfidenceColor(conf: number): string {
  if (conf >= 0.8) return '#10b981';
  if (conf >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function getConfidenceLabel(conf: number): string {
  if (conf >= 0.8) return 'HIGH';
  if (conf >= 0.5) return 'MEDIUM';
  return 'LOW';
}

// ─── Source Provider Badge ──────────────────────────────────────────

function getSourceBadge(provider?: string): { label: string; color: string } {
  switch (provider?.toLowerCase()) {
    case 'icij': return { label: 'ICIJ Offshore Leaks', color: '#f59e0b' };
    case 'opensanctions': return { label: 'OpenSanctions', color: '#8b5cf6' };
    case 'courtlistener': return { label: 'CourtListener', color: '#3b82f6' };
    case 'groq': return { label: 'AI Extraction', color: '#ef4444' };
    case 'manual': return { label: 'Manual Upload', color: '#6b7280' };
    default: return { label: provider || 'Unknown', color: '#6b7280' };
  }
}

// ─── Main Component ────────────────────────────────────────────────

interface EntityVerificationDeskProps {
  task: InvestigationTask;
  document: DocumentContext | null;
}

export default function EntityVerificationDesk({ task, document }: EntityVerificationDeskProps) {
  const { task_data, context_data } = task;

  // Highlight state for the fosforlu kalem system
  const [highlights, setHighlights] = useState<Map<string, HighlightStatus>>(
    () => new Map([[task_data.entity_name, 'pending']])
  );

  const toggleHighlight = (text: string) => {
    setHighlights(prev => {
      const next = new Map(prev);
      const current = next.get(text);
      if (current === 'pending') next.set(text, 'confirmed');
      else if (current === 'confirmed') next.set(text, 'rejected');
      else next.set(text, 'pending');
      return next;
    });
  };

  // Extract raw_data fields for display
  const rawFields = useMemo(() => {
    const fields: { key: string; value: string }[] = [];
    if (task_data.raw_data && typeof task_data.raw_data === 'object') {
      Object.entries(task_data.raw_data).forEach(([key, value]) => {
        if (value && typeof value === 'string' && key !== 'entity_name' && key !== 'entity_type') {
          fields.push({ key, value });
        } else if (value && typeof value === 'object') {
          fields.push({ key, value: JSON.stringify(value, null, 0) });
        }
      });
    }
    return fields.slice(0, 12); // Cap at 12 fields
  }, [task_data.raw_data]);

  const sourceBadge = getSourceBadge(task_data.source_provider);
  const confColor = getConfidenceColor(task_data.confidence);
  const confLabel = getConfidenceLabel(task_data.confidence);
  const sourceUrl = task_data.source_url || (context_data as Record<string, string>)?.source_url;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ═══════════════════════════════════════════════════
          LEFT PANEL — Source Context + Highlighter
          ═══════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{
          borderRight: '1px solid rgba(255,255,255,0.06)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#1a1a1a transparent',
        }}
      >
        {/* Source header */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Database size={12} className="text-neutral-600" />
            <span className="text-[9px] font-mono text-neutral-500 tracking-wider uppercase">
              SOURCE DOCUMENT
            </span>
          </div>

          {document && (
            <div className="mb-2">
              <div className="text-sm text-neutral-200 font-medium leading-snug">
                {document.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-neutral-600">
                  {document.document_type}
                </span>
                {document.page_count > 0 && (
                  <span className="text-[10px] font-mono text-neutral-700">
                    · {document.page_count} pages
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Source provider badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-medium"
              style={{
                background: sourceBadge.color + '15',
                color: sourceBadge.color,
                border: `1px solid ${sourceBadge.color}25`,
              }}
            >
              <Shield size={9} />
              {sourceBadge.label}
            </span>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[9px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors"
              >
                <ExternalLink size={9} />
                View source
              </a>
            )}
          </div>
        </div>

        {/* ── Fosforlu Kalem Zone — Highlighted source text ── */}
        <div className="flex-1 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={12} className="text-neutral-600" />
            <span className="text-[9px] font-mono text-neutral-500 tracking-wider uppercase">
              {document?.text_content ? 'DOCUMENT TEXT — ENTITY HIGHLIGHTED' : 'EXTRACTED DATA — CLICK TO VERIFY'}
            </span>
          </div>

          <p className="text-[10px] text-neutral-600 mb-4 leading-relaxed">
            Yellow highlights show AI-extracted entities. Click to cycle:
            <span className="inline-block mx-1 px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(250,204,21,0.2)', color: '#facc15' }}>pending</span>
            →
            <span className="inline-block mx-1 px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>confirmed</span>
            →
            <span className="inline-block mx-1 px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>rejected</span>
          </p>

          {/* ── REAL OCR TEXT with inline highlighting (fosforlu kalem) ── */}
          {document?.text_content ? (
            <div
              className="p-4 rounded-lg mb-3 max-h-[50vh] overflow-y-auto"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#1a1a1a transparent',
              }}
            >
              <HighlightedDocumentText
                text={document.text_content}
                entityName={task_data.entity_name}
                highlightStatus={highlights.get(task_data.entity_name) || 'pending'}
                onHighlightClick={() => toggleHighlight(task_data.entity_name)}
              />
              {document.has_full_text && (
                <div className="mt-3 pt-2 text-[9px] text-neutral-600 italic" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  Showing first 8,000 characters. Full document available via source link.
                </div>
              )}
            </div>
          ) : (
            /* Fallback: Entity card + raw data (no OCR text available) */
            <div
              className="p-4 rounded-lg mb-3"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="mb-3">
                <HighlightableEntity
                  text={task_data.entity_name}
                  type={task_data.entity_type || task_data.item_type}
                  status={highlights.get(task_data.entity_name) || 'pending'}
                  onClick={() => toggleHighlight(task_data.entity_name)}
                />
              </div>

              {rawFields.length > 0 && (
                <div className="space-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {rawFields.map((field, i) => (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      className="flex gap-2"
                    >
                      <span className="text-[9px] font-mono text-neutral-600 w-28 flex-shrink-0 uppercase">
                        {field.key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-neutral-400 leading-relaxed break-all">
                        {field.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {rawFields.length === 0 && (
                <div className="text-[10px] text-neutral-600 italic">
                  No OCR text or additional context available.
                  Use the source link above to verify manually.
                </div>
              )}
            </div>
          )}

          {/* Source type note */}
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <AlertCircle size={11} className="text-neutral-700 mt-0.5 flex-shrink-0" />
            <span className="text-[9px] text-neutral-600 leading-relaxed">
              {task_data.source_type === 'ai_extraction'
                ? 'This entity was extracted by AI (Groq llama-3.3-70b). It passed 3-pass consensus but requires human verification before entering the network.'
                : task_data.source_type === 'structured_api'
                  ? 'This entity comes from a structured data source. API data is generally reliable but should still be verified for relevance and accuracy.'
                  : 'This data requires verification before it can be added to the network.'
              }
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT PANEL — Entity Detail Card
          ═══════════════════════════════════════════════════ */}
      <div
        className="flex flex-col overflow-y-auto"
        style={{
          width: 360,
          minWidth: 300,
          scrollbarWidth: 'thin',
          scrollbarColor: '#1a1a1a transparent',
        }}
      >
        {/* Entity card */}
        <div className="px-5 py-4">
          {/* Entity type + name */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="p-2.5 rounded-lg flex-shrink-0"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.15)',
                color: '#3b82f6',
              }}
            >
              {ENTITY_ICONS[task_data.entity_type] || <FileText size={14} />}
            </div>
            <div>
              <div className="text-base font-semibold text-neutral-100 leading-snug">
                {task_data.entity_name}
              </div>
              <div className="text-[10px] font-mono text-neutral-500 mt-0.5 uppercase tracking-wider">
                {task_data.entity_type || task_data.item_type}
              </div>
            </div>
          </div>

          {/* Confidence meter */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-neutral-600 tracking-wider uppercase">
                AI CONFIDENCE
              </span>
              <span className="text-[11px] font-mono font-bold" style={{ color: confColor }}>
                {Math.round(task_data.confidence * 100)}% — {confLabel}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${task_data.confidence * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: confColor }}
              />
            </div>
            <div className="text-[8px] font-mono text-neutral-700 mt-1">
              Post-hoc 8-signal composite score (not AI self-reported)
            </div>
          </div>

          {/* Task metadata */}
          <div
            className="p-3 rounded-lg mb-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div className="space-y-2">
              <MetaRow label="Item Type" value={task_data.item_type} />
              <MetaRow label="Source" value={task_data.source_type?.replace(/_/g, ' ')} />
              <MetaRow label="Provider" value={task_data.source_provider || '—'} />
              {task_data.quarantine_id && (
                <MetaRow label="Quarantine ID" value={task_data.quarantine_id.slice(0, 8) + '...'} />
              )}
              <MetaRow label="Reviews" value={`${task.completed_count} / ${task.required_reviews}`} />
            </div>
          </div>

          {/* Verification guide */}
          <div
            className="p-3 rounded-lg"
            style={{
              background: 'rgba(59,130,246,0.04)',
              border: '1px solid rgba(59,130,246,0.08)',
            }}
          >
            <span className="text-[9px] font-mono text-blue-500/70 tracking-wider uppercase block mb-1.5">
              VERIFICATION GUIDE
            </span>
            <ul className="text-[10px] text-neutral-500 space-y-1 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={10} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>VERIFY if the entity exists in the source document and data is accurate</span>
              </li>
              <li className="flex items-start gap-1.5">
                <XCircle size={10} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span>REJECT if the entity is hallucinated, misidentified, or data is wrong</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertCircle size={10} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <span>DISPUTE if you need more context or the source is ambiguous</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fosforlu Kalem: Document Text with Inline Highlights ────────

function HighlightedDocumentText({
  text,
  entityName,
  highlightStatus,
  onHighlightClick,
}: {
  text: string;
  entityName: string;
  highlightStatus: HighlightStatus;
  onHighlightClick: () => void;
}) {
  const colors = {
    pending: { bg: 'rgba(250,204,21,0.2)', border: 'rgba(250,204,21,0.4)', text: '#facc15' },
    confirmed: { bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)', text: '#10b981' },
    rejected: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', text: '#ef4444' },
  };
  const c = colors[highlightStatus];

  // Split text by entity name occurrences (case-insensitive)
  const parts = useMemo(() => {
    if (!entityName || entityName.length < 2) return [{ text, isHighlight: false }];

    const regex = new RegExp(`(${entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const segments: { text: string; isHighlight: boolean }[] = [];
    let lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), isHighlight: false });
      }
      segments.push({ text: match[0], isHighlight: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), isHighlight: false });
    }

    return segments.length > 0 ? segments : [{ text, isHighlight: false }];
  }, [text, entityName]);

  const highlightCount = parts.filter(p => p.isHighlight).length;

  return (
    <div>
      {/* Match counter */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-mono" style={{ color: c.text }}>
          {highlightCount} match{highlightCount !== 1 ? 'es' : ''} found
        </span>
        <span className="text-[8px] font-mono text-neutral-700">
          — click any highlight to verify
        </span>
      </div>

      {/* Document text with highlights */}
      <div className="text-[11px] text-neutral-400 leading-[1.8] font-mono whitespace-pre-wrap">
        {parts.map((part, i) =>
          part.isHighlight ? (
            <motion.span
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={onHighlightClick}
              className="inline cursor-pointer rounded px-0.5 mx-px transition-all duration-200"
              style={{
                background: c.bg,
                borderBottom: `2px solid ${c.border}`,
                color: c.text,
                fontWeight: 600,
              }}
              title={`${entityName} — ${highlightStatus.toUpperCase()}`}
            >
              {part.text}
            </motion.span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────

function HighlightableEntity({
  text, type, status, onClick
}: {
  text: string;
  type: string;
  status: HighlightStatus;
  onClick: () => void;
}) {
  const colors = {
    pending: { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.3)', text: '#facc15' },
    confirmed: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
    rejected: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
  };

  const c = colors[status];
  const statusLabel = status === 'pending' ? 'PENDING' : status === 'confirmed' ? 'CONFIRMED' : 'REJECTED';
  const StatusIcon = status === 'confirmed' ? CheckCircle2 : status === 'rejected' ? XCircle : AlertCircle;

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg cursor-pointer transition-all duration-200"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ENTITY_ICONS[type] || <FileText size={12} />}
          <span className="text-sm font-semibold" style={{ color: c.text }}>
            {text}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon size={11} style={{ color: c.text }} />
          <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: c.text }}>
            {statusLabel}
          </span>
        </div>
      </div>
      <div className="text-[9px] text-neutral-600 mt-1 font-mono">
        Click to cycle: pending → confirmed → rejected
      </div>
    </motion.button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-mono text-neutral-600 uppercase">{label}</span>
      <span className="text-[10px] font-mono text-neutral-400">{value}</span>
    </div>
  );
}
