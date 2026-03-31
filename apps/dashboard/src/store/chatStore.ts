// ============================================
// PROJECT TRUTH: CHAT STORE
// AI-guided network exploration state
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useInvestigationStore } from './investigationStore';
import { classifyIntent } from '@/lib/intentClassifier';
import { useViewModeStore } from '@/store/viewModeStore';

// ============================================
// TYPES
// ============================================
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // AI response metadata
  highlightNodeIds?: string[];
  highlightLinkIds?: string[];
  focusNodeId?: string | null;
  followUp?: string;
  sources?: Array<{
    nodeId: string;
    nodeName?: string;
    field?: string;
    evidenceId?: string;
  }>;
  // Node name map for rendering clickable references
  nodeNames?: Record<string, string>;
  // Annotation labels for highlighted nodes (e.g. "DECEASED", "CONVICTED")
  annotations?: Record<string, string>;
}

interface ChatState {
  // Chat
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isChatOpen: boolean;

  // Highlights (driven by AI responses)
  highlightedNodeIds: string[];
  highlightedLinkIds: string[];
  focusNodeId: string | null;
  annotations: Record<string, string>;

  // Sprint 5: İlk Keşfeden
  firstDiscovery: { nodeId: string; nodeName: string } | null;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (question: string, nodes: any[], links: any[]) => Promise<void>;
  clearHighlights: () => void;
  setHighlights: (nodeIds: string[], linkIds: string[], focusId: string | null) => void;
  clearChat: () => void;
  clearFirstDiscovery: () => void;
}

// ============================================
// STORE
// ============================================
export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      error: null,
      isChatOpen: false,
      highlightedNodeIds: [],
      highlightedLinkIds: [],
      focusNodeId: null,
      annotations: {},
      firstDiscovery: null,

      // Toggle
      toggleChat: () => set(state => ({ isChatOpen: !state.isChatOpen })),
      openChat: () => set({ isChatOpen: true }),
      closeChat: () => set({ isChatOpen: false }),

      // Clear
      clearHighlights: () => set({
        highlightedNodeIds: [],
        highlightedLinkIds: [],
        focusNodeId: null,
        annotations: {},
      }),

      setHighlights: (nodeIds, linkIds, focusId) => set({
        highlightedNodeIds: nodeIds,
        highlightedLinkIds: linkIds,
        focusNodeId: focusId,
      }),

      clearChat: () => set({
        messages: [],
        highlightedNodeIds: [],
        highlightedLinkIds: [],
        focusNodeId: null,
        error: null,
      }),

      clearFirstDiscovery: () => set({ firstDiscovery: null }),

      // Send message to AI
      sendMessage: async (question: string, nodes: any[], links: any[]) => {
        const { messages, highlightedNodeIds: prevHighlightIds } = get();

        // Add user message
        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: question,
          timestamp: Date.now(),
        };

        set({
          messages: [...messages, userMsg],
          isLoading: true,
          error: null,
        });

        try {
          // Prepare conversation history (last 10 messages)
          const history = [...messages, userMsg]
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content }));

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question,
              conversationHistory: history,
              nodes,
              links,
              previousHighlightNodeIds: prevHighlightIds,
            }),
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }

          const data = await res.json();

          // Build node name map from response
          const nodeNames: Record<string, string> = {};
          if (data.highlightNodeIds) {
            data.highlightNodeIds.forEach((id: string) => {
              const node = nodes.find((n: any) => n.id === id);
              if (node) nodeNames[id] = node.label || node.name || id;
            });
          }

          // Add AI response message
          const aiMsg: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: 'assistant',
            content: data.narrative || 'Yanıt alınamadı.',
            timestamp: Date.now(),
            highlightNodeIds: data.highlightNodeIds || [],
            highlightLinkIds: data.highlightLinkIds || [],
            focusNodeId: data.focusNodeId || null,
            annotations: data.annotations || {},
            followUp: data.followUp,
            sources: data.sources,
            nodeNames,
          };

          set(state => ({
            messages: [...state.messages, aiMsg],
            isLoading: false,
            highlightedNodeIds: data.highlightNodeIds || [],
            highlightedLinkIds: data.highlightLinkIds || [],
            focusNodeId: data.focusNodeId || null,
            annotations: data.annotations || {},
          }));

          // ---- SPRINT 7: AKILLI LENS — Intent Classification ----
          // Fire-and-forget: kullanıcı sorusuna göre lens öner
          classifyIntent(question).then(result => {
            if (result && result.suggestMode) {
              useViewModeStore.getState().setAiSuggestion({
                mode: result.intent,
                confidence: result.confidence,
                reason: result.reason,
                dismissed: false,
              });
            }
          }).catch(() => {}); // sessizce devam — lens önerisi kritik değil

          // ---- INVESTIGATION OTOMATIK KAYIT ----
          // Her AI yanıtını bir investigation step olarak kaydet
          try {
            const invState = useInvestigationStore.getState();

            // İlk mesajda veya yayınlanmış investigation varsa: yeni başlat
            if (!invState.currentInvestigation || invState.currentInvestigation.status === 'published') {
              if (invState.currentInvestigation?.status === 'published') {
                invState.resetInvestigation();
              }
              await invState.startInvestigation();
            }

            // State'i yeniden oku (startInvestigation set() yaptı)
            const freshState = useInvestigationStore.getState();
            if (!freshState.currentInvestigation) {
              console.error('🔴 Investigation başlatılamadı — API hatası olabilir');
            } else {
              const stepOrder = (freshState.currentInvestigation.stepCount ?? freshState.steps.length) + 1;
              await freshState.addStep({
                stepOrder,
                query: question,
                response: data.narrative || '',
                highlightNodeIds: data.highlightNodeIds || [],
                highlightLinkIds: data.highlightLinkIds || [],
                annotations: data.annotations || {},
                nodeNames: Object.values(nodeNames),
              });
            }
          } catch (invErr) {
          }

          // ---- SPRINT 5: NODE QUERY STATS ----
          // Her AI yanıtında highlight edilen node'ları istatistik olarak kaydet
          const highlightIds = data.highlightNodeIds ?? [];
          if (highlightIds.length > 0) {
            try {
              const fingerprint = useInvestigationStore.getState().fingerprint;
              const statsRes = await fetch('/api/node-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeIds: highlightIds,
                  annotations: data.annotations || {},
                  fingerprint: fingerprint ?? '',
                }),
              });
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                // İlk Keşfeden: 0 → 1 geçişi tespit edildi
                if (statsData.firstDiscoveries?.length > 0) {
                  const disc = statsData.firstDiscoveries[0];
                  set({ firstDiscovery: { nodeId: disc.nodeId, nodeName: disc.nodeName } });
                }
              }
            } catch {
              // Sessizce devam — local-first felsefesi
            }
          }

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
          });
        }
      },
    }),
    { name: 'ChatStore' }
  )
);

// Selector hooks
export const useChatMessages = () => useChatStore(s => s.messages);
export const useIsChatLoading = () => useChatStore(s => s.isLoading);
export const useIsChatOpen = () => useChatStore(s => s.isChatOpen);
export const useHighlightedNodeIds = () => useChatStore(s => s.highlightedNodeIds);
export const useHighlightedLinkIds = () => useChatStore(s => s.highlightedLinkIds);
export const useFocusNodeId = () => useChatStore(s => s.focusNodeId);
export const useAnnotations = () => useChatStore(s => s.annotations);
export const useFirstDiscovery = () => useChatStore(s => s.firstDiscovery);
export const useClearFirstDiscovery = () => useChatStore(s => s.clearFirstDiscovery);

export default useChatStore;
