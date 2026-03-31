'use client';

import { useEffect, useState, useRef } from 'react';
import { useViewModeStore, LENS_CONFIGS } from '@/store/viewModeStore';

// ═══════════════════════════════════════════
// LENS TRANSITION FLASH — Sprint 7.5
// Lens değiştiğinde ekran kenarında renk flash'ı
// 300ms'lik "bir şey oldu" sinyali
// Aksiyon → Tepki döngüsü (< 300ms feedback)
// ═══════════════════════════════════════════

export default function LensTransitionFlash() {
  const activeMode = useViewModeStore(s => s.activeMode);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevModeRef = useRef(activeMode);

  useEffect(() => {
    // İlk render'da flash gösterme
    if (prevModeRef.current === activeMode) return;
    prevModeRef.current = activeMode;

    const lens = LENS_CONFIGS.find(l => l.id === activeMode);
    if (!lens) return;

    setFlashColor(lens.color);

    const timer = setTimeout(() => setFlashColor(null), 500);
    return () => clearTimeout(timer);
  }, [activeMode]);

  if (!flashColor) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 45,
        pointerEvents: 'none',
        boxShadow: `inset 0 0 120px 40px ${flashColor}25`,
        animation: 'lensFlash 0.5s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes lensFlash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
