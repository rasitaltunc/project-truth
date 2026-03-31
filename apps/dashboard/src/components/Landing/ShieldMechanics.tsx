'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "INSIDE THE PROTOCOL"
//
//  The cinematic Shield showed WHAT happens.
//  This section shows HOW — three mechanisms, told as a
//  story with technical panels that slide in from the sides.
//
//  Zigzag layout: narrative center, tech panels alternate
//  left and right. Scroll-triggered. Each mechanism has
//  its own mini-animation in the side panel.
//
//  "Open the hood. Show them the engine."
// ═══════════════════════════════════════════════════════════

// ─── Dead Man Switch: Heartbeat Timeline ───
function DMSVisual({ active }: { active: boolean }) {
  const [missedBeat, setMissedBeat] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setMissedBeat(true), 3500);
    return () => clearTimeout(timer);
  }, [active]);

  // 7 check-in dots — last one turns red when missed
  const dots = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Timeline bar */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {/* Track */}
        <div style={{
          height: 2, background: 'rgba(34,197,94,0.15)',
          borderRadius: 1, position: 'relative',
        }}>
          {/* Filled portion */}
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: active ? (missedBeat ? '100%' : '85%') : '0%' }}
            transition={{ duration: missedBeat ? 0.8 : 3, ease: 'linear' }}
            style={{
              height: '100%', borderRadius: 1,
              background: missedBeat
                ? 'linear-gradient(90deg, #22c55e, #22c55e 80%, #dc2626)'
                : '#22c55e',
            }}
          />
        </div>

        {/* Check-in dots */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          position: 'absolute', top: -5, left: 0, right: 0,
        }}>
          {dots.map((i) => {
            const isLast = i === dots.length - 1;
            const isMissed = isLast && missedBeat;
            const dotActive = active && (missedBeat || i < dots.length - 1);
            const delay = i * 0.4;

            return (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={active ? {
                  scale: 1, opacity: 1,
                  backgroundColor: isMissed ? '#dc2626' : (dotActive ? '#22c55e' : '#333'),
                } : { scale: 0, opacity: 0 }}
                transition={{ delay: isMissed ? 3.5 : delay, duration: 0.3 }}
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  border: `1.5px solid ${isMissed ? '#dc2626' : '#22c55e'}`,
                  boxShadow: isMissed
                    ? '0 0 12px rgba(220,38,38,0.6)'
                    : (dotActive ? '0 0 8px rgba(34,197,94,0.3)' : 'none'),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em',
      }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 0.5 : 0 }}
          transition={{ delay: 0.5 }}
          style={{ color: '#22c55e' }}
        >
          CHECK-IN ✓
        </motion.span>
        <AnimatePresence>
          {missedBeat && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ color: '#dc2626' }}
            >
              MISSED ✗
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        {active && !missedBeat && (
          <motion.div
            key="alive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{
              marginTop: 20, fontSize: 11, fontFamily: 'monospace',
              color: '#22c55e', textAlign: 'center', letterSpacing: '0.15em',
            }}
          >
            ● SIGNAL ACTIVE — ALL CLEAR
          </motion.div>
        )}
        {missedBeat && (
          <motion.div
            key="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              marginTop: 20, fontSize: 11, fontFamily: 'monospace',
              color: '#dc2626', textAlign: 'center', letterSpacing: '0.15em',
            }}
          >
            ⚠ SIGNAL LOST — INITIATING CASCADE
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shamir's Secret Sharing: Key Split Animation ───
function ShamirVisual({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'whole' | 'splitting' | 'distributed'>('idle');

  useEffect(() => {
    if (!active) return;
    const timers = [
      setTimeout(() => setPhase('whole'), 400),
      setTimeout(() => setPhase('splitting'), 1800),
      setTimeout(() => setPhase('distributed'), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  // 6 shard positions around a circle
  const shards = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, i };
  });

  return (
    <div style={{
      padding: '24px 20px', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Key visualization area */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        {/* Central key */}
        <motion.div
          animate={{
            scale: phase === 'whole' ? 1 : (phase === 'splitting' ? 0.5 : 0),
            opacity: phase === 'whole' ? 1 : (phase === 'splitting' ? 0.5 : 0),
          }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            marginLeft: -16, marginTop: -16,
            width: 32, height: 32,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
            <rect x="7" y="2" width="10" height="10" rx="5" stroke="#eab308" strokeWidth="1.5" />
            <rect x="10" y="12" width="4" height="8" rx="1" fill="#eab308" />
            <rect x="13" y="15" width="4" height="2" rx="0.5" fill="#eab308" />
          </svg>
        </motion.div>

        {/* Shard fragments */}
        {shards.map((s) => (
          <motion.div
            key={s.i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={
              phase === 'splitting'
                ? { x: s.x * 0.5, y: s.y * 0.5, scale: 0.8, opacity: 0.7 }
                : phase === 'distributed'
                ? { x: s.x, y: s.y, scale: 1, opacity: 1 }
                : { x: 0, y: 0, scale: 0, opacity: 0 }
            }
            transition={{ duration: 0.6, delay: s.i * 0.08, type: 'spring', stiffness: 150 }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              marginLeft: -10, marginTop: -10,
              width: 20, height: 20,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 3,
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid rgba(234,179,8,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: phase === 'distributed' ? '0 0 10px rgba(234,179,8,0.3)' : 'none',
            }}>
              <span style={{ fontSize: 8, color: '#eab308', fontFamily: 'monospace' }}>
                {s.i + 1}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Connection lines when distributed */}
        {phase === 'distributed' && (
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 200 200">
            {shards.map((s) => (
              <motion.line
                key={`line-${s.i}`}
                x1={100} y1={100}
                x2={100 + s.x} y2={100 + s.y}
                stroke="rgba(234,179,8,0.2)"
                strokeWidth={0.5}
                strokeDasharray="3 5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: s.i * 0.1 }}
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" />
              </motion.line>
            ))}
          </svg>
        )}
      </div>

      {/* Threshold label */}
      <AnimatePresence>
        {phase === 'distributed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              marginTop: 16, textAlign: 'center',
              fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.15em',
            }}
          >
            <span style={{ color: '#eab308' }}>4</span>
            <span style={{ color: '#666' }}> / </span>
            <span style={{ color: '#eab308' }}>6</span>
            <span style={{ color: '#666', marginLeft: 8 }}>THRESHOLD TO DECRYPT</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Graduated Alarm: Escalation Cascade ───
function AlarmVisual({ active }: { active: boolean }) {
  const [level, setLevel] = useState(0); // 0=idle, 1=silent, 2=yellow, 3=red

  useEffect(() => {
    if (!active) return;
    const timers = [
      setTimeout(() => setLevel(1), 800),
      setTimeout(() => setLevel(2), 2400),
      setTimeout(() => setLevel(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const stages = [
    { label: 'SILENT', color: '#666', bgColor: 'rgba(102,102,102,0.1)', icon: '🔇' },
    { label: 'YELLOW', color: '#eab308', bgColor: 'rgba(234,179,8,0.1)', icon: '⚠' },
    { label: 'RED',    color: '#dc2626', bgColor: 'rgba(220,38,38,0.1)', icon: '🔴' },
  ];

  return (
    <div style={{
      padding: '24px 20px', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      gap: 12,
    }}>
      {stages.map((stage, i) => {
        const isActive = level >= i + 1;
        const isCurrent = level === i + 1;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0.2, x: -10 }}
            animate={{
              opacity: isActive ? 1 : 0.2,
              x: isActive ? 0 : -10,
              scale: isCurrent ? 1.02 : 1,
            }}
            transition={{ duration: 0.5, delay: isActive ? 0 : 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: isActive ? stage.bgColor : 'transparent',
              borderLeft: `3px solid ${isActive ? stage.color : '#222'}`,
              borderRadius: '0 6px 6px 0',
              transition: 'background 0.5s ease',
            }}
          >
            <span style={{ fontSize: 16 }}>{stage.icon}</span>
            <div>
              <div style={{
                fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.2em',
                color: isActive ? stage.color : '#444',
                fontWeight: isCurrent ? 600 : 400,
              }}>
                {stage.label} ALARM
              </div>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: isCurrent ? '100%' : (isActive ? '100%' : '0%') }}
                transition={{ duration: 1.2 }}
                style={{
                  height: 2, marginTop: 6, borderRadius: 1,
                  background: stage.color,
                  opacity: isActive ? 0.6 : 0,
                }}
              />
            </div>
            {isCurrent && (
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  marginLeft: 'auto',
                  width: 8, height: 8, borderRadius: '50%',
                  background: stage.color,
                  boxShadow: `0 0 8px ${stage.color}`,
                }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Final release text */}
      <AnimatePresence>
        {level >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{
              marginTop: 8, textAlign: 'center',
              fontSize: 11, fontFamily: 'monospace',
              color: '#dc2626', letterSpacing: '0.15em',
            }}
          >
            DOCUMENTS RELEASED → NETWORK NOTIFIED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Glass Panel Wrapper ───
function GlassPanel({
  side,
  children,
  active,
}: {
  side: 'left' | 'right';
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40 }}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: side === 'left' ? -40 : 40 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{
        flex: '0 0 clamp(220px, 50vw, 280px)',
        minHeight: 240,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Corner markers */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => {
        const isTop = pos.includes('top');
        const isLeft = pos.includes('left');
        return (
          <div
            key={pos}
            style={{
              position: 'absolute',
              [isTop ? 'top' : 'bottom']: 6,
              [isLeft ? 'left' : 'right']: 6,
              width: 8, height: 8,
              borderTop: isTop ? '1px solid rgba(255,255,255,0.15)' : 'none',
              borderBottom: !isTop ? '1px solid rgba(255,255,255,0.15)' : 'none',
              borderLeft: isLeft ? '1px solid rgba(255,255,255,0.15)' : 'none',
              borderRight: !isLeft ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}
          />
        );
      })}
      {children}
    </motion.div>
  );
}

// ─── Mechanism Step ───
function MechanismStep({
  index,
  side,
  narrativeKey,
  techLabel,
  techPanel,
}: {
  index: number;
  side: 'left' | 'right';
  narrativeKey: string;
  techLabel: string;
  techPanel: (active: boolean) => React.ReactNode;
}) {
  const t = useTranslations('landing.mechanics');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const [panelActive, setPanelActive] = useState(false);

  // Activate panel animations slightly after the step comes into view
  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => setPanelActive(true), 600);
    return () => clearTimeout(timer);
  }, [isInView]);

  const narrativeContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
      style={{
        flex: '1 1 clamp(260px, 80vw, 360px)', minWidth: 'auto',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Step number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 0.3, scale: 1 } : {}}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.3em',
          color: '#dc2626', marginBottom: 16,
        }}
      >
        {t(`step${index}Label`)}
      </motion.div>

      {/* Narrative text */}
      <h3 style={{
        fontSize: 'clamp(20px, 2.5vw, 28px)',
        fontWeight: 400, color: '#e5e5e5',
        margin: '0 0 16px', lineHeight: 1.4,
        fontFamily: 'Georgia, serif',
      }}>
        {t(`step${index}Title`)}
      </h3>

      <p style={{
        fontSize: 15, color: '#888', lineHeight: 1.8,
        margin: 0,
      }}>
        {t(`step${index}Text`)}
      </p>
    </motion.div>
  );

  const techContent = (
    <GlassPanel side={side} active={panelActive}>
      {/* Panel header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: panelActive ? '#22c55e' : '#333',
          boxShadow: panelActive ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
          transition: 'all 0.5s',
        }} />
        <span style={{
          fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.2em',
          color: '#666',
        }}>
          {techLabel}
        </span>
      </div>
      {techPanel(panelActive)}
    </GlassPanel>
  );

  return (
    <div style={{ position: 'relative', height: '160vh' }}>
      <div
        ref={ref}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 clamp(12px, 3vw, 24px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(24px, 4vw, 60px)',
            flexWrap: 'wrap',
            flexDirection: side === 'left' ? 'row' : 'row-reverse',
            maxWidth: 'min(960px, 95vw)',
            width: '100%',
          }}
        >
          {techContent}
          {narrativeContent}
        </div>
      </div>
    </div>
  );
}

// ─── Vertical connector line between steps ───
function StepConnector() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} style={{
      display: 'flex', justifyContent: 'center',
      padding: '0 0',
    }}>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={isInView ? { height: 60, opacity: 0.3 } : {}}
        transition={{ duration: 0.8 }}
        style={{
          width: 1,
          background: 'linear-gradient(to bottom, rgba(220,38,38,0.3), rgba(220,38,38,0.05))',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function ShieldMechanics() {
  const t = useTranslations('landing.mechanics');

  return (
    <section style={{
      position: 'relative',
      background: '#030303',
      overflow: 'hidden',
    }}>
      {/* Section header — sticky at the start */}
      <div style={{ position: 'relative', height: '60vh' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{ textAlign: 'center' }}
          >
            <span style={{
              fontSize: 11, letterSpacing: '0.35em',
              fontFamily: 'monospace', color: 'rgba(220,38,38,0.5)',
            }}>
              {t('sectionLabel')}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Step 1: Dead Man Switch — LEFT panel */}
      <MechanismStep
        index={1}
        side="left"
        narrativeKey="step1"
        techLabel="DEAD MAN SWITCH"
        techPanel={(active: boolean) => <DMSVisual active={active} />}
      />

      {/* Step 2: Shamir's Secret Sharing — RIGHT panel */}
      <MechanismStep
        index={2}
        side="right"
        narrativeKey="step2"
        techLabel="SHAMIR'S SECRET SHARING"
        techPanel={(active: boolean) => <ShamirVisual active={active} />}
      />

      {/* Step 3: Graduated Alarm — LEFT panel */}
      <MechanismStep
        index={3}
        side="left"
        narrativeKey="step3"
        techLabel="GRADUATED ALARM CASCADE"
        techPanel={(active: boolean) => <AlarmVisual active={active} />}
      />
    </section>
  );
}
