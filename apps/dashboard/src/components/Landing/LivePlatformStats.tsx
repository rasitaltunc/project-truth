'use client';

import { useTranslations } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

interface PlatformStats {
  total: number;
  scanned: number;
  entities: number;
  relationships: number;
  dates: number;
  quarantine: number;
  nodes: number;
  links: number;
}

// Animated counter with easeOutExpo
function AnimatedNumber({
  value,
  isInView,
  delay = 0,
  suffix = '',
}: {
  value: number;
  isInView: boolean;
  delay?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now() + delay;
    const duration = 2200;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value, delay]);

  return (
    <span>
      <span style={{ color: '#ffffff' }}>{display.toLocaleString()}</span>
      {suffix && <span style={{ color: '#dc2626', fontSize: '0.7em' }}>{suffix}</span>}
    </span>
  );
}

// Circular progress ring
function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 3,
  color = '#dc2626',
  isInView,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  isInView: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => {
      setOffset(circumference - (progress / 100) * circumference);
    }, 300);
    return () => clearTimeout(t);
  }, [isInView, progress, circumference]);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(220, 38, 38, 0.08)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: `drop-shadow(0 0 6px ${color}60)`,
        }}
      />
    </svg>
  );
}

interface StatCardConfig {
  icon: string;
  labelKey: string;
  valueKey: keyof PlatformStats;
  color: string;
  glowColor: string;
}

const STAT_CARDS: StatCardConfig[] = [
  { icon: '📄', labelKey: 'documents', valueKey: 'scanned', color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.15)' },
  { icon: '👤', labelKey: 'entities', valueKey: 'entities', color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.15)' },
  { icon: '🔗', labelKey: 'connections', valueKey: 'relationships', color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.15)' },
  { icon: '📅', labelKey: 'dates', valueKey: 'dates', color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.15)' },
  { icon: '🔬', labelKey: 'quarantine', valueKey: 'quarantine', color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.15)' },
  { icon: '🌐', labelKey: 'networkNodes', valueKey: 'nodes', color: '#dc2626', glowColor: 'rgba(220, 38, 38, 0.15)' },
];

export default function LivePlatformStats() {
  const t = useTranslations('landing.liveStats');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/stats?network_id=epstein');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsLive(true);
      }
    } catch {
      // Use fallback zeros
      setStats({ total: 0, scanned: 0, entities: 0, relationships: 0, dates: 0, quarantine: 0, nodes: 0, links: 0 });
    }
  }, []);

  useEffect(() => {
    if (isInView && !stats) fetchStats();
  }, [isInView, stats, fetchStats]);

  const scanProgress = stats && stats.total > 0 ? Math.round((stats.scanned / stats.total) * 100) : 0;

  return (
    <section
      ref={ref}
      style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(220, 38, 38, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '1000px', width: '100%', margin: '0 auto',
        paddingLeft: '24px', paddingRight: '24px',
        position: 'relative',
      }}>
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
          }}>
            {/* Pulse dot */}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: isLive ? '#22c55e' : '#dc2626',
              boxShadow: isLive
                ? '0 0 8px rgba(34, 197, 94, 0.8), 0 0 16px rgba(34, 197, 94, 0.4)'
                : '0 0 8px rgba(220, 38, 38, 0.8)',
              animation: 'landing-pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.7rem',
              color: isLive ? 'rgba(34, 197, 94, 0.8)' : 'rgba(220, 38, 38, 0.7)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}>
              {t('label')}
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          viewport={{ once: true }}
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
            fontWeight: 700,
            textAlign: 'center',
            color: '#e5e5e5',
            marginBottom: '48px',
            letterSpacing: '-0.02em',
          }}
        >
          {t('title')}
        </motion.h2>

        {/* Progress ring + scan status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: '48px',
          }}
        >
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <ProgressRing progress={scanProgress} size={80} color={scanProgress === 100 ? '#22c55e' : '#dc2626'} isInView={isInView} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Courier New", monospace',
              fontSize: '16px', fontWeight: 700,
              color: scanProgress === 100 ? '#22c55e' : '#dc2626',
            }}>
              {isInView ? <AnimatedNumber value={scanProgress} isInView={isInView} suffix="%" /> : '0%'}
            </div>
          </div>
          <span style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '10px', color: '#555',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginTop: '12px',
          }}>
            {t('scanProgress')}
          </span>
        </motion.div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}>
          {STAT_CARDS.map((card, index) => (
            <motion.div
              key={card.valueKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.08 }}
              viewport={{ once: true }}
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.9) 0%, rgba(25, 10, 10, 0.9) 100%)',
                border: `1px solid ${card.color}15`,
                borderRadius: '8px',
                padding: '20px 16px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.3s ease, transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${card.color}40`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${card.color}15`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Card glow */}
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '80%', height: '1px',
                background: `linear-gradient(90deg, transparent, ${card.color}30, transparent)`,
              }} />

              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{card.icon}</div>
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 700,
                color: card.color,
                textShadow: `0 0 20px ${card.glowColor}`,
                marginBottom: '6px',
                lineHeight: 1,
              }}>
                <AnimatedNumber
                  value={stats ? stats[card.valueKey] : 0}
                  isInView={isInView}
                  delay={300 + index * 150}
                />
              </div>
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '0.6rem',
                color: '#666',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                {t(card.labelKey)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            marginTop: '40px',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            color: '#444',
            letterSpacing: '0.1em',
          }}
        >
          {t('tagline')}
        </motion.div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes landing-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </section>
  );
}
