// ═══════════════════════════════════════════
// THREADING STORE — Sprint 10
// İP UZAT modu state + API calls
// Hayalet link cache + oylama + kanıt
// ═══════════════════════════════════════════

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ── Types ──
export interface ProposedLink {
  id: string;
  networkId?: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  description: string;
  proposerFingerprint: string;
  proposerBadgeTier: string;
  status: 'pending_evidence' | 'pending_vote' | 'accepted' | 'rejected' | 'expired';
  evidenceCount: number;
  evidenceThreshold: number;
  communityUpvotes: number;
  communityDownvotes: number;
  totalVotes: number;
  reputationStaked: number;
  initialEvidenceUrl?: string;
  initialEvidenceDescription?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ProposedEvidence {
  id: string;
  proposedLinkId: string;
  contributorFingerprint: string;
  evidenceType: string;
  confidenceLevel: number;
  sourceUrl?: string;
  description: string;
  reputationStaked: number;
  createdAt: string;
}

export interface ProposedVote {
  id: string;
  proposedLinkId: string;
  voterFingerprint: string;
  voteDirection: 'up' | 'down';
  voteWeight: number;
  createdAt: string;
}

export const RELATIONSHIP_TYPES = [
  { value: 'financial', label: 'FİNANSAL', labelTr: 'Finansal Bağlantı' },
  { value: 'familial', label: 'AİLE', labelTr: 'Aile Bağı' },
  { value: 'organizational', label: 'ÖRGÜTSEL', labelTr: 'Örgütsel İlişki' },
  { value: 'criminal', label: 'SUÇ', labelTr: 'Suç Ortaklığı' },
  { value: 'business', label: 'İŞ', labelTr: 'İş Ortaklığı' },
  { value: 'political', label: 'SİYASİ', labelTr: 'Siyasi İlişki' },
  { value: 'social', label: 'SOSYAL', labelTr: 'Sosyal Bağlantı' },
  { value: 'intelligence', label: 'İSTİHBARAT', labelTr: 'İstihbarat Bağı' },
  { value: 'legal', label: 'HUKUK', labelTr: 'Hukuki İlişki' },
  { value: 'unknown', label: 'BİLİNMEYEN', labelTr: 'Bilinmeyen İlişki' },
] as const;

export const EVIDENCE_TYPES = [
  { value: 'document', label: 'Belge' },
  { value: 'court_record', label: 'Mahkeme Kaydı' },
  { value: 'news_article', label: 'Haber Makalesi' },
  { value: 'witness', label: 'Tanık İfadesi' },
  { value: 'financial_record', label: 'Mali Kayıt' },
  { value: 'photo', label: 'Fotoğraf' },
  { value: 'video', label: 'Video' },
] as const;

interface ThreadingState {
  // ── Threading Mode ──
  isThreadingActive: boolean;
  sourceNodeId: string | null;
  sourceNodeLabel: string | null;
  targetNodeId: string | null;

  // ── Ghost Links ──
  ghostLinks: ProposedLink[];
  ghostLinksLoading: boolean;
  selectedGhostLink: ProposedLink | null;
  selectedGhostEvidence: ProposedEvidence[];
  selectedGhostVotes: ProposedVote[];

  // ── UI State ──
  showProposalForm: boolean;
  showDetailPanel: boolean;
  proposalSubmitting: boolean;
  error: string | null;

  // ── Actions: Threading Mode ──
  startThreading: (sourceId: string, sourceLabel: string) => void;
  stopThreading: () => void;
  selectTarget: (targetId: string) => void;

  // ── Actions: Ghost Links ──
  fetchGhostLinks: (networkId?: string) => Promise<void>;
  selectGhostLink: (link: ProposedLink | null) => void;

  // ── Actions: Propose ──
  proposeLink: (data: {
    networkId?: string;
    sourceId: string;
    targetId: string;
    relationshipType: string;
    description: string;
    fingerprint: string;
    badgeTier?: string;
    reputationStaked?: number;
    initialEvidenceUrl?: string;
    initialEvidenceDescription?: string;
  }) => Promise<ProposedLink | null>;

  // ── Actions: Evidence ──
  addEvidence: (linkId: string, data: {
    fingerprint: string;
    evidenceType: string;
    confidenceLevel: number;
    sourceUrl?: string;
    description: string;
    reputationStaked?: number;
  }) => Promise<boolean>;

  // ── Actions: Vote ──
  voteOnLink: (linkId: string, data: {
    fingerprint: string;
    direction: 'up' | 'down';
    badgeTier?: string;
  }) => Promise<boolean>;

