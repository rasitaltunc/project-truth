'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "THE LAST MESSAGE"
//
//  A journalist is typing under stress. Then silence.
//
//  Every keystroke is hand-timed. Typos. Corrections.
//  Hesitations. Speed bursts. This isn't an animation —
//  it's a performance.
//
//  "The horror is not in what happens. It's in what stops."
// ═══════════════════════════════════════════════════════════

// ─── Keystroke script ───
// Each action: 'type' a char, 'pause' for ms, 'delete' N chars, 'hesitate' (cursor blinks)
type Action =
  | { t: 'type'; char: string; ms: number }   // type a character after ms delay
  | { t: 'pause'; ms: number }                 // just wait
  | { t: 'delete'; count: number; ms: number } // delete N chars, ms per deletion
  | { t: 'hesitate'; ms: number };             // cursor visible, nothing happens — thinking

// Build a realistic typing script from intended text + typo injections
function buildScript(
  text: string,
  baseSpeed: number,          // avg ms per char
  speedVariance: number,      // random variance ±
  typos: Array<{ at: number; wrong: string; pauseAfter: number }>, // where to make mistakes
  hesitations: Array<{ at: number; ms: number }>,                  // where to pause/think
): Action[] {
  const actions: Action[] = [];
  let charIndex = 0;

  for (let i = 0; i < text.length; i++) {
    // Check for hesitation at this position
    const hes = hesitations.find(h => h.at === i);
    if (hes) {
      actions.push({ t: 'hesitate', ms: hes.ms });
    }

    // Check for typo at this position
    const typo = typos.find(t => t.at === i);
    if (typo) {
      // Type the wrong characters
      for (const ch of typo.wrong) {
        actions.push({ t: 'type', char: ch, ms: baseSpeed * 0.6 }); // typos are fast — fingers ahead of brain
      }
      // Realize mistake — brief pause
      actions.push({ t: 'pause', ms: typo.pauseAfter });
      // Delete the wrong chars
      actions.push({ t: 'delete', count: typo.wrong.length, ms: 60 });
      // Small pause after correction
      actions.push({ t: 'pause', ms: 120 });
    }

    // Type the correct character
    const variance = (Math.sin(charIndex * 7.3 + i * 3.1) * 0.5 + 0.5) * speedVariance * 2 - speedVariance;
    // Slow down on punctuation, speed up mid-word
    const punctuation = '.,-—:;$'.includes(text[i]);
    const space = text[i] === ' ';
    const speed = punctuation ? baseSpeed * 1.8 : space ? baseSpeed * 0.7 : baseSpeed + variance;

    actions.push({ t: 'type', char: text[i], ms: Math.max(25, speed) });
    charIndex++;
  }

  return actions;
}

// ─── Message scripts ───
// Message 1: "I found the connection. The foundation received $2.3M from three shell companies — all registered the same week the investigation was dropped."
// The journalist is urgent, types fast, makes a couple mistakes
const MSG1_TYPOS = [
  { at: 18, wrong: 'io', pauseAfter: 380 },  // "connectiion" → delete 2 → "connection"
  { at: 72, wrong: 'she', pauseAfter: 320 },  // "shell" typed as "sheshell" fast fingers
];
const MSG1_HESITATIONS = [
  { at: 0, ms: 200 },    // brief moment before starting
  { at: 31, ms: 600 },   // pause after "The foundation" — gathering thoughts
  { at: 77, ms: 450 },   // pause before "all registered" — this is the key part
  { at: 108, ms: 350 },  // pause before "investigation" — weight of the word
];

// Message 2: "The documents are in the" — never finishes
const MSG2_TYPOS: Array<{ at: number; wrong: string; pauseAfter: number }> = [];
const MSG2_HESITATIONS = [
  { at: 0, ms: 300 },    // slight hesitation — about to reveal location
  { at: 18, ms: 200 },   // tiny pause before "in the" — thinking about where exactly
];

type Phase =
  | 'idle'
  | 'header'
  | 'typing1'
  | 'message1'
  | 'pause'
  | 'typing2'
  | 'message2'
  | 'stopped'
  | 'cursor_blink'
  | 'offline'
  | 'silence'
  | 'question'
  | 'complete';

