/**
 * Edge Case Tests for enrichmentEngine.ts — Katman 1
 * Tests all fixes: SORUN 1, 2, 10, 11 + previous session fixes
 */

import { normalizeOCR, detectDates, detectMoney, detectLocations, detectOrganizations, enrichEntities } from './src/lib/enrichmentEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${label}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 1. normalizeOCR Edge Cases
// ═══════════════════════════════════════════════════════════
console.log('\n═══ normalizeOCR ═══');

// SORUN 1: May without period should NOT get a false period
assert(normalizeOCR('May\n5, 2020') === 'May 5, 2020', 'May\\n5 → "May 5, 2020" (no false period)');
assert(normalizeOCR('Oct.\n1, 2021') === 'Oct. 1, 2021', 'Oct.\\n1 → "Oct. 1, 2021" (period preserved)');
assert(normalizeOCR('Jan.\n 15') === 'Jan. 15', 'Jan.\\n 15 → "Jan. 15" (space stripped)');
assert(normalizeOCR('Dec\n25, 2020') === 'Dec 25, 2020', 'Dec\\n25 → "Dec 25, 2020" (no false period)');
assert(normalizeOCR('Sept.\n3, 2019') === 'Sept. 3, 2019', 'Sept.\\n3 → "Sept. 3, 2019"');

// Windows line endings
assert(normalizeOCR('New\r\nYork') === 'New York', 'Windows \\r\\n → space join');
assert(normalizeOCR('Hello\r\nworld') === 'Hello world', '\\r\\n lowercase join');
assert(normalizeOCR('test\rvalue') === 'test value', 'Bare \\r normalized');

// Hyphenation
assert(normalizeOCR('appel-\nlant') === 'appellant', 'Hyphenation join');
assert(normalizeOCR('Robles-\nMartinez').includes('Robles-'), 'Capitalized after hyphen NOT joined (proper name)');

// Paragraph preservation
assert(normalizeOCR('Para 1.\n\nPara 2.') === 'Para 1.\n\nPara 2.', 'Double newline preserved');

// Trailing whitespace
assert(normalizeOCR('New   \nYork') === 'New York', 'Trailing spaces stripped before join');

// Preposition join
assert(normalizeOCR('the\nCircuit') === 'the Circuit', 'Preposition "the" joined');
assert(normalizeOCR('v.\nSmith') === 'v. Smith', 'v. joined with next line');

// ═══════════════════════════════════════════════════════════
// 2. Date Detection Edge Cases
// ═══════════════════════════════════════════════════════════
console.log('\n═══ detectDates ═══');

const dateText1 = 'Filed on October 5, 2016 in the Southern District. See 123 So. 3d 211 (Fla. 3d DCA 2016). In 2009, the investigation began.';
const dates1 = detectDates(dateText1);
const dateNames1 = dates1.map(d => d.name);

assert(dateNames1.some(d => d.includes('October 5, 2016')), 'Full date "October 5, 2016" detected');
assert(!dateNames1.includes('2016'), 'Citation year "(Fla. 3d DCA 2016)" filtered');
// Note: bare 4-digit years are NOT in DATE_PATTERNS by design (too noisy).
// Only AI detects bare years; regex catches full dates. This is correct behavior.
assert(!dateNames1.includes('2009'), 'Bare year "2009" not in regex patterns (by design — AI responsibility)');

// Year in "(2018 ed.)" context
const dateText2 = 'See Florida Statutes (2018 ed.) for details. In January 2015, the case started.';
const dates2 = detectDates(dateText2);
const dateNames2 = dates2.map(d => d.name);
assert(!dateNames2.includes('2018'), '"(2018 ed.)" citation year filtered');
assert(dateNames2.some(d => d.includes('January 2015')), '"January 2015" kept');

// ISO dates
const dateText3 = 'Date: 2016-10-05 and 10/5/2016 formats.';
const dates3 = detectDates(dateText3);
assert(dates3.length >= 2, 'ISO and US date formats both detected');

