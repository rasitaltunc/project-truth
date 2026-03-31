/**
 * Desk Themes — Dynamic visual identity based on document type
 *
 * Her belge tipi kendi ortamını yaratıyor:
 * - court_record → Mahkeme salonu: sıcak meşe, altın bordürler, ciddi
 * - financial → Finans: koyu lacivert, keskin hatlar, yeşil aksan
 * - leaked/foia → Sızıntı: koyu, dramatik, kırmızı vurgular
 * - deposition → İfade: soğuk, klinik, mavi-gri
 * - default → Nötr karanlık, amber aksan
 *
 * Felsefe: "Abartısız, doğru his tonu. Fark hissedilmeli ama bağırmamalı."
 */

export interface DeskTheme {
  // Identity
  name: string;
  label: string;

  // Backgrounds
  panelBg: string;         // Main panel background
  headerBg: string;        // Panel header background
  contentBg: string;       // Content area background
  cardBg: string;          // Task card background

  // Borders
  borderColor: string;     // Panel borders
  headerBorder: string;    // Header bottom border
  cardBorder: string;      // Task card border

  // Accent colors
  accent: string;          // Primary accent (spotlight, headers)
  accentGlow: string;      // Glow/shadow version
  accentMuted: string;     // Muted version for backgrounds
  accentText: string;      // Text in accent color

  // Classification badge
  classifiedBg: string;    // CLASSIFIED header bg
  classifiedBorder: string;
  classifiedDot: string;   // Glowing dot color
  classifiedText: string;  // CLASSIFIED text color

  // Spotlight
  spotlightBg: string;     // Highlighted text background
  spotlightBorder: string; // Left border of highlighted text
  spotlightText: string;   // Highlighted text color
  spotlightGlow: string;   // Glow effect

  // Text
  textPrimary: string;     // Main text
  textSecondary: string;   // Secondary text
  textMuted: string;       // Very muted text
  textDimmed: string;      // Dimmed text (non-spotlight areas)

  // Buttons
  btnPositiveBg: string;   // DOĞRU button
  btnPositiveText: string;
  btnNegativeBg: string;   // YANLIŞ button
  btnNegativeText: string;
  btnNeutralBg: string;    // TARTIŞMALI button
  btnNeutralText: string;

  // Special
  scannerColor: string;    // Scanner sweep line
  sourceTag: string;       // Source badge text
}

// ═══════════════════════════════════════════
// THEME DEFINITIONS
// ═══════════════════════════════════════════

const courtTheme: DeskTheme = {
  name: 'court',
  label: 'MAHKEME BELGESİ',

  panelBg: '#0e0b06',
  headerBg: 'rgba(40, 30, 15, 0.7)',
  contentBg: '#0a0806',
  cardBg: 'rgba(40, 30, 15, 0.35)',

  borderColor: 'rgba(196, 149, 42, 0.18)',
  headerBorder: 'rgba(196, 149, 42, 0.22)',
  cardBorder: 'rgba(196, 149, 42, 0.18)',

  accent: '#c4952a',
  accentGlow: 'rgba(196, 149, 42, 0.25)',
  accentMuted: 'rgba(196, 149, 42, 0.12)',
  accentText: '#e8c060',

  classifiedBg: 'rgba(196, 149, 42, 0.1)',
  classifiedBorder: 'rgba(196, 149, 42, 0.2)',
  classifiedDot: '#d4a030',
  classifiedText: '#d4a030',

  spotlightBg: 'rgba(196, 149, 42, 0.18)',
  spotlightBorder: '#d4a030',
  spotlightText: '#f0d878',
  spotlightGlow: '0 0 40px rgba(196, 149, 42, 0.18)',

  textPrimary: '#d4ccc0',
  textSecondary: '#a09580',
  textMuted: '#706550',
  textDimmed: 'rgba(212, 204, 192, 0.4)',

  btnPositiveBg: 'rgba(34, 120, 60, 0.12)',
  btnPositiveText: '#4ade80',
  btnNegativeBg: 'rgba(180, 50, 50, 0.12)',
  btnNegativeText: '#f87171',
  btnNeutralBg: 'rgba(180, 140, 60, 0.12)',
  btnNeutralText: '#e8c060',

  scannerColor: '#d4a030',
  sourceTag: '#a09060',
};

