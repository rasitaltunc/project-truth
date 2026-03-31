/**
 * OCR Utility — Client-side text extraction using Tesseract.js + pdfjs
 *
 * Strategy:
 * 1. Text-based PDFs → use pdfjs text extraction (fast, accurate)
 * 2. Scanned/image PDFs → convert pages to canvas → Tesseract OCR
 * 3. Images → direct Tesseract OCR
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OCRResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingTimeMs: number;
  method: 'pdf_text' | 'ocr' | 'hybrid' | 'vision_needed';
}

export interface OCRProgress {
  stage: 'loading' | 'extracting' | 'recognizing' | 'done';
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

/** Get pdfjs from react-pdf (lazy, client-only) */
async function getPdfJs(): Promise<any> {
  const reactPdf = await import('react-pdf');
  const pdfjs = reactPdf.pdfjs;
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return pdfjs;
}

/** Safely stringify any error */
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message);
  try { return JSON.stringify(err); } catch { return String(err); }
}

/**
 * Main entry point
 */
export async function extractTextOCR(
  fileUrl: string,
  fileType: 'pdf' | 'image',
  onProgress?: (progress: OCRProgress) => void,
  language: string = 'tur+eng'
): Promise<OCRResult> {
  const startTime = Date.now();
  onProgress?.({ stage: 'loading', progress: 0, message: 'Dosya yükleniyor...' });

  if (fileType === 'image') {
    return extractFromImage(fileUrl, language, onProgress, startTime);
  }
  return extractFromPDF(fileUrl, language, onProgress, startTime);
}

/**
 * Image → Tesseract OCR
 */
