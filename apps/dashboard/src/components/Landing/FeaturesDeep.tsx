'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Feature 1 SVG visuals helper
const Feature1Visual = ({ expandedIdx }: { expandedIdx: number | null }) => {
  // Dead Man Switch (idx=1): Timer with chain and alarm
  if (expandedIdx === 1) {
    return (
      <svg viewBox="0 0 400 300" width="100%" height="100%">
        <defs>
          <style>{`
            @keyframes countdown-ring {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 251.2; }
            }
            @keyframes check-in-pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
            @keyframes alarm-bell {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-8deg); }
              75% { transform: rotate(8deg); }
            }
            .countdown-ring {
              animation: countdown-ring 4s linear infinite;
              transform-origin: 200px 120px;
            }
            .check-in-dot {
              animation: check-in-pulse 2s ease-in-out infinite;
            }
            .alarm-icon {
              animation: alarm-bell 0.5s ease-in-out infinite;
              transform-origin: 350px 120px;
            }
          `}</style>
          <filter id="green-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="red-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Central timer circle */}
        <circle cx="200" cy="120" r="50" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="1" />

        {/* Countdown ring (animated) */}
        <circle
          cx="200"
          cy="120"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeDasharray="251.2"
          className="countdown-ring"
          filter="url(#green-glow)"
        />

        {/* Timer icon in center */}
        <g>
          <circle cx="200" cy="120" r="25" fill="none" stroke="#dc2626" strokeWidth="2" />
          <line x1="200" y1="95" x2="200" y2="110" stroke="#dc2626" strokeWidth="2" />
          <line x1="220" y1="120" x2="205" y2="120" stroke="#dc2626" strokeWidth="2" />
        </g>

        {/* Chain of check-in dots leading to alarm bell */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <circle
              cx={210 + i * 25}
              cy="180"
              r="4"
              fill="#22c55e"
              filter="url(#green-glow)"
              className="check-in-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
            {i < 4 && (
              <line
                x1={214 + i * 25}
                y1="180"
                x2={210 + (i + 1) * 25}
                y2="180"
                stroke="rgba(34,197,94,0.4)"
                strokeWidth="1"
              />
            )}
          </g>
        ))}

        {/* Alarm bell icon at end of chain */}
        <g className="alarm-icon">
          <path
            d="M 360 165 L 355 165 L 355 175 Q 355 180 360 180 Q 365 180 365 175 L 365 165 Z"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <circle cx="360" cy="160" r="3" fill="#fbbf24" />
        </g>

        {/* Break point indicator */}
        <text
          x="200"
          y="240"
          fontSize="12"
          fontFamily="monospace"
          fill="rgba(220,38,38,0.7)"
          textAnchor="middle"
        >
          Chain Breaks → Red Alarm
        </text>
      </svg>
    );
  }

  // Kademeli Alarm (idx=3): Three escalation levels
  if (expandedIdx === 3) {
    return (
      <svg viewBox="0 0 400 300" width="100%" height="100%">
        <defs>
          <style>{`
            @keyframes level2-pulse {
              0%, 100% { opacity: 0.6; r: 16px; }
              50% { opacity: 1; r: 20px; }
            }
            @keyframes level3-pulse {
              0%, 100% { opacity: 0.5; r: 24px; }
              50% { opacity: 1; r: 30px; }
            }
            .level2-circle {
              animation: level2-pulse 1.5s ease-in-out infinite;
            }
            .level3-circle {
              animation: level3-pulse 1s ease-in-out infinite;
            }
          `}</style>
          <filter id="level1-filter">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="level2-filter">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="level3-filter">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Level 1: Silent (Top) */}
        <g>
          <circle cx="200" cy="50" r="10" fill="none" stroke="#6b7280" strokeWidth="2" filter="url(#level1-filter)" />
          <text x="200" y="56" fontSize="12" fontFamily="monospace" fill="#6b7280" textAnchor="middle">
            🔇
          </text>
          <text x="200" y="85" fontSize="11" fontFamily="monospace" fill="rgba(220,38,38,0.6)" textAnchor="middle">
            LEVEL 1: SILENT
          </text>
          <text x="200" y="100" fontSize="9" fontFamily="monospace" fill="rgba(220,38,38,0.4)" textAnchor="middle">
            Guardians Notified
          </text>
        </g>

        {/* Arrow Down to Level 2 */}
        <line x1="200" y1="105" x2="200" y2="130" stroke="rgba(220,38,38,0.2)" strokeWidth="1" />
        <polygon points="200,125 195,132 205,132" fill="rgba(220,38,38,0.2)" />
        <text x="215" y="120" fontSize="9" fontFamily="monospace" fill="rgba(220,38,38,0.5)">
          48h
        </text>

        {/* Level 2: Yellow Alert (Middle) */}
        <g>
          <circle cx="200" cy="160" r="16" fill="none" stroke="#eab308" strokeWidth="2.5" filter="url(#level2-filter)" className="level2-circle" />
          <text x="200" y="168" fontSize="16" fontFamily="monospace" fill="#eab308" textAnchor="middle">
            ⚠
          </text>
          <text x="200" y="195" fontSize="11" fontFamily="monospace" fill="rgba(220,38,38,0.6)" textAnchor="middle">
            LEVEL 2: YELLOW
          </text>
          <text x="200" y="210" fontSize="9" fontFamily="monospace" fill="rgba(220,38,38,0.4)" textAnchor="middle">
            Wider Circle Alerted
          </text>
        </g>

        {/* Arrow Down to Level 3 */}
        <line x1="200" y1="215" x2="200" y2="235" stroke="rgba(220,38,38,0.2)" strokeWidth="1" />
        <polygon points="200,230 195,237 205,237" fill="rgba(220,38,38,0.2)" />
        <text x="215" y="225" fontSize="9" fontFamily="monospace" fill="rgba(220,38,38,0.5)">
          72h
        </text>

        {/* Level 3: Red Alert (Bottom) */}
        <g>
          <circle cx="200" cy="260" r="24" fill="none" stroke="#dc2626" strokeWidth="3" filter="url(#level3-filter)" className="level3-circle" />
          <text x="200" y="271" fontSize="20" fontFamily="monospace" fill="#dc2626" textAnchor="middle" fontWeight="bold">
            🔴
          </text>
        </g>

        <text x="200" y="295" fontSize="11" fontFamily="monospace" fill="#dc2626" textAnchor="middle" fontWeight="bold">
          RED ALERT: DOCUMENTS RELEASED
        </text>
      </svg>
    );
  }

  // Default/Shamir expanded (idx=2 or null): Shamir Secret Sharing
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%">
      <defs>
        <style>{`
          @keyframes shamir-split {
            0% {
              transform: translate(0, 0);
              opacity: 1;
            }
            25% {
              transform: translate(0, 0);
              opacity: 1;
            }
            45% {
              transform: translate(var(--tx), var(--ty));
              opacity: 0;
            }
            55% {
              transform: translate(var(--tx), var(--ty));
              opacity: 1;
            }
            85% {
              transform: translate(var(--tx), var(--ty));
              opacity: 1;
            }
            100% {
              transform: translate(0, 0);
              opacity: 1;
            }
          }
          .shard {
            animation: shamir-split 8s ease-in-out infinite;
          }
          .shard:nth-child(1) { --tx: -80px; --ty: -80px; animation-delay: 0s; }
          .shard:nth-child(2) { --tx: 80px; --ty: -80px; animation-delay: 0.2s; }
          .shard:nth-child(3) { --tx: 100px; --ty: 40px; animation-delay: 0.4s; }
          .shard:nth-child(4) { --tx: -100px; --ty: 40px; animation-delay: 0.6s; }
          .shard:nth-child(5) { --tx: 0px; --ty: 100px; animation-delay: 0.8s; }
          .key-icon {
            animation: key-pulse 8s ease-in-out infinite;
          }
          @keyframes key-pulse {
            0%, 25%, 100% { opacity: 1; }
            40%, 60% { opacity: 0.1; }
          }
        `}</style>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Center Key Icon */}
      <g className="key-icon">
        <rect
          x="175"
          y="120"
          width="50"
          height="60"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          rx="2"
        />
        <circle
          cx="235"
          cy="150"
          r="10"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
        />
        <rect
          x="245"
          y="145"
          width="15"
          height="10"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
        />
      </g>

      {/* 5 Shard Fragments in Circle */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * 2 * Math.PI;
        const cx = 200 + 60 * Math.cos(angle);
        const cy = 150 + 60 * Math.sin(angle);
        return (
          <g key={i} className="shard">
            <polygon
              points={`${cx},${cy - 8} ${cx + 8},${cy + 4} ${cx - 8},${cy + 4}`}
              fill="#dc2626"
              filter="url(#glow)"
            />
            <text
              x={cx}
              y={cy + 25}
              fontSize="10"
              fontFamily="monospace"
              fill="rgba(220,38,38,0.6)"
              textAnchor="middle"
            >
              SHARD {i + 1}
            </text>
          </g>
        );
      })}

      {/* 5 Guardian Icons */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * 2 * Math.PI;
        const gx = 200 + 130 * Math.cos(angle);
        const gy = 150 + 130 * Math.sin(angle);
        return (
          <g key={`guardian-${i}`}>
            <circle
              cx={gx}
              cy={gy}
              r="6"
              fill="rgba(220,38,38,0.4)"
              stroke="#dc2626"
              strokeWidth="1"
            />
            <line
              x1={200 + 68 * Math.cos(angle)}
              y1={150 + 68 * Math.sin(angle)}
              x2={gx}
              y2={gy}
              stroke="rgba(220,38,38,0.2)"
              strokeWidth="0.5"
            />
          </g>
        );
      })}
    </svg>
  );
};

