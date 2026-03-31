// ============================================
// THE TRUTH ENGINE - Claude AI Analyzer (Client)
// EXPENSIVE: ~$0.003-0.015 per 1K tokens (Sonnet)
// Use sparingly, cache aggressively!
// ============================================
// Bu modül, derin analiz için API route üzerinden Claude'u çağırır.
// Browser'da güvenli çalışır - API key açığa çıkmaz!
// ============================================

import {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
  SuggestedConnection,
  EntityType,
  RelationshipType,
  AnalysisResult
} from './types';

// ============================================
// MAIN ANALYSIS FUNCTIONS
// ============================================

/**
 * Belgeyi Claude ile analiz et (API route üzerinden)
 */
export async function analyzeDocumentWithClaude(
  documentId: string,
  content: string,
  existingEntities?: ExtractedEntity[]
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('/api/truth-engine/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        documentId,
        existingEntities
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }

    const data = await response.json();

    // Transform to our types
    const result: ExtractionResult = {
      documentId,
      processingTime: data.processingTime || (Date.now() - startTime),
      processingLevel: 'ai',
      cost: data.cost || 0,
      entities: transformEntities(data.entities || []),
      relationships: transformRelationships(data.relationships || []),
      summary: data.summary || '',
      keyFacts: data.keyFacts || [],
      suggestedConnections: transformSuggestions(data.suggestedInvestigations || []),
      modelUsed: data.modelUsed,
      tokensUsed: data.tokensUsed
    };

    return result;
  } catch (error) {
    console.error('Claude analysis failed:', error);
    throw error;
  }
}

/**
 * Derin ağ analizi - şimdilik basit implementasyon
 */
export async function performDeepAnalysis(
  entityIds: string[],
  recentDocumentIds?: string[]
): Promise<AnalysisResult> {
  // TODO: Implement deep analysis via API route
  console.warn('Deep analysis not yet implemented via API route');

  return {
    summary: `Deep analysis of ${entityIds.length} entities requested`,
    keyFindings: [],
    entities: [],
    relationships: [],
    suggestedInvestigations: [],
    confidenceScore: 0
  };
}

/**
 * Soru-cevap - şimdilik basit implementasyon
 */
export async function answerQuestion(
  question: string,
  contextEntityIds?: string[],
  contextDocumentIds?: string[]
): Promise<{
  answer: string;
  confidence: number;
  sources: string[];
  suggestedFollowups: string[];
  cost: number;
}> {
  // TODO: Implement Q&A via API route
  console.warn('Question answering not yet implemented via API route');

  return {
    answer: 'Question answering will be implemented soon.',
    confidence: 0,
    sources: [],
    suggestedFollowups: [],
    cost: 0
  };
}

// ============================================
// TRANSFORMERS
// ============================================

function transformEntities(rawEntities: any[]): ExtractedEntity[] {
  return rawEntities.map(e => ({
    name: e.name || 'Unknown',
    type: validateEntityType(e.type),
    aliases: e.aliases || [],
    confidence: e.confidence || 50,
    context: e.context || '',
    isNewEntity: true,
    extractionReason: 'AI extraction'
  }));
}

function transformRelationships(rawRelationships: any[]): ExtractedRelationship[] {
  return rawRelationships.map(r => ({
    sourceEntityName: r.source || r.sourceEntity || '',
    targetEntityName: r.target || r.targetEntity || '',
    relationshipType: validateRelationshipType(r.type),
    confidence: r.confidence || 50,
    evidence: r.evidence || '',
    reasoning: r.reasoning || ''
  }));
}

function transformSuggestions(rawSuggestions: any[]): SuggestedConnection[] {
  return rawSuggestions.map(s => ({
    type: 'pattern',
    entityIds: [],
    title: s.title || s.connectionType || 'Suggested Investigation',
    description: s.description || s.reasoning || '',
    reasoning: s.reasoning || s.suggestedEvidence || '',
    confidence: s.confidence || 50,
    importance: 'medium' as const,
    suggestedActions: [],
    relatedDocuments: []
  }));
}

function validateEntityType(type: string): EntityType {
  const validTypes: EntityType[] = [
    'person', 'organization', 'location', 'event',
    'document', 'asset', 'financial', 'media', 'communication'
  ];
  return validTypes.includes(type as EntityType) ? type as EntityType : 'person';
}

function validateRelationshipType(type: string): RelationshipType {
  const validTypes: RelationshipType[] = [
    'family', 'friend', 'romantic', 'associate',
    'employer', 'employee', 'board_member', 'founder', 'investor', 'advisor', 'client', 'partner',
    'funded', 'received_funds', 'owns', 'owned_by', 'transaction',
    'visited', 'lives_at', 'worked_at', 'headquartered',
    'attended', 'organized', 'witnessed', 'mentioned_in',
    'authored', 'signed', 'appears_in', 'referenced_in',
    'connected_to', 'same_as'
  ];
  return validTypes.includes(type as RelationshipType) ? type as RelationshipType : 'connected_to';
}

// ============================================
// COST ESTIMATION (client-side)
// ============================================

export function estimateAnalysisCost(textLength: number): {
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
} {
  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(textLength / 4) + 2000; // +2000 for prompt
  const outputTokens = Math.min(4096, Math.ceil(inputTokens * 0.3)); // ~30% of input

  const cost = (inputTokens / 1000) * 0.003 +
               (outputTokens / 1000) * 0.015;

  return {
    estimatedCost: Math.round(cost * 10000) / 10000,
    inputTokens,
    outputTokens
  };
}

// ============================================
// EXPORTS
// ============================================

export const ClaudeAnalyzer = {
  analyzeDocument: analyzeDocumentWithClaude,
  performDeepAnalysis,
  answerQuestion,
  estimateCost: estimateAnalysisCost,
};

export default ClaudeAnalyzer;
