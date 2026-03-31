/**
 * 5-Document Regression Test for enrichmentEngine.ts
 * Verifies no regressions after SORUN 1, 10, 11 fixes + NON_ORG_PREFIXES expansion
 */

import { enrichEntities } from './src/lib/enrichmentEngine';
import type { EntityRecord } from './src/store/documentStore';

let totalPassed = 0;
let totalFailed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    totalPassed++;
  } else {
    totalFailed++;
    console.log(`    ❌ ${label}`);
  }
}

// ─── Document 1: Epstein v. Brunel ────────────────────────────
console.log('\n📄 Doc 1: Epstein v. Brunel (OCR text snippet)');

const doc1Text = `CIRCUIT COURT OF THE FIFTEENTH
JUDICIAL CIRCUIT IN AND FOR PALM
BEACH COUNTY, FLORIDA

JEFFREY E. EPSTEIN,
Plaintiff,
vs.
JEAN-LUC BRUNEL, MC2 MODEL
MANAGEMENT, INC. and MC2 MODEL &
TALENT, LLC,
Defendants.

Case No.: 50-2015-CA-003218-XXXX-MB (AJ)

Robles-Martinez v. Diaz, Reus & Targ, LLP, 232 So. 3d 377
(Fla. 3d DCA 2018)

Florida Statutes (2018 ed.)

On October 5, 2016, a motion was filed in Palm Beach County.
The damages sought were $2.5 million in compensatory damages and $399 in fees.
Brunel resided in New York and Paris.
MC2 Model Management, Inc. operated from Miami-Dade County.`;

const doc1Ai: EntityRecord[] = [
  { name: 'Jeffrey E. Epstein', type: 'person', confidence: 0.95 },
  { name: 'Jean-Luc Brunel', type: 'person', confidence: 0.9 },
  { name: '2018', type: 'date', confidence: 0.7 },
  { name: 'October 5, 2016', type: 'date', confidence: 0.9 },
  { name: 'Reus & Targ', type: 'organization', confidence: 0.6 },
];

const r1 = enrichEntities(doc1Text, doc1Ai);
console.log(`  Enriched: ${r1.enrichedEntities.length} | AI kept: ${r1.allEntities.length - r1.enrichedEntities.length}`);

check(r1.enrichedEntities.some(e => e.name.includes('$2.5 million')), '$2.5 million detected');
check(r1.enrichedEntities.some(e => e.name.includes('$399')), '$399 detected');
check(r1.enrichedEntities.some(e => e.name.toLowerCase() === 'palm beach county'), 'Palm Beach County detected (case-insensitive)');
check(r1.enrichedEntities.some(e => e.name.toLowerCase() === 'florida'), 'Florida detected (case-insensitive)');
check(r1.enrichedEntities.some(e => e.name === 'New York'), 'New York detected');
check(r1.enrichedEntities.some(e => e.name === 'Paris'), 'Paris detected');
check(r1.enrichedEntities.some(e => e.name === 'Miami-Dade County'), 'Miami-Dade County detected');
check(!r1.allEntities.some(e => e.name === '2018' && e.type === 'date'), 'Citation "2018" filtered from AI');
check(!r1.allEntities.some(e => e.name === 'Reus & Targ'), 'Citation org "Reus & Targ" filtered from AI');
check(r1.allEntities.some(e => e.name.includes('October 5, 2016')), 'Full date "October 5, 2016" kept');
// No duplicates
const names1 = r1.enrichedEntities.map(e => e.name.toLowerCase());
const uniqueNames1 = new Set(names1);
check(names1.length === uniqueNames1.size, `No duplicate enriched entities (${names1.length} = ${uniqueNames1.size})`);

// ─── Document 2: Financial document ────────────────────────────
console.log('\n📄 Doc 2: Financial Document');

const doc2Text = `SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549

Filed: January 15, 2020
Amended: March 16, 2017

Goldman Sachs Group, Inc. reported net revenues of $1,500.00 million
for the quarter ending Sept. 30, 2019. Meanwhile Deutsche Bank AG
disclosed losses of $50,000 EUR.

Bear Stearns Companies Inc. was acquired in New York City on
March 16, 2008 for approximately $2 billion dollars.

Transfer to Cayman Islands account: 25,000 USD.`;

const doc2Ai: EntityRecord[] = [
  { name: 'Goldman Sachs', type: 'organization', confidence: 0.95 },
  { name: 'Bear Stearns', type: 'organization', confidence: 0.9 },
  { name: 'January 15, 2020', type: 'date', confidence: 0.95 },
];

