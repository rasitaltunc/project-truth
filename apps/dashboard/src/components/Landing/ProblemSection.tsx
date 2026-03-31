'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
//  "CHAOS → CLARITY"
//
//  Design principle: ONE powerful reveal, not continuous motion.
//  - Start: documents scattered, faded, tilted. Threads barely visible.
//  - Scroll: documents organize, sharpen, align. Threads draw in.
//  - End: documents morph into a clean network diagram.
//
//  "The most effective animations are those visitors don't
//   consciously notice — they just make everything feel more
//   responsive and professional." — Awwwards research
// ═══════════════════════════════════════════════════════════

const VW = 600, VH = 600, DW = 60, DH = 75;

// ─── Document data: chaos, grid, and network positions ───

interface DocDef {
  id: number;
  // Chaos state (scattered, like thrown on a desk)
  cx: number; cy: number; crot: number;
  // Grid state (organized 4x4)
  gx: number; gy: number;
  // Network state (final nodes)
  nx: number; ny: number;
  type: string;
  label: string;
}

// Grid layout: 4x4, evenly spaced
const GRID = (col: number, row: number) => ({
  gx: 35 + col * 142,
  gy: 30 + row * 145,
});

const DOC_DEFS: DocDef[] = [
  // Row 0
  { id: 0,  cx: 10,  cy: -10,  crot: -14, ...GRID(0,0), nx: 300, ny: 300, type: 'court',     label: 'Case #2019-CV' },
  { id: 1,  cx: 185, cy: 15,   crot: 9,   ...GRID(1,0), nx: 180, ny: 200, type: 'financial',  label: 'Wire Transfer' },
  { id: 2,  cx: 370, cy: -20,  crot: -7,  ...GRID(2,0), nx: 420, ny: 220, type: 'flight',    label: 'Flight Log' },
  { id: 3,  cx: 505, cy: 5,    crot: 16,  ...GRID(3,0), nx: 150, ny: 360, type: 'leaked',    label: '████ REDACT' },

  // Row 1
  { id: 4,  cx: 55,  cy: 120,  crot: -19, ...GRID(0,1), nx: 430, ny: 370, type: 'testimony', label: 'Deposition' },
  { id: 5,  cx: 230, cy: 155,  crot: 11,  ...GRID(1,1), nx: 300, ny: 150, type: 'court',     label: 'Indictment' },
  { id: 6,  cx: 380, cy: 110,  crot: -4,  ...GRID(2,1), nx: 520, ny: 300, type: 'photo',     label: 'Exhibit GX' },
  { id: 7,  cx: 490, cy: 150,  crot: 13,  ...GRID(3,1), nx: 80,  ny: 300, type: 'financial',  label: 'Account ███' },

  // Row 2
  { id: 8,  cx: -5,  cy: 270,  crot: 8,   ...GRID(0,2), nx: 300, ny: 430, type: 'testimony', label: 'Witness #4' },
  { id: 9,  cx: 200, cy: 290,  crot: -15, ...GRID(1,2), nx: 200, ny: 450, type: 'flight',    label: 'Manifest' },
  { id: 10, cx: 360, cy: 255,  crot: 6,   ...GRID(2,2), nx: 420, ny: 450, type: 'leaked',    label: 'Offshore ██' },
  { id: 11, cx: 520, cy: 280,  crot: -10, ...GRID(3,2), nx: 160, ny: 120, type: 'court',     label: 'Plea Deal' },

  // Row 3
  { id: 12, cx: 40,  cy: 410,  crot: -12, ...GRID(0,3), nx: 460, ny: 120, type: 'photo',     label: 'Surveillance' },
  { id: 13, cx: 220, cy: 430,  crot: 7,   ...GRID(1,3), nx: 80,  ny: 450, type: 'financial',  label: 'Trust Doc' },
  { id: 14, cx: 395, cy: 400,  crot: -8,  ...GRID(2,3), nx: 530, ny: 450, type: 'testimony', label: 'Grand Jury' },
  { id: 15, cx: 510, cy: 420,  crot: 14,  ...GRID(3,3), nx: 80,  ny: 160, type: 'leaked',    label: 'Int. Memo' },
];

