// ==========================================
// PROJECT TRUTH - DOCUMENT PROCESSOR
// 5 Aşamalı Ingestion Pipeline
// ==========================================

import {
  DocumentCategory,
  ProcessingStatus,
  RejectReason,
  FilterResult,
  ProcessingResult,
  ExtractedEntity,
  GraphNode,
  GraphEdge,
} from './types';
import { performOCR, performBatchOCR } from './google-vision';
import { createClient } from '@supabase/supabase-js';

// Supabase client (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==========================================
// KEYWORD PATTERNS (Filtreleme için)
// ==========================================

const PROCEDURAL_KEYWORDS = [
  'motion to dismiss',
  'motion for extension',
  'certificate of service',
  'notice of appearance',
  'pro hac vice',
  'stipulation',
  'scheduling order',
  'case management',
];

const FINANCIAL_KEYWORDS = [
  'wire transfer',
  'bank statement',
  'account number',
  'iban',
  'swift',
  'jpmorgan',
  'deutsche bank',
  'transaction',
  'deposit',
  'withdrawal',
  'total amount',
  'balance',
];

const FLIGHT_KEYWORDS = [
  'n908je',    // Epstein'ın uçağı
  'n212jf',
  'flight log',
  'passenger',
  'pilot',
  'departure',
  'arrival',
  'manifest',
  'tail number',
];

const EMAIL_KEYWORDS = [
  'from:',
  'to:',
  'sent:',
  'subject:',
  're:',
  'fwd:',
  '@gmail',
  '@yahoo',
  '@hotmail',
];

// ==========================================
// STAGE 1 & 2: FILTRELEME
// ==========================================

/**
 * Belgeyi kategorize et ve filtrele
 * Cost: $0 (yerel işlem)
 */
export async function filterDocument(
  filename: string,
  textContent: string,
  blackPixelRatio: number = 0
): Promise<FilterResult> {
  const lowerText = textContent.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  // 1. Dosya adı kontrolü (Procedural Filler)
  const isProcedural = PROCEDURAL_KEYWORDS.some(
    kw => lowerFilename.includes(kw.replace(/\s+/g, '_')) ||
          lowerFilename.includes(kw.replace(/\s+/g, '-'))
  );

  if (isProcedural) {
    return {
      passed: false,
      rejectReason: 'PROCEDURAL_FILLER' as RejectReason,
      category: 'LEGAL',
      confidence: 0.9,
      pageCount: 1,
      wordCount,
      blackPixelRatio,
      hasText: wordCount > 0,
      hasTables: false,
      detectedKeywords: [],
    };
  }

  // 2. Siyah piksel kontrolü (Heavily Redacted)
  if (blackPixelRatio > 0.8) {
    return {
      passed: false,
      rejectReason: 'HEAVILY_REDACTED' as RejectReason,
      category: 'UNKNOWN',
      confidence: 0.95,
      pageCount: 1,
      wordCount,
      blackPixelRatio,
      hasText: false,
      hasTables: false,
      detectedKeywords: [],
    };
  }

  // 3. Düşük içerik kontrolü
  if (wordCount < 50 && blackPixelRatio < 0.1) {
    return {
      passed: false,
      rejectReason: 'LOW_VALUE' as RejectReason,
      category: 'UNKNOWN',
      confidence: 0.8,
      pageCount: 1,
      wordCount,
      blackPixelRatio,
      hasText: wordCount > 0,
      hasTables: false,
      detectedKeywords: [],
    };
  }

  // 4. Kategori tespiti
  const detectedKeywords: string[] = [];
  let category: DocumentCategory = 'LEGAL';
  let confidence = 0.6;

  // Flight log kontrolü
  const flightMatches = FLIGHT_KEYWORDS.filter(kw => lowerText.includes(kw));
  if (flightMatches.length >= 2) {
    category = 'FLIGHT_LOG';
    confidence = 0.85;
    detectedKeywords.push(...flightMatches);
  }

  // Financial kontrolü
  const financialMatches = FINANCIAL_KEYWORDS.filter(kw => lowerText.includes(kw));
  if (financialMatches.length >= 3 && category !== 'FLIGHT_LOG') {
    category = 'FINANCIAL';
    confidence = 0.8;
    detectedKeywords.push(...financialMatches);
  }

  // Email kontrolü
  const emailMatches = EMAIL_KEYWORDS.filter(kw => lowerText.includes(kw));
  if (emailMatches.length >= 2 && category === 'LEGAL') {
    category = 'EMAIL';
    confidence = 0.75;
    detectedKeywords.push(...emailMatches);
  }

  // Tablo tespiti (basit heuristik)
  const hasTables = /\t.*\t|\|.*\|/.test(textContent) ||
                    (textContent.match(/\$[\d,]+/g)?.length || 0) > 5;

  return {
    passed: true,
    category,
    confidence,
    pageCount: 1,
    wordCount,
    blackPixelRatio,
    hasText: true,
    hasTables,
    detectedKeywords: [...new Set(detectedKeywords)],
  };
}