// ═══════════════════════════════════════════════════════════
// 3. Money Detection Edge Cases
// ═══════════════════════════════════════════════════════════
console.log('\n═══ detectMoney ═══');

const moneyText1 = 'The estate was worth $2.5 million, with $399 in fees and $1,500.00 remaining.';
const money1 = detectMoney(moneyText1);
const moneyNames1 = money1.map(m => m.name);

assert(moneyNames1.some(m => m.includes('$2.5 million')), '$2.5 million detected as single entity');
assert(moneyNames1.some(m => m.includes('$399')), '$399 detected');
assert(moneyNames1.some(m => m.includes('$1,500.00')), '$1,500.00 detected');
// No "$2" false positive from "$2.5 million"
assert(!moneyNames1.some(m => m === '$2' || m === '$2.5'), 'No "$2" or "$2.5" false positive from "$2.5 million"');

// Currency after amount
const moneyText2 = 'Transfer of 50,000 USD and 25,000 EUR.';
const money2 = detectMoney(moneyText2);
assert(money2.length >= 2, 'USD and EUR amounts detected');

// ═══════════════════════════════════════════════════════════
// 4. Location Detection Edge Cases
// ═══════════════════════════════════════════════════════════
console.log('\n═══ detectLocations ═══');

const locText = 'Located in New York City, near Palm Beach County, Florida. Also connections in London and Tel Aviv.';
const locs = detectLocations(locText);
const locNames = locs.map(l => l.name);

assert(locNames.some(l => l === 'New York City'), '"New York City" detected (not just "New York")');
assert(locNames.some(l => l === 'Palm Beach County'), '"Palm Beach County" detected');
assert(locNames.some(l => l === 'Florida'), '"Florida" detected');
assert(locNames.some(l => l === 'London'), '"London" detected');
assert(locNames.some(l => l === 'Tel Aviv'), '"Tel Aviv" detected');

// "West Virginia" should not produce false "Virginia"
const locText2 = 'Born in West Virginia, moved to Virginia later.';
const locs2 = detectLocations(locText2);
const locNames2 = locs2.map(l => l.name);
assert(locNames2.some(l => l === 'West Virginia'), '"West Virginia" detected');
assert(locNames2.filter(l => l === 'Virginia').length >= 1, '"Virginia" detected separately');

// ═══════════════════════════════════════════════════════════
// 5. Organization Detection Edge Cases
// ═══════════════════════════════════════════════════════════
console.log('\n═══ detectOrganizations ═══');

// Citation org filtering
const orgText1 = 'Robles-Martinez v. Diaz, Reus & Targ, LLP. Meanwhile Goldman Sachs LLC reported earnings.';
const orgs1 = detectOrganizations(orgText1);
const orgNames1 = orgs1.map(o => o.name);

assert(!orgNames1.some(o => o.toLowerCase().includes('reus')), 'Citation org "Reus & Targ, LLP" filtered');
assert(orgNames1.some(o => o.toLowerCase().includes('goldman')), '"Goldman Sachs LLC" kept (after sentence boundary)');

// NON_ORG_PREFIXES stripping
const orgText2 = 'Meanwhile Microsoft Corporation announced results. However Apple Inc released updates.';
const orgs2 = detectOrganizations(orgText2);
const orgNames2 = orgs2.map(o => o.name);

assert(orgNames2.some(o => o === 'Microsoft Corporation'), '"Meanwhile" stripped → "Microsoft Corporation"');
assert(orgNames2.some(o => o === 'Apple Inc'), '"However" stripped → "Apple Inc"');

// Short names filtered
const orgText3 = 'By AG order.';
const orgs3 = detectOrganizations(orgText3);
assert(orgs3.length === 0, 'Very short org names filtered (< 5 chars)');

// ═══════════════════════════════════════════════════════════
// 6. enrichEntities Integration + SORUN 11 Edge Case
// ═══════════════════════════════════════════════════════════
console.log('\n═══ enrichEntities (integration) ═══');