// Feature 2 SVG visual with toggle
const Feature2Visual = ({ toggleState }: { toggleState: boolean }) => {
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%">
      <defs>
        <style>{`
          @keyframes cable-pulse-1 {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 40; }
          }
          @keyframes cable-pulse-2 {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 40; }
          }
          @keyframes cable-pulse-3 {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 40; }
          }
          .cable-1 {
            animation: cable-pulse-1 1.5s linear infinite;
          }
          .cable-2 {
            animation: cable-pulse-2 2s linear infinite;
          }
          .cable-3 {
            animation: cable-pulse-3 2.5s linear infinite;
          }
        `}</style>
        <filter id="cable-glow-red">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cable-glow-green">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cable-glow-yellow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence mode="wait">
        {toggleState ? (
          <motion.g
            key="epistemological"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' as const }}
          >
            {/* EPISTEMOLOGICAL MODE: Colored flowing cables */}
            {/* Cable 1: Court Record (Red, High Confidence) */}
            <line
              x1="20"
              y1="80"
              x2="360"
              y2="80"
              stroke="#dc2626"
              strokeWidth="3"
              opacity="0.9"
            />
            <line
              x1="20"
              y1="80"
              x2="360"
              y2="80"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="4,8"
              className="cable-1"
              filter="url(#cable-glow-red)"
            />
            <text
              x="20"
              y="105"
              fontSize="10"
              fontFamily="monospace"
              fill="rgba(220,38,38,0.8)"
            >
              Court Record · 95%
            </text>

            {/* Cable 2: Financial Trail (Green, Medium Confidence) */}
            <line
              x1="20"
              y1="150"
              x2="360"
              y2="150"
              stroke="#22c55e"
              strokeWidth="3"
              opacity="0.6"
            />
            <line
              x1="20"
              y1="150"
              x2="360"
              y2="150"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="4,8"
              className="cable-2"
              filter="url(#cable-glow-green)"
            />
            <text
              x="20"
              y="175"
              fontSize="10"
              fontFamily="monospace"
              fill="rgba(34,197,94,0.8)"
            >
              Financial Trail · 72%
            </text>

            {/* Cable 3: Testimony (Yellow, Low Confidence) */}
            <line
              x1="20"
              y1="220"
              x2="360"
              y2="220"
              stroke="#eab308"
              strokeWidth="3"
              opacity="0.4"
            />
            <line
              x1="20"
              y1="220"
              x2="360"
              y2="220"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray="4,8"
              className="cable-3"
              filter="url(#cable-glow-yellow)"
            />
            <text
              x="20"
              y="245"
              fontSize="10"
              fontFamily="monospace"
              fill="rgba(234,179,8,0.8)"
            >
              Testimony · 45%
            </text>
          </motion.g>
        ) : (
          <motion.g
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' as const }}
          >
            {/* NORMAL MODE: Static red boring lines */}
            <line x1="20" y1="80" x2="360" y2="80" stroke="#dc2626" strokeWidth="2" opacity="0.3" />
            <text x="20" y="105" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.4)">
              Connection 1
            </text>

            <line x1="20" y1="150" x2="360" y2="150" stroke="#dc2626" strokeWidth="2" opacity="0.3" />
            <text x="20" y="175" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.4)">
              Connection 2
            </text>

            <line x1="20" y1="220" x2="360" y2="220" stroke="#dc2626" strokeWidth="2" opacity="0.3" />
            <text x="20" y="245" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.4)">
              Connection 3
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
};

