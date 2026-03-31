#!/usr/bin/env node
/**
 * STANDALONE SCAN — Direct Groq + Supabase (no dev server needed)
 *
 * Calls consensus engine logic directly via Groq API.
 * Does NOT require Next.js dev server.
 *
 * Usage:
 *   node scripts/standalone-scan.mjs --limit 3          (pilot test)
 *   node scripts/standalone-scan.mjs --limit 50         (batch)
 *   node scripts/standalone-scan.mjs --dry-run           (preview)
 *   node scripts/standalone-scan.mjs --id <doc-uuid>     (specific doc)
 */

import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════
// ENV
// ═══════════════════════════════════════════

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_API_KEY = env.GROQ_API_KEY;

if (!GROQ_API_KEY) { console.error('❌ GROQ_API_KEY missing'); process.exit(1); }

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const SCAN_LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 3;
const idIdx = args.indexOf('--id');
const SPECIFIC_ID = idIdx >= 0 ? args[idIdx + 1] : null;

// Rate limit: 3 Groq calls per scan, 30 req/min on free tier → ~10s between scans
const SCAN_DELAY_MS = 12000;

// ═══════════════════════════════════════════
// SUPABASE REST
// ═══════════════════════════════════════════

async function supabaseGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${table}: ${res.status} — ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table}: ${res.status} — ${await res.text()}`);
}

async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    // Ignore duplicate key errors
    if (err.includes('duplicate key')) return [];
    throw new Error(`INSERT ${table}: ${res.status} — ${err}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════
// GROQ API
// ═══════════════════════════════════════════

