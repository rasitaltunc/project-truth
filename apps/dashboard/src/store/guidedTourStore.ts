// ═══════════════════════════════════════════
// GUIDED TOUR STORE — Sprint 10 Polish
// Profesyonel adım adım rehber tur
// Sinematik açılıştan sonra otomatik başlar
// ═══════════════════════════════════════════

import { create } from 'zustand';

// ── Tour Step Definition ──
export interface TourStep {
  id: string;
  title: string;
  description: string;
  // Target element selector or fixed position
  target: {
    type: 'selector' | 'rect';
    selector?: string;
    rect?: { top: number; left: number; width: number; height: number };
  };
  // Tooltip position relative to highlighted area
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right' | 'center';
  // Optional: action to perform when this step is shown
  onEnter?: () => void;
  onExit?: () => void;
}

// ── Tour Steps ──
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'PROJECT TRUTH',
    description: 'Gerçeğin haritası. Karmaşık ilişki ağlarını 3D olarak görselleştiren, kanıta dayalı bir soruşturma platformu. Her nokta bir kişi, her ip bir bağlantı.',
    target: { type: 'rect', rect: { top: 0, left: 0, width: 9999, height: 9999 } },
    tooltipPosition: 'center',
  },
  {
    id: '3d-network',
    title: '3D NETWORK VISUALIZATION',
    description: 'All people, organizations, and connections are mapped live in 3D space. Zoom, rotate, explore. Click any node to dive into details.',
    target: { type: 'rect', rect: { top: 100, left: 100, width: 600, height: 400 } },
    tooltipPosition: 'bottom',
  },
  {
    id: 'lens-sidebar',
    title: 'LENS MODES',
    description: 'Use the lens panel on the left to examine the network from different perspectives: Main Story, Follow the Money, Evidence Map, Timeline, and Investigation Board.',
    target: { type: 'selector', selector: '[data-tour="lens-sidebar"]' },
    tooltipPosition: 'right',
  },
  {
    id: 'chat-panel',
    title: 'AI INVESTIGATION ASSISTANT',
    description: 'AI-powered questioning. Ask questions about the network: "Who has financial connections to Epstein?" — AI responds, highlights relevant nodes in the network.',
    target: { type: 'selector', selector: '[data-tour="chat-panel"]' },
    tooltipPosition: 'right',
  },
  {
    id: 'toolbar-buttons',
    title: 'TOOLBAR',
    description: 'Tools on the right: Document Analysis, Follow the Money, System Health, Community Evidence (Shine Light), and Journalist Shield (Dead Man Switch).',
    target: { type: 'selector', selector: '[data-tour="toolbar-area"]' },
    tooltipPosition: 'left',
  },
  {
    id: 'journalist-shield',
    title: 'JOURNALIST SHIELD',
    description: 'Security system for journalists: Dead Man Switch (automatic publication trigger), encrypted media upload, and metadata stripping. Protects freedom of information.',
    target: { type: 'selector', selector: '[data-tour="journalist-shield"]' },
    tooltipPosition: 'left',
  },
  {
    id: 'ip-uzat',
    title: 'CAST A THREAD — COMMUNITY CONNECTION',
    description: 'Discovered a connection? Click any node and use "CAST A THREAD" to propose new connections. Community gathers evidence, and if verified, it gets added to the network.',
    target: { type: 'selector', selector: '[data-tour="lens-sidebar"]' },
    tooltipPosition: 'right',
  },
  {
    id: 'explore',
    title: 'START EXPLORING',
    description: 'Now you\'re ready. Click nodes, switch between lenses, ask AI questions. Every discovery illuminates a piece of the truth.',
    target: { type: 'rect', rect: { top: 0, left: 0, width: 9999, height: 9999 } },
    tooltipPosition: 'center',
  },
];

// ── Store ──
interface GuidedTourState {
  isActive: boolean;
  currentStep: number;
  hasSeenTour: boolean;

  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
}

const TOUR_STORAGE_KEY = 'truth-guided-tour-seen';

export const useGuidedTourStore = create<GuidedTourState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  hasSeenTour: (() => {
    try { return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'; } catch { return false; }
  })(),

  startTour: () => {
    const state = get();
    if (state.hasSeenTour) return;
    set({ isActive: true, currentStep: 0 });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep >= TOUR_STEPS.length - 1) {
      get().completeTour();
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skipTour: () => {
    get().completeTour();
  },

  completeTour: () => {
    set({ isActive: false, hasSeenTour: true });
    try { localStorage.setItem(TOUR_STORAGE_KEY, 'true'); } catch {}
  },
}));
