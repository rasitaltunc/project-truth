/**
 * Document Chunking — Ham Belge Önizleme + Akıllı Tarama
 *
 * Uzun belgeleri AI taraması için parçalara böler.
 * Strateji:
 *   ≤ 6000 karakter  →  1 chunk (doğrudan gönder)
 *   6001-30000       →  2-5 chunk (6000 karakter, 500 overlap)
 *   > 30000          →  max 5 chunk + uyarı
 */

const CHUNK_SIZE = 6000;
const OVERLAP = 500;
const MAX_CHUNKS = 5;

export interface DocumentChunk {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  isLast: boolean;
}

/**
 * Split document text into overlapping chunks for AI processing
 */
export function chunkDocument(text: string): DocumentChunk[] {
  if (!text || text.length === 0) {
    return [];
  }

  // Short documents → single chunk
  if (text.length <= CHUNK_SIZE) {
    return [{
      index: 0,
      text,
      startChar: 0,
      endChar: text.length,
      isLast: true,
    }];
  }

  const chunks: DocumentChunk[] = [];
  let offset = 0;

  while (offset < text.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(offset + CHUNK_SIZE, text.length);
    const isLast = end >= text.length || chunks.length === MAX_CHUNKS - 1;

    chunks.push({
      index: chunks.length,
      text: text.slice(offset, end),
      startChar: offset,
      endChar: end,
      isLast,
    });

    if (isLast) break;

    // Next chunk starts OVERLAP chars before end
    offset = end - OVERLAP;
  }

  return chunks;
}

/**
 * Merge scan results from multiple chunks (dedup entities + relationships)
 */
export function mergeChunkResults(results: Array<{
  entities?: Array<{ name: string; type: string; role?: string; confidence: number; context?: string }>;
  relationships?: Array<{
    sourceName: string; targetName: string; relationshipType: string;
    evidenceType: string; description?: string; confidence: number;
  }>;
  summary?: string;
  keyDates?: Array<{ date: string; description: string }>;
  confidence?: number;
}>): {
  entities: Array<{ name: string; type: string; role?: string; confidence: number; context?: string }>;
  relationships: Array<{
    sourceName: string; targetName: string; relationshipType: string;
    evidenceType: string; description?: string; confidence: number;
  }>;
  summary: string;
  keyDates: Array<{ date: string; description: string }>;
  confidence: number;
} {
  const allEntities: Array<{ name: string; type: string; role?: string; confidence: number; context?: string }> = [];
  const allRelationships: Array<{
    sourceName: string; targetName: string; relationshipType: string;
    evidenceType: string; description?: string; confidence: number;
  }> = [];
  const allKeyDates: Array<{ date: string; description: string }> = [];
  const summaries: string[] = [];
  let totalConfidence = 0;

  for (const result of results) {
    if (result.entities) allEntities.push(...result.entities);
    if (result.relationships) allRelationships.push(...result.relationships);
    if (result.keyDates) allKeyDates.push(...result.keyDates);
    if (result.summary) summaries.push(result.summary);
    totalConfidence += result.confidence || 0;
  }

  // Deduplicate entities (keep highest confidence)
  const entityMap = new Map<string, (typeof allEntities)[0]>();
  for (const entity of allEntities) {
    const key = `${entity.name.toLowerCase().trim()}::${entity.type}`;
    const existing = entityMap.get(key);
    if (!existing || entity.confidence > existing.confidence) {
      entityMap.set(key, entity);
    }
  }

  // Deduplicate relationships
  const relMap = new Map<string, (typeof allRelationships)[0]>();
  for (const rel of allRelationships) {
    const key = `${rel.sourceName.toLowerCase()}→${rel.targetName.toLowerCase()}::${rel.relationshipType}`;
    const existing = relMap.get(key);
    if (!existing || rel.confidence > existing.confidence) {
      relMap.set(key, rel);
    }
  }

  // Deduplicate keyDates
  const dateMap = new Map<string, (typeof allKeyDates)[0]>();
  for (const kd of allKeyDates) {
    const key = `${kd.date}::${kd.description.toLowerCase().substring(0, 50)}`;
    if (!dateMap.has(key)) {
      dateMap.set(key, kd);
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships: Array.from(relMap.values()),
    summary: summaries.join(' '),
    keyDates: Array.from(dateMap.values()),
    confidence: results.length > 0 ? totalConfidence / results.length : 0,
  };
}
