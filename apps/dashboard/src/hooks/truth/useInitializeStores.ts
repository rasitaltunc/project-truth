'use client';

import { useEffect, useMemo } from 'react';
import { useInvestigationStore } from '@/store/investigationStore';
import { useBadgeStore } from '@/store/badgeStore';
import { useNodeStatsStore } from '@/store/nodeStatsStore';
import { useCinematicStore } from '@/store/cinematicStore';
import { useThreadingStore } from '@/store/threadingStore';
import { useGuidedTourStore } from '@/store/guidedTourStore';
import { useFirstDiscovery, useClearFirstDiscovery } from '@/store/chatStore';

/**
 * Store initialization state interface
 */
export interface StoreInitializationState {
  cinematicIsActive: boolean;
  cinematicPhase: string;
  hasSeenOpening: boolean;
  cinematicNodeReveal: number;
  cinematicLinkReveal: boolean;
  statsLoaded: boolean;
  nodeHeatMap: Map<string, number> | undefined;
  consensusAnnotations: Map<string, string> | undefined;
  firstDiscovery: any;
  clearFirstDiscovery: () => void;
}

/**
 * Hook to initialize all stores and manage store-related effects
 * Extracted from truth/page.tsx lines 141, 168-211, 214-225
 */
export function useInitializeStores(
  loading: boolean,
  nodesLength: number
): StoreInitializationState {
  // 🔍 INVESTIGATION — fingerprint başlat
  const { initFingerprint } = useInvestigationStore();
  useEffect(() => {
    initFingerprint();
  }, [initFingerprint]);

  // 🏷️ SPRINT 6A: BADGE STORE — init fingerprint + fetch badge
  const { initFingerprint: initBadgeFp, fetchUserBadge } = useBadgeStore();
  useEffect(() => {
    const fp = initBadgeFp();
    fetchUserBadge(fp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 SPRINT 5: Kolektif Zeka — Heat Map
  const { fetchStats, buildHeatMap, buildConsensusMap, isLoaded: statsLoaded } = useNodeStatsStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Sprint 10: Sinematik açılış init
  const { initCinematic, startCinematic, isActive: cinematicIsActive, phase: cinematicPhase, nodeRevealCount: cinematicNodeReveal, linkReveal: cinematicLinkReveal, hasSeenOpening } = useCinematicStore();

  useEffect(() => {
    initCinematic();
  }, [initCinematic]);

  useEffect(() => {
    if (!loading && nodesLength > 0 && cinematicPhase === 'idle' && !hasSeenOpening) {
      startCinematic(nodesLength);
    }
  }, [loading, nodesLength, cinematicPhase, hasSeenOpening, startCinematic]);

  // Sinematik bitince → guided tour başlat (1.5s delay for smooth transition)
  const { startTour } = useGuidedTourStore();

  useEffect(() => {
    if (cinematicPhase === 'complete' && !cinematicIsActive) {
      const timer = setTimeout(() => startTour(), 1500);
      return () => clearTimeout(timer);
    }
  }, [cinematicPhase, cinematicIsActive, startTour]);

  // Sprint 10: ghost links fetch
  const { fetchGhostLinks } = useThreadingStore();

  useEffect(() => {
    if (!loading) {
      fetchGhostLinks().catch(() => {});
    }
  }, [loading, fetchGhostLinks]);

  // Heat map: nodeId → 0.0-1.0 (memoized — sadece stats değişince rebuild)
  const nodeHeatMap = useMemo(() => {
    if (!statsLoaded) return undefined;
    return buildHeatMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsLoaded, buildHeatMap]);

  // Consensus annotations: nodeId → label (10+ aynı label → kalıcı)
  const consensusAnnotations = useMemo(() => {
    if (!statsLoaded) return undefined;
    return buildConsensusMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsLoaded, buildConsensusMap]);

  // First discovery banner state (from chatStore hooks)
  const firstDiscovery = useFirstDiscovery();
  const clearFirstDiscovery = useClearFirstDiscovery();

  return {
    cinematicIsActive,
    cinematicPhase,
    hasSeenOpening,
    cinematicNodeReveal,
    cinematicLinkReveal,
    statsLoaded,
    nodeHeatMap,
    consensusAnnotations,
    firstDiscovery,
    clearFirstDiscovery,
  };
}
