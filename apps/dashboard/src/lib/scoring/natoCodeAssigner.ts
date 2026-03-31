/**
 * NATO ADMIRALTY CODE AUTO-ASSIGNER
 * ==================================
 *
 * Automatically assigns NATO Admiralty Codes (Source Reliability A-F, Information
 * Credibility 1-6) based on document type, sub-source, and evidence characteristics.
 *
 * Rule-based assignment for deterministic sources, human-review flag for ambiguous.
 * Truth Anayasası: "AI'a güvenme, doğrula" — deterministic rules > AI judgment.
 *
 * @version 1.0.0
 * @date 2026-03-22
 */

// ============================================================================
// TYPES
// ============================================================================

export type NATOReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type NATOCredibility = '1' | '2' | '3' | '4' | '5' | '6';

export interface NATOAssignment {
  reliability: NATOReliability;
  credibility: NATOCredibility;
  code: string;
  reliability_reason: string;
  credibility_reason: string;
  auto_assigned: boolean;
  needs_human_review: boolean;
}

// ============================================================================
// SOURCE RELIABILITY (A-F) — Based on document type + sub-source
// ============================================================================

/**
 * A — Completely reliable: Official court filings, sworn testimony, FBI reports
 * B — Usually reliable: Named witnesses, established journalists, known professionals
 * C — Fairly reliable: News sources, community reports, unverified organizations
 * D — Not usually reliable: Unnamed sources, anonymous tips
 * E — Unreliable: Unsubstantiated claims, social media rumors
 * F — Cannot be judged: Insufficient information
 */

const DOC_TYPE_RELIABILITY: Record<string, NATOReliability> = {
  sworn_testimony:     'A',
  court_filing:        'A',
  fbi_report:          'A',
  government_filing:   'A',
  deposition_reference: 'A',
  complaint:           'A', // Rule 11 certified
  legal_correspondence: 'B',
  credible_journalism: 'B',
};

const SUB_SOURCE_RELIABILITY: Record<string, NATOReliability> = {
  sworn_affidavit:       'A',
  police_reports:        'A',
  fbi_302:               'A',
  fbi_ec:                'A',
  court_order:           'A',
  fbi_evidence_inventory: 'A',
  grand_jury_subpoena:   'A',
  newspaper:             'B',
};

const ROLE_RELIABILITY_OVERRIDE: Record<string, NATOReliability> = {
  // Roles that inherently have high reliability
  lead_detective: 'A',
  police_chief: 'A',
  circuit_judge: 'A',
  state_attorney: 'A',
  assistant_state_attorney: 'A',
  federal_agent: 'A',
  // Roles with moderate reliability
  defense_attorney: 'A', // verifiable professional
  journalist: 'B',
  // Roles with lower reliability
  associate_newspaper: 'B',
  political_figure: 'B',
  publicist: 'C',
};

// ============================================================================
// INFORMATION CREDIBILITY (1-6) — Based on corroboration
// ============================================================================

/**
 * 1 — Confirmed by other sources
 * 2 — Probably true (corroborated by at least one source)
 * 3 — Possibly true (not contradicted but single source)
 * 4 — Doubtful
 * 5 — Improbable
 * 6 — Cannot be judged
 */

function assessCredibility(
  evidenceTypes: string[],
  subSource: string,
  mentions: number
): { credibility: NATOCredibility; reason: string } {
  const subParts = subSource.split('+').map(s => s.trim());
  const uniqueSubSources = new Set(subParts);
  const uniqueEvidenceTypes = new Set(evidenceTypes);

  // Multiple independent source types + multiple sub-sources = Confirmed
  if (uniqueSubSources.size >= 3 && uniqueEvidenceTypes.size >= 3) {
    return { credibility: '1', reason: 'Multiple independent sources confirm (3+ sub-sources, 3+ evidence types)' };
  }

  // Sworn + at least one corroborating source = Confirmed
  if (evidenceTypes.includes('sworn_testimony') && uniqueSubSources.size >= 2) {
    return { credibility: '1', reason: 'Sworn testimony + corroborating source' };
  }

  // Multiple sub-sources OR multiple evidence types = Probably true
  if (uniqueSubSources.size >= 2 || uniqueEvidenceTypes.size >= 2) {
    return { credibility: '2', reason: 'Multiple sources corroborate' };
  }

  // Single strong source (sworn, court, police) with high mentions
  if (mentions >= 10 && (
    subParts.some(s => ['sworn_affidavit', 'police_reports', 'court_order'].includes(s))
  )) {
    return { credibility: '2', reason: 'Single strong source with frequent mentions' };
  }

  // Single source, not contradicted
  if (uniqueSubSources.size === 1) {
    // Newspaper-only = possibly true
    if (subParts[0] === 'newspaper') {
      return { credibility: '3', reason: 'Single newspaper source, not independently verified' };
    }
    // Other single sources
    return { credibility: '2', reason: 'Single reliable source' };
  }

  return { credibility: '6', reason: 'Cannot be judged — insufficient information' };
}

