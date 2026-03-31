/**
 * Google Cloud Document AI Wrapper
 * Sprint GCS — "Silah Yükseltmesi"
 *
 * Server-side OCR — Tesseract'tan 10x daha iyi kalite.
 * Mahkeme belgeleri, FBI dosyaları, resmi evraklar için optimize.
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// ─── Configuration ────────────────────────────────────

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_REGION = process.env.GCP_REGION || 'us';
const PROCESSOR_ID = process.env.GCP_DOCUMENT_AI_PROCESSOR_ID;

let _client: DocumentProcessorServiceClient | null = null;

function getClient(): DocumentProcessorServiceClient | null {
  if (_client) return _client;

  if (!GCP_PROJECT_ID || !PROCESSOR_ID) {
    console.warn('[DocumentAI] GCP_PROJECT_ID or PROCESSOR_ID not set — Document AI disabled');
    return null;
  }

  try {
    const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const apiEndpoint = `${GCP_REGION}-documentai.googleapis.com`;

    if (keyJson) {
      const credentials = JSON.parse(keyJson);
      _client = new DocumentProcessorServiceClient({ credentials, apiEndpoint });
    } else if (keyFile) {
      _client = new DocumentProcessorServiceClient({ keyFilename: keyFile, apiEndpoint });
    } else {
      _client = new DocumentProcessorServiceClient({ apiEndpoint });
    }

    return _client;
  } catch (err) {
    console.error('[DocumentAI] Failed to initialize client:', err);
    return null;
  }
}

// ─── Types ────────────────────────────────────────────

export interface DocumentAIPage {
  pageNumber: number;
  text: string;
  confidence: number;
  tables?: Array<{
    headerRows: string[][];
    bodyRows: string[][];
  }>;
  formFields?: Array<{
    name: string;
    value: string;
    confidence: number;
  }>;
}

export interface DocumentAIResult {
  text: string;
  confidence: number;
  pageCount: number;
  pages: DocumentAIPage[];
  language: string | null;
  processingTimeMs: number;
}

// ─── Public API ───────────────────────────────────────

/**
 * Check if Document AI is configured and available
 */
export function isDocumentAIAvailable(): boolean {
  return !!GCP_PROJECT_ID && !!PROCESSOR_ID;
}

/**
 * Process a document with Google Document AI OCR
 *
 * @param fileBuffer — Raw file bytes (PDF or image)
 * @param mimeType — e.g. 'application/pdf', 'image/jpeg'
 * @returns OCR result or null on failure
 */
export async function processWithDocumentAI(
  fileBuffer: Buffer,
  mimeType: string
): Promise<DocumentAIResult | null> {
  const client = getClient();
  if (!client) return null;

  const startTime = Date.now();

  // Document AI processor name
  const processorName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/processors/${PROCESSOR_ID}`;

  try {
    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType,
      },
    });

    const document = result.document;
    if (!document) {
      console.warn('[DocumentAI] No document in response');
      return null;
    }

    const fullText = document.text || '';

    // Extract page-level information
    const pages: DocumentAIPage[] = (document.pages || []).map((page, idx) => {
      // Get page text by extracting text segments
      let pageText = '';
      if (page.layout?.textAnchor?.textSegments) {
        for (const segment of page.layout.textAnchor.textSegments) {
          const startIdx = Number(segment.startIndex || 0);
          const endIdx = Number(segment.endIndex || 0);
          pageText += fullText.slice(startIdx, endIdx);
        }
      }

      // Extract tables
      const tables = (page.tables || []).map((table) => {
        const extractRows = (rows: typeof table.headerRows) =>
          (rows || []).map((row) =>
            (row.cells || []).map((cell) => {
              if (cell.layout?.textAnchor?.textSegments) {
                return cell.layout.textAnchor.textSegments
                  .map((seg) => fullText.slice(Number(seg.startIndex || 0), Number(seg.endIndex || 0)))
                  .join('');
              }
              return '';
            })
          );

        return {
          headerRows: extractRows(table.headerRows),
          bodyRows: extractRows(table.bodyRows),
        };
      });

      // Extract form fields
      const formFields = (page.formFields || []).map((field) => {
        const getName = () => {
          if (field.fieldName?.textAnchor?.textSegments) {
            return field.fieldName.textAnchor.textSegments
              .map((seg) => fullText.slice(Number(seg.startIndex || 0), Number(seg.endIndex || 0)))
              .join('')
              .trim();
          }
          return '';
        };

        const getValue = () => {
          if (field.fieldValue?.textAnchor?.textSegments) {
            return field.fieldValue.textAnchor.textSegments
              .map((seg) => fullText.slice(Number(seg.startIndex || 0), Number(seg.endIndex || 0)))
              .join('')
              .trim();
          }
          return '';
        };

        return {
          name: getName(),
          value: getValue(),
          confidence: field.fieldValue?.confidence || 0,
        };
      });

      return {
        pageNumber: idx + 1,
        text: pageText,
        confidence: page.layout?.confidence || 0,
        tables: tables.length > 0 ? tables : undefined,
        formFields: formFields.length > 0 ? formFields : undefined,
      };
    });

    // Overall confidence (average of page confidences)
    const avgConfidence = pages.length > 0
      ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
      : 0;

    // Detected language
    const detectedLanguage = document.pages?.[0]?.detectedLanguages?.[0]?.languageCode || null;

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[DocumentAI] Processed: ${pages.length} pages, ` +
      `${fullText.length} chars, confidence: ${(avgConfidence * 100).toFixed(1)}%, ` +
      `${processingTimeMs}ms`
    );

    return {
      text: fullText,
      confidence: avgConfidence,
      pageCount: pages.length,
      pages,
      language: detectedLanguage,
      processingTimeMs,
    };
  } catch (err) {
    console.error('[DocumentAI] Processing failed:', err);
    return null;
  }
}
