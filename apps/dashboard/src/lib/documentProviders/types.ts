// ═══ SPRINT 16: TARA Protocol — Shared Types ═══
// Document provider abstraction layer for multi-source record synthesis

export type DocumentType =
  | 'court_record'
  | 'foia'
  | 'leaked'
  | 'financial'
  | 'deposition'
  | 'indictment'
  | 'correspondence'
  | 'media'
  | 'academic'
  | 'other';

export type SourceType =
  | 'manual'
  | 'courtlistener'
  | 'icij'
  | 'opensanctions'
  | 'documentcloud'
  | 'community';

export type ScanStatus = 'pending' | 'scanning' | 'scanned' | 'failed' | 'needs_review';

/**
 * Options for searching documents across providers
 */
export interface SearchOptions {
  page?: number;
  limit?: number;
  documentType?: DocumentType;
  dateFrom?: string;
  dateTo?: string;
  country?: string;
}

/**
 * Search result from a document provider
 * Lightweight metadata for display in search UI
 */
export interface SearchResult {
  externalId: string; // Provider's document ID
  title: string;
  description?: string;
  date?: string; // ISO 8601
  source: SourceType;
  url?: string; // Link to original source
  documentType: DocumentType;
  relevanceScore?: number; // 0-1, used for sorting
  metadata?: Record<string, unknown>; // Provider-specific fields
}

/**
 * Full document details including extracted content
 * Extends SearchResult with additional data
 */
export interface DocumentDetail extends SearchResult {
  fullText?: string; // Extracted or OCR'd text
  rawContent?: string; // Full raw content fetched at import time (no size cap)
  relatedEntities?: Array<{
    name: string;
    type: string;
    role?: string;
  }>;
}

/**
 * NER/Entity extraction result from document scanning
 * Used by TARA protocol for knowledge graph synthesis
 */
export interface ScanResult {
  entities: Array<{
    name: string;
    type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'account';
    role?: string; // e.g., "CEO", "agent", "victim"
    confidence: number; // 0-1
    context?: string; // Sentence snippet
  }>;
  relationships: Array<{
    sourceName: string;
    targetName: string;
    relationshipType: string; // "owns", "controls", "received_from", etc.
    evidenceType: string; // Maps to link.evidence_type
    description?: string;
    confidence: number; // 0-1
  }>;
  summary: string; // TL;DR of document
  keyDates: Array<{
    date: string; // ISO 8601
    description: string;
  }>;
  confidence: number; // Overall extraction quality 0-1
}

/**
 * Interface for document providers
 * Each provider implements search and retrieval
 */
export interface DocumentProvider {
  name: SourceType;
  displayName: string;
  isAvailable(): boolean;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getDocument(externalId: string): Promise<DocumentDetail | null>;
}
