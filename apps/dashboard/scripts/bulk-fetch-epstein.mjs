#!/usr/bin/env node
/**
 * BULK FETCH — Epstein Network Documents from CourtListener
 *
 * Fetches court opinions and RECAP documents for:
 * - United States v. Maxwell (1:20-cr-00330)
 * - Giuffre v. Maxwell
 * - Epstein-related cases
 *
 * Usage: node scripts/bulk-fetch-epstein.mjs
 *
 * Output: ./fetched-documents/ folder with text files + manifest.json
 */

import fs from 'fs';
import path from 'path';

const API_KEY = '67e1d2c8799384ae1b68c4abbb985dd59e23349d';
const BASE_URL = 'https://www.courtlistener.com/api/rest/v4';
const OUTPUT_DIR = path.join(process.cwd(), 'fetched-documents');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// Rate limiting
const DELAY_MS = 1200; // ~50 req/min (safe under 5000/hr limit)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════
// SEARCH QUERIES — Targeted, not random
// ═══════════════════════════════════════════
const SEARCH_QUERIES = [
  // Primary: Maxwell criminal case
  { query: 'United States v. Maxwell', type: 'o', label: 'maxwell-criminal', maxPages: 5 },
  // Giuffre civil case (unsealed documents)
  { query: 'Giuffre v. Maxwell', type: 'o', label: 'giuffre-maxwell', maxPages: 5 },
  // Epstein criminal case
  { query: 'United States v. Epstein', type: 'o', label: 'epstein-criminal', maxPages: 3 },
  // Doe v. Epstein (victim suits)
  { query: 'Doe v. Epstein', type: 'o', label: 'doe-epstein', maxPages: 2 },
  // USVI v. JPMorgan (financial connections)
  { query: 'Virgin Islands v. JPMorgan Epstein', type: 'o', label: 'usvi-jpmorgan', maxPages: 2 },
  // Farmer v. Epstein
  { query: 'Farmer v. Epstein', type: 'o', label: 'farmer-epstein', maxPages: 1 },
  // Broader Epstein opinions
  { query: 'Jeffrey Epstein', type: 'o', label: 'epstein-general', maxPages: 3 },
];

// ═══════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Token ${API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '30');
    console.log(`  ⚠️  Rate limited. Waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return apiGet(endpoint, params); // Retry
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} — ${url.pathname}`);
  }

  return res.json();
}

async function fetchOpinionText(opinionUrl) {
  try {
    // opinionUrl is like /api/rest/v4/opinions/12345/
    const opId = opinionUrl.match(/opinions\/(\d+)/)?.[1];
    if (!opId) return null;

    const data = await apiGet(`/opinions/${opId}/`);

    // Try text sources in order of preference
    const text = data.plain_text
      || stripHtml(data.html_lawbox)
      || stripHtml(data.html_columbia)
      || stripHtml(data.html)
      || stripHtml(data.html_anon_2020)
      || null;

    return {
      text,
      type: data.type,
      author: data.author_str || null,
      per_curiam: data.per_curiam || false,
      date_created: data.date_created,
      download_url: data.download_url || null,
      page_count: data.page_count || null,
    };
  } catch (err) {
    console.log(`  ⚠️  Failed to fetch opinion: ${err.message}`);
    return null;
  }
}

function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════
// MAIN FETCH LOGIC
// ═══════════════════════════════════════════

async function searchAndCollect(query, type, label, maxPages) {
  console.log(`\n🔍 Searching: "${query}" (type=${type}, max ${maxPages} pages)`);

  const results = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    try {
      const data = await apiGet('/search/', {
        q: query,
        type: type,
        format: 'json',
        page_size: '20',
        page: String(page),
        order_by: 'score desc',
      });

      const items = data.results || [];
      console.log(`  Page ${page}: ${items.length} results`);

      for (const item of items) {
        results.push({
          id: item.cluster_id || item.id,
          case_name: item.caseName || item.case_name || 'Unknown',
          date_filed: item.dateFiled || item.date_filed || null,
          court: item.court || item.court_id || null,
          docket_number: item.docketNumber || item.docket_number || null,
          absolute_url: item.absolute_url || null,
          snippet: item.snippet || null,
          search_label: label,
          sub_opinions: item.sub_opinions || [],
        });
      }

      hasMore = items.length === 20 && data.next;
      page++;
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`  ❌ Search error page ${page}: ${err.message}`);
      hasMore = false;
    }
  }

  return results;
}

