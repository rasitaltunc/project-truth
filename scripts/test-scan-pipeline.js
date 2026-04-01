#!/usr/bin/env node
/**
 * SCAN PIPELINE TEST SCRIPT
 *
 * Tests the 3-pass consensus engine locally using Groq API.
 *
 * Usage:
 *   cd apps/dashboard
 *   node ../../scripts/test-scan-pipeline.js
 *
 * Requires: GROQ_API_KEY in .env.local
 */

const fs = require('fs');
const path = require('path');

// Load env from apps/dashboard/.env.local
const envPath = path.join(__dirname, '..', 'apps', 'dashboard', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('ERROR: No GROQ_API_KEY found');
  process.exit(1);
}

// ── GROUND TRUTH for Bail Memo ──
const GROUND_TRUTH = {
  persons: [
    'Jeffrey Epstein', 'Henry Pitman', 'Richard M. Berman',
    'Geoffrey S. Berman', 'Alex Rossmiller', 'Alison Moe',
    'Maurene Comey', 'Martin Weinberg', 'Reid Weingarten'
  ],
  locations: [
    'Manhattan', 'Palm Beach', 'Stanley, New Mexico', 'Paris, France',
    'U.S. Virgin Islands', 'Teterboro Airport'
  ],
  key_facts: [
    'sex trafficking of minors',
    'non-prosecution agreement',
    '$77 million mansion',
    'private jets',
    '66 years old',
    '45 years imprisonment',
    'registered sex offender'
  ]
};

async function callGroq(prompt, passName) {
  const start = Date.now();
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })
  });

  const data = await resp.json();
  const elapsed = Date.now() - start;

  if (data.error) {
    console.error(`  ERROR in ${passName}:`, data.error.message);
    return null;
  }

  const tokens = data.usage?.total_tokens || 0;
  console.log(`  ${passName}: ${(elapsed/1000).toFixed(1)}s, ${tokens} tokens`);

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    console.error(`  JSON parse error in ${passName}`);
    return null;
  }
}

function buildPass1Prompt(docText) {
  return `You are an investigative analyst. Extract ONLY entities that are EXPLICITLY and CLEARLY mentioned in this document.

DOCUMENT CONTENT:
${docText}

CURRENT NETWORK PEOPLE (for matching):
Jeffrey Epstein, Ghislaine Maxwell

RULES — STRICT:
- Extract ONLY what is EXPLICITLY stated in the document
- If uncertain, DO NOT include — it is better to miss than to hallucinate
- Every entity MUST have a direct quote from the document as "context"
- ALL output must be in ENGLISH.
- Do NOT extract generic terms. BLOCKED: "United States", "USA", "Government", "Court", "State", "People", "Plaintiff", "Defendant", "DOJ", "FBI", "SDNY", "Southern District of New York", "Department of Justice"
- Do NOT extract case citations or legal terms as entities
- Legal professionals should be importance: "low" unless investigated
- Victims should remain anonymous

OUTPUT JSON:
{"entities": [{"name": "Full Name", "type": "person|organization|location|money", "role": "Role", "importance": "critical|high|medium|low", "category": "subject|legal_professional|law_enforcement|financial|mentioned_only", "confidence": 0.0-1.0, "mention_count": 0, "context": "Direct quote", "source_sentence": "EXACT verbatim sentence"}],
"relationships": [{"sourceName": "A", "targetName": "B", "relationshipType": "type", "evidenceType": "court_record", "description": "Description", "confidence": 0.0-1.0, "source_sentence": "EXACT verbatim sentence"}],
"summary": "2-3 sentences",
"keyDates": [{"date": "YYYY-MM-DD", "description": "event"}],
"confidence": 0.0-1.0}`;
}

