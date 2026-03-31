'use client';

/**
 * InvestigationDesk — Center-screen investigation environment
 *
 * This is NOT a sidebar. This opens in the CENTER of the screen.
 * When a user clicks a task from the task wallet (right panel),
 * or directly from the INVESTIGATE button, this desk opens.
 *
 * Each task type renders a completely different workspace:
 *   - entity_verification    → EntityVerificationDesk (split-screen + highlight)
 *   - relationship_verification → RelationshipVerificationDesk (node cards)
 *   - date_verification      → DateClaimVerificationDesk (timeline)
 *   - claim_verification     → DateClaimVerificationDesk (claim card)
 *
 * The bottom bar (DecisionBar) is shared across all task types.
 *
 * Philosophy: Not a game. A professional verification tool that happens
 * to be satisfying to use. "Neden soktun ağa" — every decision needs a reason.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, FileText, GitBranch, Calendar, MessageSquare, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useInvestigationGameStore, type InvestigationTask, type DocumentContext, type ProvenanceEntry, type ExistingReview, type ReviewPhase } from '@/store/investigationGameStore';

// Task-type specific desks
import EntityVerificationDesk from './desks/EntityVerificationDesk';
import RelationshipVerificationDesk from './desks/RelationshipVerificationDesk';
import DateClaimVerificationDesk from './desks/DateClaimVerificationDesk';
import { getThemeForDocument } from './desks/deskThemes';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with react-pdf
const DocumentVerificationDesk = dynamic(
  () => import('./desks/DocumentVerificationDesk'),
  { ssr: false }
);

// Shared components (reuse from existing)
import DecisionEngine from './components/DecisionEngine';
import ProvenanceTrail from './components/ProvenanceTrail';
import ExistingReviews from './components/ExistingReviews';
import CalibrationFeedback from './components/CalibrationFeedback';
import ConsensusBanner from './components/ConsensusBanner';
import { LoadingState, EmptyState, ErrorState } from './components/EmptyState';

// Verification Desk v2: 3-Layer Anti-Bias Phase System
import { PhaseManager } from './phases';

// ─── Task Type Config ──────────────────────────────────────────────

const TASK_TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
  borderColor: string;
}> = {
  entity_verification: {
    icon: <FileText size={14} />,
    label: 'ENTITY VERIFICATION',
    color: '#3b82f6',
    borderColor: 'rgba(59,130,246,0.2)',
  },
  relationship_verification: {
    icon: <GitBranch size={14} />,
    label: 'RELATIONSHIP VERIFICATION',
    color: '#8b5cf6',
    borderColor: 'rgba(139,92,246,0.2)',
  },
  date_verification: {
    icon: <Calendar size={14} />,
    label: 'DATE VERIFICATION',
    color: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  claim_verification: {
    icon: <MessageSquare size={14} />,
    label: 'CLAIM VERIFICATION',
    color: '#ef4444',
    borderColor: 'rgba(239,68,68,0.2)',
  },
};

// ─── Main Component ────────────────────────────────────────────────

interface InvestigationDeskProps {
  networkId: string;
  fingerprint: string;
}

export default function InvestigationDesk({ networkId, fingerprint }: InvestigationDeskProps) {
  const {
    isDeskOpen, currentTask, documentContext, provenance,
    existingReviews, isLoadingTask, noTasksAvailable, profile,
    isSubmitting, lastCalibration, lastConsensus,
    isGenerating, generationResult, sessionTasksCompleted, sessionCorrect,
    hasError, errorMessage,
    // Verification Desk v2
    reviewPhase, reviewsHidden, phaseResponses,
    closeDesk, fetchNextTask, submitReview,
    generateTasks, clearCalibration, clearConsensus, clearError,
    advancePhase, savePhaseResponse, resetReviewState,
  } = useInvestigationGameStore();

  const [showContext, setShowContext] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fosforlu kalem stroke data — lifted up from DocumentVerificationDesk for submit
  const highlightDataRef = useRef<{
    page: number;
    canvas_width: number;
    canvas_height: number;
    strokes: Array<{ color: string; nx: number; ny: number; nw: number; nh: number }>;
  } | null>(null);

  // Fetch first task when desk opens
  useEffect(() => {
    if (isDeskOpen && fingerprint && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNextTask(networkId, fingerprint);
    }
    if (!isDeskOpen) {
      hasFetchedRef.current = false;
      setShowContext(false);
    }
  }, [isDeskOpen, networkId, fingerprint, fetchNextTask]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDeskOpen) closeDesk();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeskOpen, closeDesk]);

  // ── Decision Handler ──────────────────────────────────────────────
  const handleSubmit = useCallback(async (
    decision: 'approve' | 'reject' | 'dispute' | 'skip',
    reasoning: string,
    confidence: number,
  ) => {
    if (!currentTask) return;
    const success = await submitReview({
      taskId: currentTask.id,
      fingerprint,
      decision,
      reasoning,
      confidence,
      highlightData: highlightDataRef.current,
      // Verification Desk v2: Include phase responses
      phaseResponses: phaseResponses,
    });
    if (success) {
      highlightDataRef.current = null; // Clear strokes for next task
      resetReviewState(); // Reset V2 phases
      const delay = (lastCalibration || lastConsensus) ? 2500 : 1000;
      setTimeout(() => {
        clearCalibration();
        clearConsensus();
        fetchNextTask(networkId, fingerprint);
      }, delay);
    }
  }, [currentTask, fingerprint, networkId, submitReview, fetchNextTask, clearCalibration, clearConsensus, lastCalibration, lastConsensus, phaseResponses, resetReviewState]);

  const handleGenerate = useCallback(async () => {
    await generateTasks(networkId);
    fetchNextTask(networkId, fingerprint);
  }, [networkId, fingerprint, generateTasks, fetchNextTask]);

  const handleRetry = useCallback(() => {
    clearError();
    fetchNextTask(networkId, fingerprint);
  }, [clearError, fetchNextTask, networkId, fingerprint]);

  if (!isDeskOpen) return null;

  const taskConfig = currentTask
    ? (TASK_TYPE_CONFIG[currentTask.task_type] || TASK_TYPE_CONFIG.entity_verification)
    : TASK_TYPE_CONFIG.entity_verification;

  // Document-type theme for desk environment
  const deskTheme = getThemeForDocument(documentContext?.document_type);

  // ── Render the task-type-specific desk ────────────────────────────
  // PRIORITY: If document has a PDF file → use the 3-panel DocumentVerificationDesk
  // This is the real deal: original PDF + fosforlu kalem + task panel
  // Fallback desks are for tasks WITHOUT a source PDF file
  const renderDesk = () => {
    if (!currentTask) return null;

    // 3-Panel Document Desk: when a real PDF file is available
    if (documentContext?.has_file) {
      return (
        <DocumentVerificationDesk
          task={currentTask}
          document={documentContext}
          onHighlightChange={(data) => { highlightDataRef.current = data; }}
        />
      );
    }

    // Fallback desks (no PDF file — metadata/text only)
    const taskType = currentTask.task_type;

    if (taskType === 'entity_verification' || taskType === 'entity_resolution' || taskType === 'source_verification') {
      return (
        <EntityVerificationDesk
          task={currentTask}
          document={documentContext}
        />
      );
    }

    if (taskType === 'relationship_verification') {
      return (
        <RelationshipVerificationDesk
          task={currentTask}
          document={documentContext}
        />
      );
    }

    if (taskType === 'date_verification' || taskType === 'claim_verification') {
      return (
        <DateClaimVerificationDesk
          task={currentTask}
          document={documentContext}
        />
      );
    }

    // Fallback: entity desk for unknown types
    return (
      <EntityVerificationDesk
        task={currentTask}
        document={documentContext}
      />
    );
  };

  return (
    <AnimatePresence>
      {isDeskOpen && (
        <>
          {/* ── BACKDROP ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md"
            onClick={closeDesk}
          />

          {/* ── THE DESK — Center screen ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 26,
              mass: 0.7,
            }}
            className="fixed z-[1101] flex flex-col overflow-hidden"
            style={{
              top: '2vh',
              left: '2vw',
              right: '2vw',
              bottom: '2vh',
              maxWidth: '1600px',
              margin: '0 auto',
              borderRadius: 16,
              background: `linear-gradient(180deg, ${deskTheme.panelBg} 0%, ${deskTheme.contentBg} 100%)`,
              border: `1px solid ${deskTheme.borderColor}`,
              boxShadow: `0 40px 120px rgba(0,0,0,0.95), 0 0 60px ${deskTheme.accentGlow}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ═══ HEADER ═══ */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${deskTheme.headerBorder}`, background: deskTheme.headerBg }}
            >
              {/* Task type indicator */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Crosshair size={14} style={{ color: taskConfig.color }} />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: `radial-gradient(circle, ${taskConfig.color}30 0%, transparent 70%)` }}
                  />
                </div>
                <span
                  className="text-[10px] font-bold tracking-[0.2em] uppercase"
                  style={{
                    color: taskConfig.color,
                    fontFamily: '"Courier New", Courier, monospace',
                  }}
                >
                  {currentTask ? taskConfig.label : 'INVESTIGATION DESK'}
                </span>
              </div>

              {/* Difficulty dots */}
              {currentTask && (
                <div className="flex items-center gap-0.5 ml-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i < currentTask.difficulty
                          ? taskConfig.color
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Risk level badge */}
              {currentTask?.risk_level === 'high' && (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  ⚠ HIGH RISK
                </div>
              )}

              {/* Trace ID */}
              {currentTask?.trace_id && (
                <span className="text-[8px] font-mono text-neutral-700 ml-2">
                  {currentTask.trace_id}
                </span>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Session stats */}
              {sessionTasksCompleted > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={10} className="text-emerald-500" />
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {sessionTasksCompleted} reviewed
                    {sessionCorrect > 0 && (
                      <span className="text-emerald-600 ml-1">· {sessionCorrect} ✓</span>
                    )}
                  </span>
                </div>
              )}

              {/* Verification Desk v2: Phase indicator */}
              {currentTask && (
                <div className="flex items-center gap-1.5">
                  {(['blind', 'compare', 'verify'] as const).map((phase, i) => (
                    <div
                      key={phase}
                      className="flex items-center gap-1"
                    >
                      <div
                        className="w-2 h-2 rounded-full transition-all duration-300"
                        style={{
                          background: reviewPhase === phase
                            ? deskTheme.accent
                            : (['blind', 'compare', 'verify'] as readonly string[]).indexOf(reviewPhase) > i
                              ? '#22c55e'
                              : 'rgba(255,255,255,0.1)',
                          boxShadow: reviewPhase === phase ? `0 0 6px ${deskTheme.accentGlow}` : 'none',
                        }}
                      />
                      <span
                        className="text-[8px] font-mono uppercase"
                        style={{
                          color: reviewPhase === phase ? deskTheme.accentText : 'rgba(255,255,255,0.25)',
                        }}
                      >
                        {phase === 'blind' ? 'BLIND' : phase === 'compare' ? 'COMPARE' : 'VERIFY'}
                      </span>
                      {i < 2 && <span className="text-neutral-800 text-[8px]">→</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Context toggle — ANTI-BIAS: hidden during blind phase */}
              {!reviewsHidden && (provenance.length > 0 || existingReviews.length > 0) && (
                <button
                  onClick={() => setShowContext(!showContext)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  CONTEXT
                  {showContext ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}

              {/* Close — ESC */}
              <button
                onClick={closeDesk}
                className="p-1.5 rounded-md transition-all hover:bg-white/5 text-neutral-600 hover:text-neutral-400"
                title="ESC"
              >
                <X size={14} />
              </button>
            </motion.div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* ── Feedback Banners ── */}
              <AnimatePresence>
                {lastCalibration && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-shrink-0 overflow-hidden px-5"
                  >
                    <CalibrationFeedback result={lastCalibration} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {lastConsensus && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-shrink-0 overflow-hidden px-5"
                  >
                    <ConsensusBanner result={lastConsensus} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Loading / Error / Empty ── */}
              {isLoadingTask && (
                <div className="flex-1 flex items-center justify-center">
                  <LoadingState />
                </div>
              )}

              {!isLoadingTask && hasError && !currentTask && (
                <div className="flex-1 flex items-center justify-center">
                  <ErrorState message={errorMessage} onRetry={handleRetry} />
                </div>
              )}

              {!isLoadingTask && noTasksAvailable && (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    generationResult={generationResult}
                  />
                </div>
              )}

              {/* ── Active Investigation ── */}
              {!isLoadingTask && currentTask && (
                <>
                  {/* Task-specific workspace */}
                  <div className="flex-1 overflow-y-auto">
                    {renderDesk()}

                    {/* Collapsible context: Provenance + Existing Reviews */}
                    {/* ANTI-BIAS: Reviews hidden during blind phase */}
                    <AnimatePresence>
                      {showContext && !reviewsHidden && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden px-5 pb-3"
                        >
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <ProvenanceTrail entries={provenance} />
                            </div>
                            <div>
                              <ExistingReviews reviews={existingReviews} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ═══ DECISION BAR — Fixed at bottom ═══ */}
                  <div
                    className="flex-shrink-0 px-5 py-3"
                    style={{ borderTop: `1px solid ${deskTheme.borderColor}` }}
                  >
                    {/* Verification Desk v2: Use PhaseManager for document-backed tasks */}
                    {documentContext?.has_file ? (
                      <PhaseManager
                        onFinalSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                      />
                    ) : (
                      <DecisionEngine
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        taskType={currentTask.task_type}
                        taskColor={taskConfig.color}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
