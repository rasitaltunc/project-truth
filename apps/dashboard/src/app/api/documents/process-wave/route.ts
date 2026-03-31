/**
 * /api/documents/process-wave
 * POST: Wave-based PDF download → GCS upload → Document AI OCR → Groq scan pipeline
 *
 * CourtListener RECAP PDF'lerini indirir, GCS'ye yükler, OCR yapar, AI ile tarar.
 * Tek belge veya toplu işleme destekler.
 *
 * Body: { documentIds?: string[], wave?: string, limit?: number, dryRun?: boolean }
 * - documentIds: Belirli belgeleri işle
 * - wave: "wave_1"|"wave_2"|"wave_3"|"wave_4" — tüm wave'i işle
 * - limit: Maksimum belge sayısı (default: 5, max: 20)
 * - dryRun: true ise sadece plan göster, işleme yapma
 *
 * GET: Wave istatistiklerini göster
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { uploadToGCS, isGCSAvailable } from '@/lib/gcs';
import { processWithDocumentAI, isDocumentAIAvailable } from '@/lib/documentAI';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CL_API_KEY = process.env.COURTLISTENER_API_KEY || '';

// ════════════════════════════════════════════════════════
// GET: Wave statistics
// ════════════════════════════════════════════════════════

export async function GET() {
  try {
    // Count documents by wave and processing status
    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select('id, scan_status, metadata, file_size, ocr_status')
      .eq('source_type', 'courtlistener');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const waves: Record<string, {
      total: number;
      pending: number;
      downloaded: number;
      ocr_done: number;
      scanned: number;
      failed: number;
    }> = {};

    for (const d of (docs || [])) {
      const wave = (d.metadata as Record<string, unknown>)?.import_wave as string || 'unknown';
      if (!waves[wave]) {
        waves[wave] = { total: 0, pending: 0, downloaded: 0, ocr_done: 0, scanned: 0, failed: 0 };
      }
      waves[wave].total++;

      const scanStatus = d.scan_status as string;
      if (scanStatus === 'scanned') waves[wave].scanned++;
      else if (scanStatus === 'failed') waves[wave].failed++;
      else if (d.ocr_status === 'completed') waves[wave].ocr_done++;
      else if ((d.metadata as Record<string, unknown>)?.gcs_path) waves[wave].downloaded++;
      else waves[wave].pending++;
    }

    return NextResponse.json({
      waves,
      gcsAvailable: isGCSAvailable(),
      documentAIAvailable: isDocumentAIAvailable(),
      courtListenerConfigured: !!CL_API_KEY,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════
// POST: Process documents (download → OCR → scan)
// ════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      documentIds,
      wave,
      limit = 5,
      dryRun = false,
      skipOCR = false,
      skipScan = false,
      skipDownload = false, // Skip CL download entirely — just scan from metadata
      interDocDelay = 3000, // ms between documents (default 3s, increase for rate limiting)
    } = body as {
      documentIds?: string[];
      wave?: string;
      limit?: number;
      dryRun?: boolean;
      skipOCR?: boolean;
      skipScan?: boolean;
      skipDownload?: boolean;
      interDocDelay?: number;
    };

    // Validate
    const effectiveLimit = Math.min(limit, 20); // Hard cap at 20

    // ─── Step 1: Select documents to process ───
    let query = supabaseAdmin
      .from('documents')
      .select('id, title, description, external_id, external_url, metadata, scan_status, ocr_status, file_size, source_type')
      .eq('source_type', 'courtlistener');

    if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds);
    } else if (wave) {
      // Filter by wave, only unprocessed documents
      query = query
        .in('scan_status', ['pending', 'failed'])
        .order('metadata->import_priority', { ascending: false }); // Highest priority first
    }

    const { data: candidates, error: fetchErr } = await query.limit(effectiveLimit * 3); // Fetch extra to filter

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Filter by wave in memory (Supabase JSONB filter is tricky)
    let docsToProcess = (candidates || []).filter(d => {
      const meta = d.metadata as Record<string, unknown>;
      if (wave && meta?.import_wave !== wave) return false;
      // Skip already fully processed (unless specific IDs requested)
      if (!documentIds && d.scan_status === 'scanned') return false;
      return true;
    }).slice(0, effectiveLimit);

    if (docsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: wave
          ? `${wave} dalgesinde işlenecek belge kalmadı!`
          : 'İşlenecek belge bulunamadı.',
        processed: 0,
      });
    }

    // ─── Dry Run: Just show the plan ───
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        documentsToProcess: docsToProcess.map(d => ({
          id: d.id,
          title: (d.title as string)?.substring(0, 80),
          subCategory: (d.metadata as Record<string, unknown>)?.sub_category,
          priority: (d.metadata as Record<string, unknown>)?.import_priority,
          currentStatus: d.scan_status,
          ocrStatus: d.ocr_status,
        })),
        count: docsToProcess.length,
        wave: wave || 'custom',
        gcsAvailable: isGCSAvailable(),
        documentAIAvailable: isDocumentAIAvailable(),
      });
    }

    // ─── Step 2: Process each document ───
    const results: Array<{
      id: string;
      title: string;
      step: string;
      success: boolean;
      error?: string;
      pdfSize?: number;
      ocrChars?: number;
      entities?: number;
    }> = [];

    let docIndex = 0;
    for (const doc of docsToProcess) {
      // Rate limit protection: wait between documents
      if (docIndex > 0) {
        const delay = Math.min(Math.max(interDocDelay, 1000), 30000); // 1-30s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      docIndex++;

      const docResult = {
        id: doc.id,
        title: (doc.title as string)?.substring(0, 60) || 'Untitled',
        step: 'init',
        success: false,
        pdfSize: 0,
        ocrChars: 0,
        entities: 0,
        error: undefined as string | undefined,
      };

      try {
        const meta = doc.metadata as Record<string, unknown>;
        const recapDocId = meta?.recap_doc_id;
        const existingGcsPath = meta?.gcs_path as string | null;

        // ─── 2a: Download PDF from CourtListener ───
        let pdfBuffer: Buffer | null = null;
        let gcsPath = existingGcsPath;

        if (!existingGcsPath && !skipDownload) {
          docResult.step = 'download';

          pdfBuffer = await downloadCourtListenerPDF(
            recapDocId as number,
            doc.external_url as string
          );

          if (!pdfBuffer) {
            // PDF not in RECAP archive — skip download, proceed with metadata-only scan
            docResult.error = 'PDF RECAP\'te yok — metadata-only scan yapılacak';
            console.log(`[ProcessWave] No PDF for ${doc.title} — falling back to metadata scan`);

            // Update metadata to track this
            await supabaseAdmin
              .from('documents')
              .update({
                metadata: { ...meta, recap_available: false, process_note: 'no_pdf_in_recap' },
              })
              .eq('id', doc.id);

            // Don't continue — let it fall through to scan step with metadata only
          }

          if (pdfBuffer) {
            docResult.pdfSize = pdfBuffer.length;

            // ─── 2b: Upload to GCS ───
            docResult.step = 'gcs_upload';

            if (isGCSAvailable()) {
              const filename = `maxwell-case/recap-${recapDocId}.pdf`;
              const uploadResult = await uploadToGCS(pdfBuffer, filename, 'application/pdf', 'court-documents');

              if (uploadResult) {
                gcsPath = uploadResult.path;

                // Update metadata with GCS path
                await supabaseAdmin
                  .from('documents')
                  .update({
                    metadata: { ...meta, gcs_path: gcsPath, gcs_bucket: uploadResult.bucket },
                    file_size: pdfBuffer.length,
                  })
                  .eq('id', doc.id);
              } else {
                docResult.error = 'GCS upload başarısız — devam ediliyor';
              }
            }
          }
        }

        // ─── 2c: OCR with Document AI ───
        if (!skipOCR && doc.ocr_status !== 'completed') {
          docResult.step = 'ocr';

          // Get the PDF buffer if we don't have it yet
          if (!pdfBuffer && gcsPath) {
            const { downloadFromGCS } = await import('@/lib/gcs');
            pdfBuffer = await downloadFromGCS(gcsPath);
          }

          if (!pdfBuffer && !existingGcsPath && !skipDownload) {
            pdfBuffer = await downloadCourtListenerPDF(
              recapDocId as number,
              doc.external_url as string
            );
          }

          if (pdfBuffer) {
            let ocrText = '';
            let ocrMethod = '';

            // Method 1: Google Document AI (best quality)
            if (isDocumentAIAvailable()) {
              try {
                console.log(`[ProcessWave] OCR starting for ${doc.id} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
                const ocrResult = await processWithDocumentAI(pdfBuffer, 'application/pdf');

                if (ocrResult && ocrResult.text.length > 20) {
                  ocrText = ocrResult.text;
                  ocrMethod = 'google_document_ai';
                  docResult.ocrChars = ocrResult.text.length;

                  await supabaseAdmin
                    .from('documents')
                    .update({
                      raw_content: ocrResult.text,
                      ocr_status: 'completed',
                      ocr_extracted_text: ocrResult.text,
                      ocr_confidence: ocrResult.confidence,
                      ocr_page_count: ocrResult.pageCount,
                      metadata: {
                        ...(doc.metadata as Record<string, unknown>),
                        gcs_path: gcsPath,
                        ocr_method: 'google_document_ai',
                        ocr_processing_time_ms: ocrResult.processingTimeMs,
                      },
                    })
                    .eq('id', doc.id);

                  console.log(`[ProcessWave] OCR success: ${ocrResult.text.length} chars, ${ocrResult.pageCount} pages`);
                } else {
                  console.warn(`[ProcessWave] Document AI returned empty/short text for ${doc.id}`);
                }
              } catch (ocrErr) {
                const ocrMsg = ocrErr instanceof Error ? ocrErr.message : 'OCR error';
                console.error(`[ProcessWave] Document AI failed for ${doc.id}:`, ocrMsg);
              }
            }

            // Method 2: Basic PDF text extraction (for text-based PDFs, no scanned images)
            if (!ocrText) {
              try {
                // Try extracting text by looking for text streams in the PDF
                const pdfString = pdfBuffer.toString('latin1');
                const textMatches = pdfString.matchAll(/\(([^)]{2,})\)/g);
                const extractedParts: string[] = [];
                for (const m of textMatches) {
                  const text = m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
                  if (text.length > 2 && !/^[\x00-\x1f]+$/.test(text)) {
                    extractedParts.push(text);
                  }
                }

                if (extractedParts.length > 5) {
                  ocrText = extractedParts.join(' ').replace(/\s+/g, ' ').trim();
                  ocrMethod = 'pdf_text_extraction';
                  docResult.ocrChars = ocrText.length;

                  await supabaseAdmin
                    .from('documents')
                    .update({
                      raw_content: ocrText.substring(0, 500000), // Cap at 500K
                      ocr_status: 'completed',
                      ocr_extracted_text: ocrText.substring(0, 500000),
                      metadata: {
                        ...(doc.metadata as Record<string, unknown>),
                        gcs_path: gcsPath,
                        ocr_method: 'pdf_text_extraction',
                      },
                    })
                    .eq('id', doc.id);

                  console.log(`[ProcessWave] PDF text extraction: ${ocrText.length} chars`);
                }
              } catch (extractErr) {
                console.warn(`[ProcessWave] PDF text extraction failed:`, extractErr);
              }
            }

            if (!ocrText) {
              docResult.error = 'OCR+text extraction başarısız — belge muhtemelen şifreli/korumalı';
              await supabaseAdmin
                .from('documents')
                .update({ ocr_status: 'failed' })
                .eq('id', doc.id);
            }
          } else {
            docResult.error = 'PDF buffer yok — OCR atlandı';
          }
        }

        // ─── 2d: AI Scan with Groq (retry with backoff) ───
        if (!skipScan) {
          docResult.step = 'scan';

          let scanSuccess = false;
          const maxRetries = 3;

          for (let attempt = 0; attempt < maxRetries && !scanSuccess; attempt++) {
            if (attempt > 0) {
              // Exponential backoff: 5s, 10s, 20s
              const delay = 5000 * Math.pow(2, attempt - 1);
              console.log(`[ProcessWave] Scan retry ${attempt + 1}/${maxRetries} after ${delay / 1000}s delay`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
              const scanResponse = await fetch(
                new URL('/api/documents/scan', req.url).toString(),
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ documentId: doc.id }),
                }
              );

              if (scanResponse.ok) {
                const scanData = await scanResponse.json();
                const entityCount = scanData.scanResult?.entities?.length
                  || scanData.entities?.length
                  || 0;
                docResult.entities = entityCount;
                docResult.success = true;
                docResult.step = 'complete';
                scanSuccess = true;
              } else {
                const errData = await scanResponse.json().catch(() => ({}));
                const errMsg = errData.error || `HTTP ${scanResponse.status}`;

                // If rate limited, retry
                if (scanResponse.status === 429 || errMsg.includes('Rate limit') || errMsg.includes('rate_limit')) {
                  docResult.error = `Scan rate limited (attempt ${attempt + 1})`;
                  continue; // Retry
                }

                docResult.error = `Scan hatası: ${errMsg}`;
                break; // Non-retryable error
              }
            } catch (scanErr) {
              const scanMsg = scanErr instanceof Error ? scanErr.message : 'Scan error';
              docResult.error = `Scan exception: ${scanMsg}`;
              break; // Don't retry on exceptions
            }
          }
        } else {
          docResult.success = true;
          docResult.step = skipOCR ? 'download_only' : 'ocr_only';
        }
      } catch (docErr) {
        const msg = docErr instanceof Error ? docErr.message : 'Unknown error';
        docResult.error = `${docResult.step}: ${msg}`;
      }

      results.push({ ...docResult });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      duration: `${duration}s`,
      wave: wave || 'custom',
      results,
      message: `${successCount}/${results.length} belge işlendi (${duration}s). ${failCount > 0 ? `${failCount} hata.` : 'Sıfır hata!'}`
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ProcessWave]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════
// CourtListener RECAP PDF Download
// ════════════════════════════════════════════════════════

/**
 * Download a PDF from CourtListener RECAP archive.
 *
 * Strategy (priority order):
 * 1. Page scrape → find storage.courtlistener.com PDF link (most reliable)
 * 2. Archive.org fallback (RECAP mirrors)
 * 3. RECAP API (needs API key with proper permissions)
 */
