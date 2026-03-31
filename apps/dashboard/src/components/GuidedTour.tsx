'use client';

// ═══════════════════════════════════════════
// GUIDED TOUR — Sprint 10 Polish
// Profesyonel adım adım rehber tur
// Dark overlay + mavi çerçeveli spotlight
// Viewport-aware akıllı pozisyonlama
// ═══════════════════════════════════════════

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Eye, Zap } from 'lucide-react';
import { useGuidedTourStore, TOUR_STEPS, TourStep } from '@/store/guidedTourStore';

// ── Spotlight Rect ──
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ── Computed Position ──
interface ComputedPos {
  top: number;
  left: number;
  placement: 'right' | 'left' | 'bottom' | 'top' | 'center';
}

const TOOLTIP_W = 360;
const TOOLTIP_H_EST = 260; // Estimated tooltip height
const EDGE_PAD = 16;

// ── Get target element rect with padding ──
function getTargetRect(step: TourStep): SpotlightRect | null {
  if (step.target.type === 'rect') {
    const r = step.target.rect!;
    if (r.width >= 9000) return null; // full-screen → no spotlight
    return r;
  }

  if (step.target.type === 'selector' && step.target.selector) {
    const el = document.querySelector(step.target.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = 12;
      return {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      };
    }
  }

  return null;
}

// ── Smart position: tries preferred, falls back to best fit ──
function computeTooltipPos(
  preferred: TourStep['tooltipPosition'],
  spot: SpotlightRect | null,
  winW: number,
  winH: number,
  tooltipH: number
): ComputedPos {
  // Center (no spotlight) → dead center
  if (!spot || preferred === 'center') {
    return {
      top: Math.max(EDGE_PAD, (winH - tooltipH) / 2),
      left: Math.max(EDGE_PAD, (winW - TOOLTIP_W) / 2),
      placement: 'center',
    };
  }

  // Calculate available space in each direction
  const spaceRight = winW - (spot.left + spot.width) - EDGE_PAD;
  const spaceLeft = spot.left - EDGE_PAD;
  const spaceBottom = winH - (spot.top + spot.height) - EDGE_PAD;
  const spaceTop = spot.top - EDGE_PAD;

  // Vertical alignment helper: align tooltip vertically near spotlight center
  const alignY = () => {
    const idealTop = spot.top + (spot.height - tooltipH) / 2;
    return Math.max(EDGE_PAD, Math.min(idealTop, winH - tooltipH - EDGE_PAD));
  };

  // Horizontal alignment helper: align tooltip horizontally near spotlight center
  const alignX = () => {
    const idealLeft = spot.left + (spot.width - TOOLTIP_W) / 2;
    return Math.max(EDGE_PAD, Math.min(idealLeft, winW - TOOLTIP_W - EDGE_PAD));
  };

  // Try preferred direction first, then find best alternative
  const tryRight = (): ComputedPos | null => {
    if (spaceRight >= TOOLTIP_W + 12) {
      return { top: alignY(), left: spot.left + spot.width + 16, placement: 'right' };
    }
    return null;
  };

  const tryLeft = (): ComputedPos | null => {
    if (spaceLeft >= TOOLTIP_W + 12) {
      return { top: alignY(), left: spot.left - TOOLTIP_W - 16, placement: 'left' };
    }
    return null;
  };

  const tryBottom = (): ComputedPos | null => {
    if (spaceBottom >= tooltipH + 12) {
      return { top: spot.top + spot.height + 16, left: alignX(), placement: 'bottom' };
    }
    return null;
  };

  const tryTop = (): ComputedPos | null => {
    if (spaceTop >= tooltipH + 12) {
      return { top: spot.top - tooltipH - 16, left: alignX(), placement: 'top' };
    }
    return null;
  };

  // Priority order based on preference
  const priorities: Record<string, (() => ComputedPos | null)[]> = {
    right:  [tryRight, tryBottom, tryLeft, tryTop],
    left:   [tryLeft, tryBottom, tryRight, tryTop],
    bottom: [tryBottom, tryRight, tryLeft, tryTop],
    top:    [tryTop, tryBottom, tryRight, tryLeft],
  };

  const attempts = priorities[preferred] || priorities.right;
  for (const attempt of attempts) {
    const result = attempt();
    if (result) return result;
  }

  // Ultimate fallback: place below spotlight, clamped to viewport
  return {
    top: Math.max(EDGE_PAD, Math.min(spot.top + spot.height + 16, winH - tooltipH - EDGE_PAD)),
    left: Math.max(EDGE_PAD, Math.min(spot.left, winW - TOOLTIP_W - EDGE_PAD)),
    placement: 'bottom',
  };
}

