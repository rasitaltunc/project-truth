'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTunnelStore } from '@/store/tunnelStore';
import { CORRIDOR_THEMES } from '@/shaders/tunnelShaders';

// ═══════════════════════════════════════════════════════════════
// SPRINT 14A — ANİMUS BOOT-UP SEKANSSI
// Simülasyon yükleniyor hissi: tarama çizgileri, typewriter,
// sistem mesajları, tema renk yüklemesi, hazır sinyali
// ═══════════════════════════════════════════════════════════════

// ── Sistem Mesajları ──
// Boot sırasında sırayla görünen terminal çıktıları
// Dinamik timing: mesaj uzunluğuna göre boşluk hesaplanır
const getBootMessages = (sourceLabel: string, targetLabel: string, themeName: string, evidenceCount: number) => {
  const charDuration = 0.025; // 25ms per character average
  let currentTime = 0;

  const messages = [
    { text: '> INITIALIZING SIMULATION ENGINE...', type: 'system' as const },
    { text: '> LOADING EVIDENCE ARCHIVE...', type: 'system' as const },
    { text: `> SUBJECTS: ${sourceLabel.toUpperCase()} ↔ ${targetLabel.toUpperCase()}`, type: 'data' as const },
    { text: `> EVIDENCE COUNT: ${evidenceCount} DOCUMENTS`, type: 'data' as const },
    { text: `> CORRIDOR MODE: ${themeName}`, type: 'theme' as const },
    { text: '> BUILDING SPATIAL ENVIRONMENT...', type: 'system' as const },
    { text: '> LOADING WIREFRAME GRID...', type: 'system' as const },
    { text: '> CALIBRATING LIGHT PARTICLES...', type: 'system' as const },
    { text: '> AUDIO SUBSYSTEM: STANDBY', type: 'system' as const },
    { text: '> SIMULATION READY', type: 'ready' as const },
  ];

  return messages.map(msg => {
    const time = currentTime;
    // Typewriter hızı: her karakter ~25ms, + 500ms buffer (mesaj tamamlanmasından sonra boşluk)
    currentTime += msg.text.length * charDuration + 0.5;
    return { time, ...msg };
  });
};

// ── Typewriter Efekti ──
function TypewriterText({ text, delay, type }: { text: string; delay: number; type: string }) {
  const [displayed, setDisplayed] = useState('');
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setCursor(false), 300);
        }
      }, 15 + Math.random() * 10); // Rastgele hız — terminal hissi
      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [text, delay]);

  const colorMap = {
    system: '#737373',
    data: '#fbbf24',
    theme: '#a78bfa',
    ready: '#4ade80',
  };

  return (
    <div style={{
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: colorMap[type as keyof typeof colorMap] || '#737373',
      letterSpacing: '0.05em',
      lineHeight: '1.6',
      opacity: displayed.length > 0 ? 1 : 0,
    }}>
      {displayed}
      {cursor && <span style={{ opacity: 0.7 }}>█</span>}
    </div>
  );
}

// ── Nabız Çizgisi Animasyonu ──
function PulseBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div style={{
      width: '100%',
      height: '2px',
      backgroundColor: '#1a1a1a',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '1px',
    }}>
      {/* İlerleme çubuğu */}
      <motion.div
        style={{
          height: '100%',
          backgroundColor: color,
          position: 'absolute',
          left: 0,
          top: 0,
        }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      {/* Nabız noktası */}
      <motion.div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          position: 'absolute',
          top: '-3px',
          boxShadow: `0 0 12px ${color}, 0 0 24px ${color}40`,
        }}
        animate={{ left: `${progress * 100}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

// ── Ana Boot Sequence Bileşeni ──
export default function TunnelBootSequence() {
  const phase = useTunnelStore(s => s.phase);
  const bootProgress = useTunnelStore(s => s.bootProgress);
  const sourceLabel = useTunnelStore(s => s.sourceLabel);
  const targetLabel = useTunnelStore(s => s.targetLabel);
  const theme = useTunnelStore(s => s.theme);
  const linkData = useTunnelStore(s => s.linkData);

  const isVisible = phase === 'zooming' || phase === 'booting';
  const themeConfig = CORRIDOR_THEMES[theme];
  const primaryColor = `rgb(${themeConfig.corridorColor.map(c => Math.round(c * 255)).join(',')})`;
  const accentColor = `rgb(${themeConfig.accentColor.map(c => Math.round(c * 255)).join(',')})`;

  const bootMessages = getBootMessages(
    sourceLabel || 'UNKNOWN',
    targetLabel || 'UNKNOWN',
    themeConfig.name,
    linkData?.totalCount || 0
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
          }}
        >
          {/* ── Üst: CLASSIFIED Etiketi ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              position: 'absolute',
              top: '40px',
              fontSize: '10px',
              letterSpacing: '0.4em',
              color: primaryColor,
              fontFamily: '"Courier New", monospace',
              textShadow: `0 0 10px ${primaryColor}40`,
            }}
          >
            ▣ CLASSIFIED // SIMULATION ENVIRONMENT ▣
          </motion.div>

          {/* ── Merkez: Ana Başlık ── */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8, type: 'spring', stiffness: 100 }}
            style={{
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            <div style={{
              fontSize: '9px',
              letterSpacing: '0.5em',
              color: '#525252',
              marginBottom: '8px',
              fontFamily: '"Courier New", monospace',
            }}>
              EVIDENCE CORRIDOR // SIMULATION v2.6
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.15em',
              textShadow: `0 0 40px ${primaryColor}60, 0 0 80px ${primaryColor}20`,
              lineHeight: 1.2,
            }}>
              {themeConfig.name}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#a3a3a3',
              marginTop: '8px',
              letterSpacing: '0.1em',
            }}>
              {sourceLabel} ↔ {targetLabel}
            </div>
          </motion.div>

          {/* ── Terminal Çıktısı ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              width: '400px',
              maxWidth: '90vw',
              padding: '16px 20px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              border: `1px solid ${primaryColor}30`,
              borderRadius: '4px',
              marginBottom: '24px',
            }}
          >
            {bootMessages.map((msg, i) => (
              <TypewriterText
                key={i}
                text={msg.text}
                delay={msg.time + 0.8} // Ana gecikme + mesaj gecikmesi
                type={msg.type}
              />
            ))}
          </motion.div>

          {/* ── İlerleme Çubuğu ── */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '300px' }}
            transition={{ delay: 1.0, duration: 0.5 }}
            style={{ maxWidth: '80vw' }}
          >
            <PulseBar progress={bootProgress} color={primaryColor} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              fontFamily: '"Courier New", monospace',
              color: '#525252',
              letterSpacing: '0.1em',
            }}>
              <span>LOADING ENVIRONMENT</span>
              <span style={{ color: bootProgress >= 1 ? '#4ade80' : '#525252' }}>
                {Math.round(bootProgress * 100)}%
              </span>
            </div>
          </motion.div>

          {/* ── Alt: Tarama Çizgileri (CRT efekti) ── */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            )`,
            pointerEvents: 'none',
          }} />

          {/* ── Kenar Vignette ── */}
          <div style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 150px rgba(0,0,0,0.9), inset 0 0 60px ${primaryColor}10`,
            pointerEvents: 'none',
          }} />

          {/* ── Skip Butonu ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2.0 }}
            whileHover={{ opacity: 1 }}
            style={{
              position: 'absolute',
              bottom: '30px',
              right: '30px',
              fontSize: '10px',
              color: '#525252',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={() => {
              useTunnelStore.getState().setBootProgress(1);
              useTunnelStore.getState().setPhase('entering');
            }}
          >
            ESC → ATLA
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