async function downloadCourtListenerPDF(
  recapDocId: number | undefined,
  docketEntryUrl: string | undefined
): Promise<Buffer | null> {
  if (!recapDocId && !docketEntryUrl) return null;

  // Strategy 1 (PRIMARY): Scrape docket entry page for PDF links
  // This is the most reliable method — works without special API permissions
  // IMPORTANT: Do NOT send Authorization header — it causes 403
  // IMPORTANT: Use realistic User-Agent — bot UA causes 202 challenge pages
  if (docketEntryUrl) {
    try {
      console.log(`[CL] Strategy 1: Scraping ${docketEntryUrl}`);
      const pageRes = await fetch(docketEntryUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      // Check for valid response (200 OK and large enough to be a real page)
      // 202 with small HTML = challenge/bot page, skip it
      if (pageRes.status === 200 || (pageRes.ok && pageRes.status !== 202)) {
        const html = await pageRes.text();

        // Additional check: real docket pages are >10KB, challenge pages are <5KB
        if (html.length < 5000) {
          console.warn(`[CL] Page too small (${html.length} bytes) — likely challenge page, skipping`);
        } else {
          // Real page — extract PDF links
          const storageMatches = html.matchAll(/href="(https:\/\/storage\.courtlistener\.com\/recap\/[^"]+\.pdf)"/gi);
          const archiveMatches = html.matchAll(/href="(https:\/\/archive\.org\/download\/[^"]+\.pdf)"/gi);

          // Collect unique PDF URLs (prefer storage.courtlistener.com)
          const pdfUrls: string[] = [];
          for (const m of storageMatches) {
            if (!pdfUrls.includes(m[1])) pdfUrls.push(m[1]);
          }
          for (const m of archiveMatches) {
            if (!pdfUrls.includes(m[1])) pdfUrls.push(m[1]);
          }

          console.log(`[CL] Found ${pdfUrls.length} PDF URLs on page (${(html.length / 1024).toFixed(0)} KB HTML)`);

          // Try each URL until we get a valid PDF
          for (const pdfUrl of pdfUrls) {
            try {
              const pdfRes = await fetch(pdfUrl, {
                signal: AbortSignal.timeout(60000), // PDFs can be large
              });

              if (pdfRes.ok) {
                const contentType = pdfRes.headers.get('content-type') || '';
                const arrayBuffer = await pdfRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Validate it's a real PDF (check magic bytes)
                if (buffer.length > 100 && (contentType.includes('pdf') || buffer.slice(0, 5).toString() === '%PDF-')) {
                  console.log(`[CL] ✓ Downloaded: ${pdfUrl} (${(buffer.length / 1024).toFixed(0)} KB)`);
                  return buffer;
                }
              }
            } catch (dlErr) {
              console.warn(`[CL] Failed to download ${pdfUrl}:`, dlErr);
            }
          }
        }
      } else {
        console.warn(`[CL] Page returned ${pageRes.status} (${pageRes.statusText}) — likely bot challenge`);
      }
    } catch (err) {
      console.warn(`[CL] Page scrape failed for ${docketEntryUrl}:`, err);
    }
  }

  // Strategy 2: Try RECAP API (may 403 without proper permissions)
  if (CL_API_KEY && recapDocId) {
    try {
      console.log(`[CL] Strategy 2: RECAP API for doc ${recapDocId}`);
      const metaUrl = `https://www.courtlistener.com/api/rest/v4/recap-documents/${recapDocId}/?format=json`;
      const metaRes = await fetch(metaUrl, {
        headers: {
          'Authorization': `Token ${CL_API_KEY}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (metaRes.ok) {
        const meta = await metaRes.json();

        if (meta.filepath_local) {
          const pdfUrl = `https://storage.courtlistener.com/${meta.filepath_local}`;
          const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(30000) });
          if (pdfRes.ok) {
            const buffer = Buffer.from(await pdfRes.arrayBuffer());
            if (buffer.length > 100) {
              console.log(`[CL] ✓ Downloaded via API filepath: ${recapDocId} (${(buffer.length / 1024).toFixed(0)} KB)`);
              return buffer;
            }
          }
        }
      } else {
        console.warn(`[CL] RECAP API returned ${metaRes.status} for ${recapDocId}`);
      }
    } catch (err) {
      console.warn(`[CL] RECAP API failed for ${recapDocId}:`, err);
    }
  }

  console.warn(`[CL] All download strategies failed for recapDocId=${recapDocId}`);
  return null;
}