// ============================================================================
// MAIN ASSIGNMENT FUNCTION
// ============================================================================

/**
 * Auto-assign NATO Admiralty Code to an entity based on available evidence.
 *
 * @param documentType - The type of the source document
 * @param evidenceTypes - Types of evidence supporting this entity
 * @param subSource - Sub-source string (e.g., "sworn_affidavit+police_reports")
 * @param role - Entity's role (e.g., "lead_detective", "associate_newspaper")
 * @param mentions - Number of mentions in the document
 * @returns NATOAssignment with reliability, credibility, reasons, and review flag
 */
export function assignNATOCode(
  documentType: string,
  evidenceTypes: string[],
  subSource: string,
  role?: string,
  mentions?: number
): NATOAssignment {
  const mentionCount = mentions ?? 0;

  // --- RELIABILITY ---
  let reliability: NATOReliability = 'F';
  let reliabilityReason = 'Default: cannot be judged';
  let needsReview = false;

  // Step 1: Document type baseline
  const docReliability = DOC_TYPE_RELIABILITY[documentType];
  if (docReliability) {
    reliability = docReliability;
    reliabilityReason = `Document type: ${documentType}`;
  }

  // Step 2: Sub-source can elevate or lower
  const subParts = subSource.split('+').map(s => s.trim());
  const bestSubSourceReliability = subParts
    .map(s => SUB_SOURCE_RELIABILITY[s])
    .filter(Boolean)
    .sort()[0]; // Sort to get 'A' before 'B' etc.

  if (bestSubSourceReliability && bestSubSourceReliability < reliability) {
    reliability = bestSubSourceReliability;
    reliabilityReason += ` → elevated by sub-source`;
  }

  // Step 3: Newspaper-only entities cap at B
  const isNewspaperOnly = subParts.every(p => p === 'newspaper');
  if (isNewspaperOnly && reliability === 'A') {
    reliability = 'B';
    reliabilityReason = 'Newspaper-only source (capped at B)';
  }

  // Step 4: Role override (if more specific)
  if (role && ROLE_RELIABILITY_OVERRIDE[role]) {
    const roleReliability = ROLE_RELIABILITY_OVERRIDE[role];
    if (roleReliability > reliability) {
      // Lower reliability wins (more conservative) — but role can't make it worse
      // than what evidence shows. Only adjust if role is clearly less reliable.
    }
    // Role doesn't override upward — evidence is stronger signal
  }

  // Step 5: Flag for human review if ambiguous
  if (reliability === 'F' || (isNewspaperOnly && mentionCount <= 1)) {
    needsReview = true;
  }

  // --- CREDIBILITY ---
  const { credibility, reason: credibilityReason } = assessCredibility(
    evidenceTypes,
    subSource,
    mentionCount
  );

  return {
    reliability,
    credibility,
    code: `${reliability}${credibility}`,
    reliability_reason: reliabilityReason,
    credibility_reason: credibilityReason,
    auto_assigned: true,
    needs_human_review: needsReview,
  };
}

/**
 * Batch assign NATO codes to multiple entities.
 */
export function assignNATOCodeBatch(
  entities: Array<{
    name: string;
    documentType: string;
    evidenceTypes: string[];
    subSource: string;
    role?: string;
    mentions?: number;
  }>
): Array<{ name: string; assignment: NATOAssignment }> {
  return entities.map(e => ({
    name: e.name,
    assignment: assignNATOCode(
      e.documentType,
      e.evidenceTypes,
      e.subSource,
      e.role,
      e.mentions
    ),
  }));
}
