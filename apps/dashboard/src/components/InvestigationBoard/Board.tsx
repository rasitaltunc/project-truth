'use client';

// ═══════════════════════════════════════════════════════════
// INVESTIGATION BOARD — 2D Investigation Board
// Sprint 8: "Investigation Board"
// Detective board aesthetic: photos, red strings, pins
// Infinite canvas + zoom/pan + drag-drop
// ═══════════════════════════════════════════════════════════

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useBoardStore } from '@/store/boardStore';
import BoardNode from './BoardNode';
import BoardLink from './BoardLink';
import StickyNote from './StickyNote';
import BoardToolbar from './BoardToolbar';
import BoardMinimap from './BoardMinimap';

interface BoardProps {
  nodes: Array<{
    id: string;
    name: string;
    type?: string;
    tier?: number | string;
    risk?: number;
    image_url?: string;
    verification_level?: string;
    occupation?: string;
  }>;
  links: Array<{
    id: string;
    source_id: string;
    target_id: string;
    label?: string;
    evidence_type?: string;
    confidence_level?: number;
    evidence_count?: number;
  }>;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onLinkClick?: (linkId: string) => void;
  onExitBoard?: () => void;
}

export default function Board({
  nodes, links,
  onNodeClick, onNodeDoubleClick, onLinkClick, onExitBoard,
}: BoardProps) {
  const {
    zoom, panX, panY,
    nodePositions, stickyNotes, mediaCards,
    selectedNodeId, selectedStickyId,
    setZoom, setPan, panBy,
    setNodePosition, moveNode,
    addStickyNote, updateStickyText, moveStickyNote, removeStickyNote,
    removeNodeFromBoard,
    selectNode, selectSticky, clearSelection,
    startDrag, endDrag,
    initializePositions,
  } = useBoardStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // -- Initialize node positions on mount --
  useEffect(() => {
    if (nodes.length > 0) {
      initializePositions(nodes);
    }
  }, [nodes, initializePositions]);

  // -- Keyboard shortcuts --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useBoardStore.getState().redo();
        } else {
          useBoardStore.getState().undo();
        }
      }
      if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedStickyId: sid } = useBoardStore.getState();
        if (sid) removeStickyNote(sid);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, removeStickyNote]);

  // -- Wheel zoom (native event listener — preventDefault works with passive:false) --
  const zoomRef = useRef(zoom);
  const panRef = useRef({ x: panX, y: panY });
  zoomRef.current = zoom;
  panRef.current = { x: panX, y: panY };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.15, Math.min(5, currentZoom + delta));

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const worldX = (cursorX - currentPan.x) / currentZoom;
      const worldY = (cursorY - currentPan.y) / currentZoom;
      const newPanX = cursorX - worldX * newZoom;
      const newPanY = cursorY - worldY * newZoom;

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom, setPan]);

  // ── Pan handlers ──
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('board-canvas')) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      clearSelection();
      setContextMenu(null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [panX, panY, clearSelection]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
    }
  }, [setPan]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  // ── Node drag handlers ──
  const handleNodeDragStart = useCallback((nodeId: string, startX: number, startY: number) => {
    startDrag(nodeId, 'node');
  }, [startDrag]);

  const handleNodeDragMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodePosition(nodeId, { x, y });
  }, [setNodePosition]);

  const handleNodeDragEnd = useCallback((nodeId: string) => {
    const pos = nodePositions[nodeId];
    if (pos) {
      // moveNode records undo action
      // Already at final position, no need to move again
    }
    endDrag();
  }, [nodePositions, endDrag]);

  // ── Add note at center of viewport ──
  const handleAddNote = useCallback((color: 'yellow' | 'pink' | 'blue' | 'green') => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (rect.width / 2 - panX) / zoom;
      const centerY = (rect.height / 2 - panY) / zoom;
      addStickyNote(centerX, centerY, color);
    }
  }, [panX, panY, zoom, addStickyNote]);

  // ── Context menu handler ──
  const handleNodeContextMenu = useCallback((nodeId: string, e: React.MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  // ── Node click/doubleclick ──
  const handleNodeSelect = useCallback((nodeId: string) => {
    selectNode(nodeId);
    onNodeClick?.(nodeId);
  }, [selectNode, onNodeClick]);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    onNodeDoubleClick?.(nodeId);
  }, [onNodeDoubleClick]);

  // ── Link click ──
  const handleLinkClick = useCallback((linkId: string) => {
    onLinkClick?.(linkId);
  }, [onLinkClick]);

  // ── Exit board ──
  const handleExitBoard = useCallback(() => {
    onExitBoard?.();
  }, [onExitBoard]);

  // ── Compute positioned links (only for nodes with positions) ──
  const positionedLinks = useMemo(() => {
    return links.filter(l =>
      nodePositions[l.source_id] && nodePositions[l.target_id]
    );
  }, [links, nodePositions]);

  return (
    <div
      ref={containerRef}
      className="board-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#080808',
        cursor: isPanningRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      {/* ── Background Grid ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle, #1a1a1a 1px, transparent 1px)
        `,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${panX}px ${panY}px`,
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* ── Cork Board Texture Hint ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, #1a130e08 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* ── Transform Container (zoom + pan) ── */}
      <div style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: 0,
        left: 0,
      }}>
        {/* ── SVG Layer: Links ── */}
        <svg
          style={{
            position: 'absolute',
            top: -5000,
            left: -5000,
            width: 10000,
            height: 10000,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {positionedLinks.map(link => (
              <BoardLink
                key={link.id}
                link={link}
                sourcePos={nodePositions[link.source_id]}
                targetPos={nodePositions[link.target_id]}
                isHighlighted={hoveredLinkId === link.id}
                onClick={handleLinkClick}
                onHover={setHoveredLinkId}
              />
            ))}
          </g>
        </svg>

        {/* ── Sticky Notes ── */}
        {stickyNotes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            isSelected={selectedStickyId === note.id}
            zoom={zoom}
            onSelect={selectSticky}
            onMove={moveStickyNote}
            onUpdateText={updateStickyText}
            onRemove={removeStickyNote}
          />
        ))}

        {/* ── Media Cards ── */}
        {mediaCards.map(card => (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              left: card.x,
              top: card.y,
              width: 160,
              minHeight: 100,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 4,
              overflow: 'hidden',
              cursor: 'move',
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {/* Thumbnail veya type icon */}
            <div style={{
              height: 64,
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
              fontSize: 24,
            }}>
              {card.type === 'image' ? '🖼️' :
               card.type === 'video' ? '🎥' :
               card.type === 'pdf' ? '📄' : '📎'}
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{
                color: '#aaa',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {card.title || 'Medya'}
              </div>
              <div style={{ color: '#555', fontSize: 8, marginTop: 2, letterSpacing: '0.1em' }}>
                {card.type.toUpperCase()}
              </div>
            </div>
          </div>
        ))}

        {/* ── Node Cards ── */}
        {nodes.map(node => {
          const pos = nodePositions[node.id];
          if (!pos) return null;
          return (
            <BoardNode
              key={node.id}
              node={node}
              x={pos.x}
              y={pos.y}
              isSelected={selectedNodeId === node.id}
              zoom={zoom}
              onSelect={handleNodeSelect}
              onDoubleClick={handleNodeDoubleClick}
              onDragStart={handleNodeDragStart}
              onDragMove={handleNodeDragMove}
              onDragEnd={handleNodeDragEnd}
              onContextMenu={handleNodeContextMenu}
            />
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <BoardToolbar
        onAddNote={handleAddNote}
        onExitBoard={handleExitBoard}
      />

      {/* ── Minimap ── */}
      <BoardMinimap
        nodePositions={nodePositions}
        nodes={nodes}
        zoom={zoom}
        panX={panX}
        panY={panY}
        containerWidth={containerRef.current?.clientWidth || 1200}
        containerHeight={containerRef.current?.clientHeight || 800}
        onNavigate={setPan}
      />

      {/* ── Board Title ── */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 16,
        fontSize: 10,
        color: '#444',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.2em',
        userSelect: 'none',
      }}>
        SORUŞTURMA PANOSU — {nodes.length} DÜĞÜM • {links.length} BAĞLANTI
      </div>

      {/* ── Zoom Indicator ── */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 16,
        fontSize: 10,
        color: '#444',
        fontFamily: 'ui-monospace, monospace',
        userSelect: 'none',
      }}>
        {Math.round(zoom * 100)}% | CTRL+Z: GERİ AL
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <div style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#0f0f0fF5',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 160,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <ContextMenuItem
              label="📋 Detayları Göster"
              onClick={() => { onNodeDoubleClick?.(contextMenu.nodeId); setContextMenu(null); }}
            />
            <ContextMenuItem
              label="🔗 Bağlantıları Göster"
              onClick={() => { onNodeClick?.(contextMenu.nodeId); setContextMenu(null); }}
            />
            <ContextMenuItem
              label="📝 Not Ekle"
              onClick={() => {
                const pos = nodePositions[contextMenu.nodeId];
                if (pos) addStickyNote(pos.x + 100, pos.y - 50, 'yellow');
                setContextMenu(null);
              }}
            />
            <div style={{ height: 1, background: '#333', margin: '4px 0' }} />
            <ContextMenuItem
              label="🗑️ Panodan Kaldır"
              onClick={() => {
                removeNodeFromBoard(contextMenu.nodeId);
                setContextMenu(null);
              }}
              danger
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Context Menu Item ──
function ContextMenuItem({ label, onClick, danger }: {
  label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '6px 12px',
        background: 'transparent',
        border: 'none',
        color: danger ? '#dc2626' : '#e5e5e5',
        fontSize: 12,
        fontFamily: 'ui-monospace, monospace',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  );
}
