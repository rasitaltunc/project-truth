// ═══════════════════════════════════════════
// AI SECURITY SPRINT AI-2: Annotation Validator
// Validates AI-generated annotations against database facts
// Prevents hallucinated death claims, financial figures, age claims
// ═══════════════════════════════════════════

/**
 * Validate AI-generated annotations against actual node data.
 * Filters out annotations that make claims not supported by the database.
 *
 * Rules:
 * 1. Node must exist in the provided nodes array
 * 2. Label must be ≤ 28 characters
 * 3. Death/deceased claims require death_date or death keywords in summary
 * 4. Financial claims ($XXM) require financial data in summary/occupation
 * 5. Age claims require birth_date in node data
 */
export function validateAnnotations(
  annotations: Record<string, string>,
  nodes: any[]
): Record<string, string> {
  if (!annotations || typeof annotations !== 'object') return {};
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return {};

  const validated: Record<string, string> = {};
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  for (const [nodeId, label] of Object.entries(annotations)) {
    // Skip non-string labels
    if (typeof label !== 'string' || !label.trim()) continue;

    const node = nodeMap.get(nodeId);
    // RULE 1: Node must exist
    if (!node) continue;

    // RULE 2: Length check (25 char guideline + 3 char buffer = 28 max)
    if (label.length > 28) continue;

    // RULE 3: Death/life claims
    const deathKeywords = ['ÖLDÜ', 'DEAD', 'DECEASED', 'KILLED', 'İNTİHAR', 'SUICIDE', 'DIED', 'DEATH', 'ÖLÜM', 'HAYATINI KAYBETTİ'];
    const labelUpper = label.toUpperCase();
    const hasDeathClaim = deathKeywords.some((kw) => labelUpper.includes(kw));
    if (hasDeathClaim) {
      const hasDeath =
        node.death_date ||
        (node.summary && /\b(death|died|dead|suicide|killed|murder|ölüm|öldü|intihar|öldürüldü)\b/i.test(node.summary));
      if (!hasDeath) continue; // No death evidence in DB → filter out
    }

    // RULE 4: Financial claims (dollar amounts like $150M, $46M, $500K)
    const moneyPattern = /\$[\d,.]+\s*[MBKmbk]?/;
    if (moneyPattern.test(label)) {
      const hasFinancialData =
        (node.summary && moneyPattern.test(node.summary)) ||
        (node.occupation && /financ|bank|fund|invest|money|hedge|capital/i.test(node.occupation)) ||
        (node.summary && /financ|payment|settlement|transfer|wire|fund|donat/i.test(node.summary));
      if (!hasFinancialData) continue; // No financial evidence → filter out
    }

    // RULE 5: Age claims (AGE 15, YAŞ 17, etc.)
    const agePattern = /\bAGE\s*\d+|YAŞ\s*\d+|\d+\s*YAŞINDA/i;
    if (agePattern.test(label)) {
      if (!node.birth_date) continue; // No birth_date → can't verify age claim → filter out
    }

    validated[nodeId] = label;
  }

  return validated;
}

/**
 * Calculate confidence level of AI response based on how well it matches database
 */
