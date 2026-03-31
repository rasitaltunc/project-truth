'use client';

import { useLinkEvidenceStore, EvidencePulse } from '@/store/linkEvidenceStore';
import { useTunnelStore } from '@/store/tunnelStore';
import { X, ArrowLeftRight, Calendar, FileText, Eye } from 'lucide-react';
import React from 'react';

export interface LinkDetailPanelProps {
  activeLinkDetail: {
    sourceId: string;
    targetId: string;
    sourceLabel: string;
    targetLabel: string;
    label?: string;
    type?: string;
  };
  nodes: any[];
  onClose: () => void;
  onNodeClick: (node: any) => void;
}

export function LinkDetailPanel({
  activeLinkDetail,
  nodes,
  onClose,
  onNodeClick,
}: LinkDetailPanelProps) {
  const linkEvidenceData = useLinkEvidenceStore((state) => state.data);

  if (!activeLinkDetail) return null;

  const handleSourceNodeClick = () => {
    const sourceNode = nodes.find((n) => n.id === activeLinkDetail.sourceId);
    if (sourceNode) {
      onClose();
      onNodeClick(sourceNode);
    }
  };

  const handleTargetNodeClick = () => {
    const targetNode = nodes.find((n) => n.id === activeLinkDetail.targetId);
    if (targetNode) {
      onClose();
      onNodeClick(targetNode);
    }
  };

  const handleEnterTunnel = () => {
    if (!activeLinkDetail || !linkEvidenceData) return;
    useTunnelStore.getState().enterTunnel({
      sourceId: activeLinkDetail.sourceId,
      targetId: activeLinkDetail.targetId,
      sourceLabel: activeLinkDetail.sourceLabel,
      targetLabel: activeLinkDetail.targetLabel,
      linkData: linkEvidenceData,
      theme: 'evidence',
    });
  };

  const typeColors: Record<string, string> = {
    court_record: '#ef4444',
    financial_record: '#f59e0b',
    witness_testimony: '#8b5cf6',
    news_major: '#3b82f6',
    official_document: '#10b981',
    leaked_document: '#ec4899',
    photograph: '#06b6d4',
    social_media: '#a855f7',
    intelligence_report: '#f97316',
  };

  const typeLabels: Record<string, string> = {
    court_record: 'COURT',
    financial_record: 'FINANCIAL',
    witness_testimony: 'TESTIMONY',
    news_major: 'NEWS',
    official_document: 'OFFICIAL',
    leaked_document: 'LEAKED',
    photograph: 'PHOTO',
    social_media: 'SOCIAL',
    intelligence_report: 'INTELLIGENCE',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '360px',
        zIndex: 90,
        backgroundColor: 'rgba(5, 5, 5, 0.95)',
        borderLeft: '1px solid #dc2626',
        backdropFilter: 'blur(12px)',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.5s ease-out',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.3); }
            50% { box-shadow: 0 0 20px rgba(220,38,38,0.6); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #7f1d1d40',
          background: 'linear-gradient(180deg, #1a050580, transparent)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeftRight size={16} style={{ color: '#dc2626' }} />
            <span
              style={{
                fontSize: '10px',
                color: '#dc2626',
                letterSpacing: '0.2em',
                fontWeight: 700,
              }}
            >
              CONNECTION ANALYSIS
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: '9px', color: '#6b728080', letterSpacing: '0.1em' }}>
          Close with ESC • Click on people → Open file
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Source Person */}
        <div
          onClick={handleSourceNodeClick}
          style={{
            padding: '16px',
            backgroundColor: '#0f0f0f',
            border: '1px solid #7f1d1d40',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '0',
            animation: 'fadeInUp 0.4s ease 0.2s both',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#dc2626';
            e.currentTarget.style.backgroundColor = '#1a0808';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(127,29,29,0.25)';
            e.currentTarget.style.backgroundColor = '#0f0f0f';
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: '#dc2626',
              letterSpacing: '0.15em',
              marginBottom: '6px',
            }}
          >
            PERSON 1
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
            {activeLinkDetail.sourceLabel}
          </div>
          <div
            style={{
              fontSize: '9px',
              color: '#6b7280',
              marginTop: '4px',
              letterSpacing: '0.1em',
            }}
          >
            CLICK → OPEN FILE
          </div>
        </div>

        {/* Connection indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 0',
            animation: 'fadeInUp 0.4s ease 0.35s both',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#dc262640' }} />
          <div
            style={{
              padding: '6px 14px',
              border: '1px solid #dc262660',
              fontSize: '9px',
              color: '#fca5a5',
              letterSpacing: '0.15em',
              animation: 'pulseGlow 2s ease-in-out infinite',
            }}
          >
            CONNECTION
          </div>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#dc262640' }} />
        </div>

        {/* Target Person */}
        <div
          onClick={handleTargetNodeClick}
          style={{
            padding: '16px',
            backgroundColor: '#0f0f0f',
            border: '1px solid #7f1d1d40',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '20px',
            animation: 'fadeInUp 0.4s ease 0.5s both',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#dc2626';
            e.currentTarget.style.backgroundColor = '#1a0808';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(127,29,29,0.25)';
            e.currentTarget.style.backgroundColor = '#0f0f0f';
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: '#dc2626',
              letterSpacing: '0.15em',
              marginBottom: '6px',
            }}
          >
            PERSON 2
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
            {activeLinkDetail.targetLabel}
          </div>
          <div
            style={{
              fontSize: '9px',
              color: '#6b7280',
              marginTop: '4px',
              letterSpacing: '0.1em',
            }}
          >
            CLICK → OPEN FILE
          </div>
        </div>

        {/* Relationship Details */}
        {activeLinkDetail.label && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#0a0505',
              border: '1px solid #7f1d1d20',
              marginBottom: '16px',
              animation: 'fadeInUp 0.4s ease 0.65s both',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#991b1b',
                letterSpacing: '0.15em',
                marginBottom: '8px',
              }}
            >
              RELATIONSHIP DETAILS
            </div>
            <div style={{ fontSize: '13px', color: '#e5e5e5', lineHeight: 1.6 }}>
              {activeLinkDetail.label}
            </div>
          </div>
        )}

        {activeLinkDetail.type && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#7f1d1d15',
              border: '1px solid #7f1d1d30',
              fontSize: '10px',
              color: '#fca5a5',
              letterSpacing: '0.1em',
              animation: 'fadeInUp 0.4s ease 0.8s both',
            }}
          >
            <FileText size={10} />
            {activeLinkDetail.type.toUpperCase()}
          </div>
        )}

        {/* Timeline — real evidence data from linkEvidenceStore */}
        <div
          style={{
            marginTop: '24px',
            animation: 'fadeInUp 0.4s ease 0.95s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '0 2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} style={{ color: '#991b1b' }} />
              <span
                style={{
                  fontSize: '9px',
                  color: '#991b1b',
                  letterSpacing: '0.15em',
                }}
              >
                TIMELINE
              </span>
            </div>
            {linkEvidenceData && linkEvidenceData.totalCount > 0 && (
              <span
                style={{
                  fontSize: '9px',
                  color: '#dc2626',
                  letterSpacing: '0.1em',
                }}
              >
                {linkEvidenceData.totalCount} EVIDENCE
              </span>
            )}
          </div>

          {/* Loading state */}
          {useLinkEvidenceStore.getState().loading && (
            <div
              style={{
                padding: '16px',
                border: '1px dashed #7f1d1d30',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  letterSpacing: '0.1em',
                }}
              >
                LOADING...
              </div>
            </div>
          )}

          {/* Empty state */}
          {!useLinkEvidenceStore.getState().loading &&
            (!linkEvidenceData || linkEvidenceData.totalCount === 0) && (
              <div
                style={{
                  padding: '16px',
                  border: '1px dashed #7f1d1d30',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: '#6b728060',
                    lineHeight: 1.5,
                  }}
                >
                  No evidence timeline has been created for this connection yet.
                </div>
              </div>
            )}

          {/* Date range bar */}
          {linkEvidenceData && linkEvidenceData.dateRange && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                backgroundColor: '#0a0505',
                border: '1px solid #7f1d1d20',
                marginBottom: '2px',
                fontSize: '9px',
                color: '#6b7280',
                letterSpacing: '0.08em',
              }}
            >
              <span>{new Date(linkEvidenceData.dateRange.earliest).getFullYear()}</span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  margin: '0 10px',
                  background:
                    'linear-gradient(90deg, #dc262640, #dc2626, #dc262640)',
                }}
              />
              <span>{new Date(linkEvidenceData.dateRange.latest).getFullYear()}</span>
            </div>
          )}

          {/* Evidence timeline entries */}
          {linkEvidenceData && linkEvidenceData.evidences.length > 0 && (
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              {/* Vertical timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '7px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: 'linear-gradient(180deg, #dc262680, #dc262620)',
                }}
              />

              {linkEvidenceData.evidences.map((ev: EvidencePulse, idx: number) => {
                const dotColor = typeColors[ev.evidenceType] || '#6b7280';
                const year = ev.eventDate
                  ? new Date(ev.eventDate).getFullYear()
                  : '?';
                const monthDay =
                  ev.eventDate && ev.datePrecision === 'day'
                    ? new Date(ev.eventDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ev.eventDate && ev.datePrecision === 'month'
                      ? new Date(ev.eventDate).toLocaleDateString('tr-TR', {
                          month: 'short',
                        })
                      : '';

                return (
                  <div
                    key={ev.timelineId || idx}
                    style={{
                      position: 'relative',
                      paddingBottom:
                        idx === linkEvidenceData.evidences.length - 1
                          ? '4px'
                          : '16px',
                      animation: `fadeInUp 0.3s ease ${0.1 * idx}s both`,
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-17px',
                        top: '6px',
                        width: ev.isKeystone ? '12px' : '8px',
                        height: ev.isKeystone ? '12px' : '8px',
                        borderRadius: '50%',
                        backgroundColor: ev.isKeystone ? '#f59e0b' : dotColor,
                        border: ev.isKeystone
                          ? '2px solid #fbbf24'
                          : `2px solid ${dotColor}40`,
                        boxShadow: ev.isKeystone
                          ? '0 0 8px rgba(245,158,11,0.6)'
                          : `0 0 4px ${dotColor}40`,
                        transition: 'all 0.3s ease',
                      }}
                    />

                    {/* Event card */}
                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: ev.isKeystone ? '#1a130805' : '#0a0505',
                        border: `1px solid ${
                          ev.isKeystone ? '#f59e0b30' : '#7f1d1d20'
                        }`,
                        transition: 'border-color 0.3s ease',
                        cursor: 'default',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = ev.isKeystone
                          ? '#f59e0b60'
                          : '#dc262640';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = ev.isKeystone
                          ? '#f59e0b30'
                          : '#7f1d1d20';
                      }}
                    >
                      {/* Date + Type badge row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#e5e5e5', fontWeight: 700 }}>
                          {year}
                        </span>
                        {monthDay && (
                          <span style={{ fontSize: '9px', color: '#6b7280' }}>
                            {monthDay}
                          </span>
                        )}
                        <div
                          style={{
                            marginLeft: 'auto',
                            padding: '2px 6px',
                            backgroundColor: `${dotColor}15`,
                            border: `1px solid ${dotColor}30`,
                            fontSize: '7px',
                            color: dotColor,
                            letterSpacing: '0.12em',
                          }}
                        >
                          {typeLabels[ev.evidenceType] ||
                            ev.evidenceType.toUpperCase()}
                        </div>
                        {ev.isKeystone && (
                          <span style={{ fontSize: '10px' }} title="Kilit Olay">
                            ⭐
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#e5e5e5',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          marginBottom: ev.summary ? '4px' : '0',
                        }}
                      >
                        {ev.title}
                      </div>

                      {/* Summary */}
                      {ev.summary && (
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            lineHeight: 1.5,
                          }}
                        >
                          {ev.summary}
                        </div>
                      )}

                      {/* Confidence bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: '2px',
                            backgroundColor: '#ffffff08',
                            borderRadius: '1px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${ev.confidence * 100}%`,
                              height: '100%',
                              backgroundColor:
                                ev.confidence > 0.7
                                  ? '#22c55e'
                                  : ev.confidence > 0.4
                                    ? '#f59e0b'
                                    : '#ef4444',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '8px',
                            letterSpacing: '0.08em',
                            color:
                              ev.verificationStatus === 'verified'
                                ? '#22c55e'
                                : ev.verificationStatus === 'credible'
                                  ? '#f59e0b'
                                  : '#6b7280',
                          }}
                        >
                          {ev.verificationStatus === 'verified'
                            ? 'VERIFIED'
                            : ev.verificationStatus === 'credible'
                              ? 'CREDIBLE'
                              : ev.verificationStatus === 'disputed'
                                ? 'DISPUTED'
                                : 'PENDING'}
                        </span>
                      </div>

                      {/* Source */}
                      {ev.sourceName && (
                        <div
                          style={{
                            fontSize: '8px',
                            color: '#4b5563',
                            marginTop: '4px',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {ev.sourceUrl ? (
                            <a
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#6b7280',
                                textDecoration: 'none',
                                borderBottom: '1px dotted #6b728040',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.color = '#dc2626';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.color = '#6b7280';
                              }}
                            >
                              ↗ {ev.sourceName}
                            </a>
                          ) : (
                            <span>📄 {ev.sourceName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Keystone count footer */}
          {linkEvidenceData && linkEvidenceData.keystoneCount > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 10px',
                backgroundColor: '#f59e0b08',
                border: '1px solid #f59e0b15',
                fontSize: '9px',
                color: '#f59e0b',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⭐ {linkEvidenceData.keystoneCount} KEYSTONE EVENTS DETECTED
            </div>
          )}

          {/* Sprint 14A: SIMULATION TUNNEL button */}
          {linkEvidenceData && linkEvidenceData.totalCount >= 2 && (
            <button
              onClick={handleEnterTunnel}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: '#dc262608',
                border: '1px solid #dc262640',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#dc262620';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc262608';
                e.currentTarget.style.borderColor = '#dc262640';
              }}
            >
              <Eye size={14} style={{ color: '#dc2626' }} />
              <span
                style={{
                  fontSize: '9px',
                  color: '#dc2626',
                  letterSpacing: '0.2em',
                  fontWeight: 700,
                }}
              >
                SIMULATION TUNNEL
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #7f1d1d20',
          fontSize: '9px',
          color: '#6b728040',
          textAlign: 'center',
          letterSpacing: '0.1em',
        }}
      >
        PROJECT TRUTH // CONNECTION ANALYSIS
      </div>
    </div>
  );
}