const financeTheme: DeskTheme = {
  name: 'finance',
  label: 'FİNANSAL BELGE',

  panelBg: '#060a10',
  headerBg: 'rgba(10, 22, 38, 0.75)',
  contentBg: '#050810',
  cardBg: 'rgba(10, 22, 38, 0.4)',

  borderColor: 'rgba(42, 138, 106, 0.18)',
  headerBorder: 'rgba(42, 138, 106, 0.22)',
  cardBorder: 'rgba(42, 138, 106, 0.18)',

  accent: '#2a8a6a',
  accentGlow: 'rgba(42, 138, 106, 0.25)',
  accentMuted: 'rgba(42, 138, 106, 0.12)',
  accentText: '#5ae8a0',

  classifiedBg: 'rgba(42, 138, 106, 0.1)',
  classifiedBorder: 'rgba(42, 138, 106, 0.2)',
  classifiedDot: '#2a9a7a',
  classifiedText: '#2a9a7a',

  spotlightBg: 'rgba(42, 138, 106, 0.18)',
  spotlightBorder: '#2a9a7a',
  spotlightText: '#6ee7b7',
  spotlightGlow: '0 0 40px rgba(42, 138, 106, 0.18)',

  textPrimary: '#c0d0d4',
  textSecondary: '#708898',
  textMuted: '#4a5a6a',
  textDimmed: 'rgba(192, 208, 212, 0.4)',

  btnPositiveBg: 'rgba(34, 120, 60, 0.12)',
  btnPositiveText: '#4ade80',
  btnNegativeBg: 'rgba(180, 50, 50, 0.12)',
  btnNegativeText: '#f87171',
  btnNeutralBg: 'rgba(42, 138, 106, 0.12)',
  btnNeutralText: '#6ee7b7',

  scannerColor: '#2a9a7a',
  sourceTag: '#5a9a7a',
};

const leakedTheme: DeskTheme = {
  name: 'leaked',
  label: 'GİZLİ BELGE',

  panelBg: '#0c0505',
  headerBg: 'rgba(30, 10, 10, 0.75)',
  contentBg: '#080404',
  cardBg: 'rgba(30, 10, 10, 0.4)',

  borderColor: 'rgba(220, 50, 50, 0.18)',
  headerBorder: 'rgba(220, 50, 50, 0.22)',
  cardBorder: 'rgba(220, 50, 50, 0.18)',

  accent: '#dc2626',
  accentGlow: 'rgba(220, 38, 38, 0.25)',
  accentMuted: 'rgba(220, 38, 38, 0.1)',
  accentText: '#f87171',

  classifiedBg: 'rgba(220, 38, 38, 0.1)',
  classifiedBorder: 'rgba(220, 38, 38, 0.2)',
  classifiedDot: '#ef4444',
  classifiedText: '#ef4444',

  spotlightBg: 'rgba(220, 38, 38, 0.15)',
  spotlightBorder: '#ef4444',
  spotlightText: '#fca5a5',
  spotlightGlow: '0 0 40px rgba(220, 38, 38, 0.15)',

  textPrimary: '#d4c4c4',
  textSecondary: '#a07070',
  textMuted: '#6a4a4a',
  textDimmed: 'rgba(212, 196, 196, 0.4)',

  btnPositiveBg: 'rgba(34, 120, 60, 0.12)',
  btnPositiveText: '#4ade80',
  btnNegativeBg: 'rgba(180, 50, 50, 0.18)',
  btnNegativeText: '#f87171',
  btnNeutralBg: 'rgba(180, 140, 60, 0.12)',
  btnNeutralText: '#fbbf24',

  scannerColor: '#ef4444',
  sourceTag: '#a06060',
};

