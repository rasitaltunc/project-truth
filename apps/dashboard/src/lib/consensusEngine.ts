/**
 * CONSENSUS ENGINE — 3-Pass Entity Extraction with Post-Hoc Scoring
 *
 * The Truth Pipeline: UNDERSTAND + SCORE stages
 *
 * Pass 1 (Thorough): Extract all explicitly mentioned entities
 * Pass 2 (Independent): Second independent extraction (does NOT see Pass 1 results)
 * Pass 3 (Aggressive): Find anything Pass 1+2 missed
 *
 * Consensus: 3/3 → high confidence, 2/3 → accept, 1/3 → validate against document text
 * Document Text Validation: 1/3 entities verified in document → accept (low confidence), not found → reject
 *
 * 8-Signal Post-Hoc Confidence: Replace AI self-reported confidence with calculated score
 */

import Groq from 'groq-sdk';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface ExtractedEntity {
  name: string;
  type: string;
  role: string;
  importance: string;
  category: string;
  confidence: number;
  mention_count: number;
  context: string;
  // Verification Desk v2: Source citation for spotlight system
  source_sentence: string;  // Exact quote from document (verbatim)
  source_page?: number;     // Page number if available
}

export interface ExtractedRelationship {
  sourceName: string;
  targetName: string;
  relationshipType: string;
  evidenceType: string;
  description: string;
  confidence: number;
  // Verification Desk v2: Source citation for spotlight system
  source_sentence: string;  // Exact quote from document (verbatim)
  source_page?: number;     // Page number if available
}

export interface ExtractedDate {
  date: string;
  description: string;
}

export interface PassResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  summary: string;
  keyDates: ExtractedDate[];
  confidence: number;
  raw_response?: string;
  token_usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ConsensusResult {
  entities: (ExtractedEntity & { consensus: '3/3' | '2/3'; passes: number[] })[];
  relationships: (ExtractedRelationship & { consensus: '3/3' | '2/3' | '1/3'; passes: number[] })[];
  summary: string;
  keyDates: ExtractedDate[];
  rejected_entities: (ExtractedEntity & { reason: string })[];
  stats: {
    pass1_entities: number;
    pass2_verified: number;
    pass3_additions: number;
    consensus_3_3: number;
    consensus_2_3: number;
    consensus_1_3_rejected: number;
    total_accepted: number;
  };
}

export interface ConfidenceSignals {
  s1_document_type: number;
  s2_source_hierarchy: number;
  s3_consensus: number;
  s4_cross_reference: number;
  s5_entity_resolution: number;
  s6_community: number;
  s7_historical: number;
  s8_network_consistency: number;
}

export interface ScanJobResult {
  consensus: ConsensusResult;
  passes: [PassResult, PassResult, PassResult];
  confidence_signals: ConfidenceSignals;
  confidence_composite: number;
  confidence_route: string;
  token_total: number;
  duration_ms: number;
  prompt_version: string;
}

// ═══════════════════════════════════════════
// PROMPTS — 3 PASSES
// ═══════════════════════════════════════════