async function extractFromImage(
  imageUrl: string,
  language: string,
  onProgress?: (progress: OCRProgress) => void,
  startTime: number = Date.now()
): Promise<OCRResult> {
  onProgress?.({ stage: 'recognizing', progress: 10, message: 'OCR başlatılıyor...' });

  const Tesseract = (await import('tesseract.js')).default;
  const worker = await Tesseract.createWorker(language, undefined, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.({
          stage: 'recognizing',
          progress: 10 + Math.round(m.progress * 85),
          message: `Metin tanınıyor... ${Math.round(m.progress * 100)}%`,
        });
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageUrl);
    onProgress?.({ stage: 'done', progress: 100, message: 'Tamamlandı!' });

    if (data.text.trim().length < 20) {
      return {
        text: data.text.trim() || '[Bu görsel metin içermiyor. AI görsel analizi gerekiyor.]',
        confidence: data.confidence / 100,
        pageCount: 1,
        processingTimeMs: Date.now() - startTime,
        method: 'vision_needed',
      };
    }

    return {
      text: data.text.trim(),
      confidence: data.confidence / 100,
      pageCount: 1,
      processingTimeMs: Date.now() - startTime,
      method: 'ocr',
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * PDF → text extraction + OCR fallback
 */
async function extractFromPDF(
  pdfUrl: string,
  language: string,
  onProgress?: (progress: OCRProgress) => void,
  startTime: number = Date.now()
): Promise<OCRResult> {

  // ── A: Fetch PDF ──
  let pdfData: ArrayBuffer;
  try {
    onProgress?.({ stage: 'loading', progress: 5, message: 'PDF indiriliyor...' });
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    pdfData = await response.arrayBuffer();
    console.log('[OCR] ✓ PDF fetched:', pdfData.byteLength, 'bytes');
  } catch (e: unknown) {
    throw new Error(`PDF indirilemedi: ${errMsg(e)}`);
  }

  // ── B: Load pdf.js via react-pdf ──
  let pdfjs: any;
  try {
    onProgress?.({ stage: 'loading', progress: 10, message: 'PDF motoru yükleniyor...' });
    pdfjs = await getPdfJs();
    console.log('[OCR] ✓ pdfjs loaded, version:', pdfjs.version);
  } catch (e: unknown) {
    throw new Error(`PDF motoru yüklenemedi: ${errMsg(e)}`);
  }

  // ── C: Parse PDF ──
  let pdf: any;
  try {
    onProgress?.({ stage: 'loading', progress: 15, message: 'PDF ayrıştırılıyor...' });
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    pdf = await loadingTask.promise;
    console.log('[OCR] ✓ PDF parsed, pages:', pdf.numPages);
  } catch (e: unknown) {
    throw new Error(`PDF okunamadı: ${errMsg(e)}`);
  }

  const totalPages = pdf.numPages;
  onProgress?.({
    stage: 'extracting', progress: 18, totalPages,
    message: `${totalPages} sayfa bulundu. Metin çıkarılıyor...`,
  });

  // ── D: Text extraction ──
  const pageTexts: string[] = [];
  let totalChars = 0;

  for (let i = 1; i <= totalPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();
      pageTexts.push(pageText);
      totalChars += pageText.length;
    } catch {
      pageTexts.push('');
    }

    onProgress?.({
      stage: 'extracting',
      progress: 18 + Math.round((i / totalPages) * 30),
      currentPage: i, totalPages,
      message: `Sayfa ${i}/${totalPages} okunuyor...`,
    });
  }

  console.log('[OCR] ✓ Text extraction done. Total chars:', totalChars, 'Avg/page:', Math.round(totalChars / totalPages));

  // Good text → return
  if (totalChars / totalPages > 50) {
    const fullText = pageTexts.map((t, i) => `--- SAYFA ${i + 1} ---\n${t}`).join('\n\n');
    onProgress?.({ stage: 'done', progress: 100, message: 'Metin çıkarıldı!' });
    return {
      text: fullText,
      confidence: 0.95,
      pageCount: totalPages,
      processingTimeMs: Date.now() - startTime,
      method: 'pdf_text',
    };
  }

  // ── E: OCR on rendered pages ──
  onProgress?.({
    stage: 'recognizing', progress: 50,
    message: 'Fotoğraf/taranmış PDF. OCR başlatılıyor...',
  });

  let Tesseract: any;
  try {
    Tesseract = (await import('tesseract.js')).default;
    console.log('[OCR] ✓ Tesseract loaded');
  } catch (e: unknown) {
    console.warn('[OCR] Tesseract import failed:', errMsg(e));
    return {
      text: '[OCR motoru yüklenemedi. AI görsel analizi gerekiyor.]',
      confidence: 0.1,
      pageCount: totalPages,
      processingTimeMs: Date.now() - startTime,
      method: 'vision_needed',
    };
  }

  let worker: any;
  try {
    worker = await Tesseract.createWorker(language);
    console.log('[OCR] ✓ Tesseract worker created');
  } catch (e: unknown) {
    console.warn('[OCR] Tesseract worker failed:', errMsg(e));
    return {
      text: '[OCR motoru başlatılamadı. AI görsel analizi gerekiyor.]',
      confidence: 0.1,
      pageCount: totalPages,
      processingTimeMs: Date.now() - startTime,
      method: 'vision_needed',
    };
  }

  const ocrTexts: string[] = [];
  let totalConfidence = 0;
  const maxPages = Math.min(totalPages, 20);

  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const { data } = await worker.recognize(canvas);
        ocrTexts.push(data.text.trim());
        totalConfidence += data.confidence;
        console.log(`[OCR] ✓ Page ${i} OCR done, chars: ${data.text.trim().length}`);
      }

      canvas.width = 0;
      canvas.height = 0;
    } catch (e: unknown) {
      console.warn(`[OCR] Page ${i} failed:`, errMsg(e));
      ocrTexts.push('');
    }

    onProgress?.({
      stage: 'recognizing',
      progress: 50 + Math.round((i / maxPages) * 46),
      currentPage: i, totalPages: maxPages,
      message: `OCR sayfa ${i}/${maxPages}...`,
    });
  }

  await worker.terminate();

  const fullText = ocrTexts.map((t, i) => `--- SAYFA ${i + 1} ---\n${t}`).join('\n\n');
  const avgConf = maxPages > 0 ? totalConfidence / maxPages / 100 : 0;
  const totalOCRChars = ocrTexts.join('').length;

  onProgress?.({ stage: 'done', progress: 100, message: 'OCR tamamlandı!' });

  console.log('[OCR] ✓ Complete. Total OCR chars:', totalOCRChars, 'Confidence:', Math.round(avgConf * 100) + '%');

  if (totalOCRChars < 20) {
    return {
      text: fullText || '[Bu PDF yalnızca fotoğraf içeriyor. AI görsel analizi gerekiyor.]',
      confidence: avgConf,
      pageCount: totalPages,
      processingTimeMs: Date.now() - startTime,
      method: 'vision_needed',
    };
  }

  return {
    text: fullText,
    confidence: avgConf,
    pageCount: totalPages,
    processingTimeMs: Date.now() - startTime,
    method: totalChars > 0 ? 'hybrid' : 'ocr',
  };
}
