'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic import — R3F Canvas SSR uyumlu değil
const HeroNetwork3D = dynamic(() => import('./HeroNetwork3D'), {
  ssr: false,
  loading: () => null,
});

export default function HeroSection() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <>
      <style>{`
        @keyframes bounce-chevron {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(8px); opacity: 0.6; }
        }
        .scroll-indicator {
          animation: bounce-chevron 2s ease-in-out infinite;
        }
      `}</style>

      <section
        style={{
          position: 'relative',
          height: '100vh',
          width: '100%',
          backgroundColor: '#030303',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at 50% 80%, rgba(220,38,38,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* 3D Network + Title (background layer) */}
        <HeroNetwork3D title={t('title')} />

        {/* Vignette overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(3,3,3,0.7) 70%, rgba(3,3,3,0.95) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* ALL HTML CONTENT — single flex column, absolute over everything */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            padding: '2rem 1.5rem',
          }}
        >
          {/* Top spacer — pushes content to center area */}
          <div style={{ flex: '1 1 20%' }} />

          {/* CLASSIFIED label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            style={{ marginBottom: 'clamp(0.5rem, 2vh, 1.5rem)' }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 'clamp(0.6rem, 1.2vw, 0.7rem)',
                letterSpacing: '0.3em',
                color: 'rgba(220,38,38,0.6)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              ▓▓▓ CLASSIFIED ▓▓▓ PROJECT TRUTH ▓▓▓
            </div>
          </motion.div>

          {/* 3D title placeholder (invisible, same size as 3D text for spacing) */}
          <motion.h1
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            aria-label={t('title')}
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              fontWeight: 400,
              color: 'transparent',
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '0.02em',
              userSelect: 'none',
              textAlign: 'center',
            }}
          >
            {t('title')}
          </motion.h1>

          {/* Subtitle + Buttons */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '900px',
              width: '100%',
            }}
          >
            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              style={{
                marginTop: 'clamp(0.75rem, 2vh, 1.5rem)',
                maxWidth: 'min(680px, 90vw)',
                color: '#a3a3a3',
                fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
                lineHeight: 1.7,
                fontWeight: 400,
              }}
            >
              {t('subtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              style={{
                display: 'flex',
                gap: 'clamp(0.5rem, 2vw, 1rem)',
                marginTop: 'clamp(1rem, 3vh, 2.5rem)',
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Link
                href={`/${locale}/truth`}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: 'clamp(10px, 2vw, 14px) clamp(20px, 4vw, 36px)',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.15em',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {t('cta')}
              </Link>

              <a
                href="https://github.com/rasitaltunc/ai-os"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: 'transparent',
                  color: '#e5e5e5',
                  padding: 'clamp(10px, 2vw, 14px) clamp(20px, 4vw, 36px)',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.15em',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(220,38,38,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#dc2626';
                  e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {t('ctaSecondary')}
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={itemVariants}
              style={{
                display: 'flex',
                gap: 'clamp(0.75rem, 2vw, 2rem)',
                marginTop: 'clamp(1rem, 2vh, 2rem)',
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {['badgeOpenSource', 'badgeZeroTracking', 'badgeCommunityVerified'].map((key) => (
                <div
                  key={key}
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#737373',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t(key)}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Bottom spacer — balances layout */}
          <div style={{ flex: '1 1 10%' }} />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            className="scroll-indicator"
            style={{
              fontSize: '1.5rem',
              color: '#737373',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '2rem',
            }}
          >
            ∨
          </div>
        </motion.div>
      </section>
    </>
  );
}
