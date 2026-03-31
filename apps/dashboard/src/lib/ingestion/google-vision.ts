// ==========================================
// PROJECT TRUTH - GOOGLE CLOUD VISION API
// ==========================================

import { OCRResult, PageResult, TableData, ExtractedEntity } from './types';

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

interface VisionAPIRequest {
  requests: Array<{
    image: {
      content?: string;  // base64 encoded
      source?: {
        imageUri?: string;
        gcsImageUri?: string;
      };
    };
    features: Array<{
      type: string;
      maxResults?: number;
    }>;
  }>;
}

interface VisionAPIResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
      pages: Array<{
        blocks: Array<{
          paragraphs: Array<{
            words: Array<{
              symbols: Array<{
                text: string;
                confidence: number;
              }>;
            }>;
          }>;
        }>;
      }>;
    };
    textAnnotations?: Array<{
      description: string;
      boundingPoly: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

/**
 * Google Cloud Vision ile OCR yap
 * @param imageBase64 - Base64 encoded image (PDF sayfası veya resim)
 * @returns OCR sonucu
 */
export async function performOCR(imageBase64: string): Promise<OCRResult> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY is not set');
  }

  const startTime = Date.now();

  const request: VisionAPIRequest = {
    requests: [
      {
        image: {
          content: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },  // En iyi OCR modu
          { type: 'TEXT_DETECTION' },           // Fallback
        ],
      },
    ],
  };

  const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Vision API error: ${response.status} - ${error}`);
  }

  const data: VisionAPIResponse = await response.json();
  const result = data.responses[0];

  if (result.error) {
    throw new Error(`Vision API error: ${result.error.message}`);
  }

  const fullText = result.fullTextAnnotation?.text ||
                   result.textAnnotations?.[0]?.description ||
                   '';

  // Confidence hesapla
  let totalConfidence = 0;
  let symbolCount = 0;

  result.fullTextAnnotation?.pages?.forEach(page => {
    page.blocks?.forEach(block => {
      block.paragraphs?.forEach(para => {
        para.words?.forEach(word => {
          word.symbols?.forEach(symbol => {
            totalConfidence += symbol.confidence || 0.8;
            symbolCount++;
          });
        });
      });
    });
  });

  const avgConfidence = symbolCount > 0 ? totalConfidence / symbolCount : 0.5;

  return {
    fullText,
    pages: [{
      pageNumber: 1,
      text: fullText,
      tables: [], // Tablo detection ayrı yapılacak
      entities: extractEntitiesFromText(fullText),
    }],
    confidence: avgConfidence,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Birden fazla sayfa için batch OCR
 * @param pages - Base64 encoded images array
 * @returns OCR sonuçları
 */
export async function performBatchOCR(pages: string[]): Promise<OCRResult> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY is not set');
  }

  const startTime = Date.now();
  const pageResults: PageResult[] = [];
  let allText = '';
  let totalConfidence = 0;

  // 16 sayfa sınırı (Google API batch limit)
  const BATCH_SIZE = 16;

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);

    const request: VisionAPIRequest = {
      requests: batch.map(page => ({
        image: {
          content: page.replace(/^data:image\/\w+;base64,/, ''),
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
        ],
      })),
    };

    const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Vision API batch error: ${response.status}`);
    }

    const data: VisionAPIResponse = await response.json();

    data.responses.forEach((result, idx) => {
      const pageNum = i + idx + 1;
      const text = result.fullTextAnnotation?.text || '';

      allText += `\n--- PAGE ${pageNum} ---\n${text}`;

      pageResults.push({
        pageNumber: pageNum,
        text,
        entities: extractEntitiesFromText(text),
      });

      // Confidence ortalaması
      if (result.fullTextAnnotation?.pages?.[0]) {
        totalConfidence += 0.85; // Varsayılan confidence
      }
    });
  }

  return {
    fullText: allText.trim(),
    pages: pageResults,
    confidence: pageResults.length > 0 ? totalConfidence / pageResults.length : 0,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Metinden temel entity'leri çıkar (basit regex tabanlı)
 * Daha gelişmiş NER için ayrı bir servis kullanılabilir
 */
function extractEntitiesFromText(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Para miktarları
  const moneyRegex = /\$[\d,]+\.?\d*|\€[\d,]+\.?\d*|USD\s*[\d,]+/gi;
  const moneyMatches = text.match(moneyRegex) || [];
  moneyMatches.forEach(match => {
    entities.push({
      type: 'MONEY',
      value: match,
      confidence: 0.9,
    });
  });

  // Tarihler
  const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi;
  const dateMatches = text.match(dateRegex) || [];
  dateMatches.forEach(match => {
    entities.push({
      type: 'DATE',
      value: match,
      confidence: 0.85,
    });
  });

  // Uçuş numaraları (N-numbers)
  const flightRegex = /\bN\d{3,5}[A-Z]{0,2}\b/gi;
  const flightMatches = text.match(flightRegex) || [];
  flightMatches.forEach(match => {
    entities.push({
      type: 'FLIGHT',
      value: match.toUpperCase(),
      confidence: 0.95,
    });
  });

  // IBAN / Hesap numaraları
  const accountRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b|\b\d{10,17}\b/gi;
  const accountMatches = text.match(accountRegex) || [];
  accountMatches.forEach(match => {
    if (match.length >= 10) {
      entities.push({
        type: 'ACCOUNT',
        value: match,
        confidence: 0.7,
      });
    }
  });

  return entities;
}

/**
 * API key'in geçerli olup olmadığını kontrol et
 */
export async function testVisionAPI(): Promise<boolean> {
  if (!GOOGLE_VISION_API_KEY) {
    console.error('GOOGLE_VISION_API_KEY is not set');
    return false;
  }

  try {
    // Minimal test - boş bir istek gönder
    const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [] }),
    });

    // 400 bile olsa API key çalışıyor demektir (boş request)
    return response.status !== 403 && response.status !== 401;
  } catch (error) {
    console.error('Vision API test failed:', error);
    return false;
  }
}
