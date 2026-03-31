'use client';

// ============================================
// SPRINT 6B: CLAIMREVIEW BADGE
// Kanıt kartlarının köşesinde IFCN rating badge'i
// ============================================

interface Props {
  ifcnRating: string | null | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const RATING_CONFIG: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  true: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Doğru', emoji: '✓' },
  mostly_true: { color: '#86efac', bg: 'rgba(134,239,172,0.15)', label: 'Çoğunlukla Doğru', emoji: '≈' },
  half_true: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Yarı Doğru', emoji: '½' },
  missing_context: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Bağlam Eksik', emoji: '…' },
  mostly_false: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'Çoğunlukla Yanlış', emoji: '✗' },
  false: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Yanlış', emoji: '✗' },
  pants_on_fire: { color: '#dc2626', bg: 'rgba(220,38,38,0.2)', label: 'Tamamen Yanlış', emoji: '🔥' },
  unverifiable: { color: '#737373', bg: 'rgba(115,115,115,0.15)', label: 'Doğrulanamaz', emoji: '?' },
};

export default function ClaimReviewBadge({ ifcnRating, size = 'sm', showLabel = false }: Props) {
  if (!ifcnRating) return null;

  const config = RATING_CONFIG[ifcnRating];
  if (!config) return null;

  const isSm = size === 'sm';

  return (
    <span
      title={`IFCN: ${config.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSm ? '2px 6px' : '3px 8px',
        fontSize: isSm ? '9px' : '11px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        letterSpacing: '0.05em',
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}40`,
        borderRadius: '2px',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{config.emoji}</span>
      {showLabel && <span>{config.label}</span>}
      {!showLabel && <span style={{ fontSize: '8px' }}>IFCN</span>}
    </span>
  );
}
