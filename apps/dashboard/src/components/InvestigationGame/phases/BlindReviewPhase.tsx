'use client';

/**
 * BlindReviewPhase — Katman 1: Kör İnceleme
 *
 * Anti-Bias Core: Kullanıcı AI'ın ne düşündüğünü BİLMEDEN kendi kararını verir.
 * - AI güven skoru GİZLİ
 * - Önceki incelemeler GİZLİ
 * - Composite confidence GİZLİ
 * - Sadece belge + entity bilgisi + source_sentence görünür
 *
 * "Kendi gözlerinle gör, sonra AI'ın gözleriyle karşılaştır."
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Shield, ArrowRight, FileSearch } from 'lucide-react';
import type { InvestigationTask } from '@/store/investigationGameStore';

interface BlindReviewPhaseProps {
  task: InvestigationTask;
  onComplete: (response: {
    decision: 'approve' | 'reject' | 'dispute' | 'skip';
    reasoning: string;
    confidence: number;
    rejected_spotlight: boolean;
  }) => void;
}

export default function BlindReviewPhase({ task, onComplete }: BlindReviewPhaseProps) {
  const [decision, setDecision] = useState<'approve' | 'reject' | 'dispute' | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(0.5);
  const [rejectedSpotlight, setRejectedSpotlight] = useState(false);

  const { task_data } = task;
  const isReasoningValid = reasoning.trim().length >= 10;
  const canProceed = decision !== null && isReasoningValid;

  const handleProceed = () => {
    if (!canProceed || !decision) return;
    onComplete({
      decision,
      reasoning,
      confidence,
      rejected_spotlight: rejectedSpotlight,
    });
  };

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
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <EyeOff size={10} className="text-amber-500" />
          <span className="text-[9px] font-mono font-bold text-amber-500 tracking-[0.15em] uppercase">
            KATMAN 1 — KÖR İNCELEME
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Blind instruction */}
      <div
        className="flex items-start gap-2 px-3 py-2 rounded"
        style={{
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.08)',
        }}
      >
        <Shield size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <span className="text-[10px] text-neutral-400 leading-relaxed">
          AI güveni ve önceki incelemeler <strong className="text-amber-500">gizli</strong>.
          Belgeyi incele, kendi kararını ver. Sonraki katmanda AI ile karşılaştırma yapacaksın.
        </span>
      </div>

      {/* Entity summary */}
      <div
        className="px-3 py-2.5 rounded"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
          HEDEF
        </div>
        <div className="text-sm font-medium text-neutral-200">
          {task_data.entity_name && task_data.entity_name !== 'Unknown'
            ? task_data.entity_name
            : task_data.source_entity
              ? `${task_data.source_entity} → ${task_data.relationship_type || 'bağlantı'} → ${task_data.target_entity || '?'}`
              : 'İsimsiz Varlık'}
        </div>
        <div className="text-[9px] font-mono text-neutral-600 mt-0.5">
          {task_data.entity_type || task_data.item_type || 'unknown'}
          {task_data.relationship_type && (
            <span className="text-purple-500 ml-1">
              → {task_data.relationship_type} → {task_data.target_entity}
            </span>
          )}
        </div>
      </div>

      {/* Source sentence */}
      {task_data.source_sentence && (
        <div
          className="px-3 py-2 rounded text-[10px] italic leading-relaxed"
          style={{
            background: 'rgba(245,158,11,0.03)',
            border: '1px solid rgba(245,158,11,0.08)',
            borderLeft: '2px solid rgba(245,158,11,0.3)',
            color: '#a3a3a3',
          }}
        >
          <div className="flex items-center gap-1 mb-1 not-italic">
            <FileSearch size={9} className="text-amber-600" />
            <span className="text-[8px] font-mono text-amber-600 uppercase">Kaynak Alıntı</span>
          </div>
          &ldquo;{task_data.source_sentence.substring(0, 250)}
          {(task_data.source_sentence.length || 0) > 250 ? '...' : ''}&rdquo;
          {task_data.source_page && (
            <span className="text-[8px] text-neutral-600 ml-1 not-italic">(s. {task_data.source_page})</span>
          )}
        </div>
      )}

      {/* Spotlight rejection (if spotlight is active) */}
      {task.spotlight?.mode === 'normal' && (
        <label className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-white/[0.02] transition-colors">
          <input
            type="checkbox"
            checked={rejectedSpotlight}
            onChange={(e) => setRejectedSpotlight(e.target.checked)}
            className="rounded border-neutral-700 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0 w-3 h-3"
          />
          <span className="text-[10px] text-neutral-500">
            Spotlight yanlış yeri gösteriyor — ilgili bölüm burada değil
          </span>
        </label>
      )}

      {/* Decision buttons */}
      <div className="flex gap-2">
        {(['approve', 'reject', 'dispute'] as const).map((d) => {
          const config = {
            approve: { label: 'DOĞRU', color: '#10b981', icon: '✓' },
            reject: { label: 'YANLIŞ', color: '#ef4444', icon: '✗' },
            dispute: { label: 'TARTIŞMALI', color: '#f59e0b', icon: '?' },
          }[d];

          return (
            <button
              key={d}
              onClick={() => setDecision(d)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-mono font-semibold tracking-wider uppercase transition-all"
              style={{
                background: decision === d ? `${config.color}18` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${decision === d ? `${config.color}40` : 'rgba(255,255,255,0.06)'}`,
                color: decision === d ? config.color : 'rgba(255,255,255,0.25)',
              }}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Reasoning */}
      <div>
        <label className="block text-[9px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
          GEREKÇE <span className="text-neutral-700">— zorunlu (min 10 karakter)</span>
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Bu veriyi neden doğru/yanlış buluyorsun? Belgede ne gördün?"
          className="w-full rounded text-xs text-neutral-200 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
          style={{
            minHeight: 56,
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${isReasoningValid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
          }}
          rows={2}
        />
        <span className="text-[8px] font-mono" style={{ color: isReasoningValid ? '#10b981' : 'rgba(255,255,255,0.15)' }}>
          {reasoning.length}/10
        </span>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            SENİN GÜVENİN
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
            background: `linear-gradient(90deg, #f59e0b ${confidence * 100}%, rgba(255,255,255,0.06) ${confidence * 100}%)`,
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
          background: canProceed ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${canProceed ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`,
          color: canProceed ? '#f59e0b' : 'rgba(255,255,255,0.15)',
        }}
      >
        KATMAN 2&apos;YE İLERLE
        <ArrowRight size={12} />
      </motion.button>
    </motion.div>
  );
}
