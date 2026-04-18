'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ── Dynamic imports — SSR disabled ──
const LandingHero3D = dynamic(() => import('@/components/Landing/LandingHero3D'), {
  ssr: false,
  loading: () => null,
});
const MobileFallback = dynamic(() => import('@/components/Landing/MobileFallback'), {
  ssr: false,
  loading: () => null,
});

// ── WebGL detection ──
function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// ── Mobile detection (simple) ──
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const otherLocale = locale === 'en' ? 'tr' : 'en';
  const [use3D, setUse3D] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    setUse3D(hasWebGL() && !isMobileDevice());
    // Stagger the loaded state for entrance animation
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => {
      document.body.style.overflow = 'hidden';
      clearTimeout(timer);
    };
  }, []);

  const handleNodeHover = useCallback((name: string | null) => {
    setHoveredNode(name);
  }, []);

  return (
    <main style={{ background: '#030303', color: '#e5e5e5', minHeight: '100vh' }}>

      {/* ═══════════════════════════════════════════
          KATMAN 0 — KAPI (The Door)
          Full-screen 3D network + single CTA
          ═══════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(220,38,38,0.06) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* 3D or Mobile fallback */}
        {use3D ? (
          <LandingHero3D onNodeHover={handleNodeHover} />
        ) : (
          <MobileFallback />
        )}

        {/* Vignette — softens edges */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(3,3,3,0.6) 65%, rgba(3,3,3,0.95) 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Content overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          padding: '2rem 1.5rem',
        }}>
          {/* Top spacer */}
          <div style={{ flex: '1 1 25%' }} />

          {/* PROJECT TRUTH label */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
              letterSpacing: '0.35em',
              color: 'rgba(220,38,38,0.5)',
              fontWeight: 500,
              textAlign: 'center',
              marginBottom: 'clamp(0.5rem, 1.5vh, 1rem)',
            }}>
              PROJECT TRUTH
            </div>
          </motion.div>

          {/* Main title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '0.01em',
              textAlign: 'center',
              textShadow: '0 0 60px rgba(220,38,38,0.2)',
            }}
          >
            {t('v2.hero.title')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
            style={{
              marginTop: 'clamp(0.75rem, 2vh, 1.5rem)',
              maxWidth: 'min(600px, 85vw)',
              color: '#a3a3a3',
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            {t('v2.hero.subtitle')}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 1.0 }}
            style={{ marginTop: 'clamp(1.5rem, 3vh, 2.5rem)', pointerEvents: 'auto' }}
          >
            <Link
              href={`/${locale}/truth`}
              style={{
                display: 'inline-block',
                backgroundColor: '#dc2626',
                color: 'white',
                padding: 'clamp(12px, 2vw, 16px) clamp(28px, 5vw, 48px)',
                borderRadius: '2px',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.2em',
                fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                fontWeight: 600,
                textDecoration: 'none',
                textTransform: 'uppercase',
                transition: 'all 0.25s ease',
                boxShadow: '0 0 30px rgba(220,38,38,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(220,38,38,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(220,38,38,0.3)';
              }}
            >
              {t('v2.hero.cta')}
            </Link>
          </motion.div>

          {/* Hovered node name — subtle feedback */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  bottom: 'clamp(4rem, 8vh, 6rem)',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  color: 'rgba(220,38,38,0.6)',
                  textTransform: 'uppercase',
                }}
              >
                ● {hoveredNode}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom spacer */}
          <div style={{ flex: '1 1 15%' }} />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 1 } : {}}
          transition={{ delay: 2.5, duration: 0.8 }}
          style={{
            position: 'absolute', bottom: '1.5rem',
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, pointerEvents: 'none',
          }}
        >
          <div style={{
            fontSize: '0.7rem', color: '#525252',
            fontFamily: '"Courier New", monospace',
            letterSpacing: '0.2em',
            textAlign: 'center',
            animation: 'bounce-chevron 2.5s ease-in-out infinite',
          }}>
            {t('v2.hero.scroll')}
            <div style={{ marginTop: '4px', fontSize: '1.2rem' }}>∨</div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          KATMAN 1 — ANLAM (Meaning)
          3 cards — what you can do here
          ═══════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(4rem, 10vh, 8rem) clamp(1.5rem, 5vw, 4rem)',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          style={{
            textAlign: 'center',
            marginBottom: 'clamp(2rem, 5vh, 4rem)',
          }}
        >
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.3em',
            color: 'rgba(220,38,38,0.5)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
          }}>
            {t('v2.meaning.label')}
          </div>
          <h2 style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
            fontWeight: 400,
            color: '#e5e5e5',
            margin: 0,
            lineHeight: 1.3,
          }}>
            {t('v2.meaning.title')}
          </h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: 'clamp(1rem, 3vw, 2rem)',
        }}>
          {(['see', 'scan', 'verify'] as const).map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              style={{
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                border: '1px solid rgba(220,38,38,0.12)',
                borderRadius: '3px',
                background: 'rgba(220,38,38,0.02)',
                transition: 'border-color 0.3s, background 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)';
                e.currentTarget.style.background = 'rgba(220,38,38,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(220,38,38,0.12)';
                e.currentTarget.style.background = 'rgba(220,38,38,0.02)';
              }}
            >
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
              }}>
                {key === 'see' ? '◉' : key === 'scan' ? '⬡' : '✓'}
              </div>
              <h3 style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#e5e5e5',
                margin: '0 0 0.5rem 0',
              }}>
                {t(`v2.meaning.${key}Title`)}
              </h3>
              <p style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '0.875rem',
                color: '#737373',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {t(`v2.meaning.${key}Text`)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          KATMAN 2 — GÜVEN (Trust)
          Manifesto line + trust badges
          ═══════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(3rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4rem)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1 }}
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              fontStyle: 'italic',
              color: '#a3a3a3',
              lineHeight: 1.6,
              margin: '0 0 clamp(2rem, 4vh, 3rem) 0',
              padding: 0,
              borderLeft: 'none',
            }}
          >
            &ldquo;{t('v2.trust.manifesto')}&rdquo;
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              display: 'flex',
              gap: 'clamp(1.5rem, 4vw, 3rem)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* AGPL badge */}
            <a
              href="https://github.com/rasitaltunc/ai-os"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: '"Courier New", monospace',
                fontSize: '0.75rem', color: '#737373',
                letterSpacing: '0.1em', textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#a3a3a3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#737373'; }}
            >
              <span style={{
                display: 'inline-block', padding: '2px 6px',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '2px', fontSize: '0.65rem',
                color: '#dc2626',
              }}>AGPL-3.0</span>
              {t('v2.trust.openSource')}
            </a>

            {/* Zero tracking */}
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.75rem', color: '#737373',
              letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <span style={{ color: '#525252' }}>◈</span>
              {t('v2.trust.zeroTracking')}
            </div>

            {/* Community verified */}
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.75rem', color: '#737373',
              letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <span style={{ color: '#525252' }}>◈</span>
              {t('v2.trust.communityVerified')}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          KATMAN 3 — FOOTER
          Brand + links + language
          ═══════════════════════════════════════════ */}
      <footer style={{
        padding: 'clamp(2rem, 5vh, 3rem) clamp(1.5rem, 5vw, 4rem) clamp(1.5rem, 3vh, 2rem)',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        }}>
          {/* Brand */}
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.9rem', fontWeight: 700,
            color: '#dc2626',
          }}>
            PROJECT TRUTH
          </div>

          {/* Links */}
          <div style={{
            display: 'flex', gap: 'clamp(1rem, 3vw, 2rem)',
            alignItems: 'center', flexWrap: 'wrap',
          }}>
            <a href="https://github.com/rasitaltunc/ai-os" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'system-ui', fontSize: '0.8rem', color: '#525252', textDecoration: 'none' }}>
              GitHub
            </a>
            <a href={`/${locale}/privacy`} style={{ fontFamily: 'system-ui', fontSize: '0.8rem', color: '#525252', textDecoration: 'none' }}>
              {t('v2.footer.privacy')}
            </a>

            {/* Language */}
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <a href={`/${locale}/landing`} style={{
                fontSize: '0.75rem', color: '#dc2626',
                fontWeight: 600, textDecoration: 'none',
              }}>
                {locale.toUpperCase()}
              </a>
              <span style={{ color: '#333', fontSize: '0.75rem' }}>|</span>
              <a href={`/${otherLocale}/landing`} style={{
                fontSize: '0.75rem', color: '#525252', textDecoration: 'none',
              }}>
                {otherLocale.toUpperCase()}
              </a>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '900px', margin: '1rem auto 0',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: 'system-ui', fontSize: '0.7rem', color: '#333' }}>
            {t('v2.footer.copyright')}
          </span>
        </div>
      </footer>

      {/* Global CSS */}
      <style>{`
        @keyframes bounce-chevron {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(6px); opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}
