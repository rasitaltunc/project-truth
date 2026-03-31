'use client';

// ═══════════════════════════════════════════
// BOARD LINK — SVG Bezier İp/Kablo
// Sprint 8: Soruşturma Panosu
// Kırmızı ip estetiği, kalınlık = evidence_count
// ═══════════════════════════════════════════

import React, { useMemo, useCallback } from 'react';
import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';

interface BoardLinkProps {
  link: {
    id: string;
    source_id: string;
    target_id: string;
    label?: string;
    evidence_type?: string;
    confidence_level?: number;
    evidence_count?: number;
  };
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  isHighlighted: boolean;
  onClick: (linkId: string) => void;
  onHover: (linkId: string | null) => void;
}

// ── İp/Link Renk Sistemi — Tek kaynak: linkFilterStore ──
function getStrokeWidth(evidenceCount?: number): number {
  const count = evidenceCount || 1;
  if (count >= 5) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2.5;
  return 1.5;
}

function getLinkColor(evidenceType?: string): string {
  if (!evidenceType) return '#dc2626';
  return EVIDENCE_TYPE_CONFIG[evidenceType]?.color ?? '#dc2626';
}

export default function BoardLink({
  link, sourcePos, targetPos, isHighlighted, onClick, onHover,
}: BoardLinkProps) {

  // ── Bezier eğri hesaplama ──
  const pathData = useMemo(() => {
    const sx = sourcePos.x;
    const sy = sourcePos.y;
    const tx = targetPos.x;
    const ty = targetPos.y;

    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Eğrilik: mesafe arttıkça daha belirgin eğri
    const curvature = Math.min(dist * 0.25, 80);

    // Kontrol noktaları (dikey ofset ile doğal ip etkisi)
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2 - curvature; // Yukarı doğru sarkan ip

    return `M ${sx} ${sy} Q ${midX} ${midY} ${tx} ${ty}`;
  }, [sourcePos, targetPos]);

  const color = getLinkColor(link.evidence_type);
  const strokeWidth = getStrokeWidth(link.evidence_count);
  const confidence = link.confidence_level ?? 0.5;
  const opacity = isHighlighted ? 1 : (0.3 + confidence * 0.5);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(link.id);
  }, [link.id, onClick]);

  const labelText = link.label || link.evidence_type?.replace(/_/g, ' ') || '';

  // ── Label pozisyonu (bezier ortası) ──
  const labelPos = useMemo(() => {
    const sx = sourcePos.x;
    const sy = sourcePos.y;
    const tx = targetPos.x;
    const ty = targetPos.y;
    const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
    const curvature = Math.min(dist * 0.25, 80);
    return {
      x: (sx + tx) / 2,
      y: (sy + ty) / 2 - curvature / 2,
    };
  }, [sourcePos, targetPos]);

  return (
    <g
      className="board-link"
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      onMouseEnter={() => onHover(link.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* ── Gölge ip (derinlik efekti) ── */}
      <path
        d={pathData}
        fill="none"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={strokeWidth + 2}
        strokeLinecap="round"
        style={{ filter: 'blur(2px)' }}
      />

      {/* ── Ana ip ── */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
        strokeDasharray={confidence < 0.3 ? '8 4' : undefined}
        style={{
          transition: 'opacity 0.3s, stroke-width 0.2s',
          filter: isHighlighted ? `drop-shadow(0 0 6px ${color}88)` : undefined,
        }}
      />

      {/* ── Görünmez kalın tıklama alanı ── */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 12, 16)}
        strokeLinecap="round"
      />

      {/* ── Kanıt sayısı badge (3+ ise göster) ── */}
      {(link.evidence_count || 0) >= 2 && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <circle r={10} fill="#0f0f0f" stroke={color} strokeWidth={1.5} opacity={0.9} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={9}
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            {link.evidence_count}
          </text>
        </g>
      )}

      {/* ── Hover label ── */}
      {isHighlighted && labelText && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y - 18})`}>
          <rect
            x={-labelText.length * 3.2}
            y={-10}
            width={labelText.length * 6.4}
            height={18}
            rx={3}
            fill="#0f0f0fDD"
            stroke={color}
            strokeWidth={0.5}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#e5e5e5"
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.05em"
          >
            {labelText.toUpperCase()}
          </text>
        </g>
      )}
    </g>
  );
}
