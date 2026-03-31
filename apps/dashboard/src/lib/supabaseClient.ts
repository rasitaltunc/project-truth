// ============================================
// PROJECT TRUTH: SUPABASE CLIENT
// apps/dashboard/src/lib/supabaseClient.ts
// ============================================

import { createClient } from '@supabase/supabase-js';

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Graceful fallback - don't crash if env vars missing
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ============================================
// DATABASE TYPES
// ============================================
export type NodeTier = 'tier1' | 'tier2' | 'tier3';
export type NodeType = 'person' | 'organization' | 'location' | 'event' | 'document' | 'evidence';
export type VerificationStatus = 'new' | 'disputed' | 'community_verified' | 'fact_checked' | 'debunked';
export type RelationshipType = 'associated' | 'financial' | 'familial' | 'professional' | 'criminal' | 'romantic' | 'witnessed';

// Sprint 6B: Epistemolojik Katman Tipleri
export type EvidenceSourceType =
  | 'court_record' | 'official_document' | 'leaked_document'
  | 'financial_record' | 'witness_testimony' | 'news_major'
  | 'news_minor' | 'academic_paper' | 'social_media'
  | 'rumor' | 'inference';

export type SourceHierarchy = 'primary' | 'secondary' | 'tertiary';

export type IfcnRating =
  | 'true' | 'mostly_true' | 'half_true'
  | 'mostly_false' | 'false' | 'pants_on_fire'
  | 'missing_context' | 'unverifiable';

export interface TruthNode {
  id: string;
  name: string;
  type: NodeType;
  image_url: string | null;
  tier: NodeTier;
  defcon_score: number;
  darkness_score: number;
  truth_score: number;
  role: string | null;
  summary: string | null;
  details: {
    aliases?: string[];
    titles?: string[];
    known_for?: string[];
    [key: string]: any;
  };
  first_appearance: string | null;
  last_known_activity: string | null;
  source_count: number;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface TruthLink {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
  strength: number;
  description: string | null;
  evidence_summary: string | null;
  start_date: string | null;
  end_date: string | null;
  verification_status: VerificationStatus;
  source_count: number;
  created_at: string;
  updated_at: string;
  // Sprint 6B: Epistemolojik Katman
  evidence_type?: EvidenceSourceType;
  confidence_level?: number;       // 0.00-1.00
  source_hierarchy?: SourceHierarchy;
  evidence_count?: number;
}

export interface Evidence {
  id: string;
  node_id: string | null;
  link_id: string | null;
  evidence_type: string;
  title: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  source_name: string | null;
  source_url: string | null;
  source_date: string | null;
  verification_status: VerificationStatus;
  verified_by: string[] | null;
  verification_notes: string | null;
  ai_extracted_entities: any[];
  ai_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

// Sprint 6B: Kaynak Provenance
export interface EvidenceProvenance {
  id: string;
  evidence_id: string;
  evidence_table: 'evidence_archive' | 'community_evidence';
  source_type: EvidenceSourceType;
  source_hierarchy: SourceHierarchy;
  source_url: string | null;
  source_archive_url: string | null;
  source_hash: string | null;
  verification_chain: Array<{
    user_id: string;
    action: 'verify' | 'dispute';
    timestamp: string;
    method?: string;
  }>;
  metadata_stripped: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

// Sprint 6B: Link Confidence Haritası (3D scene için)
export interface LinkConfidence {
  link_id: string;
  evidence_type: EvidenceSourceType;
  confidence_level: number;
  source_hierarchy: SourceHierarchy;
  evidence_count: number;
}

export interface IsikTutCampaign {
  id: string;
  target_node_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string | null;
  contribution_count: number;
  participant_count: number;
  evidence_added: number;
  result_summary: string | null;
  truth_score_change: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// DATABASE SCHEMA TYPE
// ============================================
export interface Database {
  public: {
    Tables: {
      nodes: {
        Row: TruthNode;
        Insert: Omit<TruthNode, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<TruthNode>;
      };
      links: {
        Row: TruthLink;
        Insert: Omit<TruthLink, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<TruthLink>;
      };
      evidence_archive: {
        Row: Evidence;
        Insert: Omit<Evidence, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Evidence>;
      };
      isik_tut_campaigns: {
        Row: IsikTutCampaign;
        Insert: Omit<IsikTutCampaign, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<IsikTutCampaign>;
      };
    };
  };
}

// ============================================
// SUPABASE CLIENT
// ============================================
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
  : null;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if Supabase is configured
 */
export function isSupabaseReady(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

/**
 * Tüm aktif düğümleri getir
 */
export async function getAllNodes(): Promise<TruthNode[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('is_active', true)
    .order('defcon_score', { ascending: false });

  if (error) {
    console.error('Error fetching nodes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Tüm bağlantıları getir
 */
export async function getAllLinks(): Promise<TruthLink[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('links')
    .select('*')
    .order('strength', { ascending: false });

  if (error) {
    console.error('Error fetching links:', error);
    throw error;
  }

  return data || [];
}

/**
 * Belirli bir düğümün detaylarını getir
 */
export async function getNodeById(id: string): Promise<TruthNode | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching node:', error);
    return null;
  }

  return data;
}

/**
 * Bir düğüme ait kanıtları getir
 */
export async function getNodeEvidence(nodeId: string): Promise<Evidence[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('evidence_archive')
    .select('*')
    .eq('node_id', nodeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching evidence:', error);
    throw error;
  }

  return data || [];
}

/**
 * Bir düğümün bağlantılarını getir
 */
export async function getNodeConnections(nodeId: string): Promise<TruthLink[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('links')
    .select('*')
    .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`);

  if (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }

  return data || [];
}

/**
 * Aktif Işık Tut kampanyasını getir
 */
export async function getActiveIsikTutCampaign(): Promise<IsikTutCampaign | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('isik_tut_campaigns')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching campaign:', error);
    return null;
  }

  return data;
}

/**
 * Ağ istatistiklerini getir
 */
export async function getNetworkStats() {
  if (!supabase) {
    return { totalNodes: 0, totalLinks: 0, totalEvidence: 0 };
  }

  const [nodesResult, linksResult, evidenceResult] = await Promise.all([
    supabase.from('nodes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('links').select('id', { count: 'exact', head: true }),
    supabase.from('evidence_archive').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalNodes: nodesResult.count || 0,
    totalLinks: linksResult.count || 0,
    totalEvidence: evidenceResult.count || 0,
  };
}

/**
 * Düğüm ara
 */
export async function searchNodes(query: string): Promise<TruthNode[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,role.ilike.%${query}%,summary.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching nodes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Tier'a göre düğümleri getir
 */
export async function getNodesByTier(tier: NodeTier): Promise<TruthNode[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('is_active', true)
    .eq('tier', tier)
    .order('defcon_score', { ascending: false });

  if (error) {
    console.error('Error fetching nodes by tier:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// EXPORT DEFAULT
// ============================================
export default supabase;