// Feature 2 Detail Visual Helper Component
const Feature2DetailVisual = ({ idx }: { idx: number }) => {
  if (idx === 1) {
    // Kanıt Türleri: Colored dots with labels
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(220,38,38,0.1)',
        }}
      >
        {[
          { color: '#dc2626', label: 'Court Record', emoji: '🔴' },
          { color: '#22c55e', label: 'Financial', emoji: '🟢' },
          { color: '#eab308', label: 'Testimony', emoji: '🟡' },
          { color: '#3b82f6', label: 'Official Doc', emoji: '🔵' },
          { color: '#f97316', label: 'Leaked', emoji: '🟠' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: '#a3a3a3',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.color,
                opacity: 0.8,
              }}
            />
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (idx === 2) {
    // Güven Seviyeleri: Mini confidence bar visualization
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(220,38,38,0.1)',
        }}
      >
        {[
          { percentage: 95, label: 'Very High', color: '#dc2626' },
          { percentage: 72, label: 'Medium', color: '#22c55e' },
          { percentage: 45, label: 'Low', color: '#eab308' },
        ].map((item, i) => (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#999999',
                marginBottom: '4px',
              }}
            >
              <span>{item.label}</span>
              <span>{item.percentage}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(220,38,38,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (idx === 3) {
    // Kaynak Hiyerarşisi: Pyramid diagram
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(220,38,38,0.1)',
        }}
      >
        {[
          { label: 'Primary', opacity: 1, width: '100%' },
          { label: 'Secondary', opacity: 0.6, width: '70%' },
          { label: 'Tertiary', opacity: 0.35, width: '40%' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              width: item.width,
              padding: '8px',
              backgroundColor: `rgba(220,38,38,${item.opacity * 0.3})`,
              border: `1px solid rgba(220,38,38,${item.opacity * 0.5})`,
              borderRadius: '2px',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: `rgba(255,255,255,${item.opacity})`,
              fontFamily: 'monospace',
              transition: 'all 0.3s ease',
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

// Feature 3 SVG: Collective Investigation 4-Step Process (Auto-Cycling)
const Feature3Visual = () => {
  const [step, setStep] = useState(1);

  // Auto-cycle through steps 1-4 every 2.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%">
      <defs>
        <style>{`
          @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes slide-in-doc {
            0% { transform: translateY(-20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes fill-progress {
            0% { width: 0%; }
            100% { width: 73%; }
          }
          @keyframes solid-line-draw {
            0% { stroke-dasharray: 200; stroke-dashoffset: 200; }
            100% { stroke-dasharray: 200; stroke-dashoffset: 0; }
          }
          @keyframes checkmark-pop {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(0deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes confirmed-glow {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(34,197,94,0.4)); }
            50% { filter: drop-shadow(0 0 8px rgba(34,197,94,0.8)); }
          }
          .node-circle { fill: none; stroke-width: 2; }
          .step-fade-in { animation: fade-in 0.4s ease-in; }
          .doc-slide { animation: slide-in-doc 0.5s ease-out; }
          .progress-fill { animation: fill-progress 1.5s ease-out forwards; }
          .solid-line { animation: solid-line-draw 0.8s ease-out forwards; }
          .checkmark { animation: checkmark-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .confirmed-glow { animation: confirmed-glow 1.2s ease-in-out infinite; }
        `}</style>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Step Indicator at top */}
      <text
        x="200"
        y="25"
        fontSize="10"
        fontFamily="monospace"
        fill="rgba(220,38,38,0.6)"
        textAnchor="middle"
        className="step-fade-in"
      >
        STEP {step} / 4
      </text>

      {/* ===== STEP 1: İP UZAT (Cast a Thread) ===== */}
      {step === 1 && (
        <g className="step-fade-in">
          {/* Person A (left node) */}
          <circle cx="70" cy="150" r="24" className="node-circle" stroke="#dc2626" filter="url(#glow-red)" />
          <text x="70" y="158" fontSize="16" textAnchor="middle" fill="#dc2626">👤</text>

          {/* Ghost dashed line */}
          <line x1="94" y1="150" x2="306" y2="150" stroke="rgba(220,38,38,0.3)" strokeWidth="2" strokeDasharray="6,4" />

          {/* Plus icon on line */}
          <circle cx="200" cy="150" r="10" fill="none" stroke="rgba(220,38,38,0.5)" strokeWidth="1.5" />
          <text x="200" y="155" fontSize="12" textAnchor="middle" fill="rgba(220,38,38,0.6)">+</text>

          {/* Person B (right node) */}
          <circle cx="330" cy="150" r="24" className="node-circle" stroke="#dc2626" filter="url(#glow-red)" />
          <text x="330" y="158" fontSize="16" textAnchor="middle" fill="#dc2626">👤</text>

          {/* Label */}
          <text x="200" y="220" fontSize="13" fontFamily="monospace" fill="#ffffff" textAnchor="middle" fontWeight="bold">
            İP UZAT
          </text>
          <text x="200" y="240" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.6)" textAnchor="middle">
            PROPOSE CONNECTION
          </text>
        </g>
      )}

      {/* ===== STEP 2: KANITLA (Evidence) ===== */}
      {step === 2 && (
        <g className="step-fade-in">
          {/* Person A & B (smaller) */}
          <circle cx="80" cy="140" r="20" className="node-circle" stroke="#dc2626" opacity="0.6" />
          <text x="80" y="148" fontSize="14" textAnchor="middle" fill="#dc2626">👤</text>

          {/* Solid line */}
          <line x1="100" y1="140" x2="300" y2="140" stroke="#dc2626" strokeWidth="2" />

          <circle cx="320" cy="140" r="20" className="node-circle" stroke="#dc2626" opacity="0.6" />
          <text x="320" y="148" fontSize="14" textAnchor="middle" fill="#dc2626">👤</text>

          {/* Evidence cards sliding in */}
          <g className="doc-slide" style={{ animationDelay: '0.1s' }}>
            <rect x="140" y="165" width="30" height="35" fill="none" stroke="#c0eb75" strokeWidth="1.5" />
            <text x="155" y="192" fontSize="12" textAnchor="middle" fill="#c0eb75">📄</text>
          </g>

          <g className="doc-slide" style={{ animationDelay: '0.3s' }}>
            <rect x="185" y="175" width="30" height="35" fill="none" stroke="#c0eb75" strokeWidth="1.5" />
            <text x="200" y="202" fontSize="12" textAnchor="middle" fill="#c0eb75">💰</text>
          </g>

          <g className="doc-slide" style={{ animationDelay: '0.5s' }}>
            <rect x="230" y="165" width="30" height="35" fill="none" stroke="#c0eb75" strokeWidth="1.5" />
            <text x="245" y="192" fontSize="12" textAnchor="middle" fill="#c0eb75">🔗</text>
          </g>

          {/* Counter */}
          <text x="200" y="235" fontSize="11" fontFamily="monospace" fill="#a3a3a3" textAnchor="middle">
            3 KANIT
          </text>

          {/* Label */}
          <text x="200" y="260" fontSize="13" fontFamily="monospace" fill="#ffffff" textAnchor="middle" fontWeight="bold">
            KANITLA
          </text>
          <text x="200" y="280" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.6)" textAnchor="middle">
            ADD EVIDENCE
          </text>
        </g>
      )}

      {/* ===== STEP 3: OYLA (Community Vote) ===== */}
      {step === 3 && (
        <g className="step-fade-in">
          {/* Voting icons with weights */}
          {/* Tier 1 - Big thumbs up */}
          <g>
            <circle cx="80" cy="120" r="18" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <text x="80" y="130" fontSize="16" textAnchor="middle" fill="#fbbf24">👍</text>
          </g>

          {/* Tier 2 - Medium thumbs up */}
          <g>
            <circle cx="150" cy="140" r="14" fill="none" stroke="#c0eb75" strokeWidth="1.5" />
            <text x="150" y="148" fontSize="13" textAnchor="middle" fill="#c0eb75">👍</text>
          </g>

          {/* Tier 3 - Small thumbs up */}
          <g>
            <circle cx="210" cy="155" r="10" fill="none" stroke="#a3a3a3" strokeWidth="1" />
            <text x="210" y="160" fontSize="10" textAnchor="middle" fill="#a3a3a3">👍</text>
          </g>

          {/* Small thumbs down */}
          <g>
            <circle cx="280" cy="150" r="9" fill="none" stroke="rgba(220,38,38,0.5)" strokeWidth="1" />
            <text x="280" y="155" fontSize="9" textAnchor="middle" fill="rgba(220,38,38,0.5)">👎</text>
          </g>

          {/* Progress bar */}
          <rect x="50" y="200" width="300" height="20" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="1" rx="2" />
          <rect x="50" y="200" width="0" height="20" fill="#dc2626" rx="2" className="progress-fill" />

          {/* Percentage */}
          <text x="360" y="212" fontSize="10" fontFamily="monospace" fill="#dc2626" fontWeight="bold">
            73%
          </text>

          {/* Label */}
          <text x="200" y="260" fontSize="13" fontFamily="monospace" fill="#ffffff" textAnchor="middle" fontWeight="bold">
            OYLA
          </text>
          <text x="200" y="280" fontSize="10" fontFamily="monospace" fill="rgba(220,38,38,0.6)" textAnchor="middle">
            COMMUNITY VOTE
          </text>
        </g>
      )}

      {/* ===== STEP 4: DOĞRULANDI (Verified) ===== */}
      {step === 4 && (
        <g className="step-fade-in">
          {/* Person A & B */}
          <circle cx="80" cy="150" r="22" className="node-circle" stroke="#22c55e" filter="url(#glow-green)" />
          <text x="80" y="158" fontSize="16" textAnchor="middle" fill="#22c55e">👤</text>

          {/* Solid confirmed line with glow */}
          <line x1="102" y1="150" x2="298" y2="150" stroke="#22c55e" strokeWidth="3" className="solid-line confirmed-glow" />

          <circle cx="320" cy="150" r="22" className="node-circle" stroke="#22c55e" filter="url(#glow-green)" />
          <text x="320" y="158" fontSize="16" textAnchor="middle" fill="#22c55e">👤</text>

          {/* Checkmark badge on line */}
          <circle cx="200" cy="150" r="16" fill="#22c55e" />
          <text x="200" y="160" fontSize="20" textAnchor="middle" fill="#ffffff" className="checkmark">
            ✓
          </text>

          {/* Label */}
          <text x="200" y="240" fontSize="13" fontFamily="monospace" fill="#ffffff" textAnchor="middle" fontWeight="bold">
            DOĞRULANDI
          </text>
          <text x="200" y="260" fontSize="10" fontFamily="monospace" fill="#22c55e" textAnchor="middle">
            VERIFIED ✓
          </text>
        </g>
      )}
    </svg>
  );
};

