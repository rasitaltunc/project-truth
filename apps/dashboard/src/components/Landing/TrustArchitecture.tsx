'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function TrustArchitecture() {
  const t = useTranslations('landing.trust');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const cards = [
    {
      number: '01',
      titleKey: 'layer1Title',
      textKey: 'layer1Text',
      icon: '⬡',
    },
    {
      number: '02',
      titleKey: 'layer2Title',
      textKey: 'layer2Text',
      icon: '⇄',
    },
    {
      number: '03',
      titleKey: 'layer3Title',
      textKey: 'layer3Text',
      icon: '◈',
    },
    {
      number: '04',
      titleKey: 'layer4Title',
      textKey: 'layer4Text',
      icon: '{ }',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  };

  return (
    <section
      ref={ref}
      style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#030303',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          width: '100%',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.7rem',
            color: 'rgba(220, 38, 38, 0.7)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}
        >
          {t('label')}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' as const }}
          viewport={{ once: true }}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            color: '#ffffff',
            margin: 0,
            marginBottom: '60px',
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          {t('title')}
        </motion.h2>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          {cards.map((card, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                borderColor: 'rgba(220, 38, 38, 0.4)',
                backgroundColor: 'rgba(20, 5, 5, 0.8)',
                boxShadow: '0 0 30px rgba(220, 38, 38, 0.08), inset 0 0 30px rgba(220, 38, 38, 0.03)',
                scale: 1.02,
              }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(220, 38, 38, 0.08)',
                padding: '32px',
                borderRadius: '2px',
                position: 'relative',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'default',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Icon */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  fontSize: '1.5rem',
                  color: 'rgba(220, 38, 38, 0.3)',
                  fontFamily: 'Georgia, serif',
                }}
                whileHover={{ color: 'rgba(220, 38, 38, 0.7)', scale: 1.2 }}
              >
                {card.icon}
              </motion.div>

              {/* Number */}
              <div
                style={{
                  fontFamily: '"Courier New", monospace',
                  fontSize: '2rem',
                  color: 'rgba(220, 38, 38, 0.2)',
                  marginBottom: '12px',
                  fontWeight: 700,
                }}
              >
                {card.number}
              </div>

              {/* Card Title */}
              <div
                style={{
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.95rem',
                  color: '#e5e5e5',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                {t(card.titleKey)}
              </div>

              {/* Card Text */}
              <div
                style={{
                  fontSize: '0.9rem',
                  color: '#a3a3a3',
                  lineHeight: 1.7,
                  marginTop: '8px',
                }}
              >
                {t(card.textKey)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