  // ── Actions: UI ──
  setShowProposalForm: (show: boolean) => void;
  setShowDetailPanel: (show: boolean) => void;
  clearError: () => void;
}

// ── Helper: Supabase → camelCase ──
function mapProposedLink(row: any): ProposedLink {
  return {
    id: row.id,
    networkId: row.network_id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relationshipType: row.relationship_type,
    description: row.description,
    proposerFingerprint: row.proposer_fingerprint,
    proposerBadgeTier: row.proposer_badge_tier,
    status: row.status,
    evidenceCount: row.evidence_count || 0,
    evidenceThreshold: row.evidence_threshold || 3,
    communityUpvotes: row.community_upvotes || 0,
    communityDownvotes: row.community_downvotes || 0,
    totalVotes: row.total_votes || 0,
    reputationStaked: row.reputation_staked || 0,
    initialEvidenceUrl: row.initial_evidence_url,
    initialEvidenceDescription: row.initial_evidence_description,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapEvidence(row: any): ProposedEvidence {
  return {
    id: row.id,
    proposedLinkId: row.proposed_link_id,
    contributorFingerprint: row.contributor_fingerprint,
    evidenceType: row.evidence_type,
    confidenceLevel: row.confidence_level,
    sourceUrl: row.source_url,
    description: row.description,
    reputationStaked: row.reputation_staked || 0,
    createdAt: row.created_at,
  };
}

function mapVote(row: any): ProposedVote {
  return {
    id: row.id,
    proposedLinkId: row.proposed_link_id,
    voterFingerprint: row.voter_fingerprint,
    voteDirection: row.vote_direction,
    voteWeight: row.vote_weight,
    createdAt: row.created_at,
  };
}

export const useThreadingStore = create<ThreadingState>()(
  devtools(
    (set, get) => ({
      // ── Initial State ──
      isThreadingActive: false,
      sourceNodeId: null,
      sourceNodeLabel: null,
      targetNodeId: null,
      ghostLinks: [],
      ghostLinksLoading: false,
      selectedGhostLink: null,
      selectedGhostEvidence: [],
      selectedGhostVotes: [],
      showProposalForm: false,
      showDetailPanel: false,
      proposalSubmitting: false,
      error: null,

      // ── Threading Mode ──
      startThreading: (sourceId, sourceLabel) => {
        set({
          isThreadingActive: true,
          sourceNodeId: sourceId,
          sourceNodeLabel: sourceLabel,
          targetNodeId: null,
          showProposalForm: false,
          error: null,
        });
      },

      stopThreading: () => {
        set({
          isThreadingActive: false,
          sourceNodeId: null,
          sourceNodeLabel: null,
          targetNodeId: null,
          showProposalForm: false,
        });
      },

      selectTarget: (targetId) => {
        const state = get();
        if (!state.isThreadingActive || !state.sourceNodeId) return;
        if (targetId === state.sourceNodeId) return; // Kendi kendine bağlantı yok

        set({
          targetNodeId: targetId,
          showProposalForm: true,
        });
      },

      // ── Ghost Links ──
      fetchGhostLinks: async (networkId) => {
        set({ ghostLinksLoading: true });
        try {
          const params = new URLSearchParams();
          if (networkId) params.set('network_id', networkId);
          params.set('status', 'pending_evidence,pending_vote');

          const res = await fetch(`/api/links/propose?${params}`);
          const data = await res.json();

          if (data.links) {
            set({
              ghostLinks: data.links.map(mapProposedLink),
              ghostLinksLoading: false,
            });
          } else {
            set({ ghostLinksLoading: false });
          }
        } catch (err: any) {
          set({ ghostLinksLoading: false, error: err.message });
        }
      },

      selectGhostLink: async (link) => {
        set({
          selectedGhostLink: link,
          showDetailPanel: !!link,
          selectedGhostEvidence: [],
          selectedGhostVotes: [],
        });

        if (!link) return;

        // Fetch evidence + votes
        try {
          const [evRes, voteRes] = await Promise.all([
            fetch(`/api/links/propose/${link.id}/evidence`),
            fetch(`/api/links/propose/${link.id}/vote`),
          ]);

          const evData = await evRes.json();
          const voteData = await voteRes.json();

          set({
            selectedGhostEvidence: (evData.evidence || []).map(mapEvidence),
            selectedGhostVotes: (voteData.votes || []).map(mapVote),
          });
        } catch {
          // Sessizce geç
        }
      },

      // ── Propose Link ──
      proposeLink: async (data) => {
        set({ proposalSubmitting: true, error: null });
        try {
          const res = await fetch('/api/links/propose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              network_id: data.networkId,
              source_id: data.sourceId,
              target_id: data.targetId,
              relationship_type: data.relationshipType,
              description: data.description,
              fingerprint: data.fingerprint,
              badge_tier: data.badgeTier || 'community',
              reputation_staked: data.reputationStaked || 0,
              initial_evidence_url: data.initialEvidenceUrl,
              initial_evidence_description: data.initialEvidenceDescription,
            }),
          });

          const result = await res.json();

          if (result.error) {
            set({ proposalSubmitting: false, error: result.error });
            return null;
          }

          const newLink = mapProposedLink(result.link);

          set(state => ({
            proposalSubmitting: false,
            showProposalForm: false,
            isThreadingActive: false,
            sourceNodeId: null,
            sourceNodeLabel: null,
            targetNodeId: null,
            ghostLinks: [...state.ghostLinks, newLink],
          }));

          return newLink;
        } catch (err: any) {
          set({ proposalSubmitting: false, error: err.message });
          return null;
        }
      },

      // ── Add Evidence ──
      addEvidence: async (linkId, data) => {
        try {
          const res = await fetch(`/api/links/propose/${linkId}/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fingerprint: data.fingerprint,
              evidence_type: data.evidenceType,
              confidence_level: data.confidenceLevel,
              source_url: data.sourceUrl,
              description: data.description,
              reputation_staked: data.reputationStaked || 0,
            }),
          });

          const result = await res.json();
          if (result.error) {
            set({ error: result.error });
            return false;
          }

          // Update local ghost link
          set(state => ({
            ghostLinks: state.ghostLinks.map(gl =>
              gl.id === linkId
                ? {
                    ...gl,
                    evidenceCount: (result.updated?.evidence_count ?? gl.evidenceCount + 1),
                    status: result.updated?.status || gl.status,
                  }
                : gl
            ),
            selectedGhostLink: state.selectedGhostLink?.id === linkId
              ? {
                  ...state.selectedGhostLink,
                  evidenceCount: (result.updated?.evidence_count ?? state.selectedGhostLink.evidenceCount + 1),
                  status: result.updated?.status || state.selectedGhostLink.status,
                }
              : state.selectedGhostLink,
            selectedGhostEvidence: result.evidence
              ? [...state.selectedGhostEvidence, mapEvidence(result.evidence)]
              : state.selectedGhostEvidence,
          }));

          return true;
        } catch (err: any) {
          set({ error: err.message });
          return false;
        }
      },

      // ── Vote ──
      voteOnLink: async (linkId, data) => {
        try {
          const res = await fetch(`/api/links/propose/${linkId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fingerprint: data.fingerprint,
              direction: data.direction,
              badge_tier: data.badgeTier || 'community',
            }),
          });

          const result = await res.json();
          if (result.error) {
            set({ error: result.error });
            return false;
          }

          // Update local
          set(state => ({
            ghostLinks: state.ghostLinks.map(gl =>
              gl.id === linkId
                ? {
                    ...gl,
                    communityUpvotes: result.updated?.community_upvotes ?? gl.communityUpvotes,
                    communityDownvotes: result.updated?.community_downvotes ?? gl.communityDownvotes,
                    totalVotes: result.updated?.total_votes ?? gl.totalVotes,
                    status: result.updated?.status || gl.status,
                  }
                : gl
            ),
            selectedGhostLink: state.selectedGhostLink?.id === linkId
              ? {
                  ...state.selectedGhostLink,
                  communityUpvotes: result.updated?.community_upvotes ?? state.selectedGhostLink.communityUpvotes,
                  communityDownvotes: result.updated?.community_downvotes ?? state.selectedGhostLink.communityDownvotes,
                  totalVotes: result.updated?.total_votes ?? state.selectedGhostLink.totalVotes,
                  status: result.updated?.status || state.selectedGhostLink.status,
                }
              : state.selectedGhostLink,
          }));

          return true;
        } catch (err: any) {
          set({ error: err.message });
          return false;
        }
      },

      // ── UI ──
      setShowProposalForm: (show) => set({ showProposalForm: show }),
      setShowDetailPanel: (show) => set({ showDetailPanel: show }),
      clearError: () => set({ error: null }),
    }),
    { name: 'ThreadingStore' }
  )
);

// ── Selector Hooks ──
export const useIsThreading = () => useThreadingStore(s => s.isThreadingActive);
export const useGhostLinks = () => useThreadingStore(s => s.ghostLinks);
export const useSelectedGhostLink = () => useThreadingStore(s => s.selectedGhostLink);