const r2 = enrichEntities(doc2Text, doc2Ai);
console.log(`  Enriched: ${r2.enrichedEntities.length} | AI kept: ${r2.allEntities.length - r2.enrichedEntities.length}`);

// Note: "Washington, D.C. 20549" has a comma — gazetteer entry "Washington D.C." won't match.
// The gazetteer DOES have "Washington" as a state, which may or may not match depending on boundaries.
// This is a known limitation — handled by checking for either form.
check(
  r2.enrichedEntities.some(e => e.name.toLowerCase().includes('washington')),
  'Washington detected (either "Washington D.C." or "Washington" state)'
);
check(r2.enrichedEntities.some(e => e.name === 'New York City'), 'New York City detected');
check(r2.enrichedEntities.some(e => e.name === 'Cayman Islands'), 'Cayman Islands detected');
check(r2.enrichedEntities.some(e => e.name.includes('$1,500.00')), '$1,500.00 detected');
check(r2.enrichedEntities.some(e => e.name.includes('$50,000')), '$50,000 detected');
check(r2.enrichedEntities.some(e => e.name.includes('25,000 USD')), '25,000 USD detected');
check(r2.enrichedEntities.some(e => e.name.includes('$2 billion')), '$2 billion detected');
check(r2.enrichedEntities.some(e => e.name.includes('March 16, 2017')), 'March 16, 2017 detected');
check(r2.enrichedEntities.some(e => e.type === 'organization' && e.name.includes('Goldman Sachs')), 'Goldman Sachs Group, Inc. detected by suffix');

// ─── Document 3: Court order with many citations ────────────────
console.log('\n📄 Doc 3: Court Order (citation-heavy)');

const doc3Text = `IN THE UNITED STATES DISTRICT COURT
SOUTHERN DISTRICT OF FLORIDA

ORDER GRANTING MOTION

See United States v. Epstein, No. 08-cr-888 (S.D. Fla. 2008).
Cf. Doe v. United States, 487 U.S. 201 (1988).
Citing Brown v. Board of Education, 347 U.S. 483 (1954).

On September 14, 2018, the Government filed a motion
pursuant to the Crime Victims' Rights Act, 18 U.S.C. § 3771.

The defendant maintained a residence in Palm Beach, Florida
and a property on Little St. James in the U.S. Virgin Islands.

Total restitution ordered: $1,500.00 to each victim.`;

const doc3Ai: EntityRecord[] = [
  { name: 'September 14, 2018', type: 'date', confidence: 0.95 },
  { name: '2008', type: 'date', confidence: 0.7 },
  { name: '1988', type: 'date', confidence: 0.7 },
  { name: '1954', type: 'date', confidence: 0.7 },
  { name: 'United States', type: 'organization', confidence: 0.5 },
];

const r3 = enrichEntities(doc3Text, doc3Ai);
console.log(`  Enriched: ${r3.enrichedEntities.length} | AI kept: ${r3.allEntities.length - r3.enrichedEntities.length}`);

check(r3.allEntities.some(e => e.name === 'September 14, 2018'), 'Sep 14, 2018 kept');
check(!r3.allEntities.some(e => e.name === '2008' && e.type === 'date'), 'Citation year 2008 filtered');
check(!r3.allEntities.some(e => e.name === '1988' && e.type === 'date'), 'Citation year 1988 filtered');
check(!r3.allEntities.some(e => e.name === '1954' && e.type === 'date'), 'Citation year 1954 filtered');
check(r3.enrichedEntities.some(e => e.name === 'Palm Beach'), 'Palm Beach detected');
check(r3.enrichedEntities.some(e => e.name.toLowerCase() === 'florida'), 'Florida detected (case-insensitive)');
check(r3.enrichedEntities.some(e => e.name.includes('Little St. James')), 'Little St. James detected');
check(r3.enrichedEntities.some(e => e.name.includes('$1,500.00')), '$1,500.00 detected');

// ─── Document 4: OCR-degraded text ────────────────────────────
console.log('\n📄 Doc 4: OCR-degraded text (line breaks, artifacts)');

const doc4Text = `The defendant traveled to New\r\nYork on Oct.\n 1, 2021.\r\nHe was represented by Smith & Associates LLC\nof Miami-Dade\nCounty.\n\nTotal damages: $2.5 million plus $1,200.00 in court\ncosts. Filed on Jan.\n 1, 2011.`;

