#!/usr/bin/env node
/**
 * PDF-OCR PIPELINE — CourtListener PDF → Document AI OCR → Supabase
 *
 * TRUTH ANAYASASI: "Girdi ne kadar temizse çıktı o kadar temiz."
 *
 * Bu script:
 * 1. Supabase'deki metadata kabuklarından hedefleri seç
 * 2. CourtListener V3 search ile PDF URL'lerini bul
 * 3. PDF'i indir (~5-50MB)
 * 4. Google Document AI OCR ile metin çıkar
 * 5. raw_content olarak Supabase'e yaz → scan_status: 'ready'
 *
 * Maliyet: ~$1.50/1000 sayfa (Document AI)
 * Maxwell Tier 1 (~395 belge, ortalama 10 sayfa) ≈ $6
 *
 * Usage:
 *   node scripts/pdf-ocr-pipeline.mjs --tier 1 --limit 5 --dry-run
 *   node scripts/pdf-ocr-pipeline.mjs --tier 1 --limit 50
 *   node scripts/pdf-ocr-pipeline.mjs --entry 187
 *   node scripts/pdf-ocr-pipeline.mjs --phase discover     # sadece PDF URL'leri bul
 *   node scripts/pdf-ocr-pipeline.mjs --phase ocr           # sadece OCR yap (önceden bulunanlar)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ═══ ENV ═══
const envPath = new URL('../.env.local', import.meta.url).pathname;
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const CL_API_KEY = env.COURTLISTENER_API_KEY || '';
const GCP_PROJECT_ID = env.GCP_PROJECT_ID;
const GCP_REGION = env.GCP_REGION || 'us';
const PROCESSOR_ID = env.GCP_DOCUMENT_AI_PROCESSOR_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE credentials missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══ CONFIG ═══
const CL_BASE = 'https://www.courtlistener.com';
const CL_STORAGE = 'https://storage.courtlistener.com';
const DELAY_MS = 1500; // Rate limiting
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB max per PDF
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══ TIER CLASSIFICATION (same as docket-fetch) ═══
function classifyTier(doc) {
  const sub = doc.metadata?.sub_category || 'unknown';
  const title = (doc.title || '').toLowerCase();
  const desc = (doc.description || '').toLowerCase();
  if (sub === 'exhibit' || sub === 'transcript' || sub === 'indictment' || sub === 'sentencing') return 1;
  if (sub === 'verdict' || sub === 'memorandum' || title.includes('memorandum') || title.includes('opinion') || desc.includes('plea') || desc.includes('guilty')) return 2;
  if (sub === 'motion') return 3;
  return 4;
}

// ═══ ARG PARSER ═══
function getArg(flag) {
  const args = process.argv.slice(2);
  const eqForm = args.find(a => a.startsWith(flag + '='));
  if (eqForm) return eqForm.split('=')[1];
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

// ═══ PHASE 1: DISCOVER PDF URLs VIA COURTLISTENER V3 SEARCH ═══
// Search V3 API with pagination to build entry_number → filepath_local map

// ═══ KNOWN PACER CASE IDs ═══
// Docket number → PACER case ID mapping (for direct PDF URL construction)
// These are verified — CourtListener storage URLs follow this pattern:
// https://storage.courtlistener.com/recap/gov.uscourts.{court}.{pacerId}/gov.uscourts.{court}.{pacerId}.{entry}.0.pdf
const DOCKET_PACER_IDS = {
  '1:20-cr-00330': { pacerId: '539612', court: 'nysd' }, // US v. Maxwell (criminal)
  // Add more as needed:
  // '1:19-cr-00490': { pacerId: 'XXXXX', court: 'nysd' }, // US v. Epstein
  // '1:15-cv-07433': { pacerId: 'XXXXX', court: 'nysd' }, // Giuffre v. Maxwell
};

/**
 * Construct PDF URL directly from known PACER case ID + entry number
 * No API search needed — just build the URL and HEAD-check it
 */
