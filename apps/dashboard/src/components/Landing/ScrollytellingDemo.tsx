'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  label: string;
  tier: number;
  r: number;
}

interface NetworkLink {
  from: string;
  to: string;
  type: 'associate' | 'financial' | 'property' | 'testimony' | 'evidence';
}

const NODES: NetworkNode[] = [
  { id: 'A', x: 300, y: 150, label: 'EPSTEIN', tier: 1, r: 14 },
  { id: 'B', x: 180, y: 250, label: 'MAXWELL', tier: 1, r: 12 },
  { id: 'C', x: 420, y: 280, label: 'BANK', tier: 2, r: 10 },
  { id: 'D', x: 140, y: 380, label: 'ISLAND', tier: 3, r: 8 },
  { id: 'E', x: 350, y: 400, label: 'FOUNDATION', tier: 2, r: 10 },
  { id: 'F', x: 480, y: 150, label: 'FLIGHT LOG', tier: 3, r: 8 },
  { id: 'G', x: 250, y: 100, label: 'WITNESS', tier: 3, r: 7 },
  { id: 'H', x: 450, y: 380, label: 'COURT DOC', tier: 3, r: 7 },
];

const LINKS: NetworkLink[] = [
  { from: 'A', to: 'B', type: 'associate' },
  { from: 'A', to: 'C', type: 'financial' },
  { from: 'A', to: 'D', type: 'property' },
  { from: 'B', to: 'D', type: 'associate' },
  { from: 'A', to: 'E', type: 'financial' },
  { from: 'A', to: 'F', type: 'evidence' },
  { from: 'B', to: 'G', type: 'testimony' },
  { from: 'C', to: 'E', type: 'financial' },
  { from: 'D', to: 'H', type: 'evidence' },
  { from: 'F', to: 'G', type: 'evidence' },
];

function getTierColor(tier: number): string {
  if (tier === 1) return '#dc2626';
  if (tier === 2) return '#991b1b';
  return '#7f1d1d';
}

function getEvidenceTypeColor(type: string): string {
  switch (type) {
    case 'financial': return '#22c55e';
    case 'evidence': return '#3b82f6';
    case 'associate': return '#dc2626';
    case 'testimony': return '#eab308';
    case 'property': return '#a855f7';
    default: return '#dc2626';
  }
}

