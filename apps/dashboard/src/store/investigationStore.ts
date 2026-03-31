// ============================================
// PROJECT TRUTH: INVESTIGATION STORE
// Sprint 4 — "Soruşturma Dosyası"
// Kullanıcının sorgu yolculuğunu otomatik kaydeder
// LOCAL-FIRST: Supabase olmadan da çalışır
// ============================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { getDeviceFingerprint } from '@/lib/auth';

// ============================================
// TYPES
// ============================================
export interface InvestigationStep {
  id?: string;
  stepOrder: number;
  query: string;
  response: string;
  highlightNodeIds: string[];
  highlightLinkIds: string[];
  annotations: Record<string, string>;
  nodeNames: string[];
  createdAt: number;
}

export interface Investigation {
  id: string;
  networkId?: string;
  authorName: string;
  authorFingerprint: string;
  title?: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  parentId?: string;
  forkCount: number;
  stepCount: number;
  upvoteCount: number;
  significanceScore: number;
  viewCount: number;
  createdAt: string;
  publishedAt?: string;
  isLocalOnly?: boolean; // Supabase'e yazılamadıysa true
}

interface InvestigationState {
  currentInvestigation: Investigation | null;
  isRecording: boolean;
  steps: InvestigationStep[];
  fingerprint: string;
  isPublishModalOpen: boolean;

  // Actions
  initFingerprint: () => void;
  startInvestigation: (networkId?: string) => Promise<void>;
  addStep: (step: Omit<InvestigationStep, 'id' | 'createdAt'>) => Promise<void>;
  publishInvestigation: (title: string, description: string) => Promise<Investigation | null>;
  forkInvestigation: (investigationId: string) => Promise<{ forked: Investigation; lastStep: any } | null>;
  openPublishModal: () => void;
  closePublishModal: () => void;
  resetInvestigation: () => void;
}

// ============================================
// FINGERPRINT
// SECURITY A7: Unified fingerprint — delegates to auth.ts (high-entropy SHA-256)
// Old custom hash replaced with proper crypto implementation
// ============================================
function generateFingerprint(): string {
  // Synchronous fallback for initial render — async version used in init
  // This returns a temporary ID that gets replaced by the real fingerprint
  const nav = typeof window !== 'undefined' ? window.navigator : null;
  if (!nav) return `fp_ssr_${Date.now().toString(36)}`;

  // Start async fingerprint generation and store when ready
  getDeviceFingerprint().then(fp => {
    const state = useInvestigationStore.getState();
    if (state.fingerprint.startsWith('fp_temp_')) {
      useInvestigationStore.setState({ fingerprint: fp });
    }
  }).catch(() => {});

  return `fp_temp_${Date.now().toString(36)}`;
}

