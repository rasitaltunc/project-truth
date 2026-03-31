/**
 * Color constants and mappings for Truth 3D visualization
 * Extracted from Truth3DScene.tsx — Sprint 18 "Çelik İskelet"
 */

import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';

// ═══════════════════════════════════════════
// NODE COLORS — Tier & Type based
// ═══════════════════════════════════════════

interface TruthNodeLike {
  tier?: number | string;
  type?: string;
}

/** Get node color by type and tier */
export function getNodeColor(node: TruthNodeLike): number {
  // Non-person types get distinct colors
  if (node.type === 'organization') return 0xa855f7; // Purple
  if (node.type === 'location') return 0x3b82f6;    // Blue
  if (node.type === 'document') return 0x22c55e;    // Green
  if (node.type === 'event') return 0xf59e0b;       // Orange
  // Person nodes: tier-based
  const t = node.tier;
  if (t === 0 || t === 'tier0') return 0xff0000;    // KINGPIN — pure red
  if (t === 1 || t === 'tier1') return 0xdc2626;
  if (t === 2 || t === 'tier2') return 0x991b1b;
  if (t === 3 || t === 'tier3') return 0x7f1d1d;
  if (t === 4 || t === 'tier4') return 0x4a1515;    // Peripheral — dim red
  return 0xdc2626;
}

/** Get orbit radius by tier and type */
export function getOrbitRadius(node: TruthNodeLike): number {
  if (node.type === 'location') {
    return node.tier === 1 ? 30 : 45;
  }
  if (node.type === 'organization') {
    return node.tier === 2 ? 42 : 55;
  }
  if (node.type === 'document') {
    return node.tier === 2 ? 38 : 50;
  }
  if (node.type === 'event') return 35;
  const t = node.tier;
  if (t === 0 || t === 'tier0') return 8;
  if (t === 1 || t === 'tier1') return 22;
  if (t === 2 || t === 'tier2') return 48;
  if (t === 3 || t === 'tier3') return 72;
  if (t === 4 || t === 'tier4') return 95;
  return 55;
}

/** Type icons for non-person nodes */
export function getTypeIcon(type: string): string {
  if (type === 'organization') return '🏛️';
  if (type === 'location') return '📍';
  if (type === 'document') return '📄';
  if (type === 'event') return '📅';
  return '';
}

// ═══════════════════════════════════════════
// EVIDENCE COLORS — Sprint 6B/14B
// ═══════════════════════════════════════════

/** Get link color by evidence type (unified for both modes) */
export function getEvidenceTypeColor(evidenceType?: string): number {
  if (!evidenceType) return 0x6b7280; // default: inference grey
  return EVIDENCE_TYPE_CONFIG[evidenceType]?.hexColor ?? 0x6b7280;
}

/** Confidence → opacity (yüksek confidence = parlak) */
export function getConfidenceOpacity(confidence?: number): number {
  const c = confidence ?? 0.5;
  if (c >= 0.7) return 0.6;
  if (c >= 0.4) return 0.35;
  return 0.15;
}

/** Evidence count → opacity boost (Sprint 14B) */
export function getEvidenceWidthOpacityBoost(count?: number): number {
  const c = count ?? 0;
  if (c >= 5) return 0.45;
  if (c >= 3) return 0.25;
  if (c >= 1) return 0.08;
  return 0;
}

/** Evidence count → pulse intensity for epistemological mode */
export function getEvidencePulseIntensity(count?: number): number {
  const c = count ?? 0;
  if (c >= 5) return 0.95;
  if (c >= 3) return 0.65;
  if (c >= 1) return 0.35;
  return 0.2;
}