export default function ScrollytellingDemo() {
  const t = useTranslations('landing.scrollytelling');
  const locale = useLocale();
  const svgRef = useRef<HTMLDivElement>(null);
  const isSvgInView = useInView(svgRef, { once: false, amount: 0.5 });

  const [isMobile, setIsMobile] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'nodes' | 'links' | 'highlight' | 'epistemology'>('idle');
  const [dashOffset, setDashOffset] = useState(0);
  const [showInfoCard, setShowInfoCard] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-play animation sequence when section comes into view
  useEffect(() => {
    if (!isSvgInView) {
      setAnimationPhase('idle');
      return;
    }

    const timeline = [
      { phase: 'nodes', delay: 0 },
      { phase: 'links', delay: 1500 },
      { phase: 'highlight', delay: 3000 },
      { phase: 'epistemology', delay: 4500 },
    ];

    let timeoutIds: NodeJS.Timeout[] = [];
    timeline.forEach(({ phase, delay }) => {
      const id = setTimeout(() => {
        setAnimationPhase(phase as typeof animationPhase);
      }, delay);
      timeoutIds.push(id);
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, [isSvgInView]);

  // Animate highlight glow appearance
  useEffect(() => {
    if (animationPhase === 'highlight') {
      setShowInfoCard(true);
    }
  }, [animationPhase]);

  // Dash animation (continuous)
  useEffect(() => {
    if (animationPhase !== 'epistemology') return;
    const interval = setInterval(() => {
      setDashOffset((prev) => (prev + 2) % 20);
    }, 50);
    return () => clearInterval(interval);
  }, [animationPhase]);

  const getNode = (id: string) => NODES.find((n) => n.id === id)!;

  // All hooks MUST be at top level (before any conditional returns)
  const mobileStep1Ref = useRef<HTMLDivElement>(null);
  const mobileStep2Ref = useRef<HTMLDivElement>(null);
  const mobileStep3Ref = useRef<HTMLDivElement>(null);
  const mobileStep4Ref = useRef<HTMLDivElement>(null);
  const mobileStep1InView = useInView(mobileStep1Ref, { once: true, amount: 0.5 });
  const mobileStep2InView = useInView(mobileStep2Ref, { once: true, amount: 0.5 });
  const mobileStep3InView = useInView(mobileStep3Ref, { once: true, amount: 0.5 });
  const mobileStep4InView = useInView(mobileStep4Ref, { once: true, amount: 0.5 });

  // Desktop step refs
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  const step1InView = useInView(step1Ref, { once: false, amount: 0.5 });
  const step2InView = useInView(step2Ref, { once: false, amount: 0.5 });
  const step3InView = useInView(step3Ref, { once: false, amount: 0.5 });
  const step4InView = useInView(step4Ref, { once: false, amount: 0.5 });
  const step5InView = useInView(step5Ref, { once: false, amount: 0.5 });

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    const mobileStepRefs = [mobileStep1Ref, mobileStep2Ref, mobileStep3Ref, mobileStep4Ref];
    const mobileStepInViews = [mobileStep1InView, mobileStep2InView, mobileStep3InView, mobileStep4InView];

    return (
      <section
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#030303',
          paddingTop: '4rem',
          paddingBottom: '4rem',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          {/* SVG Visualization */}
          <div
            ref={svgRef}
            style={{
              width: '100%',
              height: '50vh',
              backgroundColor: '#030303',
              border: '1px solid rgba(220,38,38,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <svg viewBox="0 0 600 500" width="100%" height="100%" style={{ display: 'block' }}>
              {LINKS.map((link, idx) => {
                const fromNode = getNode(link.from);
                const toNode = getNode(link.to);
                const isVisible = animationPhase === 'links' || animationPhase === 'highlight' || animationPhase === 'epistemology';
                const color = animationPhase === 'epistemology' ? getEvidenceTypeColor(link.type) : 'rgba(220,38,38,0.3)';
                return (
                  <motion.line
                    key={`link-${idx}`}
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x} y2={toNode.y}
                    stroke={color}
                    strokeWidth={animationPhase === 'epistemology' ? 1.5 : 1}
                    strokeDasharray={animationPhase === 'epistemology' ? '5,5' : 'none'}
                    strokeDashoffset={animationPhase === 'epistemology' ? dashOffset : 0}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transition: 'stroke 0.3s ease' }}
                  />
                );
              })}
              {NODES.map((node, idx) => {
                const color = getTierColor(node.tier);
                const isVisible = animationPhase !== 'idle';
                return (
                  <motion.g
                    key={`node-${node.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                  >
                    <circle cx={node.x} cy={node.y} r={node.r} fill={color} />
                    <text
                      x={node.x} y={node.y + 3}
                      textAnchor="middle" fontSize="8" fill="#ffffff"
                      fontFamily="monospace" fontWeight="bold"
                    >
                      {node.label.substring(0, 3)}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Text cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            {[1, 2, 3, 4].map((step, idx) => (
              <motion.div
                key={`step-${step}`}
                ref={mobileStepRefs[idx]}
                style={{ minHeight: '50vh', display: 'flex', alignItems: 'center' }}
                initial={{ opacity: 0, y: 20 }}
                animate={mobileStepInViews[idx] ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6 }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '2rem',
                    color: 'rgba(220,38,38,0.4)', fontWeight: 'bold', marginBottom: '0.5rem',
                  }}>
                    0{step}
                  </div>
                  <h2 style={{
                    fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
                    fontWeight: 400, lineHeight: 1.2, marginBottom: '1rem',
                  }}>
                    {t(`step${step}Title`)}
                  </h2>
                  <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.7 }}>
                    {t(`step${step}Text`)}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* CTA Step */}
            <motion.div
              style={{ minHeight: '50vh', display: 'flex', alignItems: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, amount: 0.5 }}
            >
              <div style={{ width: '100%' }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: '2rem',
                  color: 'rgba(220,38,38,0.4)', fontWeight: 'bold', marginBottom: '0.5rem',
                }}>
                  05
                </div>
                <h2 style={{
                  fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
                  fontWeight: 400, lineHeight: 1.2, marginBottom: '2rem',
                }}>
                  Ready to investigate?
                </h2>
                <Link
                  href={`/${locale}/truth`}
                  style={{
                    display: 'inline-block', backgroundColor: '#dc2626', color: 'white',
                    padding: '14px 36px', borderRadius: '2px', fontFamily: 'monospace',
                    letterSpacing: '0.15em', fontSize: '0.85rem', fontWeight: 600,
                    textDecoration: 'none', textTransform: 'uppercase' as const,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                >
                  {t('step5Cta')}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ─── DESKTOP LAYOUT: sticky left + scrolling right ───
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        backgroundColor: '#030303',
        paddingTop: '6rem',
        paddingBottom: '6rem',
      }}
    >
      <style>{`
        .scroll-glow-filter {
          filter: drop-shadow(0 0 8px rgba(220,38,38,0.6));
        }
        .scroll-label-glow {
          text-shadow: 0 0 8px rgba(220,38,38,0.4);
        }
      `}</style>

      {/* LEFT: Sticky SVG Visualization (55%) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '55%',
          paddingRight: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div
          ref={svgRef}
          style={{
            width: '100%',
            maxWidth: '600px',
            aspectRatio: '600 / 500',
            backgroundColor: '#030303',
            border: '1px solid rgba(220,38,38,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 600 500"
            width="100%"
            height="100%"
            style={{ display: 'block', backgroundColor: '#030303' }}
          >
            {/* Glow filter definition */}
            <defs>
              <filter id="scrolly-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Links */}
            {LINKS.map((link, idx) => {
              const fromNode = getNode(link.from);
              const toNode = getNode(link.to);
              const isLinksVisible = animationPhase === 'links' || animationPhase === 'highlight' || animationPhase === 'epistemology';
              const isEpistemo = animationPhase === 'epistemology';
              const color = isEpistemo ? getEvidenceTypeColor(link.type) : 'rgba(220,38,38,0.3)';

              return (
                <motion.line
                  key={`link-${idx}`}
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x} y2={toNode.y}
                  stroke={color}
                  strokeWidth={isEpistemo ? 1.5 : 1}
                  strokeDasharray={isEpistemo ? '5,5' : 'none'}
                  strokeDashoffset={isEpistemo ? dashOffset : 0}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isLinksVisible ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transition: 'stroke 0.3s ease' }}
                />
              );
            })}

            {/* Nodes with staggered entrance */}
            {NODES.map((node, idx) => {
              const color = getTierColor(node.tier);
              const isVisible = animationPhase !== 'idle';

              return (
                <motion.g
                  key={`node-${node.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isVisible ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.08 }}
                >
                  {/* Highlight glow ring around EPSTEIN (stage 3) */}
                  {node.id === 'A' && (
                    <motion.circle
                      cx={node.x} cy={node.y}
                      r={node.r + 6}
                      fill="none"
                      stroke="rgba(220,38,38,0.4)"
                      strokeWidth="2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: (animationPhase === 'highlight' || animationPhase === 'epistemology') ? 0.8 : 0 }}
                      transition={{ duration: 0.5 }}
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(220,38,38,0.6))',
                      }}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.r}
                    fill={color}
                    filter="url(#scrolly-glow)"
                  />

                  {/* Node label */}
                  <text
                    x={node.x} y={node.y + 3}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#ffffff"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="scroll-label-glow"
                  >
                    {node.label.substring(0, 3)}
                  </text>
                </motion.g>
              );
            })}

            {/* Stage 3: Info card for EPSTEIN */}
            {showInfoCard && (animationPhase === 'highlight' || animationPhase === 'epistemology') && (
              <motion.foreignObject
                x="310" y="100" width="140" height="80"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(3,3,3,0.95)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: '2px',
                    padding: '0.5rem',
                    fontSize: '7px',
                    fontFamily: 'monospace',
                    color: '#e5e5e5',
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#dc2626' }}>JEFFREY EPSTEIN</div>
                  <div style={{ fontSize: '6px', color: '#a3a3a3', marginTop: '0.25rem' }}>
                    Tier 1 Mastermind
                  </div>
                  <div style={{ fontSize: '6px', color: '#a3a3a3', marginTop: '0.25rem' }}>
                    6 connections
                  </div>
                  <div style={{ fontSize: '6px', color: '#a3a3a3', marginTop: '0.25rem' }}>
                    10 verified links
                  </div>
                </div>
              </motion.foreignObject>
            )}
          </svg>
        </div>
      </div>

      {/* RIGHT: Scrolling Text Cards (45%) */}
      <div
        style={{
          width: '45%',
          paddingLeft: '2rem',
          paddingRight: '2rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Step 1 */}
        <motion.div
          ref={step1Ref}
          style={{ minHeight: '75vh', display: 'flex', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={step1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '3rem', color: 'rgba(220,38,38,0.4)',
              fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1,
            }}>
              01
            </div>
            <h2 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
              fontWeight: 400, lineHeight: 1.2, marginBottom: '1rem',
            }}>
              {t('step1Title')}
            </h2>
            <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.7, maxWidth: '95%' }}>
              {t('step1Text')}
            </p>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          ref={step2Ref}
          style={{ minHeight: '75vh', display: 'flex', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={step2InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '3rem', color: 'rgba(220,38,38,0.4)',
              fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1,
            }}>
              02
            </div>
            <h2 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
              fontWeight: 400, lineHeight: 1.2, marginBottom: '1rem',
            }}>
              {t('step2Title')}
            </h2>
            <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.7, maxWidth: '95%' }}>
              {t('step2Text')}
            </p>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          ref={step3Ref}
          style={{ minHeight: '75vh', display: 'flex', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={step3InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '3rem', color: 'rgba(220,38,38,0.4)',
              fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1,
            }}>
              03
            </div>
            <h2 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
              fontWeight: 400, lineHeight: 1.2, marginBottom: '1rem',
            }}>
              {t('step3Title')}
            </h2>
            <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.7, maxWidth: '95%' }}>
              {t('step3Text')}
            </p>
          </div>
        </motion.div>

        {/* Step 4 */}
        <motion.div
          ref={step4Ref}
          style={{ minHeight: '75vh', display: 'flex', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={step4InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '3rem', color: 'rgba(220,38,38,0.4)',
              fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1,
            }}>
              04
            </div>
            <h2 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
              fontWeight: 400, lineHeight: 1.2, marginBottom: '1rem',
            }}>
              {t('step4Title')}
            </h2>
            <p style={{ fontSize: '1rem', color: '#a3a3a3', lineHeight: 1.7, maxWidth: '95%' }}>
              {t('step4Text')}
            </p>
          </div>
        </motion.div>

        {/* Step 5 - CTA */}
        <motion.div
          ref={step5Ref}
          style={{ minHeight: '75vh', display: 'flex', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={step5InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '3rem', color: 'rgba(220,38,38,0.4)',
              fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1,
            }}>
              05
            </div>
            <h2 style={{
              fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#ffffff',
              fontWeight: 400, lineHeight: 1.2, marginBottom: '2rem',
            }}>
              Ready to investigate?
            </h2>
            <Link
              href={`/${locale}/truth`}
              style={{
                display: 'inline-block', backgroundColor: '#dc2626', color: 'white',
                padding: '14px 36px', borderRadius: '2px', fontFamily: 'monospace',
                letterSpacing: '0.15em', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', border: 'none', cursor: 'pointer',
                transition: 'all 0.2s ease', textTransform: 'uppercase' as const,
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
              {t('step5Cta')}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
