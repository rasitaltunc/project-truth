'use client';

/**
 * ErrorReportForm — "Bu Veri Yanlış" Rapor Mekanizması
 *
 * Legal Fortress (Sprint 18) gereksinimi:
 * "Build user error reporting form ('Report false accusation')"
 *
 * Bu bileşen görev kartının altında tek butonla açılır,
 * inline modal olarak dispute API'sine bağlanır.
 *
 * Amaç: Kullanıcının yanlış veri gördüğünde HIZLICA rapor edebilmesi.
 * Dispute sisteminden farkı: Bu basitleştirilmiş versiyon, görev bağlamında çalışır.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Send, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ErrorReportFormProps {
  taskId: string;
  networkId: string;
  fingerprint: string;
  entityName: string;
  /** Called after successful submission */
  onSubmitted?: () => void;
}

const REPORT_TYPES = [
  { value: 'false_positive', label: 'Yanlış pozitif — bu veri doğru değil', labelEn: 'False positive — this data is incorrect' },
  { value: 'accuracy_issue', label: 'Doğruluk sorunu — kısmen doğru ama hatalı', labelEn: 'Accuracy issue — partially correct but flawed' },
  { value: 'bias', label: 'Önyargı — taraflı veya yanıltıcı', labelEn: 'Bias — partial or misleading' },
  { value: 'insufficient_evidence', label: 'Yetersiz kanıt — destekleyen kaynak yok', labelEn: 'Insufficient evidence — no supporting source' },
  { value: 'other', label: 'Diğer', labelEn: 'Other' },
] as const;

export default function ErrorReportForm({
  taskId,
  networkId,
  fingerprint,
  entityName,
  onSubmitted,
}: ErrorReportFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('false_positive');
  const [description, setDescription] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = description.trim().length >= 20;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/game/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network_id: networkId,
          fingerprint,
          target_type: 'task',
          target_id: taskId,
          dispute_type: reportType,
          title: `[Hata Raporu] ${entityName.substring(0, 100)}`,
          description: description.trim(),
          suggested_correction: suggestedCorrection.trim() || null,
          evidence_urls: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Rapor gönderilemedi (${res.status})`);
      }

      setSubmitted(true);
      onSubmitted?.();

      // Auto-close after 3s
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setDescription('');
        setSuggestedCorrection('');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, networkId, fingerprint, taskId, reportType, entityName, description, suggestedCorrection, onSubmitted]);

  return (
    <div className="mt-2">
      {/* Toggle Button */}
      {!isOpen && !submitted && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono text-neutral-600 hover:text-amber-500 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <Flag size={9} />
          BU VERİ YANLIŞ MI? RAPORLA
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-1 px-3 py-3 rounded-lg"
              style={{
                background: 'rgba(239,68,68,0.03)',
                border: '1px solid rgba(239,68,68,0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={10} className="text-red-500" />
                  <span className="text-[9px] font-mono font-bold text-red-500 tracking-[0.15em] uppercase">
                    HATA RAPORU
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-700 hover:text-neutral-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 py-3 justify-center"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-mono text-emerald-500">
                    Raporun kaydedildi. Bağımsız inceleme sürecine alınacak.
                  </span>
                </motion.div>
              ) : (
                <>
                  {/* Report Type */}
                  <div className="mb-2">
                    <label className="block text-[8px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
                      SORUN TÜRÜ
                    </label>
                    <div className="flex flex-col gap-1">
                      {REPORT_TYPES.map((type) => (
                        <label
                          key={type.value}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-white/[0.02] transition-colors"
                        >
                          <input
                            type="radio"
                            name="reportType"
                            value={type.value}
                            checked={reportType === type.value}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-2.5 h-2.5 text-red-500 border-neutral-700 bg-transparent focus:ring-red-500/30"
                          />
                          <span className="text-[9px] text-neutral-500">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-2">
                    <label className="block text-[8px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
                      AÇIKLAMA <span className="text-neutral-700">— zorunlu (min 20 karakter)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Neyin yanlış olduğunu açıkla. Mümkünse kaynak belirt."
                      className="w-full rounded text-xs text-neutral-200 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all"
                      style={{
                        minHeight: 48,
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isValid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
                      }}
                      rows={2}
                    />
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: isValid ? '#10b981' : 'rgba(255,255,255,0.15)' }}
                    >
                      {description.length}/20
                    </span>
                  </div>

                  {/* Suggested Correction (optional) */}
                  <div className="mb-2">
                    <label className="block text-[8px] font-mono text-neutral-600 mb-1 uppercase tracking-wider">
                      ÖNERİLEN DÜZELTME <span className="text-neutral-700">— opsiyonel</span>
                    </label>
                    <input
                      value={suggestedCorrection}
                      onChange={(e) => setSuggestedCorrection(e.target.value)}
                      placeholder="Doğru bilgi ne olmalı?"
                      className="w-full rounded text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all"
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-2 text-[9px] text-red-400 font-mono">{error}</div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-[10px] font-mono font-semibold tracking-wider uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    style={{
                      background: isValid ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isValid ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      color: isValid ? '#ef4444' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border border-red-500 border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Send size={9} />
                        RAPOR GÖNDER
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
