/**
 * Quarantine Store (Sprint 17 — Zero Hallucination Data Integrity)
 * Manages the quarantine review pipeline
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface QuarantineItem {
  id: string;
  document_id: string;
  network_id: string;
  item_type: 'entity' | 'relationship' | 'date' | 'claim';
  item_data: Record<string, unknown>;
  confidence: number;
  verification_status: 'quarantined' | 'pending_review' | 'verified' | 'rejected' | 'disputed';
  verification_method: string | null;
  source_type: 'structured_api' | 'html_parse' | 'ai_extraction' | 'manual_entry';
  source_provider: string | null;
  source_url: string | null;
  source_hash: string | null;
  reviewed_by: string[];
  review_count: number;
  required_reviews: number;
  provenance_chain: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

interface QuarantineStats {
  quarantined: number;
  pending_review: number;
  verified: number;
  rejected: number;
  disputed: number;
  total: number;
}

interface QuarantineState {
  // Data
  items: QuarantineItem[];
  totalCount: number;
  currentPage: number;
  isLoading: boolean;
  stats: QuarantineStats | null;

  // Filters
  statusFilter: string | null;
  typeFilter: string | null;
  documentFilter: string | null;

  // Actions
  fetchItems: (networkId: string, page?: number) => Promise<void>;
  fetchItemsForDocument: (documentId: string, networkId: string) => Promise<void>;
  reviewItem: (
    itemId: string,
    fingerprint: string,
    decision: 'approve' | 'reject' | 'dispute' | 'flag',
    reason?: string
  ) => Promise<{ status: string; reviewCount: number } | null>;
  promoteItem: (itemId: string, fingerprint: string) => Promise<boolean>;
  setStatusFilter: (status: string | null) => void;
  setTypeFilter: (type: string | null) => void;
  setDocumentFilter: (documentId: string | null) => void;
}

export const useQuarantineStore = create<QuarantineState>()(
  devtools(
    (set, get) => ({
      items: [],
      totalCount: 0,
      currentPage: 1,
      isLoading: false,
      stats: null,
      statusFilter: null,
      typeFilter: null,
      documentFilter: null,

      fetchItems: async (networkId, page = 1) => {
        set({ isLoading: true });
        try {
          const params = new URLSearchParams({
            network_id: networkId,
            page: page.toString(),
            limit: '50',
          });

          const { statusFilter, typeFilter, documentFilter } = get();
          if (statusFilter) params.append('status', statusFilter);
          if (typeFilter) params.append('item_type', typeFilter);
          if (documentFilter) params.append('document_id', documentFilter);

          const res = await fetch(`/api/quarantine?${params.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({
            items: data.items || [],
            totalCount: data.totalCount || 0,
            currentPage: page,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to fetch quarantine items:', error);
          set({ isLoading: false });
        }
      },

      fetchItemsForDocument: async (documentId, networkId) => {
        set({ isLoading: true });
        try {
          const params = new URLSearchParams({
            network_id: networkId,
            document_id: documentId,
            limit: '100',
          });

          const res = await fetch(`/api/quarantine?${params.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({
            items: data.items || [],
            totalCount: data.totalCount || 0,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to fetch quarantine items for document:', error);
          set({ isLoading: false });
        }
      },

      reviewItem: async (itemId, fingerprint, decision, reason) => {
        try {
          const res = await fetch(`/api/quarantine/${itemId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint, decision, reason }),
          });

          if (!res.ok) {
            const err = await res.json();
            console.error('Review failed:', err.error);
            return null;
          }

          const result = await res.json();

          // Update local state
          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    verification_status: result.status,
                    review_count: result.reviewCount,
                    reviewed_by: [...item.reviewed_by, fingerprint],
                  }
                : item
            ),
          }));

          return result;
        } catch (error) {
          console.error('Failed to review quarantine item:', error);
          return null;
        }
      },

      promoteItem: async (itemId, fingerprint) => {
        try {
          const res = await fetch(`/api/quarantine/${itemId}/promote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
          });

          if (!res.ok) {
            const err = await res.json();
            console.error('Promote failed:', err.error);
            return false;
          }

          // Remove from quarantine list (it's now in the network)
          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
            totalCount: state.totalCount - 1,
          }));

          return true;
        } catch (error) {
          console.error('Failed to promote quarantine item:', error);
          return false;
        }
      },

      setStatusFilter: (status) => set({ statusFilter: status }),
      setTypeFilter: (type) => set({ typeFilter: type }),
      setDocumentFilter: (documentId) => set({ documentFilter: documentId }),
    }),
    { name: 'QuarantineStore' }
  )
);
