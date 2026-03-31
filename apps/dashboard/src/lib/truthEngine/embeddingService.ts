// ============================================
// THE TRUTH ENGINE - Embedding Service
// VERY CHEAP: ~$0.0001 per 1K tokens
// ============================================
// Embeddings, metinleri vektörlere çevirir.
// Bu sayede benzer belgeleri/entity'leri AI kullanmadan bulabiliriz.
// Bir kere embed et, sonsuza kadar ücretsiz ara!
// ============================================

import { supabase } from '../supabase';
import { Entity, Document } from './types';

// ============================================
// CONFIGURATION
// ============================================

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSION = 1536;
const MAX_TOKENS_PER_REQUEST = 8191;
const COST_PER_1K_TOKENS = 0.0001; // $0.0001 per 1K tokens

// OpenAI API artık server-side API route üzerinden çağrılıyor
// API key güvenli şekilde server'da kalıyor

// ============================================
// TYPES
// ============================================

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokens: number;
  cost: number;
}

export interface SimilarityResult {
  id: string;
  name?: string;
  title?: string;
  type: string;
  similarity: number;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  totalCost: number;
  cached: number;
  generated: number;
}

// ============================================
// EMBEDDING CACHE
// ============================================

// In-memory cache for this session
const embeddingCache = new Map<string, number[]>();

/**
 * Metin için cache key oluştur
 */
function getCacheKey(text: string): string {
  // Simple hash - production'da daha güçlü hash kullanılabilir
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `emb_${hash.toString(16)}`;
}

/**
 * Cache'den embedding al
 */
async function getFromCache(text: string): Promise<number[] | null> {
  const key = getCacheKey(text);

  // 1. In-memory cache
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key)!;
  }

  // 2. Database cache (entity_cache tablosu)
  try {
    const { data, error } = await supabase
      .from('entity_cache')
      .select('embedding')
      .eq('normalized_name', text.toLowerCase().substring(0, 500))
      .single();

    if (data?.embedding && !error) {
      // In-memory cache'e de ekle
      embeddingCache.set(key, data.embedding);
      return data.embedding;
    }
  } catch {
    // Cache miss, normal devam et
  }

  return null;
}

/**
 * Cache'e embedding kaydet
 */
async function saveToCache(text: string, embedding: number[]): Promise<void> {
  const key = getCacheKey(text);

  // In-memory
  embeddingCache.set(key, embedding);

  // Database (upsert)
  try {
    await supabase
      .from('entity_cache')
      .upsert({
        normalized_name: text.toLowerCase().substring(0, 500),
        entity_name: text.substring(0, 500),
        embedding,
        last_accessed: new Date().toISOString(),
      }, {
        onConflict: 'normalized_name'
      });
  } catch (error) {
    console.warn('Failed to save embedding to cache:', error);
  }
}

// ============================================
// MAIN EMBEDDING FUNCTIONS
// ============================================

