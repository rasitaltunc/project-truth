// ============================================
// THE TRUTH ENGINE - Smart Processing Pipeline
// The Brain That Orchestrates Everything
// ============================================
// Bu modül, tüm processing katmanlarını akıllıca yönetir.
// Amaç: Minimum maliyet, maksimum değer
// ============================================

import { supabase } from '../supabase';
import {
  Document,
  Entity,
  Relationship,
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
  ProcessingJob,
  TruthEngineResponse,
  SuggestedConnection
} from './types';
import { LocalExtractor, preprocessText, getTextStats } from './localExtractor';
import { EmbeddingService, generateEmbedding, checkDocumentDuplicate, findMatchingEntity } from './embeddingService';
import { ClaudeAnalyzer, estimateAnalysisCost } from './claudeAnalyzer';

// Processing thresholds
const CONFIG = {
  // When to skip AI and use only local
  LOCAL_ONLY_WORD_LIMIT: 50,           // Very short texts
  LOCAL_ONLY_ENTITY_THRESHOLD: 10,      // If local finds enough entities

  // When to use embeddings
  EMBEDDING_SIMILARITY_THRESHOLD: 0.85, // If similar doc exists, skip AI

  // When to use Claude AI
  AI_MIN_WORD_COUNT: 100,               // Don't waste AI on tiny texts
  AI_COST_THRESHOLD: 0.10,              // Max cost per document without approval

  // Quality thresholds
  MIN_CONFIDENCE_TO_SAVE: 40,           // Don't save very low confidence entities
  AUTO_VERIFY_CONFIDENCE: 90,           // Auto-verify high confidence

  // Rate limiting
  MAX_AI_CALLS_PER_HOUR: 100,
  MAX_COST_PER_DAY: 10.00,              // USD
};

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Ana processing pipeline - belgeyi akıllıca işler
 */
