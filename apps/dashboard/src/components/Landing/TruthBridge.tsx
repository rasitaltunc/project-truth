'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "THE TRUTH BRIDGE"
//
//  Transition from journalist protection → everyone's fight.
//
//  "We built a shield for those who expose the truth.
//   But truth doesn't survive on protection alone.
//   Who decides what's real? You do."
//
//  Sticky section. Auto-play text sequence.
//  Ends with a single devastating word: "You."
// ═══════════════════════════════════════════════════════════

type Phase = 'idle' | 'line1' | 'line2' | 'question' | 'answer' | 'complete';

const PHASE_ORDER: Phase[] = ['idle', 'line1', 'line2', 'question', 'answer', 'complete'];

export default function TruthBridge() {
  const t = useTranslations('landing.truthBridge');
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [phase, setPhase] = useState<Phase>('idle');
  const cancelRef = useRef(false);

  const gte = (target: Phase) =>
    PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);

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
      // Line 1: "We built a shield..."
      setPhase('line1');
      await wait(3000);
      if (cancelRef.current) return;

      // Line 2: "But truth doesn't survive..."
      setPhase('line2');
      await wait(3000);
      if (cancelRef.current) return;

      // Question: "Who decides what's real?"
      setPhase('question');
      await wait(3500);
      if (cancelRef.current) return;

      // Answer: "You do." — the punch
      setPhase('answer');
      await wait(3000);
      if (cancelRef.current) return;

      setPhase('complete');
    })();

    return () => {
      cancelRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [isInView]);

  return (
    <section style={{ position: 'relative', height: '200vh', background: '#030303' }}>
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
        }}
      >
        {/* Subtle horizontal line — divider feel */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: gte('line1') ? 120 : 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            height: 1,
            background: 'rgba(220,38,38,0.3)',
            marginBottom: 60,
          }}
        />

        <div style={{
          maxWidth: 'min(680px, 90vw)',
          padding: '0 24px',
          textAlign: 'center',
          position: 'relative',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Line 1 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={gte('line1') ? { opacity: 0.6, y: 0 } : {}}
            transition={{ duration: 1.2 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: '#a3a3a3',
              lineHeight: 1.8,
              margin: 0,
              fontWeight: 300,
            }}
          >
            {t('line1')}
          </motion.p>

          {/* Line 2 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={gte('line2') ? { opacity: 0.8, y: 0 } : {}}
            transition={{ duration: 1.2 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: '#e5e5e5',
              lineHeight: 1.8,
              margin: '16px 0 0',
              fontWeight: 300,
            }}
          >
            {t('line2')}
          </motion.p>

          {/* Question — bigger, dramatic pause */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={gte('question') ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            style={{
              fontSize: 'clamp(22px, 3.5vw, 36px)',
              color: '#e5e5e5',
              fontWeight: 400,
              margin: 'clamp(24px, 5vh, 48px) 0 0',
              lineHeight: 1.3,
              fontFamily: 'Georgia, serif',
            }}
          >
            {t('question')}
          </motion.p>

          {/* Answer — THE PUNCH */}
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={gte('answer') ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            style={{
              fontSize: 'clamp(28px, 7vw, 72px)',
              color: '#dc2626',
              fontWeight: 700,
              margin: '24px 0 0',
              letterSpacing: '0.02em',
            }}
          >
            {t('answer')}
          </motion.p>
        </div>

        {/* Bottom line — mirrors top */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: gte('answer') ? 120 : 0 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
          style={{
            height: 1,
            background: 'rgba(220,38,38,0.3)',
            marginTop: 60,
          }}
        />
      </div>
    </section>
  );
}
