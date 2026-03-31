'use client';

// ═══════════════════════════════════════════
// BOARD MINIMAP — Sağ Alt Köşe Mini Harita
// Sprint 8: Soruşturma Panosu
// Tüm node'ları küçük nokta olarak gösterir
// Viewport dikdörtgeni ile navigasyon
// ═══════════════════════════════════════════

import React, { useMemo, useCallback, useRef } from 'react';

interface MinimapProps {
  nodePositions: Record<string, { x: number; y: number }>;
  nodes: Array<{ id: string; tier?: number | string; type?: string }>;
  zoom: number;
  panX: number;
  panY: number;
  containerWidth: number;
  containerHeight: number;
  onNavigate: (panX: number, panY: number) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const PADDING = 20;

// ── Tier → Renk (BoardNode ile tutarlı) ──
const TIER_COLORS: Record<number, string> = {
  0: '#dc2626',
  1: '#dc2626',
  2: '#991b1b',
  3: '#7f1d1d',
  4: '#444444',
};

function parseTier(tier?: number | string): number {
  if (tier === undefined || tier === null) return 3;
  if (typeof tier === 'number') return tier;
  const num = parseInt(String(tier).replace(/\D/g, ''));
  return isNaN(num) ? 3 : num;
}

export default function BoardMinimap({
  nodePositions, nodes, zoom, panX, panY,
  containerWidth, containerHeight, onNavigate,
}: MinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null);

  // ── Tüm node'ların bounding box'ını hesapla ──
  const bounds = useMemo(() => {
    const positions = Object.values(nodePositions);
    if (positions.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of positions) {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    }

    // Biraz padding ekle
    const padX = (maxX - minX) * 0.1 + PADDING;
    const padY = (maxY - minY) * 0.1 + PADDING;

    return {
      minX: minX - padX,
      minY: minY - padY,
      maxX: maxX + padX,
      maxY: maxY + padY,
    };
  }, [nodePositions]);

  const worldWidth = bounds.maxX - bounds.minX || 1;
  const worldHeight = bounds.maxY - bounds.minY || 1;
  const scaleX = MINIMAP_WIDTH / worldWidth;
  const scaleY = MINIMAP_HEIGHT / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  // ── World → Minimap koordinat dönüşümü ──
  const toMinimap = useCallback((wx: number, wy: number) => ({
    x: (wx - bounds.minX) * scale,
    y: (wy - bounds.minY) * scale,
  }), [bounds, scale]);

  // ── Viewport dikdörtgeni (minimap üzerinde) ──
  const viewport = useMemo(() => {
    const vpWorldX = -panX / zoom;
    const vpWorldY = -panY / zoom;
    const vpWorldW = containerWidth / zoom;
    const vpWorldH = containerHeight / zoom;

    const topLeft = toMinimap(vpWorldX, vpWorldY);
    const size = {
      w: vpWorldW * scale,
      h: vpWorldH * scale,
    };

    return { x: topLeft.x, y: topLeft.y, w: size.w, h: size.h };
  }, [panX, panY, zoom, containerWidth, containerHeight, toMinimap, scale]);

  // ── Minimap tıklama → pan navigasyon ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Minimap → World
    const worldX = mx / scale + bounds.minX;
    const worldY = my / scale + bounds.minY;

    // Viewport'un merkezini bu noktaya taşı
    const newPanX = -(worldX * zoom - containerWidth / 2);
    const newPanY = -(worldY * zoom - containerHeight / 2);

    onNavigate(newPanX, newPanY);
  }, [scale, bounds, zoom, containerWidth, containerHeight, onNavigate]);

  // ── Node noktaları render ──
  const nodeMap = useMemo(() => {
    const map = new Map<string, { tier: number; type?: string }>();
    for (const n of nodes) {
      map.set(n.id, { tier: parseTier(n.tier), type: n.type });
    }
    return map;
  }, [nodes]);

  return (
    <div
      ref={minimapRef}
      onClick={handleClick}
      style={{
        position: 'absolute',
        bottom: 32,
        right: 16,
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        background: '#0a0a0aDD',
        border: '1px solid #333',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'crosshair',
        zIndex: 500,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        position: 'absolute',
        top: 2,
        left: 4,
        fontSize: 7,
        color: '#555',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.15em',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        MİNİ HARİTA
      </div>

      {/* ── Node noktaları ── */}
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }}>
        {Object.entries(nodePositions).map(([id, pos]) => {
          const mp = toMinimap(pos.x, pos.y);
          const info = nodeMap.get(id);
          const color = TIER_COLORS[info?.tier ?? 3] || TIER_COLORS[3];
          const size = info?.tier !== undefined && info.tier <= 1 ? 3 : 2;

          return (
            <circle
              key={id}
              cx={mp.x}
              cy={mp.y}
              r={size}
              fill={color}
              opacity={0.8}
            />
          );
        })}

        {/* ── Viewport dikdörtgeni ── */}
        <rect
          x={viewport.x}
          y={viewport.y}
          width={Math.max(viewport.w, 4)}
          height={Math.max(viewport.h, 4)}
          fill="transparent"
          stroke="#dc2626"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.7}
        />
      </svg>
    </div>
  );
}
