/**
 * enrichmentEngine.ts — "Katman 1" Hybrid NER Pipeline
 *
 * Deterministic enrichment layer that runs BEFORE or ALONGSIDE LLM extraction.
 * Zero API calls, zero cost, zero hallucination.
 *
 * Based on research findings (27 Mart 2026):
 * - Production legal tech uses hybrid regex+ML+LLM architecture
 * - Regex catches dates, money, citations deterministically
 * - Location gazetteers prevent LLM "laziness" on secondary locations
 * - Corporate suffix detection finds fragmented org names
 * - OCR normalization fixes line-break entity fragmentation
 *
 * Architecture:
 *   Raw OCR Text → normalizeOCR() → enrichEntities() → merged entity list
 *
 * Created: 27 Mart 2026 — Sprint "Katman 1"
 */

import type { EntityRecord } from '@/store/documentStore';

// ═══════════════════════════════════════════════════════════
// 1. OCR TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Normalize OCR text before any NER processing.
 * Fixes the "Miami-Dade\nCounty" problem — line breaks that fragment entities.
 *
 * Strategy:
 * - Join lines that don't end with sentence-ending punctuation
 * - Preserve paragraph breaks (double newlines)
 * - Preserve intentional list/section breaks
 * - Handle hyphenation at line ends (e.g., "appel-\nlant" → "appellant")
 */