function constructPdfUrl(entryNumber, docketNumber) {
  const info = DOCKET_PACER_IDS[docketNumber];
  if (!info || !entryNumber) return null;
  const { pacerId, court } = info;
  const prefix = `gov.uscourts.${court}.${pacerId}`;
  return `${CL_STORAGE}/recap/${prefix}/${prefix}.${entryNumber}.0.pdf`;
}

/**
 * Discover PDF URLs by HEAD-checking constructed URLs
 * Much faster than API search — no pagination, no rate limits
 */
async function discoverPdfUrls(targets, docketNumber) {
  console.log('\n🔍 Faz 1: Doğrudan URL keşfi (HEAD check)...');

  const info = DOCKET_PACER_IDS[docketNumber];
  if (!info) {
    console.log(`   ❌ Bilinmeyen docket: ${docketNumber}`);
    return new Map();
  }

  console.log(`   PACER ID: ${info.pacerId} | Mahkeme: ${info.court}`);

  const pdfMap = new Map();
  const uniqueEntries = [...new Set(targets.map(t => String(t.entryNumber)).filter(Boolean))];
  console.log(`   ${uniqueEntries.length} benzersiz entry number kontrol edilecek...`);

  let found = 0, notFound = 0, errors = 0;

  for (let i = 0; i < uniqueEntries.length; i++) {
    const entry = uniqueEntries[i];
    const url = constructPdfUrl(entry, docketNumber);
    if (!url) { notFound++; continue; }

    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const size = parseInt(res.headers.get('content-length') || '0');
        pdfMap.set(entry, {
          pdfUrl: url,
          fileSize: size,
          filepath: url.replace(CL_STORAGE + '/', ''),
        });
        found++;
      } else {
        notFound++;
      }
    } catch (err) {
      errors++;
    }

    // Progress (every 10)
    if ((i + 1) % 10 === 0 || i === uniqueEntries.length - 1) {
      process.stdout.write(`\r   [${i + 1}/${uniqueEntries.length}] ✅ ${found} bulundu | ⬜ ${notFound} yok | ❌ ${errors} hata`);
    }

    // Gentle rate limit (storage CDN is generous but be polite)
    if ((i + 1) % 20 === 0) await sleep(500);
  }

  console.log(`\n   ✅ Keşif tamamlandı: ${found} PDF bulundu / ${uniqueEntries.length} entry`);
  return pdfMap;
}

// ═══ PHASE 2: DOWNLOAD PDF ═══

