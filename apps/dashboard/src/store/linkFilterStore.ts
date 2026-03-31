import { create } from 'zustand';

/**
 * Evidence type configuration with visual properties
 * Maps evidence_type values to display labels, icons, and colors
 */
export const EVIDENCE_TYPE_CONFIG: Record<string, { label: string; labelTR: string; icon: string; color: string; hexColor: number }> = {
  court_record: {
    label: 'COURT RECORD',
    labelTR: 'Mahkeme Kaydı',
    icon: '⚖️',
    color: '#ef4444',
    hexColor: 0xef4444,
  },
  official_document: {
    label: 'OFFICIAL DOC',
    labelTR: 'Resmi Belge',
    icon: '📜',
    color: '#f59e0b',
    hexColor: 0xf59e0b,
  },
  financial_record: {
    label: 'FINANCIAL',
    labelTR: 'Finansal Kayıt',
    icon: '💰',
    color: '#22c55e',
    hexColor: 0x22c55e,
  },
  leaked_document: {
    label: 'LEAKED DOC',
    labelTR: 'Sızdırılmış Belge',
    icon: '🔓',
    color: '#a855f7',
    hexColor: 0xa855f7,
  },
  witness_testimony: {
    label: 'TESTIMONY',
    labelTR: 'Tanık İfadesi',
    icon: '🗣️',
    color: '#ec4899',
    hexColor: 0xec4899,
  },
  testimony: {
    label: 'TESTIMONY',
    labelTR: 'Tanık İfadesi',
    icon: '🗣️',
    color: '#ec4899',
    hexColor: 0xec4899,
  },
  flight_record: {
    label: 'FLIGHT LOG',
    labelTR: 'Uçuş Kaydı',
    icon: '✈️',
    color: '#14b8a6',
    hexColor: 0x14b8a6,
  },
  news_major: {
    label: 'MAJOR NEWS',
    labelTR: 'Ana Akım Haber',
    icon: '📰',
    color: '#3b82f6',
    hexColor: 0x3b82f6,
  },
  news_minor: {
    label: 'LOCAL NEWS',
    labelTR: 'Yerel Haber',
    icon: '📋',
    color: '#6b7280',
    hexColor: 0x6b7280,
  },
  academic_paper: {
    label: 'ACADEMIC',
    labelTR: 'Akademik',
    icon: '🔬',
    color: '#6366f1',
    hexColor: 0x6366f1,
  },
  social_media: {
    label: 'SOCIAL MEDIA',
    labelTR: 'Sosyal Medya',
    icon: '📱',
    color: '#737373',
    hexColor: 0x737373,
  },
  rumor: {
    label: 'RUMOR',
    labelTR: 'Söylenti',
    icon: '❓',
    color: '#525252',
    hexColor: 0x525252,
  },
  inference: {
    label: 'INFERENCE',
    labelTR: 'Çıkarım',
    icon: '🔍',
    color: '#6b7280',
    hexColor: 0x6b7280,
  },
};

/**
 * Ordered list of evidence types for consistent UI rendering
 */
export const EVIDENCE_TYPE_ORDER = [
  'court_record',
  'official_document',
  'financial_record',
  'leaked_document',
  'witness_testimony',
  'flight_record',
  'news_major',
  'news_minor',
  'academic_paper',
  'social_media',
  'rumor',
  'inference',
];

interface LinkFilterState {
  // Active filters — empty Set = show ALL (no filtering)
  activeFilters: Set<string>;

  // Is filtering enabled
  filteringEnabled: boolean;

  // Actions
  toggleFilter: (type: string) => void;
  setFilters: (types: string[]) => void;
  clearFilters: () => void;
  enableFiltering: () => void;
  disableFiltering: () => void;

  // Helper — should this link be visible given current filters?
  isLinkVisible: (evidenceType: string | null | undefined) => boolean;
}

/**
 * Zustand store for link filtering
 * Manages evidence type filters and visibility logic
 */
export const useLinkFilterStore = create<LinkFilterState>((set, get) => ({
  activeFilters: new Set<string>(),
  filteringEnabled: false,

  toggleFilter: (type) => {
    const current = new Set(get().activeFilters);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    set({ activeFilters: current, filteringEnabled: current.size > 0 });
  },

  setFilters: (types) =>
    set({
      activeFilters: new Set(types),
      filteringEnabled: types.length > 0,
    }),

  clearFilters: () => set({ activeFilters: new Set(), filteringEnabled: false }),

  enableFiltering: () => set({ filteringEnabled: true }),

  disableFiltering: () => set({ filteringEnabled: false, activeFilters: new Set() }),

  isLinkVisible: (evidenceType) => {
    const { activeFilters, filteringEnabled } = get();

    // If filtering disabled or no filters active, show all
    if (!filteringEnabled || activeFilters.size === 0) return true;

    // If link has no evidence type, hide it when filtering
    if (!evidenceType) return false;

    // Show only if evidence type is in active filters
    return activeFilters.has(evidenceType);
  },
}));