function evaluateResults(result) {
  const entities = result.entities || [];
  const entityNames = entities.map(e => e.name.toLowerCase());

  console.log('\n' + '='.repeat(60));
  console.log('ACCURACY EVALUATION');
  console.log('='.repeat(60));

  // Check persons
  let personsFound = 0;
  let personsMissed = [];
  for (const person of GROUND_TRUTH.persons) {
    const found = entityNames.some(n => n.includes(person.toLowerCase()) || person.toLowerCase().includes(n));
    if (found) personsFound++;
    else personsMissed.push(person);
  }

  // Check locations
  let locationsFound = 0;
  let locationsMissed = [];
  for (const loc of GROUND_TRUTH.locations) {
    const found = entityNames.some(n =>
      n.includes(loc.toLowerCase().split(',')[0]) ||
      loc.toLowerCase().includes(n.split(',')[0])
    );
    if (found) locationsFound++;
    else locationsMissed.push(loc);
  }

  // Check for hallucinations (entities not in document)
  const blockedEntities = ['united states', 'government', 'court', 'state', 'people', 'plaintiff', 'defendant', 'doj', 'fbi', 'sdny'];
  const hallucinations = entities.filter(e =>
    blockedEntities.some(b => e.name.toLowerCase().includes(b))
  );

  const totalExpected = GROUND_TRUTH.persons.length + GROUND_TRUTH.locations.length;
  const totalFound = personsFound + locationsFound;

  console.log(`\nPersons:    ${personsFound}/${GROUND_TRUTH.persons.length} found`);
  if (personsMissed.length > 0) console.log(`  Missed:   ${personsMissed.join(', ')}`);

  console.log(`Locations:  ${locationsFound}/${GROUND_TRUTH.locations.length} found`);
  if (locationsMissed.length > 0) console.log(`  Missed:   ${locationsMissed.join(', ')}`);

  console.log(`\nTotal Recall: ${totalFound}/${totalExpected} (${(totalFound/totalExpected*100).toFixed(1)}%)`);
  console.log(`Entities Extracted: ${entities.length}`);
  console.log(`Hallucinations (blocked terms): ${hallucinations.length}`);
  if (hallucinations.length > 0) {
    hallucinations.forEach(h => console.log(`  ⚠️  ${h.name}`));
  }

  // Precision: what % of extracted entities are real?
  const precision = entities.length > 0 ? ((entities.length - hallucinations.length) / entities.length * 100).toFixed(1) : 0;
  console.log(`Precision (non-hallucinated): ${precision}%`);

  // Source sentence quality
  const withSource = entities.filter(e => e.source_sentence && e.source_sentence.length > 10);
  console.log(`Source Sentences: ${withSource.length}/${entities.length} entities have verbatim quotes`);

  console.log(`\nRelationships: ${(result.relationships || []).length}`);
  console.log(`Key Dates: ${(result.keyDates || []).length}`);

  return { personsFound, locationsFound, totalFound, totalExpected, hallucinations: hallucinations.length, precision, entities: entities.length };
}

async function main() {
  // Find test document
  const testDocPath = path.join(__dirname, '..', 'test-documents', 'epstein_bail_memo.txt');
  const altPath = path.join(process.cwd(), 'test-documents', 'epstein_bail_memo.txt');

  let docText;
  if (fs.existsSync(testDocPath)) {
    docText = fs.readFileSync(testDocPath, 'utf-8');
  } else if (fs.existsSync(altPath)) {
    docText = fs.readFileSync(altPath, 'utf-8');
  } else {
    console.error('ERROR: Cannot find epstein_bail_memo.txt');
    console.error('Run this script from the ai-os root directory');
    process.exit(1);
  }

  docText = docText.substring(0, 25000).trim();

  console.log('='.repeat(60));
  console.log('SCAN PIPELINE TEST — Epstein Bail Memorandum');
  console.log(`Document: ${docText.length} chars`);
  console.log('='.repeat(60));

  // PASS 1
  console.log('\n[PASS 1 — Conservative Extraction]');
  const pass1 = await callGroq(buildPass1Prompt(docText), 'Pass 1');

  if (!pass1) {
    console.error('Pass 1 failed. Aborting.');
    process.exit(1);
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, '..', 'test-documents', 'pass1_result.json'),
    JSON.stringify(pass1, null, 2)
  );

  // Print results
  console.log(`\nSummary: ${(pass1.summary || '').substring(0, 300)}`);

  console.log('\n--- ENTITIES ---');
  for (const e of pass1.entities || []) {
    const src = (e.source_sentence || '').substring(0, 50);
    console.log(`  [${(e.importance || '?').padStart(8)}] ${e.name.padEnd(30)} | ${(e.type || '?').padEnd(12)} | ${(e.role || '?').padEnd(20)} | conf:${(e.confidence || 0).toFixed(2)} | src: ${src}...`);
  }

  console.log('\n--- RELATIONSHIPS ---');
  for (const r of pass1.relationships || []) {
    console.log(`  ${r.sourceName.padEnd(20)} → ${r.targetName.padEnd(20)} | ${(r.relationshipType || '?').padEnd(15)} | conf:${(r.confidence || 0).toFixed(2)}`);
  }

  console.log('\n--- KEY DATES ---');
  for (const d of pass1.keyDates || []) {
    console.log(`  ${(d.date || '?').padEnd(15)} | ${(d.description || '?').substring(0, 60)}`);
  }

  // Evaluate
  const scores = evaluateResults(pass1);

  // Save full report
  const report = {
    test: 'Epstein Bail Memorandum — Pass 1 Conservative',
    timestamp: new Date().toISOString(),
    scores,
    pass1_result: pass1,
    ground_truth: GROUND_TRUTH
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'test-documents', 'pipeline_test_report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Full report saved to test-documents/pipeline_test_report.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