function buildPass1Prompt(documentText: string, nodeList: string, hasRealContent: boolean, caseContext?: string): string {
  return `You are an investigative analyst. Extract ALL entities that are EXPLICITLY mentioned in this document. Be THOROUGH — it is critical to find every person, organization, location, and financial amount mentioned.

${caseContext ? `EXPECTED CASE CONTEXT:\n${caseContext}\nIf this document does NOT appear to belong to this case, set confidence to 0 and note "CASE_MISMATCH" in summary.\n` : ''}
DOCUMENT CONTENT:
${documentText}

CURRENT NETWORK PEOPLE (for matching):
${nodeList}

RULES:
- Extract ALL named persons, organizations, specific locations, and financial amounts explicitly stated in the document
- PERSONS: Extract EVERY person mentioned by full name. This includes:
  * Defendants, subjects of investigation
  * Judges (e.g., "Judge Richard M. Berman", "Magistrate Judge Henry Pitman")
  * Prosecutors and attorneys (e.g., "Assistant U.S. Attorney Alex Rossmiller", "Maurene Comey")
  * Co-conspirators (e.g., "Ghislaine Maxwell" even if named as associate)
  * Witnesses, agents, clerks — EVERYONE with a name
  * Look for names in signature blocks, headers, case captions, and footnotes too
- ORGANIZATIONS: Banks, law firms, companies, NGOs mentioned by name (e.g., "JP Morgan", "Deutsche Bank")
- LOCATIONS: Specific addresses, cities, states, countries, property names (e.g., "East 71st Street", "New Mexico ranch")
- FINANCIAL: Dollar amounts, property values, bail amounts (e.g., "$500 million", "$77 million mansion")
- Legal professionals should be importance: "low" unless they are subjects of investigation, but still EXTRACT them
- Every entity MUST have a direct quote from the document as "context"
- LANGUAGE: ALL output must be in ENGLISH. Relationship types, roles, descriptions — everything in English. No Turkish, no other languages.
- Do NOT extract generic institutional terms as entities. BLOCKED: "United States", "USA", "Government", "Court", "State", "People", "Plaintiff", "Defendant", "DOJ", "FBI", "SDNY", "Department of Justice" — but DO extract specific named organizations like "Deutsche Bank" or "JP Morgan Chase"
- Do NOT extract case citations, docket numbers, or legal terms as entities
- Victims should remain anonymous (Jane Doe format)
- If a name matches someone in the current network, note it but verify independently
- AIM FOR COMPLETENESS: Missing a real entity is WORSE than including a low-confidence one. Scan the ENTIRE document systematically from top to bottom.
${!hasRealContent ? '- WARNING: Limited content. Extract only what is absolutely certain.' : ''}

OUTPUT JSON:
{
  "entities": [{"name": "Full Name", "type": "person|organization|location|date|money", "role": "Role IN THIS DOCUMENT (in English)", "importance": "critical|high|medium|low", "category": "subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only", "confidence": 0.0-1.0, "mention_count": number, "context": "Direct quote from document", "source_sentence": "EXACT verbatim sentence from the document where this entity is mentioned — copy-paste, do NOT paraphrase", "source_page": page_number_or_null}],
  "relationships": [{"sourceName": "Entity A", "targetName": "Entity B", "relationshipType": "english_type (e.g. defendant, attorney, co-conspirator, employer, associate)", "evidenceType": "court_record|financial_record|witness_testimony|official_document", "description": "How relationship appears in document (in English)", "confidence": 0.0-1.0, "source_sentence": "EXACT verbatim sentence establishing this relationship — copy-paste, do NOT paraphrase", "source_page": page_number_or_null}],
  "summary": "2-3 sentence English summary of the document",
  "keyDates": [{"date": "YYYY-MM-DD or original format", "description": "What happened"}],
  "confidence": 0.0-1.0
}

CRITICAL — source_sentence rules:
- MUST be a VERBATIM copy from the document text above. Do NOT rephrase, summarize, or create new sentences.
- If you cannot find an exact sentence, set source_sentence to "" and lower confidence to 0.3 or below.
- source_page: set to the page number if pages are marked in the document, otherwise null.`;
}

function buildPass2Prompt(documentText: string, _pass1Result: PassResult): string {
  // Pass 2 is now an INDEPENDENT extraction — it does NOT see Pass 1 results.
  // This ensures true consensus: entities found by both Pass 1 and Pass 2 independently = strong signal.
  return `You are a meticulous investigative analyst performing an INDEPENDENT review of this document. Extract ALL entities and relationships you can find.

DOCUMENT CONTENT:
${documentText}

YOUR TASK — THOROUGH INDEPENDENT EXTRACTION:

1. ENTITIES — Find EVERY named entity in this document (scan top to bottom, miss NOTHING):
   - ALL persons by full name: defendants, judges, prosecutors, attorneys, agents, witnesses, co-conspirators, clerks. Check signature blocks, headers, captions, footnotes.
   - ALL organizations by name: banks (e.g., "JP Morgan", "Deutsche Bank"), law firms, companies, NGOs
   - ALL specific locations: addresses (e.g., "East 71st Street"), cities, states, countries, properties, airports
   - ALL financial amounts: dollar values, property values, bail amounts, net worth figures
   - For each entity, provide the EXACT sentence from the document where it appears
   - Do NOT extract generic institutional terms. BLOCKED: "United States", "USA", "Government", "Court", "State", "People", "Plaintiff", "Defendant", "Prosecution", "Defense", "DOJ", "FBI", "SDNY"
   - But DO extract specific named organizations like "Deutsche Bank" or "JP Morgan Chase"

2. RELATIONSHIPS — Find ALL connections between entities:
   - Legal: defendant-judge, attorney-client, prosecutor-defendant, co-defendant
   - Financial: payments, transfers, ownership, bail
   - Social: employer-employee, family, associate, travel companion
   - Criminal: co-conspirator, accomplice, recruiter, trafficker, victim-perpetrator
   - EVERY relationship MUST cite a specific passage from the document

3. KEY DATES — Extract all dates mentioned with their context

LANGUAGE: ALL output MUST be in English. No Turkish, no other languages.

OUTPUT JSON:
{
  "entities": [{"name": "Full Name", "type": "person|organization|location|date|money", "role": "Role (English)", "importance": "critical|high|medium|low", "category": "subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only", "confidence": 0.0-1.0, "mention_count": number, "context": "Direct quote from document", "source_sentence": "EXACT verbatim sentence from document — copy-paste, do NOT paraphrase", "source_page": page_number_or_null}],
  "relationships": [{"sourceName": "Entity A", "targetName": "Entity B", "relationshipType": "english_type", "evidenceType": "court_record|financial_record|witness_testimony|official_document", "description": "How relationship appears in document (English)", "confidence": 0.0-1.0, "source_sentence": "EXACT verbatim sentence establishing this relationship — copy-paste", "source_page": page_number_or_null}],
  "summary": "2-3 sentence English summary of the document",
  "keyDates": [{"date": "YYYY-MM-DD or original format", "description": "What happened"}],
  "confidence": 0.0-1.0
}

CRITICAL — source_sentence: MUST be verbatim from the document. If not found, set source_sentence to "" and confidence below 0.3.`;
}

