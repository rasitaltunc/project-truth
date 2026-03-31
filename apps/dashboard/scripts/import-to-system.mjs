#!/usr/bin/env node
/**
 * IMPORT TO SYSTEM — Load fetched CourtListener documents into Supabase
 *
 * Reads from ./fetched-documents/ (output of bulk-fetch-epstein.mjs)
 * Creates document records in Supabase `documents` table
 * Stores full text in `raw_content` column for scanning
 *
 * Usage: node scripts/import-to-system.mjs
 *
 * Prerequisites:
 * - Run SPRINT_PIPELINE_MIGRATION.sql on Supabase
 * - .env.local with SUPABASE credentials
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════
// CONFIG — Load from .env.local
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE credentials in .env.local');
  process.exit(1);
}

const MANIFEST_PATH = path.join(process.cwd(), 'fetched-documents', 'manifest.json');
const DOCS_DIR = path.join(process.cwd(), 'fetched-documents');

// Epstein Network UUID — update this to match your network ID
const NETWORK_ID = '00000000-0000-0000-0000-000000000001'; // Will be fetched dynamically

// ═══════════════════════════════════════════
// RELEVANCE FILTER — Only Epstein/Maxwell cases
// ═══════════════════════════════════════════

const RELEVANT_CASE_PATTERNS = [
  /united states v\.\s*maxwell/i,
  /giuffre v\.\s*maxwell/i,
  /brown v\.\s*maxwell/i,
  /dershowitz v\.\s*giuffre/i,
  /united states v\.\s*epstein/i,
  /jane doe.*v\.\s*(epstein|roy black)/i,
  /people v\.\s*epstein/i,
  /serrano v\.\s*jeffrey epstein/i,
  /edwards v\.\s*jeffrey epstein/i,
  /epstein v\.\s*brunel/i,
  /jane doe no\.\s*\d+\s*v\.\s*epstein/i,
];

function isRelevantCase(caseName) {
  if (!caseName) return false;
  return RELEVANT_CASE_PATTERNS.some(pattern => pattern.test(caseName));
}

// ═══════════════════════════════════════════
// SUPABASE REST API (no SDK dependency)
// ═══════════════════════════════════════════

async function supabaseQuery(table, method = 'GET', body = null, queryParams = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}`;
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} — ${errText}`);
  }

  if (method === 'GET' || options.headers.Prefer === 'return=representation') {
    return res.json();
  }
  return null;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  IMPORT TO SYSTEM — CourtListener → Supabase');
  console.log('═══════════════════════════════════════════');

  // Read manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Manifest not found. Run bulk-fetch-epstein.mjs first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`  Total in manifest: ${manifest.total_documents}`);

  // Find the Epstein network ID
  let networkId = NETWORK_ID;
  try {
    const networks = await supabaseQuery('networks', 'GET', null, '?select=id,name&name=ilike.*epstein*&limit=1');
    if (networks && networks.length > 0) {
      networkId = networks[0].id;
      console.log(`  Network found: ${networks[0].name} (${networkId})`);
    } else {
      // Try broader search
      const allNetworks = await supabaseQuery('networks', 'GET', null, '?select=id,name&limit=5');
      if (allNetworks && allNetworks.length > 0) {
        networkId = allNetworks[0].id;
        console.log(`  Using first network: ${allNetworks[0].name} (${networkId})`);
      } else {
        console.error('❌ No networks found. Create a network first.');
        process.exit(1);
      }
    }
  } catch (err) {
    console.warn(`  ⚠️  Network lookup failed: ${err.message}. Using default.`);
  }

  // Filter to relevant cases
  const relevantDocs = manifest.documents.filter(doc => isRelevantCase(doc.case_name));
  console.log(`  Relevant cases: ${relevantDocs.length} / ${manifest.documents.length}`);
  console.log('');

  // Check for existing documents to avoid duplicates
  let existingExternalIds = new Set();
  try {
    const existing = await supabaseQuery(
      'documents', 'GET', null,
      `?select=external_id&source_type=eq.courtlistener&network_id=eq.${networkId}&limit=1000`
    );
    // Normalize to strings for comparison
    existingExternalIds = new Set((existing || []).map(d => String(d.external_id)));
    if (existingExternalIds.size > 0) {
      console.log(`  Already imported: ${existingExternalIds.size} CourtListener docs`);
    }
  } catch {
    console.warn('  ⚠️  Could not check existing docs — will attempt all (duplicates caught by DB)');
  }

  // Import each document
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of relevantDocs) {
    const externalId = String(doc.cluster_id);

    // Skip duplicates
    if (existingExternalIds.has(externalId)) {
      console.log(`  ⏭️  Skip (exists): ${doc.case_name.slice(0, 50)}`);
      skipped++;
      continue;
    }

    // Read full text
    const textPath = path.join(DOCS_DIR, doc.text_file);
    if (!fs.existsSync(textPath)) {
      console.log(`  ❌ Text file missing: ${doc.text_file}`);
      failed++;
      continue;
    }

    const fullText = fs.readFileSync(textPath, 'utf-8');
    const textHash = createHash('sha256').update(fullText).digest('hex');

    // Map document type based on search label
    let documentType = 'court_record';
    if (doc.search_label.includes('criminal')) documentType = 'court_record';
    else if (doc.search_label.includes('civil') || doc.search_label.includes('giuffre')) documentType = 'court_record';
    else if (doc.search_label.includes('jpmorgan')) documentType = 'financial';

    // Build document record — only columns known to exist in documents table
    const record = {
      network_id: networkId,
      title: doc.case_name,
      description: `CourtListener opinion — ${doc.case_name}. Docket: ${doc.docket_number || 'N/A'}. Filed: ${doc.date_filed || 'Unknown'}.`,
      document_type: documentType,
      source_type: 'courtlistener',
      external_id: externalId,
      external_url: doc.url,
      raw_content: fullText,
      date_filed: doc.date_filed || null,
      country_tags: ['USA'],
      scan_status: 'pending',
      metadata: {
        cluster_id: doc.cluster_id,
        court: doc.court,
        docket_number: doc.docket_number,
        search_label: doc.search_label,
        author: doc.author,
        page_count: doc.page_count,
        text_length: doc.text_length,
        download_url: doc.download_url,
        fetch_date: manifest.generated_at,
        // Provenance stored in metadata until pipeline columns are available
        original_hash: textHash,
        original_path: `courtlistener://opinions/${externalId}`,
      },
    };

    // Try with new pipeline columns first, fallback to core only
    try {
      const recordWithPipeline = {
        ...record,
        original_hash: textHash,
        original_path: `courtlistener://opinions/${externalId}`,
      };
      const result = await supabaseQuery('documents', 'POST', recordWithPipeline);
      const newId = result?.[0]?.id;
      console.log(`  ✅ Imported: ${doc.case_name.slice(0, 50)} → ${newId || '(ok)'}`);
      imported++;
    } catch (err) {
      // PGRST204 = column not found in schema cache → retry without pipeline columns
      if (err.message.includes('PGRST204')) {
        try {
          const result = await supabaseQuery('documents', 'POST', record);
          const newId = result?.[0]?.id;
          console.log(`  ✅ Imported (core): ${doc.case_name.slice(0, 50)} → ${newId || '(ok)'}`);
          imported++;
        } catch (err2) {
          console.log(`  ❌ Failed: ${doc.case_name.slice(0, 50)} — ${err2.message.slice(0, 120)}`);
          failed++;
        }
      } else {
        console.log(`  ❌ Failed: ${doc.case_name.slice(0, 50)} — ${err.message.slice(0, 120)}`);
        failed++;
      }
    }

    // Small delay to not overwhelm Supabase
    await new Promise(r => setTimeout(r, 200));
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Network: ${networkId}`);
  console.log('');
  console.log('  Next step: Scan documents through 3-pass pipeline');
  console.log('  Command: node scripts/bulk-scan.mjs');
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
