'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTunnelStore } from '@/store/tunnelStore';
import { CORRIDOR_THEMES, isThemeAvailable, isEvidenceVisibleInTheme, THEME_EVIDENCE_FILTER } from '@/shaders/tunnelShaders';
import type { CorridorThemeKey } from '@/shaders/tunnelShaders';

// ═══════════════════════════════════════════════════════════════
// SPRINT 14A — TÜNEL HUD (Head-Up Display)
// Premium kalite: belgesel tarzı bilgi paneli, navigasyon,
// kanıt kartları, tema seçici, ilerleme çubuğu
// ═══════════════════════════════════════════════════════════════

// ── Evidence Type Colors ──
const EVIDENCE_COLORS: Record<string, string> = {
  court_record: '#ef4444',
  financial_record: '#22c55e',
  witness_testimony: '#ec4899',
  news_major: '#3b82f6',
  official_document: '#f59e0b',
  leaked_document: '#a855f7',
  photograph: '#14b8a6',
  social_media: '#06b6d4',
  flight_record: '#f97316',
  inference: '#8b5cf6',
  rumor: '#6b7280',
  testimony: '#ec4899',
  academic_paper: '#3b82f6',
};

const EVIDENCE_LABELS: Record<string, string> = {
  court_record: 'COURT',
  financial_record: 'FINANCIAL',
  witness_testimony: 'WITNESS',
  news_major: 'NEWS',
  official_document: 'OFFICIAL',
  leaked_document: 'LEAKED',
  photograph: 'PHOTO',
  social_media: 'SOCIAL',
  flight_record: 'FLIGHT',
  inference: 'INFERENCE',
  rumor: 'RUMOR',
  testimony: 'TESTIMONY',
  academic_paper: 'ACADEMIC',
};

