'use client';

// ============================================
// SPRINT 6B: PROVENANCE PANEL
// ArchiveModal'ın Kanıtlar tabında provenance detayı
// ============================================

import { useState, useEffect } from 'react';
import type { EvidenceProvenance, SourceHierarchy } from '@/lib/supabaseClient';

interface Props {
  evidenceId: string;
  isOpen: boolean;
  onToggle: () => void;
}

const SOURCE_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  court_record: { icon: '📜', label: 'Court Record' },
  official_document: { icon: '📄', label: 'Official Document' },
  leaked_document: { icon: '🔓', label: 'Leaked Document' },
  financial_record: { icon: '💰', label: 'Financial Record' },
  witness_testimony: { icon: '👤', label: 'Witness Testimony' },
  news_major: { icon: '📰', label: 'Mainstream News' },
  news_minor: { icon: '📰', label: 'Local News' },
  academic_paper: { icon: '🔬', label: 'Academic Paper' },
  social_media: { icon: '📱', label: 'Social Media' },
  rumor: { icon: '❓', label: 'Rumor' },
};

const HIERARCHY_LABELS: Record<SourceHierarchy, { icon: string; label: string; color: string }> = {
  primary: { icon: '🏛️', label: 'Birincil', color: '#22c55e' },
  secondary: { icon: '📰', label: 'İkincil', color: '#f59e0b' },
  tertiary: { icon: '💬', label: 'Üçüncül', color: '#ef4444' },
};

export default function ProvenancePanel({ evidenceId, isOpen, onToggle }: Props) {
  const [provenance, setProvenance] = useState<EvidenceProvenance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && evidenceId) {
      setLoading(true);
      fetch(`/api/evidence/provenance?evidence_id=${evidenceId}`)
        .then(r => r.json())
        .then(data => setProvenance(data.provenance || []))
        .catch(() => setProvenance([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, evidenceId]);

  return (
    <div style={{ marginTop: '4px' }}>
      <button
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          color: '#737373',
          cursor: 'pointer',
          fontSize: '10px',
          letterSpacing: '0.05em',
          padding: '2px 0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      >
        {isOpen ? '▼' : '▶'} KAYNAK PROVENANCE
      </button>

      {isOpen && (
        <div style={{
          background: 'rgba(10,10,10,0.8)',
          border: '1px solid #222',
          padding: '8px 10px',
          marginTop: '4px',
          fontSize: '11px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}>
          {loading && <div style={{ color: '#525252' }}>Yükleniyor...</div>}
          {!loading && provenance.length === 0 && (
            <div style={{ color: '#525252' }}>Henüz provenance kaydı yok</div>
          )}
          {provenance.map(p => {
            const sourceInfo = SOURCE_TYPE_LABELS[p.source_type] || { icon: '?', label: p.source_type };
            const hierarchyInfo = HIERARCHY_LABELS[p.source_hierarchy] || HIERARCHY_LABELS.tertiary;

            return (
              <div key={p.id} style={{
                padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{sourceInfo.icon}</span>
                  <span style={{ color: '#d4d4d4' }}>{sourceInfo.label}</span>
                  <span style={{
                    fontSize: '9px',
                    color: hierarchyInfo.color,
                    padding: '1px 4px',
                    border: `1px solid ${hierarchyInfo.color}40`,
                    borderRadius: '2px',
                  }}>
                    {hierarchyInfo.icon} {hierarchyInfo.label}
                  </span>
                </div>

                {p.source_url && (
                  <div style={{ marginTop: '3px', fontSize: '10px' }}>
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {p.source_url.length > 60 ? p.source_url.slice(0, 60) + '...' : p.source_url}
                    </a>
                  </div>
                )}

                {p.source_hash && (
                  <div style={{ marginTop: '2px', fontSize: '9px', color: '#525252' }}>
                    SHA-256: {p.source_hash.slice(0, 16)}...
                  </div>
                )}

                {p.verification_chain && p.verification_chain.length > 0 && (
                  <div style={{ marginTop: '4px', paddingLeft: '12px', borderLeft: '2px solid #333' }}>
                    {p.verification_chain.map((vc, i) => (
                      <div key={i} style={{ fontSize: '9px', color: vc.action === 'verify' ? '#22c55e' : '#ef4444', marginTop: '2px' }}>
                        {vc.action === 'verify' ? '✓' : '✗'} {new Date(vc.timestamp).toLocaleDateString('tr-TR')}
                        {vc.method && <span style={{ color: '#525252' }}> — {vc.method}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
