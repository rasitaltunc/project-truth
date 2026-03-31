'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "THE SHIELD"
//
//  A journalist's heartbeat. Then silence. Then revolution.
//
//  Bridge asked: "What if their evidence could never be
//  silenced?" Here's the answer.
//
//  "The horror was the silence. The revolution is what
//  breaks it."
// ═══════════════════════════════════════════════════════════

type Phase =
  | 'idle'
  | 'label'
  | 'pulse'
  | 'flatline'
  | 'silence'
  | 'activate'
  | 'network'
  | 'release'
  | 'declare'
  | 'complete';

const PHASE_ORDER: Phase[] = [
  'idle', 'label', 'pulse', 'flatline', 'silence',
  'activate', 'network', 'release', 'declare', 'complete',
];

// ─── ECG Path Generator ───
function generateECGPath(numBeats: number = 4): string {
  const W = 800, CY = 50;
  const spacing = W / (numBeats + 1);
  let d = `M0,${CY}`;
  for (let i = 0; i < numBeats; i++) {
    const bx = (i + 0.8) * spacing;
    d += ` L${bx - 15},${CY}`;
    // P wave
    d += ` L${bx - 8},${CY - 6} L${bx - 3},${CY}`;
    // QRS complex
    d += ` L${bx + 2},${CY} L${bx + 5},${CY - 35} L${bx + 8},${CY + 35} L${bx + 11},${CY - 10} L${bx + 14},${CY}`;
    // T wave
    d += ` L${bx + 24},${CY} L${bx + 29},${CY - 8} L${bx + 37},${CY}`;
  }
  d += ` L${W},${CY}`;
  return d;
}

const ECG_PATH = generateECGPath(4);
const FLAT_PATH = 'M0,50 L800,50';

// ─── Guardian Positions (8 around circle) ───
const GUARDIANS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * 130, y: Math.sin(a) * 130, delay: i * 0.1 };
});

// ─── Document Particles ───
const DOC_PARTICLES = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
  const dist = 220 + Math.random() * 140;
  return {
    x: Math.cos(a) * dist,
    y: Math.sin(a) * dist,
    rot: Math.random() * 360,
    delay: Math.random() * 0.5,
    w: 6 + Math.random() * 8,
  };
});

// ─── Shield SVG Icon ───
function ShieldIcon({ lit }: { lit: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {lit && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 110, height: 110,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,38,38,0.25), transparent 70%)',
          }}
        />
      )}
      <svg width="52" height="64" viewBox="0 0 24 28" fill="none">
        <path
          d="M12 1L2 6.5v6c0 6.5 4.2 12.5 10 14 5.8-1.5 10-7.5 10-14v-6L12 1z"
          fill={lit ? '#dc2626' : '#1a1a1a'}
          stroke={lit ? '#f87171' : '#333'}
          strokeWidth="0.5"
          style={{ transition: 'all 0.8s ease' }}
        />
        <rect x="9" y="13" width="6" height="5" rx="1"
          fill={lit ? 'rgba(255,255,255,0.85)' : '#444'} style={{ transition: 'fill 0.8s' }} />
        <path d="M10.5 13v-2a1.5 1.5 0 013 0v2"
          stroke={lit ? 'rgba(255,255,255,0.85)' : '#444'} strokeWidth="0.8" fill="none"
          style={{ transition: 'stroke 0.8s' }} />
      </svg>
    </div>
  );
}

