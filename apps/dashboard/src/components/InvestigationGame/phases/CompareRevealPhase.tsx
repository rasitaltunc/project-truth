'use client';

/**
 * CompareRevealPhase — Katman 2: Karşılaştır ve Düzelt
 *
 * AI güveni AÇILIR. Kullanıcı kendi kör kararını AI'ınkiyle karşılaştırır.
 * - Uyuşuyorsa → güçlü sinyal
 * - Uyuşmuyorsa → düzeltme fırsatı (corrections)
 * - Fuzzy matching: "yakın ama tam değil" durumları tespit
 *
 * "AI sana katılıyor mu? Yoksa sen mi yanılıyorsun?"
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ArrowRight, AlertTriangle, Check, Edit3, Plus, Trash2 } from 'lucide-react';
import type { InvestigationTask } from '@/store/investigationGameStore';

interface Correction {
  field_name: string;
  original_value: string;
  corrected_value: string;
  correction_reasoning: string;
}

interface CompareRevealPhaseProps {
  task: InvestigationTask;
  blindDecision: 'approve' | 'reject' | 'dispute' | 'skip';
  blindConfidence: number;
  onComplete: (response: {
    decision: 'approve' | 'reject' | 'dispute';
    reasoning: string;
    confidence: number;
    corrections: Correction[];
    found_correct_section: boolean;
  }) => void;
}

// Color for agreement status
function getAgreementColor(agrees: boolean): string {
  return agrees ? '#10b981' : '#ef4444';
}

export default function CompareRevealPhase({
  task,
  blindDecision,
  blindConfidence,
  onComplete,
}: CompareRevealPhaseProps) {
  const { task_data } = task;
  const aiConfidence = task_data.confidence;

  // Does blind decision align with AI?
  const blindApproves = blindDecision === 'approve';
  const aiApproves = aiConfidence >= 0.5;
  const agrees = blindApproves === aiApproves;

  // State
  const [decision, setDecision] = useState<'approve' | 'reject' | 'dispute' | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(blindConfidence);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [foundCorrectSection, setFoundCorrectSection] = useState(false);

  // New correction form
  const [newCorrection, setNewCorrection] = useState<Correction>({
    field_name: '',
    original_value: '',
    corrected_value: '',
    correction_reasoning: '',
  });

  const isReasoningValid = reasoning.trim().length >= 10;
  const canProceed = decision !== null && isReasoningValid;

  const handleAddCorrection = () => {
    if (!newCorrection.field_name || !newCorrection.corrected_value || !newCorrection.correction_reasoning) return;
    if (corrections.length >= 10) return; // max 10 corrections
    setCorrections(prev => [...prev, { ...newCorrection }]);
    setNewCorrection({ field_name: '', original_value: '', corrected_value: '', correction_reasoning: '' });
    setShowCorrectionForm(false);
  };

  const handleRemoveCorrection = (idx: number) => {
    setCorrections(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProceed = () => {
    if (!canProceed || !decision) return;
    onComplete({
      decision,
      reasoning,
      confidence,
      corrections,
      found_correct_section: foundCorrectSection,
    });
  };

  // Confidence diff
  const confDiff = Math.abs(blindConfidence - aiConfidence);
  const isLargeDiff = confDiff > 0.3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3"
    >
      {/* Phase Header */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.15)',
          }}
        >
          <Eye size={10} className="text-blue-500" />
          <span className="text-[9px] font-mono font-bold text-blue-500 tracking-[0.15em] uppercase">
            KATMAN 2 — KARŞILAŞTIR
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Agreement Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="px-3 py-2.5 rounded"
        style={{
          background: agrees ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${agrees ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {agrees ? (
            <Check size={14} style={{ color: '#10b981' }} />
          ) : (
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          )}
          <span className="text-xs font-semibold" style={{ color: getAgreementColor(agrees) }}>
            {agrees ? 'Kararın AI ile UYUŞUYOR' : 'Kararın AI ile UYUŞMUYOR'}
          </span>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-2">
          {/* Your blind assessment */}
          <div
            className="px-2 py-1.5 rounded"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="text-[8px] font-mono text-neutral-600 mb-1 uppercase">Senin Kararın</div>
            <div className="text-[11px] font-semibold" style={{
              color: blindDecision === 'approve' ? '#10b981' : blindDecision === 'reject' ? '#ef4444' : '#f59e0b',
            }}>
              {blindDecision === 'approve' ? 'DOĞRU' : blindDecision === 'reject' ? 'YANLIŞ' : 'TARTIŞMALI'}
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
              Güven: {Math.round(blindConfidence * 100)}%
            </div>
          </div>

          {/* AI assessment — REVEALED */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="px-2 py-1.5 rounded"
            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}
          >
            <div className="text-[8px] font-mono text-neutral-600 mb-1 uppercase">AI Kararı</div>
            <div className="text-[11px] font-semibold" style={{
              color: aiApproves ? '#10b981' : '#ef4444',
            }}>
              {aiApproves ? 'DOĞRU' : 'YANLIŞ'}
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
              Güven: {Math.round(aiConfidence * 100)}%
            </div>
          </motion.div>
        </div>

        {/* Large diff warning */}
        {isLargeDiff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-1.5 mt-2 text-[9px] text-amber-500"
          >
            <AlertTriangle size={10} />
            <span>
              Güven farkı yüksek ({Math.round(confDiff * 100)}%). Düzeltme yapmak ister misin?
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Corrections section */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            DÜZELTMELER <span className="text-neutral-700">(opsiyonel)</span>
          </span>
          {corrections.length < 10 && (
            <button
              onClick={() => setShowCorrectionForm(true)}
              className="flex items-center gap-1 text-[9px] font-mono text-blue-500 hover:text-blue-400 transition-colors"
            >
              <Plus size={9} />
              Düzeltme Ekle
            </button>
          )}
        </div>

        {/* Existing corrections */}
        {corrections.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-2 py-1.5 rounded mb-1"
            style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}
          >
            <Edit3 size={9} className="text-blue-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-mono text-blue-400">{c.field_name}</div>
              <div className="text-[9px] text-neutral-500">
                <span className="line-through text-red-400/60">{c.original_value}</span>
                {' → '}
                <span className="text-emerald-400">{c.corrected_value}</span>
              </div>
            </div>
            <button
              onClick={() => handleRemoveCorrection(i)}
              className="text-neutral-700 hover:text-red-400 p-0.5"
            >
              <Trash2 size={9} />
            </button>
          </div>
        ))}

        {/* New correction form */}
        <AnimatePresence>
          {showCorrectionForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="px-3 py-2 rounded mt-1 flex flex-col gap-1.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <input
                  value={newCorrection.field_name}
                  onChange={(e) => setNewCorrection(p => ({ ...p, field_name: e.target.value }))}
                  placeholder="Alan adı (ör: entity_name, relationship_type)"
                  className="w-full px-2 py-1 rounded text-[10px] text-neutral-200 bg-transparent border border-neutral-800 focus:outline-none focus:border-blue-600 placeholder:text-neutral-700"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={newCorrection.original_value}
                    onChange={(e) => setNewCorrection(p => ({ ...p, original_value: e.target.value }))}
                    placeholder="Orijinal değer"
                    className="px-2 py-1 rounded text-[10px] text-neutral-200 bg-transparent border border-neutral-800 focus:outline-none focus:border-blue-600 placeholder:text-neutral-700"
                  />
                  <input
                    value={newCorrection.corrected_value}
                    onChange={(e) => setNewCorrection(p => ({ ...p, corrected_value: e.target.value }))}
                    placeholder="Doğru değer"
                    className="px-2 py-1 rounded text-[10px] text-neutral-200 bg-transparent border border-neutral-800 focus:outline-none focus:border-blue-600 placeholder:text-neutral-700"
                  />
                </div>
                <input
                  value={newCorrection.correction_reasoning}
                  onChange={(e) => setNewCorrection(p => ({ ...p, correction_reasoning: e.target.value }))}
                  placeholder="Neden düzeltiyorsun?"
                  className="w-full px-2 py-1 rounded text-[10px] text-neutral-200 bg-transparent border border-neutral-800 focus:outline-none focus:border-blue-600 placeholder:text-neutral-700"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setShowCorrectionForm(false)}
                    className="px-2 py-0.5 rounded text-[9px] font-mono text-neutral-500 hover:text-neutral-300"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddCorrection}
                    disabled={!newCorrection.field_name || !newCorrection.corrected_value || !newCorrection.correction_reasoning}
                    className="px-2 py-0.5 rounded text-[9px] font-mono text-blue-500 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(59,130,246,0.1)' }}
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Found correct section (only for normal spotlight — NOT honeypot) */}
      {task.spotlight?.mode === 'normal' && (
        <label className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-white/[0.02] transition-colors">
          <input
            type="checkbox"
            checked={foundCorrectSection}
            onChange={(e) => setFoundCorrectSection(e.target.checked)}
            className="rounded border-neutral-700 bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-0 w-3 h-3"
          />
          <span className="text-[10px] text-neutral-500">
            Doğru bölümü belgede bizzat buldum ve doğruladım
          </span>
        </label>
      )}

      {/* Updated decision (might change after seeing AI) */}
      <div>
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          GÜNCEL KARARIN
        </div>
        <div className="flex gap-2">
          {(['approve', 'reject', 'dispute'] as const).map((d) => {
            const config = {
              approve: { label: 'DOĞRU', color: '#10b981' },
              reject: { label: 'YANLIŞ', color: '#ef4444' },
              dispute: { label: 'TARTIŞMALI', color: '#f59e0b' },
            }[d];

            return (
              <button
                key={d}
                onClick={() => setDecision(d)}
                className="flex-1 py-1.5 rounded text-[10px] font-mono font-semibold tracking-wider transition-all"
                style={{
                  background: decision === d ? `${config.color}18` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${decision === d ? `${config.color}40` : 'rgba(255,255,255,0.06)'}`,
                  color: decision === d ? config.color : 'rgba(255,255,255,0.2)',
                }}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <label className="block text-[9px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
          KARŞILAŞTIRMA NOTU <span className="text-neutral-700">— zorunlu</span>
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="AI'ın kararıyla karşılaştırdın. Neden bu sonuca vardın? Kararını değiştirdin mi?"
          className="w-full rounded text-xs text-neutral-200 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
          style={{
            minHeight: 48,
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${isReasoningValid ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'}`,
          }}
          rows={2}
        />
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            GÜNCEL GÜVENİN
          </label>
          <span className="text-[10px] font-mono font-semibold" style={{
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
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(90deg, #3b82f6 ${confidence * 100}%, rgba(255,255,255,0.06) ${confidence * 100}%)`,
          }}
        />
      </div>

      {/* Proceed button */}
      <motion.button
        whileHover={canProceed ? { scale: 1.01 } : {}}
        whileTap={canProceed ? { scale: 0.98 } : {}}
        onClick={handleProceed}
        disabled={!canProceed}
        className="flex items-center justify-center gap-2 py-2.5 rounded text-xs font-mono font-semibold tracking-wider uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        style={{
          background: canProceed ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${canProceed ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)'}`,
          color: canProceed ? '#3b82f6' : 'rgba(255,255,255,0.15)',
        }}
      >
        KATMAN 3&apos;E İLERLE
        <ArrowRight size={12} />
      </motion.button>
    </motion.div>
  );
}