// Threads between documents
const THREAD_PAIRS: [number, number][] = [
  [0, 1], [0, 4], [0, 8], [1, 5], [2, 6], [2, 12],
  [3, 7], [3, 10], [4, 14], [5, 11], [6, 10], [7, 13],
  [8, 9], [9, 13], [11, 15], [12, 14], [1, 3], [5, 0],
];

// Final network overlay
const NET_NODES = [
  { x: 300, y: 300, r: 22, tier: 1, label: 'EPSTEIN' },
  { x: 180, y: 200, r: 17, tier: 2, label: 'MAXWELL' },
  { x: 420, y: 220, r: 15, tier: 2, label: 'WEXNER' },
  { x: 150, y: 380, r: 12, tier: 3, label: 'BRUNEL' },
  { x: 430, y: 380, r: 12, tier: 3, label: 'ANDREW' },
  { x: 300, y: 140, r: 11, tier: 3, label: 'KELLEN' },
  { x: 520, y: 300, r: 11, tier: 3, label: 'BANK' },
  { x: 80,  y: 300, r: 10, tier: 3, label: 'ISLAND' },
];

const NET_LINKS: [number, number][] = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
  [1,3],[1,5],[2,6],[3,7],[4,6],
];

const TIER_C: Record<number, string> = { 1: '#dc2626', 2: '#991b1b', 3: '#7f1d1d' };
const DOC_C: Record<string, string> = {
  court: '#dc2626', financial: '#22c55e', testimony: '#eab308',
  flight: '#a855f7', photo: '#3b82f6', leaked: '#ef4444',
};

// ─── Ghost documents: background density layer (small, faint, numerous) ───
// These never organize — they just create "volume" and fade out during reveal
const GHOST_DOCS: Array<{ x: number; y: number; rot: number; w: number; h: number; color: string }> = [
  { x: -15,  y: 55,   rot: -22, w: 32, h: 40, color: '#2a2a2a' },
  { x: 100,  y: -25,  rot: 18,  w: 28, h: 36, color: '#333' },
  { x: 255,  y: 70,   rot: -8,  w: 30, h: 38, color: '#2e2e2e' },
  { x: 340,  y: -15,  rot: 25,  w: 26, h: 34, color: '#2a2a2a' },
  { x: 480,  y: 65,   rot: -13, w: 34, h: 42, color: '#333' },
  { x: 570,  y: 130,  rot: 11,  w: 28, h: 36, color: '#2e2e2e' },
  { x: 30,   y: 200,  rot: -17, w: 30, h: 38, color: '#2a2a2a' },
  { x: 145,  y: 245,  rot: 6,   w: 26, h: 34, color: '#333' },
  { x: 290,  y: 195,  rot: -20, w: 32, h: 40, color: '#2e2e2e' },
  { x: 420,  y: 240,  rot: 14,  w: 28, h: 36, color: '#2a2a2a' },
  { x: 555,  y: 210,  rot: -9,  w: 30, h: 38, color: '#333' },
  { x: -10,  y: 340,  rot: 19,  w: 26, h: 34, color: '#2e2e2e' },
  { x: 115,  y: 370,  rot: -15, w: 32, h: 40, color: '#2a2a2a' },
  { x: 260,  y: 350,  rot: 7,   w: 28, h: 36, color: '#333' },
  { x: 395,  y: 325,  rot: -23, w: 30, h: 38, color: '#2e2e2e' },
  { x: 530,  y: 370,  rot: 12,  w: 26, h: 34, color: '#2a2a2a' },
  { x: 55,   y: 480,  rot: -10, w: 32, h: 40, color: '#333' },
  { x: 185,  y: 510,  rot: 16,  w: 28, h: 36, color: '#2e2e2e' },
  { x: 330,  y: 470,  rot: -6,  w: 30, h: 38, color: '#2a2a2a' },
  { x: 460,  y: 500,  rot: 21,  w: 26, h: 34, color: '#333' },
  { x: 575,  y: 465,  rot: -14, w: 32, h: 40, color: '#2e2e2e' },
  { x: 75,   y: 90,   rot: 23,  w: 24, h: 32, color: '#282828' },
  { x: 435,  y: 150,  rot: -19, w: 24, h: 32, color: '#282828' },
  { x: 195,  y: 430,  rot: 10,  w: 24, h: 32, color: '#282828' },
  { x: 510,  y: 540,  rot: -8,  w: 24, h: 32, color: '#282828' },
];

