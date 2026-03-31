'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "THE EVIDENCE LAYER"
//
//  Five evidence types, each revealed like opening a file.
//  From solid (court records) to fog (unverified).
//  Visual: colored cables that pulse with confidence.
//
//  "Every connection carries a weight of truth."
// ═══════════════════════════════════════════════════════════

interface EvidenceType {
  key: string;
  color: string;
  confidence: number;  // 0-100, visual thickness + pulse
  icon: string;        // SVG path or unicode
  pulseSpeed: number;  // seconds per cycle
}

const EVIDENCE_TYPES: EvidenceType[] = [
  { key: 'court',      color: '#3b82f6', confidence: 95, icon: '⚖', pulseSpeed: 3 },
  { key: 'leaked',     color: '#a855f7', confidence: 80, icon: '🔓', pulseSpeed: 2.5 },
  { key: 'finance',    color: '#22c55e', confidence: 85, icon: '💰', pulseSpeed: 2 },
  { key: 'testimony',  color: '#eab308', confidence: 60, icon: '🗣', pulseSpeed: 1.5 },
  { key: 'unverified', color: '#dc2626', confidence: 20, icon: '❓', pulseSpeed: 1 },
];

// ─── Single Evidence Card ───
function EvidenceCard({
  type,
  index,
  active,
}: {
  type: EvidenceType;
  index: number;
  active: boolean;
}) {
  const t = useTranslations('landing.epistemology');

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={active ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        marginBottom: 2,
      }}
    >
      {/* Confidence bar — left edge */}
      <div style={{
        width: 4,
        borderRadius: '2px 0 0 2px',
        background: type.color,
        opacity: active ? 1 : 0.2,
        transition: 'opacity 0.8s ease',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {active && (
          <motion.div
            animate={{ y: ['-100%', '100%'] }}
            transition={{ duration: type.pulseSpeed, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '40%',
              background: `linear-gradient(to bottom, transparent, ${type.color}, transparent)`,
              opacity: 0.8,
            }}
          />
        )}
      </div>

      {/* Card body */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: 'none',
        borderRadius: '0 8px 8px 0',
        padding: 'clamp(16px, 2vw, 24px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
      }}>
        {/* Icon */}
        <div style={{
          fontSize: 24,
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 2,
        }}>
          {type.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}>
            <h4 style={{
              fontSize: 'clamp(16px, 1.5vw, 19px)',
              color: '#e5e5e5',
              margin: 0,
              fontWeight: 500,
            }}>
              {t(`${type.key}Title`)}
            </h4>
            <span style={{
              fontSize: 10,
              fontFamily: 'monospace',
              letterSpacing: '0.15em',
              color: type.color,
              opacity: 0.8,
              flexShrink: 0,
            }}>
              {t(`${type.key}Meta`)}
            </span>
          </div>

          <p style={{
            fontSize: 14,
            color: '#888',
            lineHeight: 1.7,
            margin: 0,
          }}>
            {t(`${type.key}Desc`)}
          </p>

          {/* Confidence indicator */}
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              flex: 1,
              height: 3,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={active ? { width: `${type.confidence}%` } : {}}
                transition={{ duration: 1.2, delay: index * 0.15 + 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: type.color,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${type.color}44`,
                }}
              />
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={active ? { opacity: 0.6 } : {}}
              transition={{ delay: index * 0.15 + 1 }}
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: type.color,
                minWidth: 32,
                textAlign: 'right',
              }}
            >
              {type.confidence}%
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function EpistemologyReveal() {
  const t = useTranslations('landing.epistemology');
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [showCards, setShowCards] = useState(false);
  const [showClosing, setShowClosing] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const t1 = setTimeout(() => setShowCards(true), 800);
    const t2 = setTimeout(() => setShowClosing(true), 800 + EVIDENCE_TYPES.length * 150 + 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isInView]);

  return (
    <section style={{
      position: 'relative',
      background: '#030303',
      padding: 'clamp(60px, 10vh, 120px) 0',
      overflow: 'hidden',
    }}>
      {/* Subtle gradient accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.15), transparent)',
      }} />

      <div
        ref={sectionRef}
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          style={{ textAlign: 'center', marginBottom: 20 }}
        >
          <span style={{
            fontSize: 11,
            letterSpacing: '0.35em',
            fontFamily: 'monospace',
            color: 'rgba(220,38,38,0.5)',
          }}>
            {t('label')}
          </span>
        </motion.div>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 0.7, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          style={{
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            color: '#e5e5e5',
            textAlign: 'center',
            lineHeight: 1.6,
            margin: '0 0 48px',
            fontWeight: 300,
            fontFamily: 'Georgia, serif',
          }}
        >
          {t('intro')}
        </motion.p>

        {/* Evidence cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {EVIDENCE_TYPES.map((type, i) => (
            <EvidenceCard
              key={type.key}
              type={type}
              index={i}
              active={showCards}
            />
          ))}
        </div>

        {/* Closing statement */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={showClosing ? { opacity: 0.6, y: 0 } : {}}
          transition={{ duration: 1.2 }}
          style={{
            fontSize: 15,
            color: '#a3a3a3',
            textAlign: 'center',
            lineHeight: 1.8,
            margin: '48px auto 0',
            maxWidth: 'min(560px, 90vw)',
            fontWeight: 300,
          }}
        >
          {t('closing')}
        </motion.p>
      </div>
    </section>
  );
}