function buildPass3Prompt(documentText: string, pass1Result: PassResult, nodeList: string, pass2Result?: PassResult): string {
  // Combine Pass 1 + Pass 2 entity names for deduplication
  const pass1Names = pass1Result.entities.map(e => e.name);
  const pass2Names = (pass2Result?.entities || []).map(e => e.name);
  const allFoundNames = [...new Set([...pass1Names, ...pass2Names])];
  const alreadyFound = allFoundNames.join(', ');

  return `You are a thorough investigative researcher doing a FINAL PASS. The following entities were already found. Your job is to find ADDITIONAL entities that were MISSED and to find ALL relationships.

DOCUMENT CONTENT:
${documentText}

ALREADY FOUND (do NOT repeat these):
${alreadyFound}

CURRENT NETWORK PEOPLE:
${nodeList}

YOUR TASK:

ENTITIES:
- Look for entities that the first pass might have missed
- Check for: abbreviated names, nicknames, indirect references, organizations mentioned in passing
- Look for locations, financial amounts, and dates that were skipped
- Do NOT repeat any entity already found
- Do NOT add generic terms. BLOCKED: "United States", "USA", "Government", "Court", "State", "People", "Plaintiff", "Defendant", "Prosecution", "Defense", "DOJ", "FBI", "SDNY"
- Every new entity MUST have a direct document quote as proof
- If you find nothing new, return empty arrays — that is acceptable

RELATIONSHIPS (CRITICAL — this is where most value is):
- Find ALL connections between entities mentioned in the document (both already-found AND new)
- Types to look for (USE ENGLISH TERMS ONLY):
  * Legal: defendant, prosecutor, judge, attorney, witness, co-defendant, complainant
  * Financial: financier, employer, beneficiary, investor, payer, recipient
  * Social: associate, employer, employee, family_member, friend, travel_companion
  * Criminal: co-conspirator, accomplice, recruiter, trafficker, victim, abuser
- EVERY relationship MUST cite a specific passage from the document
- Relationships between already-found entities ARE valid and should be included
- Do NOT invent connections — only report what the document explicitly states

LANGUAGE: ALL output MUST be in English. Relationship types, descriptions, roles — everything English.

OUTPUT JSON (only NEW entities not in the already-found list):
{
  "entities": [{"name": "Full Name", "type": "person|organization|location|date|money", "role": "Role (English)", "importance": "critical|high|medium|low", "category": "subject|victim|witness|legal_professional|law_enforcement|financial|administrative|mentioned_only", "confidence": 0.0-1.0, "mention_count": number, "context": "Direct quote", "source_sentence": "EXACT verbatim sentence from document — copy-paste, do NOT paraphrase", "source_page": page_number_or_null}],
  "relationships": [{"sourceName": "Entity A", "targetName": "Entity B", "relationshipType": "english_type", "evidenceType": "court_record|financial_record|witness_testimony|official_document", "description": "Exact passage (English)", "confidence": 0.0-1.0, "source_sentence": "EXACT verbatim sentence establishing this relationship — copy-paste", "source_page": page_number_or_null}],
  "summary": "",
  "keyDates": [{"date": "YYYY-MM-DD", "description": "event"}],
  "confidence": 0.0-1.0
}

CRITICAL — source_sentence: MUST be verbatim from the document. If not found, set source_sentence to "" and confidence below 0.3.`;
}

// ═══════════════════════════════════════════
// GROQ EXECUTION
// ═══════════════════════════════════════════

async function executePass(
  groq: Groq,
  prompt: string,
  passName: string,
): Promise<PassResult> {
  const start = Date.now();

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = completion.choices?.[0]?.message?.content || '';
  const usage = completion.usage;

  let parsed: PassResult = {
    entities: [],
    relationships: [],
    summary: '',
    keyDates: [],
    confidence: 0,
  };

  if (responseText) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const raw = JSON.parse(jsonMatch[0]);
        parsed = {
          entities: raw.entities || [],
          relationships: raw.relationships || [],
          summary: raw.summary || '',
          keyDates: raw.keyDates || [],
          confidence: raw.confidence || 0,
        };
      } catch (e) {
        console.warn(`[${passName}] JSON parse failed`);
      }
    }
  }

  parsed.raw_response = responseText;
  parsed.token_usage = usage ? {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
  } : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return parsed;
}

// ═══════════════════════════════════════════
// CONSENSUS ENGINE
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// NOISE FILTERING — Entities that are NEVER useful
// ═══════════════════════════════════════════

