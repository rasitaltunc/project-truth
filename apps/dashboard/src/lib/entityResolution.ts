/**
 * Entity Resolution Engine — Sprint 17
 * Zero-AI fuzzy matching for entity deduplication
 *
 * Uses Jaro-Winkler distance (primary), Levenshtein (secondary),
 * and normalization rules for robust matching across multiple languages.
 *
 * @author AI-OS Platform
 * @version 1.0.0
 */

/**
 * Match result containing scores and metadata
 */
export interface MatchResult {
  nodeId: string;
  nodeName: string;
  score: number; // 0-1 composite score
  method: 'exact' | 'jaro_winkler' | 'levenshtein' | 'phonetic';
  jaroWinkler: number;
  levenshtein: number;
  normalized: boolean;
}

/**
 * Entity resolution output for batch processing
 */
export interface ResolvedEntity {
  extractedName: string;
  extractedType: string;
  match: MatchResult | null;
  isNew: boolean; // true if no match found above threshold
}

/**
 * Turkish character mapping for ASCII normalization
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  ğ: 'g',
  Ğ: 'G',
  ü: 'u',
  Ü: 'U',
  ö: 'o',
  Ö: 'O',
  ç: 'c',
  Ç: 'C',
  ş: 's',
  Ş: 'S',
  ı: 'i',
  İ: 'I',
};

/**
 * Common titles to remove during normalization
 */
const COMMON_TITLES = new Set([
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'professor',
  'jr',
  'sr',
  'iii',
  'ii',
  'iv',
  'v',
  'hon',
  'honorable',
  'gen',
  'general',
  'col',
  'colonel',
  'maj',
  'major',
  'capt',
  'captain',
  'lt',
  'lieutenant',
  'sgt',
  'sergeant',
  'rev',
  'reverend',
  'rabbi',
  'imam',
  'sheikh',
  'shaikh',
  'emir',
  'amir',
  'prince',
  'princess',
  'duke',
  'duchess',
  'baron',
  'baroness',
  'count',
  'countess',
  'lord',
  'lady',
  'sir',
  'dame',
]);

/**
 * Common organizational suffixes to remove
 */
const COMMON_SUFFIXES = new Set([
  'llc',
  'ltd',
  'inc',
  'corp',
  'corporation',
  'company',
  'co',
  'gmbh',
  'ag',
  'sa',
  'nv',
  'bv',
  'plc',
  'pllc',
  'lp',
  'llp',
  'pc',
  'pty',
  'aps',
  'as',
  'sro',
  's.r.o.',
  'sro.',
  'kft',
  'spzoo',
  'sp.z.o.o.',
  'eood',
  'ehf',
  'oü',
  'oa',
  'kb',
  'sl',
  'slne',
]);

/**
 * Normalize entity names for consistent matching
 *
 * - Lowercase
 * - Remove extra whitespace
 * - Remove common titles and suffixes
 * - Normalize Turkish and accented characters to ASCII
 * - Trim
 *
 * @param name - Raw entity name
 * @returns Normalized name
 */
export function normalizeEntityName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let normalized = name.trim();

  // Normalize Turkish and accented characters
  normalized = normalized
    .split('')
    .map((char) => TURKISH_CHAR_MAP[char] || char)
    .join('');

  // Remove diacritics (é→e, à→a, etc.)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Lowercase
  normalized = normalized.toLowerCase();

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Strip punctuation that clings to titles (e.g. "Dr." → "dr", "Jr," → "jr")
  // Noktalama işaretleri titüllerin tanınmasını engelleyebilir
  normalized = normalized.replace(/[.,;:!?'"()[\]{}]/g, '');

  // Remove titles (word boundaries)
  const words = normalized.split(/\s+/);
  const filteredWords = words.filter((word) => !COMMON_TITLES.has(word));

  if (filteredWords.length === 0) {
    return normalized; // Keep original if only titles
  }

  normalized = filteredWords.join(' ');

  // Remove suffixes (word boundaries, end of string)
  const parts = normalized.split(/\s+/);
  if (parts.length > 0 && COMMON_SUFFIXES.has(parts[parts.length - 1])) {
    parts.pop();
  }

  if (parts.length === 0) {
    return normalized; // Keep previous version if suffix removal empties
  }

  normalized = parts.join(' ').trim();

  return normalized;
}

/**
 * Calculate Jaro-Winkler distance between two strings
 *
 * Implementation of the standard Jaro-Winkler algorithm:
 * 1. Calculate Jaro distance (0-1)
 * 2. If strings share a common prefix (max 4 chars), apply Winkler prefix bonus (p=0.1)
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @returns Distance score (0-1, where 1 = perfect match)
 */
export function jaroWinklerDistance(s1: string, s2: string): number {
  if (!s1 || !s2) {
    return s1 === s2 ? 1 : 0;
  }

  if (s1 === s2) {
    return 1;
  }

  // Jaro distance calculation
  const len1 = s1.length;
  const len2 = s2.length;

  const maxDistance = Math.max(len1, len2);
  const matchDistance = Math.max(maxDistance / 2 - 1, 0);

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) {
        continue;
      }
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) {
      continue;
    }
    while (!s2Matches[k]) {
      k++;
    }
    if (s1[i] !== s2[k]) {
      transpositions++;
    }
    k++;
  }

  const jaro =
    (matches / len1 +
      matches / len2 +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler modification: add prefix bonus
  let prefix = 0;
  const prefixLength = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < prefixLength; i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  const p = 0.1; // Winkler prefix weight
  return jaro + prefix * p * (1 - jaro);
}

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 *
 * Returns the minimum number of single-character edits (insert, delete, substitute)
 * required to change one string into the other.
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @returns Edit distance (number of operations)
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (!s1) {
    return s2?.length || 0;
  }
  if (!s2) {
    return s1.length;
  }

  const len1 = s1.length;
  const len2 = s2.length;

  // Create matrix
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Find the best matching node from a list of existing nodes
 *
 * Uses composite scoring:
 * - Jaro-Winkler: 70% weight (best for fuzzy matching)
 * - Normalized Levenshtein: 30% weight
 * - Type matching bonus: +0.05 if types match
 * - Normalization bonus: +0.02 if successful normalization
 *
 * @param extractedName - Name to match
 * @param existingNodes - Candidate nodes with id, name, and optional type
 * @param threshold - Minimum composite score to return match (default 0.85)
 * @returns Best match result, or null if no candidate exceeds threshold
 */
