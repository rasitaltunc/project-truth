'use client';

/**
 * DocumentVerificationDesk v2 — 2-Panel Split Verification Environment
 *
 * ┌───────────────────────────┬───────────────────────────────────┐
 * │    SOL — ORİJİNAL BELGE    │     SAĞ — İNTERAKTİF SAHNE       │
 * │    (dokunulmaz referans)    │   (spotlight + görev + kalem)     │
 * │                            │                                   │
 * │  Tam belge, scroll         │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 * │  Hiçbir efekt yok          │  ████ SPOTLIGHT BÖLGE ████████  │
 * │  Hiçbir karartma yok       │  ████████████████████████████████  │
 * │  Her zaman erişilebilir    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 * │  Bağlamı korur             │  ┌─ GÖREV KARTI (CLASSIFIED) ─┐  │
 * │                            │  │  Entity: Jeffrey Epstein    │  │
 * │                            │  │  Type: Person               │  │
 * │                            │  └────────────────────────────┘  │
 * └───────────────────────────┴───────────────────────────────────┘
 * │                    SHARED NAV BAR                              │
 * └───────────────────────────────────────────────────────────────┘
 *
 * v1 → v2 Changes:
 * - 3 panels → 2 panels (removed separate OCR panel)
 * - Added spotlight system (normal/honeypot/none modes)
 * - Added scanner animation effect
 * - CLASSIFIED aesthetic for task card (from ArchiveModal)
 * - Mobile: tab switch (Orijinal | Görev)
 * - Phase-aware: hides AI confidence during blind phase
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Loader2, FileText, AlertTriangle, Eye,
  Highlighter, Eraser, RotateCcw,
  ExternalLink, Target, Scan, AlertCircle,
} from 'lucide-react';
import type { InvestigationTask, DocumentContext, ReviewPhase, SpotlightData } from '@/store/investigationGameStore';
import { useInvestigationGameStore } from '@/store/investigationGameStore';
import FosforluKalem, { type HighlightStroke } from './FosforluKalem';
import { getThemeForDocument, type DeskTheme } from './deskThemes';

// PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ─── Pen Colors ─────────────────────────────────────────────────────

const PEN_COLORS = [
  { id: 'yellow', color: '#facc15', label: 'YELLOW', desc: 'Entity / Name' },
  { id: 'red', color: '#ef4444', label: 'RED', desc: 'Date / Amount' },
  { id: 'green', color: '#10b981', label: 'GREEN', desc: 'Confirmed' },
  { id: 'blue', color: '#3b82f6', label: 'BLUE', desc: 'Location / Org' },
];

// ─── Source Provider Badge ──────────────────────────────────────────

function getSourceBadge(provider?: string): { label: string; color: string } {
  switch (provider?.toLowerCase()) {
    case 'icij': return { label: 'ICIJ', color: '#f59e0b' };
    case 'opensanctions': return { label: 'OpenSanctions', color: '#8b5cf6' };
    case 'courtlistener': return { label: 'CourtListener', color: '#3b82f6' };
    case 'groq': return { label: 'AI Extract', color: '#ef4444' };
    case 'manual': return { label: 'Manual', color: '#6b7280' };
    default: return { label: provider || 'Unknown', color: '#6b7280' };
  }
}

// ─── Scanner Animation ──────────────────────────────────────────────

function ScannerAnimation({ active, theme }: { active: boolean; theme: DeskTheme }) {
  if (!active) return null;
  return (
    <motion.div
      initial={{ top: 0 }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{
        height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${theme.scannerColor} 30%, ${theme.scannerColor} 70%, transparent 100%)`,
        boxShadow: `0 0 20px ${theme.accentGlow}, 0 0 60px ${theme.accentMuted}`,
      }}
    />
  );
}

// ─── Spotlight Overlay ──────────────────────────────────────────────

interface SpotlightOverlayProps {
  mode: SpotlightData['mode'];
  sourceSentence: string;
  pageText: string;
  pageHeight: number;
  entityName?: string;
  theme?: DeskTheme;
}

function SpotlightOverlay({ mode, sourceSentence, pageText, pageHeight, entityName, theme }: SpotlightOverlayProps) {
  if (mode === 'none' || !pageText || pageHeight <= 0) return null;

  // Normalize for matching
  const normalizedPage = pageText.toLowerCase().replace(/\s+/g, ' ');

  // Multi-strategy search: try full sentence first, then chunks, then entity name
  let idx = -1;
  let matchLabel = '';

  if (sourceSentence && sourceSentence.trim().length >= 10) {
    // Strategy 1: Full sentence match
    const normalizedSentence = sourceSentence.toLowerCase().replace(/\s+/g, ' ');
    idx = normalizedPage.indexOf(normalizedSentence);

    if (idx === -1) {
      // Strategy 2: First 50 chars (LLM might have slightly altered the end)
      const partial = normalizedSentence.substring(0, 50);
      if (partial.length >= 15) {
        idx = normalizedPage.indexOf(partial);
      }
    }

    if (idx === -1) {
      // Strategy 3: 4-word window sliding search — find best matching window
      const words = normalizedSentence.split(' ').filter(w => w.length > 2);
      if (words.length >= 4) {
        let bestIdx = -1;
        let bestScore = 0;
        for (let i = 0; i <= words.length - 4; i++) {
          const window = words.slice(i, i + 4).join(' ');
          const wIdx = normalizedPage.indexOf(window);
          if (wIdx >= 0 && i === 0) { bestIdx = wIdx; break; } // Prefer start
          if (wIdx >= 0 && bestScore === 0) { bestIdx = wIdx; bestScore = 1; }
        }
        idx = bestIdx;
      }
    }
    if (idx >= 0) matchLabel = 'KAYNAK CÜMLESİ';
  }

  // Strategy 4: Entity name fallback
  if (idx === -1 && entityName && entityName.length > 2) {
    const normName = entityName.toLowerCase().replace(/\s+/g, ' ');
    idx = normalizedPage.indexOf(normName);
    if (idx >= 0) matchLabel = 'VARLIK İSMİ';
  }

  // No match at all — for honeypot still show at ~30%
  if (idx === -1 && mode !== 'honeypot') return null;
  if (idx === -1 && mode === 'honeypot') idx = Math.floor(normalizedPage.length * 0.3);

  // Estimate vertical position as ratio of text position to total text
  // PDF text extraction often has headers/metadata before visual content,
  // so the ratio underestimates the actual vertical position. We apply a
  // downward calibration offset (~15% of page height) to compensate, and
  // use a taller spotlight band so the target text falls comfortably inside.
  const rawRatio = idx >= 0 ? idx / Math.max(normalizedPage.length, 1) : 0.3;
  const CALIBRATION_OFFSET = 0.12; // shift spotlight down ~12% of page height
  const calibratedRatio = Math.min(rawRatio + CALIBRATION_OFFSET, 0.92); // clamp near bottom
  const spotY = calibratedRatio * pageHeight;
  const spotHeight = Math.min(120, pageHeight * 0.18); // taller band for better coverage

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Dim overlay above spotlight */}
      <div
        className="absolute left-0 right-0 top-0 transition-all duration-700"
        style={{
          height: Math.max(0, spotY - 10),
          background: 'rgba(0, 0, 0, 0.55)',
        }}
      />
      {/* Spotlight glow area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute left-0 right-0"
        style={{
          top: Math.max(0, spotY - 10),
          height: spotHeight + 20,
          boxShadow: mode === 'honeypot'
            ? '0 0 30px rgba(239, 68, 68, 0.15)'
            : (theme?.spotlightGlow || '0 0 30px rgba(245, 158, 11, 0.2)'),
          borderTop: `1px solid ${theme?.accentMuted || 'rgba(245, 158, 11, 0.15)'}`,
          borderBottom: `1px solid ${theme?.accentMuted || 'rgba(245, 158, 11, 0.15)'}`,
        }}
      />
      {/* Match label indicator (only for normal mode) */}
      {mode === 'normal' && matchLabel && (
        <div
          className="absolute right-2 text-[7px] font-mono uppercase tracking-wider"
          style={{
            top: Math.max(0, spotY - 18),
            color: theme?.accentText || 'rgba(245, 158, 11, 0.6)',
            opacity: 0.6,
          }}
        >
          ◆ {matchLabel}
        </div>
      )}
      {/* Dim overlay below spotlight */}
      <div
        className="absolute left-0 right-0 bottom-0 transition-all duration-700"
        style={{
          top: spotY + spotHeight + 10,
          background: 'rgba(0, 0, 0, 0.55)',
        }}
      />
    </div>
  );
}