// ── Progress Bar ──
function ProgressBar() {
  const walkProgress = useTunnelStore(s => s.walkProgress);
  const linkData = useTunnelStore(s => s.linkData);
  const activeEvidenceIndex = useTunnelStore(s => s.activeEvidenceIndex);
  const theme = useTunnelStore(s => s.theme);
  const themeConfig = CORRIDOR_THEMES[theme];
  const primaryColor = `rgb(${themeConfig.corridorColor.map(c => Math.round(c * 255)).join(',')})`;

  return (
    <div style={{
      width: '100%',
      height: '3px',
      backgroundColor: '#1a1a1a',
      position: 'relative',
      cursor: 'pointer',
    }}
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      useTunnelStore.getState().setWalkProgress(progress);
    }}
    >
      {/* Progress fill */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        height: '100%', width: `${walkProgress * 100}%`,
        backgroundColor: primaryColor,
        transition: 'width 0.1s ease-out',
      }} />

      {/* Evidence points — according to theme filter */}
      {linkData?.evidences.map((ev, i) => {
        const visible = isEvidenceVisibleInTheme(ev.evidenceType, theme);
        return (
          <div
            key={ev.timelineId}
            style={{
              position: 'absolute',
              left: `${ev.pulsePosition * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: ev.isKeystone ? '10px' : '6px',
              height: ev.isKeystone ? '10px' : '6px',
              borderRadius: '50%',
              backgroundColor: i === activeEvidenceIndex
                ? '#ffffff'
                : EVIDENCE_COLORS[ev.evidenceType] || '#525252',
              border: i === activeEvidenceIndex ? `2px solid ${primaryColor}` : 'none',
              boxShadow: i === activeEvidenceIndex
                ? `0 0 8px ${primaryColor}`
                : ev.isKeystone ? `0 0 4px ${EVIDENCE_COLORS[ev.evidenceType]}` : 'none',
              zIndex: i === activeEvidenceIndex ? 10 : 1,
              transition: 'all 0.3s ease',
              opacity: visible ? 1 : 0.15,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Active Evidence Card ──
function ActiveEvidenceCard() {
  const linkData = useTunnelStore(s => s.linkData);
  const activeEvidenceIndex = useTunnelStore(s => s.activeEvidenceIndex);

  if (!linkData || !linkData.evidences[activeEvidenceIndex]) return null;

  const evidence = linkData.evidences[activeEvidenceIndex];
  const typeColor = EVIDENCE_COLORS[evidence.evidenceType] || '#525252';
  const typeLabel = EVIDENCE_LABELS[evidence.evidenceType] || evidence.evidenceType;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={evidence.timelineId}
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '280px',
          backgroundColor: 'rgba(10, 10, 10, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: `3px solid ${typeColor}`,
          backdropFilter: 'blur(8px)',
          padding: '16px',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            color: typeColor,
            backgroundColor: `${typeColor}15`,
            padding: '2px 6px',
            fontFamily: '"Courier New", monospace',
          }}>
            {typeLabel}
          </span>
          {evidence.isKeystone && (
            <span style={{ fontSize: '10px', color: '#fbbf24' }}>⭐</span>
          )}
          {evidence.eventDate && (
            <span style={{
              fontSize: '9px',
              color: '#737373',
              fontFamily: '"Courier New", monospace',
              marginLeft: 'auto',
            }}>
              {new Date(evidence.eventDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
              })}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#e5e5e5',
          lineHeight: 1.4,
          marginBottom: '6px',
        }}>
          {evidence.title}
        </div>

        {/* Summary */}
        {evidence.summary && (
          <div style={{
            fontSize: '10px',
            color: '#a3a3a3',
            lineHeight: 1.5,
            marginBottom: '8px',
          }}>
            {evidence.summary}
          </div>
        )}

        {/* Confidence bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '8px', color: '#525252', fontFamily: '"Courier New", monospace' }}>
            CONFIDENCE
          </span>
          <div style={{
            flex: 1, height: '2px', backgroundColor: '#1a1a1a',
            borderRadius: '1px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${evidence.confidence * 100}%`,
              backgroundColor: evidence.confidence > 0.7 ? '#22c55e'
                : evidence.confidence > 0.4 ? '#f59e0b' : '#ef4444',
            }} />
          </div>
          <span style={{ fontSize: '8px', color: '#737373', fontFamily: '"Courier New", monospace' }}>
            {Math.round(evidence.confidence * 100)}%
          </span>
        </div>

        {/* Evidence counter */}
        <div style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#525252', fontFamily: '"Courier New", monospace' }}>
            EVIDENCE {activeEvidenceIndex + 1} / {linkData.evidences.length}{
              (() => {
                const theme = useTunnelStore.getState().theme;
                const filtered = linkData.evidences.filter(e => isEvidenceVisibleInTheme(e.evidenceType, theme));
                return filtered.length < linkData.evidences.length ? ` (${filtered.length} filtered)` : '';
              })()
            }
          </span>
          {evidence.sourceName && (
            <span style={{ fontSize: '8px', color: '#525252' }}>
              📄 {evidence.sourceName}
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Theme Selector (Compact) ──
// Themes without evidence disabled (dimmed + non-clickable)
function ThemeSelector() {
  const theme = useTunnelStore(s => s.theme);
  const setTheme = useTunnelStore(s => s.setTheme);
  const linkData = useTunnelStore(s => s.linkData);

  const themes = Object.entries(CORRIDOR_THEMES) as [CorridorThemeKey, typeof CORRIDOR_THEMES[CorridorThemeKey]][];
  const evidences = linkData?.evidences || [];

  return (
    <div style={{
      position: 'absolute',
      left: '24px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {themes.map(([key, config]) => {
        const isActive = key === theme;
        const available = isThemeAvailable(key, evidences);
        const color = `rgb(${config.corridorColor.map(c => Math.round(c * 255)).join(',')})`;
        const filterInfo = THEME_EVIDENCE_FILTER[key];
        const matchCount = filterInfo
          ? evidences.filter(ev => filterInfo.includes(ev.evidenceType)).length
          : evidences.length;

        return (
          <motion.button
            key={key}
            onClick={() => available && setTheme(key)}
            whileHover={available ? { scale: 1.15 } : {}}
            whileTap={available ? { scale: 0.9 } : {}}
            style={{
              width: isActive ? '32px' : '24px',
              height: isActive ? '32px' : '24px',
              borderRadius: '50%',
              backgroundColor: isActive ? color : 'transparent',
              border: `2px solid ${color}`,
              cursor: available ? 'pointer' : 'not-allowed',
              boxShadow: isActive ? `0 0 12px ${color}60` : 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              opacity: available ? 1 : 0.2,
            }}
            title={available ? `${config.name} (${matchCount} evidence)` : `${config.name} — no evidence`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-ring"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  border: `1px solid ${color}40`,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Bottom HUD Panel ──
function BottomHUD() {
  const sourceLabel = useTunnelStore(s => s.sourceLabel);
  const targetLabel = useTunnelStore(s => s.targetLabel);
  const walkSpeed = useTunnelStore(s => s.walkSpeed);
  const paused = useTunnelStore(s => s.paused);
  const theme = useTunnelStore(s => s.theme);
  const themeConfig = CORRIDOR_THEMES[theme];
  const primaryColor = `rgb(${themeConfig.corridorColor.map(c => Math.round(c * 255)).join(',')})`;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Progress bar */}
      <ProgressBar />

      {/* Control panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
      }}>
        {/* Left: Context info */}
        <div>
          <div style={{
            fontSize: '8px',
            letterSpacing: '0.3em',
            color: primaryColor,
            fontFamily: '"Courier New", monospace',
            marginBottom: '2px',
          }}>
            {themeConfig.name}
          </div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#e5e5e5',
          }}>
            {sourceLabel} → {targetLabel}
          </div>
        </div>

        {/* Center: Navigation controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => useTunnelStore.getState().prevEvidence()}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#1a1a1a', border: '1px solid #333',
              color: '#e5e5e5', cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ←
          </button>

          <button
            onClick={() => useTunnelStore.getState().togglePause()}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `2px solid ${primaryColor}`,
              color: primaryColor, cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {paused ? '▶' : '⏸'}
          </button>

          <button
            onClick={() => useTunnelStore.getState().nextEvidence()}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#1a1a1a', border: '1px solid #333',
              color: '#e5e5e5', cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            →
          </button>
        </div>

        {/* Right: Speed + Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[0.5, 1, 2].map(speed => (
            <button
              key={speed}
              onClick={() => useTunnelStore.getState().setWalkSpeed(speed)}
              style={{
                padding: '3px 8px',
                fontSize: '9px',
                fontFamily: '"Courier New", monospace',
                backgroundColor: walkSpeed === speed ? primaryColor : 'transparent',
                color: walkSpeed === speed ? '#000' : '#737373',
                border: `1px solid ${walkSpeed === speed ? primaryColor : '#333'}`,
                cursor: 'pointer',
                borderRadius: '2px',
                fontWeight: walkSpeed === speed ? 700 : 400,
              }}
            >
              {speed}x
            </button>
          ))}

          <button
            onClick={() => useTunnelStore.getState().exitTunnel()}
            style={{
              marginLeft: '8px',
              padding: '4px 12px',
              fontSize: '9px',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '0.1em',
              backgroundColor: 'transparent',
              color: '#737373',
              border: '1px solid #333',
              cursor: 'pointer',
            }}
          >
            ESC EXIT
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top Info Bar ──
function TopInfo() {
  const linkData = useTunnelStore(s => s.linkData);

  if (!linkData) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '6px 16px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(4px)',
    }}>
      <span style={{
        fontSize: '9px',
        color: '#a3a3a3',
        fontFamily: '"Courier New", monospace',
        letterSpacing: '0.15em',
      }}>
        CINEMATIC MODE
      </span>
      <span style={{ color: '#333', fontSize: '8px' }}>|</span>
      <span style={{
        fontSize: '9px',
        color: '#525252',
        fontFamily: '"Courier New", monospace',
        letterSpacing: '0.1em',
      }}>
        SPACE PAUSE
      </span>
      <span style={{ color: '#333', fontSize: '8px' }}>|</span>
      <span style={{
        fontSize: '9px',
        color: '#525252',
        fontFamily: '"Courier New", monospace',
        letterSpacing: '0.1em',
      }}>
        ESC EXIT
      </span>
    </div>
  );
}

// ── Main HUD Component ──
export default function TunnelHUD() {
  const phase = useTunnelStore(s => s.phase);
  const comingSoonTriggered = useTunnelStore(s => s.comingSoonTriggered);

  // HUD sadece walking, focused, exiting fazlarında görünür
  // Coming Soon aktifken HUD gizlenir (overlay kendi UI'ını sunar)
  const isVisible = (phase === 'walking' || phase === 'focused' || phase === 'entering') && !comingSoonTriggered;

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
            zIndex: 105,
            pointerEvents: 'none',
          }}
        >
          {/* Cinema bars (top/bottom) */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '5vh', backgroundColor: '#000',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '5vh', backgroundColor: '#000',
          }} />

          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }} />

          {/* Top info bar */}
          <TopInfo />

          {/* Left: Theme selector */}
          <div style={{ pointerEvents: 'auto' }}>
            <ThemeSelector />
          </div>

          {/* Right: Active evidence card */}
          <ActiveEvidenceCard />

          {/* Bottom: HUD control panel */}
          <div style={{ pointerEvents: 'auto' }}>
            <BottomHUD />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