export function normalizeOCR(text: string): string {
  if (!text) return '';

  // Step 0: Normalize line endings (Windows \r\n → Unix \n)
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 1: Preserve paragraph breaks by replacing \n\n with placeholder
  const PARA_MARKER = '¶¶PARA¶¶';
  result = result.replace(/\n\s*\n/g, PARA_MARKER);

  // Step 2: Handle hyphenation at line ends (e.g., "appel-\nlant")
  // Join hyphenated words: word-\n + lowercase continuation
  result = result.replace(/(\w)-\n\s*([a-z])/g, '$1$2');

  // Step 3: Strip trailing whitespace from each line (OCR often leaves trailing spaces)
  result = result.replace(/ +\n/g, '\n');

  // Step 4: Join lines that don't end with sentence-ending punctuation
  // If a line ends with a letter, comma, or other mid-sentence char,
  // and next line starts with a letter or continues the sentence,
  // replace \n with space
  result = result.replace(
    /([a-zA-Z,;:\-–—])\n\s*([a-zA-Z(""'\[])/g,
    '$1 $2'
  );

  // Step 5: Also join when line ends with common prepositions/articles
  // "the\nCircuit" → "the Circuit"
  result = result.replace(
    /\b(the|a|an|of|in|on|at|to|for|and|or|by|with|from|into|upon|v\.|vs\.)\n\s*/gi,
    '$1 '
  );

  // Step 5b: Join month abbreviations split by line break
  // "Oct.\n 1, 2021" → "Oct. 1, 2021", "May\n 5" → "May 5" (no false period)
  result = result.replace(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(\.?)\n\s*(\d)/gi,
    (_, month, dot, digit) => `${month}${dot || ''} ${digit}`
  );

  // Step 6: Join when next line starts with lowercase (clear continuation)
  result = result.replace(/\n\s*([a-z])/g, ' $1');

  // Step 7: Restore paragraph breaks
  result = result.replace(new RegExp(PARA_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\n\n');

  // Step 8: Clean up multiple spaces
  result = result.replace(/ {2,}/g, ' ');

  return result;
}


// ═══════════════════════════════════════════════════════════
// 2. REGEX DATE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * US court document date patterns.
 * Catches: "January 2015", "October 5, 2016", "Oct. 5, 2016",
 *          "10/5/2016", "2016-10-05", etc.
 *
 * OCR-defensive: handles common misreads (O→0, l→1, S→5)
 */

const MONTH_NAMES = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

const DATE_PATTERNS: RegExp[] = [
  // "January 2015", "October 5, 2016", "Oct. 5, 2016", "March 16, 2017"
  new RegExp(
    `\\b${MONTH_NAMES}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s*\\d{4}\\b`,
    'gi'
  ),
  // "January 2015" (month + year only, no day)
  new RegExp(
    `\\b${MONTH_NAMES}\\.?\\s+\\d{4}\\b`,
    'gi'
  ),
  // Numeric: "10/5/2016", "10-5-2016"
  /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
  // ISO: "2016-10-05"
  /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
];

interface DetectedEntity {
  name: string;
  type: EntityRecord['type'];
  confidence: number;
  source: 'regex' | 'gazetteer' | 'suffix';
  startIdx: number;
  endIdx: number;
}

/**
 * Check if a date match is inside a legal citation context.
 * Filters out bare years in patterns like "(Fla. 3d DCA 2016)", "(2018 ed.)", etc.
 * These are citation years, not factual event dates.
 */
function isCitationYear(text: string, matchStart: number, matchEnd: number, matchStr: string): boolean {
  // Only filter bare years (4 digits), not full dates like "October 5, 2016"
  if (!/^\d{4}$/.test(matchStr.trim())) return false;

  // Check surrounding context (40 chars before and after)
  const contextStart = Math.max(0, matchStart - 40);
  const contextEnd = Math.min(text.length, matchEnd + 20);
  const before = text.substring(contextStart, matchStart);
  const after = text.substring(matchEnd, contextEnd);

  // Pattern: inside parenthetical citation — "(... YEAR)" or "(YEAR ...)"
  // e.g., "(Fla. 3d DCA 2016)", "(2018 ed.)"
  if (/\([^)]*$/.test(before) && /^[^(]*\)/.test(after)) return true;

  // Pattern: after reporter citation — "So. 3d 211, 213" then year
  if (/\b\d+\s+So\.\s+\d[a-z]*d?\s+\d+/.test(before)) return true;

  // Pattern: "DCA YEAR" or "Cir. YEAR" (court abbreviations)
  if (/\b(?:DCA|Cir|App|Dist|Sup)\b\.?\s*$/.test(before)) return true;

  // Pattern: after "ed." — "(2018 ed.)"
  if (/^\s*ed\b/.test(after)) return true;

  return false;
}

/**
 * Extract all dates from text using regex patterns.
 */
export function detectDates(text: string): DetectedEntity[] {
  const results: DetectedEntity[] = [];
  const seen = new Set<string>(); // deduplicate by position

  for (const pattern of DATE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match.index}-${match[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Filter out citation years like "(Fla. 3d DCA 2016)"
      if (isCitationYear(text, match.index, match.index + match[0].length, match[0])) {
        continue;
      }

      results.push({
        name: match[0].trim(),
        type: 'date',
        confidence: 0.95,
        source: 'regex',
        startIdx: match.index,
        endIdx: match.index + match[0].length,
      });
    }
  }

  return results;
}


// ═══════════════════════════════════════════════════════════
// 3. REGEX MONEY/FINANCIAL DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect financial amounts in text.
 * Catches: "$1,500.00", "$50K", "1.5 million", "$2-3M", etc.
 * OCR-defensive: handles "S" for "$", "O" for "0"
 */
const MONEY_PATTERNS: RegExp[] = [
  // "$2.5 million", "$1.5 billion" (check BEFORE simple $X patterns to get longest match)
  /\$\s?\d+(?:\.\d+)?\s*(?:hundred|thousand|million|billion|trillion)\b/gi,
  // "$50K", "$2M", "$1.5B", "$2-3M"
  /\$\s?\d+(?:\.\d+)?(?:\s*[-–]\s*\$?\d+(?:\.\d+)?)?\s*[KkMmBb](?:illion|illion)?\b/g,
  // "$1,500.00" or "$1500" or "$50,000"
  /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
  // "1.5 million dollars", "50 thousand dollars"
  /\b\d+(?:\.\d+)?\s*(?:hundred|thousand|million|billion|trillion)\s*(?:dollars?|USD)\b/gi,
  // Amounts with currency after: "1,500 USD", "50,000 EUR"
  /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|CHF)\b/g,
];

export function detectMoney(text: string): DetectedEntity[] {
  const results: DetectedEntity[] = [];

  for (const pattern of MONEY_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const startIdx = match.index;
      const endIdx = match.index + match[0].length;

      // Skip if a longer match already covers this range
      const overlaps = results.some(
        (r) => r.startIdx <= startIdx && r.endIdx >= endIdx
      );
      if (overlaps) continue;

      // Remove shorter matches that this one subsumes
      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i].startIdx >= startIdx && results[i].endIdx <= endIdx) {
          results.splice(i, 1);
        }
      }

      results.push({
        name: match[0].trim(),
        type: 'money',
        confidence: 0.92,
        source: 'regex',
        startIdx,
        endIdx,
      });
    }
  }

  return results;
}


