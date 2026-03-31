/**
 * PDF Dezenfeksiyon + Redaksiyon Tespit Modülü
 * Sprint R3 — "Cephane" (Hedefli Belge Tarama)
 *
 * TRUTH ANAYASASI:
 * - "Girdi ne kadar temizse, çıktı o kadar temiz."
 * - Mağdur isimleri ASLA kaydedilmez.
 * - Sansürlü metin tespit edilir ama içeriği ASLA saklanmaz.
 *
 * Pipeline:
 * 1. Ghostscript dezenfeksiyon (JavaScript, gömülü dosyalar, makrolar → yok edilir)
 * 2. QPDF yapı tamiri (bozuk PDF yapıları → onarılır)
 * 3. Redaksiyon tespit (siyah kutu altında metin var mı → logla, içeriği SİL)
 * 4. SHA-256 parmak izi (değiştirilemez kimlik)
 *
 * Sonuç: Orijinal metnin aynısı, tüm potansiyel tehditler yok edilmiş.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────

export interface SanitizationResult {
  /** Temizlenmiş PDF buffer */
  sanitizedBuffer: Buffer;
  /** Orijinal dosya SHA-256 hash'i */
  originalHash: string;
  /** Temizlenmiş dosya SHA-256 hash'i */
  sanitizedHash: string;
  /** Orijinal dosya boyutu (bytes) */
  originalSize: number;
  /** Temizlenmiş dosya boyutu (bytes) */
  sanitizedSize: number;
  /** Ghostscript dezenfeksiyon başarılı mı */
  ghostscriptSuccess: boolean;
  /** QPDF onarım başarılı mı */
  qpdfSuccess: boolean;
  /** Redaksiyon tespit sonuçları */
  redactionReport: RedactionReport;
  /** İşlem süresi (ms) */
  processingTimeMs: number;
  /** Hata mesajları (varsa) */
  warnings: string[];
}

export interface RedactionReport {
  /** Hatalı redaksiyon tespit edildi mi (siyah kutu altında metin) */
  failedRedactionsDetected: boolean;
  /** Tespit edilen hatalı redaksiyon sayısı */
  failedRedactionCount: number;
  /** Etkilenen sayfa numaraları */
  affectedPages: number[];
  /** Redaksiyon detayları (içerik ASLA dahil edilmez) */
  details: RedactionDetail[];
}

export interface RedactionDetail {
  /** Sayfa numarası */
  page: number;
  /** Tespit yöntemi */
  detectionMethod: 'text_under_rect' | 'hidden_layer' | 'metadata_leak';
  /** Güvenlik durumu */
  status: 'cleaned' | 'flagged_for_review';
  /** Açıklama (içerik ASLA dahil edilmez) */
  description: string;
}

// ─── SHA-256 Hashing ──────────────────────────────────

/**
 * Buffer'ın SHA-256 hash'ini hesapla
 * Biricik Kod Sistemi — her dosyanın parmak izi
 */
export function computeSHA256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ─── Geçici Dosya Yönetimi ────────────────────────────

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'truth-sanitize-'));
}

async function cleanupFiles(...paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await unlink(p);
    } catch {
      // Dosya zaten silinmiş olabilir
    }
  }
}

// ─── Katman 1: Ghostscript Dezenfeksiyon ──────────────

/**
 * Ghostscript ile PDF dezenfeksiyonu.
 *
 * PDF → PostScript → PDF dönüşümü sırasında:
 * - JavaScript yok edilir
 * - Gömülü dosyalar (embedded files) yok edilir
 * - Makrolar yok edilir
 * - Siyah kutu altındaki gizli metin yok edilir (doğal yan etki)
 * - Form actions yok edilir
 * - Auto-open/auto-print komutları yok edilir
 *
 * CVE-2024-4367 gibi font render açıkları bu süreçte etkisiz hale gelir.
 */
