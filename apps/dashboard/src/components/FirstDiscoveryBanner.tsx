'use client';

// ============================================
// SPRINT 5: İLK KEŞFEDENi BANNER
// Metin2 boss-kill tarzı — full-screen anlık bildirim
// Bir node ilk kez sorgulandığında tetiklenir
// ============================================

import { useEffect, useState } from 'react';

interface Props {
  nodeName: string;
  onDismiss: () => void;
}

export default function FirstDiscoveryBanner({ nodeName, onDismiss }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Giriş animasyonu: 500ms
    const enterTimer = setTimeout(() => setPhase('hold'), 500);
    // Tutma: 3 saniye
    const holdTimer = setTimeout(() => setPhase('exit'), 3500);
    // Çıkış: 600ms
    const exitTimer = setTimeout(() => onDismiss(), 4100);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onDismiss]);

  const scaleStyle = phase === 'enter'
    ? 'scale(0.3) translateY(-40px)'
    : phase === 'hold'
    ? 'scale(1) translateY(0)'
    : 'scale(0.9) translateY(-30px)';

  const opacityStyle = phase === 'exit' ? 0 : 1;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '32px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          transform: scaleStyle,
          opacity: opacityStyle,
          transition: phase === 'enter'
            ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease'
            : phase === 'exit'
            ? 'transform 0.6s ease-in, opacity 0.6s ease-in'
            : 'none',
          background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 40%, #991b1b 70%, #7f1d1d 100%)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          borderBottom: '3px solid #ef4444',
          padding: '20px 40px',
          minWidth: '400px',
          maxWidth: '640px',
          textAlign: 'center',
          boxShadow: '0 8px 60px rgba(220, 38, 38, 0.6), 0 0 120px rgba(220, 38, 38, 0.2)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* Üst etiket */}
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.4em',
          color: '#fca5a5',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: '10px',
          fontWeight: 700,
        }}>
          ⚡ İLK KEŞİF ⚡
        </div>

        {/* Ana mesaj */}
        <div style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.03em',
          lineHeight: 1.4,
          marginBottom: '12px',
        }}>
          <span style={{ color: '#fca5a5' }}>"{nodeName}"</span>
          <br />
          düğümünü ilk siz sorgulattınız!
        </div>

        {/* Rozet */}
        <div style={{
          fontSize: '12px',
          color: '#fde68a',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.2em',
          fontWeight: 600,
        }}>
          🏆 KEŞİF ROZETİ KAZANDINIZ
        </div>

        {/* Alt ince çizgi dekorasyon */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #ef4444, #fca5a5, #ef4444, transparent)',
          animation: 'none',
        }} />
      </div>
    </div>
  );
}
