// ============================================
// SPRINT 5: NODE STATS STORE
// Query-Weight Intelligence Layer
// Heat map, consensus annotations, gap tracking
// ============================================

import { create } from 'zustand';

export interface NodeStat {
  nodeId: string;
  highlightCount: number;
  annotationCounts: Record<string, number>; // {"DECEASED": 5, "CONVICTED": 2}
  uniqueInvestigators: number;
  lastQueriedAt: string;
}

interface GapNode {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  tier: string;
  connectionCount: number;
}

interface NodeStatsState {
  stats: Map<string, NodeStat>;
  gapNodes: GapNode[];
  aiSuggestions: string[];
  maxHighlightCount: number;
  isLoaded: boolean;
  isLoadingGaps: boolean;

  // Daily question
  dailyQuestion: {
    question: string;
    targetNodeId: string | null;
    targetNodeName: string | null;
    expiresAt: string;
    answeredCount: number;
  } | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchGapNodes: (networkId?: string) => Promise<void>;
  fetchDailyQuestion: (networkId?: string) => Promise<void>;
  incrementDailyAnswered: (networkId?: string) => void;

  // Computed
  getNodeHeat: (nodeId: string) => number;         // 0.0 - 1.0 normalize
  getConsensusAnnotation: (nodeId: string) => string | null; // 10+ aynı label → kalıcı
  updateLocalStat: (nodeId: string, annotation?: string) => void;
  buildHeatMap: () => Map<string, number>;
  buildConsensusMap: () => Map<string, string>;
}

export const useNodeStatsStore = create<NodeStatsState>()((set, get) => ({
  stats: new Map(),
  gapNodes: [],
  aiSuggestions: [],
  maxHighlightCount: 1,
  isLoaded: false,
  isLoadingGaps: false,
  dailyQuestion: null,

  // ─── FETCH ALL STATS (Heat Map için) ───────────────────────────────────────
  fetchStats: async () => {
    try {
      const res = await fetch('/api/node-stats');
      if (!res.ok) return;
      const data = await res.json();
      const rawStats: any[] = data.stats ?? [];

      const map = new Map<string, NodeStat>();
      let maxCount = 1;

      rawStats.forEach((s: any) => {
        const stat: NodeStat = {
          nodeId: s.node_id,
          highlightCount: s.highlight_count ?? 0,
          annotationCounts: s.annotation_counts ?? {},
          uniqueInvestigators: s.unique_investigators ?? 0,
          lastQueriedAt: s.last_queried_at ?? '',
        };
        map.set(s.node_id, stat);
        if (stat.highlightCount > maxCount) maxCount = stat.highlightCount;
      });

      set({ stats: map, maxHighlightCount: maxCount, isLoaded: true });
    } catch {
      // Sessizce devam — local-first
    }
  },

  // ─── FETCH GAP NODES ───────────────────────────────────────────────────────
  fetchGapNodes: async (networkId?: string) => {
    set({ isLoadingGaps: true });
    try {
      const url = `/api/node-stats/gaps${networkId ? `?networkId=${networkId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      set({
        gapNodes: data.gaps ?? [],
        aiSuggestions: data.aiSuggestions ?? [],
        isLoadingGaps: false,
      });
    } catch {
      set({ isLoadingGaps: false });
    }
  },

  // ─── FETCH DAILY QUESTION ──────────────────────────────────────────────────
  fetchDailyQuestion: async (networkId?: string) => {
    try {
      const url = `/api/daily-question${networkId ? `?networkId=${networkId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      set({ dailyQuestion: data });
    } catch {
      // Non-blocking
    }
  },

  // ─── INCREMENT DAILY ANSWERED ──────────────────────────────────────────────
  incrementDailyAnswered: (networkId?: string) => {
    set(state => ({
      dailyQuestion: state.dailyQuestion
        ? { ...state.dailyQuestion, answeredCount: state.dailyQuestion.answeredCount + 1 }
        : null,
    }));
    // Background sync
    fetch(`/api/daily-question${networkId ? `?networkId=${networkId}` : ''}`, { method: 'POST' })
      .catch(() => {});
  },

  // ─── GET NODE HEAT (normalize 0.0–1.0) ────────────────────────────────────
  getNodeHeat: (nodeId: string) => {
    const { stats, maxHighlightCount } = get();
    const stat = stats.get(nodeId);
    if (!stat || maxHighlightCount === 0) return 0;
    return Math.min(stat.highlightCount / maxHighlightCount, 1.0);
  },

  // ─── GET CONSENSUS ANNOTATION (10+ aynı label → kalıcı badge) ─────────────
  getConsensusAnnotation: (nodeId: string) => {
    const { stats } = get();
    const stat = stats.get(nodeId);
    if (!stat) return null;

    const counts = stat.annotationCounts;
    let maxKey: string | null = null;
    let maxCount = 0;

    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }

    // 10+ kişi aynı etiketi verdiyse → consensus
    if (maxKey && maxCount >= 10) return maxKey;
    return null;
  },

  // ─── UPDATE LOCAL STAT (optimistic update) ────────────────────────────────
  updateLocalStat: (nodeId: string, annotation?: string) => {
    set(state => {
      const map = new Map(state.stats);
      const existing = map.get(nodeId) ?? {
        nodeId,
        highlightCount: 0,
        annotationCounts: {},
        uniqueInvestigators: 0,
        lastQueriedAt: new Date().toISOString(),
      };

      const newAnnotationCounts = { ...existing.annotationCounts };
      if (annotation) {
        newAnnotationCounts[annotation] = (newAnnotationCounts[annotation] ?? 0) + 1;
      }

      const updated: NodeStat = {
        ...existing,
        highlightCount: existing.highlightCount + 1,
        annotationCounts: newAnnotationCounts,
        lastQueriedAt: new Date().toISOString(),
      };
      map.set(nodeId, updated);

      const maxCount = Math.max(state.maxHighlightCount, updated.highlightCount);
      return { stats: map, maxHighlightCount: maxCount };
    });
  },

  // ─── BUILD HEAT MAP (nodeId → 0.0-1.0) ────────────────────────────────────
  buildHeatMap: () => {
    const { stats, maxHighlightCount } = get();
    const map = new Map<string, number>();
    stats.forEach((stat, nodeId) => {
      map.set(nodeId, Math.min(stat.highlightCount / Math.max(maxHighlightCount, 1), 1.0));
    });
    return map;
  },

  // ─── BUILD CONSENSUS MAP (nodeId → annotation label) ─────────────────────
  buildConsensusMap: () => {
    const { stats } = get();
    const map = new Map<string, string>();
    stats.forEach((stat, nodeId) => {
      const counts = stat.annotationCounts;
      let maxKey: string | null = null;
      let maxCount = 0;
      for (const [key, count] of Object.entries(counts)) {
        if (count > maxCount) { maxCount = count; maxKey = key; }
      }
      if (maxKey && maxCount >= 10) map.set(nodeId, maxKey);
    });
    return map;
  },
}));