// ==========================================
// STAGE 3: PROCESSING (OCR & Extraction)
// ==========================================

/**
 * Kategoriye göre belgeyi işle
 */
export async function processDocument(
  documentId: string,
  filename: string,
  imagePages: string[], // base64 encoded images
  filterResult: FilterResult
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const result: ProcessingResult = {
    documentId,
    filename,
    status: 'PROCESSING',
    filterResult,
    extractedEntities: [],
    createdNodes: [],
    createdEdges: [],
    processingTimeMs: 0,
  };

  try {
    // OCR yap
    const ocrResult = imagePages.length === 1
      ? await performOCR(imagePages[0])
      : await performBatchOCR(imagePages);

    result.ocrResult = ocrResult;

    // Entity extraction
    const allEntities: ExtractedEntity[] = [];
    ocrResult.pages.forEach(page => {
      if (page.entities) {
        allEntities.push(...page.entities);
      }
    });

    // Kategori-spesifik extraction
    switch (filterResult.category) {
      case 'FLIGHT_LOG':
        allEntities.push(...extractFlightEntities(ocrResult.fullText));
        break;
      case 'FINANCIAL':
        allEntities.push(...extractFinancialEntities(ocrResult.fullText));
        break;
      case 'EMAIL':
        allEntities.push(...extractEmailEntities(ocrResult.fullText));
        break;
    }

    result.extractedEntities = deduplicateEntities(allEntities);
    result.status = 'VALIDATING';

  } catch (error) {
    result.status = 'ERROR';
    result.errorMessage = error instanceof Error ? error.message : 'Processing failed';
  }

  result.processingTimeMs = Date.now() - startTime;
  return result;
}

// ==========================================
// STAGE 4: SAFETY VALVE (Redaction Check)
// ==========================================

/**
 * Redaction kontrolü yap
 * Sansürlü içerik tespit edilirse QUARANTINE'e al
 */
export async function validateRedactions(
  result: ProcessingResult,
  hasVisualRedactions: boolean = false
): Promise<ProcessingResult> {
  if (!hasVisualRedactions) {
    result.status = 'COMPLETED';
    return result;
  }

  const quarantineReasons: string[] = [];

  // Eğer görsel sansür var ama metin de varsa -> potansiyel sızıntı
  result.extractedEntities.forEach(entity => {
    if (entity.type === 'PERSON' && entity.confidence > 0.8) {
      // Bilinen korunan isimler listesi (örnekler)
      const protectedPatterns = [
        /minor/i,
        /jane doe/i,
        /john doe/i,
        /victim \d+/i,
      ];

      const isProtected = protectedPatterns.some(p => p.test(entity.value));

      if (isProtected) {
        entity.isRedacted = true;
        quarantineReasons.push(`Protected entity detected: ${entity.value}`);
      }
    }
  });

  if (quarantineReasons.length > 0) {
    result.status = 'QUARANTINE';
    result.quarantineReasons = quarantineReasons;
  } else {
    result.status = 'COMPLETED';
  }

  return result;
}

// ==========================================
// STAGE 5: GRAPH INTEGRATION
// ==========================================

/**
 * Extracted entity'leri graph node'larına dönüştür
 */
