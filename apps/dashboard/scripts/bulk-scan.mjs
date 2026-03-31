#!/usr/bin/env node
/**
 * BULK SCAN — Run 3-Pass Consensus Engine on all pending documents
 *
 * Calls /api/documents/scan for each document with scan_status='pending'
 * Rate-limited: 1 scan per 8 seconds (3 Groq calls per scan × rate limits)
 *
 * Usage: node scripts/bulk-scan.mjs
 *        node scripts/bulk-scan.mjs --dry-run    (preview without scanning)
 *        node scripts/bulk-scan.mjs --limit 5    (scan only first N)
 *
 * Prerequisites:
 * - Documents imported via import-to-system.mjs
 * - SPRINT_PIPELINE_MIGRATION.sql applied
 * - .env.local with GROQ_API_KEY + SUPABASE credentials
 * - Dev server running (npm run dev)
 */

import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Run from apps/dashboard/');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      vars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// API base URL — local dev server
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Delay between scans (ms) — 3 passes × 1.5s delay each + overhead = ~8s minimum
const SCAN_DELAY_MS = 10000;

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const SCAN_LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;
// --status flag: scan documents with this scan_status (default: 'pending')
// Use --status ready for documents fetched by docket-fetch.mjs
const statusIdx = args.indexOf('--status');
const SCAN_STATUS = statusIdx >= 0 ? args[statusIdx + 1] : 'pending';

// ═══════════════════════════════════════════
// SUPABASE REST
// ═══════════════════════════════════════════

async function supabaseGet(table, queryParams = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GET ${table}: ${res.status} — ${err}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  BULK SCAN — 3-Pass Consensus Engine');
  console.log('═══════════════════════════════════════════');
  if (DRY_RUN) console.log('  🔍 DRY RUN — no actual scanning');
  if (SCAN_LIMIT < Infinity) console.log(`  📊 Limit: ${SCAN_LIMIT} documents`);
  console.log(`  📌 Status filter: ${SCAN_STATUS}`);
  console.log(`  API: ${API_BASE}`);
  console.log('');

  // Fetch documents with target scan_status
  const docs = await supabaseGet(
    'documents',
    `?select=id,title,document_type,source_type,scan_status,raw_content&scan_status=eq.${SCAN_STATUS}&order=created_at.asc&limit=100`
  );

  console.log(`  ${SCAN_STATUS} documents: ${docs.length}`);

  // Filter to ones that have raw_content
  const scannable = docs.filter(d => d.raw_content && d.raw_content.length > 100);
  console.log(`  Scannable (with content): ${scannable.length}`);

  const toScan = scannable.slice(0, SCAN_LIMIT);
  console.log(`  Will scan: ${toScan.length}`);
  console.log('');

  if (DRY_RUN) {
    console.log('  Documents to scan:');
    for (const doc of toScan) {
      const contentLen = (doc.raw_content || '').length;
      console.log(`    ${doc.id.slice(0, 8)}... | ${doc.title?.slice(0, 50)} | ${(contentLen / 1024).toFixed(0)}KB | ${doc.source_type}`);
    }
    console.log('\n  To run for real: node scripts/bulk-scan.mjs');
    return;
  }

  // Check if dev server is running
  try {
    const health = await fetch(`${API_BASE}/api/documents/stats`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`Status ${health.status}`);
    console.log('  ✅ Dev server is running');
  } catch {
    console.error('  ❌ Dev server not reachable at', API_BASE);
    console.error('  Start it with: npm run dev');
    process.exit(1);
  }

  // Scan each document
  let scanned = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < toScan.length; i++) {
    const doc = toScan[i];
    const pct = Math.round(((i + 1) / toScan.length) * 100);
    process.stdout.write(`\r  [${pct}%] Scanning ${i + 1}/${toScan.length}: ${doc.title?.slice(0, 40)}...`);

    try {
      const startTime = Date.now();

      const res = await fetch(`${API_BASE}/api/documents/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          fingerprint: 'system_bulk_scan',
        }),
        signal: AbortSignal.timeout(120000), // 2 min timeout (3 passes take time)
      });

      const duration = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json();
        const entityCount = data.entities?.length || 0;
        const relCount = data.relationships?.length || 0;
        const rejected = data.rejected_entities?.length || 0;
        const composite = data.confidence || 0;
        const route = data.confidence_route || 'unknown';

        results.push({
          id: doc.id,
          title: doc.title,
          entities: entityCount,
          relationships: relCount,
          rejected,
          confidence: composite,
          route,
          duration_ms: duration,
        });

        console.log(`\n    ✅ ${entityCount} entities, ${relCount} rels, ${rejected} rejected | conf=${composite.toFixed(3)} | route=${route} | ${(duration / 1000).toFixed(1)}s`);
        scanned++;
      } else {
        const errText = await res.text().catch(() => 'unknown error');
        console.log(`\n    ❌ HTTP ${res.status}: ${errText.slice(0, 100)}`);
        failed++;

        // If rate limited, wait longer
        if (res.status === 429) {
          console.log('    ⏳ Rate limited — waiting 60s...');
          await new Promise(r => setTimeout(r, 60000));
        }
      }
    } catch (err) {
      console.log(`\n    ❌ Error: ${err.message}`);
      failed++;
    }

    // Delay between scans (respect Groq rate limits)
    if (i < toScan.length - 1) {
      await new Promise(r => setTimeout(r, SCAN_DELAY_MS));
    }
  }

  // Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  BULK SCAN COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Scanned: ${scanned}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total entities: ${results.reduce((s, r) => s + r.entities, 0)}`);
  console.log(`  Total relationships: ${results.reduce((s, r) => s + r.relationships, 0)}`);
  console.log(`  Total rejected: ${results.reduce((s, r) => s + r.rejected, 0)}`);
  console.log(`  Avg confidence: ${(results.reduce((s, r) => s + r.confidence, 0) / (results.length || 1)).toFixed(3)}`);
  console.log(`  Total duration: ${(results.reduce((s, r) => s + r.duration_ms, 0) / 1000).toFixed(0)}s`);

  // Route distribution
  const routes = {};
  for (const r of results) {
    routes[r.route] = (routes[r.route] || 0) + 1;
  }
  console.log(`\n  Confidence routes:`);
  for (const [route, count] of Object.entries(routes)) {
    console.log(`    ${route}: ${count}`);
  }

  // Save results log
  const logPath = path.join(process.cwd(), 'fetched-documents', 'scan-results.json');
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    scanned,
    failed,
    results,
  }, null, 2));
  console.log(`\n  Results saved: ${logPath}`);

  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
