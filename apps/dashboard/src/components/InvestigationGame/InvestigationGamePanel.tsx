'use client';

/**
 * InvestigationGamePanel — The Complete Investigation Experience
 *
 * Architecture: Modular composition of cinematic components
 *
 * Components:
 *   InvestigationRoom  — Cinematic container (spring physics entry, backdrop blur)
 *   ProfileBar          — Trust formula, tier progression
 *   TaskCard            — Case file display (6 task type morphologies)
 *   DecisionEngine      — Stamp mechanic (VERIFIED/REJECTED, speed warning)
 *   ProvenanceTrail     — Chain of custody timeline
 *   ExistingReviews     — Previous investigators' verdicts (Papers Please docket)
 *   CalibrationFeedback — "CALIBRATION MISMATCH" not "WRONG!"
 *   ConsensusBanner     — Community verdict reached
 *   EmptyState/Loading  — CRT terminal aesthetic
 *
 * Verification Desk v2 additions:
 *   ErrorReportForm     — "Bu veri yanlış" quick report (Legal Fortress)
 *   AIDisclaimer        — AI limitations disclosure (GDPR + EU AI Act)
 *   DisputesTab         — Dispute list + new dispute form
 *   TrustWeightDetail   — 6-signal trust weight breakdown (radical transparency)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useInvestigationGameStore } from '@/store/investigationGameStore';

// ─── Modular Components ─────────────────────────────────────────────
import InvestigationRoom from './components/InvestigationRoom';
import ProfileBar from './components/ProfileBar';
import TaskCard from './components/TaskCard';
import DecisionEngine from './components/DecisionEngine';
import ProvenanceTrail from './components/ProvenanceTrail';
import ExistingReviews from './components/ExistingReviews';
import CalibrationFeedback from './components/CalibrationFeedback';
import ConsensusBanner from './components/ConsensusBanner';
import { LoadingState, EmptyState, ErrorState } from './components/EmptyState';

// ─── Verification Desk v2 Components ────────────────────────────────
import ErrorReportForm from './components/ErrorReportForm';
import AIDisclaimer from './components/AIDisclaimer';
import DisputesTab from './components/DisputesTab';
import TrustWeightDetail from './components/TrustWeightDetail';

// ─── Task Type Color Lookup ─────────────────────────────────────────

const TASK_COLORS: Record<string, string> = {
  entity_verification: '#3b82f6',
  relationship_verification: '#8b5cf6',
  date_verification: '#f59e0b',
  claim_verification: '#ef4444',
  entity_resolution: '#10b981',
  source_verification: '#6366f1',
};

// ─── Main Panel ─────────────────────────────────────────────────────

// ─── Tab Configuration ──────────────────────────────────────────────

type PanelTab = 'task' | 'profile' | 'disputes';

const TAB_CONFIG: Array<{ id: PanelTab; label: string; shortLabel: string }> = [
  { id: 'task', label: 'GÖREV', shortLabel: 'GÖREV' },
  { id: 'profile', label: 'PROFİL', shortLabel: 'PROFİL' },
  { id: 'disputes', label: 'İTİRAZ', shortLabel: 'İTİRAZ' },
];

interface InvestigationGamePanelProps {
  networkId: string;
  fingerprint: string;
}

export default function InvestigationGamePanel({ networkId, fingerprint }: InvestigationGamePanelProps) {
  const {
    isOpen, currentTask, documentContext, provenance,
    existingReviews, isLoadingTask, noTasksAvailable, profile,
    isSubmitting, lastCalibration, lastConsensus,
    isGenerating, generationResult, sessionTasksCompleted, sessionCorrect,
    hasError, errorMessage,
    closePanel, fetchNextTask, submitReview,
    generateTasks, clearCalibration, clearConsensus, clearError,
  } = useInvestigationGameStore();

  const [activeTab, setActiveTab] = useState<PanelTab>('task');

  // Load first task ONCE when panel opens
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (isOpen && fingerprint && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNextTask(networkId, fingerprint);
    }
    if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen, networkId, fingerprint, fetchNextTask]);

  // ── Decision Handler ────────────────────────────────────────────
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
    });
    if (success) {
      // Auto-advance — longer delay if feedback to read
      const delay = (lastCalibration || lastConsensus) ? 2500 : 800;
      setTimeout(() => {
        clearCalibration();
        clearConsensus();
        fetchNextTask(networkId, fingerprint);
      }, delay);
    }
  }, [currentTask, fingerprint, networkId, submitReview, fetchNextTask, clearCalibration, clearConsensus, lastCalibration, lastConsensus]);

  // ── Generate Tasks Handler ──────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    await generateTasks(networkId);
    fetchNextTask(networkId, fingerprint);
  }, [networkId, fingerprint, generateTasks, fetchNextTask]);

  // ── Retry Handler ───────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    clearError();
    fetchNextTask(networkId, fingerprint);
  }, [clearError, fetchNextTask, networkId, fingerprint]);

  if (!isOpen) return null;

  const taskColor = currentTask
    ? (TASK_COLORS[currentTask.task_type] || '#dc2626')
    : '#dc2626';

  return (
    <InvestigationRoom
      isOpen={isOpen}
      onClose={closePanel}
      sessionTasksCompleted={sessionTasksCompleted}
      sessionCorrect={sessionCorrect}
    >
      {/* ── Tab Navigation ── */}
      <div
        className="flex items-center gap-0.5 px-4 pt-2 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 text-[9px] font-mono tracking-wider uppercase transition-all"
            style={{
              color: activeTab === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.25)',
              borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
            }}
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#222 transparent',
        }}
      >
        {/* ═══════ GÖREV TAB ═══════ */}
        {activeTab === 'task' && (
          <>
            {/* Profile Bar — always visible when loaded */}
            <ProfileBar profile={profile} />

            {/* Calibration Feedback (appears after calibration task) */}
            <AnimatePresence>
              {lastCalibration && (
                <CalibrationFeedback result={lastCalibration} />
              )}
            </AnimatePresence>

            {/* Consensus Banner (appears when consensus reached) */}
            <AnimatePresence>
              {lastConsensus && (
                <ConsensusBanner result={lastConsensus} />
              )}
            </AnimatePresence>

            {/* ── Loading ── */}
            {isLoadingTask && <LoadingState />}

            {/* ── Error ── */}
            {!isLoadingTask && hasError && !currentTask && (
              <ErrorState message={errorMessage} onRetry={handleRetry} />
            )}

            {/* ── No Tasks ── */}
            {!isLoadingTask && noTasksAvailable && (
              <EmptyState
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                generationResult={generationResult}
              />
            )}

            {/* ── Active Task ── */}
            {!isLoadingTask && currentTask && (
              <>
                {/* Case File */}
                <TaskCard task={currentTask} />

                {/* Document context (if available) */}
                {documentContext && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-[9px] font-mono text-neutral-600"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span className="text-neutral-700 tracking-wider">SOURCE DOC:</span>{' '}
                    {documentContext.title}
                    {documentContext.page_count > 0 && (
                      <span className="text-neutral-700"> · {documentContext.page_count} pages</span>
                    )}
                  </div>
                )}

                {/* Decision Engine — The Stamp */}
                <div className="mt-3">
                  <DecisionEngine
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    taskType={currentTask.task_type}
                    taskColor={taskColor}
                  />
                </div>

                {/* Error Report — "Bu veri yanlış mı?" (Legal Fortress) */}
                <ErrorReportForm
                  taskId={currentTask.id}
                  networkId={networkId}
                  fingerprint={fingerprint}
                  entityName={currentTask.task_data.entity_name}
                />

                {/* Provenance Trail */}
                <ProvenanceTrail entries={provenance} />

                {/* Existing Reviews */}
                <ExistingReviews reviews={existingReviews} />
              </>
            )}

            {/* AI Disclaimer — always visible at bottom (GDPR + EU AI Act) */}
            <AIDisclaimer />
          </>
        )}

        {/* ═══════ PROFİL TAB ═══════ */}
        {activeTab === 'profile' && (
          <>
            <ProfileBar profile={profile} />
            {profile && <TrustWeightDetail profile={profile} />}
            {!profile && (
              <div className="text-center py-8 text-[10px] text-neutral-600 font-mono">
                Profil yükleniyor...
              </div>
            )}
          </>
        )}

        {/* ═══════ İTİRAZ TAB ═══════ */}
        {activeTab === 'disputes' && (
          <DisputesTab networkId={networkId} fingerprint={fingerprint} />
        )}
      </div>
    </InvestigationRoom>
  );
}
