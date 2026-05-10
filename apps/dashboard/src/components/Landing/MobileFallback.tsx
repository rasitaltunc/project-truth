'use client';

import { useMemo } from 'react';

// ── Static 2D network visualization for mobile / no-WebGL ──
// CSS-only animated dots and lines — zero JS overhead

interface NodeDot {
  x: number;
  y: number;
  size: number;
  tier: number;
  name: string;
  delay: number;
}

const MOBILE_NODES: NodeDot[] = [
  { x: 50, y: 45, size: 14, tier: 1, name: 'Jeffrey Epstein', delay: 0 },
  { x: 68, y: 35, size: 10, tier: 2, name: 'Ghislaine Maxwell', delay: 0.2 },
  { x: 32, y: 30, size: 10, tier: 2, name: 'Jean-Luc Brunel', delay: 0.3 },
  { x: 60, y: 60, size: 9, tier: 2, name: 'Les Wexner', delay: 0.4 },
  { x: 38, y: 62, size: 9, tier: 2, name: 'Sarah Kellen', delay: 0.5 },
  { x: 78, y: 50, size: 7, tier: 3, name: 'Prince Andrew', delay: 0.6 },
  { x: 22, y: 50, size: 7, tier: 3, name: 'Alan Dershowitz', delay: 0.7 },
  { x: 55, y: 25, size: 7, tier: 3, name: 'Harvard University', delay: 0.8 },
  { x: 75, y: 65, size: 6, tier: 3, name: 'Bear Stearns', delay: 0.9 },
  { x: 28, y: 70, size: 6, tier: 3, name: 'JP Morgan', delay: 1.0 },
  { x: 82, y: 28, size: 6, tier: 3, name: 'Virgin Islands', delay: 1.1 },
  { x: 18, y: 38, size: 6, tier: 3, name: 'MC2 Modeling', delay: 1.2 },
];

const MOBILE_LINKS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 2], [1, 5], [3, 8], [4, 9], [0, 7], [0, 10], [2, 11],
];

const TIER_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#991b1b',
  3: '#7f1d1d',
};

export default function MobileFallback() {
  const css = useMemo(() => `
    @keyframes mobilePulse {
      0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
    }
    @keyframes mobileFadeIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes mobileLineIn {
      from { opacity: 0; }
      to { opacity: 0.2; }
    }
  `, []);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* SVG lines */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {MOBILE_LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={MOBILE_NODES[a].x}
            y1={MOBILE_NODES[a].y}
            x2={MOBILE_NODES[b].x}
            y2={MOBILE_NODES[b].y}
            stroke="#dc2626"
            strokeWidth="0.15"
            style={{
              opacity: 0,
              animation: `mobileLineIn 0.8s ease-out ${0.5 + i * 0.1}s forwards`,
            }}
          />
        ))}
      </svg>

      {/* Dots */}
      {MOBILE_NODES.map((node, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
            borderRadius: '50%',
            backgroundColor: TIER_COLORS[node.tier],
            boxShadow: `0 0 ${node.size * 2}px ${TIER_COLORS[node.tier]}40`,
            opacity: 0,
            animation: `mobileFadeIn 0.5s ease-out ${node.delay}s forwards, mobilePulse ${3 + i * 0.3}s ease-in-out ${node.delay + 0.5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