// SORUN 11: Year "2016" with AI entity "20160101" should NOT falsely match
const sorun11Entities = [
  { name: '2016', type: 'date' as const, confidence: 0.8 },
  { name: '20160101', type: 'date' as const, confidence: 0.8 }, // Not a real date format but tests the boundary
];
const sorun11Text = 'In 2016, the investigation started. Reference code: 20160101.';
const sorun11Result = enrichEntities(sorun11Text, sorun11Entities);
// "2016" should NOT be filtered by coveredByLonger because "20160101" doesn't contain "2016" at a word boundary
// But "2016" IS a standalone year in "In 2016," which is not a citation → should be KEPT
assert(
  sorun11Result.allEntities.some(e => e.name === '2016'),
  'SORUN 11: "2016" not falsely covered by "20160101" (word boundary check)'
);

// Normal coveredByLonger case — "2016" covered by "October 5, 2016"
const coverEntities = [
  { name: '2016', type: 'date' as const, confidence: 0.8 },
  { name: 'October 5, 2016', type: 'date' as const, confidence: 0.9 },
];
const coverText = 'On October 5, 2016, the filing was made.';
const coverResult = enrichEntities(coverText, coverEntities);
assert(
  !coverResult.allEntities.some(e => e.name === '2016' && e.type === 'date'),
  'Bare "2016" correctly filtered when covered by "October 5, 2016"'
);

// AI entity dedup — no duplicate enriched entities
const dedupText = 'Located in Rhode Island and Palm Beach, Florida. Rhode Island again. Palm Beach again.';
const dedupResult = enrichEntities(dedupText, []);
const riCount = dedupResult.enrichedEntities.filter(e => e.name.toLowerCase() === 'rhode island').length;
assert(riCount <= 1, `No duplicate "Rhode Island" in enriched (found ${riCount})`);

// AI citation org post-processing
const aiOrgEntities = [
  { name: 'Reus & Targ', type: 'organization' as const, confidence: 0.8 },
  { name: 'Goldman Sachs', type: 'organization' as const, confidence: 0.9 },
];
const aiOrgText = 'v. Diaz, Reus & Targ, LLP. Goldman Sachs reported earnings today.';
const aiOrgResult = enrichEntities(aiOrgText, aiOrgEntities);
assert(
  !aiOrgResult.allEntities.some(e => e.name === 'Reus & Targ'),
  'AI org "Reus & Targ" filtered (citation context only)'
);
assert(
  aiOrgResult.allEntities.some(e => e.name === 'Goldman Sachs'),
  'AI org "Goldman Sachs" kept (not in citation context)'
);

// Empty/null safety
const emptyResult = enrichEntities('', []);
assert(emptyResult.normalizedText === '', 'Empty string returns empty');
assert(emptyResult.enrichedEntities.length === 0, 'No entities from empty text');

const nullResult = enrichEntities(null as unknown as string, []);
assert(nullResult.normalizedText === '', 'Null text returns empty');

// ═══════════════════════════════════════════════════════════
// 7. Performance sanity check (SORUN 10)
// ═══════════════════════════════════════════════════════════
console.log('\n═══ Performance (SORUN 10) ═══');

// Generate a large text to stress-test
const bigText = Array(500).fill('The organization Microsoft Corporation filed against Apple Inc in New York on January 5, 2020 for $2.5 million.').join('\n');
const bigAiEntities = [
  { name: 'Some Org', type: 'organization' as const, confidence: 0.8 },
  { name: 'Another Corp', type: 'organization' as const, confidence: 0.8 },
];
const startTime = Date.now();
const bigResult = enrichEntities(bigText, bigAiEntities);
const elapsed = Date.now() - startTime;
console.log(`  ⏱️  500-paragraph text processed in ${elapsed}ms`);
assert(elapsed < 5000, `Performance OK: ${elapsed}ms < 5000ms threshold`);
assert(bigResult.enrichedEntities.length > 0, 'Large text produces entities');

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log(`\n═══ SONUÇ ═══`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