// ─── Utility ───
function clamp01(t: number) { return Math.min(1, Math.max(0, t)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t); }
function interpolate(v: number, input: number[], output: number[]) {
  for (let i = 0; i < input.length - 1; i++) {
    if (v <= input[i + 1]) {
      const t = (v - input[i]) / (input[i + 1] - input[i]);
      return output[i] + (output[i + 1] - output[i]) * clamp01(t);
    }
  }
  return output[output.length - 1];
}

// Smooth ease with overshoot — "snap into place" feel
function easeOutBack(t: number): number {
  const c = clamp01(t);
  const s = 1.4; // overshoot amount (1.70158 = standard, 1.4 = subtle)
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
}
function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// ═══════════════════════════════════════════════════════════
//  SCROLL TIMELINE
//
//  0.00 - 0.25  CHAOS — docs scattered, faded, threads ghost
//  0.25 - 0.50  ORGANIZE — docs slide to grid, sharpen, threads draw
//  0.50 - 0.68  HOLD — organized, threads visible, satisfying pause
//  0.68 - 0.88  NETWORK — docs shrink/fade, nodes emerge
//  0.88 - 1.00  COMPLETE — full network
// ═══════════════════════════════════════════════════════════

interface VizState {
  organizeT: number;   // 0: chaos, 1: grid
  networkT: number;    // 0: grid/docs, 1: network nodes
  threadDrawT: number; // 0: no threads, 1: fully drawn
  docOpacity: number;  // document card opacity
  docBlur: number;     // 0: clear, 1: blurry (faked via opacity reduction)
  threadOp: number;    // thread line opacity
  netOp: number;       // network node opacity
  docScale: number;    // document card scale
}

// ═══════════════════════════════════════════════════════════
//  SVG DOCUMENT CARD
// ═══════════════════════════════════════════════════════════

