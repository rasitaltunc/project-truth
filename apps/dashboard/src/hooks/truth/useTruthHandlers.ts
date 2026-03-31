'use client';

import { useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { useStore } from '@/store/useStore';
import { useChatStore } from '@/store/chatStore';
import { useViewModeStore } from '@/store/viewModeStore';
import { useBoardStore } from '@/store/boardStore';
import { useThreadingStore } from '@/store/threadingStore';
import { useLinkEvidenceStore } from '@/store/linkEvidenceStore';

/**
 * Handler callbacks interface
 */
export interface TruthHandlers {
  handleNodeClick: (node: any) => void;
  handleLinkClick: (linkData: {
    sourceId: string;
    targetId: string;
    sourceLabel: string;
    targetLabel: string;
    label?: string;
    type?: string;
  }) => void;
  closeLinkDetail: () => void;
  handleReset: () => void;
  handleEnterBoard: () => void;
  handleExitBoard: () => void;
}

/**
 * Dependencies for truth handlers
 */
export interface TruthHandlerDependencies {
  nodes: any[];
  setSelectedNode: Dispatch<SetStateAction<any>>;
  setSelectedConnection: Dispatch<SetStateAction<any>>;
  setActiveLinkDetail: Dispatch<SetStateAction<any>>;
  endCinematicRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * Hook to manage all handler callbacks for truth page
 * Extracted from truth/page.tsx lines 264-287, 348-357, 358-365, 369-382, 303-307, 308-312
 */
export function useTruthHandlers(
  dependencies: TruthHandlerDependencies
): TruthHandlers {
  const { openArchive, closeArchive } = useStore();
  const { clearHighlights } = useChatStore();
  const { dismissAiSuggestion, setMode: setViewModeFn } = useViewModeStore();
  const { exitBoardMode, enterBoardMode } = useBoardStore();
  const { selectTarget } = useThreadingStore();
  const { fetchLinkEvidence } = useLinkEvidenceStore();

  const handleNodeClick = useCallback((node: any) => {
    // Sprint 10: İP UZAT threading mode — hedef seçimi
    if (useThreadingStore.getState().isThreadingActive) {
      const sourceId = useThreadingStore.getState().sourceNodeId;
      if (sourceId && node.id !== sourceId) {
        selectTarget(node.id);
      }
      return; // Threading modda archive açma
    }

    dependencies.setSelectedNode(node);

    // Evidence, timeline ve connections artık API'den node ile birlikte geliyor
    // Ekstra fetch'e gerek yok — doğrudan aç
    setTimeout(() => {
      openArchive({
        ...node,
        evidence: node.evidence || [],
        timeline: node.timeline || [],
        connections: node.connections || [],
      });
    }, 300);
  }, [openArchive, selectTarget]);

  const handleLinkClick = useCallback((linkData: {
    sourceId: string;
    targetId: string;
    sourceLabel: string;
    targetLabel: string;
    label?: string;
    type?: string;
  }) => {
    dependencies.setActiveLinkDetail(linkData);
    // Sprint 6C: Evidence timeline'ı fetch et (fire-and-forget)
    fetchLinkEvidence(linkData.sourceId, linkData.targetId);
  }, [fetchLinkEvidence, dependencies]);

  const closeLinkDetail = useCallback(() => {
    dependencies.setActiveLinkDetail(null);
    // Tell 3D scene to restore camera from cinematic mode
    if (dependencies.endCinematicRef.current) {
      dependencies.endCinematicRef.current();
    }
  }, [dependencies]);

  const handleReset = useCallback(() => {
    dependencies.setSelectedNode(null);
    dependencies.setSelectedConnection(null);
    closeArchive();
    clearHighlights();
    // Board modundaysa çık
    if (useBoardStore.getState().isBoardMode) {
      exitBoardMode();
    }
    // Lens → full_network'e dön
    setViewModeFn('full_network');
    dismissAiSuggestion();
  }, [closeArchive, clearHighlights, setViewModeFn, dismissAiSuggestion, exitBoardMode, dependencies]);

  const handleEnterBoard = useCallback(() => {
    enterBoardMode();
    setViewModeFn('board');
  }, [enterBoardMode, setViewModeFn]);

  const handleExitBoard = useCallback(() => {
    exitBoardMode();
    setViewModeFn('full_network');
  }, [exitBoardMode, setViewModeFn]);

  return {
    handleNodeClick,
    handleLinkClick,
    closeLinkDetail,
    handleReset,
    handleEnterBoard,
    handleExitBoard,
  };
}