export function calculateConfidence(
  parsed: {
    highlightNodeIds?: string[];
    annotations?: Record<string, string>;
  },
  nodes: any[]
): 'high' | 'medium' | 'low' {
  if (!nodes || nodes.length === 0) return 'medium';

  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
  let sourcedCount = 0;
  let totalClaims = 0;

  // Check if highlighted node IDs actually exist
  for (const id of parsed.highlightNodeIds || []) {
    totalClaims++;
    if (nodeMap.has(id)) sourcedCount++;
  }

  // Check if annotations reference real node data
  for (const [nodeId, label] of Object.entries(parsed.annotations || {})) {
    totalClaims++;
    const node = nodeMap.get(nodeId);
    if (node) {
      // Check if label content is somewhat reflected in node data
      const labelWords = (label as string).toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const nodeText = `${node.summary || ''} ${node.occupation || ''} ${node.name || ''}`.toLowerCase();
      const matchCount = labelWords.filter((w) => nodeText.includes(w)).length;
      if (matchCount > 0 || labelWords.length === 0) sourcedCount++;
    }
  }

  if (totalClaims === 0) return 'medium';
  const ratio = sourcedCount / totalClaims;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

/**
 * Check if the AI response is primarily data-sourced (vs AI interpretation)
 */
export function checkDataSourced(
  parsed: {
    highlightNodeIds?: string[];
    annotations?: Record<string, string>;
    narrative?: string;
  },
  nodes: any[]
): boolean {
  if (!nodes || nodes.length === 0) return false;

  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // All highlighted nodes must exist
  const allHighlightsExist = (parsed.highlightNodeIds || []).every((id) => nodeMap.has(id));
  if (!allHighlightsExist) return false;

  // At least one annotation must match node data
  const annotationEntries = Object.entries(parsed.annotations || {});
  if (annotationEntries.length === 0) return true; // No annotations = data-sourced by default

  let matchCount = 0;
  for (const [nodeId] of annotationEntries) {
    if (nodeMap.has(nodeId)) matchCount++;
  }

  return matchCount === annotationEntries.length;
}

// ═══ Placeholder Name Filter (for Document Scan) ═══

const PLACEHOLDER_NAMES = new Set([
  'john smith', 'jane doe', 'john doe', 'jane smith',
  'john michael doe', 'j. doe', 'j. smith', 'j doe', 'j smith',
  'unknown person', 'unnamed individual', 'bilinmeyen kişi',
  'person a', 'person b', 'person c', 'person d',
  'company a', 'company b', 'company c',
  'kişi a', 'kişi b', 'kişi c',
  'şirket a', 'şirket b', 'şirket c',
  'test', 'example', 'sample', 'placeholder',
  'xxx', 'yyy', 'zzz', 'abc', 'n/a', 'tbd', 'unknown',
  'bilinmiyor', 'belirtilmemiş',
]);

/**
 * Check if an entity name is a placeholder/fake name
 * Used by document scan pipeline to filter AI hallucinations
 */
export function isPlaceholderName(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  const normalized = name.toLowerCase().trim();

  // Direct match
  if (PLACEHOLDER_NAMES.has(normalized)) return true;

  // Single character names (A, B, X) — but allow 2-char names like "Li", "Wu", "Xi"
  if (normalized.length <= 1) return true;

  // Only digits
  if (/^\d+$/.test(normalized)) return true;

  // Only special characters
  if (/^[^a-zA-ZğüşöçıİĞÜŞÖÇ]+$/.test(normalized)) return true;

  return false;
}

// ═══ E1 FIX: Narrative Safety Validator ═══

/** Maximum allowed narrative length (characters) */
const MAX_NARRATIVE_LENGTH = 2000;

/** Dangerous patterns that should be stripped from AI narrative */
const DANGEROUS_NARRATIVE_PATTERNS = [
  // HTML/script injection attempts
  /<script\b/i,
  /<iframe\b/i,
  /javascript:/i,
  /on\w+\s*=/i,          // onclick=, onload=, etc.
  // Markdown link injection (phishing)
  /\[.*?\]\(https?:\/\/(?!projecttruth\.org)/i,
];

/**
 * Sanitize AI-generated narrative text.
 * - Truncates to max length
 * - Strips dangerous HTML/script patterns
 * - Returns safe string for client display
 */
export function sanitizeNarrative(narrative: string): string {
  if (!narrative || typeof narrative !== 'string') return '';

  let safe = narrative.slice(0, MAX_NARRATIVE_LENGTH);

  // Strip dangerous patterns
  for (const pattern of DANGEROUS_NARRATIVE_PATTERNS) {
    safe = safe.replace(new RegExp(pattern.source, 'gi'), '[FILTERED]');
  }

  return safe;
}