// ─── Text Highlight with Auto-Scroll ────────────────────────────────

function TextContentWithHighlight({ before, highlighted, after, theme }: { before: string; highlighted: string; after: string; theme?: DeskTheme }) {
  const highlightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      const timer = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlighted]);

  return (
    <div className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: theme?.textPrimary || '#d4d4d4' }}>
      <span style={{ color: theme?.textDimmed || undefined, opacity: theme ? 1 : 0.5 }}>{before}</span>
      <span
        ref={highlightRef}
        style={{
          background: theme?.spotlightBg || 'rgba(245, 158, 11, 0.2)',
          borderLeft: `3px solid ${theme?.spotlightBorder || '#f59e0b'}`,
          padding: '2px 4px',
          borderRadius: '2px',
          color: theme?.spotlightText || '#fbbf24',
        }}
      >
        {highlighted}
      </span>
      <span style={{ color: theme?.textDimmed || undefined, opacity: theme ? 1 : 0.5 }}>{after}</span>
    </div>
  );
}

// ─── Text Content Viewer (PDF fallback — spotlight in text) ─────────

interface TextContentViewerProps {
  textContent: string;
  sourceSentence?: string;
  entityName?: string;
  mode?: 'plain' | 'spotlight';
  theme?: DeskTheme;
}