/**
 * Tek bir metin için embedding oluştur
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Normalize text
  const normalizedText = text.trim().substring(0, MAX_TOKENS_PER_REQUEST * 4); // ~4 chars per token

  // Check cache first
  const cached = await getFromCache(normalizedText);
  if (cached) {
    return {
      text: normalizedText,
      embedding: cached,
      tokens: 0,
      cost: 0 // Cached = free!
    };
  }

  // Call embedding API route (server-side)
  try {
    const response = await fetch('/api/truth-engine/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [normalizedText],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Embedding API error');
    }

    const data = await response.json();
    const embedding = data.embeddings[0].embedding;
    const tokens = data.totalTokens;
    const cost = data.cost;

    // Save to cache
    await saveToCache(normalizedText, embedding);

    // Log cost
    await logCost('embedding', EMBEDDING_MODEL, tokens, 0, cost);

    return {
      text: normalizedText,
      embedding,
      tokens,
      cost
    };
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Birden fazla metin için batch embedding
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  const results: EmbeddingResult[] = [];
  let totalTokens = 0;
  let totalCost = 0;
  let cached = 0;
  let generated = 0;

  // Check cache for each text
  const toGenerate: { index: number; text: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i].trim().substring(0, MAX_TOKENS_PER_REQUEST * 4);
    const cachedEmbedding = await getFromCache(text);

    if (cachedEmbedding) {
      results[i] = {
        text,
        embedding: cachedEmbedding,
        tokens: 0,
        cost: 0
      };
      cached++;
    } else {
      toGenerate.push({ index: i, text });
    }
  }

  // Generate missing embeddings in batch via API route
  if (toGenerate.length > 0) {
    try {
      const response = await fetch('/api/truth-engine/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: toGenerate.map(t => t.text),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        totalTokens = data.totalTokens || 0;
        totalCost = data.cost || (totalTokens / 1000) * COST_PER_1K_TOKENS;

        for (let i = 0; i < data.embeddings.length; i++) {
          const { index, text } = toGenerate[i];
          const embedding = data.embeddings[i].embedding;

          results[index] = {
            text,
            embedding,
            tokens: Math.ceil(totalTokens / toGenerate.length),
            cost: totalCost / toGenerate.length
          };

          // Save to cache
          await saveToCache(text, embedding);
          generated++;
        }

        // Log total cost
        await logCost('embedding', EMBEDDING_MODEL, totalTokens, 0, totalCost);
      }
    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      throw error;
    }
  }

  return {
    embeddings: results,
    totalTokens,
    totalCost,
    cached,
    generated
  };
}

// ============================================
// SIMILARITY SEARCH
// ============================================

/**
 * Benzer entity'leri bul
 */
export async function findSimilarEntities(
  queryEmbedding: number[],
  threshold: number = 0.8,
  limit: number = 10
): Promise<SimilarityResult[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_entities', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_results: limit
    });

    if (error) {
      // RPC function might not exist yet - silently skip
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.entity_id,
      name: row.entity_name,
      type: row.entity_type,
      similarity: row.similarity
    }));
  } catch (error) {
    // Silently skip - pgvector might not be set up
    return [];
  }
}

/**
 * Benzer belgeleri bul
 */
export async function findSimilarDocuments(
  queryEmbedding: number[],
  threshold: number = 0.75,
  limit: number = 20
): Promise<SimilarityResult[]> {
  try {
    const { data, error } = await supabase.rpc('find_similar_documents', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_results: limit
    });

    if (error) {
      // RPC function might not exist yet - silently skip
      // console.warn('Document similarity search skipped:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.document_id,
      title: row.document_title,
      type: row.document_type,
      similarity: row.similarity
    }));
  } catch (error) {
    // Silently skip - pgvector might not be set up
    return [];
  }
}

/**
 * Metin ile benzer entity/belge ara
 */
export async function searchBySimilarity(
  queryText: string,
  searchType: 'entities' | 'documents' | 'both' = 'both',
  threshold: number = 0.75,
  limit: number = 20
): Promise<{
  entities: SimilarityResult[];
  documents: SimilarityResult[];
  queryEmbedding: number[];
  cost: number;
}> {
  // Generate embedding for query
  const { embedding, cost } = await generateEmbedding(queryText);

  const results = {
    entities: [] as SimilarityResult[],
    documents: [] as SimilarityResult[],
    queryEmbedding: embedding,
    cost
  };

  // Search
  if (searchType === 'entities' || searchType === 'both') {
    results.entities = await findSimilarEntities(embedding, threshold, limit);
  }

  if (searchType === 'documents' || searchType === 'both') {
    results.documents = await findSimilarDocuments(embedding, threshold, limit);
  }

  return results;
}

// ============================================
// ENTITY MATCHING
// ============================================

/**
 * Yeni bir entity'nin mevcut entity'lerle eşleşip eşleşmediğini kontrol et
 */
