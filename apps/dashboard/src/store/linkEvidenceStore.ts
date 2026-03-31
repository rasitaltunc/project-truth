import { create } from 'zustand';

// ═══════════════════════════════════════════
// LINK EVIDENCE STORE — Sprint 6C "Konuşan İpler"
// Her link'in evidence timeline'ını yönetir
// ═══════════════════════════════════════════

export interface EvidencePulse {
    timelineId: string;
    evidenceId: string;
    evidenceType: string;        // court_record, financial_record, vb.
    title: string;               // Kısa etiket ("Banka Transferi $4.5M")
    summary: string | null;      // 1-2 cümle açıklama
    sourceName: string | null;
    sourceUrl: string | null;
    eventDate: string | null;    // ISO date
    datePrecision: string;       // day/month/year
    direction: string;           // source_to_target / target_to_source / bidirectional
    visualWeight: number;        // 0.5-3.0
    isKeystone: boolean;         // Kilit olay mı?
    communityVotes: number;
    verificationStatus: string;
    confidence: number;          // 0-1
    pulsePosition: number;       // 0-1 (kronolojik pozisyon ip üzerinde)
}

export interface LinkEvidenceData {
    link: {
        id: string;
        sourceId: string;
        targetId: string;
        sourceLabel: string;
        targetLabel: string;
        type?: string;
        evidenceType?: string;
        confidenceLevel?: number;
    };
    evidences: EvidencePulse[];
    totalCount: number;
    keystoneCount: number;
    dateRange: { earliest: string; latest: string } | null;
}

interface LinkEvidenceState {
    // Aktif link evidence verileri
    activeLink: { sourceId: string; targetId: string } | null;
    data: LinkEvidenceData | null;
    loading: boolean;
    error: string | null;

    // Tüm link'lerin evidence cache'i (linkKey → data)
    cache: Map<string, LinkEvidenceData>;

    // Koridor modu
    corridorMode: boolean;
    corridorProgress: number;    // 0-1
    corridorPaused: boolean;
    activeEvidenceIndex: number; // Hangi evidence'da duruyoruz

    // 3D floating panel
    openPanelId: string | null;  // Açık evidence panel'inin ID'si

    // Utanç Koridoru — 3D wire-walk
    corridorWalkMode: boolean;
    corridorWalkProgress: number;      // 0-1 (ip üzerindeki konum)
    corridorWalkPhase: 'idle' | 'entering' | 'walking' | 'focused' | 'exiting';
    corridorWalkSpeed: number;         // 0.5, 1.0, 2.0
    corridorWalkPaused: boolean;
    corridorWalkEvidenceIndex: number; // Aktif kanıt index

    // Actions
    fetchLinkEvidence: (sourceId: string, targetId: string) => Promise<void>;
    clearActiveLink: () => void;

    // Koridor actions (mevcut 2D HUD)
    enterCorridorMode: () => void;
    exitCorridorMode: () => void;
    setCorridorProgress: (progress: number) => void;
    toggleCorridorPause: () => void;
    nextEvidence: () => void;
    prevEvidence: () => void;

    // Utanç Koridoru actions (3D wire-walk)
    enterCorridorWalk: () => void;
    exitCorridorWalk: () => void;
    setCorridorWalkProgress: (p: number) => void;
    setCorridorWalkSpeed: (s: number) => void;
    setCorridorWalkPhase: (phase: 'idle' | 'entering' | 'walking' | 'focused' | 'exiting') => void;
    toggleCorridorWalkPause: () => void;
    nextWalkEvidence: () => void;
    prevWalkEvidence: () => void;

    // Panel actions
    openEvidencePanel: (evidenceId: string) => void;
    closeEvidencePanel: () => void;
}

const makeLinkKey = (a: string, b: string) => [a, b].sort().join('::');