function TextContentViewer({ textContent, sourceSentence, entityName, mode = 'plain', theme }: TextContentViewerProps) {
  if (!textContent) return null;

  // For plain mode, just show text
  if (mode === 'plain') {
    return (
      <div
        className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
        style={{ color: theme?.textPrimary || '#d4d4d4' }}
      >
        {textContent}
      </div>
    );
  }

  // Spotlight mode: find and highlight the source sentence in text
  const normalizedText = textContent.toLowerCase().replace(/\s+/g, ' ');
  let highlightStart = -1;
  let highlightLength = 0;

  if (sourceSentence && sourceSentence.trim().length >= 10) {
    const normSentence = sourceSentence.toLowerCase().replace(/\s+/g, ' ').trim();

    // Strategy 1: Full match
    highlightStart = normalizedText.indexOf(normSentence);
    if (highlightStart >= 0) highlightLength = normSentence.length;

    // Strategy 2: First 50 chars
    if (highlightStart === -1) {
      const partial = normSentence.substring(0, 50);
      if (partial.length >= 15) {
        highlightStart = normalizedText.indexOf(partial);
        if (highlightStart >= 0) highlightLength = Math.min(normSentence.length, 200);
      }
    }

    // Strategy 3: 3-word sliding window
    if (highlightStart === -1) {
      const words = normSentence.split(' ').filter(w => w.length >= 1);
      if (words.length >= 3) {
        for (let i = 0; i <= words.length - 3; i++) {
          const window = words.slice(i, i + 3).join(' ');
          const wIdx = normalizedText.indexOf(window);
          if (wIdx >= 0) {
            highlightStart = wIdx;
            highlightLength = Math.min(normSentence.length, 200);
            break;
          }
        }
      }
    }
  }

  // Fallback: entity name
  if (highlightStart === -1 && entityName && entityName.length > 2) {
    const normName = entityName.toLowerCase();
    highlightStart = normalizedText.indexOf(normName);
    if (highlightStart >= 0) highlightLength = normName.length + 50;
  }

  // Map normalized position back to original text (approximate)
  // Since we only collapsed spaces, positions are roughly the same
  if (highlightStart >= 0) {
    // Find the actual position in original text
    let origIdx = 0;
    let normIdx = 0;
    const origText = textContent;
    const origLower = origText.toLowerCase();

    // Walk both strings to map normalized position → original position
    let actualStart = -1;
    let charsMatched = 0;
    for (let i = 0; i < origLower.length && normIdx <= highlightStart + highlightLength; i++) {
      if (normIdx === highlightStart && actualStart === -1) {
        actualStart = i;
      }
      if (actualStart >= 0) {
        charsMatched++;
      }
      // Skip extra whitespace in original
      if (/\s/.test(origLower[i])) {
        // Consume all consecutive whitespace
        while (i + 1 < origLower.length && /\s/.test(origLower[i + 1])) {
          i++;
          if (actualStart >= 0) charsMatched++;
        }
      }
      normIdx++;
    }

    if (actualStart >= 0) {
      const before = textContent.substring(0, actualStart);
      const highlighted = textContent.substring(actualStart, actualStart + charsMatched);
      const after = textContent.substring(actualStart + charsMatched);

      return (
        <TextContentWithHighlight before={before} highlighted={highlighted} after={after} theme={theme} />
      );
    }
  }

  // No highlight found — show plain text
  return (
    <div
      className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
      style={{ color: theme?.textPrimary || '#d4d4d4' }}
    >
      {textContent}
    </div>
  );
}

// ─── Task Card (CLASSIFIED Aesthetic) ───────────────────────────────

interface TaskCardProps {
  task: InvestigationTask;
  reviewPhase: ReviewPhase;
  document: DocumentContext | null;
  theme?: DeskTheme;
}