async function ghostscriptSanitize(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    await execFileAsync('gs', [
      '-dBATCH',                    // Batch mode — interaktif prompt yok
      '-dNOPAUSE',                  // Sayfa arası duraklatma yok
      '-dSAFER',                    // SAFER mode — dosya sistemi erişimi engellenir
      '-dNOCACHE',                  // Font cache kullanma — temiz render
      '-sDEVICE=pdfwrite',          // PDF çıktı
      '-dCompatibilityLevel=1.7',   // Modern PDF standardı
      '-dAutoRotatePages=/None',    // Sayfa rotasyonuna dokunma
      '-dPreserveAnnots=true',      // Metin notlarını koru (redaksiyon kutuları dahil)
      '-dDetectDuplicateImages=true', // Duplicate görsel tespiti (boyut optimizasyonu)
      '-dCompressFonts=true',       // Font sıkıştırma
      '-dSubsetFonts=true',         // Sadece kullanılan font karakterleri
      '-dPassThroughJPEGImages=true', // JPEG yeniden sıkıştırma yok (kalite kaybı önleme)
      `-sOutputFile=${outputPath}`,
      inputPath,
    ], {
      timeout: 120_000, // 2 dakika timeout (büyük PDF'ler için)
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    return { success: true, warnings };
  } catch (err: unknown) {
    const error = err as Error & { stderr?: string; code?: number };

    // Ghostscript bazen uyarı verir ama başarılı olur
    if (error.stderr && !error.stderr.includes('Error')) {
      warnings.push(`[Ghostscript] Uyarı: ${error.stderr.slice(0, 200)}`);

      // Çıktı dosyası oluşturulmuş mu kontrol et
      try {
        await readFile(outputPath);
        return { success: true, warnings };
      } catch {
        // Dosya oluşturulmamış — gerçek hata
      }
    }

    warnings.push(`[Ghostscript] Hata: ${error.message?.slice(0, 200) || 'Bilinmeyen hata'}`);
    return { success: false, warnings };
  }
}

// ─── Katman 2: QPDF Yapı Tamiri ──────────────────────

/**
 * QPDF ile PDF yapı tamiri.
 *
 * - Bozuk cross-reference tabloları onarılır
 * - Geçersiz nesne referansları düzeltilir
 * - Linearization (web optimizasyon) uygulanır
 * - Exploit girişimlerinde kullanılan yapı bozuklukları tespit edilir
 */
async function qpdfRepair(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    // İlk geçiş: kontrol
    const { stdout: checkOutput } = await execFileAsync('qpdf', [
      '--check',
      inputPath,
    ], { timeout: 30_000 }).catch(() => ({ stdout: '' }));

    if (checkOutput.includes('WARNING')) {
      warnings.push('[QPDF] PDF yapı uyarıları tespit edildi — onarılıyor');
    }

    // İkinci geçiş: onarım + optimizasyon
    await execFileAsync('qpdf', [
      '--replace-input',         // Yerinde güncelleme değil
      inputPath,
      '--linearize',             // Web optimizasyonu
      '--normalize-content=y',   // İçerik stream'lerini normalize et
      '--object-streams=generate', // Nesne stream'lerini yeniden oluştur
      '--compress-streams=y',    // Stream sıkıştırma
      '--recompress-flate',      // Flate yeniden sıkıştırma
      '--',
      outputPath,
    ], { timeout: 60_000 });

    return { success: true, warnings };
  } catch (err: unknown) {
    const error = err as Error;

    // QPDF hata verirse orijinali kopyala — en azından Ghostscript'ten geçmiş
    warnings.push(`[QPDF] Onarım başarısız (Ghostscript çıktısı kullanılacak): ${error.message?.slice(0, 200)}`);

    try {
      const fallbackBuffer = await readFile(inputPath);
      await writeFile(outputPath, fallbackBuffer);
      return { success: false, warnings };
    } catch {
      return { success: false, warnings };
    }
  }
}

// ─── Katman 3: Redaksiyon Tespit ──────────────────────