export async function processDocument(
  content: string,
  metadata: {
    title?: string;
    type?: string;
    sourceUrl?: string;
    sourceDate?: Date;
    uploadedBy?: string;
    fileHash?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }
): Promise<TruthEngineResponse<ExtractionResult>> {
  const startTime = Date.now();
  let totalCost = 0;
  let processingLevel: 'cache' | 'local' | 'embedding' | 'ai' = 'local';

  try {
    // ============================================
    // STEP 1: Preprocessing & Validation
    // ============================================
    const cleanedContent = preprocessText(content);
    const stats = getTextStats(cleanedContent);

    if (stats.wordCount < 10) {
      return {
        success: false,
        error: 'Document too short for analysis (minimum 10 words)',
        processingTime: Date.now() - startTime,
        cacheHit: false,
        cost: 0,
        processingLevel: 'local'
      };
    }

    // ============================================
    // STEP 2: Duplicate Check (FREE)
    // ============================================
    const duplicateCheck = await checkDocumentDuplicate(cleanedContent, metadata.fileHash);
    if (duplicateCheck.isDuplicate) {
      // Get existing analysis
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', duplicateCheck.matchingDocumentId)
        .single();

      if (existingDoc?.extracted_entities) {
        return {
          success: true,
          data: {
            documentId: existingDoc.id,
            processingTime: Date.now() - startTime,
            processingLevel: 'local',
            cost: 0,
            entities: existingDoc.extracted_entities,
            relationships: existingDoc.extracted_relationships || [],
            summary: existingDoc.summary || 'Previously analyzed document',
            keyFacts: existingDoc.key_facts || [],
            suggestedConnections: []
          },
          processingTime: Date.now() - startTime,
          cacheHit: true,
          cost: 0,
          processingLevel: 'cache'
        };
      }
    }

    // ============================================
    // STEP 3: Create Document Record
    // ============================================
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title: metadata.title || `Document ${new Date().toISOString()}`,
        type: metadata.type || 'text',
        content: cleanedContent,
        original_url: metadata.sourceUrl,
        source_date: metadata.sourceDate?.toISOString(),
        uploaded_by: metadata.uploadedBy,
        file_hash: metadata.fileHash,
        processing_status: 'processing',
        processing_level: 'none'
      })
      .select()
      .single();

    if (docError || !document) {
      throw new Error('Failed to create document record');
    }

    // ============================================
    // STEP 4: Local Extraction (FREE)
    // ============================================
    const localEntities = LocalExtractor.extractEntities(cleanedContent);
    const localRelationships = LocalExtractor.extractRelationships(cleanedContent, localEntities);

    // Update document with local results
    await supabase
      .from('documents')
      .update({
        extracted_entities: localEntities,
        extracted_relationships: localRelationships,
        processing_level: 'local'
      })
      .eq('id', document.id);

    // Decision: Is local extraction enough?
    if (stats.wordCount < CONFIG.LOCAL_ONLY_WORD_LIMIT ||
        (localEntities.length >= CONFIG.LOCAL_ONLY_ENTITY_THRESHOLD &&
         localEntities.every(e => e.confidence >= 70))) {
      // Local is enough
      const result = await finalizeProcessing(document.id, localEntities, localRelationships, 'local');
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        cost: 0,
        processingLevel: 'local'
      };
    }

    // ============================================
    // STEP 5: Embedding Generation (VERY CHEAP)
    // ============================================
    const { embedding, cost: embeddingCost } = await generateEmbedding(
      cleanedContent.substring(0, 8000) // First ~2000 tokens
    );
    totalCost += embeddingCost;
    processingLevel = 'embedding';

    // Save embedding
    await supabase
      .from('documents')
      .update({
        embedding,
        processing_level: 'embedding'
      })
      .eq('id', document.id);

    // Check for similar documents with good analysis
    const similarDocs = await EmbeddingService.findSimilarDocuments(embedding, CONFIG.EMBEDDING_SIMILARITY_THRESHOLD, 5);
    if (similarDocs.length > 0) {
      // Get analysis from similar document
      const { data: similarDoc } = await supabase
        .from('documents')
        .select('extracted_entities, extracted_relationships, summary, key_facts')
        .eq('id', similarDocs[0].id)
        .eq('processing_level', 'ai_analyzed')
        .single();

      if (similarDoc?.extracted_entities) {
        // Merge local with similar doc's analysis
        const mergedEntities = mergeEntities(localEntities, similarDoc.extracted_entities as ExtractedEntity[]);
        const result = await finalizeProcessing(document.id, mergedEntities, localRelationships, 'embedding');

        return {
          success: true,
          data: {
            ...result,
            summary: `Similar to existing analyzed document (${Math.round(similarDocs[0].similarity * 100)}% match)`
          },
          processingTime: Date.now() - startTime,
          cacheHit: true,
          cost: totalCost,
          processingLevel: 'embedding'
        };
      }
    }

    // ============================================
    // STEP 6: Decide on AI Analysis
    // ============================================
    const estimatedAICost = estimateAnalysisCost(cleanedContent.length);

    // Check if we should use AI
    const shouldUseAI = await decideAIUsage(
      stats.wordCount,
      localEntities.length,
      estimatedAICost.estimatedCost,
      metadata.priority
    );

    if (!shouldUseAI) {
      // Skip AI, use enhanced local
      const result = await finalizeProcessing(document.id, localEntities, localRelationships, 'embedding');
      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        cost: totalCost,
        processingLevel: 'embedding'
      };
    }

    // ============================================
    // STEP 7: Claude AI Analysis (EXPENSIVE)
    // ============================================
    processingLevel = 'ai';
    const aiResult = await ClaudeAnalyzer.analyzeDocument(document.id, cleanedContent, localEntities);
    totalCost += aiResult.cost;

    // Merge AI results with local
    const finalEntities = mergeEntities(localEntities, aiResult.entities);
    const finalRelationships = mergeRelationships(localRelationships, aiResult.relationships);

    const result = await finalizeProcessing(
      document.id,
      finalEntities,
      finalRelationships,
      'ai',
      aiResult.summary,
      aiResult.keyFacts,
      aiResult.suggestedConnections
    );

    return {
      success: true,
      data: result,
      processingTime: Date.now() - startTime,
      cacheHit: false,
      cost: totalCost,
      processingLevel: 'ai'
    };

  } catch (error) {
    console.error('Processing pipeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      processingTime: Date.now() - startTime,
      cacheHit: false,
      cost: totalCost,
      processingLevel
    };
  }
}

// ============================================
// DECISION LOGIC
// ============================================

/**
 * AI kullanılmalı mı karar ver
 */
async function decideAIUsage(
  wordCount: number,
  localEntityCount: number,
  estimatedCost: number,
  priority?: string
): Promise<boolean> {
  // Priority override
  if (priority === 'urgent') return true;

  // Too short for AI
  if (wordCount < CONFIG.AI_MIN_WORD_COUNT) return false;

  // Too expensive without priority
  if (estimatedCost > CONFIG.AI_COST_THRESHOLD && priority !== 'high') return false;

  // Check daily budget
  const todayCost = await getTodaysCost();
  if (todayCost + estimatedCost > CONFIG.MAX_COST_PER_DAY && priority !== 'urgent') {
    return false;
  }

  // Check hourly rate limit
  const hourlyAICalls = await getHourlyAICalls();
  if (hourlyAICalls >= CONFIG.MAX_AI_CALLS_PER_HOUR && priority !== 'urgent') {
    return false;
  }

  // Local didn't find much - use AI
  if (localEntityCount < 3) return true;

  // Document seems complex enough for AI
  if (wordCount > 500) return true;

  return false;
}

