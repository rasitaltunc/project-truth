'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface StatConfig {
  value: number;
  suffix: string;
  labelKey: string;
}

function AnimatedCounter({
  target,
  suffix,
  isInView,
}: {
  target: number;
  suffix: string;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let animationFrameId: number;
    let currentValue = 0;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      currentValue = Math.floor(target * eased);
      setCount(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInView, target]);

  return (
    <span>
      <span style={{ color: '#ffffff' }}>{count}</span>
      <span style={{ color: '#dc2626' }}>{suffix}</span>
    </span>
  );
}

export default function StatsSection() {
  const t = useTranslations('landing.stats');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const stats: StatConfig[] = [
    {
      value: 50,
      suffix: '+',
      labelKey: 'components',
    },
    {
      value: 45,
      suffix: '+',
      labelKey: 'apiRoutes',
    },
    {
      value: 17,
      suffix: '',
      labelKey: 'sprints',
    },
    {
      value: 25,
      suffix: 'K+',
      labelKey: 'linesOfCode',
    },
  ];

  return (
    <section
      ref={ref}
      style={{
        paddingTop: '80px',
        paddingBottom: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#030303',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
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
            marginBottom: '48px',
            textAlign: 'center',
          }}
        >
          {t('label')}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Separator line (not for last item) */}
              {index > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1px',
                    height: '40px',
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                  }}
                />
              )}

              {/* Counter Value */}
              <div
                style={{
                  fontFamily: '"Courier New", monospace',
                  fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                  fontWeight: 700,
                  marginBottom: '12px',
                  lineHeight: 1,
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AnimatedCounter
                  target={stat.value}
                  suffix={stat.suffix}
                  isInView={isInView}
                />
              </div>

              {/* Label */}
              <div
                style={{
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.7rem',
                  color: '#737373',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {t(stat.labelKey)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
