'use client';

/**
 * DocumentDetailView — Sprint 16.6
 * Split-panel comparison: Original Document ↔ AI Scan Results
 * Federal indictment aesthetic — researcher comparison layout
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, FileText, Scale, DollarSign, Lock, FileQuestion,
  Mail, Newspaper, BookOpen, AlertTriangle, Calendar, MapPin, User, Building2,
  Link2, CheckCircle, XCircle, Clock, Zap, Eye, ChevronDown, ChevronUp,
  Shield, Hash, Globe, Loader2,
} from 'lucide-react';
import type { DocumentRecord, ScanResultData, EntityRecord, RelationshipRecord, DerivedItem } from '@/store/documentStore';
import { useDocumentStore } from '@/store/documentStore';
import QuarantineReviewPanel from './QuarantineReviewPanel';
import FosforluKalemMasasi from './FosforluKalemMasasi';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface DocumentDetailViewProps {
  document: DocumentRecord;
  fingerprint: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════
// ENTITY TYPE COLORS & ICONS
// ═══════════════════════════════════════════

const ENTITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  person: { bg: 'rgba(220, 38, 38, 0.12)', text: '#ef4444', border: 'rgba(220, 38, 38, 0.35)' },
  organization: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)' },
  location: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.35)' },
  date: { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.35)' },
  money: { bg: 'rgba(234, 179, 8, 0.12)', text: '#eab308', border: 'rgba(234, 179, 8, 0.35)' },
  account: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: 'rgba(249, 115, 22, 0.35)' },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  person: <User size={12} />,
  organization: <Building2 size={12} />,
  location: <MapPin size={12} />,
  date: <Calendar size={12} />,
  money: <DollarSign size={12} />,
  account: <Hash size={12} />,
};

const EVIDENCE_TYPE_COLORS: Record<string, string> = {
  court_record: '#f59e0b',
  financial_record: '#22c55e',
  witness_testimony: '#a855f7',
  official_document: '#3b82f6',
  leaked_document: '#dc2626',
  correspondence: '#06b6d4',
};

function getDocumentIcon(type: string) {
  const typeMap: Record<string, React.ReactNode> = {
    court_record: <Scale size={18} />,
    financial: <DollarSign size={18} />,
    leaked: <Lock size={18} />,
    foia: <FileQuestion size={18} />,
    deposition: <FileText size={18} />,
    indictment: <AlertTriangle size={18} />,
    correspondence: <Mail size={18} />,
    media: <Newspaper size={18} />,
    academic: <BookOpen size={18} />,
  };
  return typeMap[type] || <FileText size={18} />;
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    icij: '#3b82f6', opensanctions: '#a855f7', courtlistener: '#f59e0b',
    manual: '#666', local: '#22c55e',
  };
  return colors[source] || '#666';
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateString.substring(0, 10); }
}

// ═══════════════════════════════════════════
// CONFIDENCE BAR
// ═══════════════════════════════════════════

function ConfidenceBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const percent = Math.round(value * 100);
  const color = percent >= 80 ? '#22c55e' : percent >= 60 ? '#3b82f6' : percent >= 40 ? '#f59e0b' : '#dc2626';
  const height = size === 'sm' ? 3 : 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height, background: '#1a1a1a', position: 'relative', overflow: 'hidden', minWidth: 40 }}>
        <div style={{ height: '100%', width: `${percent}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: size === 'sm' ? 9 : 10, color, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
        {percent}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// ENTITY TABLE
// ═══════════════════════════════════════════

function EntityTable({ entities }: { entities: EntityRecord[] }) {
  const [expanded, setExpanded] = useState(true);
  const sorted = useMemo(() =>
    [...entities].sort((a, b) => b.confidence - a.confidence),
    [entities]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, EntityRecord[]> = {};
    sorted.forEach((e) => {
      const type = e.type || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(e);
    });
    return groups;
  }, [sorted]);

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', color: '#e5e5e5', cursor: 'pointer',
          padding: '8px 0', fontFamily: mono, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        <User size={14} color="#dc2626" />
        EXTRACTED ENTITIES ({entities.length})
        {expanded ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />}
      </button>

      {expanded && Object.entries(grouped).map(([type, items]) => {
        const colors = ENTITY_COLORS[type] || ENTITY_COLORS.person;
        const icon = ENTITY_ICONS[type] || <User size={12} />;

        return (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: colors.text,
              marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {icon}
              {type.toUpperCase()} ({items.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((entity, i) => (
                <div
                  key={`${entity.name}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: colors.bg,
                    border: `1px solid ${colors.border}`, fontSize: 11,
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 600, color: '#e5e5e5' }}>{entity.name}</span>
                  {entity.role && (
                    <span style={{ fontSize: 9, color: '#888', fontStyle: 'italic' }}>{entity.role}</span>
                  )}
                  <ConfidenceBar value={entity.confidence} size="sm" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// RELATIONSHIP TABLE
// ═══════════════════════════════════════════

function RelationshipTable({ relationships }: { relationships: RelationshipRecord[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', color: '#e5e5e5', cursor: 'pointer',
          padding: '8px 0', fontFamily: mono, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        <Link2 size={14} color="#dc2626" />
        EXTRACTED RELATIONSHIPS ({relationships.length})
        {expanded ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />}
      </button>

      {expanded && relationships.map((rel, i) => {
        const evColor = EVIDENCE_TYPE_COLORS[rel.evidenceType] || '#666';
        return (
          <div
            key={`${rel.sourceName}-${rel.targetName}-${i}`}
            style={{
              padding: '10px 12px', marginBottom: 6,
              background: '#0a0a0a', border: '1px solid #1a1a1a',
              fontSize: 11,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>{rel.sourceName}</span>
              <span style={{ color: '#555', fontSize: 10 }}>→</span>
              <span style={{ fontWeight: 700, color: '#3b82f6' }}>{rel.targetName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 6px', fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                background: `${evColor}18`, color: evColor, border: `1px solid ${evColor}44`,
              }}>
                {rel.relationshipType.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span style={{
                padding: '2px 6px', fontSize: 8, fontWeight: 600, letterSpacing: '0.04em',
                background: '#1a1a1a', color: '#888',
              }}>
                {rel.evidenceType.replace(/_/g, ' ').toUpperCase()}
              </span>
              <div style={{ marginLeft: 'auto', width: 60 }}>
                <ConfidenceBar value={rel.confidence} size="sm" />
              </div>
            </div>
            {rel.description && (
              <div style={{ fontSize: 10, color: '#777', marginTop: 6, lineHeight: 1.3, fontStyle: 'italic' }}>
                {rel.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// KEY DATES TIMELINE
// ═══════════════════════════════════════════

function KeyDatesTimeline({ dates }: { dates: Array<{ date: string; description: string }> }) {
  const [expanded, setExpanded] = useState(true);

  if (!dates || dates.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', color: '#e5e5e5', cursor: 'pointer',
          padding: '8px 0', fontFamily: mono, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        <Calendar size={14} color="#dc2626" />
        KEY DATES ({dates.length})
        {expanded ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />}
      </button>

      {expanded && (
        <div style={{ position: 'relative', paddingLeft: 16 }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: 4, top: 0, bottom: 0,
            width: 2, background: '#1a1a1a',
          }} />

          {dates.map((d, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 12, paddingLeft: 16 }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -14, top: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: '#dc2626', border: '2px solid #030303',
              }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a855f7', marginBottom: 2, letterSpacing: '0.04em' }}>
                {d.date}
              </div>
              <div style={{ fontSize: 10, color: '#999', lineHeight: 1.3 }}>
                {d.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// RAW DOCUMENT CONTENT VIEWER (Sprint 17.1)
// ═══════════════════════════════════════════

function RawContentViewer({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.split('\n');
  const preview = lines.slice(0, 8).join('\n');
  const hasMore = lines.length > 8;

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'none', border: 'none', color: '#e5e5e5', cursor: 'pointer',
          padding: '8px 0', fontFamily: mono, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        <Eye size={13} color="#3b82f6" />
        <span style={{ color: '#3b82f6' }}>RAW DOCUMENT CONTENT</span>
        {expanded ? <ChevronUp size={12} color="#666" /> : <ChevronDown size={12} color="#666" />}
      </button>

      <div style={{
        padding: '10px 12px',
        background: '#060606',
        border: '1px solid #1a1a1a',
        fontSize: 10,
        color: '#999',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: expanded ? 400 : 140,
        overflow: 'auto',
        transition: 'max-height 0.3s ease',
        fontFamily: mono,
      }}>
        {expanded ? content : preview}
        {!expanded && hasMore && (
          <span style={{ color: '#555', fontStyle: 'italic' }}>
            {'\n'}... ({lines.length - 8} more lines)
          </span>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'block', width: '100%', marginTop: 4,
            background: 'none', border: '1px solid #1a1a1a',
            color: '#3b82f6', fontSize: 9, fontFamily: mono,
            padding: '4px', cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          {expanded ? 'COLLAPSE ↑' : `VIEW ALL (${lines.length} lines) ↓`}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DERIVED ITEMS REVIEW SECTION
// ═══════════════════════════════════════════

function DerivedItemsSection({ documentId, fingerprint }: { documentId: string; fingerprint: string }) {
  const { derivedItems, fetchDerivedItems, approveDerivedItem, rejectDerivedItem } = useDocumentStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDerivedItems(documentId).finally(() => setLoading(false));
  }, [documentId, fetchDerivedItems]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <Loader2 size={16} color="#dc2626" className="animate-spin" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (derivedItems.length === 0) return null;

  const pending = derivedItems.filter(d => d.status === 'pending');
  const approved = derivedItems.filter(d => d.status === 'approved');
  const rejected = derivedItems.filter(d => d.status === 'rejected');

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#e5e5e5',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Shield size={14} color="#dc2626" />
        DERIVED ITEMS ({derivedItems.length})
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 9, fontFamily: mono }}>
        <span style={{ color: '#eab308' }}>⏳ Pending: {pending.length}</span>
        <span style={{ color: '#22c55e' }}>✓ Approved: {approved.length}</span>
        <span style={{ color: '#ef4444' }}>✗ Rejected: {rejected.length}</span>
      </div>

      {pending.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '10px 12px', marginBottom: 6,
            background: 'rgba(234, 179, 8, 0.06)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            fontSize: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', color: '#eab308',
                padding: '1px 4px', background: 'rgba(234, 179, 8, 0.15)', marginRight: 6,
              }}>
                {item.item_type.toUpperCase()}
              </span>
              <span style={{ color: '#e5e5e5' }}>
                {JSON.stringify(item.item_data).substring(0, 100)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => approveDerivedItem(item.id, fingerprint)}
                style={{
                  padding: '3px 8px', background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e',
                  fontSize: 9, fontFamily: mono, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ONAYLA
              </button>
              <button
                onClick={() => rejectDerivedItem(item.id)}
                style={{
                  padding: '3px 8px', background: 'rgba(220, 38, 38, 0.15)',
                  border: '1px solid rgba(220, 38, 38, 0.3)', color: '#ef4444',
                  fontSize: 9, fontFamily: mono, fontWeight: 600, cursor: 'pointer',
                }}
              >
                REDDET
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN DETAIL VIEW
// ═══════════════════════════════════════════

export default function DocumentDetailView({ document, fingerprint, onBack }: DocumentDetailViewProps) {
  const scanResult = document.scan_result as ScanResultData | null;
  const hasScan = document.scan_status === 'scanned' && scanResult;
  const { activeScan, scanDocument } = useDocumentStore();
  const isScanning = activeScan?.documentId === document.id;
  const [fosforluMode, setFosforluMode] = useState(false);

  // Get raw text for fosforlu view (prefer raw_content, fallback to scan fullText)
  const rawTextForFosforlu = document.raw_content || scanResult?.fullText || scanResult?.rawContent || '';
  const canUseFosforlu = hasScan && rawTextForFosforlu.length > 0;

  // ═══ FOSFORLU KALEM MASASI MODE ═══
  if (fosforluMode && canUseFosforlu && scanResult) {
    return (
      <FosforluKalemMasasi
        rawContent={rawTextForFosforlu}
        scanResult={scanResult}
        documentTitle={document.title}
        documentId={document.id}
        externalUrl={document.external_url}
        fingerprint={fingerprint}
        onBack={() => setFosforluMode(false)}
      />
    );
  }

  // quality_score is stored as 0-100 integer (e.g., 85), not 0-1 float
  const qualityScoreNormalized = (document.quality_score || 0) / 100;
  const sourceColor = getSourceColor(document.source_type);

  const entityCount = scanResult?.entities?.length || 0;
  const relCount = scanResult?.relationships?.length || 0;
  const dateCount = scanResult?.keyDates?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
        fontFamily: mono,
      }}
    >
      {/* Back button + Title bar */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#050505', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid #1a1a1a', color: '#888',
            padding: '5px 10px', fontSize: 10, fontFamily: mono, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#dc2626';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1a1a1a';
            e.currentTarget.style.color = '#888';
          }}
        >
          <ArrowLeft size={12} /> BACK
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: '#e5e5e5',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {document.title}
          </div>
        </div>

        {document.external_url && (
          <a
            href={document.external_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', fontSize: 9, fontFamily: mono,
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6', textDecoration: 'none', fontWeight: 600,
              letterSpacing: '0.04em', transition: 'all 0.2s',
            }}
          >
            <ExternalLink size={11} /> SOURCE
          </a>
        )}
      </div>

      {/* Scanning in progress banner */}
      {isScanning && (
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid rgba(220, 38, 38, 0.3)',
          background: 'rgba(220, 38, 38, 0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <Loader2 size={16} color="#dc2626" className="animate-spin" />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#dc2626' }}>
            AI SCAN IN PROGRESS...
          </div>
          <div style={{ fontSize: 9, color: '#888' }}>
            Extracting entities, relationships, and dates from document
          </div>
        </div>
      )}

      {/* Scan Summary Badges */}
      {hasScan && (
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid #1a1a1a',
          display: 'flex', gap: 10, flexWrap: 'wrap', background: '#080808',
          flexShrink: 0, alignItems: 'center',
        }}>
          <div style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 700,
            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle size={12} /> AI SCAN COMPLETED
          </div>
          <div style={{ padding: '4px 8px', fontSize: 9, background: '#111', border: '1px solid #222', color: '#e5e5e5' }}>
            <User size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {entityCount} entities
          </div>
          <div style={{ padding: '4px 8px', fontSize: 9, background: '#111', border: '1px solid #222', color: '#e5e5e5' }}>
            <Link2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {relCount} relationships
          </div>
          <div style={{ padding: '4px 8px', fontSize: 9, background: '#111', border: '1px solid #222', color: '#e5e5e5' }}>
            <Calendar size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {dateCount} dates
          </div>
          <div style={{
            padding: '4px 8px', fontSize: 9, marginLeft: 'auto',
            background: `${sourceColor}18`, border: `1px solid ${sourceColor}44`,
            color: sourceColor, fontWeight: 600, letterSpacing: '0.04em',
          }}>
            {document.source_type.toUpperCase()}
          </div>

          {/* İNCELE button — Fosforlu Kalem Masası */}
          {canUseFosforlu && (
            <button
              onClick={() => setFosforluMode(true)}
              style={{
                padding: '4px 12px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#eab308',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.2s', fontFamily: mono,
                marginLeft: 'auto',
              }}
            >
              <Eye size={11} /> İNCELE
            </button>
          )}

          {/* Re-scan button */}
          <button
            onClick={() => scanDocument(document.id, fingerprint)}
            disabled={isScanning}
            style={{
              padding: '4px 10px', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.04em', cursor: isScanning ? 'default' : 'pointer',
              background: isScanning ? '#333' : 'transparent',
              border: `1px solid ${isScanning ? '#333' : 'rgba(220, 38, 38, 0.3)'}`,
              color: isScanning ? '#666' : '#dc2626',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.2s', fontFamily: mono,
            }}
          >
            {isScanning ? (
              <><Loader2 size={10} className="animate-spin" /> SCANNING...</>
            ) : (
              <><Zap size={10} /> RE-SCAN</>
            )}
          </button>
        </div>
      )}

      {/* Split Content */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        ...(hasScan ? {} : { flexDirection: 'column' as const }),
      }}>

        {/* ═══ LEFT PANEL: Original Document ═══ */}
        <div style={{
          flex: hasScan ? '0 0 340px' : 1,
          borderRight: hasScan ? '1px solid #1a1a1a' : 'none',
          overflow: 'auto', padding: '20px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#dc2626',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FileText size={13} /> DOCUMENT DETAILS
          </div>

          {/* Document icon + type */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '12px', background: '#0a0a0a', border: '1px solid #1a1a1a',
          }}>
            <span style={{ color: '#dc2626' }}>{getDocumentIcon(document.document_type)}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#e5e5e5' }}>
                {document.document_type.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                ID: {document.external_id || document.id.substring(0, 8)}
              </div>
            </div>
          </div>

          {/* Metadata rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MetaRow label="TITLE" value={document.title} />
            {document.description && <MetaRow label="DESCRIPTION" value={document.description} />}
            <MetaRow label="SOURCE" value={document.source_type.toUpperCase()} color={sourceColor} />
            <MetaRow label="FILE DATE" value={formatDate(document.date_filed)} />
            <MetaRow label="UPLOADED" value={formatDate(document.date_uploaded)} />
            <MetaRow label="LANGUAGE" value={document.language?.toUpperCase() || 'N/A'} />
            {document.file_size && (
              <MetaRow label="SIZE" value={`${(document.file_size / (1024 * 1024)).toFixed(2)} MB`} />
            )}
          </div>

          {/* Confidence Score */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
              QUALITY SCORE
            </div>
            <ConfidenceBar value={qualityScoreNormalized} />
          </div>

          {/* Country Tags */}
          {document.country_tags && document.country_tags.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
                ÜLKE ETİKETLERİ
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
              COUNTRY TAGS
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {document.country_tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 8px', background: '#1a1a1a', fontSize: 9,
                      color: '#999', border: '1px solid #2a2a2a', letterSpacing: '0.04em',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External URL with resilience notice */}
          {document.external_url && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
                SOURCE URL
              </div>
              <a
                href={document.external_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 10, color: '#3b82f6', textDecoration: 'none',
                  wordBreak: 'break-all', lineHeight: 1.3,
                  display: 'flex', alignItems: 'flex-start', gap: 4,
                }}
              >
                <Globe size={11} style={{ flexShrink: 0, marginTop: 2 }} />
                {document.external_url}
              </a>
              <div style={{
                fontSize: 8, color: '#555', marginTop: 4, lineHeight: 1.3,
                fontStyle: 'italic',
              }}>
                External sources may occasionally be unavailable. Document content was extracted during scanning and is stored above.
              </div>
            </div>
          )}

          {/* ═══ RAW DOCUMENT CONTENT ═══ */}
          {/* Priority: raw_content (import-time, full) → scan_result.rawContent (legacy) */}
          {/* Scan öncesi ve sonrası gösterilir — kullanıcı her zaman ham belgeyi okuyabilir */}
          {(() => {
            const rawContent = document.raw_content || scanResult?.rawContent || null;
            return rawContent ? <RawContentViewer content={rawContent} /> : null;
          })()}

          {/* Metadata (raw) */}
          {document.metadata && (() => {
            // Parse metadata if it's a JSON string (Supabase sometimes returns stringified JSON)
            let meta: unknown = document.metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta as string); } catch { /* keep as string */ }
            }
            // If still a string after parse attempt, show as-is
            if (typeof meta === 'string') {
              return (meta as string).length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
                    ADDITIONAL METADATA
                  </div>
                  <div style={{ padding: '8px 10px', background: '#0a0a0a', border: '1px solid #1a1a1a', fontSize: 9, color: '#777', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                    {meta}
                  </div>
                </div>
              ) : null;
            }
            const entries = Object.entries(meta as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== '');
            if (entries.length === 0) return null;
            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
                  ADDITIONAL METADATA
                </div>
                <div style={{ padding: '8px 10px', background: '#0a0a0a', border: '1px solid #1a1a1a', fontSize: 9, color: '#777', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                  {entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('\n')}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ═══ RIGHT PANEL: AI Scan Results ═══ */}
        {hasScan && scanResult && (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Zap size={13} /> AI SCAN RESULTS
            </div>

            {/* AI Summary */}
            {scanResult.summary && (
              <div style={{
                padding: '14px', marginBottom: 20,
                background: 'rgba(220, 38, 38, 0.06)', border: '1px solid rgba(220, 38, 38, 0.2)',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  color: '#dc2626', marginBottom: 8,
                }}>
                  AI SUMMARY
                </div>
                <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.5 }}>
                  {scanResult.summary}
                </div>
              </div>
            )}

            {/* Overall Confidence */}
            <div style={{
              marginBottom: 20, padding: '10px 14px',
              background: '#0a0a0a', border: '1px solid #1a1a1a',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 6 }}>
                OVERALL CONFIDENCE SCORE
              </div>
              <ConfidenceBar value={scanResult.confidence || 0} />
            </div>

            {/* Entities */}
            {scanResult.entities && scanResult.entities.length > 0 && (
              <EntityTable entities={scanResult.entities} />
            )}

            {/* Relationships */}
            {scanResult.relationships && scanResult.relationships.length > 0 && (
              <RelationshipTable relationships={scanResult.relationships} />
            )}

            {/* Key Dates */}
            {scanResult.keyDates && scanResult.keyDates.length > 0 && (
              <KeyDatesTimeline dates={scanResult.keyDates} />
            )}

            {/* Quarantine Zone (Sprint 17 — Zero Hallucination) */}
            <div style={{
              marginTop: 20,
              borderTop: '1px solid rgba(245, 158, 11, 0.2)',
              paddingTop: 16,
            }}>
              <QuarantineReviewPanel
                documentId={document.id}
                networkId={document.network_id}
                fingerprint={fingerprint}
              />
            </div>

            {/* Legacy Derived Items — hidden when Quarantine system is active
                Quarantine (Sprint 17) supersedes the old derived items flow.
                Keeping component for backward compatibility with pre-Sprint-17 scans. */}
            {/* <DerivedItemsSection documentId={document.id} fingerprint={fingerprint} /> */}
          </div>
        )}

        {/* No scan yet — full width info with scan button */}
        {!hasScan && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            {isScanning ? (
              <>
                <Loader2 size={32} color="#dc2626" className="animate-spin" />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#dc2626' }}>
                  AI SCAN IN PROGRESS...
                </div>
                <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4, maxWidth: 320 }}>
                  Extracting document content, entities and relationships...
                </div>
              </>
            ) : (
              <>
                <Clock size={32} color="#eab308" />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#eab308' }}>
                  DOCUMENT NOT SCANNED YET
                </div>
                <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4, maxWidth: 320 }}>
                  {document.raw_content
                    ? 'Raw document content is available below. After reviewing, you can start AI scanning.'
                    : 'Run AI scan to automatically extract persons, organizations, relationships, and key dates from this document.'
                  }
                </div>
                <button
                  onClick={() => scanDocument(document.id, fingerprint)}
                  style={{
                    padding: '10px 24px', marginTop: 8,
                    background: '#dc2626', border: 'none',
                    color: '#fff', fontSize: 11, fontFamily: mono,
                    fontWeight: 700, letterSpacing: '0.06em',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 6,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Zap size={14} /> SCAN
                </button>

                {/* Raw content preview — scan öncesi okuma imkanı */}
                {document.raw_content && (
                  <div style={{ width: '100%', maxWidth: 600, marginTop: 16, textAlign: 'left' }}>
                    <RawContentViewer content={document.raw_content} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// HELPER: Metadata Row
// ═══════════════════════════════════════════

function MetaRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: '#555',
        minWidth: 100, flexShrink: 0, marginTop: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 10, color: color || '#ccc', lineHeight: 1.3,
        wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  );
}