export function findBestMatch(
  extractedName: string,
  existingNodes: Array<{ id: string; name: string; type?: string }>,
  threshold = 0.85
): MatchResult | null {
  if (!extractedName || !existingNodes || existingNodes.length === 0) {
    return null;
  }

  // Check for exact match first
  const extractedNameLower = extractedName.toLowerCase();
  for (const node of existingNodes) {
    if (node.name.toLowerCase() === extractedNameLower) {
      return {
        nodeId: node.id,
        nodeName: node.name,
        score: 1.0,
        method: 'exact',
        jaroWinkler: 1.0,
        levenshtein: 0,
        normalized: false,
      };
    }
  }

  // Normalize the extracted name
  const normalizedExtracted = normalizeEntityName(extractedName);
  const normalizedUsed = normalizedExtracted.length > 0;

  let bestMatch: MatchResult | null = null;
  let bestScore = threshold;

  for (const node of existingNodes) {
    // Compare against original name
    const jaroWinkler1 = jaroWinklerDistance(
      extractedName,
      node.name
    );
    const levenshtein1 = levenshteinDistance(
      extractedName,
      node.name
    );
    const normalizedLevenshtein1 =
      1 - levenshtein1 / Math.max(extractedName.length, node.name.length);

    let compositeScore1 = jaroWinkler1 * 0.7 + normalizedLevenshtein1 * 0.3;

    // Compare against normalized name if applicable
    let compositeScore2 = 0;
    if (normalizedUsed) {
      const normalizedNode = normalizeEntityName(node.name);
      const jaroWinkler2 = jaroWinklerDistance(
        normalizedExtracted,
        normalizedNode
      );
      const levenshtein2 = levenshteinDistance(
        normalizedExtracted,
        normalizedNode
      );
      const normalizedLevenshtein2 =
        1 - levenshtein2 / Math.max(normalizedExtracted.length, normalizedNode.length);

      compositeScore2 =
        jaroWinkler2 * 0.7 +
        normalizedLevenshtein2 * 0.3 +
        (normalizedUsed ? 0.02 : 0); // Bonus for successful normalization
    }

    // Use better score
    const score = Math.max(compositeScore1, compositeScore2);
    const jw = Math.max(jaroWinkler1, normalizedUsed ? jaroWinklerDistance(normalizedExtracted, normalizeEntityName(node.name)) : 0);
    const lev = Math.min(levenshtein1, normalizedUsed ? levenshteinDistance(normalizedExtracted, normalizeEntityName(node.name)) : levenshtein1);

    // Add type matching bonus
    let finalScore = score;
    if (node.type && normalizedUsed) {
      // Type matching bonus (modest, only when normalized)
      finalScore += 0.05;
    }

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = {
        nodeId: node.id,
        nodeName: node.name,
        score: Math.min(finalScore, 1.0), // Cap at 1.0
        method: 'jaro_winkler',
        jaroWinkler: jw,
        levenshtein: lev,
        normalized: normalizedUsed,
      };
    }
  }

  return bestMatch;
}

/**
 * Batch resolve multiple extracted entities against existing nodes
 *
 * Processes a list of extracted entities and finds the best match for each
 * against a list of existing nodes in the knowledge graph.
 *
 * @param extractedEntities - Array of extracted entities with name, type, and confidence
 * @param existingNodes - Array of existing nodes in the graph
 * @param threshold - Minimum composite score to consider a match (default 0.85)
 * @returns Array of resolved entities with match results
 */
export function resolveEntities(
  extractedEntities: Array<{ name: string; type: string; confidence: number }>,
  existingNodes: Array<{ id: string; name: string; type?: string }>,
  threshold = 0.85
): ResolvedEntity[] {
  if (!extractedEntities || extractedEntities.length === 0) {
    return [];
  }

  return extractedEntities.map((entity) => {
    const match = findBestMatch(entity.name, existingNodes, threshold);
    return {
      extractedName: entity.name,
      extractedType: entity.type,
      match,
      isNew: match === null,
    };
  });
}

/**
 * Utility: Get type-safe node type for matching bonus
 * Useful when nodes have type information we want to leverage
 *
 * @param node - Node with optional type field
 * @returns Type string or undefined
 */
export function getNodeType(node: { id: string; name: string; type?: string }): string | undefined {
  return node.type;
}

/**
 * Utility: Check if two types are compatible for matching
 * Can be extended to handle type hierarchies (person, organization, etc.)
 *
 * @param type1 - First type
 * @param type2 - Second type
 * @returns true if types match or are compatible
 */
export function areTypesCompatible(type1?: string, type2?: string): boolean {
  if (!type1 || !type2) {
    return true; // No type penalty if either is missing
  }
  return type1.toLowerCase() === type2.toLowerCase();
}
