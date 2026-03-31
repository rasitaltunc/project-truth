import { create } from 'zustand';
import type { CorridorThemeKey } from '@/shaders/tunnelShaders';
import type { EvidencePulse, LinkEvidenceData } from './linkEvidenceStore';

// ═══════════════════════════════════════════════════════════════
// SPRINT 14A — TÜNEL STORE
// Simülasyon tüneli deneyiminin tüm durumunu yönetir
// Mevcut linkEvidenceStore'dan bağımsız, kendi yaşam döngüsü var
// ═══════════════════════════════════════════════════════════════

// ── Tünel Fazları ──
// Her faz, farklı görsel ve etkileşim kurallarına sahip
export type TunnelPhase =
  | 'idle'          // Tünel kapalı
  | 'zooming'       // Kamera ipe yaklaşıyor (dış dünyadan geçiş)
  | 'booting'       // Animus boot-up sekansı (simülasyon çizgileri oluşuyor)
  | 'entering'      // Tünele giriş animasyonu (portal açılıyor)
  | 'walking'       // Tünel içinde yürüyüş (ana deneyim)
  | 'focused'       // Bir kanıt paneline odaklanmış (yürüyüş duraklatılmış)
  | 'exiting'       // Tünelden çıkış animasyonu
  | 'returning';    // Kamera dış dünyaya dönüyor

// ── Tünel İçi Navigasyon Yönü ──
export type WalkDirection = 'forward' | 'backward' | 'stopped';

interface TunnelState {
  // ── Yaşam Döngüsü ──
  active: boolean;              // Tünel açık mı?
  phase: TunnelPhase;
  phaseProgress: number;        // Mevcut fazın ilerlemesi (0-1)

  // ── Bağlam ──
  sourceNodeId: string | null;
  targetNodeId: string | null;
  sourceLabel: string;
  targetLabel: string;
  linkData: LinkEvidenceData | null;

  // ── Tema ──
  theme: CorridorThemeKey;
  bootProgress: number;         // Boot-up animasyonu (0-1)

  // ── Navigasyon ──
  walkProgress: number;         // Tünel içi pozisyon (0-1)
  walkSpeed: number;            // 0.5, 1.0, 2.0
  walkDirection: WalkDirection;
  paused: boolean;

  // ── Kanıt Panelleri ──
  activeEvidenceIndex: number;
  focusedEvidenceId: string | null;  // Odaklanmış panel ID

  // ── Coming Soon ──
  comingSoon: boolean;            // Tünel deneyimi henüz geliştirme aşamasında
  comingSoonTriggered: boolean;   // Coming soon overlay gösterildi mi?

  // ── Kamera Bilgisi ──
  // (3D sahne tarafından güncellenir, UI tarafından okunur)
  cameraZ: number;              // Tünel içi kamera Z pozisyonu

  // ── Aksiyonlar ──
  // Giriş/Çıkış
  enterTunnel: (params: {
    sourceId: string;
    targetId: string;
    sourceLabel: string;
    targetLabel: string;
    linkData: LinkEvidenceData;
    theme?: CorridorThemeKey;
  }) => void;
  exitTunnel: () => void;

  // Faz Geçişleri (3D sahne tarafından çağrılır)
  setPhase: (phase: TunnelPhase) => void;
  setBootProgress: (p: number) => void;

  // Navigasyon
  setWalkProgress: (p: number) => void;
  setWalkSpeed: (s: number) => void;
  setWalkDirection: (d: WalkDirection) => void;
  togglePause: () => void;

  // Kanıt
  nextEvidence: () => void;
  prevEvidence: () => void;
  focusEvidence: (id: string | null) => void;

  // Tema
  setTheme: (theme: CorridorThemeKey) => void;

  // Kamera
  setCameraZ: (z: number) => void;

  // Coming Soon
  triggerComingSoon: () => void;
}