export default function FeaturesDeep() {
  const t = useTranslations('landing.features');

  // State for expandable detail cards
  const [expandedF1, setExpandedF1] = useState<number | null>(null);
  const [expandedF2, setExpandedF2] = useState<number | null>(null);
  const [expandedF3, setExpandedF3] = useState<number | null>(null);

  // Feature 2 epistemological toggle state
  const [f2EpistemologicalMode, setF2EpistemologicalMode] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = (offset: number) => ({
    hidden: { opacity: 0, x: offset },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: 'easeOut' as const },
    },
  });

  // ============ FEATURE 1: JOURNALIST SHIELD ============
  const Feature1 = () => (
    <motion.div
      className="feature-section"
      style={{
        padding: '100px 40px 60px',
        borderBottom: '1px solid rgba(220,38,38,0.06)',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      {/* Section Label */}
      <div
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          fontFamily: 'monospace',
          color: 'rgba(220,38,38,0.7)',
          marginBottom: '60px',
          textTransform: 'uppercase',
        }}
      >
        {t('label')}
      </div>

      {/* Feature Block - Text Left, Visual Right */}
      <div
        style={{
          display: 'flex',
          gap: '60px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Text Side */}
        <motion.div
          style={{ flex: '1 1 50%', minWidth: '300px' }}
          variants={itemVariants(-30)}
        >
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              color: '#ffffff',
              margin: '0 0 12px 0',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {t('f1Title')}
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#dc2626',
              margin: '0 0 20px 0',
              fontWeight: 400,
            }}
          >
            {t('f1Subtitle')}
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: '1rem',
              color: '#a3a3a3',
              lineHeight: 1.7,
              margin: '0 0 32px 0',
            }}
          >
            {t('f1Text')}
          </p>

          {/* Detail Cards */}
          <div style={{ marginBottom: '32px' }}>
            {[1, 2, 3].map((idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <button
                  onClick={() =>
                    setExpandedF1(expandedF1 === idx ? null : idx)
                  }
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(220,38,38,0.1)',
                    padding: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#e5e5e5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    borderColor: expandedF1 === idx ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.1)',
                    backgroundColor: expandedF1 === idx ? 'rgba(220,38,38,0.02)' : 'transparent',
                  }}
                >
                  <span>{t(`f1Detail${idx}Title`)}</span>
                  <span style={{ marginLeft: '12px' }}>
                    {expandedF1 === idx ? '▾' : '▸'}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedF1 === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          paddingTop: '0',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#a3a3a3',
                          lineHeight: 1.6,
                        }}
                      >
                        {t(`f1Detail${idx}Text`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Quote */}
          <blockquote
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.1rem',
              color: 'rgba(220,38,38,0.8)',
              fontStyle: 'italic',
              borderLeft: '2px solid #dc2626',
              paddingLeft: '1rem',
              margin: '0',
              lineHeight: 1.6,
            }}
          >
            "{t('f1Quote')}"
          </blockquote>
        </motion.div>

        {/* Visual Side - Feature 1 Dynamic Visuals */}
        <motion.div
          style={{
            flex: '1 1 45%',
            minWidth: '300px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          variants={itemVariants(30)}
        >
          <div
            style={{
              border: '1px solid rgba(220,38,38,0.08)',
              backgroundColor: 'rgba(10,10,10,0.5)',
              padding: '40px',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px',
              aspectRatio: '400/300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feature1Visual expandedIdx={expandedF1} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  // ============ FEATURE 2: EPISTEMOLOGICAL LAYER ============
  const Feature2 = () => (
    <motion.div
      className="feature-section"
      style={{
        padding: '100px 40px 60px',
        borderBottom: '1px solid rgba(220,38,38,0.06)',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      {/* Feature Block - Text Right, Visual Left (reversed) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: '60px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Text Side */}
        <motion.div
          style={{ flex: '1 1 50%', minWidth: '300px' }}
          variants={itemVariants(30)}
        >
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              color: '#ffffff',
              margin: '0 0 12px 0',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {t('f2Title')}
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#dc2626',
              margin: '0 0 20px 0',
              fontWeight: 400,
            }}
          >
            {t('f2Subtitle')}
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: '1rem',
              color: '#a3a3a3',
              lineHeight: 1.7,
              margin: '0 0 32px 0',
            }}
          >
            {t('f2Text')}
          </p>

          {/* Epistemological Toggle Switch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: 'rgba(220,38,38,0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(220,38,38,0.1)',
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: f2EpistemologicalMode ? 'rgba(220,38,38,0.5)' : '#e5e5e5',
                fontWeight: f2EpistemologicalMode ? 400 : 600,
              }}
            >
              NORMAL
            </span>

            <button
              onClick={() => setF2EpistemologicalMode(!f2EpistemologicalMode)}
              style={{
                display: 'flex',
                width: '48px',
                height: '24px',
                backgroundColor: f2EpistemologicalMode ? '#dc2626' : '#6b7280',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.3s ease',
                padding: '2px',
                alignItems: 'center',
              }}
            >
              <motion.div
                animate={{
                  x: f2EpistemologicalMode ? 24 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' as const }}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            </button>

            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: f2EpistemologicalMode ? '#e5e5e5' : 'rgba(220,38,38,0.5)',
                fontWeight: f2EpistemologicalMode ? 600 : 400,
              }}
            >
              EPİSTEMOLOJİK
            </span>
          </div>

          {/* Detail Cards */}
          <div style={{ marginBottom: '32px' }}>
            {[1, 2, 3].map((idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <button
                  onClick={() =>
                    setExpandedF2(expandedF2 === idx ? null : idx)
                  }
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(220,38,38,0.1)',
                    padding: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#e5e5e5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    borderColor: expandedF2 === idx ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.1)',
                    backgroundColor: expandedF2 === idx ? 'rgba(220,38,38,0.02)' : 'transparent',
                  }}
                >
                  <span>{t(`f2Detail${idx}Title`)}</span>
                  <span style={{ marginLeft: '12px' }}>
                    {expandedF2 === idx ? '▾' : '▸'}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedF2 === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          paddingTop: '0',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#a3a3a3',
                          lineHeight: 1.6,
                        }}
                      >
                        <Feature2DetailVisual idx={idx} />
                        {t(`f2Detail${idx}Text`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual Side - Feature 2 Cable with Toggle */}
        <motion.div
          style={{
            flex: '1 1 45%',
            minWidth: '300px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          variants={itemVariants(-30)}
        >
          <div
            style={{
              border: '1px solid rgba(220,38,38,0.08)',
              backgroundColor: 'rgba(10,10,10,0.5)',
              padding: '40px',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px',
              aspectRatio: '400/300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feature2Visual toggleState={f2EpistemologicalMode} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  // ============ FEATURE 3: COLLECTIVE INVESTIGATION ============
  const Feature3 = () => (
    <motion.div
      className="feature-section"
      style={{
        padding: '100px 40px 60px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      {/* Feature Block - Text Left, Visual Right */}
      <div
        style={{
          display: 'flex',
          gap: '60px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Text Side */}
        <motion.div
          style={{ flex: '1 1 50%', minWidth: '300px' }}
          variants={itemVariants(-30)}
        >
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              color: '#ffffff',
              margin: '0 0 12px 0',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {t('f3Title')}
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#dc2626',
              margin: '0 0 20px 0',
              fontWeight: 400,
            }}
          >
            {t('f3Subtitle')}
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: '1rem',
              color: '#a3a3a3',
              lineHeight: 1.7,
              margin: '0 0 32px 0',
            }}
          >
            {t('f3Text')}
          </p>

          {/* Detail Cards */}
          <div style={{ marginBottom: '32px' }}>
            {[1, 2, 3].map((idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <button
                  onClick={() =>
                    setExpandedF3(expandedF3 === idx ? null : idx)
                  }
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(220,38,38,0.1)',
                    padding: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#e5e5e5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    borderColor: expandedF3 === idx ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.1)',
                    backgroundColor: expandedF3 === idx ? 'rgba(220,38,38,0.02)' : 'transparent',
                  }}
                >
                  <span>{t(`f3Detail${idx}Title`)}</span>
                  <span style={{ marginLeft: '12px' }}>
                    {expandedF3 === idx ? '▾' : '▸'}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedF3 === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          paddingTop: '0',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#a3a3a3',
                          lineHeight: 1.6,
                        }}
                      >
                        {t(`f3Detail${idx}Text`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual Side - Feature 3 Badge Tier Progression */}
        <motion.div
          style={{
            flex: '1 1 45%',
            minWidth: '300px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          variants={itemVariants(30)}
        >
          <div
            style={{
              border: '1px solid rgba(220,38,38,0.08)',
              backgroundColor: 'rgba(10,10,10,0.5)',
              padding: '40px',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px',
              aspectRatio: '400/300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feature3Visual />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div>
      <Feature1 />
      <Feature2 />
      <Feature3 />
    </div>
  );
}
