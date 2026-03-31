'use client';

// ============================================
// SPRINT 5: GAP ANALYSIS PANEL
// Hiç sorgulanmamış node'ları göster + AI önerileri
// ChatPanel'in boş durumunda render edilir
// ============================================

import { useEffect } from 'react';
import { useNodeStatsStore } from '@/store/nodeStatsStore';

interface Props {
  networkId?: string;
  onSuggestionClick: (suggestion: string) => void;
}

const tierLabel: Record<string, string> = {
  tier0: 'KINGPIN',
  tier1: 'KEY PLAYER',
  tier2: 'PIVOT PLAYER',
  tier3: 'CONNECTED',
  tier4: 'PERIPHERAL',
  '0': 'KINGPIN',
  '1': 'KEY PLAYER',
  '2': 'PIVOT PLAYER',
  '3': 'CONNECTED',
  '4': 'PERIPHERAL',
};

export default function GapAnalysisPanel({ networkId, onSuggestionClick }: Props) {
  const { gapNodes, aiSuggestions, isLoadingGaps, fetchGapNodes } = useNodeStatsStore();

  useEffect(() => {
    fetchGapNodes(networkId);
  }, [networkId]);

  if (isLoadingGaps) {
    return (
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(220, 38, 38, 0.15)',
        marginTop: '8px',
      }}>
        <div style={{
          fontSize: '10px',
          color: '#6b7280',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.2em',
        }}>
          🔍 AĞ ANALİZ EDİLİYOR...
        </div>
      </div>
    );
  }

  // Tüm ağ tarandı
  if (gapNodes.length === 0 && aiSuggestions.length > 0 && aiSuggestions[0].includes('🏆')) {
    return (
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(220, 38, 38, 0.15)',
        marginTop: '8px',
      }}>
        <div style={{
          fontSize: '11px',
          color: '#fbbf24',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.15em',
          fontWeight: 700,
        }}>
          {aiSuggestions[0]}
        </div>
      </div>
    );
  }

  if (gapNodes.length === 0) return null;

  return (
    <div style={{
      borderTop: '1px solid rgba(220, 38, 38, 0.2)',
      marginTop: '8px',
      paddingTop: '12px',
    }}>
      {/* Başlık */}
      <div style={{
        fontSize: '9px',
        letterSpacing: '0.35em',
        color: '#dc2626',
        fontFamily: 'ui-monospace, monospace',
        fontWeight: 700,
        marginBottom: '10px',
        paddingLeft: '4px',
      }}>
        🔍 HENÜZ ARAŞTIRILMADI
      </div>

      {/* Gap node'ları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
        {gapNodes.slice(0, 5).map(node => (
          <button
            key={node.nodeId}
            onClick={() => onSuggestionClick(`${node.nodeName} kimdir ve bu ağdaki rolü nedir?`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(127, 29, 29, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.12)',
              borderLeft: '2px solid rgba(220, 38, 38, 0.3)',
              padding: '6px 10px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(127, 29, 29, 0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(127, 29, 29, 0.08)';
            }}
          >
            <div>
              <div style={{
                fontSize: '11px',
                color: '#e5e5e5',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
              }}>
                {node.nodeName}
              </div>
              <div style={{
                fontSize: '9px',
                color: '#6b7280',
                fontFamily: 'ui-monospace, monospace',
                marginTop: '1px',
              }}>
                {tierLabel[node.tier] ?? node.tier} · {node.connectionCount} bağlantı
              </div>
            </div>
            <div style={{
              fontSize: '9px',
              color: '#dc2626',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.1em',
              flexShrink: 0,
              marginLeft: '8px',
            }}>
              SOR →
            </div>
          </button>
        ))}
      </div>

      {/* AI Önerileri */}
      {aiSuggestions.length > 0 && (
        <>
          <div style={{
            fontSize: '9px',
            letterSpacing: '0.3em',
            color: '#991b1b',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            💡 AI ÖNERİLERİ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aiSuggestions.slice(0, 3).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                style={{
                  display: 'block',
                  background: 'rgba(153, 27, 27, 0.06)',
                  border: '1px solid rgba(220, 38, 38, 0.1)',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  color: '#d4d4d4',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, monospace',
                  lineHeight: 1.5,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(153, 27, 27, 0.16)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(153, 27, 27, 0.06)';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
