'use client';

// ============================================
// SPRINT 6B: EPİSTEMOLOJİK LEGEND (Gösterge Paneli)
// Sol alt köşe overlay — görsel ontoloji açıklaması
// ============================================

import { useState } from 'react';
import { EVIDENCE_TYPE_CONFIG, EVIDENCE_TYPE_ORDER } from '@/store/linkFilterStore';

interface Props {
  epistemologicalMode: boolean;
  onToggle: () => void;
  chatOpen?: boolean;
}

// Derive legend items from the single source of truth (linkFilterStore)
const EVIDENCE_TYPES = EVIDENCE_TYPE_ORDER.map(key => ({
  key,
  label: EVIDENCE_TYPE_CONFIG[key]?.labelTR ?? key,
  icon: EVIDENCE_TYPE_CONFIG[key]?.icon ?? '•',
  color: EVIDENCE_TYPE_CONFIG[key]?.color ?? '#525252',
}));

export default function EpistemologicalLegend({ epistemologicalMode, onToggle, chatOpen }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (chatOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      zIndex: 1000,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    }}>
      {/* Toggle butonu */}
      <button
        onClick={onToggle}
        style={{
          background: epistemologicalMode
            ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(59,130,246,0.2))'
            : 'rgba(20,20,20,0.85)',
          border: `1px solid ${epistemologicalMode ? '#22c55e' : '#333'}`,
          color: epistemologicalMode ? '#22c55e' : '#737373',
          padding: '6px 12px',
          fontSize: '11px',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: epistemologicalMode ? '#22c55e' : '#525252',
          boxShadow: epistemologicalMode ? '0 0 6px #22c55e' : 'none',
          transition: 'all 0.3s',
        }} />
        EPISTEMOLOGICAL MODE
      </button>

      {/* Expand/collapse */}
      {epistemologicalMode && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'rgba(20,20,20,0.85)',
            border: '1px solid #333',
            borderTop: 'none',
            color: '#737373',
            padding: '4px 12px',
            fontSize: '10px',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {expanded ? '▼ Hide Legend' : '▶ Show Legend'}
        </button>
      )}

      {/* Legend panel */}
      {epistemologicalMode && expanded && (
        <div style={{
          background: 'rgba(5,5,5,0.92)',
          border: '1px solid #333',
          borderTop: 'none',
          padding: '10px 12px',
          maxWidth: '260px',
        }}>
          {/* Çizgi kalınlığı açıklaması */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: '#737373', letterSpacing: '0.15em', marginBottom: '6px' }}>
              LINE THICKNESS — EVIDENCE COUNT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3' }}>
              <span style={{ width: 30, height: 1, background: '#555', display: 'inline-block' }} />
              <span>1-2 evidence</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3', marginTop: '3px' }}>
              <span style={{ width: 30, height: 2, background: '#888', display: 'inline-block' }} />
              <span>3-4 evidence</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3', marginTop: '3px' }}>
              <span style={{ width: 30, height: 3, background: '#bbb', display: 'inline-block' }} />
              <span>5+ evidence</span>
            </div>
          </div>

          {/* Çizgi stili açıklaması */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: '#737373', letterSpacing: '0.15em', marginBottom: '6px' }}>
              BRIGHTNESS — CONFIDENCE LEVEL
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3' }}>
              <span style={{ width: 30, height: 2, background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
              <span>Low (%0-30)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3', marginTop: '3px' }}>
              <span style={{ width: 30, height: 2, background: 'rgba(255,255,255,0.4)', display: 'inline-block' }} />
              <span>Medium (%30-70)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#a3a3a3', marginTop: '3px' }}>
              <span style={{ width: 30, height: 2, background: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
              <span>High (%70-100)</span>
            </div>
          </div>

          {/* Renk anahtarı */}
          <div>
            <div style={{ fontSize: '9px', color: '#737373', letterSpacing: '0.15em', marginBottom: '6px' }}>
              COLOR — EVIDENCE TYPE
            </div>
            {EVIDENCE_TYPES.map(et => (
              <div key={et.key} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '10px', color: '#a3a3a3', marginTop: '2px',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: et.color, display: 'inline-block',
                  boxShadow: `0 0 4px ${et.color}40`,
                }} />
                <span>{et.icon}</span>
                <span>{et.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
