'use client';

/**
 * Document Card Component (TARA Protocol - Sprint 16)
 * Compact card for document listings with type indicators, scan status, and actions
 * Federal indictment aesthetic — sharp corners, monospace, dark
 */

import React, { useMemo } from 'react';
import {
  FileText,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronRight,
  Scale,
  DollarSign,
  Lock,
  FileQuestion,
  Mail,
  Newspaper,
  BookOpen,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { DocumentRecord } from '@/store/documentStore';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface DocumentCardProps {
  document: DocumentRecord;
  onScan?: () => void;
  onView?: () => void;
  compact?: boolean; // for scan queue list
}

/**
 * Map document types to icons
 */
function getDocumentIcon(type: string) {
  const typeMap: Record<string, React.ReactNode> = {
    court_record: <Scale size={16} />,
    financial: <DollarSign size={16} />,
    leaked: <Lock size={16} />,
    foia: <FileQuestion size={16} />,
    deposition: <FileText size={16} />,
    indictment: <AlertTriangle size={16} />,
    correspondence: <Mail size={16} />,
    media: <Newspaper size={16} />,
    academic: <BookOpen size={16} />,
  };
  return typeMap[type] || <FileText size={16} />;
}

/**
 * Get display label for document type
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    court_record: 'COURT_RECORD',
    financial: 'FINANCIAL',
    leaked: 'LEAKED',
    foia: 'FOIA',
    deposition: 'DEPOSITION',
    indictment: 'INDICTMENT',
    correspondence: 'CORRESPONDENCE',
    media: 'MEDIA',
    academic: 'ACADEMIC',
  };
  return labels[type] || 'DOCUMENT';
}

/**
 * Get source badge color and label
 */
function getSourceBadge(sourceType: string): { bg: string; text: string; label: string } {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    icij: { bg: '#3b82f633', text: '#3b82f6', label: 'ICIJ' },
    open_sanctions: { bg: '#a855f733', text: '#a855f7', label: 'OSANCTIONS' },
    court_listener: { bg: '#f59e0b33', text: '#f59e0b', label: 'COURTL' },
    manual: { bg: '#66666633', text: '#666', label: 'MANUAL' },
  };
  return badges[sourceType] || badges.manual;
}

/**
 * Get scan status info (color, icon, label)
 */
function getScanStatusInfo(status: string): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: React.ReactNode;
} {
  const statuses: Record<
    string,
    {
      color: string;
      bgColor: string;
      borderColor: string;
      label: string;
      icon: React.ReactNode;
    }
  > = {
    pending: {
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      label: 'NOT SCANNED',
      icon: <Clock size={12} />,
    },
    scanning: {
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.4)',
      label: 'SCANNING',
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    scanned: {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      label: 'SCANNED',
      icon: <CheckCircle size={12} />,
    },
    failed: {
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      label: 'HATA',
      icon: <AlertCircle size={12} />,
    },
    needs_review: {
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.3)',
      label: 'İNCELEME',
      icon: <AlertCircle size={12} />,
    },
  };
  return statuses[status] || statuses.pending;
}

/**
 * Extract entity/relationship counts from scan_result
 */
function getScanCounts(scanResult: unknown): { entities: number; relationships: number } {
  if (!scanResult || typeof scanResult !== 'object') return { entities: 0, relationships: 0 };
  const sr = scanResult as Record<string, unknown>;
  const entities = Array.isArray(sr.entities) ? sr.entities.length : 0;
  const relationships = Array.isArray(sr.relationships) ? sr.relationships.length : 0;
  return { entities, relationships };
}

