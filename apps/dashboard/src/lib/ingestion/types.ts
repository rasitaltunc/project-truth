// ==========================================
// PROJECT TRUTH - INGESTION PIPELINE TYPES
// ==========================================

// Document kategorileri (rapordaki Vector A-D)
export type DocumentCategory =
  | 'FLIGHT_LOG'      // El yazısı uçuş kayıtları - VLM gerektirir
  | 'FINANCIAL'       // Banka kayıtları, wire transfers - Tablo extraction
  | 'EMAIL'           // E-posta zincirleri - Regex parsing
  | 'LEGAL'           // Mahkeme dosyaları, depositions - Standart OCR
  | 'UNKNOWN';        // Kategorize edilemedi

// İşleme durumları
export type ProcessingStatus =
  | 'PENDING'         // Sırada bekliyor
  | 'FILTERING'       // Stage 1-2: Filtreleniyor
  | 'PROCESSING'      // Stage 3: OCR/Extraction
  | 'VALIDATING'      // Stage 4: Redaction kontrolü
  | 'COMPLETED'       // Stage 5: Graph'a eklendi
  | 'REJECTED'        // Çöp olarak işaretlendi
  | 'QUARANTINE'      // Redaction sorunu - manuel inceleme
  | 'ERROR';          // Hata oluştu

// Çöp kategorileri
export type RejectReason =
  | 'DUPLICATE'           // MD5/MinHash ile tespit
  | 'HEAVILY_REDACTED'    // >80% siyah piksel
  | 'PROCEDURAL_FILLER'   // "Motion to Dismiss" vs
  | 'LOW_VALUE'           // <50 kelime, içerik yok
  | 'CORRUPTED';          // Dosya bozuk

// Stage 1-2 filtreleme sonucu
export interface FilterResult {
  passed: boolean;
  rejectReason?: RejectReason;
  category: DocumentCategory;
  confidence: number;       // 0-1 arası
  pageCount: number;
  wordCount: number;
  blackPixelRatio: number;  // 0-1 arası
  hasText: boolean;
  hasTables: boolean;
  detectedKeywords: string[];
}

// OCR sonucu
export interface OCRResult {
  fullText: string;
  pages: PageResult[];
  confidence: number;
  processingTimeMs: number;
}

export interface PageResult {
  pageNumber: number;
  text: string;
  tables?: TableData[];
  entities?: ExtractedEntity[];
}

export interface TableData {
  rows: string[][];
  headers?: string[];
  confidence: number;
}

// Entity extraction sonucu
export interface ExtractedEntity {
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'MONEY' | 'FLIGHT' | 'ACCOUNT';
  value: string;
  normalizedValue?: string;  // "G. Maxwell" -> "Ghislaine Maxwell"
  confidence: number;
  boundingBox?: BoundingBox;
  isRedacted?: boolean;      // Sansürlü mü?
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Graph node/edge için
export interface GraphNode {
  id?: string;
  label: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'document';
  tier?: number;
  risk_score?: number;
  metadata?: Record<string, unknown>;
  source_document_id?: string;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  relationship: string;
  weight?: number;
  evidence_date?: string;
  source_document_id?: string;
}

// Tam işleme sonucu
export interface ProcessingResult {
  documentId: string;
  filename: string;
  status: ProcessingStatus;
  filterResult?: FilterResult;
  ocrResult?: OCRResult;
  extractedEntities: ExtractedEntity[];
  createdNodes: GraphNode[];
  createdEdges: GraphEdge[];
  quarantineReasons?: string[];
  errorMessage?: string;
  processingTimeMs: number;
}

// CourtListener API types
export interface CourtListenerDocument {
  id: number;
  docket: string;
  case_name: string;
  date_filed: string;
  court: string;
  filepath_pdf_url?: string;
  plain_text?: string;
}

export interface CourtListenerSearchResult {
  count: number;
  next?: string;
  previous?: string;
  results: CourtListenerDocument[];
}
