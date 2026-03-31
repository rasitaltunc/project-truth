// ═══════════════════════════════════════════
// SPRINT 15: Shared Domain Types
// Single source of truth for all data models
// ═══════════════════════════════════════════

// ── Node Types ──

export interface TruthNode {
  id: string;
  name: string;
  label: string;
  type: string;
  tier: string;
  risk: number;
  defcon_score?: number;
  network_id: string;
  description?: string;
  nationality?: string;
  occupation?: string;
  birth_date?: string;
  death_date?: string;
  photo_url?: string;
  country_tags?: string[];
  verification_level: VerificationLevel;
  evidence?: EvidenceItem[];
  timeline?: TimelineEvent[];
  connections?: ConnectionDetail[];
  created_at?: string;
  updated_at?: string;
}

export type VerificationLevel = 'official' | 'journalist' | 'community' | 'unverified';

// ── Link Types ──

export interface TruthLink {
  id: string;
  source: string;
  target: string;
  sourceLabel?: string;
  targetLabel?: string;
  relation: string;
  description?: string;
  network_id: string;
  evidence_type?: EvidenceType;
  confidence_level?: number;
  source_hierarchy?: SourceHierarchy;
  evidence_count?: number;
  created_at?: string;
}

export type EvidenceType =
  | 'court_record'
  | 'financial_record'
  | 'official_document'
  | 'leaked_document'
  | 'witness_testimony'
  | 'news_major'
  | 'news_minor'
  | 'photograph'
  | 'social_media'
  | 'travel_record'
  | 'phone_record'
  | 'inference'
  | 'rumor';

export type SourceHierarchy = 'primary' | 'secondary' | 'tertiary';

// ── Evidence Types ──

export interface EvidenceItem {
  id: string;
  title: string;
  content: string;
  evidence_type: EvidenceType;
  source_url?: string;
  source_name?: string;
  date?: string;
  date_precision?: 'year' | 'month' | 'day';
  confidence?: number;
  verification_status?: VerificationStatus;
  ifcn_rating?: string;
  created_at?: string;
}

export type VerificationStatus = 'verified' | 'credible' | 'disputed' | 'pending' | 'debunked';

// ── Timeline Types ──

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  date_precision: 'year' | 'month' | 'day';
  event_type?: string;
  source_url?: string;
  is_keystone?: boolean;
}

// ── Investigation Types ──

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  network_id: string;
  created_by: string;
  status: 'draft' | 'published' | 'archived';
  significance_score: number;
  created_at: string;
  updated_at: string;
}

export interface InvestigationStep {
  id: string;
  investigation_id: string;
  step_order: number;
  question: string;
  ai_response: string;
  highlight_node_ids: string[];
  annotations: Record<string, string>;
  created_at: string;
}

// ── Badge Types ──

export type BadgeTier = 'newcomer' | 'contributor' | 'investigator' | 'journalist' | 'expert';

export interface UserBadge {
  id: string;
  user_id: string;
  tier: BadgeTier;
  reputation: number;
  network_id?: string;
  created_at: string;
}

// ── Connection Detail ──

export interface ConnectionDetail {
  id: string;
  linked_node_id: string;
  linked_node_name: string;
  relation: string;
  evidence_type?: EvidenceType;
  confidence_level?: number;
}

// ── API Response Types ──

export interface TruthApiResponse {
  nodes: TruthNode[];
  links: TruthLink[];
  network: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface ChatApiResponse {
  narrative: string;
  highlightNodeIds: string[];
  highlightLinkIds: string[];
  focusNodeId: string | null;
  annotations: Record<string, string>;
  followUp: string | null;
  sources: Array<{ nodeId: string; field: string }>;
  rateLimited?: boolean;
}

// ── Proposed Link (Sprint 10) ──

export interface ProposedLink {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  description: string;
  proposed_by: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  vote_score: number;
  reputation_stake: number;
  created_at: string;
  expires_at: string;
}

// ── View Mode (Sprint 7) ──

export type ViewMode =
  | 'full_network'
  | 'main_story'
  | 'follow_money'
  | 'evidence_map'
  | 'timeline'
  | 'board';

// ── Tunnel Theme (Sprint 14A) ──

export type TunnelTheme = 'evidence' | 'finance' | 'court' | 'intelligence' | 'press' | 'darkroom';

export type TunnelPhase =
  | 'idle'
  | 'zooming'
  | 'booting'
  | 'entering'
  | 'walking'
  | 'focused'
  | 'exiting'
  | 'returning';