async function fetchFullDocuments(clusters) {
  console.log(`\n📥 Fetching full text for ${clusters.length} documents...`);

  const documents = [];
  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const cluster of clusters) {
    fetched++;
    const pct = Math.round((fetched / clusters.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${fetched}/${clusters.length} — ${cluster.case_name.slice(0, 50)}...`);

    try {
      // Fetch cluster details to get sub_opinions
      const clusterData = await apiGet(`/clusters/${cluster.id}/`);
      await sleep(DELAY_MS);

      const subOpinionUrls = clusterData.sub_opinions || cluster.sub_opinions || [];

      if (subOpinionUrls.length === 0) {
        skipped++;
        continue;
      }

      // Fetch first (main) opinion text
      const opinionData = await fetchOpinionText(subOpinionUrls[0]);
      await sleep(DELAY_MS);

      if (!opinionData?.text || opinionData.text.length < 200) {
        skipped++;
        continue;
      }

      documents.push({
        cluster_id: cluster.id,
        case_name: clusterData.case_name || cluster.case_name,
        date_filed: clusterData.date_filed || cluster.date_filed,
        court: cluster.court,
        docket_number: clusterData.docket_number || cluster.docket_number,
        url: `https://www.courtlistener.com${cluster.absolute_url || `/opinion/${cluster.id}/`}`,
        search_label: cluster.search_label,
        text: opinionData.text,
        text_length: opinionData.text.length,
        author: opinionData.author,
        opinion_type: opinionData.type,
        page_count: opinionData.page_count,
        download_url: opinionData.download_url,
      });

    } catch (err) {
      failed++;
      console.log(`\n  ❌ Failed cluster ${cluster.id}: ${err.message}`);
    }
  }

  console.log(`\n  ✅ Fetched: ${documents.length} | Skipped: ${skipped} | Failed: ${failed}`);
  return documents;
}

// ═══════════════════════════════════════════
// SAVE TO DISK
// ═══════════════════════════════════════════

function saveToDisk(documents) {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const manifest = [];

  for (const doc of documents) {
    const safeId = `cl_${doc.cluster_id}`;
    const textFile = `${safeId}.txt`;
    const metaFile = `${safeId}.meta.json`;

    // Save full text
    fs.writeFileSync(
      path.join(OUTPUT_DIR, textFile),
      doc.text,
      'utf-8'
    );

    // Save metadata (without text)
    const meta = { ...doc };
    delete meta.text;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, metaFile),
      JSON.stringify(meta, null, 2),
      'utf-8'
    );

    manifest.push({
      id: safeId,
      cluster_id: doc.cluster_id,
      case_name: doc.case_name,
      date_filed: doc.date_filed,
      court: doc.court,
      docket_number: doc.docket_number,
      url: doc.url,
      search_label: doc.search_label,
      text_file: textFile,
      meta_file: metaFile,
      text_length: doc.text_length,
      author: doc.author,
      page_count: doc.page_count,
    });
  }

  // Save manifest
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify({
      generated_at: new Date().toISOString(),
      total_documents: manifest.length,
      total_text_bytes: manifest.reduce((sum, d) => sum + d.text_length, 0),
      search_queries: SEARCH_QUERIES.map(q => q.query),
      documents: manifest,
    }, null, 2),
    'utf-8'
  );

  return manifest;
}

// ═══════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════

function deduplicateClusters(allClusters) {
  const seen = new Map();
  for (const cluster of allClusters) {
    const key = cluster.id;
    if (!seen.has(key)) {
      seen.set(key, cluster);
    }
  }
  console.log(`\n🔄 Deduplication: ${allClusters.length} → ${seen.size} unique clusters`);
  return Array.from(seen.values());
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  BULK FETCH — Epstein Network Documents');
  console.log('  CourtListener API');
  console.log('═══════════════════════════════════════════');
  console.log(`  API Key: ...${API_KEY.slice(-8)}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Queries: ${SEARCH_QUERIES.length}`);
  console.log('');

  // Phase 1: Search all queries
  let allClusters = [];
  for (const { query, type, label, maxPages } of SEARCH_QUERIES) {
    const results = await searchAndCollect(query, type, label, maxPages);
    allClusters.push(...results);
  }

  console.log(`\n📊 Total raw results: ${allClusters.length}`);

  // Phase 2: Deduplicate
  const uniqueClusters = deduplicateClusters(allClusters);

  // Phase 3: Fetch full text
  const documents = await fetchFullDocuments(uniqueClusters);

  // Phase 4: Save to disk
  const manifest = saveToDisk(documents);

  // Phase 5: Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  FETCH COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Documents saved: ${manifest.length}`);
  console.log(`  Total text: ${(manifest.reduce((s, d) => s + d.text_length, 0) / 1024).toFixed(0)} KB`);
  console.log(`  Output folder: ${OUTPUT_DIR}`);
  console.log(`  Manifest: ${MANIFEST_PATH}`);

  // Breakdown by search label
  const byLabel = {};
  for (const doc of manifest) {
    byLabel[doc.search_label] = (byLabel[doc.search_label] || 0) + 1;
  }
  console.log('\n  By category:');
  for (const [label, count] of Object.entries(byLabel)) {
    console.log(`    ${label}: ${count}`);
  }

  console.log('\n  Next step: node scripts/import-to-system.mjs');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