export default function JournalistShield() {
  const t = useTranslations('landing.shield');
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [phase, setPhase] = useState<Phase>('idle');
  const [beatCount, setBeatCount] = useState(0);
  const [litGuardians, setLitGuardians] = useState<number[]>([]);
  const cancelRef = useRef(false);

  const gte = useCallback((target: Phase) => {
    return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);
  }, [phase]);

  // ─── Phase Machine ───
  useEffect(() => {
    if (!isInView) return;
    cancelRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(() => { if (!cancelRef.current) res(); }, ms);
        timers.push(id);
      });

    (async () => {
      // ─── ACT 1: HAYAT ───
      // Label appears, sets the tone
      setPhase('label');
      await wait(1800);
      if (cancelRef.current) return;

      // Heartbeats — slow, deliberate, alive
      setPhase('pulse');
      await wait(800);             // "proof of life" text reads
      setBeatCount(1);
      await wait(1000);            // steady
      if (cancelRef.current) return;
      setBeatCount(2);
      await wait(1000);            // steady
      if (cancelRef.current) return;
      setBeatCount(3);
      await wait(850);             // slightly faster — tension
      if (cancelRef.current) return;
      setBeatCount(4);
      await wait(600);             // faster still — something's wrong
      if (cancelRef.current) return;

      // ─── ACT 2: ÖLÜM ───
      // Flatline — let the horror SINK IN
      setPhase('flatline');
      await wait(2800);            // long, terrifying silence
      if (cancelRef.current) return;

      // "Until it stops." — give them time to feel it
      setPhase('silence');
      await wait(3200);            // 3.2s to read + absorb
      if (cancelRef.current) return;

      // ─── ACT 3: DEVRİM ───
      // Shield activation — the twist
      setPhase('activate');
      await wait(1500);            // shockwave + shield materialize
      if (cancelRef.current) return;

      // Guardians light up — each one a protector
      setPhase('network');
      for (let i = 0; i < 8; i++) {
        if (cancelRef.current) return;
        setLitGuardians((prev) => [...prev, i]);
        await wait(220);           // slower, more deliberate
      }
      await wait(1200);            // "PROTOCOL ACTIVATED" reads
      if (cancelRef.current) return;

      // Documents release — the payoff
      setPhase('release');
      await wait(5000);            // "You didn't silence..." text needs time — give reader 5s
      if (cancelRef.current) return;

      setPhase('declare');
      await wait(100);
      setPhase('complete');
    })();

    return () => {
      cancelRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [isInView]);

  // ECG drawing progress
  const ecgProgress = useMemo(() => {
    if (phase === 'idle' || phase === 'label') return 0;
    if (gte('flatline')) return 1;
    return beatCount > 0 ? (beatCount / 4) * 0.85 + 0.1 : 0.08;
  }, [phase, beatCount, gte]);

  const isFlat = gte('flatline');
  const color = isFlat ? '#dc2626' : '#22c55e';

  return (
    <section
      style={{
        position: 'relative',
        height: '280vh',
        background: '#030303',
      }}
    >
    {/* Sticky inner — stays pinned while user scrolls through 280vh container */}
    <div
      ref={sectionRef}
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 'clamp(20px, 8vh, 80px) 0',
      }}
    >
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Red danger glow on flatline */}
      <motion.div
        animate={{ opacity: gte('flatline') && !gte('activate') ? 0.15 : 0 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.4), transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* Central content — fixed-height container for phase crossfade */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 'min(800px, 95vw)',
        minHeight: 480, padding: '0 24px', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* ──── PHASE A: HEARTBEAT ──── */}
        <AnimatePresence>
          {!gte('activate') && gte('label') && (
            <motion.div
              key="heartbeat-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              transition={{ duration: 1 }}
              style={{
                position: 'absolute', inset: 0,
              }}
            >
              {/* Label — absolute, won't shift anything */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ duration: 1 }}
                style={{
                  position: 'absolute',
                  top: '28%',
                  left: 0, right: 0,
                  textAlign: 'center',
                }}
              >
                <span style={{
                  fontSize: 11, letterSpacing: '0.35em',
                  color, fontFamily: 'monospace',
                  transition: 'color 0.8s ease',
                }}>
                  {t('label')}
                </span>
              </motion.div>

              {/* Heartbeat Monitor — absolute, NEVER moves */}
              <div style={{
                position: 'absolute',
                top: '38%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%', maxWidth: 'min(760px, 95vw)', height: 100,
              }}>
                {/* Baseline glow */}
                <div style={{
                  position: 'absolute', top: '50%', left: '5%', right: '5%',
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${color}22, ${color}22, transparent)`,
                  transform: 'translateY(-50%)',
                }} />

                <svg
                  viewBox="0 0 800 100"
                  style={{ width: '100%', height: '100%' }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <filter id="ecg-glow-g">
                      <feGaussianBlur stdDeviation="3" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="ecg-glow-r">
                      <feGaussianBlur stdDeviation="4" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Green ECG trace */}
                  <motion.path
                    d={ECG_PATH}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2}
                    filter="url(#ecg-glow-g)"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: ecgProgress,
                      opacity: isFlat ? 0.15 : 1,
                    }}
                    transition={{
                      pathLength: { duration: 0.6, ease: 'linear' },
                      opacity: { duration: 0.8 },
                    }}
                  />

                  {/* Red flatline overlay */}
                  {isFlat && (
                    <motion.path
                      d={FLAT_PATH}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      filter="url(#ecg-glow-r)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: 'linear' }}
                    />
                  )}
                </svg>

                {/* Beat pulse flash */}
                <AnimatePresence>
                  {!isFlat && beatCount > 0 && (
                    <motion.div
                      key={`beat-${beatCount}`}
                      initial={{ scale: 0.8, opacity: 0.9 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      style={{
                        position: 'absolute',
                        top: '50%', right: 32,
                        width: 12, height: 12, marginTop: -6,
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 12px #22c55e',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Status dot */}
                <div style={{
                  position: 'absolute', top: '50%', right: 16,
                  width: 8, height: 8, marginTop: -4,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                  transition: 'all 0.8s ease',
                }} />
              </div>

              {/* Context text — absolute, FIXED position, text swaps don't move ECG */}
              <div style={{
                position: 'absolute',
                top: '58%',
                left: 0, right: 0,
                display: 'flex', justifyContent: 'center',
                height: 80,
              }}>
              <AnimatePresence mode="wait">
                {!gte('flatline') && gte('pulse') && (
                  <motion.div
                    key="alive-text"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.6 } }}
                    transition={{ duration: 1.2 }}
                    style={{ textAlign: 'center', position: 'absolute' }}
                  >
                    <p style={{ fontSize: 16, color: '#a3a3a3', margin: 0, lineHeight: 1.7 }}>
                      {t('proofOfLife')}
                    </p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ duration: 1, delay: 0.8 }}
                      style={{
                        fontSize: 14, color: '#22c55e', margin: '8px 0 0',
                        fontStyle: 'italic',
                      }}
                    >
                      {t('aProofOfLife')}
                    </motion.p>
                  </motion.div>
                )}
                {gte('silence') && (
                  <motion.div
                    key="silence-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    style={{ textAlign: 'center', position: 'absolute' }}
                  >
                    <p style={{
                      fontSize: 'clamp(18px, 5vw, 22px)', color: '#dc2626', margin: 0,
                      fontWeight: 300, letterSpacing: '0.06em',
                    }}>
                      {t('untilItStops')}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ──── PHASE B: SHIELD ACTIVATION ──── */}
        <AnimatePresence>
          {gte('activate') && (
            <motion.div
              key="shield-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute', inset: 0,
              }}
            >
              {/* Shockwave rings — fixed at shield center */}
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 6, opacity: 0 }}
                    transition={{ duration: 1.5, delay: d, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      width: 60, height: 60,
                      marginLeft: -30, marginTop: -30,
                      borderRadius: '50%',
                      border: `${2 - i * 0.5}px solid rgba(220,38,38,${0.5 - i * 0.15})`,
                    }}
                  />
                ))}
              </div>

              {/* Shield + Guardian Network — centering wrapper (CSS only, no FM) */}
              <div style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 340, height: 340,
              }}>
              {/* Inner motion div — ONLY handles y shift on declare */}
              <motion.div
                animate={{ y: gte('declare') ? -40 : 0 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                {/* Center shield */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <ShieldIcon lit={gte('network')} />
                </motion.div>

                {/* Connection lines */}
                <svg
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  viewBox="0 0 340 340"
                >
                  {GUARDIANS.map((g, i) => (
                    <motion.line
                      key={i}
                      x1={170} y1={170}
                      x2={170 + g.x} y2={170 + g.y}
                      stroke={litGuardians.includes(i) ? '#22c55e' : '#222'}
                      strokeWidth={litGuardians.includes(i) ? 1 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: litGuardians.includes(i) ? 0.5 : 0.1 }}
                      transition={{ duration: 0.4 }}
                      strokeDasharray={litGuardians.includes(i) ? '4 6' : 'none'}
                    >
                      {litGuardians.includes(i) && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0" to="-20"
                          dur="1s" repeatCount="indefinite"
                        />
                      )}
                    </motion.line>
                  ))}
                </svg>

                {/* Guardian nodes */}
                {GUARDIANS.map((g, i) => {
                  const isLit = litGuardians.includes(i);
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: isLit ? 1 : (gte('activate') ? 0.5 : 0),
                        opacity: isLit ? 1 : (gte('activate') ? 0.15 : 0),
                      }}
                      transition={{ duration: 0.4, delay: g.delay, type: 'spring' }}
                      style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        marginLeft: g.x - 14, marginTop: g.y - 14,
                        width: 28, height: 28,
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isLit ? '#22c55e' : '#1a1a1a',
                        border: `1px solid ${isLit ? '#22c55e' : '#333'}`,
                        boxShadow: isLit ? '0 0 16px rgba(34,197,94,0.5), 0 0 32px rgba(34,197,94,0.2)' : 'none',
                        transition: 'all 0.5s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isLit && (
                          <motion.svg
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ duration: 0.3 }}
                            width="14" height="14" viewBox="0 0 24 28" fill="none"
                          >
                            <path
                              d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                              fill="rgba(255,255,255,0.8)"
                            />
                          </motion.svg>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Shard travel animations */}
                {gte('network') && GUARDIANS.map((g, i) => {
                  if (!litGuardians.includes(i)) return null;
                  return (
                    <motion.div
                      key={`shard-${i}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: g.x, y: g.y, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.5, delay: g.delay }}
                      style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        marginLeft: -3, marginTop: -3,
                        width: 6, height: 6,
                        background: '#f87171',
                        borderRadius: 1,
                        boxShadow: '0 0 8px #dc2626',
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })}

                {/* Document particles — release phase */}
                {gte('release') && DOC_PARTICLES.map((d, i) => (
                  <motion.div
                    key={`doc-${i}`}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0.8 }}
                    animate={{ x: d.x, y: d.y, scale: 1, opacity: 0, rotate: d.rot }}
                    transition={{ duration: 1.8, delay: d.delay, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      marginLeft: -d.w / 2, marginTop: -d.w * 0.65,
                      width: d.w, height: d.w * 1.3,
                      background: 'rgba(220,38,38,0.6)',
                      borderRadius: 2,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </motion.div>
              </div>{/* close centering wrapper */}

              {/* ──── TEXT OVERLAYS — absolute below shield, never shifts visual ──── */}
              <div style={{
                position: 'absolute',
                top: '72%',
                left: 0, right: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
              <AnimatePresence mode="wait">
                {gte('activate') && !gte('release') && (
                  <motion.div
                    key="protocol-text"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    style={{ textAlign: 'center' }}
                  >
                    <span style={{
                      fontSize: 12, letterSpacing: '0.4em',
                      color: '#dc2626', fontFamily: 'monospace',
                    }}>
                      {t('protocolActivated')}
                    </span>
                  </motion.div>
                )}

                {gte('release') && !gte('declare') && (
                  <motion.div
                    key="release-text"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } }}
                    transition={{ duration: 1.2, delay: 0.4 }}
                    style={{ textAlign: 'center' }}
                  >
                    <p style={{
                      fontSize: 19, color: '#e5e5e5', margin: 0, fontWeight: 300,
                    }}>
                      {t('youDidntSilence')}
                    </p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.2, delay: 1.5 }}
                      style={{
                        fontSize: 19, color: '#dc2626', margin: '10px 0 0', fontWeight: 400,
                      }}
                    >
                      {t('youActivated')}
                    </motion.p>
                  </motion.div>
                )}

                {gte('declare') && (
                  <motion.div
                    key="declare-text"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ textAlign: 'center' }}
                  >
                    {/* First line hangs alone — dramatic beat */}
                    <motion.h2
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1, delay: 0.3 }}
                      style={{
                        fontSize: 'clamp(22px, 5vw, 44px)',
                        fontWeight: 700, color: '#e5e5e5',
                        margin: 0, letterSpacing: '0.02em', lineHeight: 1.2,
                      }}
                    >
                      {t('silenceOne')}
                    </motion.h2>
                    {/* Second line SLAMS in after a beat */}
                    <motion.h2
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 1.2, type: 'spring', stiffness: 120 }}
                      style={{
                        fontSize: 'clamp(22px, 5vw, 44px)',
                        fontWeight: 700, color: '#dc2626',
                        margin: '4px 0 0', letterSpacing: '0.02em', lineHeight: 1.2,
                      }}
                    >
                      {t('alertThousands')}
                    </motion.h2>
                    {/* Explanation — gentle, after the big punch lands */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ duration: 1.5, delay: 2.5 }}
                      style={{
                        fontSize: 15, color: '#a3a3a3',
                        margin: '32px auto 0', maxWidth: 'min(520px, 90vw)',
                        lineHeight: 1.8, fontWeight: 300,
                      }}
                    >
                      {t('explanation')}
                    </motion.p>
                    {/* Final hope — green, the future */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.5, delay: 4 }}
                      style={{
                        fontSize: 17, color: '#22c55e',
                        margin: '24px 0 0', fontWeight: 400, letterSpacing: '0.03em',
                      }}
                    >
                      {t('era')}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </section>
  );
}