/**
 * Format date to readable format
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString.substring(0, 10);
  }
}

export default function DocumentCard({
  document,
  onScan,
  onView,
  compact = false,
}: DocumentCardProps) {
  const typeLabel = getTypeLabel(document.document_type);
  const sourceBadge = getSourceBadge(document.source_type);
  const scanStatus = getScanStatusInfo(document.scan_status);
  const dateFiledDisplay = formatDate(document.date_filed);

  // Confidence score bar (quality_score as percentage)
  const confidencePercent = Math.round((document.quality_score || 0) * 100);

  // Calculate bar fill color based on confidence
  const barColor = useMemo(() => {
    if (confidencePercent >= 80) return '#22c55e'; // green
    if (confidencePercent >= 60) return '#3b82f6'; // blue
    if (confidencePercent >= 40) return '#f59e0b'; // amber
    return '#dc2626'; // red
  }, [confidencePercent]);

  if (compact) {
    // Compact version for scan queue list
    return (
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: mono,
          color: '#e5e5e5',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2 }}>
            {document.title.length > 50 ? document.title.substring(0, 47) + '...' : document.title}
          </div>
          <div style={{ fontSize: 10, color: '#666' }}>
            {typeLabel} • {dateFiledDisplay}
          </div>
        </div>
        {onScan && (
          <button
            onClick={onScan}
            style={{
              padding: '6px 12px',
              background: '#dc2626',
              border: 'none',
              color: '#fff',
              fontSize: 10,
              fontFamily: mono,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '1';
            }}
          >
            TAKE
          </button>
        )}
      </div>
    );
  }

  // Full card version
  return (
    <div
      style={{
        border: '1px solid #1a1a1a',
        padding: '16px',
        marginBottom: '12px',
        background: '#0a0a0a',
        fontFamily: mono,
        color: '#e5e5e5',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#dc2626';
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0f0f0f';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#1a1a1a';
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0a0a0a';
      }}
    >
      {/* Title + Type + Date */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <span style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }}>
            {getDocumentIcon(document.document_type)}
          </span>
          <h3
            style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              margin: 0,
              flex: 1,
              wordBreak: 'break-word',
            }}
          >
            {document.title}
          </h3>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#666',
            letterSpacing: '0.02em',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span>{typeLabel}</span>
          {document.date_filed && <span>•</span>}
          {document.date_filed && <span>{dateFiledDisplay}</span>}
        </div>
      </div>

      {/* Quality/Confidence Score Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '10px',
            color: '#999',
          }}
        >
          <span>CONFIDENCE</span>
          <span style={{ color: barColor, fontWeight: 600 }}>{confidencePercent}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: '#1a1a1a',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${confidencePercent}%`,
              background: barColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Scan Status Badge (PROMINENT) + Source Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* TARANDI / TARANMADI — big prominent badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: scanStatus.bgColor,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: scanStatus.color,
            border: `1px solid ${scanStatus.borderColor}`,
          }}
        >
          {scanStatus.icon}
          {scanStatus.label}
          {document.scan_status === 'scanned' && document.quality_score > 0 && (
            <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.8 }}>
              {Math.round(document.quality_score)}%
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Scan result counts (if scanned) */}
          {document.scan_status === 'scanned' && document.scan_result && (() => {
            const counts = getScanCounts(document.scan_result);
            return (counts.entities > 0 || counts.relationships > 0) ? (
              <div style={{ fontSize: 9, color: '#666', display: 'flex', gap: 6 }}>
                {counts.entities > 0 && <span>{counts.entities} entity</span>}
                {counts.relationships > 0 && <span>{counts.relationships} link</span>}
              </div>
            ) : null;
          })()}

          {/* Source badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 6px',
              background: sourceBadge.bg,
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: sourceBadge.text,
              border: `1px solid ${sourceBadge.text}33`,
            }}
          >
            {sourceBadge.label}
          </div>
        </div>
      </div>

      {/* Country Tags */}
      {document.country_tags && document.country_tags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', color: '#999', marginBottom: '4px', letterSpacing: '0.05em' }}>
            COUNTRIES
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {document.country_tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '2px 6px',
                  background: '#1a1a1a',
                  fontSize: '9px',
                  color: '#999',
                  border: '1px solid #2a2a2a',
                  letterSpacing: '0.02em',
                }}
              >
                {tag}
              </span>
            ))}
            {document.country_tags.length > 4 && (
              <span
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  color: '#666',
                  letterSpacing: '0.02em',
                }}
              >
                +{document.country_tags.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {document.description && (
        <div style={{ marginBottom: '12px' }}>
          <p
            style={{
              fontSize: '11px',
              color: '#999',
              lineHeight: '1.4',
              margin: 0,
              maxHeight: '3em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {document.description}
          </p>
        </div>
      )}

      {/* Meta + Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid #1a1a1a',
          fontSize: '10px',
          color: '#666',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {document.file_size && (
            <span>
              {(document.file_size / (1024 * 1024)).toFixed(1)} MB
            </span>
          )}
          {document.review_count && (
            <span>
              👁 {document.review_count} views
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onView && (
            <button
              onClick={onView}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid #1a1a1a',
                color: '#999',
                fontSize: '10px',
                fontFamily: mono,
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = '#3b82f6';
                (e.target as HTMLButtonElement).style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = '#1a1a1a';
                (e.target as HTMLButtonElement).style.color = '#999';
              }}
            >
              <Eye size={12} />
              VIEW
            </button>
          )}

          {onScan && (document.scan_status === 'pending' || document.scan_status === 'failed') && (
            <button
              onClick={onScan}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: '#dc2626',
                border: '1px solid #dc2626',
                color: '#fff',
                fontSize: '10px',
                fontFamily: mono,
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '1';
              }}
            >
              <Zap size={12} />
              SCAN
            </button>
          )}

          {document.scan_status === 'scanned' && onView && (
            <button
              onClick={onView}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                fontSize: '10px',
                fontFamily: mono,
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34, 197, 94, 0.3)';
              }}
            >
              <CheckCircle size={12} />
              RESULTS
            </button>
          )}

          {/* Re-scan button for already scanned docs */}
          {onScan && document.scan_status === 'scanned' && (
            <button
              onClick={onScan}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#dc2626',
                fontSize: '9px',
                fontFamily: mono,
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
              }}
            >
              <Zap size={10} />
              RE-SCAN
            </button>
          )}

          {document.scan_status === 'scanning' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontFamily: mono,
                color: '#dc2626',
              }}
            >
              <Loader2 size={12} className="animate-spin" />
              SCANNING
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
