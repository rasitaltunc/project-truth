'use client';

/**
 * PhaseManager — 3-Katmanlı Anti-Bias İnceleme Orkestratörü
 *
 * Tüm faz geçişlerini yönetir. DecisionEngine'in yerini alır.
 *
 * Akış:
 *   Katman 1 (Blind)   → Kullanıcı AI'sız karar verir
 *   Katman 2 (Compare)  → AI güveni açılır, karşılaştırma
 *   Katman 3 (Verify)   → Kaynak doğrulama, halüsinasyon kontrolü
 *   → Final Submit      → Tüm katman yanıtları store'a yazılır → API'ye gönderilir
 *
 * PhaseManager, InvestigationDesk'in alt kısmında (DecisionEngine yerine)
 * veya DocumentVerificationDesk'in görev kartı alanında render edilir.
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestigationGameStore } from '@/store/investigationGameStore';
import BlindReviewPhase from './BlindReviewPhase';
import CompareRevealPhase from './CompareRevealPhase';
import SourceVerifyPhase from './SourceVerifyPhase';

interface PhaseManagerProps {
  /** Called when all 3 phases complete — triggers submitReview in InvestigationDesk */
  onFinalSubmit: (
    decision: 'approve' | 'reject' | 'dispute' | 'skip',
    reasoning: string,
    confidence: number,
  ) => void;
  isSubmitting: boolean;
}

export default function PhaseManager({ onFinalSubmit, isSubmitting }: PhaseManagerProps) {
  const {
    currentTask,
    documentContext,
    reviewPhase,
    phaseResponses,
    advancePhase,
    savePhaseResponse,
  } = useInvestigationGameStore();

  if (!currentTask) return null;

  // ── Phase 1 Complete Handler ──────────────────────────────────
  const handleBlindComplete = useCallback((response: {
    decision: 'approve' | 'reject' | 'dispute' | 'skip';
    reasoning: string;
    confidence: number;
    rejected_spotlight: boolean;
  }) => {
    savePhaseResponse({
      phase: 'blind',
      decision: response.decision,
      reasoning: response.reasoning,
      confidence: response.confidence,
      rejected_spotlight: response.rejected_spotlight,
    });
    advancePhase(); // blind → compare
  }, [savePhaseResponse, advancePhase]);

  // ── Phase 2 Complete Handler ──────────────────────────────────
  const handleCompareComplete = useCallback((response: {
    decision: 'approve' | 'reject' | 'dispute';
    reasoning: string;
    confidence: number;
    corrections: Array<{
      field_name: string;
      original_value: string;
      corrected_value: string;
      correction_reasoning: string;
    }>;
    found_correct_section: boolean;
  }) => {
    savePhaseResponse({
      phase: 'compare',
      decision: response.decision,
      reasoning: response.reasoning,
      confidence: response.confidence,
      corrections: response.corrections,
      found_correct_section: response.found_correct_section,
    });
    advancePhase(); // compare → verify
  }, [savePhaseResponse, advancePhase]);

  // ── Phase 3 Complete Handler ──────────────────────────────────
  const handleVerifyComplete = useCallback((response: {
    decision: 'approve' | 'reject' | 'dispute';
    reasoning: string;
    confidence: number;
    source_found: boolean;
    hallucination_flags: string[];
  }) => {
    // Save phase 3 response (including source verification data)
    savePhaseResponse({
      phase: 'verify',
      decision: response.decision,
      reasoning: response.reasoning,
      confidence: response.confidence,
      source_found: response.source_found,
      hallucination_flags: response.hallucination_flags,
    });
    advancePhase(); // verify → complete

    // Build final reasoning from all phases
    const blindPhase = phaseResponses.find(p => p.phase === 'blind');
    const comparePhase = phaseResponses.find(p => p.phase === 'compare');

    const combinedReasoning = [
      blindPhase?.reasoning ? `[Kör] ${blindPhase.reasoning}` : null,
      comparePhase?.reasoning ? `[Karşılaştırma] ${comparePhase.reasoning}` : null,
      `[Doğrulama] ${response.reasoning}`,
      response.hallucination_flags.length > 0
        ? `[Halüsinasyon] ${response.hallucination_flags.join(', ')}`
        : null,
      !response.source_found ? '[KAYNAK DOĞRULANAMADI]' : null,
    ].filter(Boolean).join(' | ');

    // Final submit uses the LAST phase's decision (most informed)
    onFinalSubmit(
      response.decision,
      combinedReasoning,
      response.confidence,
    );
  }, [savePhaseResponse, advancePhase, phaseResponses, onFinalSubmit]);

  // Get blind phase data for compare phase
  const blindResponse = phaseResponses.find(p => p.phase === 'blind');
  const blindDecision = blindResponse?.decision || 'approve';
  const blindConfidence = blindResponse?.confidence || 0.5;

  return (
    <div className="relative">
      {/* Submitting overlay */}
      {isSubmitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex items-center justify-center rounded"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"
            />
            <span className="text-xs font-mono text-amber-500">Gönderiliyor...</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {reviewPhase === 'blind' && (
          <motion.div
            key="blind"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <BlindReviewPhase
              task={currentTask}
              onComplete={handleBlindComplete}
            />
          </motion.div>
        )}

        {reviewPhase === 'compare' && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <CompareRevealPhase
              task={currentTask}
              blindDecision={blindDecision}
              blindConfidence={blindConfidence}
              onComplete={handleCompareComplete}
            />
          </motion.div>
        )}

        {reviewPhase === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <SourceVerifyPhase
              task={currentTask}
              document={documentContext}
              onComplete={handleVerifyComplete}
            />
          </motion.div>
        )}

        {reviewPhase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center py-6"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="text-2xl mb-2"
              >
                ✓
              </motion.div>
              <div className="text-xs font-mono text-emerald-500">İnceleme gönderildi</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