export const useTunnelStore = create<TunnelState>((set, get) => ({
  // ── Initial State ──
  active: false,
  phase: 'idle',
  phaseProgress: 0,

  sourceNodeId: null,
  targetNodeId: null,
  sourceLabel: '',
  targetLabel: '',
  linkData: null,

  theme: 'evidence',
  bootProgress: 0,

  walkProgress: 0,
  walkSpeed: 1.0,
  walkDirection: 'stopped',
  paused: false,

  activeEvidenceIndex: 0,
  focusedEvidenceId: null,

  comingSoon: true,               // V2 geliştirmesi tamamlanana kadar true
  comingSoonTriggered: false,

  cameraZ: 0,

  // ── Giriş ──
  enterTunnel: ({ sourceId, targetId, sourceLabel, targetLabel, linkData, theme }) => {
    set({
      active: true,
      phase: 'zooming',
      phaseProgress: 0,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      sourceLabel,
      targetLabel,
      linkData,
      theme: theme || 'evidence',
      bootProgress: 0,
      walkProgress: 0,
      walkSpeed: 1.0,
      walkDirection: 'stopped',
      paused: false,
      activeEvidenceIndex: 0,
      focusedEvidenceId: null,
      comingSoonTriggered: false,
      cameraZ: 0,
    });
  },

  // ── Çıkış ──
  exitTunnel: () => {
    const { phase } = get();
    if (phase === 'exiting' || phase === 'returning' || phase === 'idle') return;
    set({
      phase: 'exiting',
      phaseProgress: 0,
      paused: false,
      focusedEvidenceId: null,
      walkDirection: 'stopped',
    });
  },

  // ── Faz Yönetimi ──
  setPhase: (phase) => {
    if (phase === 'idle') {
      // Tam kapanış — her şeyi sıfırla
      set({
        active: false,
        phase: 'idle',
        phaseProgress: 0,
        sourceNodeId: null,
        targetNodeId: null,
        sourceLabel: '',
        targetLabel: '',
        linkData: null,
        bootProgress: 0,
        walkProgress: 0,
        walkDirection: 'stopped',
        paused: false,
        activeEvidenceIndex: 0,
        focusedEvidenceId: null,
        comingSoonTriggered: false,
        cameraZ: 0,
      });
    } else {
      set({ phase, phaseProgress: 0 });
    }
  },

  setBootProgress: (p) => set({ bootProgress: Math.min(1, Math.max(0, p)) }),

  // ── Navigasyon ──
  setWalkProgress: (p) => {
    const { linkData } = get();
    if (!linkData) return;

    const clamped = Math.min(1, Math.max(0, p));

    // En yakın kanıt index'ini bul
    let nearestIdx = 0;
    let minDist = Infinity;
    linkData.evidences.forEach((e, i) => {
      const dist = Math.abs(e.pulsePosition - clamped);
      if (dist < minDist) { minDist = dist; nearestIdx = i; }
    });

    set({ walkProgress: clamped, activeEvidenceIndex: nearestIdx });
  },

  setWalkSpeed: (s) => set({ walkSpeed: s }),

  setWalkDirection: (d) => set({ walkDirection: d }),

  togglePause: () => {
    const { paused, phase } = get();
    if (phase !== 'walking') return;
    set({
      paused: !paused,
      walkDirection: !paused ? 'stopped' : 'forward',
    });
  },

  // ── Kanıt Navigasyonu ──
  nextEvidence: () => {
    const { linkData, activeEvidenceIndex } = get();
    if (!linkData) return;
    const next = Math.min(activeEvidenceIndex + 1, linkData.evidences.length - 1);
    set({
      activeEvidenceIndex: next,
      walkProgress: linkData.evidences[next]?.pulsePosition ?? 0,
    });
  },

  prevEvidence: () => {
    const { linkData, activeEvidenceIndex } = get();
    if (!linkData) return;
    const prev = Math.max(activeEvidenceIndex - 1, 0);
    set({
      activeEvidenceIndex: prev,
      walkProgress: linkData.evidences[prev]?.pulsePosition ?? 0,
    });
  },

  focusEvidence: (id) => {
    set({
      focusedEvidenceId: id,
      phase: id ? 'focused' : 'walking',
      paused: !!id,
      walkDirection: id ? 'stopped' : 'forward',
    });
  },

  // ── Tema ──
  setTheme: (theme) => set({ theme }),

  // ── Kamera ──
  setCameraZ: (z) => set({ cameraZ: z }),

  // ── Coming Soon ──
  triggerComingSoon: () => {
    set({
      comingSoonTriggered: true,
      paused: true,
      walkDirection: 'stopped',
    });
  },
}));
