'use client';

import { useEffect, useRef } from 'react';
import { X, FileText, Calendar, BookOpen, ChevronRight } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

interface StoryPanelProps {
  nodes: any[];
  onNodeClick?: (nodeId: string) => void;
}

export default function StoryPanel({ nodes, onNodeClick }: StoryPanelProps) {
  const { messages, highlightedNodeIds, clearHighlights } = useChatStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Get the last AI message with highlights
  const lastAiMessage = [...messages].reverse().find(
    m => m.role === 'assistant' && m.highlightNodeIds && m.highlightNodeIds.length > 0
  );

  // Don't show if no highlights
  if (!lastAiMessage || highlightedNodeIds.length === 0) return null;

  // Get highlighted node data
  const highlightedNodes = highlightedNodeIds
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean);

  // Collect all evidence and timeline from highlighted nodes
  const allEvidence = highlightedNodes.flatMap(n => (n?.evidence || []).map((e: any) => ({ ...e, nodeName: n.label })));
  const allTimeline = highlightedNodes
    .flatMap(n => (n?.timeline || []).map((t: any) => ({ ...t, nodeName: n.label })))
    .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));

  return (
    <>
      <style>{`
        @keyframes slideInRight2 {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .story-scrollbar::-webkit-scrollbar { width: 4px; }
        .story-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .story-scrollbar::-webkit-scrollbar-thumb { background: #7f1d1d40; border-radius: 2px; }
      `}</style>

      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '340px',
          zIndex: 70,
          backgroundColor: 'rgba(5, 5, 5, 0.95)',
          borderLeft: '1px solid #7f1d1d40',
          backdropFilter: 'blur(16px)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight2 0.4s ease-out',
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #7f1d1d40',
          background: 'linear-gradient(180deg, #1a050580, transparent)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={16} style={{ color: '#dc2626' }} />
              <span style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.2em', fontWeight: 700 }}>
                FILE
              </span>
            </div>
            <button
              onClick={clearHighlights}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: '9px', color: '#6b728060', letterSpacing: '0.1em', marginTop: '6px' }}>
            {highlightedNodes.length} person/organization highlighted
          </div>
        </div>

        {/* CONTENT */}
        <div
          className="story-scrollbar"
          style={{ flex: 1, overflow: 'auto', padding: '16px' }}
        >
          {/* HIGHLIGHTED NODES */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em', marginBottom: '8px' }}>
              HIGHLIGHTED NODES
            </div>
            {highlightedNodes.map((node: any) => (
              <div
                key={node.id}
                onClick={() => onNodeClick?.(node.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '6px',
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #7f1d1d20',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#dc262660';
                  e.currentTarget.style.backgroundColor = '#1a0808';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127,29,29,0.12)';
                  e.currentTarget.style.backgroundColor = '#0f0f0f';
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e5e5' }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px', letterSpacing: '0.05em' }}>
                    {(node.type || 'person').toUpperCase()} • {node.occupation || node.role || ''}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: '#6b728040' }} />
              </div>
            ))}
          </div>

          {/* EVIDENCE */}
          {allEvidence.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em', marginBottom: '8px',
              }}>
                <FileText size={12} />
                EVIDENCE ({allEvidence.length})
              </div>
              {allEvidence.slice(0, 8).map((ev: any, i: number) => (
                <div
                  key={ev.id || i}
                  style={{
                    padding: '8px 10px',
                    marginBottom: '4px',
                    backgroundColor: '#0a0a0a',
                    borderLeft: `2px solid ${
                      ev.verification_status === 'verified' ? '#22c55e' :
                      ev.verification_status === 'pending' ? '#fbbf24' : '#dc262640'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d4d4d4', lineHeight: 1.4 }}>
                    {ev.title}
                  </div>
                  <div style={{
                    display: 'flex', gap: '8px', marginTop: '4px',
                    fontSize: '9px', color: '#6b728080',
                  }}>
                    <span>{ev.evidence_type}</span>
                    <span>•</span>
                    <span>{ev.nodeName}</span>
                    {ev.source_date && <><span>•</span><span>{ev.source_date}</span></>}
                  </div>
                </div>
              ))}
              {allEvidence.length > 8 && (
                <div style={{ fontSize: '10px', color: '#6b728060', padding: '4px 10px' }}>
                  +{allEvidence.length - 8} more evidence
                </div>
              )}
            </div>
          )}

          {/* TIMELINE */}
          {allTimeline.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em', marginBottom: '8px',
              }}>
                <Calendar size={12} />
                TIMELINE ({allTimeline.length})
              </div>
              {allTimeline.slice(0, 10).map((ev: any, i: number) => (
                <div
                  key={ev.id || i}
                  style={{
                    padding: '6px 10px',
                    marginBottom: '4px',
                    display: 'flex',
                    gap: '10px',
                  }}
                >
                  <div style={{
                    fontSize: '9px', color: '#dc262680', whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums', minWidth: '72px',
                  }}>
                    {ev.event_date || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#d4d4d4', lineHeight: 1.3 }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '9px', color: '#6b728060', marginTop: '2px' }}>
                      {ev.nodeName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NO DATA FALLBACK */}
          {allEvidence.length === 0 && allTimeline.length === 0 && (
            <div style={{
              padding: '16px', border: '1px dashed #7f1d1d20',
              fontSize: '11px', color: '#6b728060', lineHeight: 1.5,
              textAlign: 'center',
            }}>
              Evidence and timeline data not yet added for highlighted nodes.
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #7f1d1d20',
          fontSize: '9px', color: '#6b728040', textAlign: 'center',
          letterSpacing: '0.1em',
        }}>
          PROJECT TRUTH // FILE PANEL
        </div>
      </div>
    </>
  );
}
