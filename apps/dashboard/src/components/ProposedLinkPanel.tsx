'use client';

// ═══════════════════════════════════════════
// PROPOSED LINK PANEL — Sprint 10
// Hayalet link detay + kanıt + oylama paneli
// Sağ floating panel, 3 tab
// Federal Indictment aesthetic
// ═══════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, Unlock, ThumbsUp, ThumbsDown,
  FileText, Plus, ExternalLink, User, Clock,
  ArrowLeftRight, Shield, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useThreadingStore, RELATIONSHIP_TYPES, EVIDENCE_TYPES, ProposedEvidence } from '@/store/threadingStore';

type TabType = 'detail' | 'evidence' | 'voting';

interface ProposedLinkPanelProps {
  fingerprint: string;
  badgeTier?: string;
  onClose: () => void;
  getNodeLabel?: (id: string) => string;
}

export default function ProposedLinkPanel({
  fingerprint,
  badgeTier = 'community',
  onClose,
  getNodeLabel,
}: ProposedLinkPanelProps) {
  const {
    selectedGhostLink: link,
    selectedGhostEvidence: evidence,
    selectedGhostVotes: votes,
    addEvidence,
    voteOnLink,
    error,
    clearError,
  } = useThreadingStore();

  const [activeTab, setActiveTab] = useState<TabType>('detail');
  const [showAddEvidence, setShowAddEvidence] = useState(false);

  // Evidence form state
  const [evType, setEvType] = useState('document');
  const [evConfidence, setEvConfidence] = useState(0.5);
  const [evUrl, setEvUrl] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!link) return null;

  const progress = link.evidenceCount / link.evidenceThreshold;
  const progressPercent = Math.min(progress * 100, 100);
  const isLocked = link.status === 'pending_evidence' || link.status === 'pending_vote';
  const isAccepted = link.status === 'accepted';

  const relType = RELATIONSHIP_TYPES.find(r => r.value === link.relationshipType);
  const sourceName = getNodeLabel?.(link.sourceId) || link.sourceId.slice(0, 10);
  const targetName = getNodeLabel?.(link.targetId) || link.targetId.slice(0, 10);

  const upRatio = link.totalVotes > 0 ? (link.communityUpvotes / link.totalVotes * 100).toFixed(0) : '0';
  const downRatio = link.totalVotes > 0 ? (link.communityDownvotes / link.totalVotes * 100).toFixed(0) : '0';

  const hasVoted = votes.some(v => v.voterFingerprint === fingerprint);
  const hasAddedEvidence = evidence.some(e => e.contributorFingerprint === fingerprint);

  const handleAddEvidence = useCallback(async () => {
    if (!evDesc || evDesc.length < 5) return;
    setSubmitting(true);
    clearError();
    const ok = await addEvidence(link.id, {
      fingerprint,
      evidenceType: evType,
      confidenceLevel: evConfidence,
      sourceUrl: evUrl || undefined,
      description: evDesc,
    });
    setSubmitting(false);
    if (ok) {
      setShowAddEvidence(false);
      setEvDesc('');
      setEvUrl('');
    }
  }, [link.id, fingerprint, evType, evConfidence, evUrl, evDesc, addEvidence, clearError]);

  const handleVote = useCallback(async (direction: 'up' | 'down') => {
    clearError();
    await voteOnLink(link.id, { fingerprint, direction, badgeTier });
  }, [link.id, fingerprint, badgeTier, voteOnLink, clearError]);

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'detail', label: 'DETAIL' },
    { id: 'evidence', label: 'EVIDENCE', count: link.evidenceCount },
    { id: 'voting', label: 'VOTING', count: link.totalVotes },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        width: '360px',
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLocked ? (
            <Lock size={12} style={{ color: '#9ca3af' }} />
          ) : (
            <Unlock size={12} style={{ color: '#22c55e' }} />
          )}
          <span style={{
            fontSize: '9px',
            letterSpacing: '0.2em',
            color: isLocked ? '#9ca3af' : '#22c55e',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
          }}>
            {isAccepted ? 'KABUL EDİLDİ' : link.status === 'rejected' ? 'REDDEDİLDİ' : 'HAYALET İP'}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '2px' }}>
          <X size={14} />
        </button>
      </div>

      {/* ── Connection Visual ── */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        borderBottom: '1px solid #111',
      }}>
        <span style={{ fontSize: '11px', color: '#e5e5e5', fontFamily: 'monospace', fontWeight: 600 }}>{sourceName}</span>
        <ArrowLeftRight size={12} style={{ color: '#dc2626' }} />
        <span style={{ fontSize: '11px', color: '#e5e5e5', fontFamily: 'monospace', fontWeight: 600 }}>{targetName}</span>
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '8px', color: '#666', fontFamily: 'monospace' }}>EVIDENCE PROGRESS</span>
          <span style={{ fontSize: '8px', color: '#888', fontFamily: 'monospace' }}>
            {link.evidenceCount}/{link.evidenceThreshold}
          </span>
        </div>
        <div style={{ height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: '100%',
              backgroundColor: progressPercent >= 100 ? '#22c55e' : progressPercent > 50 ? '#fbbf24' : '#9ca3af',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1a1a1a',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: activeTab === tab.id ? '#111' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #dc2626' : '2px solid transparent',
              color: activeTab === tab.id ? '#e5e5e5' : '#555',
              fontSize: '9px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: '8px',
                backgroundColor: activeTab === tab.id ? '#dc262630' : '#222',
                color: activeTab === tab.id ? '#dc2626' : '#555',
                padding: '1px 4px',
                borderRadius: '3px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <AnimatePresence mode="wait">
          {/* Detail Tab */}
          {activeTab === 'detail' && (
            <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <InfoRow label="İLİŞKİ TÜRÜ" value={relType?.labelTr || link.relationshipType} />
              <InfoRow label="AÇIKLAMA" value={link.description} multiline />
              <InfoRow label="ÖNEREN" value={link.proposerFingerprint.slice(0, 12) + '...'} />
              <InfoRow label="ROZET" value={link.proposerBadgeTier.toUpperCase()} />
              <InfoRow label="STAKE" value={`${link.reputationStaked} puan`} />
              <InfoRow label="DURUM" value={link.status.replace('_', ' ').toUpperCase()} highlight />
              <InfoRow label="TARİH" value={new Date(link.createdAt).toLocaleDateString('tr-TR')} />
              <InfoRow label="SON TARİH" value={new Date(link.expiresAt).toLocaleDateString('tr-TR')} />
            </motion.div>
          )}

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <motion.div key="evidence" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {evidence.length === 0 && !showAddEvidence && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#444', fontSize: '10px', fontFamily: 'monospace' }}>
                  Henuz kanit eklenmemis
                </div>
              )}

              {evidence.map((ev, i) => (
                <EvidenceCard key={ev.id} evidence={ev} index={i} />
              ))}

              {/* Add Evidence Button or Form */}
              {!showAddEvidence && !hasAddedEvidence && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddEvidence(true)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '8px',
                    backgroundColor: '#dc262610',
                    border: '1px solid #dc262630',
                    borderRadius: '4px',
                    color: '#dc2626',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={12} /> ADD EVIDENCE
                </motion.button>
              )}

              {hasAddedEvidence && !showAddEvidence && (
                <div style={{
                  padding: '8px',
                  marginTop: '8px',
                  backgroundColor: '#22c55e10',
                  border: '1px solid #22c55e30',
                  borderRadius: '4px',
                  fontSize: '9px',
                  color: '#22c55e',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}>
                  Bu oneriye zaten kanit eklediniz
                </div>
              )}

              {showAddEvidence && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                    border: '1px solid #222',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <select
                    value={evType}
                    onChange={(e) => setEvType(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '3px', color: '#e5e5e5', fontSize: '10px', fontFamily: 'monospace' }}
                  >
                    {EVIDENCE_TYPES.map(et => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>

                  <input
                    type="url"
                    value={evUrl}
                    onChange={(e) => setEvUrl(e.target.value)}
                    placeholder="Kaynak URL (opsiyonel)"
                    style={{ width: '100%', padding: '6px 8px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '3px', color: '#e5e5e5', fontSize: '10px', fontFamily: 'monospace' }}
                  />

                  <textarea
                    value={evDesc}
                    onChange={(e) => setEvDesc(e.target.value)}
                    placeholder="Kanit aciklamasi..."
                    rows={3}
                    style={{ width: '100%', padding: '6px 8px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '3px', color: '#e5e5e5', fontSize: '10px', fontFamily: 'monospace', resize: 'none' }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>Guven:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={evConfidence * 100}
                      onChange={(e) => setEvConfidence(parseInt(e.target.value) / 100)}
                      style={{ flex: 1, accentColor: '#dc2626' }}
                    />
                    <span style={{ fontSize: '9px', color: '#888', fontFamily: 'monospace', minWidth: '30px' }}>
                      %{Math.round(evConfidence * 100)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowAddEvidence(false)}
                      style={{ flex: 1, padding: '6px', backgroundColor: 'transparent', border: '1px solid #333', borderRadius: '3px', color: '#666', fontSize: '9px', fontFamily: 'monospace', cursor: 'pointer' }}
                    >
                      İPTAL
                    </button>
                    <button
                      onClick={handleAddEvidence}
                      disabled={!evDesc || evDesc.length < 5 || submitting}
                      style={{
                        flex: 1,
                        padding: '6px',
                        backgroundColor: evDesc.length >= 5 ? '#dc262618' : '#111',
                        border: `1px solid ${evDesc.length >= 5 ? '#dc262660' : '#222'}`,
                        borderRadius: '3px',
                        color: evDesc.length >= 5 ? '#dc2626' : '#444',
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        cursor: evDesc.length >= 5 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {submitting ? 'GÖNDERİLİYOR...' : 'EKLE'}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Voting Tab */}
          {activeTab === 'voting' && (
            <motion.div key="voting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Vote Summary */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <VoteSummaryBox
                  icon={<ThumbsUp size={14} />}
                  count={link.communityUpvotes}
                  ratio={upRatio + '%'}
                  color="#22c55e"
                />
                <VoteSummaryBox
                  icon={<ThumbsDown size={14} />}
                  count={link.communityDownvotes}
                  ratio={downRatio + '%'}
                  color="#dc2626"
                />
              </div>

              {/* Threshold Info */}
              <div style={{
                padding: '8px',
                backgroundColor: '#111',
                borderRadius: '4px',
                border: '1px solid #1a1a1a',
                marginBottom: '12px',
                fontSize: '9px',
                color: '#666',
                fontFamily: 'monospace',
                lineHeight: 1.6,
              }}>
                <div>Minimum oy: 5</div>
                <div>Kabul esigi: %80 olumlu oy</div>
                <div>Red esigi: %70 olumsuz oy</div>
                <div>Toplam oy: {link.totalVotes}</div>
              </div>

              {/* Vote Buttons */}
              {link.status === 'pending_vote' && !hasVoted && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleVote('up')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#22c55e10',
                      border: '1px solid #22c55e30',
                      borderRadius: '4px',
                      color: '#22c55e',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ThumbsUp size={14} /> KABUL
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleVote('down')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#dc262610',
                      border: '1px solid #dc262630',
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ThumbsDown size={14} /> RED
                  </motion.button>
                </div>
              )}

              {hasVoted && (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#22c55e10',
                  border: '1px solid #22c55e30',
                  borderRadius: '4px',
                  fontSize: '9px',
                  color: '#22c55e',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}>
                  Oyunuz kaydedildi
                </div>
              )}

              {link.status === 'pending_evidence' && (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#f59e0b10',
                  border: '1px solid #f59e0b20',
                  borderRadius: '4px',
                  fontSize: '9px',
                  color: '#f59e0b',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}>
                  Oylama icin yeterli kanit bekleniyor ({link.evidenceCount}/{link.evidenceThreshold})
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div style={{
            padding: '6px 10px',
            marginTop: '8px',
            backgroundColor: '#dc262612',
            border: '1px solid #dc262630',
            borderRadius: '3px',
            fontSize: '9px',
            color: '#dc2626',
            fontFamily: 'monospace',
          }}>
            {error}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Helper Components ──

function InfoRow({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div style={{
      padding: '6px 0',
      borderBottom: '1px solid #111',
      display: multiline ? 'block' : 'flex',
      justifyContent: 'space-between',
      alignItems: multiline ? undefined : 'center',
      gap: '8px',
    }}>
      <span style={{
        fontSize: '8px',
        letterSpacing: '0.1em',
        color: '#555',
        fontFamily: 'monospace',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '10px',
        color: highlight ? '#dc2626' : '#ccc',
        fontFamily: 'monospace',
        textAlign: multiline ? 'left' : 'right',
        marginTop: multiline ? '4px' : 0,
        display: multiline ? 'block' : undefined,
        lineHeight: 1.5,
      }}>
        {value}
      </span>
    </div>
  );
}

function EvidenceCard({ evidence, index }: { evidence: ProposedEvidence; index: number }) {
  const evType = EVIDENCE_TYPES.find(e => e.value === evidence.evidenceType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: '10px',
        backgroundColor: '#111',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        marginBottom: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '9px', color: '#dc2626', fontFamily: 'monospace', fontWeight: 600 }}>
          {evType?.label || evidence.evidenceType}
        </span>
        <span style={{ fontSize: '8px', color: '#444', fontFamily: 'monospace' }}>
          %{Math.round(evidence.confidenceLevel * 100)}
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#ccc', fontFamily: 'monospace', lineHeight: 1.5 }}>
        {evidence.description}
      </div>
      {evidence.sourceUrl && (
        <a
          href={evidence.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            fontSize: '8px',
            color: '#6366f1',
            fontFamily: 'monospace',
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={8} /> Kaynak
        </a>
      )}
      <div style={{ fontSize: '8px', color: '#333', fontFamily: 'monospace', marginTop: '4px' }}>
        {evidence.contributorFingerprint.slice(0, 8)}... • {new Date(evidence.createdAt).toLocaleDateString('tr-TR')}
      </div>
    </motion.div>
  );
}

function VoteSummaryBox({ icon, count, ratio, color }: { icon: React.ReactNode; count: number; ratio: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      padding: '12px',
      backgroundColor: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: '4px',
      textAlign: 'center',
    }}>
      <div style={{ color, marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '16px', color, fontFamily: 'monospace', fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>{ratio}</div>
    </div>
  );
}