/**
 * Bugünkü toplam maliyeti al
 */
async function getTodaysCost(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('cost_records')
    .select('cost')
    .gte('timestamp', today.toISOString());

  return data?.reduce((sum: any, r: any) => sum + (r.cost || 0), 0) || 0;
}

/**
 * Son 1 saatteki AI çağrı sayısı
 */
async function getHourlyAICalls(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { count } = await supabase
    .from('cost_records')
    .select('*', { count: 'exact', head: true })
    .eq('operation', 'extraction')
    .gte('timestamp', oneHourAgo.toISOString());

  return count || 0;
}

// ============================================
// MERGING & DEDUPLICATION
// ============================================

/**
 * Entity listelerini birleştir ve dedupe et
 */
function mergeEntities(
  local: ExtractedEntity[],
  ai: ExtractedEntity[]
): ExtractedEntity[] {
  const merged = new Map<string, ExtractedEntity>();

  // Add local entities
  for (const entity of local) {
    const key = normalizeEntityName(entity.name);
    merged.set(key, entity);
  }

  // Merge AI entities
  for (const entity of ai) {
    const key = normalizeEntityName(entity.name);
    const existing = merged.get(key);

    if (existing) {
      // AI found same entity - merge, prefer higher confidence
      merged.set(key, {
        ...existing,
        confidence: Math.max(existing.confidence, entity.confidence),
        aliases: [...new Set([...(existing.aliases || []), ...(entity.aliases || [])])],
        extractionReason: `${existing.extractionReason}; ${entity.extractionReason}`
      });
    } else {
      merged.set(key, entity);
    }
  }

  return Array.from(merged.values()).filter(e => e.confidence >= CONFIG.MIN_CONFIDENCE_TO_SAVE);
}

/**
 * Relationship listelerini birleştir
 */
function mergeRelationships(
  local: ExtractedRelationship[],
  ai: ExtractedRelationship[]
): ExtractedRelationship[] {
  const merged = new Map<string, ExtractedRelationship>();

  // Create unique key for relationship
  const getKey = (r: ExtractedRelationship) =>
    `${normalizeEntityName(r.sourceEntityName)}|${normalizeEntityName(r.targetEntityName)}|${r.relationshipType}`;

  // Add local
  for (const rel of local) {
    merged.set(getKey(rel), rel);
  }

  // Merge AI
  for (const rel of ai) {
    const key = getKey(rel);
    const existing = merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        confidence: Math.max(existing.confidence, rel.confidence),
        reasoning: `${existing.reasoning}; ${rel.reasoning}`
      });
    } else {
      merged.set(key, rel);
    }
  }

  return Array.from(merged.values()).filter(r => r.confidence >= CONFIG.MIN_CONFIDENCE_TO_SAVE);
}

function normalizeEntityName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// ============================================
// FINALIZATION
// ============================================

/**
 * İşleme tamamla, veritabanını güncelle
 */
