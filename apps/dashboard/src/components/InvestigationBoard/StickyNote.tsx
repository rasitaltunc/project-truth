'use client';

// ═══════════════════════════════════════════
// STICKY NOTE — Yapışkan Not
// Sprint 8: Soruşturma Panosu
// Sarı/pembe/mavi/yeşil not kartları
// ═══════════════════════════════════════════

import React, { useCallback, useRef, useState } from 'react';
import type { StickyNote as StickyNoteType } from '@/store/boardStore';

interface StickyNoteProps {
  note: StickyNoteType;
  isSelected: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

const STICKY_COLORS = {
  yellow: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', shadow: '#F59E0B33' },
  pink:   { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D', shadow: '#EC489933' },
  blue:   { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', shadow: '#3B82F633' },
  green:  { bg: '#D1FAE5', border: '#10B981', text: '#065F46', shadow: '#10B98133' },
};

export default function StickyNote({
  note, isSelected, zoom, onSelect, onMove, onUpdateText, onRemove,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colors = STICKY_COLORS[note.color] || STICKY_COLORS.yellow;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, noteX: note.x, noteY: note.y };
    onSelect(note.id);
  }, [isEditing, note.id, note.x, note.y, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isEditing || !isPointerDownRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      onMove(note.id, dragStartRef.current.noteX + dx, dragStartRef.current.noteY + dy);
    }
  }, [isEditing, note.id, zoom, onMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isPointerDownRef.current = false;
    isDraggingRef.current = false;
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (textareaRef.current) {
      onUpdateText(note.id, textareaRef.current.value);
    }
  }, [note.id, onUpdateText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.width,
        minHeight: note.height,
        background: colors.bg,
        border: `1px solid ${isSelected ? colors.border : 'transparent'}`,
        borderRadius: 2,
        boxShadow: isSelected
          ? `0 4px 16px ${colors.shadow}, 0 0 0 2px ${colors.border}`
          : `2px 3px 8px rgba(0,0,0,0.15)`,
        cursor: isEditing ? 'text' : 'grab',
        userSelect: isEditing ? 'text' : 'none',
        zIndex: isSelected ? 90 : 5,
        transform: 'rotate(-1deg)',
        transition: 'box-shadow 0.2s',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Üst Bar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 6px 2px',
        borderBottom: `1px solid ${colors.border}22`,
      }}>
        <span style={{ fontSize: 8, color: colors.text, opacity: 0.5, fontFamily: 'ui-monospace, monospace' }}>
          NOT
        </span>
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(note.id); }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              opacity: 0.6,
            }}
            title="Notu sil"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Metin ── */}
      <div style={{ padding: '4px 8px 8px' }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            defaultValue={note.text}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: 80,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily: "'Caveat', cursive, 'Segoe UI', sans-serif",
              fontSize: 14,
              lineHeight: 1.4,
              color: colors.text,
            }}
          />
        ) : (
          <div style={{
            fontFamily: "'Caveat', cursive, 'Segoe UI', sans-serif",
            fontSize: 14,
            lineHeight: 1.4,
            color: colors.text,
            minHeight: 60,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {note.text || 'Çift tıkla ve yaz...'}
          </div>
        )}
      </div>
    </div>
  );
}
