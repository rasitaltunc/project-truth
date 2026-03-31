import { create } from 'zustand';

// ═══════════════════════════════════════════
// VIEW MODE STORE — Sprint 7 "Akıllı Lens"
// 5 Lens sistemi state management
// ═══════════════════════════════════════════

export type ViewMode =
  | 'full_network'   // Tam ağ — herkes, her şey
  | 'main_story'     // Ana hikaye — tier 0-1 + keystone
  | 'follow_money'   // Parayı takip et — finansal ipler
  | 'evidence_map'   // Kanıt haritası — güven + doğrulama
  | 'timeline'       // Kronolojik — zaman slider'ı
  | 'board';         // 2D Soruşturma Panosu — Sprint 8

export interface LensConfig {
  id: ViewMode;
  label: string;
  labelTR: string;
  icon: string;
  description: string;
  color: string;
}

export const LENS_CONFIGS: LensConfig[] = [
  {
    id: 'full_network',
    label: 'FULL NETWORK',
    labelTR: 'Tam Ağ',
    icon: '🌐',
    description: 'All nodes and connections',
    color: '#6b7280',
  },
  {
    id: 'main_story',
    label: 'MAIN STORY',
    labelTR: 'Ana Hikaye',
    icon: '📖',
    description: 'Key actors and events',
    color: '#dc2626',
  },
  {
    id: 'follow_money',
    label: 'FOLLOW THE MONEY',
    labelTR: 'Parayı Takip Et',
    icon: '💰',
    description: 'Financial flows and transfers',
    color: '#3b82f6',
  },
  {
    id: 'evidence_map',
    label: 'EVIDENCE MAP',
    labelTR: 'Kanıt Haritası',
    icon: '🔍',
    description: 'Verification and confidence levels',
    color: '#f59e0b',
  },
  {
    id: 'timeline',
    label: 'TIMELINE',
    labelTR: 'Kronoloji',
    icon: '⏳',
    description: 'Network evolution over time',
    color: '#8b5cf6',
  },
  {
    id: 'board',
    label: 'INVESTIGATION BOARD',
    labelTR: 'Soruşturma Panosu',
    icon: '📌',
    description: '2D detective board — drag, link, investigate',
    color: '#dc2626',
  },
];

export interface AiLensSuggestion {
  mode: ViewMode;
  confidence: number;
  reason: string;
  dismissed?: boolean; // artık kullanılmıyor — dismiss = null, ama eski kodla uyumluluk
}

interface ViewModeState {
  activeMode: ViewMode;
  previousMode: ViewMode | null;
  modeHistory: ViewMode[];
  isTransitioning: boolean;
  // Timeline lens specific
  timelineRange: [number, number] | null;    // [startYear, endYear]
  timelineYearRange: [number, number];       // [minYear, maxYear] of data
  isTimelinePlaying: boolean;
  // AI suggestion
  aiSuggestion: AiLensSuggestion | null;
  // Sidebar state
  sidebarOpen: boolean;

