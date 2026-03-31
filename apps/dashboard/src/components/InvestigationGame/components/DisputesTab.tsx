'use client';

/**
 * DisputesTab — İtiraz Listesi + Yeni İtiraz
 *
 * Game Bible Bölüm 8: "Herkes, her şeye, kolayca itiraz edebilmeli"
 *
 * İki mod:
 * 1. Liste modu: Mevcut itirazları göster (açık/çözülmüş/reddedilmiş)
 * 2. Yeni itiraz modu: Yeni itiraz formu (görev dışı genel itirazlar)
 *
 * Görev-içi hata raporları ErrorReportForm ile yapılır.
 * Bu bileşen genel itirazlar içindir (veri, platform, konsensüs).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Plus, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, MessageSquare,
  ExternalLink, Send,
} from 'lucide-react';

interface Dispute {
  id: string;
  title: string;
  description?: string;
  dispute_type: string;
  target_type: string;
  status: string;
  created_at: string;
  trace_id: string;
}

interface DisputesTabProps {
  networkId: string;
  fingerprint: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  open: { color: '#f59e0b', icon: <Clock size={9} />, label: 'AÇIK' },
  under_review: { color: '#3b82f6', icon: <MessageSquare size={9} />, label: 'İNCELENİYOR' },
  resolved: { color: '#10b981', icon: <CheckCircle2 size={9} />, label: 'ÇÖZÜLDÜ' },
  rejected: { color: '#ef4444', icon: <XCircle size={9} />, label: 'REDDEDİLDİ' },
  escalated: { color: '#8b5cf6', icon: <AlertCircle size={9} />, label: 'ESKALEDİLDİ' },
};

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  false_positive: 'Yanlış Pozitif',
  false_negative: 'Yanlış Negatif',
  accuracy_issue: 'Doğruluk Sorunu',
  bias: 'Önyargı',
  insufficient_evidence: 'Yetersiz Kanıt',
  other: 'Diğer',
};

export default function DisputesTab({ networkId, fingerprint }: DisputesTabProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        network_id: networkId,
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/game/disputes?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      setDisputes(data.disputes || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [networkId, statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertCircle size={11} className="text-amber-500" />
          <span className="text-[10px] font-mono font-bold text-neutral-300 tracking-wider uppercase">
            İTİRAZLAR
          </span>
          <span className="text-[9px] font-mono text-neutral-600">({totalCount})</span>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono text-amber-500 hover:text-amber-400 transition-colors"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.12)',
          }}
        >
          <Plus size={9} />
          YENİ İTİRAZ
        </button>
      </div>

      {/* New Dispute Form */}
      <AnimatePresence>
        {showNewForm && (
          <NewDisputeForm
            networkId={networkId}
            fingerprint={fingerprint}
            onSubmitted={() => {
              setShowNewForm(false);
              fetchDisputes();
            }}
            onCancel={() => setShowNewForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Status Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {['', 'open', 'under_review', 'resolved', 'rejected'].map((s) => {
          const isActive = statusFilter === s;
          const label = s === '' ? 'Tümü' : (STATUS_CONFIG[s]?.label || s);
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider transition-all"
              style={{
                background: isActive ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`,
                color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.3)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"
          />
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-[10px] text-neutral-600 font-mono">
            {statusFilter ? 'Bu filtreyle eşleşen itiraz yok' : 'Henüz itiraz yok'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {disputes.map((dispute, i) => {
            const status = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
            const isExpanded = expandedId === dispute.id;

            return (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                  className="w-full text-left px-3 py-2 rounded transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isExpanded ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-neutral-300 truncate">
                        {dispute.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="flex items-center gap-0.5 text-[8px] font-mono"
                          style={{ color: status.color }}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                        <span className="text-[8px] font-mono text-neutral-700">
                          {DISPUTE_TYPE_LABELS[dispute.dispute_type] || dispute.dispute_type}
                        </span>
                        <span className="text-[8px] font-mono text-neutral-800">
                          {new Date(dispute.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={10} className="text-neutral-700 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown size={10} className="text-neutral-700 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && dispute.description && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-3 py-2 text-[9px] text-neutral-500 leading-relaxed"
                        style={{
                          background: 'rgba(255,255,255,0.01)',
                          borderLeft: `2px solid ${status.color}30`,
                          marginTop: 2,
                        }}
                      >
                        {dispute.description}
                        <div className="flex items-center gap-1 mt-1.5 text-[8px] text-neutral-700 font-mono">
                          <ExternalLink size={8} />
                          trace: {dispute.trace_id?.substring(0, 12)}...
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── New Dispute Form ───────────────────────────────────────────────

interface NewDisputeFormProps {
  networkId: string;
  fingerprint: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

function NewDisputeForm({ networkId, fingerprint, onSubmitted, onCancel }: NewDisputeFormProps) {
  const [targetType, setTargetType] = useState('entity');
  const [targetId, setTargetId] = useState('');
  const [disputeType, setDisputeType] = useState('accuracy_issue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    title.trim().length >= 5 &&
    description.trim().length >= 20 &&
    targetId.trim().length > 0;

  const handleSubmit = async () => {
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
          target_type: targetType,
          target_id: targetId.trim(),
          dispute_type: disputeType,
          title: title.trim(),
          description: description.trim(),
          suggested_correction: suggestedCorrection.trim() || null,
          evidence_urls: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Gönderim başarısız (${res.status})`);
      }

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className="px-3 py-3 rounded-lg flex flex-col gap-2"
        style={{
          background: 'rgba(245,158,11,0.03)',
          border: '1px solid rgba(245,158,11,0.1)',
        }}
      >
        <div className="text-[9px] font-mono font-bold text-amber-500 tracking-wider uppercase">
          YENİ İTİRAZ
        </div>

        {/* Target Type */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            HEDEF TÜRÜ
          </label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full rounded text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '4px 6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <option value="entity">Varlık (Entity)</option>
            <option value="relationship">İlişki (Relationship)</option>
            <option value="link">Bağlantı (Link)</option>
            <option value="consensus">Konsensüs Kararı</option>
            <option value="quarantine_item">Karantina Verisi</option>
          </select>
        </div>

        {/* Target ID */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            HEDEF ID <span className="text-neutral-700">— zorunlu</span>
          </label>
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="Entity veya ilişki ID'si"
            className="w-full rounded text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '4px 6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Dispute Type */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            İTİRAZ TÜRÜ
          </label>
          <select
            value={disputeType}
            onChange={(e) => setDisputeType(e.target.value)}
            className="w-full rounded text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '4px 6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <option value="false_positive">Yanlış pozitif</option>
            <option value="false_negative">Yanlış negatif</option>
            <option value="accuracy_issue">Doğruluk sorunu</option>
            <option value="bias">Önyargı</option>
            <option value="insufficient_evidence">Yetersiz kanıt</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            BAŞLIK <span className="text-neutral-700">— zorunlu (5-200 karakter)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="İtirazın kısa başlığı"
            maxLength={200}
            className="w-full rounded text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '4px 6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            AÇIKLAMA <span className="text-neutral-700">— zorunlu (min 20 karakter)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Neyin yanlış olduğunu detaylıca açıkla"
            rows={3}
            className="w-full rounded text-xs text-neutral-200 resize-none placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Suggested Correction */}
        <div>
          <label className="block text-[8px] font-mono text-neutral-600 mb-0.5 uppercase tracking-wider">
            ÖNERİLEN DÜZELTME <span className="text-neutral-700">— opsiyonel</span>
          </label>
          <input
            value={suggestedCorrection}
            onChange={(e) => setSuggestedCorrection(e.target.value)}
            placeholder="Doğru bilgi ne olmalı?"
            className="w-full rounded text-xs text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{
              padding: '4px 6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-[9px] text-red-400 font-mono">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 rounded text-[9px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            İPTAL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              background: isValid ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isValid ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`,
              color: isValid ? '#f59e0b' : 'rgba(255,255,255,0.15)',
            }}
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Send size={9} />
                GÖNDER
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