const BLOCKED_ENTITIES = new Set([
  'united states', 'united states of america', 'usa', 'us', 'u.s.',
  'government', 'u.s. government', 'federal government', 'the government',
  'court', 'the court', 'district court', 'appeals court', 'supreme court',
  'united states district court', 'us district court', 'u.s. district court',
  'state', 'the state', 'people', 'the people',
  'plaintiff', 'defendant', 'prosecution', 'defense',
  'department of justice', 'doj', 'u.s. department of justice', 'us department of justice',
  'federal bureau of investigation', 'fbi',
  'southern district of new york', 'sdny',
  'northern district', 'eastern district', 'western district',
  'northern district of illinois', 'eastern district of new york', 'western district of texas',
  'grand jury', 'jury', 'probation office',
  'unknown', 'n/a', 'none', 'other',
  // Block vehicles and generic objects that aren't real entities
  'chevrolet suburbans', 'chevrolet suburban',
]);

function isBlockedEntity(name: string): boolean {
  const norm = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (BLOCKED_ENTITIES.has(norm)) return true;
  // Also block very short names (likely abbreviations or noise)
  if (norm.length <= 2) return true;
  // Block pure numbers
  if (/^\d+$/.test(norm)) return true;
  return false;
}

// ═══════════════════════════════════════════
// TURKISH LANGUAGE LEAK DETECTION
// ═══════════════════════════════════════════

const TURKISH_PATTERNS = /[\u011E\u011F\u0130\u0131\u015E\u015F\u00D6\u00F6\u00DC\u00FC\u00C7\u00E7]|Sanık|Yargıç|Savcı|Avukat|Tanık|Mağdur|Suç ortaklığı|ilişkisi|bağlantı|arasında/i;

function hasTurkishContent(text: string): boolean {
  return TURKISH_PATTERNS.test(text);
}

function sanitizeRelationship(rel: ExtractedRelationship): ExtractedRelationship {
  // If relationship type or description contains Turkish, clean it
  if (hasTurkishContent(rel.relationshipType)) {
    // Map common Turkish types to English
    const turkishToEnglish: Record<string, string> = {
      'sanık-yargıç': 'defendant-judge',
      'sanık': 'defendant',
      'yargıç': 'judge',
      'savcı': 'prosecutor',
      'avukat': 'attorney',
      'tanık': 'witness',
      'mağdur': 'victim',
      'suç ortaklığı': 'co-conspirator',
      'suç ortağı': 'co-conspirator',
    };
    const lower = rel.relationshipType.toLowerCase();
    for (const [tr, en] of Object.entries(turkishToEnglish)) {
      if (lower.includes(tr)) {
        rel.relationshipType = en;
        break;
      }
    }
    // If still Turkish, generic fallback
    if (hasTurkishContent(rel.relationshipType)) {
      rel.relationshipType = 'associated';
    }
  }
  return rel;
}

function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function entitiesMatch(a: string, b: string): boolean {
  const na = normalizeEntityName(a);
  const nb = normalizeEntityName(b);
  if (na === nb) return true;
  // Check if one contains the other (e.g., "Ghislaine Maxwell" vs "Maxwell")
  if (na.length > 3 && nb.length > 3) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  return false;
}

