'use client';

import { Brain, DollarSign, Heart, Lightbulb, Shield, Files, RefreshCw, Crosshair } from 'lucide-react';

export interface ActionButtonGridProps {
  isBoardMode: boolean;
  onDocSubmit: () => void;
  onMoneyTracker: () => void;
  onSystemPulse: () => void;
  onIsikTut: () => void;
  onDMS: () => void;
  onCollectiveShield: () => void;
  onDocArchive: () => void;
  onInvestigate: () => void;
  onReset: () => void;
}

export function ActionButtonGrid({
  isBoardMode,
  onDocSubmit,
  onMoneyTracker,
  onSystemPulse,
  onIsikTut,
  onDMS,
  onCollectiveShield,
  onDocArchive,
  onInvestigate,
  onReset,
}: ActionButtonGridProps) {
  return (
    <>
      {/* ANALYZE DOC — hidden in board mode */}
      {!isBoardMode && (
        <button
          data-tour="toolbar-area"
          onClick={onDocSubmit}
          style={{
            position: 'absolute',
            bottom: '2rem',
            right: '6rem',
            padding: '12px 16px',
            backgroundColor: '#7f1d1d',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            color: '#fecaca',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <Brain size={16} />
          ANALYZE DOC
        </button>
      )}

      {/* FOLLOW THE MONEY — hidden in board mode */}
      {!isBoardMode && (
        <button
          onClick={onMoneyTracker}
          style={{
            position: 'absolute',
            bottom: '6rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #22c55e50',
            borderRadius: '4px',
            color: '#22c55e',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <DollarSign size={16} />
          FOLLOW THE MONEY
        </button>
      )}

      {/* SYSTEM PULSE — hidden in board mode */}
      {!isBoardMode && (
        <button
          onClick={onSystemPulse}
          style={{
            position: 'absolute',
            bottom: '10rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #dc262650',
            borderRadius: '4px',
            color: '#dc2626',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <Heart size={16} />
          SYSTEM PULSE
        </button>
      )}

      {/* SPOTLIGHT — hidden in board mode */}
      {!isBoardMode && (
        <button
          onClick={onIsikTut}
          style={{
            position: 'absolute',
            bottom: '14rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #fbbf2450',
            borderRadius: '4px',
            color: '#fbbf24',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <Lightbulb size={16} />
          SPOTLIGHT
        </button>
      )}

      {/* JOURNALIST SHIELD (DMS) — hidden in board mode */}
      {!isBoardMode && (
        <button
          data-tour="journalist-shield"
          onClick={onDMS}
          style={{
            position: 'absolute',
            bottom: '18rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #8b5cf650',
            borderRadius: '4px',
            color: '#8b5cf6',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <Shield size={16} />
          JOURNALIST SHIELD
        </button>
      )}

      {/* COLLECTIVE SHIELD — hidden in board mode, Tier 2+ required */}
      {!isBoardMode && (
        <button
          disabled
          title="This feature will be available soon (Tier 2+ required)"
          onClick={onCollectiveShield}
          style={{
            position: 'absolute',
            bottom: '22rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #dc262630',
            color: '#dc2626',
            cursor: 'not-allowed',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            opacity: 0.5,
          }}
        >
          <Shield size={16} />
          COLLECTIVE SHIELD
        </button>
      )}

      {/* INVESTIGATE — Sprint G1 Gamified Investigation */}
      {!isBoardMode && (
        <button
          onClick={onInvestigate}
          style={{
            position: 'absolute',
            bottom: '30rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            borderRadius: '4px',
            color: '#dc2626',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
            e.currentTarget.style.borderColor = '#dc2626';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0a0a0a';
            e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Crosshair size={14} />
          INVESTIGATE
        </button>
      )}

      {/* DOCUMENT ARCHIVE — hidden in board mode */}
      {!isBoardMode && (
        <button
          onClick={onDocArchive}
          style={{
            position: 'absolute',
            bottom: '26rem',
            right: '2rem',
            padding: '10px 16px',
            backgroundColor: '#0a0a0a',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            color: '#60a5fa',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0a0a0a';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
        >
          <Files size={14} />
          DOCUMENT ARCHIVE
        </button>
      )}

      {/* RESET */}
      <button
        onClick={onReset}
        style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2rem',
          padding: '12px',
          backgroundColor: '#0a0a0a',
          border: '1px solid #991b1b50',
          borderRadius: '4px',
          color: '#991b1b',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <RefreshCw size={18} />
      </button>
    </>
  );
}
