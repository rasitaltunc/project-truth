// ═══════════════════════════════════════════
// CINEMATIC STORE — Sprint 10
// İlk ziyaret tespiti + sinematik faz yönetimi
// 10 saniyelik dramatik açılış sekansı
// ═══════════════════════════════════════════

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ── Types ──
export type CinematicPhase =
  | 'idle'          // Henüz başlamadı
  | 'nodes'         // 0-3s: Node'lar fade-in
  | 'links'         // 3-5s: Link'ler çizilir
  | 'camera'        // 5-7s: Kamera geri çekilir
  | 'tagline'       // 7-9s: Typewriter efekti
  | 'complete';     // 9-10s: Bitış + fade-out

interface TaglineLine {
  text: string;
  delay: number; // ms cinsinden, tagline fazı başladıktan sonra
}

interface CinematicState {
  // ── State ──
  hasSeenOpening: boolean;
  isActive: boolean;
  phase: CinematicPhase;
  nodeRevealCount: number;   // 0-N: Kaç node görünür
  linkReveal: boolean;        // Link'ler görünür mü
  taglineIndex: number;       // Hangi satıra kadar gösterildi
  showSkipButton: boolean;

  // ── Tagline lines ──
  taglines: TaglineLine[];

  // ── Actions ──
  initCinematic: () => void;
  startCinematic: (totalNodes: number) => void;
  skipCinematic: () => void;
  setPhase: (phase: CinematicPhase) => void;
  setNodeRevealCount: (count: number) => void;
  setLinkReveal: (reveal: boolean) => void;
  setTaglineIndex: (index: number) => void;
  markComplete: () => void;
}

// ── localStorage key ──
const STORAGE_KEY = 'truth-cinematic-seen';

// ── Tagline metinleri ──
const TAGLINES: TaglineLine[] = [
  { text: 'Gördüğünüz her nokta bir kişi.', delay: 0 },
  { text: 'Her ip bir bağlantı.', delay: 1500 },
  { text: 'Her bağlantı bir kanıt.', delay: 3000 },
  { text: 'Gerçeğin haritası burada çiziliyor.', delay: 4800 },
];

export const useCinematicStore = create<CinematicState>()(
  devtools(
    (set, get) => ({
      // ── Initial State ──
      hasSeenOpening: false,
      isActive: false,
      phase: 'idle',
      nodeRevealCount: 0,
      linkReveal: false,
      taglineIndex: -1,
      showSkipButton: true,
      taglines: TAGLINES,

      // ── Init: localStorage kontrol ──
      initCinematic: () => {
        try {
          const seen = localStorage.getItem(STORAGE_KEY);
          if (seen === 'true') {
            set({
              hasSeenOpening: true,
              isActive: false,
              phase: 'complete',
              nodeRevealCount: 999,
              linkReveal: true,
            });
          }
        } catch {
          // localStorage erişim hatası — ilk defa varsay
        }
      },

      // ── Start: Sinematik başlat ──
      startCinematic: (totalNodes: number) => {
        const state = get();
        if (state.hasSeenOpening || state.isActive) return;

        set({
          isActive: true,
          phase: 'nodes',
          nodeRevealCount: 0,
          linkReveal: false,
          taglineIndex: -1,
          showSkipButton: true,
        });

        // ── Phase Timeline (15s toplam — sinematik hissiyat) ──
        // 0-3s: Node'lar birer birer fade-in
        const nodeInterval = 3000 / Math.max(totalNodes, 1);
        for (let i = 1; i <= totalNodes; i++) {
          setTimeout(() => {
            if (get().phase === 'complete') return;
            set({ nodeRevealCount: i });
          }, nodeInterval * i);
        }

        // 3s: Links fazı — ipler çizilir
        setTimeout(() => {
          if (get().phase === 'complete') return;
          set({ phase: 'links', linkReveal: true });
        }, 3000);

        // 4.5s: Camera fazı — geri çekilme
        setTimeout(() => {
          if (get().phase === 'complete') return;
          set({ phase: 'camera' });
        }, 4500);

        // 6s: Tagline fazı — ana mesajlar
        setTimeout(() => {
          if (get().phase === 'complete') return;
          set({ phase: 'tagline' });

          // Tagline satırları sırayla (her biri ~30 karakter × 35ms = ~1s + delay)
          TAGLINES.forEach((line, idx) => {
            setTimeout(() => {
              if (get().phase === 'complete') return;
              set({ taglineIndex: idx });
            }, line.delay);
          });
        }, 6000);

        // 15s: Tamamla (tagline'lara 9 saniye süre)
        setTimeout(() => {
          if (get().phase === 'complete') return;
          get().markComplete();
        }, 15000);
      },

      // ── Skip: Anında bitir ──
      skipCinematic: () => {
        get().markComplete();
      },

      // ── Phase setter ──
      setPhase: (phase) => set({ phase }),
      setNodeRevealCount: (count) => set({ nodeRevealCount: count }),
      setLinkReveal: (reveal) => set({ linkReveal: reveal }),
      setTaglineIndex: (index) => set({ taglineIndex: index }),

      // ── Mark Complete: Fade-out sonra bitir ──
      markComplete: () => {
        // Önce phase'i complete yap ama isActive kalsın → fade-out animasyonu başlar
        set({
          phase: 'complete',
          hasSeenOpening: true,
          nodeRevealCount: 999,
          linkReveal: true,
          showSkipButton: false,
        });

        // 800ms sonra overlay'i tamamen kaldır (fade-out animasyonu biter)
        setTimeout(() => {
          set({ isActive: false });
        }, 800);

        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          // Sessizce geç
        }
      },
    }),
    { name: 'CinematicStore' }
  )
);
