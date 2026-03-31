'use client';

/**
 * SourceVerifyPhase — Katman 3: Kaynak Doğrulama
 *
 * Halüsinasyon Avcısı: Kullanıcı AI'ın iddia ettiği kaynağı bizzat kontrol eder.
 * - source_sentence belgede var mı?
 * - Kaynak URL geçerli mi?
 * - Entity gerçekten bu belgede geçiyor mu?
 *
 * Bu katman, "AI kaynak gösteremezse bilmiyorum diyecek" anayasa
 * ilkesinin uygulamasıdır.
 *
 * Truth Anayasası Madde 3: "AI kaynak gösteremezse 'bilmiyorum' diyecek."
 * Truth Anayasası Madde 8: "Yanlış veri, eksik veriden her zaman daha tehlikelidir."
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, AlertTriangle, CheckCircle2, XCircle,
  ExternalLink, FileSearch, Fingerprint, Flag, MessageSquare,
} from 'lucide-react';
import type { InvestigationTask, DocumentContext } from '@/store/investigationGameStore';

interface SourceVerifyPhaseProps {
  task: InvestigationTask;
  document: DocumentContext | null;
  onComplete: (response: {
    decision: 'approve' | 'reject' | 'dispute';
    reasoning: string;
    confidence: number;
    source_found: boolean;
    hallucination_flags: string[];
  }) => void;
}

// Hallucination check flags
const HALLUCINATION_FLAGS = [
  { id: 'entity_not_found', label: 'Entity belgede bulunamadı', icon: XCircle, severity: 'critical' },
  { id: 'sentence_not_found', label: 'Kaynak cümle belgede yok', icon: XCircle, severity: 'critical' },
  { id: 'context_mismatch', label: 'Bağlam uyuşmuyor (farklı anlam)', icon: AlertTriangle, severity: 'high' },
  { id: 'date_mismatch', label: 'Tarih bilgisi yanlış', icon: AlertTriangle, severity: 'high' },
  { id: 'relationship_invented', label: 'İlişki uydurulmuş (belgede yok)', icon: XCircle, severity: 'critical' },
  { id: 'partial_truth', label: 'Kısmen doğru ama eksik/yanıltıcı', icon: AlertTriangle, severity: 'medium' },
  { id: 'source_unreachable', label: 'Kaynak URL erişilemiyor', icon: AlertTriangle, severity: 'medium' },
  { id: 'ocr_error', label: 'OCR hatası (yanlış okumuş olabilir)', icon: AlertTriangle, severity: 'low' },
] as const;

export default function SourceVerifyPhase({
  task,
  document,
  onComplete,
}: SourceVerifyPhaseProps) {
  const { task_data } = task;

  const [decision, setDecision] = useState<'approve' | 'reject' | 'dispute' | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(0.5);
  const [sourceFound, setSourceFound] = useState<boolean | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const isReasoningValid = reasoning.trim().length >= 10;
  const canProceed = decision !== null && isReasoningValid && sourceFound !== null;

  // Source verification checklist
  const hasSourceSentence = !!task_data.source_sentence;
  const hasSourceUrl = !!document?.source_url;
  const hasTextContent = !!(document?.text_content && document.text_content.length > 50);

  // Quick search: does the entity name appear in document text?
  const entityInText = useMemo(() => {
    if (!document?.text_content || !task_data.entity_name) return false;
    const text = document.text_content.toLowerCase();
    const entity = task_data.entity_name.toLowerCase();
    return text.includes(entity);
  }, [document?.text_content, task_data.entity_name]);

  const toggleFlag = (flagId: string) => {
    setSelectedFlags(prev => {
      const next = new Set(prev);
      if (next.has(flagId)) {
        next.delete(flagId);
      } else {
        next.add(flagId);
      }
      return next;
    });
  };

  const handleProceed = () => {
    if (!canProceed || !decision || sourceFound === null) return;
    onComplete({
      decision,
      reasoning,
      confidence,
      source_found: sourceFound,
      hallucination_flags: Array.from(selectedFlags),
    });
  };

  const hasCriticalFlags = Array.from(selectedFlags).some(
    f => HALLUCINATION_FLAGS.find(hf => hf.id === f)?.severity === 'critical'
  );

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
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}
        >
          <Search size={10} className="text-emerald-500" />
          <span className="text-[9px] font-mono font-bold text-emerald-500 tracking-[0.15em] uppercase">
            KATMAN 3 — KAYNAK DOĞRULAMA
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Source verification checklist */}
      <div
        className="px-3 py-2.5 rounded"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-2">
          KAYNAK KONTROL LİSTESİ
        </div>

        {/* Auto-checks */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {entityInText ? (
              <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle size={11} className="text-red-500 flex-shrink-0" />
            )}
            <span className="text-[10px] text-neutral-400">
              &quot;{task_data.entity_name}&quot; belgede {entityInText ? 'bulundu' : 'BULUNAMADI'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasSourceSentence ? (
              <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle size={11} className="text-neutral-600 flex-shrink-0" />
            )}
            <span className="text-[10px] text-neutral-400">
              Kaynak cümlesi {hasSourceSentence ? 'mevcut' : 'yok'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasSourceUrl ? (
              <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle size={11} className="text-neutral-600 flex-shrink-0" />
            )}
            <span className="text-[10px] text-neutral-400">
              Kaynak URL {hasSourceUrl ? 'mevcut' : 'yok'}
            </span>
            {hasSourceUrl && (
              <a
                href={document!.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400"
              >
                <ExternalLink size={9} />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasTextContent ? (
              <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle size={11} className="text-neutral-600 flex-shrink-0" />
            )}
            <span className="text-[10px] text-neutral-400">
              OCR metin {hasTextContent ? 'mevcut' : 'yok'}
            </span>
          </div>
        </div>
      </div>

      {/* Source found? — explicit human verification */}
      <div>
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          KAYNAĞI DOĞRULADINIZ MI?
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSourceFound(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-mono font-semibold transition-all"
            style={{
              background: sourceFound === true ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${sourceFound === true ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: sourceFound === true ? '#10b981' : 'rgba(255,255,255,0.2)',
            }}
          >
            <CheckCircle2 size={11} />
            EVET — Kaynak doğru
          </button>
          <button
            onClick={() => setSourceFound(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-mono font-semibold transition-all"
            style={{
              background: sourceFound === false ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${sourceFound === false ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: sourceFound === false ? '#ef4444' : 'rgba(255,255,255,0.2)',
            }}
          >
            <XCircle size={11} />
            HAYIR — Sorunlu
          </button>
        </div>
      </div>

      {/* Hallucination flags (shown when source is problematic) */}
      {sourceFound === false && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
            SORUN TESPİTİ <span className="text-red-500">(en az 1 seç)</span>
          </div>
          <div className="flex flex-col gap-1">
            {HALLUCINATION_FLAGS.map((flag) => {
              const Icon = flag.icon;
              const isSelected = selectedFlags.has(flag.id);
              const severityColor =
                flag.severity === 'critical' ? '#ef4444'
                  : flag.severity === 'high' ? '#f59e0b'
                    : flag.severity === 'medium' ? '#3b82f6'
                      : '#6b7280';

              return (
                <button
                  key={flag.id}
                  onClick={() => toggleFlag(flag.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all"
                  style={{
                    background: isSelected ? `${severityColor}0a` : 'transparent',
                    border: `1px solid ${isSelected ? `${severityColor}25` : 'rgba(255,255,255,0.03)'}`,
                  }}
                >
                  <Icon
                    size={10}
                    style={{ color: isSelected ? severityColor : 'rgba(255,255,255,0.15)' }}
                    className="flex-shrink-0"
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: isSelected ? severityColor : 'rgba(255,255,255,0.3)' }}
                  >
                    {flag.label}
                  </span>
                  <span
                    className="text-[7px] font-mono uppercase ml-auto"
                    style={{ color: isSelected ? severityColor : 'rgba(255,255,255,0.1)' }}
                  >
                    {flag.severity}
                  </span>
                </button>
              );
            })}
          </div>

          {hasCriticalFlags && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}
            >
              <Fingerprint size={10} className="text-red-500" />
              <span className="text-[9px] text-red-400">
                Kritik halüsinasyon tespit edildi. Bu veri DOĞRULANMADAN ağa giremez.
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Final decision */}
      <div>
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          NİHAİ KARAR
        </div>
        <div className="flex gap-2">
          {(['approve', 'reject', 'dispute'] as const).map((d) => {
            const config = {
              approve: { label: 'DOĞRULA', color: '#10b981' },
              reject: { label: 'REDDET', color: '#ef4444' },
              dispute: { label: 'İTİRAZ', color: '#f59e0b' },
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

      {/* Final reasoning */}
      <div>
        <label className="block text-[9px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
          NİHAİ GEREKÇE <span className="text-neutral-700">— zorunlu</span>
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Kaynağı doğruladın mı? Ne buldun? Halüsinasyon var mı?"
          className="w-full rounded text-xs text-neutral-200 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
          style={{
            minHeight: 48,
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${isReasoningValid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
          }}
          rows={2}
        />
      </div>

      {/* Final confidence */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            NİHAİ GÜVENİN
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
            background: `linear-gradient(90deg, #10b981 ${confidence * 100}%, rgba(255,255,255,0.06) ${confidence * 100}%)`,
          }}
        />
      </div>

      {/* Feedback button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center gap-1 text-[9px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          <Flag size={9} />
          Görev Sorunlu
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center gap-1 text-[9px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          <MessageSquare size={9} />
          Geri Bildirim
        </button>
      </div>

      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Bu görevle ilgili sorun veya öneriniz..."
            className="w-full rounded text-[10px] text-neutral-300 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            style={{
              minHeight: 40,
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
            rows={2}
          />
        </motion.div>
      )}

      {/* Submit button */}
      <motion.button
        whileHover={canProceed ? { scale: 1.01 } : {}}
        whileTap={canProceed ? { scale: 0.98 } : {}}
        onClick={handleProceed}
        disabled={!canProceed}
        className="flex items-center justify-center gap-2 py-2.5 rounded text-xs font-mono font-semibold tracking-wider uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        style={{
          background: canProceed ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${canProceed ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
          color: canProceed ? '#10b981' : 'rgba(255,255,255,0.15)',
        }}
      >
        İNCELEMEYİ TAMAMLA
        <CheckCircle2 size={12} />
      </motion.button>
    </motion.div>
  );
}