export const useLinkEvidenceStore = create<LinkEvidenceState>((set, get) => ({
    activeLink: null,
    data: null,
    loading: false,
    error: null,
    cache: new Map(),

    corridorMode: false,
    corridorProgress: 0,
    corridorPaused: false,
    activeEvidenceIndex: 0,

    openPanelId: null,

    // Utanç Koridoru initial state
    corridorWalkMode: false,
    corridorWalkProgress: 0,
    corridorWalkPhase: 'idle' as const,
    corridorWalkSpeed: 1.0,
    corridorWalkPaused: false,
    corridorWalkEvidenceIndex: 0,

    fetchLinkEvidence: async (sourceId: string, targetId: string) => {
        const key = makeLinkKey(sourceId, targetId);

        // Cache hit?
        const cached = get().cache.get(key);
        if (cached) {
            set({ activeLink: { sourceId, targetId }, data: cached, loading: false, error: null });
            return;
        }

        set({ activeLink: { sourceId, targetId }, loading: true, error: null });

        try {
            const res = await fetch(`/api/truth/link-evidence?sourceId=${sourceId}&targetId=${targetId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: LinkEvidenceData = await res.json();

            // Cache'e kaydet
            const newCache = new Map(get().cache);
            newCache.set(key, data);

            set({ data, loading: false, cache: newCache });
        } catch (err: any) {
            set({ loading: false, error: err.message });
        }
    },

    clearActiveLink: () => set({
        activeLink: null,
        data: null,
        corridorMode: false,
        corridorProgress: 0,
        openPanelId: null,
    }),

    enterCorridorMode: () => set({
        corridorMode: true,
        corridorProgress: 0,
        corridorPaused: false,
        activeEvidenceIndex: 0,
        openPanelId: null,
    }),

    exitCorridorMode: () => set({
        corridorMode: false,
        corridorProgress: 0,
        corridorPaused: false,
        openPanelId: null,
    }),

    setCorridorProgress: (progress: number) => {
        const data = get().data;
        if (!data) return;

        // Kırmızı çizgi noktaya ULAŞTIĞINDA kart değişsin (nearest değil, last-reached)
        // Küçük tolerans: çizgi noktaya 2% yaklaştığında tetikle (doğal his)
        const SNAP_THRESHOLD = 0.02;
        const evidences = data.evidences;
        let reachedIdx = 0;
        for (let i = 0; i < evidences.length; i++) {
            if (evidences[i].pulsePosition <= progress + SNAP_THRESHOLD) {
                reachedIdx = i;
            }
        }

        set({ corridorProgress: progress, activeEvidenceIndex: reachedIdx });
    },

    toggleCorridorPause: () => set({ corridorPaused: !get().corridorPaused }),

    nextEvidence: () => {
        const { data, activeEvidenceIndex } = get();
        if (!data) return;
        const next = Math.min(activeEvidenceIndex + 1, data.evidences.length - 1);
        set({
            activeEvidenceIndex: next,
            corridorProgress: data.evidences[next]?.pulsePosition ?? 0,
        });
    },

    prevEvidence: () => {
        const { data, activeEvidenceIndex } = get();
        if (!data) return;
        const prev = Math.max(activeEvidenceIndex - 1, 0);
        set({
            activeEvidenceIndex: prev,
            corridorProgress: data.evidences[prev]?.pulsePosition ?? 0,
        });
    },

    openEvidencePanel: (evidenceId: string) => set({
        openPanelId: evidenceId,
        corridorPaused: true, // Panel açıkken koridor duraksıyor
    }),

    closeEvidencePanel: () => set({
        openPanelId: null,
        corridorPaused: false,
    }),

    // ═══════════════════════════════════════════
    // KANIT KORİDORU — 3D Wire-Walk Actions
    // ═══════════════════════════════════════════

    enterCorridorWalk: () => set({
        corridorWalkMode: true,
        corridorWalkProgress: 0,
        corridorWalkPhase: 'entering',
        corridorWalkPaused: false,
        corridorWalkEvidenceIndex: 0,
        // Mevcut 2D koridoru kapat
        corridorMode: false,
        openPanelId: null,
    }),

    exitCorridorWalk: () => {
        const { corridorWalkPhase } = get();
        // Zaten exiting veya idle ise bir şey yapma
        if (corridorWalkPhase === 'exiting' || corridorWalkPhase === 'idle') return;
        // 3D engine exiting animasyonunu başlatacak, tamamlandığında idle olacak
        set({
            corridorWalkPhase: 'exiting',
            corridorWalkPaused: false,
        });
    },

    setCorridorWalkProgress: (p: number) => {
        const data = get().data;
        if (!data) return;

        // Kırmızı çizgi noktaya ULAŞTIĞINDA kart değişsin (nearest değil, last-reached)
        const SNAP_THRESHOLD = 0.02;
        let reachedIdx = 0;
        for (let i = 0; i < data.evidences.length; i++) {
            if (data.evidences[i].pulsePosition <= p + SNAP_THRESHOLD) {
                reachedIdx = i;
            }
        }

        set({ corridorWalkProgress: p, corridorWalkEvidenceIndex: reachedIdx });
    },

    setCorridorWalkSpeed: (s: number) => set({ corridorWalkSpeed: s }),

    setCorridorWalkPhase: (phase: 'idle' | 'entering' | 'walking' | 'focused' | 'exiting') => {
        if (phase === 'idle') {
            // Exiting tamamlandı — tamamen kapat
            set({
                corridorWalkMode: false,
                corridorWalkProgress: 0,
                corridorWalkPhase: 'idle',
                corridorWalkPaused: false,
            });
        } else {
            set({ corridorWalkPhase: phase });
        }
    },

    toggleCorridorWalkPause: () => set({ corridorWalkPaused: !get().corridorWalkPaused }),

    nextWalkEvidence: () => {
        const { data, corridorWalkEvidenceIndex } = get();
        if (!data) return;
        const next = Math.min(corridorWalkEvidenceIndex + 1, data.evidences.length - 1);
        set({
            corridorWalkEvidenceIndex: next,
            corridorWalkProgress: data.evidences[next]?.pulsePosition ?? 0,
        });
    },

    prevWalkEvidence: () => {
        const { data, corridorWalkEvidenceIndex } = get();
        if (!data) return;
        const prev = Math.max(corridorWalkEvidenceIndex - 1, 0);
        set({
            corridorWalkEvidenceIndex: prev,
            corridorWalkProgress: data.evidences[prev]?.pulsePosition ?? 0,
        });
    },
}));