export function buildConsensus(
  pass1: PassResult,
  pass2: PassResult,
  pass3: PassResult,
): ConsensusResult {
  // Track which entities appear in which passes
  const entityMap = new Map<string, {
    entity: ExtractedEntity;
    passes: number[];
    bestConfidence: number;
    bestContext: string;
    bestSourceSentence: string;
    bestSourcePage: number | undefined;
  }>();

  // Helper: pick the best (longest non-empty) source sentence
  function pickBestSource(
    current: string,
    currentPage: number | undefined,
    incoming: string | undefined,
    incomingPage: number | undefined,
  ): { sentence: string; page: number | undefined } {
    const cur = (current || '').trim();
    const inc = (incoming || '').trim();
    // Prefer the longer non-empty one (more context = better for spotlight)
    if (!cur && inc) return { sentence: inc, page: incomingPage };
    if (cur && !inc) return { sentence: cur, page: currentPage };
    if (inc.length > cur.length) return { sentence: inc, page: incomingPage };
    return { sentence: cur, page: currentPage };
  }

  // Pass 1 entities (with noise filtering)
  for (const e of pass1.entities) {
    if (isBlockedEntity(e.name)) continue; // NOISE FILTER
    const key = normalizeEntityName(e.name);
    entityMap.set(key, {
      entity: e,
      passes: [1],
      bestConfidence: e.confidence,
      bestContext: e.context,
      bestSourceSentence: e.source_sentence || '',
      bestSourcePage: e.source_page,
    });
  }

  // Pass 2 entities (verification — with noise filtering)
  for (const e of pass2.entities) {
    if (isBlockedEntity(e.name)) continue; // NOISE FILTER
    const key = normalizeEntityName(e.name);
    const existing = [...entityMap.entries()].find(([k]) => entitiesMatch(k, key));

    if (existing) {
      existing[1].passes.push(2);
      if (e.confidence > existing[1].bestConfidence) {
        existing[1].bestConfidence = e.confidence;
      }
      if (e.context && e.context.length > existing[1].bestContext.length) {
        existing[1].bestContext = e.context;
      }
      // Track best source sentence across passes
      const best = pickBestSource(
        existing[1].bestSourceSentence, existing[1].bestSourcePage,
        e.source_sentence, e.source_page,
      );
      existing[1].bestSourceSentence = best.sentence;
      existing[1].bestSourcePage = best.page;
    } else {
      // Pass 2 found something Pass 1 didn't (rare but possible)
      entityMap.set(key, {
        entity: e,
        passes: [2],
        bestConfidence: e.confidence,
        bestContext: e.context,
        bestSourceSentence: e.source_sentence || '',
        bestSourcePage: e.source_page,
      });
    }
  }

  // Pass 3 entities (aggressive — new finds, with noise filtering)
  for (const e of pass3.entities) {
    if (isBlockedEntity(e.name)) continue; // NOISE FILTER
    const key = normalizeEntityName(e.name);
    const existing = [...entityMap.entries()].find(([k]) => entitiesMatch(k, key));

    if (existing) {
      existing[1].passes.push(3);
      if (e.confidence > existing[1].bestConfidence) {
        existing[1].bestConfidence = e.confidence;
      }
      // Track best source sentence across passes
      const best = pickBestSource(
        existing[1].bestSourceSentence, existing[1].bestSourcePage,
        e.source_sentence, e.source_page,
      );
      existing[1].bestSourceSentence = best.sentence;
      existing[1].bestSourcePage = best.page;
    } else {
      entityMap.set(key, {
        entity: e,
        passes: [3],
        bestConfidence: e.confidence,
        bestContext: e.context || '',
        bestSourceSentence: e.source_sentence || '',
        bestSourcePage: e.source_page,
      });
    }
  }

  // Apply consensus rules
  const accepted: ConsensusResult['entities'] = [];
  const rejected: ConsensusResult['rejected_entities'] = [];

  let consensus_3_3 = 0;
  let consensus_2_3 = 0;
  let consensus_1_3 = 0;

  for (const [, data] of entityMap) {
    const uniquePasses = [...new Set(data.passes)];
    const passCount = uniquePasses.length;

    if (passCount >= 3) {
      // 3/3 — High confidence
      consensus_3_3++;
      accepted.push({
        ...data.entity,
        confidence: Math.min(1.0, data.bestConfidence + 0.15), // Consensus boost
        context: data.bestContext,
        source_sentence: data.bestSourceSentence,
        source_page: data.bestSourcePage,
        consensus: '3/3',
        passes: uniquePasses,
      });
    } else if (passCount >= 2) {
      // 2/3 — Accept with normal confidence
      consensus_2_3++;
      accepted.push({
        ...data.entity,
        confidence: data.bestConfidence,
        context: data.bestContext,
        source_sentence: data.bestSourceSentence,
        source_page: data.bestSourcePage,
        consensus: '2/3',
        passes: uniquePasses,
      });
    } else {
      // 1/3 — Only found in one pass. Mark for document text validation rescue.
      // Instead of auto-rejecting, these will be validated against the actual document text
      // in the validateConsensusEntities step. For now, accept with low confidence.
      consensus_1_3++;
      accepted.push({
        ...data.entity,
        confidence: Math.min(data.bestConfidence, 0.45), // Cap at 0.45 — needs validation
        context: data.bestContext,
        source_sentence: data.bestSourceSentence,
        source_page: data.bestSourcePage,
        consensus: '2/3' as const, // Will be downgraded if validation fails
        passes: uniquePasses,
        _needs_validation: true, // Internal flag for validation step
      } as typeof accepted[0]);
    }
  }

  // Merge relationships (simpler: accept if both endpoints are in accepted entities)
  const acceptedNames = new Set(accepted.map(e => normalizeEntityName(e.name)));
  const allRelationships = [
    ...pass1.relationships,
    ...pass2.relationships,
    ...pass3.relationships,
  ];

  const relMap = new Map<string, ExtractedRelationship & { passes: number[] }>();
  const allRels = [
    { rels: pass1.relationships, pass: 1 },
    { rels: pass2.relationships, pass: 2 },
    { rels: pass3.relationships, pass: 3 },
  ];

  for (const { rels, pass } of allRels) {
    for (let rel of rels) {
      // Skip relationships involving blocked entities
      if (isBlockedEntity(rel.sourceName) || isBlockedEntity(rel.targetName)) continue;
      // Sanitize Turkish language leaks
      rel = sanitizeRelationship(rel);

      const key = `${normalizeEntityName(rel.sourceName)}→${normalizeEntityName(rel.targetName)}`;
      const existing = relMap.get(key);
      if (existing) {
        existing.passes.push(pass);
        if (rel.confidence > existing.confidence) {
          existing.confidence = rel.confidence;
        }
        // Pick best source_sentence for relationship too
        if (rel.source_sentence && rel.source_sentence.length > (existing.source_sentence || '').length) {
          existing.source_sentence = rel.source_sentence;
          existing.source_page = rel.source_page;
        }
      } else {
        relMap.set(key, { ...rel, passes: [pass] });
      }
    }
  }

  const acceptedRels = [...relMap.values()]
    .filter(r => {
      // Both endpoints must be accepted entities
      const sourceOk = [...acceptedNames].some(n =>
        entitiesMatch(n, normalizeEntityName(r.sourceName)));
      const targetOk = [...acceptedNames].some(n =>
        entitiesMatch(n, normalizeEntityName(r.targetName)));
      // Relationship needs at least 1 pass match with accepted endpoints
      // (relationships are harder to consensus — even 1 pass with evidence is valuable)
      return sourceOk && targetOk;
    })
    .map(r => ({
      ...r,
      consensus: (r.passes.length >= 3 ? '3/3' : r.passes.length >= 2 ? '2/3' : '1/3') as '3/3' | '2/3' | '1/3',
    }));

  // Best summary (prefer pass 1, longest)
  const summaries = [pass1.summary, pass2.summary, pass3.summary].filter(s => s && s.length > 10);
  const bestSummary = summaries.sort((a, b) => b.length - a.length)[0] || '';

  // Merge dates (deduplicate)
  const allDates = [...pass1.keyDates, ...pass2.keyDates, ...pass3.keyDates];
  const uniqueDates = allDates.filter((d, i, arr) =>
    arr.findIndex(x => x.date === d.date && x.description === d.description) === i
  );

  return {
    entities: accepted,
    relationships: acceptedRels,
    summary: bestSummary,
    keyDates: uniqueDates,
    rejected_entities: rejected,
    stats: {
      pass1_entities: pass1.entities.length,
      pass2_verified: pass2.entities.length,
      pass3_additions: pass3.entities.filter(e => {
        const key = normalizeEntityName(e.name);
        return !pass1.entities.some(p => entitiesMatch(normalizeEntityName(p.name), key));
      }).length,
      consensus_3_3,
      consensus_2_3,
      consensus_1_3_rejected: consensus_1_3,
      total_accepted: accepted.length,
    },
  };
}