async function finalizeProcessing(
  documentId: string,
  entities: ExtractedEntity[],
  relationships: ExtractedRelationship[],
  level: 'local' | 'embedding' | 'ai',
  summary?: string,
  keyFacts?: string[],
  suggestions?: SuggestedConnection[]
): Promise<ExtractionResult> {
  // Save entities to database
  const savedEntityIds: string[] = [];
  for (const entity of entities) {
    const savedId = await saveOrUpdateEntity(entity, documentId);
    if (savedId) savedEntityIds.push(savedId);
  }

  // Save relationships
  for (const rel of relationships) {
    await saveRelationship(rel, documentId);
  }

  // Update document
  await supabase
    .from('documents')
    .update({
      extracted_entities: entities,
      extracted_relationships: relationships,
      summary,
      key_facts: keyFacts,
      mentioned_entity_ids: savedEntityIds,
      processing_status: 'completed',
      processing_level: level === 'ai' ? 'ai_analyzed' : level,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);

  return {
    documentId,
    processingTime: 0,
    processingLevel: level,
    cost: 0,
    entities,
    relationships,
    summary: summary || '',
    keyFacts: keyFacts || [],
    suggestedConnections: suggestions || []
  };
}

/**
 * Entity'yi kaydet veya güncelle
 */
async function saveOrUpdateEntity(
  entity: ExtractedEntity,
  documentId: string
): Promise<string | null> {
  try {
    // Check if entity exists
    const match = await findMatchingEntity(entity.name, entity.type);

    if (!match.isNew && match.match) {
      // Update existing entity
      await supabase
        .from('entities')
        .update({
          source_count: match.match.sourceCount + 1,
          confidence: Math.max(match.match.confidence, entity.confidence),
          extracted_from: [...(match.match.extractedFrom || []), documentId],
          last_updated: new Date().toISOString()
        })
        .eq('id', match.match.id);

      return match.match.id;
    } else {
      // Create new entity
      const { data, error } = await supabase
        .from('entities')
        .insert({
          type: entity.type,
          name: entity.name,
          normalized_name: normalizeEntityName(entity.name),
          aliases: entity.aliases || [],
          confidence: entity.confidence,
          extracted_from: [documentId],
          verification_status: entity.confidence >= CONFIG.AUTO_VERIFY_CONFIDENCE
            ? 'community_verified'
            : 'unverified'
        })
        .select('id')
        .single();

      return data?.id || null;
    }
  } catch (error) {
    console.error('Failed to save entity:', error);
    return null;
  }
}

/**
 * Relationship'i kaydet
 */
async function saveRelationship(
  rel: ExtractedRelationship,
  documentId: string
): Promise<void> {
  try {
    // Find source and target entity IDs
    const sourceMatch = await findMatchingEntity(rel.sourceEntityName);
    const targetMatch = await findMatchingEntity(rel.targetEntityName);

    if (!sourceMatch.match || !targetMatch.match) return;

    // Check if relationship exists
    const { data: existing } = await supabase
      .from('relationships')
      .select('id')
      .eq('source_entity_id', sourceMatch.match.id)
      .eq('target_entity_id', targetMatch.match.id)
      .eq('type', rel.relationshipType)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('relationships')
        .update({
          confidence: rel.confidence,
          evidence_ids: supabase.rpc('array_append', { arr: 'evidence_ids', elem: documentId })
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('relationships')
        .insert({
          type: rel.relationshipType,
          source_entity_id: sourceMatch.match.id,
          target_entity_id: targetMatch.match.id,
          description: rel.evidence,
          confidence: rel.confidence,
          evidence_ids: [documentId],
          ai_generated: true,
          ai_confidence: rel.confidence,
          ai_reasoning: rel.reasoning
        });
    }
  } catch (error) {
    console.error('Failed to save relationship:', error);
  }
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Gece batch işleme - düşük öncelikli belgeler
 */
export async function processNightlyBatch(): Promise<{
  processed: number;
  totalCost: number;
  errors: number;
}> {
  let processed = 0;
  let totalCost = 0;
  let errors = 0;

  // Get pending documents
  const { data: pendingDocs } = await supabase
    .from('documents')
    .select('id, content')
    .eq('processing_status', 'pending')
    .or('processing_level.eq.none,processing_level.eq.local')
    .limit(50);

  if (!pendingDocs) return { processed, totalCost, errors };

  for (const doc of pendingDocs) {
    try {
      const result = await processDocument(doc.content, {
        priority: 'low' // Batch = low priority
      });

      if (result.success) {
        processed++;
        totalCost += result.cost;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  return { processed, totalCost, errors };
}

/**
 * Lead generation - yeni bağlantıları keşfet
 */
export async function generateInvestigationLeads(): Promise<{
  leadsGenerated: number;
  cost: number;
}> {
  // Get recent entities
  const { data: recentEntities } = await supabase
    .from('entities')
    .select('id')
    .order('last_updated', { ascending: false })
    .limit(50);

  if (!recentEntities || recentEntities.length < 5) {
    return { leadsGenerated: 0, cost: 0 };
  }

  // Perform deep analysis
  const analysis = await ClaudeAnalyzer.performDeepAnalysis(
    recentEntities.map((e: any) => e.id)
  );

  // Save leads
  let leadsGenerated = 0;
  for (const suggestion of analysis.suggestedInvestigations) {
    await supabase.from('investigation_leads').insert({
      type: suggestion.type === 'pattern' ? 'pattern' : 'connection',
      title: suggestion.title,
      summary: suggestion.description,
      detailed_analysis: suggestion.reasoning,
      involved_entities: suggestion.entityIds,
      priority: suggestion.importance === 'critical' ? 95 :
                suggestion.importance === 'high' ? 80 :
                suggestion.importance === 'medium' ? 60 : 40,
      generated_by: 'nightly_job',
      ai_confidence: suggestion.confidence
    });
    leadsGenerated++;
  }

  return { leadsGenerated, cost: 0 }; // Cost tracked separately
}

// ============================================
// EXPORTS
// ============================================

export const ProcessingPipeline = {
  processDocument,
  processNightlyBatch,
  generateInvestigationLeads,
  CONFIG
};

export default ProcessingPipeline;