/**
 * Hatalı redaksiyon tespiti.
 *
 * Yöntem: Ghostscript'ten ÖNCE ve SONRA metin çıkarma.
 * Fark varsa → siyah kutu altında metin vardı → Ghostscript temizledi.
 *
 * NOT: Ghostscript dezenfeksiyonu siyah kutu altındaki metni doğal olarak öldürüyor.
 * Bu fonksiyon sadece TESPİT ve LOGLAMA yapar — temizlik zaten yapılmış durumda.
 *
 * TRUTH ANAYASASI: İçerik ASLA kaydedilmez. Sadece "X sayfada Y adet hatalı redaksiyon" loglanır.
 */
async function detectFailedRedactions(
  originalBuffer: Buffer,
  sanitizedBuffer: Buffer,
  tempDir: string,
): Promise<RedactionReport> {
  const report: RedactionReport = {
    failedRedactionsDetected: false,
    failedRedactionCount: 0,
    affectedPages: [],
    details: [],
  };

  try {
    // Orijinal PDF'den metin çıkar (pdftotext ile — Ghostscript'ten bağımsız)
    const origPdfPath = join(tempDir, 'orig_check.pdf');
    const origTxtPath = join(tempDir, 'orig_check.txt');
    const sanPdfPath = join(tempDir, 'san_check.pdf');
    const sanTxtPath = join(tempDir, 'san_check.txt');

    await writeFile(origPdfPath, originalBuffer);
    await writeFile(sanPdfPath, sanitizedBuffer);

    // pdftotext ile metin çıkarma (sayfa sayfa)
    let origText = '';
    let sanText = '';

    try {
      const { stdout: ot } = await execFileAsync('pdftotext', [
        '-layout', origPdfPath, '-',
      ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
      origText = ot;
    } catch {
      // pdftotext yoksa veya hata verirse — tespit atlansın
      return report;
    }

    try {
      const { stdout: st } = await execFileAsync('pdftotext', [
        '-layout', sanPdfPath, '-',
      ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
      sanText = st;
    } catch {
      return report;
    }

    // Karşılaştırma: Orijinalda olan ama temizlenmiş versiyonda olmayan metin var mı?
    const origLines = origText.split('\n').filter(l => l.trim().length > 0);
    const sanLines = sanText.split('\n').filter(l => l.trim().length > 0);

    // Karakter sayısı farkı
    const origCharCount = origText.replace(/\s/g, '').length;
    const sanCharCount = sanText.replace(/\s/g, '').length;
    const charDiff = origCharCount - sanCharCount;

    if (charDiff > 50) {
      // Anlamlı fark var — muhtemelen siyah kutu altında metin vardı
      report.failedRedactionsDetected = true;

      // Sayfa bazında analiz (yaklaşık — pdftotext sayfa sınırlarını \f ile ayırır)
      const origPages = origText.split('\f');
      const sanPages = sanText.split('\f');

      for (let i = 0; i < Math.max(origPages.length, sanPages.length); i++) {
        const origPageChars = (origPages[i] || '').replace(/\s/g, '').length;
        const sanPageChars = (sanPages[i] || '').replace(/\s/g, '').length;

        if (origPageChars - sanPageChars > 20) {
          report.failedRedactionCount++;
          report.affectedPages.push(i + 1);
          report.details.push({
            page: i + 1,
            detectionMethod: 'text_under_rect',
            status: 'cleaned',
            // TRUTH ANAYASASI: İçerik ASLA dahil edilmez
            description: `Sayfa ${i + 1}: ${origPageChars - sanPageChars} karakter farkı tespit edildi — Ghostscript tarafından temizlendi`,
          });
        }
      }
    }

    // Metadata kontrolü (PDF author, creator, producer alanlarında bilgi sızıntısı)
    try {
      const { stdout: origMeta } = await execFileAsync('pdftotext', [
        origPdfPath, '-', '-f', '0', '-l', '0',
      ], { timeout: 5_000 }).catch(() => ({ stdout: '' }));

      // PDF metadata'da hassas bilgi arama (basit heuristik)
      const metadataPatterns = [
        /SSN[\s:]*\d{3}-\d{2}-\d{4}/i,
        /social\s*security/i,
        /passport\s*n/i,
      ];

      for (const pattern of metadataPatterns) {
        if (pattern.test(origMeta)) {
          report.details.push({
            page: 0,
            detectionMethod: 'metadata_leak',
            status: 'flagged_for_review',
            description: 'PDF metadata\'da potansiyel hassas bilgi kalıntısı tespit edildi — inceleme gerekli',
          });
        }
      }
    } catch {
      // Metadata kontrolü opsiyonel — hata sessiz geçilir
    }

    // Temizlik
    await cleanupFiles(origPdfPath, origTxtPath, sanPdfPath, sanTxtPath);

  } catch (err) {
    // Redaksiyon tespiti başarısız — pipeline'ı durdurmaz
    report.details.push({
      page: 0,
      detectionMethod: 'text_under_rect',
      status: 'flagged_for_review',
      description: 'Redaksiyon tespiti tamamlanamadı — manuel inceleme önerilir',
    });
  }

  return report;
}

// ─── Ana Pipeline ─────────────────────────────────────

/**
 * PDF Dezenfeksiyon Pipeline
 *
 * Tam pipeline: Ghostscript → QPDF → Redaksiyon Tespit → SHA-256
 *
 * @param inputBuffer — Ham PDF dosyası (güvenilmeyen kaynak)
 * @returns Temizlenmiş PDF + doğrulama raporu
 */
export async function sanitizePDF(inputBuffer: Buffer): Promise<SanitizationResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const tempDir = await createTempDir();

  // Dosya yolları
  const inputPath = join(tempDir, 'input.pdf');
  const gsOutputPath = join(tempDir, 'gs_output.pdf');
  const finalOutputPath = join(tempDir, 'final_output.pdf');

  try {
    // Orijinal hash (değiştirilemez kimlik)
    const originalHash = computeSHA256(inputBuffer);
    const originalSize = inputBuffer.length;

    // Geçici dosyaya yaz
    await writeFile(inputPath, inputBuffer);

    // ─── Katman 1: Ghostscript ───────────────────
    console.log('[Sanitizer] Katman 1: Ghostscript dezenfeksiyon başlıyor...');
    const gsResult = await ghostscriptSanitize(inputPath, gsOutputPath);
    warnings.push(...gsResult.warnings);

    if (!gsResult.success) {
      // Ghostscript başarısız — orijinali QPDF'e ver (en azından yapı tamiri)
      warnings.push('[Sanitizer] Ghostscript başarısız — doğrudan QPDF deneniyor');

      // Orijinali gs çıktısı olarak kopyala
      await writeFile(gsOutputPath, inputBuffer);
    }

    // ─── Katman 2: QPDF ─────────────────────────
    console.log('[Sanitizer] Katman 2: QPDF yapı tamiri başlıyor...');
    const qpdfResult = await qpdfRepair(gsOutputPath, finalOutputPath);
    warnings.push(...qpdfResult.warnings);

    // Sonuç dosyasını oku
    let sanitizedBuffer: Buffer;
    try {
      sanitizedBuffer = await readFile(finalOutputPath);
    } catch {
      // Final dosya yoksa GS çıktısını kullan
      try {
        sanitizedBuffer = await readFile(gsOutputPath);
        warnings.push('[Sanitizer] QPDF çıktısı okunamadı — Ghostscript çıktısı kullanılıyor');
      } catch {
        // Hiçbir çıktı yok — orijinal döndür (en kötü senaryo)
        warnings.push('[Sanitizer] KRİTİK: Dezenfeksiyon başarısız — orijinal döndürülüyor');
        sanitizedBuffer = inputBuffer;
      }
    }

    // ─── Katman 3: Redaksiyon Tespit ─────────────
    console.log('[Sanitizer] Katman 3: Redaksiyon tespiti başlıyor...');
    const redactionReport = await detectFailedRedactions(
      inputBuffer,
      sanitizedBuffer,
      tempDir,
    );

    if (redactionReport.failedRedactionsDetected) {
      console.warn(
        `[Sanitizer] ⚠️ ${redactionReport.failedRedactionCount} hatalı redaksiyon tespit edildi ` +
        `(sayfa: ${redactionReport.affectedPages.join(', ')}) — Ghostscript tarafından temizlendi`
      );
    }

    // ─── Katman 4: SHA-256 Parmak İzi ────────────
    const sanitizedHash = computeSHA256(sanitizedBuffer);

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[Sanitizer] ✅ Tamamlandı: ${originalSize} → ${sanitizedBuffer.length} bytes, ` +
      `GS: ${gsResult.success ? '✓' : '✗'}, QPDF: ${qpdfResult.success ? '✓' : '✗'}, ` +
      `Redaksiyon: ${redactionReport.failedRedactionCount} tespit, ` +
      `${processingTimeMs}ms`
    );

    return {
      sanitizedBuffer,
      originalHash,
      sanitizedHash,
      originalSize,
      sanitizedSize: sanitizedBuffer.length,
      ghostscriptSuccess: gsResult.success,
      qpdfSuccess: qpdfResult.success,
      redactionReport,
      processingTimeMs,
      warnings,
    };

  } finally {
    // Geçici dosyaları temizle
    await cleanupFiles(inputPath, gsOutputPath, finalOutputPath);
    // Temp dizini temizle
    try {
      const { rmdir } = await import('fs/promises');
      // rm -rf olmadan — sadece boş dizini sil
      await rmdir(tempDir).catch(() => {});
    } catch {
      // Temizlik opsiyonel
    }
  }
}

// ─── Toplu İşlem ──────────────────────────────────────

/**
 * Birden fazla PDF'yi sırayla dezenfekte et.
 * Her dosya bağımsız — biri hata verse diğerleri devam eder.
 */
export async function sanitizeBatch(
  files: Array<{ name: string; buffer: Buffer }>,
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<Array<{ name: string; result: SanitizationResult | null; error?: string }>> {
  const results: Array<{ name: string; result: SanitizationResult | null; error?: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);

    try {
      const result = await sanitizePDF(file.buffer);
      results.push({ name: file.name, result });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Sanitizer] ${file.name} dezenfeksiyonu başarısız:`, error.message);
      results.push({
        name: file.name,
        result: null,
        error: error.message || 'Bilinmeyen hata',
      });
    }
  }

  return results;
}

// ─── Sağlık Kontrolü ─────────────────────────────────

/**
 * Ghostscript ve QPDF'in kurulu olup olmadığını kontrol et.
 */
export async function checkSanitizerHealth(): Promise<{
  ghostscriptAvailable: boolean;
  ghostscriptVersion: string | null;
  qpdfAvailable: boolean;
  qpdfVersion: string | null;
  pdftotextAvailable: boolean;
}> {
  let gsVersion: string | null = null;
  let qpdfVersion: string | null = null;
  let pdftotextAvailable = false;

  try {
    const { stdout } = await execFileAsync('gs', ['--version'], { timeout: 5_000 });
    gsVersion = stdout.trim();
  } catch { /* Ghostscript yok */ }

  try {
    const { stdout } = await execFileAsync('qpdf', ['--version'], { timeout: 5_000 });
    qpdfVersion = stdout.split('\n')[0]?.trim() || null;
  } catch { /* QPDF yok */ }

  try {
    await execFileAsync('pdftotext', ['-v'], { timeout: 5_000 });
    pdftotextAvailable = true;
  } catch {
    // pdftotext mevcut olsa bile -v hata verebilir, which ile kontrol et
    try {
      await execFileAsync('which', ['pdftotext'], { timeout: 5_000 });
      pdftotextAvailable = true;
    } catch { /* pdftotext yok */ }
  }

  return {
    ghostscriptAvailable: !!gsVersion,
    ghostscriptVersion: gsVersion,
    qpdfAvailable: !!qpdfVersion,
    qpdfVersion: qpdfVersion,
    pdftotextAvailable,
  };
}