export default function GuidedTour() {
  const { isActive, currentStep, nextStep, prevStep, skipTour } = useGuidedTourStore();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [winW, setWinW] = useState(1200);
  const [winH, setWinH] = useState(800);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipH, setTooltipH] = useState(TOOLTIP_H_EST);
  const step = TOUR_STEPS[currentStep];

  // Window size
  useEffect(() => {
    const update = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Spotlight update on step change
  useEffect(() => {
    if (!isActive || !step) return;
    const timer = setTimeout(() => setSpotlight(getTargetRect(step)), 120);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, step]);

  // Measure actual tooltip height after render
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setTooltipH(tooltipRef.current.offsetHeight);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextStep(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); }
      if (e.key === 'Escape') { e.preventDefault(); skipTour(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, nextStep, prevStep, skipTour]);

  if (!isActive || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isCenter = step.tooltipPosition === 'center';
  const pos = computeTooltipPos(step.tooltipPosition, spotlight, winW, winH, tooltipH);

  const maskId = 'tour-spotlight-mask';

  return (
    <AnimatePresence>
      <motion.div
        key="guided-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      >
        {/* ── Dark Overlay with Spotlight Cutout ── */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlight && (
                <motion.rect
                  key={`mask-${currentStep}`}
                  initial={{ opacity: 0 }}
                  animate={{
                    x: spotlight.left,
                    y: spotlight.top,
                    width: spotlight.width,
                    height: spotlight.height,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  rx="10"
                  ry="10"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(3,3,3,0.85)"
            mask={`url(#${maskId})`}
          />
        </svg>

        {/* ── Spotlight Blue Border ── */}
        {spotlight && (
          <motion.div
            key={`border-${currentStep}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: spotlight.top - 2,
              left: spotlight.left - 2,
              width: spotlight.width + 4,
              height: spotlight.height + 4,
              border: '2px solid #3b82f6',
              borderRadius: 12,
              boxShadow: '0 0 20px #3b82f644, 0 0 40px #3b82f622',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Tooltip Card ── */}
        <motion.div
          ref={tooltipRef}
          key={`tooltip-${currentStep}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: isCenter ? Math.min(460, winW - EDGE_PAD * 2) : Math.min(TOOLTIP_W, winW - EDGE_PAD * 2),
            zIndex: 10001,
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #3b82f6',
            borderRadius: 12,
            padding: isCenter ? '36px 32px 28px' : '22px 20px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px #3b82f622',
          }}>
            {/* Step counter + progress */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 9,
                color: '#3b82f6',
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.15em',
                fontWeight: 700,
              }}>
                {isFirst ? <Eye size={12} style={{ color: '#dc2626' }} /> : <Zap size={10} />}
                {isFirst ? 'WELCOME' : `STEP ${currentStep} / ${TOUR_STEPS.length - 1}`}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === currentStep ? 12 : 4,
                    height: 4,
                    borderRadius: 2,
                    background: i === currentStep ? '#3b82f6' : i < currentStep ? '#3b82f666' : '#222',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              margin: '0 0 8px',
              fontSize: isCenter ? 17 : 14,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 700,
              color: '#e5e5e5',
              letterSpacing: '0.06em',
              lineHeight: 1.3,
            }}>
              {step.title}
            </h3>

            {/* Red accent */}
            <div style={{ width: 36, height: 2, background: '#dc2626', marginBottom: 10, borderRadius: 1 }} />

            {/* Description */}
            <p style={{
              margin: '0 0 16px',
              fontSize: 12.5,
              color: '#a3a3a3',
              lineHeight: 1.65,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {step.description}
            </p>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={skipTour}
                style={{
                  background: 'transparent', border: 'none', color: '#555',
                  fontSize: 10, fontFamily: 'ui-monospace, monospace',
                  letterSpacing: '0.1em', cursor: 'pointer', padding: '6px 0',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#999')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                SKIP
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {!isFirst && (
                  <button
                    onClick={prevStep}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '7px 12px', background: '#111',
                      border: '1px solid #333', borderRadius: 6,
                      color: '#999', fontSize: 10.5,
                      fontFamily: 'ui-monospace, monospace', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#ccc'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999'; }}
                  >
                    <ChevronLeft size={13} />
                    BACK
                  </button>
                )}

                <button
                  onClick={nextStep}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 16px',
                    background: isLast ? '#dc2626' : '#3b82f6',
                    border: 'none', borderRadius: 6,
                    color: '#fff', fontSize: 10.5,
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
                    boxShadow: isLast ? '0 0 14px #dc262644' : '0 0 14px #3b82f644',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {isFirst ? 'GET STARTED' : isLast ? 'START EXPLORING' : 'NEXT'}
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Keyboard Hint ── */}
        <div style={{
          position: 'fixed',
          bottom: 12, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: '#333',
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.12em', pointerEvents: 'none', zIndex: 10002,
        }}>
          ← → ARROW KEYS TO NAVIGATE • ESC TO SKIP
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