const doc4Ai: EntityRecord[] = [];

const r4 = enrichEntities(doc4Text, doc4Ai);
console.log(`  Enriched: ${r4.enrichedEntities.length}`);
console.log(`  Normalized text preview: "${r4.normalizedText.substring(0, 120)}..."`);

check(r4.normalizedText.includes('New York'), 'OCR: "New\\r\\nYork" → "New York"');
check(r4.normalizedText.includes('Oct. 1, 2021'), 'OCR: "Oct.\\n 1, 2021" → "Oct. 1, 2021"');
check(r4.normalizedText.includes('Jan. 1, 2011'), 'OCR: "Jan.\\n 1, 2011" → "Jan. 1, 2011"');
check(r4.normalizedText.includes('Miami-Dade County'), 'OCR: "Miami-Dade\\nCounty" → "Miami-Dade County"');
check(r4.enrichedEntities.some(e => e.name === 'New York'), 'New York entity detected after OCR fix');
check(r4.enrichedEntities.some(e => e.name.includes('Oct. 1, 2021') || e.name.includes('Oct 1, 2021')), 'Oct date detected');
check(r4.enrichedEntities.some(e => e.name.includes('$2.5 million')), '$2.5 million detected');
check(r4.enrichedEntities.some(e => e.name.includes('$1,200.00')), '$1,200.00 detected');

// ─── Document 5: Mixed international ────────────────────────────
console.log('\n📄 Doc 5: International document');

const doc5Text = `INTERPOL Red Notice Request

Subject maintained accounts in Zurich, Geneva, and London.
Known associates in Tel Aviv and Monaco.

British Virgin Islands shell company: Oceanic Holdings Ltd.
Panama entity: Caribbean Trust Foundation.

Transaction on 05/15/2019: $50,000 transferred to Cayman Islands.
Additional payment of 75,000 CHF to Geneva account on 2019-06-01.

Meanwhile Pacific Ventures Group disclosed partnership with
Hamilton & Burke Associates in Philadelphia.`;

const doc5Ai: EntityRecord[] = [
  { name: 'Oceanic Holdings', type: 'organization', confidence: 0.85 },
];

const r5 = enrichEntities(doc5Text, doc5Ai);
console.log(`  Enriched: ${r5.enrichedEntities.length} | AI kept: ${r5.allEntities.length - r5.enrichedEntities.length}`);

check(r5.enrichedEntities.some(e => e.name === 'Zurich'), 'Zurich detected');
check(r5.enrichedEntities.some(e => e.name === 'Geneva'), 'Geneva detected');
check(r5.enrichedEntities.some(e => e.name === 'London'), 'London detected');
check(r5.enrichedEntities.some(e => e.name === 'Tel Aviv'), 'Tel Aviv detected');
check(r5.enrichedEntities.some(e => e.name === 'Monaco'), 'Monaco detected');
check(r5.enrichedEntities.some(e => e.name.includes('British Virgin Islands')), 'British Virgin Islands detected');
check(r5.enrichedEntities.some(e => e.name === 'Cayman Islands'), 'Cayman Islands detected');
check(r5.enrichedEntities.some(e => e.name === 'Panama'), 'Panama detected');
check(r5.enrichedEntities.some(e => e.name === 'Philadelphia'), 'Philadelphia detected');
check(r5.enrichedEntities.some(e => e.name.includes('$50,000')), '$50,000 detected');
check(r5.enrichedEntities.some(e => e.name.includes('75,000 CHF')), '75,000 CHF detected');
check(r5.enrichedEntities.some(e => e.name.includes('05/15/2019') || e.name.includes('5/15/2019')), 'US date 05/15/2019 detected');
// Suffix-detected orgs
check(r5.enrichedEntities.some(e => e.type === 'organization' && e.name.includes('Oceanic Holdings Ltd')), 'Oceanic Holdings Ltd detected by suffix (longer than AI\'s)');
check(r5.enrichedEntities.some(e => e.type === 'organization' && e.name.includes('Caribbean Trust Foundation')), 'Caribbean Trust Foundation detected');
check(r5.enrichedEntities.some(e => e.type === 'organization' && e.name.includes('Pacific Ventures Group')), '"Meanwhile" stripped, Pacific Ventures Group detected');

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log(`\n═══ REGRESSION SONUÇ ═══`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`Total: ${totalPassed + totalFailed}`);

if (totalFailed > 0) {
  process.exit(1);
}
