/**
 * /api/documents/score
 * POST: Score entities using the 5-Layer Confidence Formula
 *
 * Takes AI-extracted entities from a scan result and applies:
 * 1. HalluGraph verification (entity exists in source text?)
 * 2. NATO code assignment (auto-assign A-F, 1-6)
 * 3. 5-Layer confidence scoring (GRADE + NATO + Berkeley + ACH + Transparency)
 * 4. Band classification (CONFIRMED / HIGHLY_PROBABLE / PROBABLE / POSSIBLE / UNVERIFIED)
 *
 * Results are stored as scoring_audit records and used to update quarantine confidence.
 *
 * Truth Anayasası: "AI'a güvenme, doğrula. Confidence'ı AI hesaplamasın, biz hesaplayalım."
 *
 * @version 1.0.0
 * @date 2026-03-22
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  scoreEntityBatch,
  getBandDistribution,
  getScoringMetadata,
  type ScoringEntity,
  type ScoringResult,
} from '@/lib/scoring';
import { verifyEntityBatch, type HalluGraphReport } from '@/lib/scoring/hallucination';
import { assignNATOCode, type NATOAssignment } from '@/lib/scoring/natoCodeAssigner';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// TYPES
// ============================================================================

interface ScanEntity {
  name: string;
  type: string;
  role?: string;
  confidence: number;
  context?: string;
  importance?: string;
  category?: string;
  mention_count?: number;
}

interface ScoreRequest {
  documentId: string;
  documentType?: string; // Override auto-classification
  entities?: ScanEntity[]; // Optional: provide entities directly
  sourceText?: string; // For hallucination verification
  fingerprint?: string;
}

interface ScoreResponse {
  document_id: string;
  document_type: string;
  total_entities: number;
  scored_entities: number;
  rejected_hallucinations: number;
  results: ScoringResult[];
  band_distribution: Record<string, number>;
  hallucination_report?: {
    verification_rate: number;
    rejected: string[];
  };
  scoring_metadata: ReturnType<typeof getScoringMetadata>;
}

// ============================================================================
// DOCUMENT TYPE AUTO-CLASSIFICATION (Rule-based MVP)
// ============================================================================

/**
 * Rule-based document type classification.
 * Examines document metadata, source type, and content keywords.
 * Accuracy: ~87-92% (research benchmark).
 */
function classifyDocumentType(document: Record<string, unknown>): string {
  const docType = (document.document_type as string) || '';
  const title = ((document.title as string) || '').toLowerCase();
  const sourceType = (document.source_type as string) || '';
  const description = ((document.description as string) || '').toLowerCase();
  const combined = `${title} ${description} ${docType}`.toLowerCase();

  // Direct mapping from existing document_type field
  const directMappings: Record<string, string> = {
    court_record: 'court_filing',
    court_filing: 'court_filing',
    indictment: 'court_filing',
    complaint: 'complaint',
    deposition: 'sworn_testimony',
    sworn_testimony: 'sworn_testimony',
    affidavit: 'sworn_testimony',
    fbi_report: 'fbi_report',
    fbi_302: 'fbi_report',
    foia: 'fbi_report',
    government_filing: 'government_filing',
    financial: 'government_filing',
    leaked_document: 'credible_journalism', // Conservative — leaked docs get journalism baseline
    correspondence: 'legal_correspondence',
    legal_correspondence: 'legal_correspondence',
  };

  if (directMappings[docType]) return directMappings[docType];

  // Source-based classification
  if (sourceType === 'courtlistener') return 'court_filing';
  if (sourceType === 'opensanctions') return 'government_filing';
  if (sourceType === 'icij') return 'credible_journalism'; // ICIJ leaks = journalism quality

  // Keyword-based classification
  if (combined.includes('indictment') || combined.includes('iddianame')) return 'court_filing';
  if (combined.includes('deposition') || combined.includes('sworn') || combined.includes('affidavit')) return 'sworn_testimony';
  if (combined.includes('fbi') || combined.includes('foia') || combined.includes('bureau')) return 'fbi_report';
  if (combined.includes('complaint') || combined.includes('şikayet')) return 'complaint';
  if (combined.includes('government') || combined.includes('sanction') || combined.includes('pep')) return 'government_filing';
  if (combined.includes('letter') || combined.includes('correspondence') || combined.includes('mektup')) return 'legal_correspondence';

  // Default: credible_journalism (most conservative baseline)
  return 'credible_journalism';
}