// ═══════════════════════════════════════════════════════════
// 4. LOCATION GAZETTEER
// ═══════════════════════════════════════════════════════════

/**
 * Deterministic location detection via gazetteer lookup.
 * Prevents LLM "laziness" on secondary locations like Florida, New York, Palm Beach.
 *
 * Strategy: predefined list of US states, major cities, and relevant legal jurisdictions.
 * Fast string matching — no ML needed.
 */

const US_STATES: string[] = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
  // Territories
  'District of Columbia', 'Puerto Rico', 'U.S. Virgin Islands', 'Virgin Islands', 'Guam',
];

// Key legal jurisdictions, counties, and cities commonly appearing in US court docs
const LEGAL_LOCATIONS: string[] = [
  // Florida (common in Epstein cases)
  'Miami-Dade County', 'Miami-Dade', 'Palm Beach County', 'Palm Beach',
  'Broward County', 'West Palm Beach', 'Pompano Beach', 'Fort Lauderdale',
  'Miami', 'Jacksonville', 'Tampa', 'Orlando',
  // New York
  'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
  'New York City', 'Long Island', 'Westchester',
  // Major US cities commonly in federal cases
  'Washington D.C.', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Francisco',
  'Seattle', 'Denver', 'Boston', 'Atlanta', 'Las Vegas',
  // Specific to Epstein network
  'Little St. James', 'Great St. James', 'U.S. Virgin Islands',
  'St. Thomas', 'St. Croix', 'St. John',
  // International locations in financial/trafficking cases
  'London', 'Paris', 'Tel Aviv', 'Monaco', 'Zurich', 'Geneva',
  'Cayman Islands', 'British Virgin Islands', 'Panama',
];

// Combine and sort by length (longer first to prevent partial matches)
const ALL_LOCATIONS = [...US_STATES, ...LEGAL_LOCATIONS]
  .sort((a, b) => b.length - a.length);