function DocCard({ def, x, y, rot, opacity, scale, blurAmount }: {
  def: DocDef; x: number; y: number; rot: number;
  opacity: number; scale: number; blurAmount: number;
}) {
  const vividColor = DOC_C[def.type];
  const cx = x + DW / 2;
  const cy = y + DH / 2;

  // ─── Color story: grey chaos → vivid organized ───
  // sharpness 0 = full chaos (grey, desaturated)
  // sharpness 1 = full clarity (vivid, high contrast)
  const sharpness = 1 - blurAmount;

  // In chaos: use warm grey — visible but desaturated; in clarity: full vivid color
  const chaosColor = '#999';
  // Color "blooms" as documents organize — grey → vivid
  const color = sharpness < 0.4 ? chaosColor : vividColor;
  const colorOp = sharpness < 0.4 ? lerp(0.7, 1, sharpness * 2.5) : 1;

  const strokeOp = lerp(0.6, 1.5, sharpness);
  const textOp = lerp(0.15, 0.9, sharpness);
  const lineOp = lerp(0.08, 0.22, sharpness);
  const fillBright = lerp(0.09, 0.07, sharpness); // slightly brighter in chaos, darker when organized (contrast flip)

  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot}) scale(${scale}) translate(${-DW/2},${-DH/2})`}
       opacity={opacity}>
      {/* Shadow */}
      <rect x={3} y={3} width={DW} height={DH} rx={2}
        fill="rgba(0,0,0,0.5)" opacity={lerp(0.3, 0.6, sharpness)} />
      {/* Paper body */}
      <rect x={0} y={0} width={DW} height={DH} rx={2}
        fill={`rgb(${Math.round(fillBright*255)},${Math.round(fillBright*255)},${Math.round(fillBright*255)})`}
        stroke={color} strokeWidth={strokeOp} opacity={colorOp} />
      {/* Top color bar — blooms from grey to vivid */}
      <line x1={0} y1={0} x2={DW} y2={0}
        stroke={color} strokeWidth={2.5} opacity={lerp(0.35, 0.7, sharpness)} />
      {/* Fold corner */}
      <path d={`M${DW-12},0 L${DW},0 L${DW},12Z`}
        fill={color} opacity={lerp(0.05, 0.35, sharpness)} />
      {/* Type label */}
      <text x={4} y={13} fontSize={6} fontFamily="'Courier New', monospace"
        fontWeight="bold" letterSpacing="0.1em" fill={color} opacity={textOp}>
        {def.type.toUpperCase()}
      </text>
      {/* Text lines — grey in chaos, colored when organized */}
      {[20, 26, 32, 38, 44].map((ly, i) => (
        <line key={i} x1={4} y1={ly} x2={4 + (DW - 8) * (0.85 - i * 0.08)} y2={ly}
          stroke={sharpness > 0.5 ? color : '#444'} strokeWidth={0.6} opacity={lineOp - i * 0.02} />
      ))}
      {/* Bottom label — only visible when sharp */}
      {sharpness > 0.3 && (
        <text x={4} y={DH - 5} fontSize={4.5} fontFamily="'Courier New', monospace"
          fill="#999" opacity={lerp(0, 0.65, clamp01((sharpness - 0.3) / 0.7))}>
          {def.label}
        </text>
      )}
      {/* Redaction bars */}
      {def.type === 'leaked' && (
        <>
          <rect x={4} y={28} width={35} height={5} fill="#060606" rx={1}
            stroke="#333" strokeWidth={0.3} opacity={sharpness * 0.8} />
          <rect x={10} y={38} width={25} height={5} fill="#060606" rx={1}
            stroke="#333" strokeWidth={0.3} opacity={sharpness * 0.8} />
        </>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ProblemSection() {
  const t = useTranslations('landing.problem');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ─── Scroll tracking ───
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Text cards
  const s1Op = useTransform(scrollYProgress, [0, 0.22, 0.30], [1, 1, 0]);
  const s1Y  = useTransform(scrollYProgress, [0, 0.03], [20, 0]);
  const s2Op = useTransform(scrollYProgress, [0.28, 0.35, 0.58, 0.65], [0, 1, 1, 0]);
  const s2Y  = useTransform(scrollYProgress, [0.28, 0.35], [40, 0]);
  const s3Op = useTransform(scrollYProgress, [0.63, 0.70, 0.95, 1], [0, 1, 1, 0.9]);
  const s3Y  = useTransform(scrollYProgress, [0.63, 0.70], [40, 0]);

  // ─── Visualization state (single scroll listener) ───
  const [viz, setViz] = useState<VizState>({
    organizeT: 0, networkT: 0, threadDrawT: 0,
    docOpacity: 0.85, docBlur: 1, threadOp: 0.04,
    netOp: 0, docScale: 1,
  });

  useMotionValueEvent(scrollYProgress, 'change', (v: number) => {
    const orgRaw = interpolate(v, [0.25, 0.50], [0, 1]);
    const organizeT = easeOutBack(orgRaw); // snap into place with subtle overshoot

    setViz({
      organizeT,
      networkT:    easeInOutCubic(interpolate(v, [0.68, 0.88], [0, 1])),
      threadDrawT: interpolate(v, [0.32, 0.58], [0, 1]),
      docOpacity:  interpolate(v, [0.00, 0.25, 0.80, 0.92], [0.85, 1, 1, 0]),
      docBlur:     interpolate(v, [0.22, 0.45], [1, 0]),
      threadOp:    interpolate(v, [0.00, 0.32, 0.55, 0.80, 0.92], [0.04, 0.04, 0.7, 0.7, 0]),
      netOp:       interpolate(v, [0.78, 0.92], [0, 1]),
      docScale:    interpolate(v, [0.00, 0.30, 0.75, 0.90], [0.92, 1.0, 1.0, 0.35]),
    });
  });

  // ─── Compute current positions ───
  const { organizeT, networkT, threadDrawT, docOpacity, docBlur, threadOp, netOp, docScale } = viz;

  // ═══════════ SVG ═══════════
  const svg = (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%"
      style={{ display: 'block' }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="p-glow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="p-glow-sm">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── LAYER 0: Ghost documents (density / volume layer — fades out during organize) ── */}
      {docBlur > 0.05 && (
        <g opacity={lerp(0.1, 0.8, docBlur)}>
          {GHOST_DOCS.map((g, i) => (
            <g key={`ghost-${i}`} transform={`rotate(${g.rot}, ${g.x + g.w/2}, ${g.y + g.h/2})`}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={1}
                fill={g.color} opacity={0.7} />
              {/* Top edge line for "document" feel */}
              <line x1={g.x} y1={g.y} x2={g.x + g.w} y2={g.y}
                stroke="#666" strokeWidth={1} opacity={0.5} />
            </g>
          ))}
        </g>
      )}

      {/* ── LAYER 1: Thread ghost lines (barely visible in chaos, bright in organized) ── */}
      <g opacity={threadOp}>
        {THREAD_PAIRS.map(([a, b], idx) => {
          const da = DOC_DEFS[a], db = DOC_DEFS[b];

          // Position follows document positions: chaos → grid → network
          const axChaos = da.cx + DW/2, ayChaos = da.cy + DH/2;
          const axGrid  = da.gx + DW/2, ayGrid  = da.gy + DH/2;
          const axNet   = da.nx,         ayNet   = da.ny;
          const bxChaos = db.cx + DW/2, byChaos = db.cy + DH/2;
          const bxGrid  = db.gx + DW/2, byGrid  = db.gy + DH/2;
          const bxNet   = db.nx,         byNet   = db.ny;

          const ax = lerp(lerp(axChaos, axGrid, organizeT), axNet, networkT);
          const ay = lerp(lerp(ayChaos, ayGrid, organizeT), ayNet, networkT);
          const bx = lerp(lerp(bxChaos, bxGrid, organizeT), bxNet, networkT);
          const by = lerp(lerp(byChaos, byGrid, organizeT), byNet, networkT);

          if ([ax,ay,bx,by].some(v => !isFinite(v))) return null;

          const lineLen = Math.sqrt((bx-ax)**2 + (by-ay)**2) || 1;
          // Staggered thread draw
          const perThread = 1 / THREAD_PAIRS.length;
          const threadStart = idx * perThread * 0.5;
          const localT = clamp01((threadDrawT - threadStart) / (perThread + 0.3));

          return (
            <line key={`th-${idx}`}
              x1={ax} y1={ay} x2={bx} y2={by}
              stroke="#dc2626" strokeWidth={1.2}
              filter="url(#p-glow-sm)"
              strokeDasharray={lineLen}
              strokeDashoffset={lineLen * (1 - localT)}
            />
          );
        })}
      </g>

      {/* ── LAYER 2: Document cards (chaos → grid → shrink away) ── */}
      {docOpacity > 0.01 && (
        <g>
          {DOC_DEFS.map((def) => {
            // Interpolate position: chaos → grid → network
            const x = lerp(lerp(def.cx, def.gx, organizeT), def.nx - DW/2, networkT);
            const y = lerp(lerp(def.cy, def.gy, organizeT), def.ny - DH/2, networkT);
            const rot = lerp(lerp(def.crot, 0, organizeT), 0, networkT);

            return (
              <DocCard key={def.id} def={def}
                x={x} y={y} rot={rot}
                opacity={docOpacity}
                scale={docScale}
                blurAmount={docBlur}
              />
            );
          })}
        </g>
      )}

      {/* ── LAYER 3: Network nodes (emerge from documents) ── */}
      {netOp > 0.01 && (
        <g opacity={netOp}>
          {NET_LINKS.map(([a, b], idx) => {
            const na = NET_NODES[a], nb = NET_NODES[b];
            const lineLen = Math.sqrt((nb.x-na.x)**2 + (nb.y-na.y)**2);
            const localT = clamp01((netOp - 0.1 - idx * 0.04) / 0.5);
            return (
              <line key={`nl-${idx}`}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="#dc2626" strokeWidth={1.5} opacity={0.3}
                filter="url(#p-glow-sm)"
                strokeDasharray={lineLen}
                strokeDashoffset={lineLen * (1 - localT)}
              />
            );
          })}
          {NET_NODES.map((n, i) => {
            const c = TIER_C[n.tier];
            const nodeT = clamp01((netOp - 0.15 - i * 0.06) / 0.4);
            return (
              <g key={`nn-${i}`}
                transform={`translate(${n.x},${n.y}) scale(${nodeT}) translate(${-n.x},${-n.y})`}
                opacity={nodeT}>
                <circle cx={n.x} cy={n.y} r={n.r * 2}
                  fill="none" stroke={c} strokeWidth={0.6} opacity={0.15} />
                <circle cx={n.x} cy={n.y} r={n.r * 1.4}
                  fill={c} opacity={0.1} filter="url(#p-glow)" />
                <circle cx={n.x} cy={n.y} r={n.r}
                  fill={c} filter="url(#p-glow-sm)" />
                <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fontSize={9}
                  fontFamily="'Courier New', monospace" fontWeight="bold" letterSpacing="0.1em"
                  fill="#e5e5e5" opacity={0.7}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );

  // ═══════════ MOBILE LAYOUT ═══════════
  if (isMobile) {
    return (
      <section ref={containerRef}
        style={{ position: 'relative', height: '400vh', background: '#030303' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: '1 1 55%', position: 'relative' }}>
            {svg}
          </div>
          <div style={{
            flex: '1 1 45%', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}>
            <motion.div style={{
              opacity: s1Op, y: s1Y, position: 'absolute',
              inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '1.5rem',
            }}>
              <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{
                  fontFamily: "'Courier New', monospace", fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                  fontWeight: 900, color: '#dc2626', lineHeight: 1, marginBottom: '0.5rem',
                }}>{t('scene1Num')}</div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                  color: '#e5e5e5', lineHeight: 1.5, margin: '0 0 0.5rem' }}>{t('scene1Big')}</p>
                <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: 0 }}>{t('scene1Sub')}</p>
              </div>
            </motion.div>
            <motion.div style={{
              opacity: s2Op, y: s2Y, position: 'absolute',
              inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '1.5rem',
            }}>
              <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                  color: '#e5e5e5', lineHeight: 1.4, margin: '0 0 0.5rem', fontStyle: 'italic' }}>{t('scene2Big')}</p>
                <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.5, margin: 0 }}>{t('scene2Sub')}</p>
              </div>
            </motion.div>
            <motion.div style={{
              opacity: s3Op, y: s3Y, position: 'absolute',
              inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '1.5rem',
            }}>
              <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                  color: '#e5e5e5', lineHeight: 1.4, margin: '0 0 1rem' }}>{t('scene3Big')}</p>
                <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.5, margin: '0 0 1.5rem' }}>{t('scene3Sub')}</p>
                <Link href={`/${locale}/truth`} style={{
                  display: 'inline-block', background: '#dc2626', color: '#fff',
                  padding: '12px 28px', borderRadius: 2, fontFamily: "'Courier New', monospace",
                  letterSpacing: '0.15em', fontSize: '0.8rem', fontWeight: 600,
                  textDecoration: 'none', textTransform: 'uppercase' as const,
                }}>{t('scene3Cta')} →</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ═══════════ DESKTOP: STICKY LEFT + SCROLLING RIGHT ═══════════
  return (
    <section ref={containerRef}
      style={{ position: 'relative', height: '400vh', background: '#030303', display: 'flex', alignItems: 'flex-start' }}>

      {/* LEFT: Sticky SVG */}
      <div style={{
        position: 'sticky', top: 0, height: '100vh', width: '55%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', alignSelf: 'flex-start',
      }}>
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(220,38,38,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px', opacity: 0.5,
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 600, aspectRatio: '1 / 1', position: 'relative' }}>
          {svg}

          {/* Corner frame */}
          <div style={{
            position: 'absolute', inset: -1,
            border: '1px solid rgba(220,38,38,0.08)', borderRadius: 2,
            pointerEvents: 'none',
          }}>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 20, height: 20,
              borderTop: '2px solid rgba(220,38,38,0.2)', borderLeft: '2px solid rgba(220,38,38,0.2)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 20, height: 20,
              borderBottom: '2px solid rgba(220,38,38,0.2)', borderRight: '2px solid rgba(220,38,38,0.2)' }} />
          </div>
        </div>
      </div>

      {/* RIGHT: Scrolling text cards */}
      <div style={{ width: '45%', display: 'flex', flexDirection: 'column',
        paddingRight: '3rem', paddingLeft: '2rem' }}>

        {/* SCENE 1 — Chaos: "11.5 million documents" */}
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
          <motion.div style={{ opacity: s1Op, y: s1Y }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 30, height: 1, background: '#dc2626', opacity: 0.4 }} />
              <span style={{
                fontFamily: "'Courier New', monospace", fontSize: '0.65rem',
                letterSpacing: '0.3em', color: '#dc2626', opacity: 0.6, fontWeight: 600,
              }}>{t('label')}</span>
            </div>
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: 'clamp(3rem, 5vw, 4.5rem)',
              fontWeight: 900, color: '#dc2626', lineHeight: 1, marginBottom: '0.5rem',
            }}>{t('scene1Num')}</div>
            <h2 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              fontWeight: 400, color: '#e5e5e5', lineHeight: 1.4,
              margin: '0 0 1rem 0', maxWidth: 420,
            }}>{t('scene1Big')}</h2>
            <p style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1rem)',
              color: '#666', lineHeight: 1.7, maxWidth: 380, margin: 0,
            }}>{t('scene1Sub')}</p>
          </motion.div>
        </div>

        {/* SCENE 2 — The Reveal: "What if every connection was visible?" */}
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
          <motion.div style={{ opacity: s2Op, y: s2Y }}>
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: '2.5rem',
              color: 'rgba(220,38,38,0.15)', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1,
            }}>02</div>
            <h2 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              fontWeight: 400, color: '#e5e5e5', lineHeight: 1.4,
              margin: '0 0 1rem 0', fontStyle: 'italic', maxWidth: 420,
            }}>{t('scene2Big')}</h2>
            <p style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1rem)',
              color: '#666', lineHeight: 1.7, maxWidth: 380, margin: 0,
            }}>{t('scene2Sub')}</p>
          </motion.div>
        </div>

        {/* SCENE 3 — Network: "This is what Project Truth does." */}
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
          <motion.div style={{ opacity: s3Op, y: s3Y }}>
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: '2.5rem',
              color: 'rgba(34,197,94,0.15)', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1,
            }}>03</div>
            <h2 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              fontWeight: 400, color: '#e5e5e5', lineHeight: 1.4,
              margin: '0 0 0.75rem 0', maxWidth: 420,
            }}>{t('scene3Big')}</h2>
            <p style={{
              fontSize: 'clamp(0.85rem, 1.3vw, 1rem)',
              color: '#888', lineHeight: 1.7, maxWidth: 380, margin: '0 0 2rem 0',
            }}>{t('scene3Sub')}</p>
            <Link href={`/${locale}/truth`}
              style={{
                display: 'inline-block', background: '#dc2626', color: '#ffffff',
                padding: '14px 36px', borderRadius: 2, fontFamily: "'Courier New', monospace",
                letterSpacing: '0.15em', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', textTransform: 'uppercase' as const,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#b91c1c'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'scale(1)'; }}
            >{t('scene3Cta')} →</Link>
          </motion.div>
        </div>

        <div style={{ minHeight: '50vh' }} />
      </div>
    </section>
  );
}
