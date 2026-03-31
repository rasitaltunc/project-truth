'use client';

// ═══════════════════════════════════════════
// BOARD TOOLBAR — Araç Çubuğu
// Sprint 8: Soruşturma Panosu
// Zoom, Pan, Add Note, Undo/Redo, Grid
// ═══════════════════════════════════════════

import React from 'react';
import { useBoardStore } from '@/store/boardStore';

interface BoardToolbarProps {
  onAddNote: (color: 'yellow' | 'pink' | 'blue' | 'green') => void;
  onExitBoard: () => void;
}

export default function BoardToolbar({ onAddNote, onExitBoard }: BoardToolbarProps) {
  const {
    zoom, gridSnap, undoStack, redoStack,
    zoomIn, zoomOut, resetView, toggleGridSnap, undo, redo,
  } = useBoardStore();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: '#0f0f0fEE',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '4px 8px',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      userSelect: 'none',
    }}>
      {/* ── 3D Geri Dön ── */}
      <ToolButton
        icon="🌐"
        label="3D Harita"
        onClick={onExitBoard}
        accent
      />

      <Divider />

      {/* ── Zoom Kontrolleri ── */}
      <ToolButton icon="−" label="Uzaklaştır" onClick={zoomOut} />
      <span style={{
        fontSize: 10,
        color: '#999',
        fontFamily: 'ui-monospace, monospace',
        width: 36,
        textAlign: 'center',
      }}>
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton icon="+" label="Yakınlaştır" onClick={zoomIn} />
      <ToolButton icon="⊞" label="Sıfırla" onClick={resetView} />

      <Divider />

      {/* ── Yapışkan Not Ekle ── */}
      <NoteButton color="#FEF3C7" border="#F59E0B" onClick={() => onAddNote('yellow')} />
      <NoteButton color="#FCE7F3" border="#EC4899" onClick={() => onAddNote('pink')} />
      <NoteButton color="#DBEAFE" border="#3B82F6" onClick={() => onAddNote('blue')} />
      <NoteButton color="#D1FAE5" border="#10B981" onClick={() => onAddNote('green')} />

      <Divider />

      {/* ── Grid Snap ── */}
      <ToolButton
        icon="⊞"
        label={gridSnap ? 'Grid: AÇIK' : 'Grid: Kapalı'}
        onClick={toggleGridSnap}
        active={gridSnap}
      />

      <Divider />

      {/* ── Undo / Redo ── */}
      <ToolButton icon="↶" label="Geri Al" onClick={undo} disabled={!canUndo} />
      <ToolButton icon="↷" label="Yinele" onClick={redo} disabled={!canRedo} />
    </div>
  );
}

// ── Sub-components ──

function ToolButton({ icon, label, onClick, disabled, active, accent }: {
  icon: string; label: string; onClick: () => void;
  disabled?: boolean; active?: boolean; accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        background: active ? '#dc262622' : accent ? '#dc262611' : 'transparent',
        border: active ? '1px solid #dc2626' : accent ? '1px solid #dc262666' : '1px solid transparent',
        borderRadius: 4,
        padding: '4px 8px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 14,
        color: disabled ? '#444' : accent ? '#dc2626' : '#ccc',
        fontFamily: 'ui-monospace, monospace',
        transition: 'all 0.15s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon}
    </button>
  );
}

function NoteButton({ color, border, onClick }: { color: string; border: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Not ekle"
      style={{
        width: 18,
        height: 18,
        background: color,
        border: `1.5px solid ${border}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    />
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />;
}