// ============================================
// STORE
// ============================================
export const useInvestigationStore = create<InvestigationState>()(
  devtools(
    persist(
      (set, get) => ({
        currentInvestigation: null,
        isRecording: false,
        steps: [],
        fingerprint: '',
        isPublishModalOpen: false,

        initFingerprint: () => {
          const { fingerprint } = get();
          if (!fingerprint || fingerprint.startsWith('fp_temp_') || fingerprint.startsWith('fp_ssr_')) {
            // SECURITY A7: Use high-entropy fingerprint from auth.ts
            getDeviceFingerprint().then(fp => {
              set({ fingerprint: fp });
            }).catch(() => {
              // Fallback to sync version
              if (!get().fingerprint) {
                set({ fingerprint: generateFingerprint() });
              }
            });
            // Set temporary until async completes
            if (!fingerprint) {
              set({ fingerprint: generateFingerprint() });
            }
          }
        },

        // ---- Yeni soruşturma başlat (LOCAL-FIRST) ----
        startInvestigation: async (networkId?: string) => {
          let { fingerprint } = get();
          if (!fingerprint) {
            fingerprint = generateFingerprint();
            set({ fingerprint });
          }

          // LOCAL draft oluştur — hemen çalışır
          const localId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          const localInvestigation: Investigation = {
            id: localId,
            networkId,
            authorName: 'Anonim Araştırmacı',
            authorFingerprint: fingerprint,
            status: 'draft',
            forkCount: 0,
            stepCount: 0,
            upvoteCount: 0,
            significanceScore: 0,
            viewCount: 0,
            createdAt: new Date().toISOString(),
            isLocalOnly: true,
          };

          set({
            currentInvestigation: localInvestigation,
            isRecording: true,
            steps: [],
          });

          // Arka planda Supabase'e kaydetmeyi dene
          try {
            const res = await fetch('/api/investigation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                networkId,
                authorName: 'Anonim Araştırmacı',
                fingerprint,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const inv = data.investigation;
              // Supabase ID ile güncelle
              set({
                currentInvestigation: {
                  id: inv.id,
                  networkId: inv.network_id,
                  authorName: inv.author_name,
                  authorFingerprint: inv.author_fingerprint,
                  status: inv.status,
                  forkCount: inv.fork_count || 0,
                  stepCount: inv.step_count || 0,
                  upvoteCount: inv.upvote_count || 0,
                  significanceScore: inv.significance_score || 0,
                  viewCount: inv.view_count || 0,
                  createdAt: inv.created_at,
                  isLocalOnly: false,
                },
              });
            }
          } catch (err) {
          }
        },

        // ---- Adım ekle (LOCAL-FIRST) ----
        addStep: async (stepData) => {
          const { currentInvestigation, steps } = get();
          if (!currentInvestigation) return;

          const newStep: InvestigationStep = {
            ...stepData,
            id: `step_${Date.now().toString(36)}`,
            createdAt: Date.now(),
          };

          // Hemen UI'a ekle
          const newSteps = [...steps, newStep];
          set({
            steps: newSteps,
            currentInvestigation: {
              ...currentInvestigation,
              stepCount: currentInvestigation.stepCount + 1,
            },
          });

          // Arka planda Supabase'e kaydetmeyi dene (local ID değilse)
          if (!currentInvestigation.isLocalOnly) {
            try {
              const res = await fetch('/api/investigation/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  investigationId: currentInvestigation.id,
                  stepOrder: newStep.stepOrder,
                  query: newStep.query,
                  response: newStep.response,
                  highlightNodeIds: newStep.highlightNodeIds,
                  highlightLinkIds: newStep.highlightLinkIds,
                  annotations: newStep.annotations,
                  nodeNames: newStep.nodeNames,
                  fingerprint: get().fingerprint,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                set(state => ({
                  steps: state.steps.map((s, i) =>
                    i === state.steps.length - 1 ? { ...s, id: data.step?.id || s.id } : s
                  ),
                }));
              }
            } catch (err) {
              // Sessizce devam et — local veri yeterli
            }
          }
        },

        // ---- Yayınla ----
        publishInvestigation: async (title: string, description: string) => {
          const { currentInvestigation, fingerprint } = get();
          if (!currentInvestigation || !fingerprint) return null;

          try {
            const res = await fetch('/api/investigation', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: currentInvestigation.id,
                title,
                description,
                status: 'published',
                fingerprint,
              }),
            });

            if (!res.ok) {
              // Local publish
              const published: Investigation = {
                ...currentInvestigation,
                title,
                description,
                status: 'published',
                publishedAt: new Date().toISOString(),
              };
              set({ currentInvestigation: published, isPublishModalOpen: false });
              return published;
            }

            const data = await res.json();
            const inv = data.investigation;

            const published: Investigation = {
              ...currentInvestigation,
              title: inv.title,
              description: inv.description,
              status: 'published',
              publishedAt: inv.published_at,
            };

            set({ currentInvestigation: published, isPublishModalOpen: false });
            return published;
          } catch (err) {
            // Fallback: local publish
            const published: Investigation = {
              ...currentInvestigation,
              title,
              description,
              status: 'published',
              publishedAt: new Date().toISOString(),
            };
            set({ currentInvestigation: published, isPublishModalOpen: false });
            return published;
          }
        },

        // ---- Fork / Devam Et ----
        forkInvestigation: async (investigationId: string) => {
          const { fingerprint } = get();
          if (!fingerprint) return null;

          try {
            const res = await fetch('/api/investigation/fork', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                investigationId,
                fingerprint,
                authorName: 'Anonim Araştırmacı',
              }),
            });

            if (!res.ok) return null;
            const data = await res.json();
            const inv = data.forked;

            const forked: Investigation = {
              id: inv.id,
              networkId: inv.network_id,
              authorName: inv.author_name,
              authorFingerprint: inv.author_fingerprint,
              title: inv.title,
              description: inv.description,
              status: inv.status,
              parentId: inv.parent_id,
              forkCount: inv.fork_count || 0,
              stepCount: inv.step_count || 0,
              upvoteCount: inv.upvote_count || 0,
              significanceScore: inv.significance_score || 0,
              viewCount: inv.view_count || 0,
              createdAt: inv.created_at,
            };

            set({ currentInvestigation: forked, isRecording: true, steps: [] });
            return { forked, lastStep: data.lastStep };
          } catch (err) {
            return null;
          }
        },

        openPublishModal: () => set({ isPublishModalOpen: true }),
        closePublishModal: () => set({ isPublishModalOpen: false }),

        resetInvestigation: () => set({
          currentInvestigation: null,
          isRecording: false,
          steps: [],
          isPublishModalOpen: false,
        }),
      }),
      {
        name: 'InvestigationStore',
        // SECURITY A8: Do NOT persist fingerprint — single source is auth.ts localStorage
        // Investigation data is ephemeral; fingerprint re-read from auth on init
        partialize: () => ({}),
      }
    ),
    { name: 'InvestigationStore' }
  )
);

// Selector hooks
export const useCurrentInvestigation = () => useInvestigationStore(s => s.currentInvestigation);
export const useInvestigationSteps = () => useInvestigationStore(s => s.steps);
export const useIsRecording = () => useInvestigationStore(s => s.isRecording);
export const useFingerprint = () => useInvestigationStore(s => s.fingerprint);
export const useIsPublishModalOpen = () => useInvestigationStore(s => s.isPublishModalOpen);

export default useInvestigationStore;