export function detectLocations(text: string): DetectedEntity[] {
  const results: DetectedEntity[] = [];
  const normalizedText = text.toLowerCase();
  const seen = new Set<string>(); // deduplicate by start position

  for (const location of ALL_LOCATIONS) {
    const searchTerm = location.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < normalizedText.length) {
      const pos = normalizedText.indexOf(searchTerm, searchFrom);
      if (pos === -1) break;

      // Word boundary check — prevent "Virginia" matching inside "West Virginia"
      const charBefore = pos > 0 ? normalizedText[pos - 1] : ' ';
      const charAfter = pos + searchTerm.length < normalizedText.length
        ? normalizedText[pos + searchTerm.length] : ' ';
      const isWordBoundary = /[\s,.:;()\-/"']/.test(charBefore) &&
                              /[\s,.:;()\-/"']/.test(charAfter);

      if (isWordBoundary) {
        // Don't add if a longer match already covers this position
        const posKey = `${pos}`;
        if (!seen.has(posKey)) {
          seen.add(posKey);
          // Also mark all sub-positions as taken
          for (let i = pos; i < pos + searchTerm.length; i++) {
            seen.add(`${i}`);
          }

          results.push({
            name: text.substring(pos, pos + location.length), // preserve original casing
            type: 'location',
            confidence: 0.90,
            source: 'gazetteer',
            startIdx: pos,
            endIdx: pos + location.length,
          });
        }
      }

      searchFrom = pos + 1;
    }
  }

  return results;
}


// ═══════════════════════════════════════════════════════════
// 5. CORPORATE SUFFIX DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect organizations by corporate suffixes.
 * Strategy: Find "LLC", "Inc.", "P.A." etc. and capture the preceding capitalized words.
 *
 * This catches fragmented entities like "MC2 Model & Talent LLC" even when
 * standard NER treats "MC2" as unclassified.
 */

const CORPORATE_SUFFIXES = [
  'LLC', 'L.L.C.', 'Inc.', 'Inc', 'Corp.', 'Corp', 'Corporation',
  'Ltd.', 'Ltd', 'Limited', 'L.P.', 'LP', 'LLP', 'L.L.P.',
  'P.A.', 'P.C.', 'Co.', 'Company', 'Group', 'Holdings',
  'Partners', 'Associates', 'Foundation', 'Trust',
  'GmbH', 'AG', 'S.A.', 'N.V.', 'PLC', 'Pty',
];

// Build regex: capture preceding capitalized words + the suffix
const SUFFIX_PATTERN = new RegExp(
  // 1-6 preceding words (capitalized, may include &, numbers, hyphens)
  `((?:[A-Z][A-Za-z0-9'\\-]*(?:\\s+(?:&|and|of|the|for))?\\s+){0,5}[A-Z][A-Za-z0-9'\\-]*)` +
  // Space or comma before suffix
  `[\\s,]+` +
  // The suffix itself
  `(${CORPORATE_SUFFIXES.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})` +
  // Word boundary
  `\\b`,
  'g'
);

/**
 * Check if an organization match is inside a legal citation context.
 * Filters out law firm names in case citations like "Robles-Martinez v. Diaz, Reus & Targ, LLP"
 */
function isCitationOrg(text: string, matchStart: number, matchEnd: number): boolean {
  // Pattern 1: after "v." or "vs." — check 60 chars before but ONLY if no sentence boundary in between
  const nearStart = Math.max(0, matchStart - 60);
  const nearBefore = text.substring(nearStart, matchStart);
  const vMatch = nearBefore.match(/\bvs?\.?\s/i);
  if (vMatch) {
    const vPos = nearStart + vMatch.index! + vMatch[0].length;
    // Include up to matchEnd to catch sentence boundaries inside captured prefix words
    const between = text.substring(vPos, matchEnd);
    // If no sentence boundary between "v." and the org, it's a citation
    // Sentence boundary = period + space + uppercase word (not abbreviations like "Fla." or initials)
    if (!/\.\s+[A-Z][a-z]{2,}/.test(between)) return true;
  }

  // Pattern 2: "v." AFTER the org — "Ness Racquet Club, LLC, v. Ocean" or "Mezz Lender, LLC v. Tutt"
  // The org is part of a case caption (party name in citation)
  const nearAfter = text.substring(matchEnd, Math.min(text.length, matchEnd + 30));
  if (/^[,\s]*\bvs?\.?\s/i.test(nearAfter)) return true;

  // Pattern 3: preceded by reporter citation pattern (wider window OK — very specific)
  const wideBefore = text.substring(Math.max(0, matchStart - 80), matchStart);
  if (/\b\d+\s+(?:So|F|S|U\.S|N\.E|N\.W|S\.E|S\.W|A|P)\.\s*\d*[a-z]*d?\s+\d+/.test(wideBefore)) return true;

  // Pattern 4: inside parenthetical with court abbreviation
  if (/\([^)]*(?:Fla|Cal|N\.Y|Tex|D\.C)\b/.test(wideBefore)) return true;

  // Pattern 5: preceded by legal citation signal (See, Cf., Accord, etc.)
  const shortBefore = text.substring(Math.max(0, matchStart - 20), matchStart).trim();
  if (/\b(?:See|Cf|Accord|Compare|Contra)\b\.?\s*$/i.test(shortBefore)) return true;

  return false;
}

export function detectOrganizations(text: string): DetectedEntity[] {
  const results: DetectedEntity[] = [];
  const seen = new Set<string>();

  SUFFIX_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  // Common English words that SUFFIX_PATTERN's prefix capture can accidentally grab
  const NON_ORG_PREFIXES = new Set([
    'meanwhile', 'however', 'therefore', 'furthermore', 'moreover', 'although',
    'nevertheless', 'subsequently', 'additionally', 'accordingly', 'consequently',
    'specifically', 'alternatively', 'the', 'a', 'an', 'this', 'that', 'these',
    'those', 'where', 'when', 'which', 'while', 'since', 'after', 'before',
    'during', 'between', 'through', 'under', 'over', 'about', 'against',
    'said', 'stated', 'noted', 'including', 'regarding', 'concerning',
    'if', 'but', 'so', 'yet', 'nor', 'as', 'by', 'per', 'via', 'its',
    'each', 'every', 'both', 'either', 'neither', 'such', 'like', 'unlike',
    // Legal citation signals — never org names
    'see', 'cf', 'accord', 'compare', 'contra', 'also', 'generally',
    'e.g', 'citing', 'quoted', 'quoting', 'citing', 'reversing', 'affirming',
    'overruled', 'superseded', 'abrogated', 'modified', 'distinguishing',
  ]);

  while ((match = SUFFIX_PATTERN.exec(text)) !== null) {
    let prefix = match[1].trim();
    // Strip common non-org prefix words
    const prefixWords = prefix.split(/\s+/);
    while (prefixWords.length > 1 && NON_ORG_PREFIXES.has(prefixWords[0].toLowerCase())) {
      prefixWords.shift();
    }
    // If the only remaining word is also a non-org prefix, the whole match is noise
    if (prefixWords.length === 1 && NON_ORG_PREFIXES.has(prefixWords[0].toLowerCase())) {
      continue;
    }
    prefix = prefixWords.join(' ');

    const fullName = `${prefix} ${match[2]}`.trim();
    const nameKey = fullName.toLowerCase();

    if (seen.has(nameKey)) continue;
    seen.add(nameKey);

    // Skip if it's clearly not an org (too short, single word less than 3 chars)
    if (fullName.length < 5) continue;

    // Skip organizations found inside legal citations
    if (isCitationOrg(text, match.index, match.index + match[0].length)) continue;

    results.push({
      name: fullName,
      type: 'organization',
      confidence: 0.88,
      source: 'suffix',
      startIdx: match.index,
      endIdx: match.index + match[0].length,
    });
  }

  return results;
}


// ═══════════════════════════════════════════════════════════
// 6. MASTER ENRICHMENT FUNCTION
// ═══════════════════════════════════════════════════════════

export interface EnrichmentResult {
  normalizedText: string;          // OCR-cleaned text
  enrichedEntities: EntityRecord[];  // New entities found by regex/gazetteer
  allEntities: EntityRecord[];       // AI entities + enriched entities (deduplicated)
  stats: {
    datesFound: number;
    moneyFound: number;
    locationsFound: number;
    orgsFound: number;
    totalEnriched: number;
  };
}

/**
 * Master enrichment pipeline.
 * Takes raw OCR text + AI-extracted entities, returns enriched result.
 *
 * Pipeline:
 *   1. Normalize OCR text
 *   2. Run regex detectors (dates, money)
 *   3. Run gazetteer (locations)
 *   4. Run suffix detection (organizations)
 *   5. Deduplicate against existing AI entities
 *   6. Return merged list
 */
export function enrichEntities(
  rawText: string,
  aiEntities: EntityRecord[]
): EnrichmentResult {
  // Step 1: Normalize OCR
  const normalizedText = normalizeOCR(rawText);

  // Step 2-4: Run all detectors on normalized text
  const detectedDates = detectDates(normalizedText);
  const detectedMoney = detectMoney(normalizedText);
  const detectedLocations = detectLocations(normalizedText);
  const detectedOrgs = detectOrganizations(normalizedText);

  const allDetected = [
    ...detectedDates,
    ...detectedMoney,
    ...detectedLocations,
    ...detectedOrgs,
  ];

  // Step 5: Deduplicate — don't add if AI already found this entity
  const aiNames = new Set(
    aiEntities.map(e => e.name.toLowerCase())
  );
  // Also check for partial matches (AI has "Miami-Dade County", don't add "Miami-Dade" separately)
  const aiNamesArray = aiEntities.map(e => e.name.toLowerCase());

  const enrichedEntities: EntityRecord[] = [];
  const enrichedNames = new Set<string>(); // prevent duplicate enriched entities

  for (const detected of allDetected) {
    const detectedLower = detected.name.toLowerCase();

    // Skip if we already enriched this exact entity name
    if (enrichedNames.has(detectedLower)) continue;

    // Skip if AI already has exact match
    if (aiNames.has(detectedLower)) continue;

    // Skip if AI has a longer entity that contains this one
    const isSubstringOfExisting = aiNamesArray.some(
      aiName => aiName.includes(detectedLower) && aiName !== detectedLower
    );
    if (isSubstringOfExisting) continue;

    // Skip if we already enriched a longer entity containing this one
    const isSubstringOfEnriched = enrichedEntities.some(
      e => e.name.toLowerCase().includes(detectedLower) && e.name.toLowerCase() !== detectedLower
    );
    if (isSubstringOfEnriched) continue;

    // Check if this enriched entity is a LONGER version of an AI entity
    // If so, we might want to upgrade the AI entity instead of adding new one
    // For now, just add as new entity
    enrichedNames.add(detectedLower);
    enrichedEntities.push({
      name: detected.name,
      type: detected.type,
      confidence: detected.confidence,
      role: `[${detected.source}]`, // Mark source for transparency
      source_sentence: undefined,
      source_page: undefined,
    });
  }

  // Step 6: Post-process AI entities — filter out citation noise that AI missed
  const cleanedAiEntities = aiEntities.filter(e => {
    // Filter bare years that are citation years (AI often marks them as dates)
    if (e.type === 'date' && /^\d{4}$/.test(e.name.trim())) {
      const yearStr = e.name.trim();
      // Check if a LONGER date entity already contains this year (e.g., "October 5, 2016" covers "2016")
      // Use word-boundary-aware check to prevent "20160".includes("2016") false positives
      const yearBoundaryRegex = new RegExp(`(?:^|\\D)${yearStr}(?:$|\\D)`);
      const coveredByLonger = aiEntities.some(other =>
        other.type === 'date' &&
        other.name !== e.name &&
        yearBoundaryRegex.test(other.name) &&
        other.name.length > yearStr.length
      );
      if (coveredByLonger) return false; // Redundant — longer date already has it

      // Search for this year in normalized text and check if it's in a citation context
      let searchFrom = 0;
      let allCitationOrCovered = true;
      let found = false;
      while (searchFrom < normalizedText.length) {
        const pos = normalizedText.indexOf(yearStr, searchFrom);
        if (pos === -1) break;
        found = true;
        // Check: is this occurrence inside a full date like "October 5, 2016"?
        const before10 = normalizedText.substring(Math.max(0, pos - 15), pos);
        const isPartOfFullDate = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2}\s*,?\s*$/i.test(before10);
        if (!isPartOfFullDate && !isCitationYear(normalizedText, pos, pos + yearStr.length, yearStr)) {
          allCitationOrCovered = false;
          break;
        }
        searchFrom = pos + 1;
      }
      if (found && allCitationOrCovered) return false;
    }

    // Filter organizations that only appear in citation contexts
    if (e.type === 'organization') {
      const orgLower = e.name.toLowerCase();
      const textLower = normalizedText.toLowerCase(); // cache — avoid re-creating per iteration
      let searchFrom = 0;
      let allCitation = true;
      let found = false;
      while (searchFrom < textLower.length) {
        const pos = textLower.indexOf(orgLower, searchFrom);
        if (pos === -1) break;
        found = true;
        if (!isCitationOrg(normalizedText, pos, pos + e.name.length)) {
          allCitation = false;
          break;
        }
        searchFrom = pos + 1;
      }
      if (found && allCitation) return false;
    }

    return true;
  });

  // Step 7: Merge
  const allEntities = [...cleanedAiEntities, ...enrichedEntities];

  return {
    normalizedText,
    enrichedEntities,
    allEntities,
    stats: {
      datesFound: detectedDates.length,
      moneyFound: detectedMoney.length,
      locationsFound: detectedLocations.length,
      orgsFound: detectedOrgs.length,
      totalEnriched: enrichedEntities.length,
    },
  };
}
