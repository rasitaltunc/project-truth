'use client';

// ═══════════════════════════════════════════
// BOARD TRANSITION — 3D ↔ 2D Geçiş Animasyonu
// Sprint 8: Soruşturma Panosu
// 3D'den 2D'ye geçerken perspective collapse efekti
// ═══════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useViewModeStore, ViewMode } from '@/store/viewModeStore';

export default function BoardTransition() {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'exiting'>('idle');
  const [prevMode, setPrevMode] = useState<ViewMode>('full_network');
  const activeMode = useViewModeStore(s => s.activeMode);

  useEffect(() => {
    // Board moduna giriyoruz
    if (activeMode === 'board' && prevMode !== 'board') {
      setPhase('entering');
      const timer = setTimeout(() => setPhase('idle'), 800);
      setPrevMode(activeMode);
      return () => clearTimeout(timer);
    }
    // Board modundan çıkıyoruz
    if (activeMode !== 'board' && prevMode === 'board') {
      setPhase('exiting');
      const timer = setTimeout(() => setPhase('idle'), 800);
      setPrevMode(activeMode);
      return () => clearTimeout(timer);
    }
    setPrevMode(activeMode);
  }, [activeMode, prevMode]);

  if (phase === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Perspective Collapse / Expand ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: phase === 'entering'
            ? 'radial-gradient(ellipse at center, transparent 0%, #080808 100%)'
            : 'radial-gradient(ellipse at center, #080808 0%, transparent 100%)',
          animation: phase === 'entering'
            ? 'boardTransitionIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'boardTransitionOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      />

      {/* ── Scan Line ── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #dc2626, transparent)',
          animation: phase === 'entering'
            ? 'scanDown 0.6s ease-out forwards'
            : 'scanUp 0.6s ease-out forwards',
          boxShadow: '0 0 20px #dc2626, 0 0 40px #dc262666',
        }}
      />

      {/* ── Mode Label ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'labelFadeInOut 0.8s ease-in-out forwards',
        }}
      >
        <div style={{
          fontSize: 10,
          color: '#dc2626',
          letterSpacing: '0.4em',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '0 0 10px #dc262688',
        }}>
          {phase === 'entering' ? '📌 INVESTIGATION BOARD' : '🌐 3D NETWORK MAP'}
        </div>
        <div style={{
          fontSize: 8,
          color: '#666',
          letterSpacing: '0.2em',
          fontFamily: 'ui-monospace, monospace',
          textAlign: 'center',
          marginTop: 6,
        }}>
          {phase === 'entering' ? 'MODE SWITCHING' : 'RETURNING'}
        </div>
      </div>

      <style>{`
        @keyframes boardTransitionIn {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes boardTransitionOut {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes scanDown {
          0% { top: 0; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scanUp {
          0% { top: 100%; opacity: 1; }
          100% { top: 0; opacity: 0; }
        }
        @keyframes labelFadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
