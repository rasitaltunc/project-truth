'use client';

// ═══════════════════════════════════════════
// BOARD NODE — Sürüklenebilir Node Kartı
// Sprint 8: Soruşturma Panosu
// Fotoğraf + isim + tier badge + risk bar
// ═══════════════════════════════════════════

import React, { useCallback, useRef } from 'react';

interface BoardNodeProps {
  node: {
    id: string;
    name: string;
    type?: string;
    tier?: number | string;
    risk?: number;
    image_url?: string;
    verification_level?: string;
    occupation?: string;
  };
  x: number;
  y: number;
  isSelected: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onDragStart: (id: string, startX: number, startY: number) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
}

// ── Tier Renkleri ──
const TIER_COLORS: Record<number, string> = {
  0: '#dc2626', // Kingpin
  1: '#dc2626', // Mastermind
  2: '#991b1b', // Key Player
  3: '#7f1d1d', // Connected
  4: '#444444', // Peripheral
};

const TIER_LABELS: Record<number, string> = {
  0: 'KINGPIN',
  1: 'MASTERMIND',
  2: 'KEY PLAYER',
  3: 'CONNECTED',
  4: 'PERIPHERAL',
};

const VERIFICATION_ICONS: Record<string, string> = {
  official: '✓',
  journalist: '📰',
  community: '👥',
  unverified: '?',
};

const TYPE_ICONS: Record<string, string> = {
  person: '👤',
  organization: '🏢',
  event: '📅',
  document: '📄',
  location: '📍',
};

function parseTier(tier?: number | string): number {
  if (tier === undefined || tier === null) return 3;
  if (typeof tier === 'number') return tier;
  const num = parseInt(String(tier).replace(/\D/g, ''));
  return isNaN(num) ? 3 : num;
}

export default function BoardNode({
  node, x, y, isSelected, zoom,
  onSelect, onDoubleClick, onDragStart, onDragMove, onDragEnd, onContextMenu,
}: BoardNodeProps) {
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

  const tier = parseTier(node.tier);
  const tierColor = TIER_COLORS[tier] || TIER_COLORS[3];
  const tierLabel = TIER_LABELS[tier] || 'UNKNOWN';
  const risk = node.risk ?? 50;
  const verIcon = VERIFICATION_ICONS[node.verification_level || 'unverified'];
  const typeIcon = TYPE_ICONS[node.type || 'person'];
  const initials = node.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, nodeX: x, nodeY: y };
    onSelect(node.id);
    onDragStart(node.id, x, y);
  }, [node.id, x, y, onSelect, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      onDragMove(
        node.id,
        dragStartRef.current.nodeX + dx,
        dragStartRef.current.nodeY + dy
      );
    }
  }, [node.id, zoom, onDragMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!isDraggingRef.current) {
      // Was a click, not a drag
    }
    isPointerDownRef.current = false;
    onDragEnd(node.id);
    isDraggingRef.current = false;
  }, [node.id, onDragEnd]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(node.id);
  }, [node.id, onDoubleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(node.id, e);
  }, [node.id, onContextMenu]);

  return (
    <div
      className="board-node"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 160,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: isSelected ? 100 : 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* ── Raptiye / Pin ── */}
      <div style={{
        position: 'absolute',
        top: -8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: tierColor,
        border: '2px solid #333',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        zIndex: 20,
      }} />

      {/* ── Kart ── */}
      <div style={{
        background: '#0f0f0f',
        border: `2px solid ${isSelected ? '#fff' : tierColor}`,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: isSelected
          ? `0 0 20px ${tierColor}66, 0 4px 12px rgba(0,0,0,0.8)`
          : '0 4px 12px rgba(0,0,0,0.6)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {/* ── Fotoğraf / Avatar ── */}
        <div style={{
          width: '100%',
          height: 80,
          background: `linear-gradient(135deg, ${tierColor}22, #1a1a1a)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {node.image_url ? (
            <img
              src={node.image_url}
              alt={node.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'grayscale(30%) contrast(1.1)',
              }}
              draggable={false}
            />
          ) : (
            <span style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: tierColor,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.1em',
            }}>
              {initials}
            </span>
          )}

          {/* ── Tip İkonu ── */}
          <span style={{
            position: 'absolute',
            top: 4,
            left: 6,
            fontSize: 14,
            opacity: 0.8,
          }}>{typeIcon}</span>

          {/* ── Doğrulama Badge ── */}
          <span style={{
            position: 'absolute',
            top: 4,
            right: 6,
            fontSize: 12,
            background: 'rgba(0,0,0,0.7)',
            padding: '1px 5px',
            borderRadius: 4,
            color: '#e5e5e5',
          }}>{verIcon}</span>
        </div>

        {/* ── İsim + Tier ── */}
        <div style={{ padding: '6px 8px' }}>
          <div style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#e5e5e5',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {node.name.toUpperCase()}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}>
            <span style={{
              fontSize: 8,
              color: tierColor,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.15em',
              fontWeight: 'bold',
            }}>
              {tierLabel}
            </span>
            {node.occupation && (
              <span style={{
                fontSize: 8,
                color: '#666',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {node.occupation.slice(0, 12)}
              </span>
            )}
          </div>

          {/* ── Risk Bar ── */}
          <div style={{
            marginTop: 4,
            height: 3,
            background: '#1a1a1a',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${risk}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${tierColor}88, ${tierColor})`,
              borderRadius: 2,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