const depositionTheme: DeskTheme = {
  name: 'deposition',
  label: 'İFADE TUTANAĞI',

  panelBg: '#060810',
  headerBg: 'rgba(14, 20, 36, 0.75)',
  contentBg: '#050710',
  cardBg: 'rgba(14, 20, 36, 0.4)',

  borderColor: 'rgba(74, 106, 180, 0.18)',
  headerBorder: 'rgba(74, 106, 180, 0.22)',
  cardBorder: 'rgba(74, 106, 180, 0.18)',

  accent: '#4a6ab4',
  accentGlow: 'rgba(74, 106, 180, 0.25)',
  accentMuted: 'rgba(74, 106, 180, 0.12)',
  accentText: '#8ab0f0',

  classifiedBg: 'rgba(74, 106, 180, 0.1)',
  classifiedBorder: 'rgba(74, 106, 180, 0.2)',
  classifiedDot: '#5a7ac4',
  classifiedText: '#5a7ac4',

  spotlightBg: 'rgba(74, 106, 180, 0.18)',
  spotlightBorder: '#5a7ac4',
  spotlightText: '#a0c0f8',
  spotlightGlow: '0 0 40px rgba(74, 106, 180, 0.18)',

  textPrimary: '#c4c8d4',
  textSecondary: '#7888a8',
  textMuted: '#4a5570',
  textDimmed: 'rgba(196, 200, 212, 0.4)',

  btnPositiveBg: 'rgba(34, 120, 60, 0.12)',
  btnPositiveText: '#4ade80',
  btnNegativeBg: 'rgba(180, 50, 50, 0.12)',
  btnNegativeText: '#f87171',
  btnNeutralBg: 'rgba(74, 106, 180, 0.12)',
  btnNeutralText: '#a0c0f8',

  scannerColor: '#5a7ac4',
  sourceTag: '#5a7a9a',
};

const defaultTheme: DeskTheme = {
  name: 'default',
  label: 'BELGE İNCELEME',

  panelBg: 'rgba(8, 8, 10, 1)',
  headerBg: 'rgba(16, 16, 20, 0.6)',
  contentBg: '#050505',
  cardBg: 'rgba(16, 16, 20, 0.3)',

  borderColor: 'rgba(255, 255, 255, 0.06)',
  headerBorder: 'rgba(255, 255, 255, 0.08)',
  cardBorder: 'rgba(255, 255, 255, 0.06)',

  accent: '#d97706',
  accentGlow: 'rgba(217, 119, 6, 0.15)',
  accentMuted: 'rgba(217, 119, 6, 0.06)',
  accentText: '#f59e0b',

  classifiedBg: 'rgba(220, 38, 38, 0.08)',
  classifiedBorder: 'rgba(220, 38, 38, 0.15)',
  classifiedDot: '#dc2626',
  classifiedText: '#dc2626',

  spotlightBg: 'rgba(245, 158, 11, 0.2)',
  spotlightBorder: '#f59e0b',
  spotlightText: '#fbbf24',
  spotlightGlow: '0 0 30px rgba(245, 158, 11, 0.15)',

  textPrimary: '#d4d4d4',
  textSecondary: '#737373',
  textMuted: '#525252',
  textDimmed: 'rgba(212, 212, 212, 0.4)',

  btnPositiveBg: 'rgba(34, 120, 60, 0.12)',
  btnPositiveText: '#4ade80',
  btnNegativeBg: 'rgba(180, 50, 50, 0.12)',
  btnNegativeText: '#f87171',
  btnNeutralBg: 'rgba(180, 140, 60, 0.1)',
  btnNeutralText: '#fbbf24',

  scannerColor: '#f59e0b',
  sourceTag: '#6b7280',
};

// ═══════════════════════════════════════════
// THEME RESOLVER
// ═══════════════════════════════════════════

const THEME_MAP: Record<string, DeskTheme> = {
  court_record: courtTheme,
  court_filing: courtTheme,
  indictment: courtTheme,
  plea_agreement: courtTheme,
  sentencing: courtTheme,

  financial: financeTheme,
  financial_record: financeTheme,
  tax_record: financeTheme,
  bank_record: financeTheme,
  corporate_filing: financeTheme,

  leaked: leakedTheme,
  leaked_document: leakedTheme,
  foia: leakedTheme,
  classified: leakedTheme,
  whistleblower: leakedTheme,

  deposition: depositionTheme,
  testimony: depositionTheme,
  interview: depositionTheme,
  witness_statement: depositionTheme,
};

/**
 * Resolve theme based on document type.
 * Falls through to default theme if no match.
 */
export function getThemeForDocument(documentType?: string | null): DeskTheme {
  if (!documentType) return defaultTheme;
  return THEME_MAP[documentType.toLowerCase()] || defaultTheme;
}

/**
 * All available themes (for debugging/preview)
 */
export const ALL_THEMES = {
  court: courtTheme,
  finance: financeTheme,
  leaked: leakedTheme,
  deposition: depositionTheme,
  default: defaultTheme,
};