// ═══════════════════════════════════════════
// SOURCE SENTENCE VALIDATION
// Verify that AI-claimed source sentences actually exist in the document
// Truth Constitution #8: "Yanlış veri, eksik veriden her zaman daha tehlikelidir"
// ═══════════════════════════════════════════

/**
 * Normalize text for fuzzy matching:
 * - lowercase, collapse whitespace, strip punctuation differences
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // smart quotes → simple
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s']/g, '') // keep alphanumeric + spaces + apostrophes
    .trim();
}

/**
 * Check if a source sentence (or close variant) exists in the document text.
 * Returns a score 0.0-1.0:
 *   1.0 = exact match found
 *   0.7-0.99 = close match (substring overlap)
 *   0.3-0.69 = entity name found but not the full sentence
 *   0.0 = nothing found
 */
export function validateSourceSentence(
  sourceSentence: string,
  entityName: string,
  documentText: string,
): { score: number; matchType: 'exact' | 'fuzzy' | 'name_only' | 'not_found'; matchedText?: string } {
  if (!sourceSentence || sourceSentence.trim().length < 10) {
    // No source sentence provided — check if entity name at least appears
    const normDoc = normalizeForMatch(documentText);
    const normName = normalizeForMatch(entityName);
    if (normName.length > 2 && normDoc.includes(normName)) {
      return { score: 0.4, matchType: 'name_only' };
    }
    return { score: 0.0, matchType: 'not_found' };
  }

  const normDoc = normalizeForMatch(documentText);
  const normSentence = normalizeForMatch(sourceSentence);

  // 1. Exact match (after normalization)
  if (normDoc.includes(normSentence)) {
    return { score: 1.0, matchType: 'exact', matchedText: sourceSentence };
  }

  // 2. Fuzzy match — multi-strategy

  // Strategy 2a: Character-level substring (first 40 chars of normalized sentence)
  if (normSentence.length >= 20) {
    const charWindow = normSentence.substring(0, 40);
    if (normDoc.includes(charWindow)) {
      return { score: 0.9, matchType: 'fuzzy', matchedText: sourceSentence };
    }
  }

  // Strategy 2b: 3-word sliding windows (keep ALL words for phrase accuracy)
  const words = normSentence.split(' ').filter(w => w.length >= 1);
  if (words.length < 3) {
    const normName = normalizeForMatch(entityName);
    if (normName.length > 2 && normDoc.includes(normName)) {
      return { score: 0.5, matchType: 'name_only' };
    }
    return { score: 0.0, matchType: 'not_found' };
  }

  const windowSize = Math.min(3, words.length);
  let matchedWindows = 0;
  const totalWindows = words.length - windowSize + 1;

  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize).join(' ');
    if (normDoc.includes(window)) {
      matchedWindows++;
    }
  }

  const windowRatio = totalWindows > 0 ? matchedWindows / totalWindows : 0;

  if (windowRatio >= 0.6) {
    return { score: 0.85, matchType: 'fuzzy', matchedText: sourceSentence };
  }

  if (windowRatio >= 0.3) {
    return { score: 0.6, matchType: 'fuzzy', matchedText: sourceSentence };
  }

  // 3. Fallback — check if entity name appears at all
  const normName = normalizeForMatch(entityName);
  if (normName.length > 2 && normDoc.includes(normName)) {
    return { score: 0.4, matchType: 'name_only' };
  }

  return { score: 0.0, matchType: 'not_found' };
}

