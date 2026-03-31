'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTunnelStore } from '@/store/tunnelStore';
import { CORRIDOR_THEMES } from '@/shaders/tunnelShaders';

// ═══════════════════════════════════════════════════════════════
// TUNNEL COMING SOON OVERLAY
// Boot sequence → giriş jeneriği → kısa yürüyüş → zarif "YAKINDA"
// Wireframe'den gerçekliğe geçiş teaser'ı ile beklenti yaratır
// ═══════════════════════════════════════════════════════════════

// ── Typewriter (yavaş, sinematik) ──
function SlowTypewriter({ text, delay, onComplete }: {
  text: string;
  delay: number;
  onComplete?: () => void;
}) {
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
          setTimeout(() => {
            setCursor(false);
            onComplete?.();
          }, 500);
        }
      }, 40 + Math.random() * 20); // Yavaş — sinematik hız
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay, onComplete]);

  return (
    <span>
      {displayed}
      {cursor && displayed.length > 0 && (
        <span style={{ opacity: 0.6, animation: 'blink 1s step-end infinite' }}>█</span>
      )}
    </span>
  );
}

export default function TunnelComingSoon() {
  const comingSoonTriggered = useTunnelStore(s => s.comingSoonTriggered);
  const comingSoon = useTunnelStore(s => s.comingSoon);
  const theme = useTunnelStore(s => s.theme);
  const sourceLabel = useTunnelStore(s => s.sourceLabel);
  const targetLabel = useTunnelStore(s => s.targetLabel);
  const exitTunnel = useTunnelStore(s => s.exitTunnel);

  const [showTitle, setShowTitle] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  const isVisible = comingSoon && comingSoonTriggered;
  const themeConfig = CORRIDOR_THEMES[theme];
  const primaryColor = `rgb(${themeConfig.corridorColor.map((c: number) => Math.round(c * 255)).join(',')})`;
  const accentColor = `rgb(${themeConfig.accentColor.map((c: number) => Math.round(c * 255)).join(',')})`;

  // Sıralı reveal animasyonları
  useEffect(() => {
    if (!isVisible) {
      setShowTitle(false);
      setShowSubtext(false);
      setShowTeaser(false);
      setShowButton(false);
      return;
    }

    // Glitch efekti — kısa bir "bozulma" anı
    const glitchTimer = setTimeout(() => setGlitchActive(true), 300);
    const glitchOffTimer = setTimeout(() => setGlitchActive(false), 500);

    const titleTimer = setTimeout(() => setShowTitle(true), 800);
    const subtextTimer = setTimeout(() => setShowSubtext(true), 2800);
    const teaserTimer = setTimeout(() => setShowTeaser(true), 4500);
    const buttonTimer = setTimeout(() => setShowButton(true), 6000);

    return () => {
      clearTimeout(glitchTimer);
      clearTimeout(glitchOffTimer);
      clearTimeout(titleTimer);
      clearTimeout(subtextTimer);
      clearTimeout(teaserTimer);
      clearTimeout(buttonTimer);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Scrim — yumuşak karartma ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center,
            rgba(0,0,0,0.4) 0%,
            rgba(0,0,0,0.85) 60%,
            rgba(0,0,0,0.95) 100%)`,
        }}
      />

      {/* ── Glitch efekti — kısa bozulma anı ── */}
      <AnimatePresence>
        {glitchActive && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 3px,
                ${primaryColor}15 3px,
                ${primaryColor}15 6px
              )`,
              mixBlendMode: 'screen',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Üst çizgi — ince neon accent ── */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: 'absolute',
          top: '35%',
          left: '20%',
          right: '20%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
          transformOrigin: 'center',
        }}
      />

      {/* ── Alt çizgi ── */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: 'absolute',
          top: '65%',
          left: '20%',
          right: '20%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
          transformOrigin: 'center',
        }}
      />

      {/* ── İçerik Alanı ── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: '600px',
        padding: '0 32px',
      }}>
        {/* ── CLASSIFIED etiketi ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{
            fontSize: '12px',
            letterSpacing: '0.5em',
            color: primaryColor,
            fontFamily: '"Courier New", monospace',
            marginBottom: '32px',
            fontWeight: 600,
          }}
        >
          ▣ SIMULATION INTERRUPTED ▣
        </motion.div>

        {/* ── Ana Başlık: YAKINDA ── */}
        <AnimatePresence>
          {showTitle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, type: 'spring', stiffness: 60, damping: 15 }}
            >
              <div style={{
                fontSize: '56px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.25em',
                textShadow: `0 0 60px ${accentColor}40, 0 0 120px ${primaryColor}20`,
                lineHeight: 1,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                YAKINDA
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                style={{
                  width: '120px',
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  margin: '16px auto',
                  transformOrigin: 'center',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Typewriter alt metin ── */}
        <AnimatePresence>
          {showSubtext && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: '13px',
                color: '#737373',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.08em',
                lineHeight: 1.8,
                marginTop: '24px',
              }}
            >
              <div>
                <SlowTypewriter
                  text="Bu koridor henüz inşa aşamasında."
                  delay={0}
                />
              </div>
              <div style={{ marginTop: '4px' }}>
                <SlowTypewriter
                  text="Gerçeklik yüklenmeyi bekliyor."
                  delay={1800}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Teaser: Wireframe → Reality ipucu ── */}
        <AnimatePresence>
          {showTeaser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              style={{
                marginTop: '40px',
                padding: '16px 24px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: `1px solid ${accentColor}20`,
                borderRadius: '2px',
              }}
            >
              {/* Wireframe → Solid geçiş teaser */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '12px',
              }}>
                {/* Wireframe icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: `1px solid ${accentColor}40`,
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={`${accentColor}80`} strokeWidth="1">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>

                {/* Arrow */}
                <motion.div
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    fontSize: '14px',
                    color: accentColor,
                    fontFamily: '"Courier New", monospace',
                  }}
                >
                  →→→
                </motion.div>

                {/* Solid icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${primaryColor}40, ${accentColor}20)`,
                  border: `1px solid ${accentColor}60`,
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 20px ${accentColor}20`,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={`${accentColor}60`} stroke={accentColor} strokeWidth="1">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>
              </div>

              <div style={{
                fontSize: '10px',
                color: '#525252',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.15em',
              }}>
                WIREFRAME → REALITY TRANSITION
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Geri Dön Butonu ── */}
        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{ marginTop: '40px' }}
            >
              <motion.button
                whileHover={{ scale: 1.05, borderColor: `${accentColor}80` }}
                whileTap={{ scale: 0.95 }}
                onClick={() => exitTunnel()}
                style={{
                  padding: '10px 32px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${accentColor}40`,
                  color: '#a3a3a3',
                  fontSize: '11px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                ← GERİ DÖN
              </motion.button>

              <div style={{
                marginTop: '12px',
                fontSize: '9px',
                color: '#3f3f3f',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.1em',
              }}>
                ESC
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Alt bilgi: bağlantı adları ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '9px',
          color: '#525252',
          fontFamily: '"Courier New", monospace',
          letterSpacing: '0.15em',
        }}
      >
        {sourceLabel} ↔ {targetLabel}
      </motion.div>

      {/* ── CRT scan lines ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.02) 2px,
          rgba(0,0,0,0.02) 4px
        )`,
        pointerEvents: 'none',
      }} />

      {/* ── Kenar vignette ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 200px rgba(0,0,0,0.95), inset 0 0 80px ${primaryColor}08`,
        pointerEvents: 'none',
      }} />

      {/* ── CSS Keyframe for cursor blink ── */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