export async function integrateToGraph(
  result: ProcessingResult
): Promise<ProcessingResult> {
  if (result.status !== 'COMPLETED') {
    return result;
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Entity'lerden node oluştur
  for (const entity of result.extractedEntities) {
    if (entity.isRedacted) continue;

    if (entity.type === 'PERSON') {
      const node: GraphNode = {
        label: entity.normalizedValue || entity.value,
        type: 'person',
        tier: 3, // Varsayılan - sonra güncellenir
        risk_score: 0.5,
        source_document_id: result.documentId,
        metadata: {
          confidence: entity.confidence,
          extractedFrom: result.filename,
        },
      };
      nodes.push(node);
    }

    if (entity.type === 'ORGANIZATION') {
      nodes.push({
        label: entity.value,
        type: 'organization',
        tier: 3,
        source_document_id: result.documentId,
      });
    }

    if (entity.type === 'LOCATION') {
      nodes.push({
        label: entity.value,
        type: 'location',
        source_document_id: result.documentId,
      });
    }
  }

  // Supabase'e kaydet
  try {
    for (const node of nodes) {
      // Önce var mı kontrol et
      const { data: existing } = await supabase
        .from('truth_nodes')
        .select('id')
        .eq('label', node.label)
        .single();

      if (!existing) {
        const { data, error } = await supabase
          .from('truth_nodes')
          .insert({
            label: node.label,
            type: node.type,
            tier: node.tier,
            risk_score: node.risk_score,
            metadata: node.metadata,
          })
          .select()
          .single();

        if (data) {
          node.id = data.id;
        }
      } else {
        node.id = existing.id;
      }
    }

    result.createdNodes = nodes;
    result.createdEdges = edges;

  } catch (error) {
    console.error('Graph integration error:', error);
  }

  return result;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function extractFlightEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Yolcu isimleri (uçuş loglarında genellikle büyük harfle yazılır)
  const passengerRegex = /(?:passenger|pax|guest)s?:?\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/gi;
  let match;
  while ((match = passengerRegex.exec(text)) !== null) {
    entities.push({
      type: 'PERSON',
      value: match[1].trim(),
      confidence: 0.7,
    });
  }

  // Lokasyonlar
  const locationRegex = /(?:from|to|dep|arr|destination)[\s:]+([A-Z]{3,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  while ((match = locationRegex.exec(text)) !== null) {
    entities.push({
      type: 'LOCATION',
      value: match[1].trim(),
      confidence: 0.75,
    });
  }

  return entities;
}

function extractFinancialEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Banka isimleri
  const bankRegex = /(?:jp\s?morgan|deutsche\s?bank|citibank|wells\s?fargo|bank\s+of\s+america)/gi;
  let match;
  while ((match = bankRegex.exec(text)) !== null) {
    entities.push({
      type: 'ORGANIZATION',
      value: match[0].trim(),
      normalizedValue: normalizeBankName(match[0]),
      confidence: 0.9,
    });
  }

  return entities;
}

function extractEmailEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Email adresleri
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({
      type: 'PERSON',
      value: match[0],
      confidence: 0.95,
    });
  }

  // From/To header'larından isim çıkar
  const headerRegex = /(?:from|to):\s*"?([^"<\n]+)"?\s*<?/gi;
  while ((match = headerRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && !name.includes('@')) {
      entities.push({
        type: 'PERSON',
        value: name,
        confidence: 0.8,
      });
    }
  }

  return entities;
}

function normalizeBankName(name: string): string {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ');
  if (normalized.includes('jpmorgan') || normalized.includes('jp morgan')) {
    return 'JPMorgan Chase';
  }
  if (normalized.includes('deutsche')) {
    return 'Deutsche Bank';
  }
  return name;
}

function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Map<string, ExtractedEntity>();

  for (const entity of entities) {
    const key = `${entity.type}:${(entity.normalizedValue || entity.value).toLowerCase()}`;

    if (!seen.has(key) || seen.get(key)!.confidence < entity.confidence) {
      seen.set(key, entity);
    }
  }

  return Array.from(seen.values());
}

// ==========================================
// FULL PIPELINE
// ==========================================

/**
 * Tam pipeline'ı çalıştır
 */
export async function runFullPipeline(
  documentId: string,
  filename: string,
  textContent: string,
  imagePages: string[],
  blackPixelRatio: number = 0
): Promise<ProcessingResult> {
  // Stage 1-2: Filter
  const filterResult = await filterDocument(filename, textContent, blackPixelRatio);

  if (!filterResult.passed) {
    return {
      documentId,
      filename,
      status: 'REJECTED',
      filterResult,
      extractedEntities: [],
      createdNodes: [],
      createdEdges: [],
      processingTimeMs: 0,
    };
  }

  // Stage 3: Process
  let result = await processDocument(documentId, filename, imagePages, filterResult);

  // Stage 4: Validate
  result = await validateRedactions(result, blackPixelRatio > 0.3);

  // Stage 5: Integrate (sadece COMPLETED olanlar)
  if (result.status === 'COMPLETED') {
    result = await integrateToGraph(result);
  }

  return result;
}