/**
 * Validate all entities in a consensus result against the document text.
 * Returns entities with validation metadata attached.
 */
export function validateConsensusEntities(
  consensus: ConsensusResult,
  documentText: string,
): ConsensusResult {
  const validatedEntities = consensus.entities.map(entity => {
    const validation = validateSourceSentence(
      entity.source_sentence,
      entity.name,
      documentText,
    );

    // Attach validation result to entity
    return {
      ...entity,
      source_validation: validation,
      // Penalize entities not found in document
      confidence: validation.score >= 0.6
        ? entity.confidence  // OK — keep original confidence
        : validation.score >= 0.3
          ? Math.min(entity.confidence, 0.45) // Name found but no sentence — cap at 0.45
          : Math.min(entity.confidence, 0.20), // NOT FOUND — severe penalty
    };
  });

  // Separate: entities NOT found in document at all → move to rejected
  // For 1/3 entities (_needs_validation), require higher validation score (0.4+)
  // For 2/3+ entities, keep the existing 0.3 threshold
  const stillAccepted = validatedEntities.filter(e => {
    const score = e.source_validation?.score ?? 0;
    const needsValidation = (e as Record<string, unknown>)._needs_validation === true;
    if (needsValidation) {
      // 1/3 entity rescued by document validation — needs name found in doc (0.4+)
      return score >= 0.4;
    }
    return score >= 0.3;
  });
  const newlyRejected = validatedEntities
    .filter(e => {
      const score = e.source_validation?.score ?? 0;
      const needsValidation = (e as Record<string, unknown>)._needs_validation === true;
      if (needsValidation) return score < 0.4;
      return score < 0.3;
    })
    .map(e => ({
      ...e,
      reason: (e as Record<string, unknown>)._needs_validation
        ? `Entity "${e.name}" found in only 1 pass and not verified in document text (score: ${(e.source_validation?.score ?? 0).toFixed(2)})`
        : `Entity "${e.name}" not found in document text (validation score: ${(e.source_validation?.score ?? 0).toFixed(2)})`,
    }));

  return {
    ...consensus,
    entities: stillAccepted,
    rejected_entities: [
      ...consensus.rejected_entities,
      ...newlyRejected,
    ],
    stats: {
      ...consensus.stats,
      total_accepted: stillAccepted.length,
      consensus_1_3_rejected: consensus.stats.consensus_1_3_rejected + newlyRejected.length,
    },
  };
}

// ═══════════════════════════════════════════
// 8-SIGNAL CONFIDENCE SCORING
// ═══════════════════════════════════════════

const SIGNAL_WEIGHTS = {
  s1_document_type: 0.15,
  s2_source_hierarchy: 0.15,
  s3_consensus: 0.20,
  s4_cross_reference: 0.15,
  s5_entity_resolution: 0.10,
  s6_community: 0.10,
  s7_historical: 0.10,
  s8_network_consistency: 0.05,
};

const DOCUMENT_TYPE_SCORES: Record<string, number> = {
  court_record: 0.95,
  official_document: 0.90,
  deposition: 0.85,
  financial: 0.80,
  foia: 0.75,
  leaked: 0.60,
  other: 0.50,
};

const SOURCE_HIERARCHY_SCORES: Record<string, number> = {
  courtlistener: 1.0,
  icij: 0.90,
  opensanctions: 0.85,
  manual: 0.60,
  anonymous: 0.40,
};

export function calculate8SignalConfidence(
  documentType: string,
  sourceProvider: string,
  consensusStats: ConsensusResult['stats'],
  crossRefCount: number,
  entityResolutionScore: number,
  communityApprovalRate: number,
  promptAccuracy: number,
  networkConsistencyScore: number,
): { signals: ConfidenceSignals; composite: number; route: string } {

  const signals: ConfidenceSignals = {
    s1_document_type: DOCUMENT_TYPE_SCORES[documentType] || 0.50,
    s2_source_hierarchy: SOURCE_HIERARCHY_SCORES[sourceProvider] || 0.50,
    s3_consensus: consensusStats.total_accepted > 0
      ? (consensusStats.consensus_3_3 * 1.0 + consensusStats.consensus_2_3 * 0.7) / consensusStats.total_accepted
      : 0,
    s4_cross_reference: Math.min(1.0, crossRefCount * 0.25), // 4+ refs = 1.0
    s5_entity_resolution: entityResolutionScore,
    s6_community: communityApprovalRate, // Starts at 0, grows with users
    s7_historical: promptAccuracy, // Starts at 0.5 (unknown), calibrates over time
    s8_network_consistency: networkConsistencyScore,
  };

  // For signals that are "not yet available" (community, historical), redistribute weight
  const activeSignals = Object.entries(signals).filter(([key, val]) => {
    if (key === 's6_community' && val === 0) return false;
    if (key === 's7_historical' && val === 0) return false;
    return true;
  });

  const totalActiveWeight = activeSignals.reduce(
    (sum, [key]) => sum + (SIGNAL_WEIGHTS as Record<string, number>)[key], 0
  );

  // Normalize weights so they sum to 1.0
  let composite = 0;
  for (const [key, val] of activeSignals) {
    const weight = (SIGNAL_WEIGHTS as Record<string, number>)[key];
    const normalizedWeight = weight / totalActiveWeight;
    composite += val * normalizedWeight;
  }

  composite = Math.round(composite * 1000) / 1000; // 3 decimal places

  // Route based on composite score
  let route: string;
  if (composite >= 0.90) route = 'auto_accept';
  else if (composite >= 0.70) route = 'review_1';
  else if (composite >= 0.50) route = 'review_2';
  else route = 'review_3';

  return { signals, composite, route };
}

