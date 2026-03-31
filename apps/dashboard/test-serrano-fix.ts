import { detectOrganizations, enrichEntities } from './src/lib/enrichmentEngine';

let p = 0, f = 0;
function check(ok: boolean, label: string) {
  if (ok) { p++; console.log(`  ✅ ${label}`); }
  else { f++; console.log(`  ❌ ${label}`); }
}

const text = `asserted against Chase Bank. See Ness Racquet Club, LLC, v. Ocean Four 2108, LLC, 88 So. 3d 200, 202 (Fla. 3d DCA 2011) ("Where a party has not filed a summary judgment motion or where no notice or opportunity to be heard has been given to the opposing side to present opposing affidavits, a trial court may not sua sponte grant summary judgment in favor of the non-movant."); Hotel 71 Mezz Lender, LLC v. Tutt, 66 So. 3d 1051, 1054 (Fla. 3d DCA 2011) (reversing summary judgment in favor of nonmoving party).`;

console.log('\n═══ Citation Org Filtering (Serrano doc) ═══');
const orgs = detectOrganizations(text);
const orgNames = orgs.map(o => o.name);
console.log('  Found orgs:', orgNames);

check(!orgNames.some(o => o.toLowerCase().includes('see')), '"See" not detected as org');
check(!orgNames.some(o => o.toLowerCase().includes('ness racquet')), '"Ness Racquet Club, LLC" filtered (citation, v. after)');
check(!orgNames.some(o => o.toLowerCase().includes('mezz')), '"Hotel 71 Mezz Lender, LLC" filtered (citation, v. after)');
check(!orgNames.some(o => o.toLowerCase().includes('ocean four')), '"Ocean Four 2108, LLC" filtered (citation)');

// Also test that normal orgs are NOT filtered
const text2 = `Goldman Sachs LLC reported earnings. Meanwhile Microsoft Corporation filed a complaint.`;
const orgs2 = detectOrganizations(text2);
const orgNames2 = orgs2.map(o => o.name);
console.log('  Normal orgs:', orgNames2);

check(orgNames2.some(o => o.includes('Goldman Sachs')), 'Goldman Sachs LLC kept (not citation)');
check(orgNames2.some(o => o.includes('Microsoft Corporation')), 'Microsoft Corporation kept (not citation)');

// Test the full pipeline with AI entities
console.log('\n═══ Full Pipeline (Serrano-like) ═══');
const fullText = `Third District Court of Appeal State of Florida. Opinion filed September 13, 2023. Brenda Serrano, Appellant, vs. Jeffrey Epstein, Appellee. An Appeal from the Circuit Court for Miami-Dade County. Andrew M. Kassier, P.A., and Andrew M. Kassier, for appellant. See Ness Racquet Club, LLC, v. Ocean Four 2108, LLC, 88 So. 3d 200 (Fla. 3d DCA 2011). Hotel 71 Mezz Lender, LLC v. Tutt, 66 So. 3d 1051 (Fla. 3d DCA 2011).`;

const aiEntities = [
  { name: 'Brenda Serrano', type: 'person' as const, confidence: 0.95 },
  { name: 'Jeffrey Epstein', type: 'person' as const, confidence: 0.95 },
  { name: 'Andrew M. Kassier', type: 'person' as const, confidence: 0.9 },
  { name: 'Chase Bank, N.A.', type: 'organization' as const, confidence: 0.9 },
  { name: 'September 13, 2023', type: 'date' as const, confidence: 0.95 },
];

const result = enrichEntities(fullText, aiEntities);
const allOrgNames = result.allEntities.filter(e => e.type === 'organization').map(e => e.name);
console.log('  All orgs in final result:', allOrgNames);

check(!allOrgNames.some(o => o.toLowerCase().includes('see')), 'No "See" in final orgs');
check(!allOrgNames.some(o => o.toLowerCase().includes('ness')), 'No "Ness Racquet Club" in final orgs');
check(!allOrgNames.some(o => o.toLowerCase().includes('mezz')), 'No "Mezz Lender" in final orgs');
check(allOrgNames.some(o => o.includes('Chase Bank')), 'Chase Bank kept');
check(allOrgNames.some(o => o.includes('Andrew M. Kassier') && o.includes('P.A.')), 'Andrew M. Kassier, P.A. detected (law firm)');

console.log(`\n═══ SONUÇ: ✅ ${p} | ❌ ${f} ═══`);
if (f > 0) process.exit(1);