/** Convert hex color to RGB components (0-1 range) */
export function hexToRGB(hex: number): { r: number; g: number; b: number } {
  return {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

// ═══════════════════════════════════════════
// ANNOTATION THEMES — Sprint 14E "AI Tag Revolution"
// ═══════════════════════════════════════════

export interface AnnotationTheme {
  keywords: string[];
  colors: { bg: string; border: string; text: string; glow: string };
}

export const ANNOTATION_THEMES: AnnotationTheme[] = [
  // Kırmızı — ölüm, suç, mahkumiyet, cinayet
  { keywords: ['dead', 'died', 'death', 'killed', 'murder', 'suicide', 'öldü', 'ölüm', 'ölü', 'intihar', 'cinayet', 'décédé', 'mort', 'muerto', 'deceased', 'found dead'],
    colors: { bg: 'rgba(30, 30, 30, 0.95)', border: '#6b7280', text: '#d1d5db', glow: 'rgba(107, 114, 128, 0.6)' } },
  // Koyu kırmızı — mahkumiyet, hapis, ceza
  { keywords: ['sentenced', 'convicted', 'prison', 'jail', 'guilty', 'indicted', 'mahkum', 'hapis', 'ceza', 'tutuklu', 'hüküm', 'condamné', 'condenado', 'yrs', 'years'],
    colors: { bg: 'rgba(127, 29, 29, 0.95)', border: '#ef4444', text: '#fecaca', glow: 'rgba(239, 68, 68, 0.7)' } },
  // Rose — kurban, istismar, çocuk, yaş
  { keywords: ['victim', 'abuse', 'assault', 'rape', 'minor', 'child', 'age', 'recruit', 'traffic', 'exploit', 'captive', 'kurban', 'istismar', 'çocuk', 'yaş', 'devşir', 'tutsak', 'kaçır', 'mağdur', 'victime', 'víctima'],
    colors: { bg: 'rgba(190, 18, 60, 0.9)', border: '#fb7185', text: '#ffe4e6', glow: 'rgba(244, 63, 94, 0.6)' } },
  // Yeşil — para, finans, ödeme, settlement
  { keywords: ['$', '€', '£', 'million', 'billion', 'payment', 'settlement', 'fund', 'money', 'bank', 'financ', 'donation', 'transfer', 'wire', 'milyon', 'milyar', 'ödeme', 'banka', 'finans', 'bağış', 'para'],
    colors: { bg: 'rgba(6, 78, 59, 0.9)', border: '#34d399', text: '#d1fae5', glow: 'rgba(52, 211, 153, 0.5)' } },
  // Amber — organize, lider, baş, kurucu
  { keywords: ['leader', 'founder', 'chief', 'boss', 'head', 'master', 'ring', 'organiz', 'lider', 'baş', 'kurucu', 'patron', 'örgüt', 'chef', 'jefe', 'kingpin', 'mastermind'],
    colors: { bg: 'rgba(120, 53, 15, 0.9)', border: '#f59e0b', text: '#fef3c7', glow: 'rgba(245, 158, 11, 0.6)' } },
  // Mor — hukuk, avukat, plea, savunma
  { keywords: ['lawyer', 'attorney', 'plea', 'defense', 'legal', 'judge', 'court', 'trial', 'avukat', 'savunma', 'hukuk', 'mahkeme', 'dava', 'yargıç', 'avocat', 'abogado'],
    colors: { bg: 'rgba(88, 28, 135, 0.9)', border: '#a78bfa', text: '#ede9fe', glow: 'rgba(167, 139, 250, 0.5)' } },
  // Mavi — uçuş, seyahat, lokasyon, ülke
  { keywords: ['flight', 'flew', 'travel', 'visit', 'island', 'plane', 'jet', 'trip', 'uçuş', 'uçak', 'seyahat', 'ziyaret', 'ada', 'gezi', 'vol', 'vuelo', 'pilot'],
    colors: { bg: 'rgba(30, 58, 138, 0.9)', border: '#60a5fa', text: '#dbeafe', glow: 'rgba(96, 165, 250, 0.5)' } },
  // Cyan — medya, gazetecilik, tanık, ifade
  { keywords: ['witness', 'testimony', 'reporter', 'journal', 'media', 'press', 'news', 'tanık', 'ifade', 'gazeteci', 'medya', 'basın', 'haber', 'témoin', 'testigo', 'whistleblow'],
    colors: { bg: 'rgba(22, 78, 99, 0.9)', border: '#22d3ee', text: '#cffafe', glow: 'rgba(34, 211, 238, 0.5)' } },
  // Turuncu — bağlantı, ilişki, ağ, aracı
  { keywords: ['connect', 'associate', 'link', 'tied', 'relation', 'partner', 'ally', 'friend', 'close', 'bağlantı', 'ilişki', 'ortak', 'yakın', 'müttefik', 'dost', 'aracı', 'lié', 'asociado'],
    colors: { bg: 'rgba(124, 45, 18, 0.9)', border: '#fb923c', text: '#fed7aa', glow: 'rgba(251, 146, 60, 0.5)' } },
];

export const DEFAULT_ANNOTATION_COLORS = {
  bg: 'rgba(153, 27, 27, 0.9)',
  border: '#ef4444',
  text: '#fecaca',
  glow: 'rgba(220, 38, 38, 0.5)',
};

/** Smart keyword matching: scan label words, return first matching theme */
export function getAnnotationColors(label: string): { bg: string; border: string; text: string; glow: string } {
  const lower = label.toLowerCase();
  for (const theme of ANNOTATION_THEMES) {
    if (theme.keywords.some(kw => lower.includes(kw))) return theme.colors;
  }
  return DEFAULT_ANNOTATION_COLORS;
}