// ═══════════════════════════════════════════
// MAIN: Run 3-Pass Scan
// ═══════════════════════════════════════════

export async function runThreePassScan(
  groqClient: Groq,
  documentText: string,
  nodeList: string,
  hasRealContent: boolean,
  documentType: string,
  sourceProvider: string,
  promptVersion: string,
  caseContext?: string,
): Promise<ScanJobResult> {
  const startTime = Date.now();

  // ── PASS 1: Conservative (with case validation) ──
  const prompt1 = buildPass1Prompt(documentText, nodeList, hasRealContent, caseContext);
  const pass1 = await executePass(groqClient, prompt1, 'Pass1-Conservative');

  // Small delay to respect rate limits
  await new Promise(r => setTimeout(r, 1500));

  // ── PASS 2: Independent Extraction (does NOT see Pass 1 results) ──
  const prompt2 = buildPass2Prompt(documentText, pass1); // pass1 param kept for signature compat, not used in prompt
  const pass2 = await executePass(groqClient, prompt2, 'Pass2-Independent');

  await new Promise(r => setTimeout(r, 1500));

  // ── PASS 3: Aggressive (receives combined Pass 1 + Pass 2 results) ──
  const prompt3 = buildPass3Prompt(documentText, pass1, nodeList, pass2);
  const pass3 = await executePass(groqClient, prompt3, 'Pass3-Aggressive');

  // ── BUILD CONSENSUS ──
  let consensus = buildConsensus(pass1, pass2, pass3);

  // ── VALIDATE against document text (rescues 1/3 entities, rejects hallucinations) ──
  consensus = validateConsensusEntities(consensus, documentText);

  // ── 8-SIGNAL CONFIDENCE ──
  // Calculate document-level confidence (used for quarantine routing)
  // S3 (consensus) now varies based on actual consensus ratios
  const { signals, composite, route } = calculate8SignalConfidence(
    documentType,
    sourceProvider,
    consensus.stats,
    0,    // crossRefCount — will be calculated per-entity in quarantine
    0.5,  // entityResolution — placeholder until actual matching
    0,    // community — no users yet
    0.5,  // historical — unknown for v1.0
    // Network consistency: ratio of entities that match existing network
    nodeList.trim().length > 0
      ? Math.min(1.0, consensus.entities.filter(e => nodeList.toLowerCase().includes(e.name.toLowerCase())).length / Math.max(1, consensus.entities.length))
      : 0.5,
  );

  // Per-entity confidence adjustment: entities with higher consensus get higher scores
  for (const entity of consensus.entities) {
    const consensusBonus = entity.consensus === '3/3' ? 0.10 : 0;
    const mentionBonus = Math.min(0.10, (entity.mention_count || 1) * 0.02);
    const categoryBonus = entity.category === 'subject' ? 0.05
      : entity.category === 'victim' ? 0.03
      : entity.category === 'mentioned_only' ? -0.05
      : 0;

    // Recalculate entity confidence as composite of document score + entity-specific signals
    entity.confidence = Math.min(1.0, Math.max(0.1,
      composite * 0.6  // 60% from document-level score
      + entity.confidence * 0.2  // 20% from AI-reported (discounted)
      + consensusBonus  // bonus for 3/3 consensus
      + mentionBonus    // bonus for multiple mentions
      + categoryBonus   // bonus/penalty for category
    ));
    entity.confidence = Math.round(entity.confidence * 1000) / 1000;
  }

  const tokenTotal = (pass1.token_usage?.total_tokens || 0)
    + (pass2.token_usage?.total_tokens || 0)
    + (pass3.token_usage?.total_tokens || 0);

  return {
    consensus,
    passes: [pass1, pass2, pass3],
    confidence_signals: signals,
    confidence_composite: composite,
    confidence_route: route,
    token_total: tokenTotal,
    duration_ms: Date.now() - startTime,
    prompt_version: promptVersion,
  };
}
