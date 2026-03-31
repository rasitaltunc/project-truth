'use client';

// ============================================
// SPRINT 5: GÜNÜN SORUSU BANNER
// Açılışta gösterilir — bugün araştırılacak soru
// Tıklayınca chat'e soruyu gönderir
// ============================================

import { useEffect } from 'react';
import { useNodeStatsStore } from '@/store/nodeStatsStore';

interface Props {
  networkId?: string;
  onAsk: (question: string, targetNodeId?: string | null) => void;
}

export default function DailyQuestionBanner({ networkId, onAsk }: Props) {
  const { dailyQuestion, fetchDailyQuestion, incrementDailyAnswered } = useNodeStatsStore();

  useEffect(() => {
    fetchDailyQuestion(networkId);
  }, [networkId]);

  if (!dailyQuestion) return null;

  const handleAsk = () => {
    incrementDailyAnswered(networkId);
    onAsk(dailyQuestion.question, dailyQuestion.targetNodeId);
  };

  return (
    <div style={{
      borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
      marginBottom: '8px',
      paddingBottom: '12px',
    }}>
      {/* Etiket */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          fontSize: '9px',
          letterSpacing: '0.35em',
          color: '#dc2626',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
        }}>
          🔥 GÜNÜN SORUSU
        </div>
        {dailyQuestion.answeredCount > 0 && (
          <div style={{
            fontSize: '9px',
            color: '#6b7280',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {dailyQuestion.answeredCount} kişi sordu
          </div>
        )}
      </div>

      {/* Soru */}
      <div style={{
        fontSize: '11px',
        color: '#e5e5e5',
        fontFamily: 'ui-monospace, monospace',
        lineHeight: 1.6,
        marginBottom: '10px',
        padding: '8px',
        background: 'rgba(127, 29, 29, 0.08)',
        border: '1px solid rgba(220, 38, 38, 0.1)',
        borderLeft: '2px solid #dc2626',
      }}>
        "{dailyQuestion.question}"
        {dailyQuestion.targetNodeName && (
          <span style={{ color: '#9ca3af' }}> — {dailyQuestion.targetNodeName}</span>
        )}
      </div>

      {/* Buton */}
      <button
        onClick={handleAsk}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(220, 38, 38, 0.12)',
          border: '1px solid rgba(220, 38, 38, 0.35)',
          color: '#fca5a5',
          fontSize: '10px',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.2em',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.22)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.12)';
        }}
      >
        BU SORUYU SOR →
      </button>
    </div>
  );
}