export async function findMatchingEntity(
  entityName: string,
  entityType?: string
): Promise<{ match: Entity | null; similarity: number; isNew: boolean }> {
  // 1. İlk olarak exact match dene
  const { data: exactMatch } = await supabase
    .from('entities')
    .select('*')
    .ilike('normalized_name', entityName.toLowerCase())
    .maybeSingle();

  if (exactMatch) {
    return {
      match: exactMatch as Entity,
      similarity: 1.0,
      isNew: false
    };
  }

  // 2. Alias'larda ara
  const { data: aliasMatch } = await supabase
    .from('entities')
    .select('*')
    .contains('aliases', [entityName])
    .maybeSingle();

  if (aliasMatch) {
    return {
      match: aliasMatch as Entity,
      similarity: 0.95,
      isNew: false
    };
  }

  // 3. Embedding similarity ile ara
  const { embedding, cost } = await generateEmbedding(entityName);
  const similarEntities = await findSimilarEntities(embedding, 0.85, 1);

  if (similarEntities.length > 0 && similarEntities[0].similarity > 0.9) {
    const { data: similarEntity } = await supabase
      .from('entities')
      .select('*')
      .eq('id', similarEntities[0].id)
      .single();

    if (similarEntity) {
      return {
        match: similarEntity as Entity,
        similarity: similarEntities[0].similarity,
        isNew: false
      };
    }
  }

  // 4. Eşleşme yok - yeni entity
  return {
    match: null,
    similarity: 0,
    isNew: true
  };
}

// ============================================
// DOCUMENT DEDUPLICATION
// ============================================

/**
 * Belgenin zaten var olup olmadığını kontrol et
 */
export async function checkDocumentDuplicate(
  content: string,
  fileHash?: string
): Promise<{ isDuplicate: boolean; matchingDocumentId?: string; similarity?: number }> {
  try {
    // 1. Hash kontrolü (en hızlı)
    if (fileHash) {
      const { data: hashMatch } = await supabase
        .from('documents')
        .select('id')
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (hashMatch) {
        return {
          isDuplicate: true,
          matchingDocumentId: hashMatch.id,
          similarity: 1.0
        };
      }
    }

    // 2. Embedding similarity (yakın içerik) - skip if embeddings not set up
    try {
      const { embedding } = await generateEmbedding(content.substring(0, 2000));
      const similarDocs = await findSimilarDocuments(embedding, 0.95, 1);

      if (similarDocs.length > 0 && similarDocs[0].similarity > 0.95) {
        return {
          isDuplicate: true,
          matchingDocumentId: similarDocs[0].id,
          similarity: similarDocs[0].similarity
        };
      }
    } catch {
      // Embedding/similarity search not available - skip duplicate check
    }

    return { isDuplicate: false };
  } catch {
    // Any error - assume not duplicate and continue
    return { isDuplicate: false };
  }
}

// ============================================
// COST LOGGING
// ============================================

async function logCost(
  operation: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  documentId?: string
): Promise<void> {
  try {
    await supabase.from('cost_records').insert({
      operation,
      model_used: model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost,
      document_id: documentId,
    });
  } catch (error) {
    console.warn('Failed to log cost:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * İki embedding arasındaki cosine similarity hesapla
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embedding maliyet tahmini
 */
export function estimateEmbeddingCost(text: string): number {
  // Rough estimation: ~4 characters per token
  const estimatedTokens = Math.ceil(text.length / 4);
  return (estimatedTokens / 1000) * COST_PER_1K_TOKENS;
}

/**
 * Cache istatistikleri
 */
export function getCacheStats(): {
  inMemorySize: number;
  estimatedSavings: number;
} {
  return {
    inMemorySize: embeddingCache.size,
    estimatedSavings: embeddingCache.size * 0.0005 // ~500 tokens per cached embedding
  };
}

// ============================================
// EXPORTS
// ============================================

export const EmbeddingService = {
  generateEmbedding,
  generateBatchEmbeddings,
  findSimilarEntities,
  findSimilarDocuments,
  searchBySimilarity,
  findMatchingEntity,
  checkDocumentDuplicate,
  cosineSimilarity,
  estimateEmbeddingCost,
  getCacheStats,
};

export default EmbeddingService;
