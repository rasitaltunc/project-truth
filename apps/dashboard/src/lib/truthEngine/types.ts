// ============================================
// THE TRUTH ENGINE - Core Type Definitions
// PROJECT TRUTH's AI Brain
// ============================================
// Bu dosya, tüm sistemin temelini oluşturan type tanımlarını içerir.
// Gelecek nesillere miras: Her şey strongly-typed ve self-documenting.
// ============================================

// ============================================
// ENTITY TYPES - Bilgi Grafiğinin Temel Taşları
// ============================================

export type EntityType =
  | 'person'           // Bireyler
  | 'organization'     // Şirketler, vakıflar, devlet kurumları
  | 'location'         // Yerler, adresler, ülkeler
  | 'event'            // Olaylar, toplantılar, kazalar
  | 'document'         // Belgeler, kanıtlar
  | 'asset'            // Varlıklar: uçaklar, yatlar, gayrimenkuller
  | 'financial'        // Finansal: hesaplar, transferler, şirketler
  | 'media'            // Medya: fotoğraflar, videolar, haberler
  | 'communication';   // İletişim: emailler, mesajlar, aramalar

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];              // Alternatif isimler
  description?: string;

  // Metadata
  firstSeen: Date;                // İlk görüldüğü tarih
  lastUpdated: Date;
  sourceCount: number;            // Kaç kaynakta geçiyor
  confidence: number;             // 0-100 güvenilirlik skoru

  // AI-generated
  embedding?: number[];           // Vector embedding for similarity
  extractedFrom?: string[];       // Hangi belgelerden çıkarıldı

  // Type-specific data
  properties: Record<string, any>;

  // Verification
  verificationStatus: 'unverified' | 'community_verified' | 'expert_verified' | 'disputed';
  verifiedBy?: string[];
  disputeReasons?: string[];
}

// ============================================
// RELATIONSHIP TYPES - Bağlantılar
// ============================================

export type RelationshipType =
  // Kişisel ilişkiler
  | 'family'           // Aile
  | 'friend'           // Arkadaş
  | 'romantic'         // Romantik
  | 'associate'        // İş arkadaşı

  // Profesyonel ilişkiler
  | 'employer'         // İşveren
  | 'employee'         // Çalışan
  | 'board_member'     // Yönetim kurulu
  | 'founder'          // Kurucu
  | 'investor'         // Yatırımcı
  | 'advisor'          // Danışman
  | 'client'           // Müşteri
  | 'partner'          // Ortak

  // Finansal ilişkiler
  | 'funded'           // Fonladı
  | 'received_funds'   // Fon aldı
  | 'owns'             // Sahip
  | 'owned_by'         // Sahibi
  | 'transaction'      // İşlem yaptı

  // Mekansal ilişkiler
  | 'visited'          // Ziyaret etti
  | 'lives_at'         // Yaşıyor
  | 'worked_at'        // Çalıştı
  | 'headquartered'    // Merkezi

  // Olay ilişkileri
  | 'attended'         // Katıldı
  | 'organized'        // Organize etti
  | 'witnessed'        // Tanık oldu
  | 'mentioned_in'     // Bahsedildi

  // Belge ilişkileri
  | 'authored'         // Yazdı
  | 'signed'           // İmzaladı
  | 'appears_in'       // Görünüyor
  | 'referenced_in'    // Referans verildi

  // Genel
  | 'connected_to'     // Bağlantılı (belirsiz)
  | 'same_as';         // Aynı entity (dedupe)

export interface Relationship {
  id: string;
  type: RelationshipType;

  // Bağlantı
  sourceEntityId: string;
  targetEntityId: string;

  // Detaylar
  description?: string;
  startDate?: Date;
  endDate?: Date;
  ongoing: boolean;

  // Kanıtlar
  evidenceIds: string[];          // Bu ilişkiyi destekleyen belgeler
  confidence: number;             // 0-100

  // Metadata
  createdAt: Date;
  createdBy: string;              // User ID veya 'ai_extracted'
  verificationStatus: 'unverified' | 'verified' | 'disputed';

  // AI-specific
  aiGenerated: boolean;
  aiConfidence?: number;
  aiReasoning?: string;           // Neden bu bağlantıyı önerdi
}

// ============================================
// DOCUMENT & EVIDENCE TYPES
// ============================================

export type DocumentType =
  | 'text'             // Düz metin
  | 'pdf'              // PDF belgesi
  | 'image'            // Fotoğraf
  | 'video'            // Video
  | 'audio'            // Ses kaydı
  | 'webpage'          // Web sayfası
  | 'news_article'     // Haber
  | 'court_document'   // Mahkeme belgesi
  | 'financial_record' // Finansal kayıt
  | 'flight_log'       // Uçuş kaydı
  | 'email'            // Email
  | 'social_media'     // Sosyal medya
  | 'leaked_document'  // Sızdırılmış belge
  | 'official_record'  // Resmi kayıt
  | 'other';

export interface Document {
  id: string;
  type: DocumentType;

  // İçerik
  title: string;
  content?: string;               // Extracted text
  originalUrl?: string;
  fileHash?: string;              // Dedupe için SHA-256

  // Metadata
  sourceDate?: Date;              // Belgenin tarihi
  uploadedAt: Date;
  uploadedBy: string;