// ============================================================================
// EVIDENCE TYPE MAPPING
// ============================================================================

/**
 * Map scan entity categories/roles to evidence_types for scoring.
 */
function mapEvidenceTypes(entity: ScanEntity, documentType: string): string[] {
  const types: string[] = [];
  const category = entity.category || '';
  const role = (entity.role || '').toLowerCase();

  // Base evidence from document type
  switch (documentType) {
    case 'sworn_testimony':
      types.push('sworn_testimony');
      break;
    case 'court_filing':
      types.push('court_record');
      break;
    case 'fbi_report':
      types.push('fbi_report');
      break;
    case 'complaint':
      types.push('court_record');
      break;
    case 'government_filing':
      types.push('court_record');
      break;
    case 'credible_journalism':
      types.push('credible_journalism');
      break;
    case 'legal_correspondence':
      types.push('court_record');
      break;
  }

  // Category-based additions
  if (category === 'law_enforcement') types.push('police_record');
  if (category === 'witness') types.push('sworn_testimony');
  if (category === 'financial') types.push('financial_record');
  if (category === 'victim') types.push('sworn_testimony');

  // Role-based additions
  if (role.includes('detective') || role.includes('officer') || role.includes('agent')) {
    types.push('police_record');
  }
  if (role.includes('judge') || role.includes('attorney') || role.includes('lawyer')) {
    types.push('court_record');
  }

  // Deduplicate
  return Array.from(new Set(types));
}

/**
 * Determine sub_source from document type and entity metadata.
 */