async function downloadPdf(pdfUrl) {
  try {
    // HEAD check first for size
    const headRes = await fetch(pdfUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!headRes.ok) return { success: false, error: `HTTP ${headRes.status}` };

    const size = parseInt(headRes.headers.get('content-length') || '0');
    if (size > MAX_PDF_SIZE) {
      return { success: false, error: `Too large: ${(size / 1024 / 1024).toFixed(1)}MB` };
    }

    // Download
    const res = await fetch(pdfUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const buffer = Buffer.from(await res.arrayBuffer());

    // Verify it's a PDF
    if (buffer.slice(0, 5).toString() !== '%PDF-') {
      return { success: false, error: 'Not a PDF' };
    }

    return { success: true, buffer, size: buffer.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ═══ PHASE 3: DOCUMENT AI OCR ═══

let _docAIClient = null;

async function getDocAIClient() {
  if (_docAIClient) return _docAIClient;

  const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');
  const apiEndpoint = `${GCP_REGION}-documentai.googleapis.com`;

  const keyJson = env.GCP_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    const credentials = JSON.parse(keyJson);
    _docAIClient = new DocumentProcessorServiceClient({ credentials, apiEndpoint });
  } else {
    _docAIClient = new DocumentProcessorServiceClient({ apiEndpoint });
  }
  return _docAIClient;
}

const DOC_AI_PAGE_LIMIT = 15; // Process 15 pages at a time (limit is 30, use 15 for safety)

/**
 * Process a single chunk with Document AI
 */
async function processChunk(client, processorName, pdfBuffer) {
  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  const document = result.document;
  if (!document) return null;

  const text = document.text || '';
  const pageCount = (document.pages || []).length;
  const avgConfidence = pageCount > 0
    ? (document.pages || []).reduce((sum, p) => sum + (p.layout?.confidence || 0), 0) / pageCount
    : 0;

  return { text, pageCount, confidence: avgConfidence };
}

/**
 * Split a PDF buffer into chunks of N pages using pdf-lib
 * Falls back to sending the whole PDF if splitting fails
 */
async function splitPdfPages(pdfBuffer, maxPages) {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const srcDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = srcDoc.getPageCount();

    if (totalPages <= maxPages) {
      return [{ buffer: pdfBuffer, startPage: 1, endPage: totalPages }];
    }

    const chunks = [];
    for (let start = 0; start < totalPages; start += maxPages) {
      const end = Math.min(start + maxPages, totalPages);
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, Array.from({ length: end - start }, (_, i) => start + i));
      pages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      chunks.push({
        buffer: Buffer.from(bytes),
        startPage: start + 1,
        endPage: end,
      });
    }

    return chunks;
  } catch (err) {
    console.log(`\n   ⚠️ PDF split failed: ${err.message}`);
    // If splitting fails, return original (will hit page limit but that's ok)
    return [{ buffer: pdfBuffer, startPage: 1, endPage: 999 }];
  }
}

async function ocrWithDocumentAI(pdfBuffer) {
  if (!GCP_PROJECT_ID || !PROCESSOR_ID) {
    return { success: false, error: 'Document AI not configured' };
  }

  try {
    const client = await getDocAIClient();
    const processorName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/processors/${PROCESSOR_ID}`;

    const startTime = Date.now();

    // Split into chunks if needed
    const chunks = await splitPdfPages(pdfBuffer, DOC_AI_PAGE_LIMIT);

    let fullText = '';
    let totalPages = 0;
    let totalConfidence = 0;
    let chunkCount = 0;

    for (const chunk of chunks) {
      const result = await processChunk(client, processorName, chunk.buffer);
      if (result) {
        fullText += result.text;
        totalPages += result.pageCount;
        totalConfidence += result.confidence * result.pageCount;
        chunkCount++;
      }
      // Small delay between chunks to avoid rate limits
      if (chunks.length > 1) await sleep(500);
    }

    if (totalPages === 0) return { success: false, error: 'No text extracted from any chunk' };

    const avgConfidence = totalConfidence / totalPages;
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      text: fullText,
      pageCount: totalPages,
      confidence: avgConfidence,
      processingTime,
      language: 'en',
      chunks: chunkCount,
    };
  } catch (err) {
    if (err.message?.includes('exceeds the maximum')) {
      return { success: false, error: 'PDF too large for inline OCR (>20MB)' };
    }
    return { success: false, error: err.message };
  }
}

// ═══ MAIN PIPELINE ═══

async function main() {
  const args = process.argv.slice(2);
  const tierArg = getArg('--tier');
  const limitArg = parseInt(getArg('--limit') || '10');
  const dryRun = args.includes('--dry-run');
  const entryArg = getArg('--entry');
  const phase = getArg('--phase') || 'all'; // discover, ocr, all
  const tier = tierArg ? parseInt(tierArg) : null;
  const docket = getArg('--docket') || '1:20-cr-00330';
  const court = 'nysd';

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   PDF-OCR PIPELINE — CourtListener → Document AI    ║');
  console.log('║   "Her belge mahkeme salonundan çıktığı gibi"      ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Docket: ${docket.padEnd(40)}║`);
  console.log(`║  Phase:  ${phase.padEnd(10)} | Tier: ${(tier || 'ALL').toString().padEnd(4)} | Limit: ${String(limitArg).padEnd(5)}║`);
  console.log(`║  Dry Run: ${dryRun.toString().padEnd(39)}║`);
  console.log(`║  DocAI:  ${GCP_PROJECT_ID ? 'CONFIGURED' : 'NOT CONFIGURED'}${' '.repeat(29)}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Step 1: Get target documents from Supabase
  console.log('📋 Hedef belgeleri Supabase\'den çekiyorum...');

  const { data: allDocs, error: dbErr } = await supabase
    .from('documents')
    .select('id, title, description, metadata, source_type, scan_status, raw_content')
    .not('metadata->recap_doc_id', 'is', null)
    .limit(2000);

  if (dbErr) {
    console.error('❌ DB hatası:', dbErr.message);
    process.exit(1);
  }

  // Filter: needs content (no raw_content yet) OR phase=discover (just find PDFs)
  let targets = (allDocs || []).filter(d => {
    if (phase === 'ocr') {
      // Only docs that already have pdf_url but no raw_content
      return d.metadata?.content_status === 'pdf_only' && !d.raw_content;
    }
    // Default: no content yet
    return !d.raw_content;
  });

  // Add tier
  targets = targets.map(d => ({
    ...d,
    tier: classifyTier(d),
    entryNumber: d.metadata?.entry_number,
    recapDocId: d.metadata?.recap_doc_id,
    docketNumber: d.metadata?.docket_number,
  }));

  // Filter by entry
  if (entryArg) {
    targets = targets.filter(d => String(d.entryNumber) === String(entryArg));
  }

  // Filter by tier
  if (tier) {
    targets = targets.filter(d => d.tier === tier);
  }

  // Sort by priority → entry number
  targets.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (a.entryNumber || 0) - (b.entryNumber || 0);
  });

  // Apply limit
  targets = targets.slice(0, limitArg);

  console.log(`   Toplam hedef: ${targets.length} belge`);
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  targets.forEach(t => tierCounts[t.tier]++);
  console.log(`   Tier 1: ${tierCounts[1]} | Tier 2: ${tierCounts[2]} | Tier 3: ${tierCounts[3]} | Tier 4: ${tierCounts[4]}`);

  if (targets.length === 0) {
    console.log('⚠️ Hedef belge bulunamadı.');
    return;
  }

  // Step 2: Discover PDF URLs
  let pdfMap = new Map();

  if (phase !== 'ocr') {
    // Check if any targets already have pdf_url in metadata
    const alreadyDiscovered = targets.filter(t => t.metadata?.pdf_url);
    if (alreadyDiscovered.length > 0) {
      console.log(`   ${alreadyDiscovered.length} belge zaten PDF URL'ye sahip`);
      for (const t of alreadyDiscovered) {
        pdfMap.set(String(t.entryNumber), {
          pdfUrl: t.metadata.pdf_url,
          filepath: t.metadata.filepath_local || '',
          fileSize: t.metadata.pdf_size_bytes || 0,
        });
      }
    }

    // Discover remaining via direct URL construction + HEAD check
    const needsDiscovery = targets.filter(t => !t.metadata?.pdf_url);
    if (needsDiscovery.length > 0) {
      const discovered = await discoverPdfUrls(needsDiscovery, docket);
      for (const [k, v] of discovered) {
        if (!pdfMap.has(k)) pdfMap.set(k, v);
      }
    }

    // Update Supabase metadata with discovered PDF URLs
    let updatedCount = 0;
    for (const target of targets) {
      const info = pdfMap.get(String(target.entryNumber));
      if (info && !target.metadata?.pdf_url) {
        await supabase
          .from('documents')
          .update({
            metadata: {
              ...target.metadata,
              content_status: 'pdf_discovered',
              pdf_url: info.pdfUrl,
              filepath_local: info.filepath,
              pdf_size_bytes: info.fileSize,
            },
          })
          .eq('id', target.id);
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      console.log(`   💾 ${updatedCount} belgenin metadata'sı PDF URL ile güncellendi`);
    }
  } else {
    // OCR-only phase: use existing pdf_url from metadata
    for (const t of targets) {
      if (t.metadata?.pdf_url) {
        pdfMap.set(String(t.entryNumber), {
          pdfUrl: t.metadata.pdf_url,
          fileSize: t.metadata.pdf_size_bytes || 0,
        });
      }
    }
  }

  if (phase === 'discover') {
    // Discovery-only mode: show results and exit
    console.log('\n📊 KEŞIF SONUÇLARI:');
    let matched = 0, unmatched = 0;
    for (const target of targets.slice(0, 20)) {
      const info = pdfMap.get(String(target.entryNumber));
      if (info) {
        matched++;
        console.log(`  ✅ #${String(target.entryNumber).padStart(4)} | ${info.pageCount || '?'} pg | ${target.title?.substring(0, 50)}`);
      } else {
        unmatched++;
        console.log(`  ⬜ #${String(target.entryNumber).padStart(4)} | PDF yok | ${target.title?.substring(0, 50)}`);
      }
    }
    console.log(`\n  Toplam: ${matched} PDF bulundu, ${unmatched} bulunamadı (${targets.length} hedeften)`);
    return;
  }

  // Step 3: Download PDFs + OCR
  if (dryRun) {
    console.log('\n🏁 DRY RUN — İndirme/OCR yapılmadı.');
    let matchCount = 0;
    for (const t of targets) {
      if (pdfMap.has(String(t.entryNumber))) matchCount++;
    }
    console.log(`   ${matchCount}/${targets.length} belge için PDF URL bulundu`);
    console.log(`   Tahmini Document AI maliyeti: ~$${((matchCount * 10 * 1.5) / 1000).toFixed(2)} (ortalama 10 sayfa/belge)`);
    return;
  }

  if (!GCP_PROJECT_ID || !PROCESSOR_ID) {
    console.error('❌ Document AI yapılandırılmamış (GCP_PROJECT_ID + GCP_DOCUMENT_AI_PROCESSOR_ID gerekli)');
    console.log('   PDF URL keşfi tamamlandı. OCR için Document AI yapılandırın.');
    return;
  }

  console.log('\n📥 Faz 2+3: PDF İndirme + Document AI OCR...');

  const results = {
    ocrSuccess: 0,
    ocrFailed: 0,
    noPdf: 0,
    downloadFailed: 0,
    tooLarge: 0,
    dbUpdated: 0,
    totalPages: 0,
    totalChars: 0,
  };

  // Group targets by entry number to avoid duplicate downloads
  const entryGroups = new Map(); // entryNumber → [target1, target2, ...]
  for (const target of targets) {
    const key = String(target.entryNumber);
    if (!entryGroups.has(key)) entryGroups.set(key, []);
    entryGroups.get(key).push(target);
  }

  console.log(`   ${entryGroups.size} benzersiz entry, ${targets.length} belge (dedup)`);

  let processedEntries = 0;
  for (const [entryNum, group] of entryGroups) {
    processedEntries++;
    const pct = Math.round((processedEntries / entryGroups.size) * 100);
    const info = pdfMap.get(entryNum);

    process.stdout.write(`\r   [${pct}%] ${processedEntries}/${entryGroups.size} — Entry #${entryNum} (${group.length} doc)...`);

    if (!info) {
      results.noPdf += group.length;
      continue;
    }

    // Download PDF (once per entry)
    const dlResult = await downloadPdf(info.pdfUrl);
    if (!dlResult.success) {
      if (dlResult.error?.includes('Too large')) {
        results.tooLarge += group.length;
      } else {
        results.downloadFailed += group.length;
      }
      console.log(`\n   ⚠️ Download failed #${entryNum}: ${dlResult.error}`);
      continue;
    }

    const sizeMB = (dlResult.size / 1024 / 1024).toFixed(1);
    process.stdout.write(` ${sizeMB}MB → OCR...`);

    // OCR with Document AI (once per entry, split into chunks if >15 pages)
    const ocrResult = await ocrWithDocumentAI(dlResult.buffer);

    if (!ocrResult.success) {
      results.ocrFailed += group.length;
      console.log(`\n   ❌ OCR failed #${entryNum}: ${ocrResult.error}`);

      // Mark all docs in group as ocr_failed
      for (const target of group) {
        await supabase.from('documents').update({
          metadata: { ...target.metadata, content_status: 'ocr_failed', ocr_error: ocrResult.error },
        }).eq('id', target.id);
      }
      continue;
    }

    const chunksInfo = ocrResult.chunks > 1 ? ` (${ocrResult.chunks} chunks)` : '';
    process.stdout.write(` ✅ ${ocrResult.pageCount}pg${chunksInfo}`);

    results.totalPages += ocrResult.pageCount;
    results.totalChars += ocrResult.text.length;

    // Save to ALL documents in this entry group
    for (const target of group) {
      results.ocrSuccess++;

      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          raw_content: ocrResult.text,
          scan_status: 'ready', // Ready for 3-pass consensus scan
          metadata: {
            ...target.metadata,
            content_status: 'ocr_complete',
            ocr_method: 'google_document_ai',
            ocr_date: new Date().toISOString(),
            ocr_confidence: Math.round(ocrResult.confidence * 100) / 100,
            ocr_page_count: ocrResult.pageCount,
            ocr_char_count: ocrResult.text.length,
            ocr_language: ocrResult.language,
            ocr_processing_ms: ocrResult.processingTime,
            ocr_chunks: ocrResult.chunks,
            pdf_url: info.pdfUrl,
            pdf_size_bytes: dlResult.size,
          },
        })
        .eq('id', target.id);

      if (updateErr) {
        console.log(`\n   ❌ DB update hatası: ${updateErr.message}`);
      } else {
        results.dbUpdated++;
      }
    }

    // Rate limit between downloads
    await sleep(DELAY_MS);
  }

  // ═══ SUMMARY ═══
  const estimatedCost = (results.totalPages * 1.5 / 1000).toFixed(2);

  console.log('\n\n╔══════════════════════════════════════════════════════╗');
  console.log('║             PDF-OCR SONUÇ RAPORU                     ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Hedef:            ${String(targets.length).padStart(5)} belge                    ║`);
  console.log(`║  OCR başarılı:     ${String(results.ocrSuccess).padStart(5)} ✅ (taramaya hazır)     ║`);
  console.log(`║  OCR başarısız:    ${String(results.ocrFailed).padStart(5)} ❌                      ║`);
  console.log(`║  PDF bulunamadı:   ${String(results.noPdf).padStart(5)} ⬜                      ║`);
  console.log(`║  İndirme hatası:   ${String(results.downloadFailed).padStart(5)} 📥                      ║`);
  console.log(`║  Çok büyük (>50M): ${String(results.tooLarge).padStart(5)} 📏                      ║`);
  console.log(`║  DB güncellendi:   ${String(results.dbUpdated).padStart(5)} 💾                      ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Toplam sayfa:     ${String(results.totalPages).padStart(5)} 📄                      ║`);
  console.log(`║  Toplam karakter:  ${String(results.totalChars).padStart(8)}                      ║`);
  console.log(`║  Tahmini maliyet:  $${estimatedCost.padStart(6)}                         ║`);
  console.log('╠══════════════════════════════════════════════════════╣');

  if (results.ocrSuccess > 0) {
    console.log('║                                                      ║');
    console.log('║  Sonraki adım: 3-Pass Consensus Scan                 ║');
    console.log('║  node scripts/bulk-scan.mjs --status ready            ║');
    console.log('║                                                      ║');
  }

  console.log('╚══════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
