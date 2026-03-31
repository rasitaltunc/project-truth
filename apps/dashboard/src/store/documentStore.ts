/**
 * Document Store (TARA Protocol - Sprint 16)
 * Manages document lifecycle: discovery, import, scanning, derived item approval
 * Uses Zustand for client-side state, API routes for server-side operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types for documents
export interface EntityRecord {
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'account';
  role?: string;
  confidence: number;
  context?: string;
  source_sentence?: string;  // Verbatim quote from document (3-pass consensus validated)
  source_page?: number | null;
  consensus?: string;        // '3/3' | '2/3'
  category?: string;         // subject | victim | witness | legal_professional | etc.
  importance?: string;       // critical | high | medium | low
  mention_count?: number;
}

export interface RelationshipRecord {
  sourceName: string;
  targetName: string;
  relationshipType: string;
  evidenceType:
    | 'court_record'
    | 'financial_record'
    | 'witness_testimony'
    | 'official_document'
    | 'leaked_document'
    | 'correspondence';
  description?: string;
  source_sentence?: string;  // Verbatim quote from document establishing this relationship
  source_page?: number | null;
  confidence: number;
}

export interface ScanResultData {
  entities: EntityRecord[];
  relationships: RelationshipRecord[];
  summary: string;
  keyDates: Array<{ date: string; description: string }>;
  confidence: number;
  fullText?: string; // Optional: cached document text
  rawContent?: string; // Sprint 17.1: Raw extracted content for researcher viewing
}

export interface DocumentRecord {
  id: string;
  network_id: string;
  title: string;
  description: string | null;
  document_type: string;
  source_type: string;
  external_id: string | null;
  external_url: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  language: string;
  country_tags: string[];
  date_filed: string | null;
  date_uploaded: string;
  uploaded_by: string | null;
  scan_status: string; // 'pending' | 'scanning' | 'scanned' | 'failed'
  scan_result: ScanResultData | null;
  scanned_by: string | null;
  scanned_at: string | null;
  review_count: number;
  quality_score: number;
  is_public: boolean;
  raw_content: string | null; // Full raw content (import-time, no size cap)
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExternalSearchResult {
  externalId: string;
  title: string;
  description?: string;
  date?: string;
  source: string;
  url?: string;
  documentType: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
}

export interface DerivedItem {
  id: string;
  document_id: string;
  item_type: 'entity' | 'relationship' | 'date' | 'claim';
  item_data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  approved_by?: string;
  rejected_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanQueueTask {
  id: string;
  document_id: string;
  network_id: string;
  status: 'open' | 'claimed' | 'completed' | 'failed';
  priority: number;
  assigned_to?: string;
  claimed_at?: string;
  deadline?: string;
  created_at: string;
  document_title?: string;
  document_type?: string;
}

interface DocumentFilters {
  documentType: string | null;
  sourceType: string | null;
  scanStatus: string | null;
  dateRange: [string, string] | null;
}

interface DocumentState {
  // Panel state
  isOpen: boolean;
  activeTab: 'documents' | 'explore' | 'scan';

  // Documents list
  documents: DocumentRecord[];
  totalCount: number;
  currentPage: number;
  isLoading: boolean;

  // External search
  searchResults: ExternalSearchResult[];
  searchQuery: string;
  activeProviders: string[];
  isSearching: boolean;

  // Scan
  scanQueue: ScanQueueTask[];
  activeScan: { documentId: string; progress: number } | null;
  lastScanResult: ScanResultData | null;

  // Derived items for current document
  derivedItems: DerivedItem[];

  // Filters
  filters: DocumentFilters;

  // Stats
  stats: { total: number; scanned: number; ready?: number; pending: number; entities?: number; relationships?: number; dates?: number; quarantine?: number; nodes?: number; links?: number } | null;

  // Document detail view
  viewingDocument: DocumentRecord | null;

  // Celebration (gamification)
  showScanCelebration: boolean;
  celebrationData: {
    title: string;
    entityCount: number;
    relationshipCount: number;
    reputationAwarded: number;
  } | null;

  // Actions
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: 'documents' | 'explore' | 'scan') => void;
  setViewingDocument: (doc: DocumentRecord | null) => void;
  fetchDocuments: (networkId: string, page?: number) => Promise<void>;
  searchExternal: (query: string, providers?: string[]) => Promise<void>;
  importDocument: (
    provider: string,
    externalId: string,
    networkId: string,
    fingerprint: string
  ) => Promise<DocumentRecord | null>;
  scanDocument: (documentId: string, fingerprint: string) => Promise<ScanResultData | null>;
  fetchDerivedItems: (documentId: string) => Promise<void>;
  approveDerivedItem: (itemId: string, fingerprint: string) => Promise<void>;
  rejectDerivedItem: (itemId: string) => Promise<void>;
  fetchScanQueue: (networkId: string) => Promise<void>;
  claimScanTask: (fingerprint: string) => Promise<string | null>;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  fetchStats: (networkId: string) => Promise<void>;
  dismissCelebration: () => void;
}

const initialFilters: DocumentFilters = {
  documentType: null,
  sourceType: null,
  scanStatus: null,
  dateRange: null,
};

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set) => ({
      isOpen: false,
      activeTab: 'documents',
      documents: [],
      totalCount: 0,
      currentPage: 1,
      isLoading: false,
      searchResults: [],
      searchQuery: '',
      activeProviders: [],
      isSearching: false,
      scanQueue: [],
      activeScan: null,
      lastScanResult: null,
      derivedItems: [],
      filters: initialFilters,
      stats: null,
      viewingDocument: null,
      showScanCelebration: false,
      celebrationData: null,

      setOpen: (open) => set({ isOpen: open }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setViewingDocument: (doc) => set({ viewingDocument: doc }),

      fetchDocuments: async (networkId, page = 1) => {
        set({ isLoading: true });
        try {
          const query = new URLSearchParams({
            network_id: networkId,
            page: page.toString(),
            limit: '20',
          });

          if (useDocumentStore.getState().filters.documentType) {
            query.append('document_type', useDocumentStore.getState().filters.documentType!);
          }
          if (useDocumentStore.getState().filters.sourceType) {
            query.append('source_type', useDocumentStore.getState().filters.sourceType!);
          }
          if (useDocumentStore.getState().filters.scanStatus) {
            query.append('scan_status', useDocumentStore.getState().filters.scanStatus!);
          }

          const res = await fetch(`/api/documents?${query.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({
            documents: data.documents,
            totalCount: data.totalCount,
            currentPage: page,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to fetch documents:', error);
          set({ isLoading: false });
        }
      },

      searchExternal: async (query, providers = []) => {
        set({ isSearching: true, searchQuery: query, activeProviders: providers });
        try {
          const params = new URLSearchParams({ q: query, limit: '20' });
          if (providers.length > 0) {
            params.append('providers', providers.join(','));
          }

          const res = await fetch(`/api/documents/search?${params.toString()}`);
          const data = await res.json();

          // Handle both success and partial-failure responses
          const results = data.results || [];
          set({ searchResults: results, isSearching: false });
        } catch (error) {
          console.error('Failed to search external sources:', error);
          set({ searchResults: [], isSearching: false });
        }
      },

      // DEPRECATED: Import from external APIs disabled (KEŞFET Redesign)
      // External APIs return all name matches without relevance filtering.
      // Use manual document upload → OCR → AI scan → quarantine instead.
      importDocument: async (_provider, _externalId, _networkId, _fingerprint) => {
        console.warn('[documentStore] importDocument() is DEPRECATED. Use manual upload instead.');
        return null;
      },

      scanDocument: async (documentId, fingerprint) => {
        set((state) => ({
          activeScan: { documentId, progress: 0 },
        }));

        try {
          const res = await fetch('/api/documents/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId, fingerprint }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const scanResult = await res.json();
          const docTitle = useDocumentStore.getState().documents.find(d => d.id === documentId)?.title || 'Document';
          const entityCount = scanResult.entities?.length || 0;
          const relCount = scanResult.relationships?.length || 0;
          const bonus = Math.min(10, Math.floor(entityCount / 3) + Math.floor(relCount / 3) * 2);
          const totalReputation = 5 + bonus;

          set((state) => ({
            documents: state.documents.map((doc) =>
              doc.id === documentId
                ? {
                    ...doc,
                    scan_status: 'scanned',
                    scan_result: scanResult,
                    scanned_at: new Date().toISOString(),
                    quality_score: Math.round((scanResult.confidence || 0) * 100),
                  }
                : doc
            ),
            lastScanResult: scanResult,
            activeScan: null,
            showScanCelebration: true,
            celebrationData: {
              title: docTitle,
              entityCount,
              relationshipCount: relCount,
              reputationAwarded: totalReputation,
            },
          }));

          // Also update the viewingDocument if it's the same doc
          const viewing = useDocumentStore.getState().viewingDocument;
          if (viewing && viewing.id === documentId) {
            set({
              viewingDocument: {
                ...viewing,
                scan_status: 'scanned',
                scan_result: scanResult,
                scanned_at: new Date().toISOString(),
                quality_score: Math.round((scanResult.confidence || 0) * 100),
              },
            });
          }

          // Refresh stats after scan
          const networkId = useDocumentStore.getState().documents.find(d => d.id === documentId)?.network_id;
          if (networkId) {
            useDocumentStore.getState().fetchStats(networkId);
          }

          return scanResult;
        } catch (error) {
          console.error('Failed to scan document:', error);
          set({ activeScan: null });
          return null;
        }
      },

      fetchDerivedItems: async (documentId) => {
        try {
          const res = await fetch(`/api/documents/${documentId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({ derivedItems: data.derivedItems || [] });
        } catch (error) {
          console.error('Failed to fetch derived items:', error);
        }
      },

      approveDerivedItem: async (itemId, fingerprint) => {
        try {
          const res = await fetch(`/api/documents/derived-items/${itemId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const result = await res.json();
          set((state) => ({
            derivedItems: state.derivedItems.map((item) =>
              item.id === itemId
                ? { ...item, status: 'approved' as const }
                : item
            ),
          }));

          // Return the result so UI can highlight new node/link
          return result;
        } catch (error) {
          console.error('Failed to approve derived item:', error);
        }
      },

      rejectDerivedItem: async (itemId) => {
        try {
          const res = await fetch(`/api/documents/derived-items/${itemId}/reject`, {
            method: 'POST',
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          set((state) => ({
            derivedItems: state.derivedItems.map((item) =>
              item.id === itemId ? { ...item, status: 'rejected' } : item
            ),
          }));
        } catch (error) {
          console.error('Failed to reject derived item:', error);
        }
      },

      fetchScanQueue: async (networkId) => {
        try {
          const res = await fetch(`/api/documents/scan/queue?network_id=${networkId}&limit=50`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({ scanQueue: data.queue || [] });
        } catch (error) {
          console.error('Failed to fetch scan queue:', error);
        }
      },

      claimScanTask: async (fingerprint) => {
        try {
          const res = await fetch('/api/documents/scan/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const task = await res.json();
          if (task?.id) {
            set((state) => ({
              scanQueue: state.scanQueue.map((t) =>
                t.id === task.id ? { ...t, status: 'claimed', assigned_to: fingerprint } : t
              ),
            }));
            return task.id;
          }
          return null;
        } catch (error) {
          console.error('Failed to claim scan task:', error);
          return null;
        }
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          currentPage: 1,
        }));
      },

      dismissCelebration: () => set({ showScanCelebration: false, celebrationData: null }),

      fetchStats: async (networkId) => {
        try {
          const res = await fetch(`/api/documents/stats?network_id=${networkId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          set({ stats: data });
        } catch (error) {
          console.error('Failed to fetch document stats:', error);
        }
      },
    }),
    { name: 'DocumentStore' }
  )
);