  // İşleme durumu
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingLevel: 'none' | 'local' | 'embedding' | 'ai_analyzed';

  // AI sonuçları
  embedding?: number[];
  extractedEntities?: ExtractedEntity[];
  extractedRelationships?: ExtractedRelationship[];
  summary?: string;
  keyFacts?: string[];

  // Güvenilirlik
  sourceReliability: 'unknown' | 'low' | 'medium' | 'high' | 'verified';
  verificationNotes?: string;

  // Bağlantılar
  relatedDocumentIds?: string[];
  mentionedEntityIds?: string[];
}

// ============================================
// AI EXTRACTION TYPES
// ============================================

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  aliases?: string[];
  confidence: number;             // 0-100
  context: string;                // Belgede geçtiği bağlam
  startIndex?: number;            // Belgedeki pozisyon
  endIndex?: number;

  // Eşleşme
  matchedEntityId?: string;       // Mevcut entity ile eşleşti mi?
  isNewEntity: boolean;

  // AI reasoning
  extractionReason?: string;
}

export interface ExtractedRelationship {
  sourceEntityName: string;
  targetEntityName: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidence: string;               // Belgeden alıntı
  reasoning: string;              // AI'ın mantığı

  // Eşleşme
  sourceEntityId?: string;
  targetEntityId?: string;
}

export interface ExtractionResult {
  documentId: string;
  processingTime: number;         // ms
  processingLevel: 'local' | 'embedding' | 'ai';
  cost: number;                   // USD cinsinden maliyet

  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  summary: string;
  keyFacts: string[];
  suggestedConnections: SuggestedConnection[];

  // Metadata
  modelUsed?: string;
  tokensUsed?: number;
}

// ============================================
// INVESTIGATION LEAD TYPES
// ============================================

export interface SuggestedConnection {
  type: 'entity_link' | 'pattern' | 'anomaly' | 'timeline_gap' | 'network_cluster';

  // İlgili entity'ler
  entityIds: string[];

  // Açıklama
  title: string;
  description: string;
  reasoning: string;

  // Öncelik
  confidence: number;
  importance: 'low' | 'medium' | 'high' | 'critical';

  // Doğrulama
  suggestedActions: string[];
  relatedDocuments: string[];
}

export interface InvestigationLead {
  id: string;
  type: 'connection' | 'pattern' | 'anomaly' | 'timeline' | 'network';

  title: string;
  summary: string;
  detailedAnalysis: string;

  // İlgili öğeler
  involvedEntities: string[];
  involvedDocuments: string[];
  suggestedConnections: SuggestedConnection[];

  // Öncelik ve durum
  priority: number;               // 1-100
  status: 'new' | 'investigating' | 'verified' | 'dismissed';

  // AI metadata
  generatedAt: Date;
  generatedBy: 'nightly_job' | 'user_query' | 'pattern_detection';
  aiConfidence: number;

  // Community feedback
  upvotes: number;
  downvotes: number;
  comments: string[];
}

// ============================================
// PROCESSING QUEUE TYPES
// ============================================

export interface ProcessingJob {
  id: string;
  type: 'document_extraction' | 'entity_enrichment' | 'relationship_discovery' | 'lead_generation';

  // İşlenecek öğe
  targetId: string;
  targetType: 'document' | 'entity' | 'batch';

  // Öncelik
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Durum
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;

  // Zamanlama
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Maliyet tahmini
  estimatedCost: number;
  actualCost?: number;
}

// ============================================
// CACHE TYPES
// ============================================

export interface EntityCache {
  entityId: string;
  entityName: string;
  normalizedName: string;         // Lowercase, no special chars
  embedding: number[];
  lastAccessed: Date;
  accessCount: number;
}

export interface QueryCache {
  queryHash: string;
  query: string;
  result: any;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface SimilarityCache {
  documentHash: string;
  similarDocuments: Array<{
    documentId: string;
    similarity: number;
  }>;
  computedAt: Date;
}

// ============================================
// COST TRACKING TYPES
// ============================================

export interface CostRecord {
  id: string;
  timestamp: Date;
  operation: 'embedding' | 'extraction' | 'analysis' | 'query';

  // Detaylar
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;

  // Maliyet
  cost: number;                   // USD

  // İlişkili
  userId?: string;
  documentId?: string;
  jobId?: string;
}

export interface CostSummary {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;

  totalCost: number;
  byOperation: Record<string, number>;
  byModel: Record<string, number>;

  documentsProcessed: number;
  entitiesExtracted: number;
  queriesAnswered: number;

  // Efficiency metrics
  cacheHitRate: number;
  avgCostPerDocument: number;
  avgCostPerQuery: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface TruthEngineResponse<T> {
  success: boolean;
  data?: T;
  error?: string;

  // Processing info
  processingTime: number;
  cacheHit: boolean;
  cost: number;
  processingLevel: 'cache' | 'local' | 'embedding' | 'ai';
}

export interface SearchResult {
  entities: Entity[];
  documents: Document[];
  relationships: Relationship[];
  suggestedQueries: string[];
  totalResults: number;
}

export interface AnalysisResult {
  summary: string;
  keyFindings: string[];
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  suggestedInvestigations: SuggestedConnection[];
  confidenceScore: number;
}