function TaskCard({ task, reviewPhase, document, theme }: TaskCardProps) {
  const { task_data } = task;
  const sourceBadge = getSourceBadge(task_data.source_provider);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mx-3 my-3"
    >
      {/* CLASSIFIED header */}
      <div
        className="px-3 py-1.5 rounded-t-lg flex items-center gap-2"
        style={{
          background: theme?.classifiedBg || 'rgba(220, 38, 38, 0.08)',
          border: `1px solid ${theme?.classifiedBorder || 'rgba(220, 38, 38, 0.15)'}`,
          borderBottom: 'none',
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: theme?.classifiedDot || '#dc2626', boxShadow: `0 0 4px ${theme?.accentGlow || 'rgba(220,38,38,0.6)'}` }}
        />
        <span
          className="text-[9px] font-bold tracking-[0.25em] uppercase"
          style={{ color: theme?.classifiedText || '#dc2626', fontFamily: '"Courier New", monospace' }}
        >
          {theme?.label || 'CLASSIFIED'} — {task.task_type.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Task content */}
      <div
        className="px-3 py-3 rounded-b-lg"
        style={{
          background: theme?.cardBg || 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${theme?.cardBorder || 'rgba(255, 255, 255, 0.06)'}`,
          borderTop: 'none',
        }}
      >
        {/* Target entity */}
        <div className="flex items-center gap-2 mb-2">
          <Target size={12} style={{ color: theme?.accentText || '#f59e0b' }} className="flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold" style={{ color: theme?.accentText || '#fbbf24' }}>
              {task_data.entity_name && task_data.entity_name !== 'Unknown'
                ? (task_data.entity_name as string)
                : task_data.source_entity
                  ? `${task_data.source_entity} → ${task_data.relationship_type || 'bağlantı'} → ${task_data.target_entity || '?'}`
                  : ((task_data.raw_data as Record<string, unknown>)?.name as string) || 'İsimsiz Varlık'}
            </div>
            <div className="text-[9px] font-mono text-neutral-600">
              {task_data.entity_type || task_data.item_type || 'unknown'}
              {task_data.relationship_type && (
                <span className="ml-2 text-purple-500">
                  → {task_data.relationship_type} → {task_data.target_entity}
                </span>
              )}
            </div>
            {/* INTEGRITY WARNING: Entity not found in document */}
            {(task as InvestigationTask & { entity_document_mismatch?: boolean }).entity_document_mismatch && (
              <div
                className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded text-[9px] font-mono"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                }}
              >
                <AlertTriangle size={10} className="flex-shrink-0" />
                <span>DİKKAT: Bu varlık belgede bulunamadı. Belge-varlık eşleşme hatası olabilir.</span>
              </div>
            )}
          </div>
        </div>

        {/* Source sentence (the verbatim quote from document) */}
        {task_data.source_sentence && (
          <div
            className="p-2 rounded mb-2 text-[10px] leading-relaxed italic"
            style={{
              background: theme?.spotlightBg || 'rgba(245, 158, 11, 0.05)',
              border: `1px solid ${theme?.accentMuted || 'rgba(245, 158, 11, 0.1)'}`,
              color: theme?.textSecondary || '#a3a3a3',
              borderLeft: `2px solid ${theme?.spotlightBorder || 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            &ldquo;{task_data.source_sentence.substring(0, 200)}
            {(task_data.source_sentence.length || 0) > 200 ? '...' : ''}&rdquo;
            {task_data.source_page && (
              <span className="text-[8px] text-neutral-600 ml-1">(p. {task_data.source_page})</span>
            )}
          </div>
        )}

        {/* Source badge + document title */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-medium"
            style={{
              background: sourceBadge.color + '12',
              color: sourceBadge.color,
              border: `1px solid ${sourceBadge.color}20`,
            }}
          >
            {sourceBadge.label}
          </span>
          {document?.title && (
            <span className="text-[9px] text-neutral-500 truncate" title={document.title}>
              {document.title}
            </span>
          )}
        </div>

        {/* AI Confidence — HIDDEN during blind phase (anti-bias) */}
        {reviewPhase !== 'blind' && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${theme?.borderColor || 'rgba(255,255,255,0.04)'}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-neutral-600 uppercase">AI Güven</span>
              <span className="text-[10px] font-mono font-bold" style={{
                color: task_data.confidence >= 0.8 ? '#10b981'
                  : task_data.confidence >= 0.5 ? '#f59e0b' : '#ef4444'
              }}>
                {Math.round(task_data.confidence * 100)}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${task_data.confidence * 100}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full"
                style={{
                  background: task_data.confidence >= 0.8 ? '#10b981'
                    : task_data.confidence >= 0.5 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
          </div>
        )}

        {reviewPhase === 'blind' && (
          <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${theme?.borderColor || 'rgba(255,255,255,0.04)'}` }}>
            <AlertCircle size={10} className="text-amber-600" />
            <span className="text-[8px] font-mono text-amber-600/80">
              KÖR İNCELEME — AI güveni gizli. Kendi kararını ver.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface NormalizedHighlightData {
  page: number;
  canvas_width: number;
  canvas_height: number;
  strokes: Array<{ color: string; nx: number; ny: number; nw: number; nh: number }>;
}

interface DocumentVerificationDeskProps {
  task: InvestigationTask;
  document: DocumentContext | null;
  onHighlightChange?: (data: NormalizedHighlightData | null) => void;
}

export default function DocumentVerificationDesk({ task, document, onHighlightChange }: DocumentVerificationDeskProps) {
  const { task_data } = task;
  const { reviewPhase } = useInvestigationGameStore();

  // Resolve theme based on document type
  const theme = useMemo(() => getThemeForDocument(document?.document_type), [document?.document_type]);

  // PDF state (synced between panels)
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Fosforlu kalem state
  const [activePen, setActivePen] = useState(PEN_COLORS[0]);
  const [strokes, setStrokes] = useState<HighlightStroke[]>([]);
  const [penEnabled, setPenEnabled] = useState(true);

  // Canvas overlay dimensions
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const rightPdfContainerRef = useRef<HTMLDivElement>(null);

  // Mobile tab (responsive)
  const [mobileTab, setMobileTab] = useState<'original' | 'interactive'>('interactive');

  // Scanner animation
  const [scannerActive, setScannerActive] = useState(false);

  // Page text for spotlight search
  const pageText = useMemo(() => {
    return document?.text_content || '';
  }, [document?.text_content]);

  // Spotlight data from task
  const spotlight = task.spotlight || { mode: 'none' as const, source_sentence: '', source_page: null, honeypot_target_section: null };

  // Auto-navigate to spotlight page
  useEffect(() => {
    if (spotlight.source_page && spotlight.source_page > 0 && numPages > 0) {
      setCurrentPage(Math.min(spotlight.source_page, numPages));
    }
  }, [spotlight.source_page, numPages]);

  // Scanner animation on task load
  useEffect(() => {
    if (task.id) {
      setScannerActive(true);
      const timer = setTimeout(() => setScannerActive(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [task.id]);

  // PDF file URL
  const fileUrl = document?.file_url || null;
  const hasFile = document?.has_file && fileUrl;

  // PDF callbacks
  const onDocumentLoadSuccess = useCallback(({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setPdfLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('[DocumentVerificationDesk] PDF load error:', err);
    setPdfError('PDF yüklenemedi. Dosya bozuk olabilir.');
    setPdfLoading(false);
  }, []);

  // Track page render size
  const onPageRenderSuccess = useCallback(() => {
    if (rightPdfContainerRef.current) {
      const pageEl = rightPdfContainerRef.current.querySelector('.react-pdf__Page');
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        setPageSize({ width: rect.width, height: rect.height });
      }
    }
  }, []);

  // Navigation (synced between panels)
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(numPages, p + 1));
  const zoomIn = () => setScale(s => Math.min(2.5, s + 0.2));
  const zoomOut = () => setScale(s => Math.max(0.4, s - 0.2));

  // Clear strokes on page change
  useEffect(() => {
    setStrokes([]);
  }, [currentPage]);

  // Report normalized highlight data
  useEffect(() => {
    if (!onHighlightChange) return;
    if (strokes.length === 0 || pageSize.width === 0 || pageSize.height === 0) {
      onHighlightChange(null);
      return;
    }
    const normalized: NormalizedHighlightData = {
      page: currentPage,
      canvas_width: pageSize.width,
      canvas_height: pageSize.height,
      strokes: strokes.map(s => ({
        color: s.color,
        nx: s.boundingBox.x / pageSize.width,
        ny: s.boundingBox.y / pageSize.height,
        nw: s.boundingBox.width / pageSize.width,
        nh: s.boundingBox.height / pageSize.height,
      })),
    };
    onHighlightChange(normalized);
  }, [strokes, currentPage, pageSize, onHighlightChange]);

  // Fosforlu kalem handlers
  const handleStrokeComplete = useCallback((stroke: HighlightStroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  const handleStrokeRemove = useCallback((strokeId: string) => {
    setStrokes(prev => prev.filter(s => s.id !== strokeId));
  }, []);

  const handleClearAll = useCallback(() => {
    setStrokes([]);
  }, []);

  // ── No PDF available — check if we have text content ─────────────
  if (!hasFile && !pageText) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <FileText size={48} className="mx-auto mb-4 text-neutral-700" />
          <h3 className="text-lg font-semibold text-neutral-300 mb-2">
            Belge Dosyası Bulunamadı
          </h3>
          <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
            Bu görev için orijinal belge dosyası mevcut değil.
          </p>
          {document?.source_url && (
            <a
              href={document.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <ExternalLink size={12} />
              Kaynağı aç
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── No PDF but text content available — Text mode layout ────────
  if (!hasFile && pageText) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: theme.panelBg }}>
        {/* MOBILE TAB BAR */}
        <div
          className="flex items-center md:hidden flex-shrink-0"
          style={{ borderBottom: `1px solid ${theme.borderColor}` }}
        >
          <button
            onClick={() => setMobileTab('original')}
            className="flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider transition-colors"
            style={{
              color: mobileTab === 'original' ? theme.accentText : theme.textMuted,
              borderBottom: mobileTab === 'original' ? `2px solid ${theme.accent}` : '2px solid transparent',
            }}
          >
            ORİJİNAL
          </button>
          <button
            onClick={() => setMobileTab('interactive')}
            className="flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider transition-colors"
            style={{
              color: mobileTab === 'interactive' ? theme.accentText : theme.textMuted,
              borderBottom: mobileTab === 'interactive' ? `2px solid ${theme.accent}` : '2px solid transparent',
            }}
          >
            GÖREV
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* SOL PANEL — Düz metin */}
          <div
            className={`flex flex-col overflow-hidden ${mobileTab !== 'original' ? 'hidden md:flex' : 'flex'}`}
            style={{ flex: '1 1 0', minWidth: 0, borderRight: `1px solid ${theme.borderColor}` }}
          >
            <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.headerBorder}`, background: theme.headerBg }}>
              <Eye size={11} style={{ color: theme.textSecondary }} />
              <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: theme.textSecondary }}>ORİJİNAL BELGE (METİN)</span>
              {document?.source_url && (
                <a href={document.source_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[8px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ExternalLink size={8} /> Kaynak
                </a>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ background: theme.contentBg }}>
              <TextContentViewer textContent={pageText} mode="plain" theme={theme} />
            </div>
          </div>

          {/* SAĞ PANEL — Spotlight metin + görev kartı */}
          <div
            className={`flex flex-col overflow-hidden ${mobileTab !== 'interactive' ? 'hidden md:flex' : 'flex'}`}
            style={{ flex: '1 1 0', minWidth: 0 }}
          >
            <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.headerBorder}`, background: theme.headerBg }}>
              <Scan size={11} style={{ color: theme.accentText }} />
              <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: theme.accentText }}>İNTERAKTİF SAHNE</span>
              {spotlight.mode !== 'none' && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-mono uppercase" style={{ background: theme.accentMuted, color: theme.accentText, border: `1px solid ${theme.accentMuted}` }}>
                  <Target size={8} /> SPOTLIGHT
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Text with spotlight highlighting */}
              <div className="flex-1 overflow-auto" style={{ background: theme.contentBg }}>
                <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${theme.accentMuted}` }}>
                  <Target size={10} style={{ color: theme.accentText }} />
                  <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: theme.accentText }}>
                    Spotlight sayfası: {spotlight.source_page || 'metin'}
                  </span>
                </div>
                <TextContentViewer
                  textContent={pageText}
                  sourceSentence={
                    spotlight.mode === 'honeypot'
                      ? (spotlight.honeypot_target_section || '')
                      : spotlight.source_sentence
                  }
                  entityName={task_data.entity_name as string || task_data.source_entity as string || ''}
                  mode="spotlight"
                  theme={theme}
                />
              </div>

              {/* Task Card */}
              <TaskCard task={task} reviewPhase={reviewPhase} document={document} theme={theme} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: theme.panelBg }}>
      {/* ═══ MOBILE TAB BAR (hidden on desktop) ═══ */}
      <div
        className="flex items-center md:hidden flex-shrink-0"
        style={{ borderBottom: `1px solid ${theme.borderColor}` }}
      >
        <button
          onClick={() => setMobileTab('original')}
          className="flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider transition-colors"
          style={{
            color: mobileTab === 'original' ? theme.accentText : theme.textMuted,
            borderBottom: mobileTab === 'original' ? `2px solid ${theme.accent}` : '2px solid transparent',
          }}
        >
          ORİJİNAL
        </button>
        <button
          onClick={() => setMobileTab('interactive')}
          className="flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider transition-colors"
          style={{
            color: mobileTab === 'interactive' ? theme.accentText : theme.textMuted,
            borderBottom: mobileTab === 'interactive' ? `2px solid ${theme.accent}` : '2px solid transparent',
          }}
        >
          GÖREV
        </button>
      </div>

      {/* ═══ MAIN SPLIT PANELS ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ═══ SOL PANEL — ORİJİNAL BELGE (dokunulmaz referans) ═══ */}
        <div
          className={`flex flex-col overflow-hidden ${mobileTab !== 'original' ? 'hidden md:flex' : 'flex'}`}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            borderRight: `1px solid ${theme.borderColor}`,
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{
              borderBottom: `1px solid ${theme.headerBorder}`,
              background: theme.headerBg,
            }}
          >
            <Eye size={11} style={{ color: theme.textSecondary }} />
            <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: theme.textSecondary }}>
              ORİJİNAL BELGE
            </span>
            <span className="text-[8px] font-mono ml-auto" style={{ color: theme.textMuted }}>
              REFERANS — SALT OKUNUR
            </span>
          </div>

          {/* PDF content — clean, no effects */}
          <div
            className="flex-1 overflow-auto flex justify-center items-start p-3"
            style={{ background: theme.contentBg }}
          >
            {pdfLoading && !pdfError && (
              <div className="flex items-center gap-2 mt-20" style={{ color: theme.textMuted }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-mono">PDF yükleniyor...</span>
              </div>
            )}
            {pdfError && pageText ? (
              /* PDF failed but we have text content — show it */
              <TextContentViewer textContent={pageText} mode="plain" theme={theme} />
            ) : pdfError ? (
              <div className="flex flex-col items-center gap-2 text-red-500 mt-20">
                <AlertTriangle size={24} />
                <span className="text-xs font-mono">{pdfError}</span>
              </div>
            ) : null}
            {!pdfError && fileUrl && (
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                />
              </Document>
            )}
          </div>
        </div>

        {/* ═══ SAĞ PANEL — İNTERAKTİF SAHNE (spotlight + görev + kalem) ═══ */}
        <div
          className={`flex flex-col overflow-hidden ${mobileTab !== 'interactive' ? 'hidden md:flex' : 'flex'}`}
          style={{
            flex: '1 1 0',
            minWidth: 0,
          }}
        >
          {/* Panel header + pen tools */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{
              borderBottom: `1px solid ${theme.headerBorder}`,
              background: theme.headerBg,
            }}
          >
            <Scan size={11} style={{ color: theme.accentText }} />
            <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: theme.accentText }}>
              İNTERAKTİF SAHNE
            </span>

            {/* Spotlight mode indicator */}
            {spotlight.mode !== 'none' && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-mono uppercase"
                style={{
                  background: theme.accentMuted,
                  color: theme.accentText,
                  border: `1px solid ${theme.accentMuted}`,
                }}
              >
                <Target size={8} />
                SPOTLIGHT
              </div>
            )}

            {/* Pen selector (compact) */}
            <div className="flex items-center gap-1 ml-auto">
              {PEN_COLORS.map(pen => (
                <button
                  key={pen.id}
                  onClick={() => setActivePen(pen)}
                  className="w-3.5 h-3.5 rounded-full transition-all"
                  style={{
                    background: pen.color,
                    opacity: activePen.id === pen.id ? 1 : 0.25,
                    border: activePen.id === pen.id ? '2px solid white' : '1px solid transparent',
                    transform: activePen.id === pen.id ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={`${pen.label} — ${pen.desc}`}
                />
              ))}
              <button
                onClick={() => setPenEnabled(!penEnabled)}
                className="p-0.5 rounded ml-1"
                style={{
                  color: penEnabled ? '#facc15' : '#555',
                  background: penEnabled ? 'rgba(250,204,21,0.1)' : 'transparent',
                }}
                title={penEnabled ? 'Kalemi kapat' : 'Kalemi aç'}
              >
                {penEnabled ? <Highlighter size={10} /> : <Eraser size={10} />}
              </button>
              {strokes.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-0.5 rounded"
                  style={{ color: '#ef4444' }}
                  title="Tümünü temizle"
                >
                  <RotateCcw size={9} />
                </button>
              )}
            </div>
          </div>

          {/* Interactive content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* PDF with Spotlight + Scanner + Kalem */}
            <div
              ref={rightPdfContainerRef}
              className="flex-1 overflow-auto flex justify-center items-start p-3 relative"
              style={{ background: theme.contentBg }}
            >
              {/* Scanner sweep animation */}
              <ScannerAnimation active={scannerActive} theme={theme} />

              {pdfError && pageText ? (
                /* PDF failed but text available — show with spotlight highlighting */
                <div className="w-full">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1" style={{ borderBottom: `1px solid ${theme.accentMuted}` }}>
                    <Target size={10} style={{ color: theme.accentText }} />
                    <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: theme.accentText }}>
                      Spotlight sayfası: {spotlight.source_page || 'metin'}
                    </span>
                  </div>
                  <TextContentViewer
                    textContent={pageText}
                    sourceSentence={
                      spotlight.mode === 'honeypot'
                        ? (spotlight.honeypot_target_section || '')
                        : spotlight.source_sentence
                    }
                    entityName={task_data.entity_name as string || task_data.source_entity as string || ''}
                    mode="spotlight"
                    theme={theme}
                  />
                </div>
              ) : pdfError ? (
                <div className="flex flex-col items-center gap-2 mt-12" style={{ color: theme.accentText }}>
                  <AlertTriangle size={20} />
                  <span className="text-[10px] font-mono text-center max-w-[200px]">
                    PDF yüklenemedi. Aşağıdaki görev kartından devam edebilirsin.
                  </span>
                </div>
              ) : fileUrl ? (
                <div className="relative inline-block">
                  <Document file={fileUrl} loading={null} onLoadError={onDocumentLoadError}>
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                      onRenderSuccess={onPageRenderSuccess}
                    />
                  </Document>

                  {/* Spotlight overlay */}
                  <SpotlightOverlay
                    mode={spotlight.mode}
                    sourceSentence={
                      spotlight.mode === 'honeypot'
                        ? (spotlight.honeypot_target_section || '')
                        : spotlight.source_sentence
                    }
                    pageText={pageText}
                    pageHeight={pageSize.height}
                    entityName={task_data.entity_name as string || task_data.source_entity as string || ''}
                    theme={theme}
                  />

                  {/* Canvas overlay — fosforlu kalem */}
                  {pageSize.width > 0 && pageSize.height > 0 && (
                    <FosforluKalem
                      width={pageSize.width}
                      height={pageSize.height}
                      penColor={activePen.color}
                      penSize={18}
                      penOpacity={0.35}
                      enabled={penEnabled}
                      strokes={strokes}
                      onStrokeComplete={handleStrokeComplete}
                      onStrokeRemove={handleStrokeRemove}
                    />
                  )}
                </div>
              ) : null}
            </div>

            {/* Task Card (CLASSIFIED aesthetic) */}
            <TaskCard
              task={task}
              reviewPhase={reviewPhase}
              document={document}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {/* ═══ SHARED NAVIGATION BAR ═══ */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          borderTop: `1px solid ${theme.borderColor}`,
          background: theme.headerBg,
        }}
      >
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button onClick={goToPrevPage} disabled={currentPage <= 1} className="p-1 rounded hover:bg-white/5 disabled:opacity-20" style={{ color: theme.textSecondary }}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-mono min-w-[60px] text-center" style={{ color: theme.textSecondary }}>
            {currentPage} / {numPages || '...'}
          </span>
          <button onClick={goToNextPage} disabled={currentPage >= numPages} className="p-1 rounded hover:bg-white/5 disabled:opacity-20" style={{ color: theme.textSecondary }}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Spotlight page hint */}
        {spotlight.source_page && spotlight.source_page !== currentPage && (
          <button
            onClick={() => setCurrentPage(Math.min(spotlight.source_page!, numPages))}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono transition-colors"
            style={{
              color: theme.accentText,
              background: theme.accentMuted,
              border: `1px solid ${theme.accentMuted}`,
            }}
          >
            <Target size={8} />
            Spotlight sayfası: {spotlight.source_page}
          </button>
        )}

        {/* Stroke count */}
        {strokes.length > 0 && (
          <span className="text-[8px] font-mono" style={{ color: theme.textMuted }}>
            {strokes.length} işaret
          </span>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1 rounded hover:bg-white/5" style={{ color: theme.textSecondary }}>
            <ZoomOut size={12} />
          </button>
          <span className="text-[9px] font-mono min-w-[32px] text-center" style={{ color: theme.textMuted }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} className="p-1 rounded hover:bg-white/5" style={{ color: theme.textSecondary }}>
            <ZoomIn size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
