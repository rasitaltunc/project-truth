'use client';

/**
 * FosforluKalem — Canvas overlay for PDF highlight drawing
 *
 * This component sits ON TOP of a PDF page as a transparent canvas.
 * The user draws with a "fosforlu kalem" (highlighter pen) — mouse down,
 * drag across text, mouse up. The stroke stays as a semi-transparent
 * highlight mark, just like a real highlighter on paper.
 *
 * The parent tells us what color the current pen is (yellow, red, green, blue).
 * We report back the bounding box of each stroke so the system can
 * match it against OCR word positions.
 *
 * Philosophy: This should feel like drawing on actual paper.
 * No buttons, no UI chrome — just the pen and the page.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export interface HighlightStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

export interface FosforluKalemProps {
  width: number;
  height: number;
  penColor: string;        // e.g. '#facc15' (yellow), '#ef4444' (red), '#10b981' (green)
  penSize?: number;         // stroke thickness, default 18
  penOpacity?: number;      // 0-1, default 0.35
  enabled?: boolean;        // disable drawing when not active
  strokes: HighlightStroke[];
  onStrokeComplete: (stroke: HighlightStroke) => void;
  onStrokeRemove?: (strokeId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function FosforluKalem({
  width,
  height,
  penColor,
  penSize = 18,
  penOpacity = 0.35,
  enabled = true,
  strokes,
  onStrokeComplete,
  onStrokeRemove,
}: FosforluKalemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);

  // ── Redraw all strokes ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw completed strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke.points, stroke.color, penSize, penOpacity,
        hoveredStroke === stroke.id);
    }

    // Draw current in-progress stroke
    if (isDrawingRef.current && currentPointsRef.current.length > 1) {
      drawStroke(ctx, currentPointsRef.current, penColor, penSize, penOpacity, false);
    }
  }, [strokes, width, height, penColor, penSize, penOpacity, hoveredStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Canvas size sync ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    redraw();
  }, [width, height, redraw]);

  // ── Get mouse position relative to canvas ──────────────────────
  const getPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();

    // Right-click on a stroke = remove it
    if (e.button === 2 && hoveredStroke && onStrokeRemove) {
      e.preventDefault();
      onStrokeRemove(hoveredStroke);
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [getPos(e)];
  }, [enabled, getPos, hoveredStroke, onStrokeRemove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);

    // Check if hovering over an existing stroke
    if (!isDrawingRef.current) {
      let found: string | null = null;
      for (const stroke of strokes) {
        const bb = stroke.boundingBox;
        if (pos.x >= bb.x - 4 && pos.x <= bb.x + bb.width + 4 &&
            pos.y >= bb.y - 4 && pos.y <= bb.y + bb.height + 4) {
          found = stroke.id;
          break;
        }
      }
      if (found !== hoveredStroke) setHoveredStroke(found);
      return;
    }

    if (!enabled) return;
    currentPointsRef.current.push(pos);
    redraw();
  }, [enabled, getPos, strokes, hoveredStroke, redraw]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = currentPointsRef.current;
    if (points.length < 2) {
      currentPointsRef.current = [];
      redraw();
      return;
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const stroke: HighlightStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points,
      color: penColor,
      boundingBox: {
        x: minX,
        y: minY - penSize / 2,
        width: maxX - minX,
        height: maxY - minY + penSize,
      },
      timestamp: Date.now(),
    };

    currentPointsRef.current = [];
    onStrokeComplete(stroke);
  }, [penColor, penSize, onStrokeComplete, redraw]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        cursor: enabled
          ? (hoveredStroke ? 'pointer' : 'crosshair')
          : 'default',
        pointerEvents: enabled ? 'auto' : 'none',
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}

// ─── Drawing Helper ─────────────────────────────────────────────────

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  size: number,
  opacity: number,
  isHovered: boolean,
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = isHovered ? Math.min(opacity + 0.15, 0.6) : opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Smooth line through points
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Quadratic curve smoothing
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();

  // Hovered stroke: draw subtle border
  if (isHovered) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const bb = getBoundingBox(points, size);
    ctx.strokeRect(bb.x - 2, bb.y - 2, bb.width + 4, bb.height + 4);

    // Small "×" delete hint
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('right-click to remove', bb.x + bb.width + 6, bb.y + 10);
  }

  ctx.restore();
}

function getBoundingBox(points: { x: number; y: number }[], size: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY - size / 2,
    width: maxX - minX,
    height: maxY - minY + size,
  };
}