// ─── Typing indicator: three dots pulsing ───
function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', gap: 4, alignItems: 'center',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '16px 16px 16px 4px',
      width: 'fit-content',
    }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            animation: `typingPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.85); }
          30% { opacity: 0.8; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Human typewriter engine ───
// hideCursorOnComplete: true = sent message (no cursor after), false = interrupted (cursor stays)
function HumanTypewriter({ script, onComplete, hideCursorOnComplete = false }: {
  script: Action[];
  onComplete?: () => void;
  hideCursorOnComplete?: boolean;
}) {
  const [displayText, setDisplayText] = useState('');
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    cancelRef.current = false;

    let currentText = '';

    async function run() {
      for (let i = 0; i < script.length; i++) {
        if (cancelRef.current) return;
        const action = script[i];

        switch (action.t) {
          case 'type':
            await wait(action.ms);
            if (cancelRef.current) return;
            currentText += action.char;
            setDisplayText(currentText);
            break;

          case 'pause':
            await wait(action.ms);
            break;

          case 'delete':
            for (let d = 0; d < action.count; d++) {
              await wait(action.ms);
              if (cancelRef.current) return;
              currentText = currentText.slice(0, -1);
              setDisplayText(currentText);
            }
            break;

          case 'hesitate':
            await wait(action.ms);
            break;
        }
      }
      if (!cancelRef.current) {
        setDone(true);
        onCompleteRef.current?.();
      }
    }

    run();
    return () => { cancelRef.current = true; };
  }, []); // empty deps — run exactly once on mount

  const showCursor = !done || !hideCursorOnComplete;

  return (
    <span>
      {displayText}
      {showCursor && (
        <span style={{
          display: 'inline-block',
          width: 2, height: '1.1em',
          background: 'rgba(255,255,255,0.6)',
          marginLeft: 1,
          verticalAlign: 'text-bottom',
          animation: 'cursorBlink 0.6s step-end infinite',
        }} />
      )}
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function LastMessageBridge() {
  const t = useTranslations('landing.bridge');
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.6, once: true });
  const [phase, setPhase] = useState<Phase>('idle');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [msg1Done, setMsg1Done] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const msg1Text = t('msg1');
  const msg2Text = t('msg2');

  // Build scripts from translated text
  const msg1Script = useRef(buildScript(msg1Text, 38, 15, MSG1_TYPOS, MSG1_HESITATIONS));
  const msg2Script = useRef(buildScript(msg2Text, 45, 12, MSG2_TYPOS, MSG2_HESITATIONS));

  // Cleanup
  useEffect(() => {
    return () => { timeoutsRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  };

  // ─── Start sequence when in view ───
  useEffect(() => {
    if (!isInView || hasPlayed) return;
    setHasPlayed(true);

    // Phase 1: Header
    schedule(() => setPhase('header'), 1000);

    // Phase 2: Typing dots
    schedule(() => setPhase('typing1'), 2200);

    // Phase 3: Message 1 starts (human typewriter takes over timing)
    schedule(() => setPhase('message1'), 4200);

  }, [isInView, hasPlayed]);

  // ─── After message 1 completes, continue sequence ───
  useEffect(() => {
    if (!msg1Done) return;

    // Pause — person takes a breath
    schedule(() => setPhase('pause'), 800);

    // Typing dots for message 2
    schedule(() => setPhase('typing2'), 2600);

    // Message 2 starts
    schedule(() => setPhase('message2'), 4400);

    // Message stops mid-sentence (the typewriter script will finish, then we freeze)
    // msg2 script duration is ~msg2Text.length * 45ms ≈ 1100ms + hesitations ≈ 1600ms
    schedule(() => setPhase('stopped'), 6200);

    // Cursor blinks alone — the silence begins
    schedule(() => setPhase('cursor_blink'), 7000);

    // Goes offline
    schedule(() => setPhase('offline'), 9500);

    // Silence — everything fades
    schedule(() => setPhase('silence'), 10500);

    // The question emerges
    schedule(() => setPhase('question'), 13500);

    // Complete
    schedule(() => setPhase('complete'), 18000);

  }, [msg1Done]);

  // ─── Derived state ───
  const showHeader = phase !== 'idle';
  const isOnline = showHeader && !['offline', 'silence', 'question', 'complete'].includes(phase);
  const showTyping1 = phase === 'typing1';
  const showMsg1 = ['message1', 'pause', 'typing2', 'message2', 'stopped', 'cursor_blink', 'offline', 'silence'].includes(phase);
  const showTyping2 = phase === 'typing2';
  const showMsg2 = ['message2', 'stopped', 'cursor_blink', 'offline', 'silence'].includes(phase);
  const isMsg2Typing = phase === 'message2';
  const showStoppedCursor = phase === 'stopped' || phase === 'cursor_blink';
  const showQuestion = phase === 'question' || phase === 'complete';

  // Chat fades slowly starting from 'silence'
  const chatFading = ['silence', 'question', 'complete'].includes(phase);

  return (
    <section
      style={{
        position: 'relative',
        height: '200vh',
        background: '#030303',
      }}
    >
    {/* Sticky inner — stays pinned while user scrolls through 200vh container */}
    <div
      ref={containerRef}
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 'min(520px, 90vw)',
        padding: '2rem',
      }}>
        {/* ── Chat UI wrapper — fades away slowly after offline ── */}
        <motion.div
          animate={{ opacity: chatFading ? 0 : 1 }}
          transition={{ duration: 3, ease: 'easeOut' }}
        >

        {/* ── Signal-style header ── */}
        <AnimatePresence>
          {showHeader && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 32,
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Lock icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.35 }}>
                <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#999" strokeWidth="1.2" />
                <path d="M4.5 6V4.5C4.5 3.12 5.62 2 7 2s2.5 1.12 2.5 2.5V6" stroke="#999" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{
                fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
              }}>
                {t('encrypted')}
              </span>

              {/* Online/offline indicator */}
              <div style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOnline ? '#22c55e' : '#555',
                  transition: 'background 1.2s ease',
                  boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                }} />
                <span style={{
                  fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                  fontSize: '0.65rem',
                  color: isOnline ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                  transition: 'color 1.2s ease',
                }}>
                  {isOnline ? t('online') : t('offline')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Message area ── */}
        <div style={{ minHeight: 180, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Typing indicator 1 */}
          <AnimatePresence>
            {showTyping1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message 1 — once mounted, stays mounted (no swap = no flicker) */}
          {showMsg1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '16px 16px 16px 4px',
                maxWidth: '92%',
              }}
            >
              <p style={{
                margin: 0,
                fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                fontSize: '0.92rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.55,
                letterSpacing: '-0.01em',
              }}>
                <HumanTypewriter
                  script={msg1Script.current}
                  onComplete={() => setMsg1Done(true)}
                  hideCursorOnComplete={true}
                />
              </p>
              {/* Timestamp fades in after typing is done */}
              {msg1Done && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    display: 'block', marginTop: 4,
                    fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)',
                    fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                  }}
                >
                  {t('timestamp1')}
                </motion.span>
              )}
            </motion.div>
          )}

          {/* Typing indicator 2 */}
          <AnimatePresence>
            {showTyping2 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message 2 — incomplete, cuts off. Once mounted stays mounted. */}
          {showMsg2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '16px 16px 16px 4px',
                maxWidth: '92%',
              }}
            >
              <p style={{
                margin: 0,
                fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                fontSize: '0.92rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.55,
                letterSpacing: '-0.01em',
              }}>
                <HumanTypewriter script={msg2Script.current} />
              </p>
            </motion.div>
          )}
        </div>

        </motion.div>{/* ── end chat UI wrapper ── */}

      </div>

      {/* ── The question — fades in slowly as chat dissolves ── */}
      <AnimatePresence>
        {showQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              pointerEvents: 'none',
            }}
          >
            <p style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.3rem, 3vw, 2rem)',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.5,
              margin: 0,
              fontStyle: 'italic',
              textAlign: 'center',
              maxWidth: 600,
            }}>
              {t('question')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </section>
  );
}