async function groqChat(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 4096,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (res.status === 429) {
        const wait = attempt === 0 ? 30000 : 60000;
        console.log(`\n    ⏳ Rate limited — waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};
      return { text, usage };
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`\n    ⚠️ Retry ${attempt + 1}: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ═══════════════════════════════════════════
// BLOCKED ENTITIES (noise filter)
// ═══════════════════════════════════════════

const BLOCKED = new Set([
  'united states', 'united states of america', 'usa', 'us', 'u.s.',
  'government', 'u.s. government', 'federal government',
  'court', 'the court', 'district court',
  'state', 'the state', 'people', 'the people',
  'plaintiff', 'defendant', 'prosecution', 'defense',
  'department of justice', 'doj',
  'federal bureau of investigation', 'fbi',
  'southern district of new york', 'sdny',
  'grand jury', 'jury', 'probation office',
  'unknown', 'n/a', 'none', 'other',
]);

function isBlocked(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  return BLOCKED.has(n) || n.length <= 2 || /^\d+$/.test(n);
}

// ═══════════════════════════════════════════
// ENTITY RESOLUTION — Catch spelling variants
// ═══════════════════════════════════════════

/**
 * Jaro-Winkler similarity (0-1). >0.85 = likely same person.
 */
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (!len1 || !len2) return 0;
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true; s2Matches[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize name for comparison
 */
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve duplicate entities — merge spelling variants
 * "Paul A. Engelweger" + "Paul A. Engelmayer" → keep the one with higher confidence
 */
function resolveEntities(entities) {
  const resolved = [];
  const used = new Set();

  for (let i = 0; i < entities.length; i++) {
    if (used.has(i)) continue;
    let best = entities[i];
    const group = [i];

    for (let j = i + 1; j < entities.length; j++) {
      if (used.has(j)) continue;
      const sim = jaroWinkler(normalizeName(best.name), normalizeName(entities[j].name));
      if (sim >= 0.85) {
        group.push(j);
        used.add(j);
        // Keep the one with more passes or higher confidence
        const jEnt = entities[j];
        if ((jEnt.passes?.length || 0) > (best.passes?.length || 0) ||
            (jEnt.confidence || 0) > (best.confidence || 0)) {
          best = { ...jEnt, passes: [...new Set([...(best.passes || []), ...(jEnt.passes || [])])] };
        } else {
          best = { ...best, passes: [...new Set([...(best.passes || []), ...(jEnt.passes || [])])] };
        }
      }
    }
    used.add(i);
    resolved.push(best);
  }
  return resolved;
}

/**
 * Deduplicate relationships — same source+target = merge
 */
function dedupeRelationships(rels) {
  const map = new Map();
  for (const r of rels) {
    // Normalize: lowercase source→target
    const key = `${normalizeName(r.sourceName)}→${normalizeName(r.targetName)}`;
    const reverseKey = `${normalizeName(r.targetName)}→${normalizeName(r.sourceName)}`;
    if (!map.has(key) && !map.has(reverseKey)) {
      map.set(key, r);
    }
    // If exists, keep higher confidence one
    else {
      const existing = map.get(key) || map.get(reverseKey);
      if ((r.confidence || 0) > (existing.confidence || 0)) {
        map.delete(key); map.delete(reverseKey);
        map.set(key, r);
      }
    }
  }
  return [...map.values()];
}

// ═══════════════════════════════════════════
// 3-PASS CONSENSUS ENGINE
// ═══════════════════════════════════════════

function buildPass1(text, nodeList) {
  return `You are an investigative analyst. Extract ONLY entities that are EXPLICITLY and CLEARLY mentioned in this document.

DOCUMENT CONTENT:
${text.slice(0, 12000)}

CURRENT NETWORK PEOPLE (for matching):
${nodeList}

RULES — STRICT:
- Extract ONLY what is EXPLICITLY stated in the document
- If uncertain, DO NOT include — it is better to miss than to hallucinate
- Every entity MUST have a direct quote from the document as "context"
- LANGUAGE: ALL output must be in ENGLISH
- BLOCKED LIST: "United States", "USA", "Government", "Court", "State", "People", "Plaintiff", "Defendant", "Prosecution", "Defense", "DOJ", "FBI", "SDNY"
- Do NOT extract case citations or docket numbers as entities
- Legal professionals: importance "low" unless subjects of investigation
- Victims: Jane Doe format

OUTPUT JSON:
{"entities":[{"name":"Full Name","type":"person|organization|location","role":"Role","importance":"critical|high|medium|low","category":"subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only","confidence":0.0,"mention_count":0,"context":"quote"}],"relationships":[{"sourceName":"A","targetName":"B","relationshipType":"type","evidenceType":"court_record|financial_record|witness_testimony|official_document","description":"passage","confidence":0.0}],"summary":"2-3 sentences","keyDates":[{"date":"YYYY-MM-DD","description":"event"}],"confidence":0.0}`;
}

function buildPass2(text, pass1Entities) {
  const list = pass1Entities.map(e => `- ${e.name} (${e.type}, ${e.role}, conf: ${e.confidence})`).join('\n');
  return `You are a SKEPTICAL fact-checker. Challenge the first analyst's work.

DOCUMENT CONTENT:
${text.slice(0, 12000)}

ENTITIES CLAIMED BY FIRST ANALYST:
${list}

YOUR TASK — BE CRITICAL:
1. For EACH entity: does this EXACT name appear in the document? Is the role supported?
2. Could this be a GENERIC TERM? A confusion with another person?
3. ONLY include entities with DIRECT textual evidence
4. For relationships: does the document EXPLICITLY state this connection?
5. Find NEW relationships the first analyst missed
6. LANGUAGE: ALL output in ENGLISH

OUTPUT JSON (only VERIFIED):
{"entities":[{"name":"Full Name","type":"person|organization|location","role":"VERIFIED role","importance":"critical|high|medium|low","category":"subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only","confidence":0.0,"mention_count":0,"context":"EXACT quote"}],"relationships":[{"sourceName":"A","targetName":"B","relationshipType":"type","evidenceType":"court_record|financial_record|witness_testimony|official_document","description":"EXACT passage","confidence":0.0}],"summary":"verified summary","keyDates":[],"confidence":0.0}`;
}

function buildPass3(text, alreadyFound, nodeList) {
  return `You are a thorough investigative researcher. Find ADDITIONAL entities and ALL relationships missed earlier.

DOCUMENT CONTENT:
${text.slice(0, 12000)}

ALREADY FOUND (do NOT repeat): ${alreadyFound}

CURRENT NETWORK PEOPLE: ${nodeList}

TASK:
- Find missed entities: abbreviated names, nicknames, organizations mentioned in passing
- Find ALL relationships between entities
- Do NOT repeat already-found entities
- BLOCKED: "United States", "USA", "Government", "Court", "DOJ", "FBI", "SDNY"
- Every entity/relationship MUST cite a document passage
- If nothing new, return empty arrays
- LANGUAGE: ALL output in ENGLISH

OUTPUT JSON:
{"entities":[{"name":"Full Name","type":"person|organization|location","role":"Role","importance":"critical|high|medium|low","category":"subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only","confidence":0.0,"mention_count":0,"context":"quote"}],"relationships":[{"sourceName":"A","targetName":"B","relationshipType":"type","evidenceType":"court_record|financial_record|witness_testimony|official_document","description":"passage","confidence":0.0}],"summary":"","keyDates":[],"confidence":0.0}`;
}

async function runConsensus(text, nodeList) {
  // Pass 1 — Conservative
  const p1res = await groqChat(buildPass1(text, nodeList));
  const p1 = parseJSON(p1res.text) || { entities: [], relationships: [], summary: '', keyDates: [], confidence: 0 };
  const p1tokens = p1res.usage?.total_tokens || 0;

  await new Promise(r => setTimeout(r, 3000)); // rate limit buffer

  // Pass 2 — Verification
  const p2res = await groqChat(buildPass2(text, p1.entities || []));
  const p2 = parseJSON(p2res.text) || { entities: [], relationships: [], summary: '', keyDates: [], confidence: 0 };
  const p2tokens = p2res.usage?.total_tokens || 0;

  await new Promise(r => setTimeout(r, 3000));

  // Pass 3 — Aggressive
  const alreadyFound = (p1.entities || []).map(e => e.name).join(', ');
  const p3res = await groqChat(buildPass3(text, alreadyFound, nodeList));
  const p3 = parseJSON(p3res.text) || { entities: [], relationships: [], summary: '', keyDates: [], confidence: 0 };
  const p3tokens = p3res.usage?.total_tokens || 0;

  // ═══════════════════════════════════════════
  // CONSENSUS: entity in 2+ passes → accept, 1 pass → reject
  // ═══════════════════════════════════════════

  const entityMap = new Map(); // name → { entity, passes: Set }

  for (const [passIdx, pass] of [[1, p1], [2, p2], [3, p3]]) {
    for (const e of (pass.entities || [])) {
      if (!e.name || isBlocked(e.name)) continue;
      const key = e.name.toLowerCase().trim();
      if (!entityMap.has(key)) {
        entityMap.set(key, { entity: e, passes: new Set() });
      }
      entityMap.get(key).passes.add(passIdx);
    }
  }

  const accepted = [];
  const rejected = [];

  for (const [key, { entity, passes }] of entityMap) {
    if (passes.size >= 2) {
      accepted.push({
        ...entity,
        consensus: passes.size === 3 ? '3/3' : '2/3',
        passes: [...passes],
      });
    } else {
      rejected.push({
        ...entity,
        reason: `Only in pass ${[...passes].join(',')} — likely hallucination`,
      });
    }
  }

  // Entity resolution — merge spelling variants
  const resolvedAccepted = resolveEntities(accepted);

  // Collect all relationships
  const allRels = [];
  for (const pass of [p1, p2, p3]) {
    for (const r of (pass.relationships || [])) {
      if (!r.sourceName || !r.targetName) continue;
      allRels.push(r);
    }
  }
  // Deduplicate relationships
  const dedupedRels = dedupeRelationships(allRels);

  return {
    entities: resolvedAccepted,
    relationships: dedupedRels,
    rejected,
    summary: p1.summary || p2.summary || '',
    keyDates: [...(p1.keyDates || []), ...(p2.keyDates || []), ...(p3.keyDates || [])],
    stats: {
      pass1_entities: (p1.entities || []).length,
      pass2_verified: (p2.entities || []).length,
      pass3_additions: (p3.entities || []).length,
      consensus_accepted: resolvedAccepted.length,
      consensus_rejected: rejected.length,
      pre_resolution: accepted.length,
      post_resolution: resolvedAccepted.length,
      relationships_raw: allRels.length,
      relationships_deduped: dedupedRels.length,
    },
    tokens: p1tokens + p2tokens + p3tokens,
  };
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   STANDALONE SCAN — 3-Pass Consensus Engine          ║');
  console.log('║   Doğrudan Groq + Supabase (dev server gerekmez)    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Limit: ${SCAN_LIMIT} | Dry: ${DRY_RUN} | ID: ${SPECIFIC_ID || 'ALL'}  `);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Get network nodes for matching
  const nodes = await supabaseGet('nodes', '?select=name,type&limit=200');
  const nodeList = nodes.map(n => `${n.name} (${n.type})`).join(', ');
  console.log(`  Mevcut ağ: ${nodes.length} node\n`);

  // Get documents to scan
  let query;
  if (SPECIFIC_ID) {
    query = `?select=id,title,document_type,raw_content,scan_status&id=eq.${SPECIFIC_ID}`;
  } else {
    query = `?select=id,title,document_type,raw_content,scan_status&scan_status=eq.ready&raw_content=not.is.null&order=created_at.asc&limit=${Math.min(SCAN_LIMIT, 1000)}`;
  }

  const docs = await supabaseGet('documents', query);
  const scannable = docs.filter(d => d.raw_content && d.raw_content.length > 100);

  console.log(`  Hedef: ${scannable.length} belge\n`);

  if (DRY_RUN) {
    for (const d of scannable.slice(0, 20)) {
      console.log(`  ${d.id.slice(0, 8)} | ${(d.raw_content.length / 1024).toFixed(0)}KB | ${d.title?.slice(0, 50)}`);
    }
    return;
  }

  // Scan
  let totalEntities = 0, totalRels = 0, totalRejected = 0, totalTokens = 0;
  const results = [];

  for (let i = 0; i < scannable.length; i++) {
    const doc = scannable[i];
    const pct = Math.round(((i + 1) / scannable.length) * 100);
    const contentKB = (doc.raw_content.length / 1024).toFixed(0);

    process.stdout.write(`\r  [${pct}%] ${i + 1}/${scannable.length}: ${doc.title?.slice(0, 40)}... (${contentKB}KB)`);

    try {
      const start = Date.now();
      const result = await runConsensus(doc.raw_content, nodeList);
      const duration = Date.now() - start;

      // Save to DB — update document
      await supabasePatch('documents', doc.id, {
        scan_status: 'scanned',
        scanned_at: new Date().toISOString(),
        scanned_by: 'system_standalone_scan',
      });

      // Save derived items to quarantine (if table exists)
      try {
        const quarantineItems = result.entities.map(e => ({
          document_id: doc.id,
          item_type: 'entity',
          extracted_name: e.name,
          extracted_type: e.type,
          extracted_data: JSON.stringify(e),
          status: e.consensus === '3/3' ? 'pending_review' : 'quarantined',
          confidence_score: e.confidence || 0,
          source_passage: e.context || '',
          consensus_info: `${e.consensus} (passes: ${e.passes?.join(',')})`,
        }));

        if (quarantineItems.length > 0) {
          await supabaseInsert('data_quarantine', quarantineItems).catch(() => {
            // Table might not exist — that's ok
          });
        }
      } catch { /* quarantine is optional */ }

      // Save derived items
      try {
        const derivedItems = result.entities.map(e => ({
          document_id: doc.id,
          item_type: 'entity',
          suggested_name: e.name,
          suggested_type: e.type,
          suggested_data: JSON.stringify({
            role: e.role,
            importance: e.importance,
            category: e.category,
            context: e.context,
            consensus: e.consensus,
          }),
          confidence: e.confidence || 0,
          status: 'pending',
        }));

        const relItems = result.relationships.map(r => ({
          document_id: doc.id,
          item_type: 'relationship',
          suggested_name: `${r.sourceName} → ${r.targetName}`,
          suggested_type: r.relationshipType,
          suggested_data: JSON.stringify(r),
          confidence: r.confidence || 0,
          status: 'pending',
        }));

        if (derivedItems.length + relItems.length > 0) {
          await supabaseInsert('document_derived_items', [...derivedItems, ...relItems]).catch(() => {});
        }
      } catch { /* derived items table might not exist */ }

      totalEntities += result.entities.length;
      totalRels += result.relationships.length;
      totalRejected += result.rejected.length;
      totalTokens += result.tokens;

      results.push({
        id: doc.id,
        title: doc.title,
        entities: result.entities.length,
        relationships: result.relationships.length,
        rejected: result.rejected.length,
        stats: result.stats,
        duration_ms: duration,
        tokens: result.tokens,
      });

      console.log(`\n    ✅ ${result.entities.length} entity (${result.stats.consensus_accepted} kabul, ${result.stats.consensus_rejected} red) | ${result.relationships.length} rel | ${(duration / 1000).toFixed(1)}s | ${result.tokens} tok`);

      // Show entities for pilot review
      if (scannable.length <= 5) {
        for (const e of result.entities) {
          console.log(`       👤 ${e.name} [${e.type}] — ${e.role} | ${e.consensus} | conf=${e.confidence}`);
        }
        for (const r of result.rejected) {
          console.log(`       ❌ ${r.name} — ${r.reason}`);
        }
        for (const rel of result.relationships.slice(0, 5)) {
          console.log(`       🔗 ${rel.sourceName} → ${rel.targetName} (${rel.relationshipType})`);
        }
      }

    } catch (err) {
      console.log(`\n    ❌ ${err.message}`);

      if (err.message.includes('429')) {
        console.log('    ⏳ Rate limit — 60s bekleniyor...');
        await new Promise(r => setTimeout(r, 60000));
        i--; // retry
        continue;
      }
    }

    // Delay between scans
    if (i < scannable.length - 1) {
      await new Promise(r => setTimeout(r, SCAN_DELAY_MS));
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║              SCAN SONUÇ RAPORU                       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Taranan: ${results.length} belge                    `);
  console.log(`║  Entity:  ${totalEntities} kabul, ${totalRejected} red  `);
  console.log(`║  İlişki:  ${totalRels}                               `);
  console.log(`║  Token:   ${totalTokens}                             `);
  console.log(`║  Süre:    ${(results.reduce((s, r) => s + r.duration_ms, 0) / 1000).toFixed(0)}s  `);
  console.log('╚══════════════════════════════════════════════════════╝');

  // Save log
  const logDir = path.join(process.cwd(), 'fetched-documents');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `scan-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\n  Log: ${logPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
