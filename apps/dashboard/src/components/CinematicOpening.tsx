'use client';

// ═══════════════════════════════════════════
// CINEMATIC OPENING — Sprint 10
// 10 saniyelik dramatik açılış sekansı
// Framer Motion + Typewriter efekti
// Federal Indictment aesthetic
// ═══════════════════════════════════════════

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Eye } from 'lucide-react';
import { useCinematicStore, CinematicPhase } from '@/store/cinematicStore';

// ── Typewriter Hook ──
function useTypewriter(text: string, speed: number = 40, active: boolean = false) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayed('');
      setDone(false);
      return;
    }

    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, active]);

  return { displayed, done };
}

// ── Tagline Line Component ──
function TaglineLine({ text, isVisible }: { text: string; isVisible: boolean }) {
  const { displayed } = useTypewriter(text, 35, isVisible);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        fontSize: '16px',
        color: '#e5e5e5',
        fontFamily: '"Courier New", monospace',
        letterSpacing: '0.05em',
        lineHeight: 1.8,
        textAlign: 'center',
      }}
    >
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ color: '#dc2626' }}
      >
        ▌
      </motion.span>
    </motion.div>
  );
}

// ── Phase Label ──
const PHASE_LABELS: Record<CinematicPhase, string> = {
  idle: '',
  nodes: 'NODES DETECTED...',
  links: 'CONNECTIONS RESOLVING...',
  camera: 'NETWORK MAPPING...',
  tagline: '',
  complete: '',
};

export default function CinematicOpening() {
  const {
    isActive,
    phase,
    taglineIndex,
    taglines,
    skipCinematic,
    showSkipButton,
  } = useCinematicStore();

  const [fadeOut, setFadeOut] = useState(false);

  // Fade-out before complete
  useEffect(() => {
    if (phase === 'complete' && isActive) {
      setFadeOut(true);
    }
  }, [phase, isActive]);

  // Early return if not active
  if (!isActive && phase === 'complete') return null;
  if (phase === 'idle') return null;

  const handleSkip = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      skipCinematic();
    }, 400);
  }, [skipCinematic]);

  const phaseLabel = PHASE_LABELS[phase] || '';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="cinematic-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#030303',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: fadeOut ? 'none' : 'auto',
          }}
        >
          {/* ── Vignette Edges ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 40%, #030303 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Top: PROJECT TRUTH Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: phase === 'nodes' ? 1 : 0.6, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              position: 'absolute',
              top: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Eye size={24} style={{ color: '#dc2626' }} />
            <div style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              color: '#dc2626',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 700,
            }}>
              PROJECT TRUTH
            </div>
            <div style={{
              width: '40px',
              height: '1px',
              backgroundColor: '#dc262640',
            }} />
          </motion.div>

          {/* ── Center: Phase-specific content ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '500px',
            padding: '0 20px',
          }}>
            {/* Phase Label (nodes/links/camera) */}
            <AnimatePresence mode="wait">
              {phaseLabel && phase !== 'tagline' && (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.3em',
                    color: '#555',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 600,
                  }}
                >
                  {phaseLabel}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scan Line Animation (nodes/links/camera phase) */}
            {phase !== 'tagline' && phase !== 'complete' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                style={{
                  display: 'flex',
                  gap: '3px',
                  alignItems: 'center',
                }}
              >
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      opacity: [0.2, 1, 0.2],
                      scaleY: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.1,
                      repeat: Infinity,
                    }}
                    style={{
                      width: '2px',
                      height: '20px',
                      backgroundColor: '#dc2626',
                      borderRadius: '1px',
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Tagline Phase */}
            {phase === 'tagline' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                {taglines.map((line, idx) => (
                  <TaglineLine
                    key={idx}
                    text={line.text}
                    isVisible={taglineIndex >= idx}
                  />
                ))}
              </motion.div>
            )}

            {/* Progress Dots */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
            }}>
              {['nodes', 'links', 'camera', 'tagline'].map((p, i) => {
                const phases: CinematicPhase[] = ['nodes', 'links', 'camera', 'tagline'];
                const currentIdx = phases.indexOf(phase);
                const isActive = i <= currentIdx;
                const isCurrent = p === phase;

                return (
                  <motion.div
                    key={p}
                    animate={{
                      backgroundColor: isActive ? '#dc2626' : '#222',
                      scale: isCurrent ? [1, 1.3, 1] : 1,
                    }}
                    transition={{
                      scale: { duration: 0.6, repeat: isCurrent ? Infinity : 0 },
                    }}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Bottom: "İP UZAT" Hint ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'tagline' ? 0.6 : 0 }}
            transition={{ duration: 0.5, delay: 2.5 }}
            style={{
              position: 'absolute',
              bottom: '80px',
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: '#444',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            VIEW CONNECTIONS • GATHER EVIDENCE • CAST A THREAD
          </motion.div>

          {/* ── Skip Button ── */}
          {showSkipButton && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3, delay: 1 }}
              onClick={handleSkip}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: 'transparent',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#666',
                fontSize: '10px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              SKIP
              <SkipForward size={12} />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
