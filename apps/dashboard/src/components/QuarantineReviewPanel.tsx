'use client';

/**
 * QuarantineReviewPanel — Sprint 17
 * Shows quarantine items for a document with review/promote actions
 * Federal Indictment Aesthetic
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion,
  Check, X, AlertTriangle, ChevronDown, ChevronUp, Loader2,
  ArrowUpRight, Eye, Lock,
} from 'lucide-react';
import { useQuarantineStore, type QuarantineItem } from '@/store/quarantineStore';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ═══════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield; bg: string }> = {
  quarantined: { label: 'QUARANTINE', color: '#f59e0b', icon: ShieldAlert, bg: 'rgba(245, 158, 11, 0.08)' },
  pending_review: { label: 'UNDER REVIEW', color: '#3b82f6', icon: ShieldQuestion, bg: 'rgba(59, 130, 246, 0.08)' },
  verified: { label: 'VERIFIED', color: '#22c55e', icon: ShieldCheck, bg: 'rgba(34, 197, 94, 0.08)' },
  rejected: { label: 'REJECTED', color: '#ef4444', icon: ShieldX, bg: 'rgba(239, 68, 68, 0.08)' },
  disputed: { label: 'DISPUTED', color: '#a855f7', icon: AlertTriangle, bg: 'rgba(168, 85, 247, 0.08)' },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  structured_api: { label: 'STRUCTURED DATA', color: '#22c55e' },
  html_parse: { label: 'HTML PARSING', color: '#3b82f6' },
  ai_extraction: { label: 'AI EXTRACTION', color: '#f59e0b' },
  manual_entry: { label: 'MANUAL ENTRY', color: '#a855f7' },
};

// ═══════════════════════════════════════════════════════
// SINGLE QUARANTINE CARD
// ═══════════════════════════════════════════════════════

function QuarantineCard({
  item,
  fingerprint,
  onReview,
  onPromote,
}: {
  item: QuarantineItem;
  fingerprint: string;
  onReview: (id: string, decision: 'approve' | 'reject') => void;
  onPromote: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[item.verification_status] || STATUS_CONFIG.quarantined;
  const source = SOURCE_CONFIG[item.source_type] || SOURCE_CONFIG.ai_extraction;
  const StatusIcon = status.icon;
  const data = item.item_data;
  const alreadyReviewed = item.reviewed_by?.includes(fingerprint);
  const canPromote = item.verification_status === 'verified';

  // Build display name based on item_type
  const entityName = (() => {
    if (item.item_type === 'entity') {
      return (data.name as string)
        || (data.extracted_value as string)
        || (data.value as string)
        || (data.entity_name as string)
        || (data.title as string)
        || (data.label as string)
        // Last resort: try to find any string field that looks like a name
        || Object.values(data).find(v => typeof v === 'string' && v.length > 2 && v.length < 80) as string
        || `Entity #${item.id?.substring(0, 8) || '?'}`;
    }
    if (item.item_type === 'relationship') {
      const src = (data.sourceName as string) || (data.source_name as string) || '?';
      const tgt = (data.targetName as string) || (data.target_name as string) || '?';
      const label = `${src} → ${tgt}`;
      // If both sides are placeholder codes (E1, E13 etc.), show description instead
      const isPlaceholder = /^E\d+$/.test(src) && /^E\d+$/.test(tgt);
      if (isPlaceholder && data.description) {
        return (data.description as string).substring(0, 60);
      }
      return label;
    }
    // Fallback for other types (claim, date, key_date, etc.)
    return (data.name as string)
      || (data.description as string)?.substring(0, 60)
      || (data.text as string)?.substring(0, 60)
      || (data.claim as string)?.substring(0, 60)
      || (data.date as string)
      || `${item.item_type || 'unknown'} item`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        border: `1px solid ${status.color}22`,
        background: status.bg,
        marginBottom: 8,
        fontSize: 11,
        fontFamily: mono,
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <StatusIcon size={14} color={status.color} />

        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 700, letterSpacing: '0.03em',
            color: '#e5e5e5', fontSize: 11,
          }}>
            {entityName}
          </div>
          <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
            {item.item_type.toUpperCase()} •{' '}
            <span style={{ color: source.color }}>{source.label}</span> •{' '}
            Confidence: {Math.round(item.confidence * 100)}%
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          padding: '2px 8px',
          background: `${status.color}15`,
          border: `1px solid ${status.color}33`,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: status.color,
        }}>
          {status.label}
        </div>

        {expanded ? <ChevronUp size={12} color="#666" /> : <ChevronDown size={12} color="#666" />}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 12px',
              borderTop: '1px solid #1a1a1a',
              paddingTop: 10,
            }}>
              {/* Data Preview */}
              <div style={{
                background: '#080808',
                border: '1px solid #1a1a1a',
                padding: '8px 10px',
                fontSize: 9,
                color: '#888',
                lineHeight: 1.5,
                marginBottom: 10,
                maxHeight: 100,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {JSON.stringify(data, null, 2)}
              </div>

              {/* Review info */}
              <div style={{ fontSize: 9, color: '#555', marginBottom: 8 }}>
                <Eye size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {item.review_count}/{item.required_reviews} reviews •{' '}
                Source: {item.source_provider || 'unknown'}
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', marginLeft: 6, textDecoration: 'none' }}
                  >
                    source ↗
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!alreadyReviewed && item.verification_status !== 'verified' && item.verification_status !== 'rejected' && (
                  <>
                    <button
                      onClick={() => onReview(item.id, 'approve')}
                      style={{
                        flex: 1, padding: '6px', border: '1px solid #22c55e33',
                        background: '#22c55e11', color: '#22c55e',
                        fontSize: 9, fontFamily: mono, fontWeight: 700,
                        letterSpacing: '0.05em', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <Check size={12} /> VERIFY
                    </button>
                    <button
                      onClick={() => onReview(item.id, 'reject')}
                      style={{
                        flex: 1, padding: '6px', border: '1px solid #ef444433',
                        background: '#ef444411', color: '#ef4444',
                        fontSize: 9, fontFamily: mono, fontWeight: 700,
                        letterSpacing: '0.05em', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <X size={12} /> REJECT
                    </button>
                  </>
                )}

                {alreadyReviewed && (
                  <div style={{ fontSize: 9, color: '#555', fontStyle: 'italic' }}>
                    <Lock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    You have already reviewed this item
                  </div>
                )}

                {canPromote && (
                  <button
                    onClick={() => onPromote(item.id)}
                    style={{
                      flex: 1, padding: '6px', border: 'none',
                      background: '#22c55e', color: '#000',
                      fontSize: 9, fontFamily: mono, fontWeight: 700,
                      letterSpacing: '0.05em', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <ArrowUpRight size={12} /> ADD TO NETWORK
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════

interface QuarantineReviewPanelProps {
  documentId: string;
  networkId: string;
  fingerprint: string;
}

export default function QuarantineReviewPanel({
  documentId,
  networkId,
  fingerprint,
}: QuarantineReviewPanelProps) {
  const {
    items, isLoading,
    fetchItemsForDocument, reviewItem, promoteItem,
  } = useQuarantineStore();

  useEffect(() => {
    if (documentId && networkId) {
      fetchItemsForDocument(documentId, networkId);
    }
  }, [documentId, networkId, fetchItemsForDocument]);

  const handleReview = async (itemId: string, decision: 'approve' | 'reject') => {
    await reviewItem(itemId, fingerprint, decision);
  };

  const handlePromote = async (itemId: string) => {
    await promoteItem(itemId, fingerprint);
  };

  // Filter out unsupported item types (claim spam from old scans)
  // Only show entity and relationship types — claims were never part of our scan pipeline
  const supportedItems = items.filter((i) =>
    i.item_type === 'entity' || i.item_type === 'relationship'
  );

  // Group by status
  const quarantined = supportedItems.filter((i) => i.verification_status === 'quarantined');
  const pendingReview = supportedItems.filter((i) => i.verification_status === 'pending_review');
  const verified = supportedItems.filter((i) => i.verification_status === 'verified');
  const rejected = supportedItems.filter((i) => i.verification_status === 'rejected');

  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <Loader2 size={20} color="#dc2626" className="animate-spin" style={{ margin: '0 auto' }} />
        <div style={{ fontSize: 9, color: '#666', marginTop: 8, fontFamily: mono }}>
          Loading quarantine data...
        </div>
      </div>
    );
  }

  if (supportedItems.length === 0) {
    return (
      <div style={{
        padding: '20px 16px', textAlign: 'center',
        fontSize: 10, fontFamily: mono, color: '#555',
      }}>
        <Shield size={20} color="#333" style={{ margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
          QUARANTINE IS EMPTY
        </div>
        <div style={{ fontSize: 9, marginTop: 4, color: '#444' }}>
          No quarantine data for this document yet.
          <br />Data will appear here after scanning the document.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, fontFamily: mono,
      }}>
        <Shield size={14} color="#f59e0b" />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b',
        }}>
          QUARANTINE ZONE
        </span>
        <span style={{ fontSize: 9, color: '#555' }}>
          ({supportedItems.length} items)
        </span>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 14,
        fontSize: 9, fontFamily: mono, color: '#666',
      }}>
        {quarantined.length > 0 && (
          <span>🟡 {quarantined.length} quarantined</span>
        )}
        {pendingReview.length > 0 && (
          <span>🔵 {pendingReview.length} in review</span>
        )}
        {verified.length > 0 && (
          <span>🟢 {verified.length} verified</span>
        )}
        {rejected.length > 0 && (
          <span>🔴 {rejected.length} rejected</span>
        )}
      </div>

      {/* Items requiring review first */}
      {[...quarantined, ...pendingReview].map((item) => (
        <QuarantineCard
          key={item.id}
          item={item}
          fingerprint={fingerprint}
          onReview={handleReview}
          onPromote={handlePromote}
        />
      ))}

      {/* Verified items (ready to promote) */}
      {verified.length > 0 && (
        <>
          <div style={{
            fontSize: 9, fontFamily: mono, fontWeight: 700,
            letterSpacing: '0.08em', color: '#22c55e', marginTop: 16, marginBottom: 8,
          }}>
            VERIFIED — CAN BE ADDED TO NETWORK
          </div>
          {verified.map((item) => (
            <QuarantineCard
              key={item.id}
              item={item}
              fingerprint={fingerprint}
              onReview={handleReview}
              onPromote={handlePromote}
            />
          ))}
        </>
      )}

      {/* Rejected items (collapsed) */}
      {rejected.length > 0 && (
        <>
          <div style={{
            fontSize: 9, fontFamily: mono, fontWeight: 700,
            letterSpacing: '0.08em', color: '#ef4444', marginTop: 16, marginBottom: 8,
            opacity: 0.6,
          }}>
            REJECTED ({rejected.length})
          </div>
          {rejected.map((item) => (
            <QuarantineCard
              key={item.id}
              item={item}
              fingerprint={fingerprint}
              onReview={handleReview}
              onPromote={handlePromote}
            />
          ))}
        </>
      )}
    </div>
  );
}
