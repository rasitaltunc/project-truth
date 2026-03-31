'use client';

// ═══════════════════════════════════════════
// PROPOSE LINK MODAL — Sprint 10
// Bağlantı önerisi formu
// İlişki türü + açıklama + kanıt + itibar stake
// Federal Indictment aesthetic
// ═══════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Link2, AlertTriangle, Send, Shield, ExternalLink } from 'lucide-react';
import { useThreadingStore, RELATIONSHIP_TYPES } from '@/store/threadingStore';

interface ProposeLinkModalProps {
  fingerprint: string;
  badgeTier?: string;
  reputation?: number;
  sourceLabel?: string;
  targetLabel?: string;
  networkId?: string;
  onClose: () => void;
}

export default function ProposeLinkModal({
  fingerprint,
  badgeTier = 'community',
  reputation = 100,
  sourceLabel,
  targetLabel,
  networkId,
  onClose,
}: ProposeLinkModalProps) {
  const {
    sourceNodeId,
    targetNodeId,
    proposeLink,
    proposalSubmitting,
    error,
    clearError,
  } = useThreadingStore();

  const [relationshipType, setRelationshipType] = useState('financial');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [stakePercent, setStakePercent] = useState(2);

  const stakeAmount = Math.round(reputation * (stakePercent / 100));
  const isValid = description.length >= 10 && description.length <= 500;

  const handleSubmit = useCallback(async () => {
    if (!sourceNodeId || !targetNodeId || !isValid) return;

    clearError();
    const result = await proposeLink({
      networkId,
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      relationshipType,
      description,
      fingerprint,
      badgeTier,
      reputationStaked: stakeAmount,
      initialEvidenceUrl: evidenceUrl || undefined,
      initialEvidenceDescription: evidenceDescription || undefined,
    });

    if (result) {
      onClose();
    }
  }, [
    sourceNodeId, targetNodeId, isValid, networkId, relationshipType,
    description, fingerprint, badgeTier, stakeAmount, evidenceUrl,
    evidenceDescription, proposeLink, clearError, onClose,
  ]);

  return (
    <AnimatePresence>
      <motion.div
        key="propose-link-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '440px',
            maxHeight: '85vh',
            backgroundColor: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '8px',
            overflow: 'auto',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link2 size={14} style={{ color: '#dc2626' }} />
              <span style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#dc2626',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
              }}>
                PROPOSE CONNECTION
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#555',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Connection Visual ── */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            borderBottom: '1px solid #111',
          }}>
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#dc262612',
              border: '1px solid #dc262630',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#e5e5e5',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}>
              {sourceLabel || sourceNodeId?.slice(0, 8)}
            </div>
            <ArrowLeftRight size={16} style={{ color: '#dc2626' }} />
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#dc262612',
              border: '1px solid #dc262630',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#e5e5e5',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}>
              {targetLabel || targetNodeId?.slice(0, 8)}
            </div>
          </div>

          {/* ── Form ── */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Relationship Type */}
            <div>
              <label style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                color: '#888',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                İLİŞKİ TÜRÜ
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#111',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  color: '#e5e5e5',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              >
                {RELATIONSHIP_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label} — {rt.labelTr}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                color: '#888',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                AÇIKLAMA
                <span style={{ color: '#444', marginLeft: '8px', letterSpacing: '0' }}>
                  ({description.length}/500)
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu iki kisi/kurum arasindaki iliskiyi aciklayin..."
                maxLength={500}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#111',
                  border: `1px solid ${description.length > 0 && description.length < 10 ? '#dc262660' : '#222'}`,
                  borderRadius: '4px',
                  color: '#e5e5e5',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              {description.length > 0 && description.length < 10 && (
                <div style={{ fontSize: '9px', color: '#dc2626', marginTop: '4px', fontFamily: 'monospace' }}>
                  En az 10 karakter gerekli
                </div>
              )}
            </div>

            {/* Evidence URL (optional) */}
            <div>
              <label style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                color: '#888',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                EVIDENCE URL <span style={{ color: '#444' }}>(OPTIONAL)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ExternalLink size={12} style={{ color: '#444', flexShrink: 0 }} />
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    color: '#e5e5e5',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
              {evidenceUrl && (
                <textarea
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  placeholder="Kanitin aciklamasi..."
                  rows={2}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#111',
                    border: '1px solid #222',
                    borderRadius: '4px',
                    color: '#e5e5e5',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              )}
            </div>

            {/* Reputation Stake */}
            <div>
              <label style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                color: '#888',
                fontFamily: 'monospace',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                İTİBAR STAKE
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={stakePercent}
                  onChange={(e) => setStakePercent(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#dc2626',
                  }}
                />
                <span style={{
                  fontSize: '11px',
                  color: '#e5e5e5',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  minWidth: '40px',
                  textAlign: 'right',
                }}>
                  %{stakePercent}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                padding: '6px 10px',
                backgroundColor: '#f59e0b10',
                border: '1px solid #f59e0b20',
                borderRadius: '3px',
              }}>
                <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                <span style={{
                  fontSize: '9px',
                  color: '#f59e0b',
                  fontFamily: 'monospace',
                }}>
                  Bu ipucu {stakeAmount} itibar puanina mal olacak
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#dc262612',
                border: '1px solid #dc262630',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#dc2626',
                fontFamily: 'monospace',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <motion.button
              whileHover={isValid ? { scale: 1.02 } : {}}
              whileTap={isValid ? { scale: 0.98 } : {}}
              onClick={handleSubmit}
              disabled={!isValid || proposalSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isValid ? '#dc262618' : '#111',
                border: `1px solid ${isValid ? '#dc262660' : '#222'}`,
                borderRadius: '4px',
                color: isValid ? '#dc2626' : '#444',
                fontSize: '11px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
                letterSpacing: '0.15em',
                cursor: isValid ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: proposalSubmitting ? 0.5 : 1,
              }}
            >
              {proposalSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Shield size={14} />
                  </motion.div>
                  GÖNDERİLİYOR...
                </>
              ) : (
                <>
                  <Send size={14} />
                  BAĞLANTI ÖNER
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