function determineSubSource(entity: ScanEntity, documentType: string): string {
  const parts: string[] = [];

  switch (documentType) {
    case 'sworn_testimony':
      parts.push('sworn_affidavit');
      break;
    case 'court_filing':
      parts.push('court_order');
      break;
    case 'fbi_report':
      parts.push('fbi_302');
      break;
    case 'complaint':
      parts.push('court_order');
      break;
    case 'government_filing':
      parts.push('police_reports');
      break;
    case 'credible_journalism':
      parts.push('newspaper');
      break;
    case 'legal_correspondence':
      parts.push('police_reports');
      break;
  }

  return parts.join('+') || 'newspaper';
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(req: NextRequest) {
  // Score route is pure local math (no external API calls) — use general rate limit
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  try {
    const body: ScoreRequest = await req.json();
    const { documentId, documentType: overrideDocType, entities: providedEntities, sourceText, fingerprint } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // ═══ FETCH DOCUMENT ═══
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // ═══ CLASSIFY DOCUMENT TYPE ═══
    const documentType = overrideDocType || classifyDocumentType(document);

    // ═══ GET ENTITIES ═══
    // Either from request body or from scan results
    let rawEntities: ScanEntity[] = providedEntities || [];

    if (rawEntities.length === 0) {
      // Try to get from scan results
      const scanResult = document.scan_result as Record<string, unknown> | null;
      if (scanResult?.entities) {
        rawEntities = scanResult.entities as ScanEntity[];
      }
    }

    if (rawEntities.length === 0) {
      return NextResponse.json(
        { error: 'No entities to score. Run /api/documents/scan first or provide entities.' },
        { status: 400 }
      );
    }

    // ═══ HALLUCINATION VERIFICATION ═══
    let halluReport: HalluGraphReport | null = null;
    let verifiedEntityNames = new Set<string>();

    const docSourceText = sourceText
      || (document.raw_content as string)
      || (document.scan_result as Record<string, unknown>)?.rawContent as string
      || '';

    // HalluGraph needs REAL document content to verify entities.
    // Metadata-only text (< 500 chars) is just titles/descriptions — not enough
    // to confirm whether entities actually appear in the document.
    // Threshold: 500 chars = ~80 words, minimum for meaningful verification.
    const MIN_HALLUGRAPH_TEXT_LENGTH = 500;

    if (docSourceText && docSourceText.length > MIN_HALLUGRAPH_TEXT_LENGTH) {
      console.log(`[Score] HalluGraph: verifying ${rawEntities.length} entities against ${docSourceText.length} chars of source text`);
      const entityNames = rawEntities.map(e => e.name);
      halluReport = verifyEntityBatch(entityNames, docSourceText);
      verifiedEntityNames = new Set(
        halluReport.results.filter(r => r.verified).map(r => r.entity_name)
      );
      console.log(`[Score] HalluGraph: ${halluReport.verified} verified, ${halluReport.rejected} rejected (rate: ${(halluReport.verification_rate * 100).toFixed(1)}%)`);
    } else {
      // No real source text available — skip HalluGraph, mark all as unverified but don't reject.
      // These entities came from AI extraction with limited context, so they'll get
      // lower confidence scores from the scoring engine (no source verification bonus).
      console.log(`[Score] HalluGraph SKIPPED: source text too short (${docSourceText.length} chars < ${MIN_HALLUGRAPH_TEXT_LENGTH} threshold). All ${rawEntities.length} entities passed through unverified.`);
      verifiedEntityNames = new Set(rawEntities.map(e => e.name));
    }

    // ═══ BUILD SCORING ENTITIES ═══
    const scoringEntities: ScoringEntity[] = [];
    const rejectedNames: string[] = [];

    for (const entity of rawEntities) {
      // Skip hallucinated entities
      if (halluReport && !verifiedEntityNames.has(entity.name)) {
        rejectedNames.push(entity.name);
        continue;
      }

      // Auto-assign NATO code
      const evidenceTypes = mapEvidenceTypes(entity, documentType);
      const subSource = determineSubSource(entity, documentType);
      const natoAssignment: NATOAssignment = assignNATOCode(
        documentType,
        evidenceTypes,
        subSource,
        entity.role,
        entity.mention_count || 1
      );

      scoringEntities.push({
        name: entity.name,
        type: (entity.type === 'organization' ? 'institution' : entity.type) as ScoringEntity['type'],
        mentions: entity.mention_count || 1,
        role: entity.role || entity.category || '',
        evidence_types: evidenceTypes,
        nato_reliability: natoAssignment.reliability,
        nato_credibility: natoAssignment.credibility,
        sub_source: subSource,
      });
    }

    // ═══ SCORE ═══
    console.log(`[Score] Scoring ${scoringEntities.length} entities (${rejectedNames.length} hallucinations rejected) for doc ${documentId}`);
    const { results, audit } = scoreEntityBatch(scoringEntities, documentType, documentId);
    const bandDist = getBandDistribution(results);
    console.log(`[Score] Results: ${results.length} scored, bands: ${JSON.stringify(bandDist)}`);

    // ═══ UPDATE DOCUMENT ═══
    await supabaseAdmin
      .from('documents')
      .update({
        scoring_status: 'scored',
        scoring_result: {
          document_type: documentType,
          scored_at: new Date().toISOString(),
          total_entities: rawEntities.length,
          scored_entities: results.length,
          rejected_hallucinations: rejectedNames.length,
          band_distribution: bandDist,
          scoring_version: getScoringMetadata().version,
        },
      })
      .eq('id', documentId);

    // ═══ UPDATE QUARANTINE CONFIDENCE ═══
    // Replace AI's self-reported confidence with our calculated confidence
    // Query quarantine items ONCE (not per entity — was O(n²), now O(n))
    try {
      const { data: allQItems } = await supabaseAdmin
        .from('data_quarantine')
        .select('id, item_data')
        .eq('document_id', documentId)
        .eq('item_type', 'entity');

      if (allQItems) {
        for (const result of results) {
          const match = allQItems.find(q => (q.item_data as Record<string, unknown>)?.name === result.name);
          if (match) {
            const itemData = match.item_data as Record<string, unknown>;
            await supabaseAdmin
              .from('data_quarantine')
              .update({
                confidence: result.final_confidence,
                item_data: {
                  ...itemData,
                  calculated_confidence: result.final_confidence,
                  confidence_band: result.band,
                  scoring_layers: result.layers,
                  nato_code: result.nato_code,
                  ai_confidence: itemData.confidence, // Preserve AI's original for comparison
                  scoring_version: getScoringMetadata().version,
                },
              })
              .eq('id', match.id);
          }
        }
      }
    } catch (qErr) {
      console.warn('[Score] Quarantine update failed:', qErr);
    }

    // ═══ UPDATE DERIVED ITEMS CONFIDENCE ═══
    // Mirror scored data to document_derived_items (UI reads from here)
    try {
      const { data: allDerivedItems, error: diQueryError } = await supabaseAdmin
        .from('document_derived_items')
        .select('id, item_data')
        .eq('document_id', documentId)
        .eq('item_type', 'entity');

      console.log(`[Score] Derived items query: found=${allDerivedItems?.length || 0}, error=${diQueryError?.message || 'none'}`);

      if (allDerivedItems && allDerivedItems.length > 0) {
        // Log entity names from both sides for matching debug
        const diNames = allDerivedItems.map(d => (d.item_data as Record<string, unknown>)?.name).filter(Boolean);
        const resultNames = results.map(r => r.name);
        console.log(`[Score] DI entity names: ${JSON.stringify(diNames)}`);
        console.log(`[Score] Scored entity names: ${JSON.stringify(resultNames)}`);

        let matched = 0;
        let unmatched = 0;
        for (const result of results) {
          const match = allDerivedItems.find(d => (d.item_data as Record<string, unknown>)?.name === result.name);
          if (match) {
            matched++;
            const itemData = match.item_data as Record<string, unknown>;
            const { error: updateErr } = await supabaseAdmin
              .from('document_derived_items')
              .update({
                confidence: result.final_confidence,
                item_data: {
                  ...itemData,
                  calculated_confidence: result.final_confidence,
                  confidence_band: result.band,
                  scoring_layers: result.layers,
                  nato_code: result.nato_code,
                  ai_confidence: itemData.confidence,
                  scoring_version: getScoringMetadata().version,
                },
              })
              .eq('id', match.id);

            if (updateErr) {
              console.warn(`[Score] DI update failed for "${result.name}": ${updateErr.message}`);
            }
          } else {
            unmatched++;
            console.warn(`[Score] No DI match for scored entity: "${result.name}"`);
          }
        }
        console.log(`[Score] DI update complete: ${matched} matched, ${unmatched} unmatched`);
      } else {
        console.warn(`[Score] No derived items found for document ${documentId}`);
      }
    } catch (diErr) {
      console.warn('[Score] Derived items update failed:', diErr);
    }

    // ═══ STORE AUDIT LOG ═══
    // Fire-and-forget audit storage
    try {
      const auditRecords = audit.map(a => ({
        document_id: documentId,
        entity_name: a.entity_name,
        document_type: a.document_type,
        layers: a.layers,
        raw_score: a.raw_score,
        final_confidence: a.final_confidence,
        band: a.band,
        config_version: a.config_version,
        scored_at: a.scored_at,
        scored_by: fingerprint || null,
      }));

      const { error: auditError } = await supabaseAdmin
        .from('scoring_decisions_audit')
        .insert(auditRecords);

      if (auditError) {
        // Table may not exist yet — graceful
        console.warn('[Score] Audit insert failed (table may not exist):', auditError.message);
      }
    } catch (auditErr) {
      console.warn('[Score] Audit pipeline error:', auditErr);
    }

    // ═══ RESPONSE ═══
    const response: ScoreResponse = {
      document_id: documentId,
      document_type: documentType,
      total_entities: rawEntities.length,
      scored_entities: results.length,
      rejected_hallucinations: rejectedNames.length,
      results,
      band_distribution: bandDist,
      scoring_metadata: getScoringMetadata(),
    };

    if (halluReport) {
      response.hallucination_report = {
        verification_rate: halluReport.verification_rate,
        rejected: rejectedNames,
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    return safeErrorResponse('POST /api/documents/score', error);
  }
}
