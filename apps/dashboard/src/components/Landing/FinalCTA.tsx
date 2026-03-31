'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FinalCTA() {
  const t = useTranslations('landing.finalCta');
  const locale = useLocale();

  return (
    <section
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#030303',
        background:
          'linear-gradient(to bottom, #030303, #030303 50%, rgba(220, 38, 38, 0.02) 100%), radial-gradient(ellipse at 50% 50%, rgba(220, 38, 38, 0.06) 0%, transparent 70%)',
        paddingTop: '60px',
        paddingBottom: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' as const }}
        viewport={{ once: true }}
        style={{
          textAlign: 'center',
          maxWidth: '700px',
          width: '100%',
        }}
      >
        {/* Title */}
        <motion.h2
          initial={{ scale: 0.95, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' as const }}
          viewport={{ once: true }}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#ffffff',
            margin: 0,
            marginBottom: '2.5rem',
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          {t('title')}
        </motion.h2>

        {/* Buttons Container */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          {/* Primary CTA Button */}
          <Link
            href={`/${locale}/truth`}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontFamily: '"Courier New", monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              border: 'none',
              borderRadius: '0px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#991b1b';
              (e.target as HTMLElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#dc2626';
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {t('cta')}
          </Link>

          {/* Secondary CTA Button */}
          <a
            href="https://github.com/rasitaltunc/ai-os"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              backgroundColor: 'transparent',
              color: '#e5e5e5',
              fontFamily: '"Courier New", monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '0px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = '#dc2626';
              (e.target as HTMLElement).style.backgroundColor =
                'rgba(220, 38, 38, 0.05)';
              (e.target as HTMLElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor =
                'rgba(220, 38, 38, 0.3)';
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {t('ctaSecondary')}
          </a>
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.8rem',
            color: '#737373',
            letterSpacing: '0.05em',
            marginTop: '2rem',
          }}
        >
          {t('note')}
        </motion.div>
      </motion.div>
    </section>
  );
}