  // Actions
  setMode: (mode: ViewMode) => void;
  revertMode: () => void;
  setTimelineRange: (range: [number, number]) => void;
  setTimelineYearRange: (range: [number, number]) => void;
  toggleTimelinePlaying: () => void;
  setAiSuggestion: (suggestion: AiLensSuggestion | null) => void;
  dismissAiSuggestion: () => void;
  acceptAiSuggestion: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useViewModeStore = create<ViewModeState>((set, get) => ({
  activeMode: 'full_network',
  previousMode: null,
  modeHistory: ['full_network'],
  isTransitioning: false,
  timelineRange: null,
  timelineYearRange: [1990, 2026],
  isTimelinePlaying: false,
  aiSuggestion: null,
  sidebarOpen: false,

  setMode: (mode) => {
    const current = get().activeMode;
    if (current === mode) return;

    // History limit 20
    const history = [...get().modeHistory, mode].slice(-20);

    // React 18+ otomatik batching yapıyor — setTimeout gereksiz
    // Tek atomik set() çağrısı: animate loop viewModeRef.current'ı
    // her zaman tutarlı okur, arada eski/yeni karışmaz
    set({
      activeMode: mode,
      previousMode: current,
      modeHistory: history,
      isTransitioning: false,
    });
  },

  revertMode: () => {
    const prev = get().previousMode;
    if (prev) get().setMode(prev);
  },

  setTimelineRange: (range) => set({ timelineRange: range }),
  setTimelineYearRange: (range) => set({ timelineYearRange: range }),
  toggleTimelinePlaying: () => set((s) => ({ isTimelinePlaying: !s.isTimelinePlaying })),

  setAiSuggestion: (suggestion) => set({ aiSuggestion: suggestion }),
  dismissAiSuggestion: () => set({ aiSuggestion: null }),
  acceptAiSuggestion: () => {
    const suggestion = get().aiSuggestion;
    if (suggestion && !suggestion.dismissed) {
      get().setMode(suggestion.mode);
      set({ aiSuggestion: null });
    }
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// ═══════════════════════════════════════════
// LENS VISIBILITY HELPERS
// Her lens için node/link visibility hesaplama
// ═══════════════════════════════════════════

export interface NodeVisibility {
  opacity: number;         // 0.0 - 1.0
  scale: number;           // 0.5 - 1.5
  zOffset: number;         // Z-Axis ghosting (3D derinlik)
  dimmed: boolean;         // ghost flag
}

export interface LinkVisibility {
  opacity: number;
  colorOverride: number | null;   // null = kendi rengi, number = hex
  widthMultiplier: number;
  showDirectionArrow: boolean;    // follow_money için
  dimmed: boolean;
}

// ─── Finansal tespit: DATA-DRIVEN ───
// "Bin vaka için altyapı kur" — label hardcode DEĞİL, node.type ve tags'e bak
// DB'de node.type = 'organization' | 'financial_entity' | 'shell_company' vb.
// DB'de link.type = 'financial' | 'payment' | 'transfer' vb.

const FINANCIAL_NODE_TYPES = new Set([
  'organization', 'financial_entity', 'shell_company', 'bank',
  'foundation', 'trust', 'hedge_fund', 'corporation',
]);

const FINANCIAL_OCCUPATIONS = new Set([
  'banker', 'financier', 'investor', 'fund manager', 'hedge fund manager',
  'financial advisor', 'accountant', 'treasurer', 'cfo',
]);

const FINANCIAL_LINK_TYPES = new Set([
  'financial', 'payment', 'transfer', 'funding', 'investment',
  'donation', 'bribe', 'money_laundering', 'wire_transfer',
]);

const FINANCIAL_EVIDENCE_TYPES = new Set([
  'financial_record', 'bank_record', 'tax_document', 'court_record',
]);

function isFinancialLink(link: any): boolean {
  const type = (link.type || '').toLowerCase();
  const evType = (link.evidence_type || '').toLowerCase();
  // 1. Önce tip bazlı (data-driven)
  if (FINANCIAL_LINK_TYPES.has(type)) return true;
  if (FINANCIAL_EVIDENCE_TYPES.has(evType)) return true;
  // 2. Fallback: type string'inde finansal kelime var mı
  return type.includes('financial') || type.includes('money') || type.includes('payment');
}

function isFinancialNode(node: any): boolean {
  const type = (node.type || '').toLowerCase();
  const occ = (node.occupation || '').toLowerCase();
  const tags: string[] = node.tags || node.category_tags || [];
  // 1. Node type — DB'den gelen yapısal bilgi (en güvenilir)
  if (FINANCIAL_NODE_TYPES.has(type)) return true;
  // 2. Occupation — meslek bilgisi
  if (FINANCIAL_OCCUPATIONS.has(occ)) return true;
  // 3. Tags dizisinde "financial" var mı
  if (tags.some((t: string) => t.toLowerCase().includes('financial'))) return true;
  // 4. Fallback: occupation string'inde genel arama
  return occ.includes('bank') || occ.includes('financ') || occ.includes('fund') || occ.includes('invest');
}

// Tier sayısını normalize et
function getTierNumber(tier: any): number {
  if (typeof tier === 'number') return tier;
  if (typeof tier === 'string') {
    const t = tier.replace('tier', '');
    return parseInt(t) || 99;
  }
  return 99;
}

export function getNodeVisibility(node: any, mode: ViewMode, timelineRange?: [number, number] | null): NodeVisibility {
  const tier = getTierNumber(node.tier);
  const risk = node.risk || 0;

  switch (mode) {
    case 'full_network':
      return { opacity: 1.0, scale: 1.0, zOffset: 0, dimmed: false };

    case 'main_story': {
      const isKeyPlayer = tier <= 1;
      const isHighRisk = risk >= 70;
      if (isKeyPlayer || isHighRisk) {
        return { opacity: 1.0, scale: tier === 0 ? 1.2 : 1.0, zOffset: 0, dimmed: false };
      }
      // Tier 2: yarı-görünür arka plan
      if (tier === 2) {
        return { opacity: 0.3, scale: 0.85, zOffset: -2, dimmed: true };
      }
      // Tier 3-4: ghost
      return { opacity: 0.10, scale: 0.65, zOffset: -5, dimmed: true };
    }

    case 'follow_money': {
      const isFinancial = isFinancialNode(node);
      if (isFinancial) {
        return { opacity: 1.0, scale: 1.15, zOffset: 0, dimmed: false };
      }
      // Kişiler arka plana
      if (node.type === 'person' || !node.type) {
        return { opacity: 0.12, scale: 0.7, zOffset: -4, dimmed: true };
      }
      return { opacity: 0.20, scale: 0.75, zOffset: -3, dimmed: true };
    }

    case 'evidence_map': {
      const confidence = node.confidence_level || node.risk / 100 || 0.5;
      const isVerified = node.verification_level === 'official' || node.verification_level === 'journalist';
      if (isVerified || confidence > 0.7) {
        return { opacity: 1.0, scale: 1.0, zOffset: 0, dimmed: false };
      }
      if (confidence > 0.4) {
        return { opacity: 0.6, scale: 0.9, zOffset: -1, dimmed: false };
      }
      return { opacity: 0.20, scale: 0.75, zOffset: -3, dimmed: true };
    }

    case 'timeline': {
      // Timeline range yoksa veya node'un hiç tarihi yoksa → yarı-görünür
      // Fallback chain: birth_date → death_date → details.founded_date → created_at
      const nodeDate = node.birth_date || node.death_date ||
        (typeof node.details === 'object' && node.details?.founded_date) ||
        node.created_at;
      if (!timelineRange) {
        return { opacity: 0.7, scale: 0.9, zOffset: 0, dimmed: false };
      }
      if (!nodeDate) {
        // Tarihi olmayan node'lar ghost — tarih bilinmiyor
        return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true };
      }

      // Node yılını çıkar (ISO string veya sadece yıl)
      const nodeYear = typeof nodeDate === 'number'
        ? nodeDate
        : parseInt(String(nodeDate).slice(0, 4));

      if (isNaN(nodeYear)) {
        return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true };
      }

      const [startYear, endYear] = timelineRange;

      // Aktif penceredeyse: parlak + öne
      if (nodeYear >= startYear && nodeYear <= endYear) {
        return { opacity: 1.0, scale: 1.05, zOffset: 1, dimmed: false };
      }
      // Pencereye yakınsa (±5 yıl): yarı-görünür
      const dist = Math.min(Math.abs(nodeYear - startYear), Math.abs(nodeYear - endYear));
      if (dist <= 5) {
        const fade = 0.4 - (dist / 5) * 0.25;
        return { opacity: fade, scale: 0.8, zOffset: -2, dimmed: true };
      }
      // Çok uzakta: ghost
      return { opacity: 0.08, scale: 0.65, zOffset: -5, dimmed: true };
    }

    case 'board':
      // Board modunda 3D sahne gizli — bu değerler kullanılmaz ama type safety için
      return { opacity: 0, scale: 0, zOffset: 0, dimmed: true };

    default:
      return { opacity: 1.0, scale: 1.0, zOffset: 0, dimmed: false };
  }
}

export function getLinkVisibility(link: any, mode: ViewMode): LinkVisibility {
  switch (mode) {
    case 'full_network':
      return { opacity: 1.0, colorOverride: null, widthMultiplier: 1.0, showDirectionArrow: false, dimmed: false };

    case 'main_story': {
      // AdditiveBlending + karanlık bg → dimmed ipler PARLAK renk + YÜKSEK opacity gerektirir
      // Fark: keystone → orijinal renk + tam parlaklık, dimmed → gri ama GÖRÜNÜR
      const isKeystone = link.evidence_count >= 3 || link.confidence_level >= 0.7;
      if (isKeystone) {
        return { opacity: 1.0, colorOverride: null, widthMultiplier: 1.4, showDirectionArrow: false, dimmed: false };
      }
      return { opacity: 0.9, colorOverride: 0xaaaaaa, widthMultiplier: 0.6, showDirectionArrow: false, dimmed: true };
    }

    case 'follow_money': {
      const isFinancial = isFinancialLink(link);
      if (isFinancial) {
        return {
          opacity: 1.0,
          colorOverride: 0x60a5fa,   // Parlak Mavi
          widthMultiplier: 1.5,
          showDirectionArrow: true,
          dimmed: false,
        };
      }
      return { opacity: 0.85, colorOverride: 0x888888, widthMultiplier: 0.5, showDirectionArrow: false, dimmed: true };
    }

    case 'evidence_map': {
      const confidence = link.confidence_level || 0.5;
      const evType = link.evidence_type;
      // Renk = kanıt tipi (Sprint 6B'den)
      const colors: Record<string, number> = {
        court_record: 0xef4444,
        official_document: 0xf59e0b,
        financial_record: 0x22c55e,
        leaked_document: 0xa855f7,
        media_report: 0x3b82f6,
        testimony: 0xec4899,
        flight_record: 0x14b8a6,
      };
      const color = evType && colors[evType] ? colors[evType] : null;
      const width = 0.6 + confidence * 1.4;
      return {
        opacity: 0.8 + confidence * 0.2,
        colorOverride: color,
        widthMultiplier: width,
        showDirectionArrow: false,
        dimmed: confidence < 0.3,
      };
    }

    case 'timeline':
      return { opacity: 0.85, colorOverride: null, widthMultiplier: 0.8, showDirectionArrow: false, dimmed: false };

    case 'board':
      return { opacity: 0, colorOverride: null, widthMultiplier: 0, showDirectionArrow: false, dimmed: true };

    default:
      return { opacity: 1.0, colorOverride: null, widthMultiplier: 1.0, showDirectionArrow: false, dimmed: false };
  }
}

// ═══════════════════════════════════════════
// EMPTY STATE HELPER
// Kaç node bu lens'te "görünür" sayılır?
// ═══════════════════════════════════════════
const VISIBLE_OPACITY_THRESHOLD = 0.3;

export function countVisibleNodes(
  nodes: any[],
  mode: ViewMode,
  timelineRange?: [number, number] | null,
): number {
  if (mode === 'full_network') return nodes.length;
  return nodes.filter(n => {
    const vis = getNodeVisibility(n, mode, timelineRange);
    return vis.opacity >= VISIBLE_OPACITY_THRESHOLD;
  }).length;
}
