#!/usr/bin/env node
/**
 * DOCKET-BASED FETCH — Cerrahi Hassasiyetle Belge İndirme
 *
 * TRUTH ANAYASASI: "Girdi ne kadar temizse çıktı o kadar temiz."
 *
 * Bu script keyword araması YAPMAZ. Sadece bilinen docket'lardan,
 * bilinen RECAP doc ID'leri ile belge çeker.
 *
 * Strateji:
 * 1. Supabase'deki 768 metadata kabuğundan hedef belgeleri seç
 * 2. Her hedef için CourtListener RECAP API'den metin çek
 * 3. Supabase'e raw_content olarak yaz
 * 4. scan_status'ü 'ready' yap (taramaya hazır)
 *
 * Usage:
 *   node scripts/docket-fetch.mjs --tier 1 --limit 10 --dry-run
 *   node scripts/docket-fetch.mjs --tier 1 --limit 50
 *   node scripts/docket-fetch.mjs --entry 741        # tek belge
 *
 * Tier System:
 *   1 = Altın (exhibits, transcripts, indictments, sentencing) — 395 belge
 *   2 = Gümüş (verdicts, memorandums, opinions) — 62 belge
 *   3 = Bronz (motions) — 125 belge
 *   4 = Düşük (letters, notices, routine orders) — 186 belge
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══ CourtListener Config ═══
const CL_BASE = 'https://www.courtlistener.com';
const CL_API = `${CL_BASE}/api/rest/v4`;
const DELAY_MS = 1500; // ~40 req/min (conservative)
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══ KNOWN DOCKETS — Cerrahi Hedefler ═══
// Bu liste elle doğrulanmış dava numaralarıdır.
// Yeni dava eklemek için buraya ekleme yapılmalıdır.
const KNOWN_DOCKETS = {
  '1:20-cr-00330': {
    name: 'United States v. Maxwell',
    court: 'nysd',
    docketId: 17318376,
    description: 'Ghislaine Maxwell federal ceza davası (SDNY)',
    status: 'active',
  },
  '1:19-cr-00490': {
    name: 'United States v. Epstein',
    court: 'nysd',
    docketId: null, // Henüz çekilmedi — CourtListener'dan bulunacak
    description: 'Jeffrey Epstein federal ceza davası (SDNY)',
    status: 'planned',
  },
  '1:15-cv-07433': {
    name: 'Giuffre v. Maxwell',
    court: 'nysd',
    docketId: null,
    description: 'Virginia Giuffre sivil davası — mühürlü belgeler açıldı',
    status: 'planned',
  },
  '9:08-cr-80736': {
    name: 'United States v. Epstein (FL)',
    court: 'flsd',
    docketId: null,
    description: 'Orijinal Florida ceza davası + tartışmalı NPA',
    status: 'planned',
  },
  '1:21-cv-07670': {
    name: 'Giuffre v. Prince Andrew',
    court: 'nysd',
    docketId: null,
    description: 'Prens Andrew sivil davası — anlaşma ile kapandı',
    status: 'planned',
  },
};

// ═══ TIER CLASSIFICATION ═══
function classifyTier(doc) {
  const sub = doc.metadata?.sub_category || 'unknown';
  const title = (doc.title || '').toLowerCase();
  const desc = (doc.description || '').toLowerCase();

  // Tier 1: Direct evidence
  if (sub === 'exhibit' || sub === 'transcript' || sub === 'indictment' || sub === 'sentencing') {
    return 1;
  }
  // Tier 2: Substantive judicial decisions
  if (sub === 'verdict' || sub === 'memorandum' ||
      title.includes('memorandum') || title.includes('opinion') ||
      desc.includes('plea') || desc.includes('guilty')) {
    return 2;
  }
  // Tier 3: Legal arguments (sometimes contain evidence references)
  if (sub === 'motion') {
    return 3;
  }
  // Tier 4: Administrative
  return 4;
}

// ═══ MULTI-STRATEGY FETCH FROM COURTLISTENER ═══
// Strategy cascade:
//   1. Docket entries API (entry-level metadata + documents list)
//   2. RECAP search API (public, no PACER auth needed)
//   3. Direct RECAP document (needs PACER-level auth — usually 403)
//   4. V3 search API (fallback for text snippets)

async function fetchRecapDocumentText(recapDocId, apiKey, entryNumber, docketId) {
  const authHeaders = { 'Accept': 'application/json' };
  if (apiKey) authHeaders['Authorization'] = `Token ${apiKey}`;
  const publicHeaders = { 'Accept': 'application/json' };

  // ── Strategy 1: Docket entry with embedded documents ──
  if (docketId && entryNumber) {
    try {
      const url = `${CL_API}/docket-entries/?docket=${docketId}&entry_number=${entryNumber}`;
      const res = await fetch(url, { headers: authHeaders, signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        const entry = data.results?.[0];
        if (entry) {
          // Docket entry might have recap_documents with plain_text
          const docs = entry.recap_documents || [];
          for (const doc of docs) {
            if (doc.plain_text && doc.plain_text.length > 100) {
              return {
                success: true, error: null, method: 'docket_entry',
                text: doc.plain_text,
                pdfUrl: doc.filepath_local ? `${CL_BASE}${doc.filepath_local}` : null,
                pageCount: doc.page_count || null,
              };
            }
          }
          // Has docs but no text — mark PDF urls
          if (docs.length > 0 && docs[0].filepath_local) {
            return {
              success: false, error: 'PDF_ONLY', method: 'docket_entry',
              text: null,
              pdfUrl: `${CL_BASE}${docs[0].filepath_local}`,
              pageCount: docs[0].page_count || null,
              fileSize: docs[0].file_size || null,
            };
          }
        }
      }
    } catch (e) { /* continue to next strategy */ }
  }

  // ── Strategy 2: RECAP search API (public — searches RECAP archive text) ──
  try {
    const searchUrl = `${CL_BASE}/api/rest/v3/search/?` + new URLSearchParams({
      type: 'r',             // RECAP type
      docket_id: String(docketId || ''),
      q: `entry_number:${entryNumber || ''}`,
      order_by: 'score desc',
    }).toString();

    const res = await fetch(searchUrl, { headers: publicHeaders, signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data = await res.json();
      const results = data.results || [];
      // Find matching result by entry number
      const match = results.find(r =>
        String(r.entry_number) === String(entryNumber) ||
        String(r.recap_doc_id) === String(recapDocId)
      ) || results[0];

      if (match) {
        // V3 search includes text snippets and sometimes full text
        const text = match.plain_text || match.text || '';
        if (text.length > 100) {
          return {
            success: true, error: null, method: 'v3_search',
            text: text,
            pdfUrl: match.filepath_local ? `${CL_BASE}${match.filepath_local}` : null,
            pageCount: match.page_count || null,
          };
        }
        // Has a PDF link but no text
        if (match.filepath_local) {
          return {
            success: false, error: 'PDF_ONLY', method: 'v3_search',
            text: null,
            pdfUrl: `${CL_BASE}${match.filepath_local}`,
            pageCount: match.page_count || null,
          };
        }
      }
    }
  } catch (e) { /* continue */ }

  // ── Strategy 3: Direct RECAP document endpoint (often needs PACER auth) ──
  try {
    const url = `${CL_API}/recap-documents/${recapDocId}/`;
    const res = await fetch(url, { headers: authHeaders, signal: AbortSignal.timeout(15000) });

    if (res.ok) {
      const data = await res.json();
      if (data.plain_text && data.plain_text.length > 100) {
        return {
          success: true, error: null, method: 'recap_direct',
          text: data.plain_text,
          pdfUrl: data.filepath_local ? `${CL_BASE}${data.filepath_local}` : null,
          pageCount: data.page_count || null,
        };
      }
      if (data.filepath_local || data.is_available) {
        return {
          success: false, error: 'PDF_ONLY', method: 'recap_direct',
          text: null,
          pdfUrl: data.filepath_local ? `${CL_BASE}${data.filepath_local}` : null,
          pageCount: data.page_count || null,
          fileSize: data.file_size || null,
        };
      }
    }
    // 403 = expected for RECAP docs without PACER auth, continue
  } catch (e) { /* continue */ }

  // ── Strategy 4: V3 general search (last resort) ──
  try {
    const title = entryNumber ? `entry ${entryNumber}` : String(recapDocId);
    const url = `${CL_BASE}/api/rest/v3/search/?` + new URLSearchParams({
      q: title,
      type: 'r',
      format: 'json',
    }).toString();

    const res = await fetch(url, { headers: publicHeaders, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const result = data.results?.[0];
      if (result) {
        const text = result.plain_text || result.text || '';
        if (text.length > 100) {
          return {
            success: true, error: null, method: 'v3_fallback',
            text: text, pdfUrl: null, pageCount: null,
          };
        }
      }
    }
  } catch (e) { /* all strategies exhausted */ }

  return { success: false, error: 'ALL_STRATEGIES_EXHAUSTED', text: null, pdfUrl: null };
}

// ═══ MAIN FETCH PIPELINE ═══
async function main() {
  const args = process.argv.slice(2);

  // Safe arg parser: returns null if flag not present (avoids indexOf -1 bug)
  function getArg(flag) {
    const eqForm = args.find(a => a.startsWith(flag + '='));
    if (eqForm) return eqForm.split('=')[1];
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return null;
  }

  const tierArg = getArg('--tier');
  const limitArg = parseInt(getArg('--limit') || '10');
  const dryRun = args.includes('--dry-run');
  const entryArg = getArg('--entry');
  const tier = tierArg ? parseInt(tierArg) : null;

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   DOCKET-BASED FETCH — Cerrahi Belge İndirme    ║');
  console.log('║   "Girdi ne kadar temizse çıktı o kadar temiz"  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Docket: 1:20-cr-00330 (US v. Maxwell)          ║');
  console.log('║  Kaynak: CourtListener RECAP Archive             ║');
  console.log('║  API Key:', CL_API_KEY ? 'VAR' : 'YOK (sadece public)', '                       ║');
  console.log('║  Tier:', tier || 'ALL', '| Limit:', limitArg, '| Dry Run:', dryRun, '     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Step 1: Get target documents from Supabase
  // Strategy: fetch docs with recap_doc_id but no raw_content yet (= needs fetching)
  console.log('📋 Adım 1: Hedef belgeleri Supabase\'den çek...');

  const { data: fetchableDocs, error: fetchErr } = await supabase
    .from('documents')
    .select('id, title, description, metadata, source_type, scan_status')
    .is('raw_content', null)
    .not('metadata->recap_doc_id', 'is', null)
    .limit(1000);

  if (fetchErr) {
    // Fallback: fetch all and filter in JS
    console.warn('   ⚠️ Smart query failed, fallback to full fetch:', fetchErr.message);
  }

  let pendingDocs;
  if (fetchableDocs && fetchableDocs.length > 0) {
    pendingDocs = fetchableDocs;
    console.log(`   Fetchable belgeler (recap_doc_id var, raw_content yok): ${pendingDocs.length}`);
  } else {
    // Fallback: brute force — fetch everything, filter in JS
    console.log('   Smart query sonuç vermedi, brute force...');
    const { data: allRaw } = await supabase
      .from('documents')
      .select('id, title, description, metadata, source_type, scan_status')
      .limit(2000);

    const all = allRaw || [];
    console.log(`   Toplam belgeler: ${all.length}`);

    // Filter: has recap_doc_id, not already scanned with content
    pendingDocs = all.filter(d => {
      const hasRecap = d.metadata && d.metadata.recap_doc_id;
      const notScanned = !d.scan_status || d.scan_status !== 'scanned';
      return hasRecap && notScanned;
    });
    console.log(`   Fetchable (recap_doc_id + not scanned): ${pendingDocs.length}`);
  }

  if (entryArg) {
    pendingDocs = pendingDocs.filter(d => (d.title || '').includes(`#${entryArg}`));
  }

  console.log(`   Toplam hedef: ${pendingDocs.length}`);

  // Step 2: Filter by tier
  let targets = pendingDocs.map(d => ({
    ...d,
    tier: classifyTier(d),
    recapDocId: d.metadata?.recap_doc_id,
    entryNumber: d.metadata?.entry_number,
    docketNumber: d.metadata?.docket_number,
  }));

  if (tier) {
    targets = targets.filter(d => d.tier === tier);
  }

  // Sort by priority (high first), then by entry number (chronological)
  targets.sort((a, b) => {
    const priA = a.metadata?.import_priority || 0;
    const priB = b.metadata?.import_priority || 0;
    if (priB !== priA) return priB - priA;
    return (a.entryNumber || 0) - (b.entryNumber || 0);
  });

  // Apply limit
  targets = targets.slice(0, limitArg);

  console.log(`   Hedef: ${targets.length} belge (Tier ${tier || 'ALL'}, limit ${limitArg})`);

  if (targets.length === 0) {
    console.log('⚠️  Hedef belge bulunamadı.');
    return;
  }

  // Step 3: Show targets
  console.log('\n📌 Adım 2: Hedef Belgeler:');
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  targets.forEach(t => {
    tierCounts[t.tier]++;
  });
  console.log(`   Tier 1 (Altın): ${tierCounts[1]} | Tier 2 (Gümüş): ${tierCounts[2]} | Tier 3 (Bronz): ${tierCounts[3]} | Tier 4 (Düşük): ${tierCounts[4]}`);

  targets.slice(0, 5).forEach(t => {
    console.log(`   • ${t.title?.substring(0, 60)} | RECAP: ${t.recapDocId || 'N/A'} | Tier: ${t.tier}`);
  });
  if (targets.length > 5) console.log(`   ... ve ${targets.length - 5} belge daha`);

  if (dryRun) {
    console.log('\n🏁 DRY RUN — İndirme yapılmadı.');
    console.log('   Gerçek indirme için: --dry-run bayrağını kaldırın');
    return;
  }

  // Step 4: Fetch content
  console.log('\n📥 Adım 3: İçerik çekiliyor...');

  const results = {
    textFound: 0,
    pdfOnly: 0,
    noContent: 0,
    authRequired: 0,
    errors: 0,
    updated: 0,
  };

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const pct = Math.round(((i + 1) / targets.length) * 100);
    process.stdout.write(`\r   [${pct}%] ${i + 1}/${targets.length} — #${target.entryNumber || '?'} ${target.title?.substring(0, 40)}...`);

    if (!target.recapDocId) {
      results.noContent++;
      continue;
    }

    // Validate: Is this from a known docket?
    const docket = target.docketNumber;
    if (docket && !KNOWN_DOCKETS[docket]) {
      console.log(`\n   ⚠️  SKIP: Bilinmeyen docket ${docket} — güvenlik duvarı`);
      results.errors++;
      continue;
    }

    // Fetch — pass docketId for Strategy 1 (docket entries API)
    const knownDocket = docket ? KNOWN_DOCKETS[docket] : null;
    const docketId = knownDocket?.docketId || target.metadata?.docket_id || null;
    const fetchResult = await fetchRecapDocumentText(
      target.recapDocId, CL_API_KEY, target.entryNumber, docketId
    );
    await sleep(DELAY_MS);

    if (fetchResult.success && fetchResult.text) {
      results.textFound++;

      // Update Supabase
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          raw_content: fetchResult.text,
          scan_status: 'ready', // ready for 3-pass scan
          metadata: {
            ...target.metadata,
            content_status: 'text_fetched',
            fetch_method: fetchResult.method || 'recap_api',
            fetch_date: new Date().toISOString(),
            page_count: fetchResult.pageCount,
          },
        })
        .eq('id', target.id);

      if (updateError) {
        console.log(`\n   ❌ DB update hatası: ${updateError.message}`);
        results.errors++;
      } else {
        results.updated++;
      }

    } else if (fetchResult.error === 'PDF_ONLY') {
      results.pdfOnly++;

      // Mark as PDF-only — needs Document AI OCR later
      await supabase
        .from('documents')
        .update({
          metadata: {
            ...target.metadata,
            content_status: 'pdf_only',
            pdf_url: fetchResult.pdfUrl,
            page_count: fetchResult.pageCount,
            file_size: fetchResult.fileSize,
          },
        })
        .eq('id', target.id);

    } else if (fetchResult.error?.startsWith('AUTH_')) {
      results.authRequired++;
      if (results.authRequired <= 2) {
        console.log(`\n   🔑 Auth hatası: ${fetchResult.error}`);
      }
    } else if (fetchResult.error === 'ALL_STRATEGIES_EXHAUSTED') {
      results.noContent++;
      if (results.noContent <= 2) {
        console.log(`\n   ⬜ Tüm stratejiler tükendi: #${target.entryNumber || '?'}`);
      }
    } else {
      results.noContent++;
    }
  }

  // Step 5: Summary
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║             FETCH SONUÇ RAPORU                   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Hedef:          ${targets.length.toString().padStart(5)} belge                    ║`);
  console.log(`║  Metin bulundu:  ${results.textFound.toString().padStart(5)} ✅ (taramaya hazır)     ║`);
  console.log(`║  PDF only:       ${results.pdfOnly.toString().padStart(5)} 📄 (OCR gerekli)        ║`);
  console.log(`║  Auth gerekli:   ${results.authRequired.toString().padStart(5)} 🔑                      ║`);
  console.log(`║  İçerik yok:     ${results.noContent.toString().padStart(5)} ⬜                      ║`);
  console.log(`║  Hata:           ${results.errors.toString().padStart(5)} ❌                      ║`);
  console.log(`║  DB güncellendi: ${results.updated.toString().padStart(5)} 💾                      ║`);
  console.log('╠══════════════════════════════════════════════════╣');

  if (results.textFound > 0) {
    console.log('║                                                  ║');
    console.log('║  Sonraki adım:                                   ║');
    console.log('║  node scripts/bulk-scan.mjs --status ready       ║');
    console.log('║                                                  ║');
  }

  if (results.pdfOnly > 0) {
    console.log('║  PDF belgeler için:                               ║');
    console.log('║  Document AI OCR pipeline gerekli                 ║');
    console.log('║                                                  ║');
  }

  if (results.authRequired > 0) {
    console.log('║  Auth gerekli belgeler için:                      ║');
    console.log('║  .env.local → COURTLISTENER_API_KEY ekle          ║');
    console.log('║                                                  ║');
  }

  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
