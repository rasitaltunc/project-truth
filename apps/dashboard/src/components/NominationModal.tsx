'use client';
// ============================================
// SPRINT 6A: NOMINATION MODAL
// Platform Kurdu (Tier 2) aday gösterme UI
// ============================================

import React, { useState } from 'react';
import { useBadgeStore } from '@/store/badgeStore';

interface NominationModalProps {
  networkId: string;
  onClose: () => void;
}

export default function NominationModal({ networkId, onClose }: NominationModalProps) {
  const { nominateUser, userFingerprint, initFingerprint, canDoAction, getEffectiveTier } = useBadgeStore();

  const [nomineeFingerprint, setNomineeFingerprint] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fp = userFingerprint || initFingerprint();
  const tier = getEffectiveTier(networkId);
  const canNominate = canDoAction('nominate', networkId);

  const handleSubmit = async () => {
    if (!nomineeFingerprint.trim() || reason.length < 50) return;
    setIsSubmitting(true);
    const result = await nominateUser(nomineeFingerprint.trim(), networkId, reason);
    setStatus(result);
    setIsSubmitting(false);
  };

  if (!canNominate) {
    return (
      <div
        className="rounded-xl border p-6 font-mono text-center"
        style={{ borderColor: '#333', backgroundColor: '#0a0a0a', maxWidth: '380px' }}
      >
        <div className="text-3xl mb-3">🔒</div>
        <h3 className="text-sm font-bold text-white mb-2">Aday Gösterme Kilitli</h3>
        <p className="text-xs text-gray-500">
          Aday göstermek için en az{' '}
          <span className="text-yellow-400">🐺 Platform Kurdu</span> rozetine ihtiyacın var.
          Mevcut rozetin: <span style={{ color: tier.color }}>{tier.icon} {tier.name_tr}</span>
        </p>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-gray-600 hover:text-white transition-colors"
        >
          Kapat
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5 font-mono"
      style={{ borderColor: '#f59e0b44', backgroundColor: '#0a0a0a', maxWidth: '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">🐺 Aday Göster</h3>
          <p className="text-xs text-gray-500 mt-0.5">Platform Kurdu rozetine aday öner</p>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white text-xs transition-colors">
          ✕
        </button>
      </div>

      {status ? (
        <div
          className={`p-3 rounded border text-xs text-center ${
            status.success
              ? 'border-green-600 bg-green-900/20 text-green-400'
              : 'border-red-600 bg-red-900/20 text-red-400'
          }`}
        >
          {status.message}
          {status.success && (
            <button
              onClick={onClose}
              className="block mx-auto mt-3 text-gray-500 hover:text-white text-[10px] transition-colors"
            >
              Kapat
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nominee fingerprint */}
          <div>
            <label className="block text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">
              Aday Fingerprint*
            </label>
            <input
              type="text"
              value={nomineeFingerprint}
              onChange={(e) => setNomineeFingerprint(e.target.value)}
              placeholder="fp_abc123..."
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-600 placeholder-gray-700"
            />
            <p className="text-[10px] text-gray-700 mt-1">
              Adayın fingerprint'ini profil sayfasından alabilirsiniz.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">
              Aday Gösterme Sebebi* (min 50 karakter)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bu kişiyi neden Platform Kurdu rozetine layık görüyorsunuz? Katkılarını, doğruluk oranını ve topluluk içindeki değerini açıklayın..."
              rows={4}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-600 resize-none placeholder-gray-700"
            />
            <div
              className={`text-right text-[10px] mt-0.5 ${reason.length >= 50 ? 'text-green-600' : 'text-gray-600'}`}
            >
              {reason.length}/50
            </div>
          </div>

          {/* Aday gösterende bilgisi */}
          <div
            className="p-2.5 rounded border text-[10px] text-gray-600"
            style={{ borderColor: '#333' }}
          >
            <p className="font-bold text-gray-500 mb-1">Kurallar</p>
            <ul className="space-y-0.5">
              <li>• Kendinizi aday gösteremezsiniz</li>
              <li>• Her kullanıcıya yalnızca bir kez aday gösterebilirsiniz</li>
              <li>• Sahte aday gösterme reputation kaybına yol açar</li>
              <li>• 3+ aday gösterilince otomatik yükseltme tetiklenir</li>
            </ul>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !nomineeFingerprint.trim() ||
              reason.length < 50 ||
              nomineeFingerprint === fp
            }
            className="w-full py-2 px-4 rounded border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: '#f59e0b',
              color: '#f59e0b',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                (e.target as HTMLElement).style.backgroundColor = '#f59e0b11';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {isSubmitting ? 'Gönderiliyor...' : '🐺 Aday Göster'}
          </button>
        </div>
      )}
    </div>
  );
}
