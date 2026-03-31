// ============================================
// THE TRUTH ENGINE - Main Export
// PROJECT TRUTH's AI Brain
// ============================================
// "Minimum maliyet, maksimum değer"
// "Bir kere öğren, sonsuza kadar kullan"
// ============================================

// Core Types
export * from './types';

// Processing Layers
export { LocalExtractor, preprocessText, getTextStats } from './localExtractor';
export { EmbeddingService, generateEmbedding, searchBySimilarity } from './embeddingService';
export { ClaudeAnalyzer, estimateAnalysisCost } from './claudeAnalyzer';

// Main Pipeline
export { ProcessingPipeline, processDocument } from './processingPipeline';

// ============================================
// CONVENIENCE API
// ============================================

import { processDocument } from './processingPipeline';
import { searchBySimilarity } from './embeddingService';
import { ClaudeAnalyzer } from './claudeAnalyzer';
import { LocalExtractor } from './localExtractor';
import { supabase } from '../supabase';

/**
 * THE TRUTH ENGINE - Ana API
 */
export const TruthEngine = {
  // ============================================
  // DOCUMENT PROCESSING
  // ============================================

  /**
   * Belge analiz et - akıllı pipeline otomatik karar verir
   */
  async analyzeDocument(
    content: string,
    options?: {
      title?: string;
      type?: string;
      sourceUrl?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      uploadedBy?: string;
    }
  ) {
    return processDocument(content, options || {});
  },

  /**
   * URL'den belge analiz et
   */
  async analyzeUrl(url: string, options?: { priority?: 'low' | 'normal' | 'high' | 'urgent' }) {
    try {
      const response = await fetch(url);
      const text = await response.text();

      // Extract text from HTML
      const textContent = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return processDocument(textContent, {
        title: url,
        type: 'webpage',
        sourceUrl: url,
        ...options
      });
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch URL: ${error}`,
        processingTime: 0,
        cacheHit: false,
        cost: 0,
        processingLevel: 'local' as const
      };
    }
  },

  // ============================================
  // SEARCH
  // ============================================

  /**
   * Semantic search - embedding tabanlı
   */
  async search(query: string, options?: {
    type?: 'entities' | 'documents' | 'both';
    limit?: number;
    threshold?: number;
  }) {
    return searchBySimilarity(
      query,
      options?.type || 'both',
      options?.threshold || 0.75,
      options?.limit || 20
    );
  },

  /**
   * Entity ara (isim ile)
   */
  async findEntity(name: string) {
    const { data } = await supabase
      .from('entities')
      .select('*')
      .or(`name.ilike.%${name}%,normalized_name.ilike.%${name}%`)
      .limit(10);

    return data || [];
  },

  /**
   * Entity detayları
   */
  async getEntityDetails(entityId: string) {
    const { data: entity } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (!entity) return null;

    // Get relationships
    const { data: relationships } = await supabase
      .from('relationships')
      .select(`
        *,
        source:source_entity_id(id, name, type),
        target:target_entity_id(id, name, type)
      `)
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
      .limit(50);

    // Get related documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, type, summary')
      .contains('mentioned_entity_ids', [entityId])
      .limit(20);

    return {
      entity,
      relationships: relationships || [],
      documents: documents || []
    };
  },

  // ============================================
  // NETWORK
  // ============================================

  /**
   * Entity ağını al (2 derece ayrılık)
   */
  async getEntityNetwork(entityId: string, depth: number = 2) {
    const { data, error } = await supabase.rpc('get_entity_network', {
      center_entity_id: entityId,
      max_depth: depth
    });

    return data || [];
  },

  // ============================================
  // INVESTIGATION LEADS
  // ============================================

  /**
   * Açık soruşturma ipuçlarını al
   */
  async getInvestigationLeads(options?: {
    status?: 'new' | 'investigating' | 'verified' | 'dismissed';
    limit?: number;
  }) {
    let query = supabase
      .from('investigation_leads')
      .select('*')
      .order('priority', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data } = await query.limit(options?.limit || 20);
    return data || [];
  },

  /**
   * Lead'i güncelle
   */
  async updateLead(leadId: string, update: {
    status?: string;
    upvote?: boolean;
    downvote?: boolean;
  }) {
    const updates: any = {};

    if (update.status) updates.status = update.status;
    if (update.upvote) updates.upvotes = supabase.rpc('increment', { row_id: leadId, column: 'upvotes' });
    if (update.downvote) updates.downvotes = supabase.rpc('increment', { row_id: leadId, column: 'downvotes' });

    return supabase
      .from('investigation_leads')
      .update(updates)
      .eq('id', leadId);
  },

  // ============================================
  // QUESTIONS
  // ============================================

  /**
   * Soru sor - AI cevaplar
   */
  async askQuestion(question: string, context?: {
    entityIds?: string[];
    documentIds?: string[];
  }) {
    return ClaudeAnalyzer.answerQuestion(
      question,
      context?.entityIds,
      context?.documentIds
    );
  },

  // ============================================
  // QUICK EXTRACT (Local only - FREE)
  // ============================================

  /**
   * Hızlı extraction - sadece local, ücretsiz
   */
  quickExtract(text: string) {
    const entities = LocalExtractor.extractEntities(text);
    const relationships = LocalExtractor.extractRelationships(text, entities);
    const stats = LocalExtractor.getTextStats(text);

    return {
      entities,
      relationships,
      stats,
      cost: 0
    };
  },

  // ============================================
  // STATS
  // ============================================

  /**
   * Sistem istatistikleri
   */
  async getSystemStats() {
    const { data } = await supabase
      .from('system_stats')
      .select('*')
      .single();

    return data;
  },

  /**
   * Maliyet özeti
   */
  async getCostSummary(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const periodMs = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };

    const since = new Date(Date.now() - periodMs[period]);

    const { data } = await supabase
      .from('cost_records')
      .select('operation, cost')
      .gte('timestamp', since.toISOString());

    if (!data) return { total: 0, byOperation: {} };

    const total = data.reduce((sum: any, r: any) => sum + (r.cost || 0), 0);
    const byOperation = data.reduce((acc: any, r: any) => {
      acc[r.operation] = (acc[r.operation] || 0) + (r.cost || 0);
      return acc;
    }, {} as Record<string, number>);

    return { total, byOperation };
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default TruthEngine;
