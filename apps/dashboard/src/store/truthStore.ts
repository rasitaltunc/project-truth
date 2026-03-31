// ============================================
// PROJECT TRUTH: ZUSTAND STORE
// apps/dashboard/src/store/truthStore.ts
// ============================================
// Enhanced store for network data management
// Works alongside useStore.ts (for modal state)
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================
export interface NetworkNode {
  id: string;
  label: string;
  img: string | null;
  type: string;
  tier: number;
  risk: number;
  is_alive: boolean;
  role?: string;
  summary?: string;
  truthScore?: number;
  darknessScore?: number;
  verificationStatus?: string;
  sourceCount?: number;
  pos?: [number, number, number];
}

export interface NetworkLink {
  source: string;
  target: string;
  strength: number;
  type?: string;
  description?: string;
}

export interface NetworkStats {
  totalNodes: number;
  totalLinks: number;
  totalEvidence: number;
}

interface TruthState {
  // Data
  nodes: NetworkNode[];
  links: NetworkLink[];
  stats: NetworkStats | null;
  dataSource: 'mock' | 'supabase' | null;
  lastUpdated: string | null;

  // Loading
  isLoading: boolean;
  error: string | null;

  // Realtime
  isRealtimeConnected: boolean;

  // Actions
  setNodes: (nodes: NetworkNode[]) => void;
  setLinks: (links: NetworkLink[]) => void;
  setStats: (stats: NetworkStats) => void;
  setDataSource: (source: 'mock' | 'supabase') => void;
  setLastUpdated: (date: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRealtimeConnected: (connected: boolean) => void;

  // Node operations
  addNode: (node: NetworkNode) => void;
  updateNode: (id: string, data: Partial<NetworkNode>) => void;
  removeNode: (id: string) => void;

  // Link operations
  addLink: (link: NetworkLink) => void;
  removeLink: (source: string, target: string) => void;

  // Fetch
  fetchNetwork: () => Promise<void>;
}

// ============================================
// STORE
// ============================================
export const useTruthStore = create<TruthState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      links: [],
      stats: null,
      dataSource: null,
      lastUpdated: null,
      isLoading: false,
      error: null,
      isRealtimeConnected: false,

      // Setters
      setNodes: (nodes) => set({ nodes }),
      setLinks: (links) => set({ links }),
      setStats: (stats) => set({ stats }),
      setDataSource: (dataSource) => set({ dataSource }),
      setLastUpdated: (lastUpdated) => set({ lastUpdated }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setRealtimeConnected: (isRealtimeConnected) => set({ isRealtimeConnected }),

      // Node operations
      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
        })),

      updateNode: (id, data) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, ...data } : n
          ),
        })),

      removeNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          links: state.links.filter(
            (l) => l.source !== id && l.target !== id
          ),
        })),

      // Link operations
      addLink: (link) =>
        set((state) => ({
          links: [...state.links, link],
        })),

      removeLink: (source, target) =>
        set((state) => ({
          links: state.links.filter(
            (l) => !(l.source === source && l.target === target)
          ),
        })),

      // Fetch network data
      fetchNetwork: async () => {
        set({ isLoading: true, error: null });

        try {
          const res = await fetch('/api/truth');
          const data = await res.json();

          if (!data.success && !data.nodes) {
            throw new Error(data.error || 'Failed to fetch network');
          }

          set({
            nodes: data.nodes || [],
            links: data.links || [],
            stats: data.stats || null,
            dataSource: data.source || 'mock',
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            isLoading: false,
          });

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },
    }),
    { name: 'TruthStore' }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================
export const useNodes = () => useTruthStore((state) => state.nodes);
export const useLinks = () => useTruthStore((state) => state.links);
export const useNetworkStats = () => useTruthStore((state) => state.stats);
export const useIsLoading = () => useTruthStore((state) => state.isLoading);
export const useDataSource = () => useTruthStore((state) => state.dataSource);

// ============================================
// HELPER: Get node by ID
// ============================================
export const getNodeById = (id: string) =>
  useTruthStore.getState().nodes.find((n) => n.id === id);

// ============================================
// HELPER: Get connections for a node
// ============================================
export const getNodeConnections = (id: string) =>
  useTruthStore.getState().links.filter(
    (l) => l.source === id || l.target === id
  );

export default useTruthStore;
