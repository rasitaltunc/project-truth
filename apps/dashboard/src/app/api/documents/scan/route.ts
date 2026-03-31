/**
 * /api/documents/scan
 * POST: TARA Protocol - AI scan a document for entities, relationships, dates
 *
 * Pipeline Architecture v1.0 — 3-Pass Consensus Engine + 8-Signal Confidence
 * Pass 1 (Conservative): Extract only explicitly stated entities
 * Pass 2 (Verification): Verify Pass 1 results against document
 * Pass 3 (Aggressive): Find anything Pass 1 missed
 * Consensus: 3/3 → high confidence, 2/3 → accept, 1/3 → reject
 *
 * Sprint 16.7: Real content extraction from source URLs
 * Sprint Pipeline: 3-pass consensus + provenance + scan_jobs audit trail
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { isPlaceholderName } from '@/lib/annotationValidator';
import { applyRateLimit, GCP_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';
import { runThreePassScan, validateConsensusEntities, type ScanJobResult } from '@/lib/consensusEngine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ═══════════════════════════════════════════════════════
// REAL CONTENT EXTRACTION — Source-aware fetching
// ═══════════════════════════════════════════════════════

/**
 * Fetch real content from the document source
 * Strategy:
 * 1. ICIJ → Scrape offshore leaks node page for entity/officer/address data
 * 2. OpenSanctions → Fetch entity detail from yente API
 * 3. CourtListener → Fetch opinion/case detail from REST API
 * 4. Fallback → Use document metadata (title, description, external_url)
 */
async function extractRealDocumentContent(
  document: Record<string, unknown>
): Promise<string> {
  const sourceType = (document.source_type as string) || 'manual';
  const externalId = document.external_id as string | null;
  const externalUrl = document.external_url as string | null;
  const title = document.title as string || '';
  const description = document.description as string || '';
  const metadata = (document.metadata as Record<string, unknown>) || {};

  let content = '';

  try {
    switch (sourceType) {
      case 'icij':
        content = await extractICIJContent(externalId, externalUrl);
        break;
      case 'opensanctions':
        content = await extractOpenSanctionsContent(externalId, metadata);
        break;
      case 'courtlistener':
      case 'court_listener':
        content = await extractCourtListenerContent(externalId);
        break;
      default:
        break;
    }
  } catch (err) {
    console.warn(`[Scan] Content extraction failed for ${sourceType}:`, err);
  }

  // Always include document metadata as context
  const metaContext = buildMetadataContext(document);

  if (content.trim().length > 50) {
    return `${metaContext}\n\n--- SOURCE CONTENT ---\n${content}`;
  }

  // Fallback: only metadata available
  return metaContext || `Title: ${title}\nDescription: ${description}\nSource: ${sourceType}`;
}

/**
 * Build context string from document metadata
 */
function buildMetadataContext(doc: Record<string, unknown>): string {
  const parts: string[] = [];
  if (doc.title) parts.push(`Title: ${doc.title}`);
  if (doc.description && doc.description !== 'ICIJ Offshore Leaks Database entity') {
    parts.push(`Description: ${doc.description}`);
  }
  if (doc.document_type) parts.push(`Document Type: ${doc.document_type}`);
  if (doc.source_type) parts.push(`Source: ${doc.source_type}`);
  if (doc.external_url) parts.push(`URL: ${doc.external_url}`);
  if (doc.date_filed) parts.push(`Filed Date: ${doc.date_filed}`);
  if (doc.country_tags && Array.isArray(doc.country_tags) && (doc.country_tags as string[]).length > 0) {
    parts.push(`Countries: ${(doc.country_tags as string[]).join(', ')}`);
  }

  const metadata = doc.metadata as Record<string, unknown> | null;
  if (metadata) {
    if (metadata.type) parts.push(`Entity Type: ${metadata.type}`);
    if (metadata.jurisdiction) parts.push(`Jurisdiction: ${metadata.jurisdiction}`);
    if (metadata.incorporation_date) parts.push(`Incorporation Date: ${metadata.incorporation_date}`);
    if (metadata.inactivation_date) parts.push(`Inactivation Date: ${metadata.inactivation_date}`);
    if (metadata.countries) parts.push(`Countries: ${metadata.countries}`);
    if (metadata.address) parts.push(`Address: ${metadata.address}`);
    if (metadata.score) parts.push(`Match Score: ${metadata.score}%`);
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════
// ICIJ CONTENT EXTRACTION
// ═══════════════════════════════════════════════════════

async function extractICIJContent(
  externalId: string | null,
  externalUrl: string | null
): Promise<string> {
  if (!externalId && !externalUrl) return '';

  const nodeId = externalId || externalUrl?.match(/nodes\/(\d+)/)?.[1];
  if (!nodeId) return '';

  const parts: string[] = [];

  // Try to fetch the node page and extract structured data
  try {
    const pageUrl = `https://offshoreleaks.icij.org/nodes/${nodeId}`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TruthPlatform/1.0; Research)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();

      // Extract entity name
      const nameMatch = html.match(/<h1[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                         html.match(/<div[^>]*class="[^"]*entity-name[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (nameMatch) {
        const entityName = nameMatch[1].replace(/<[^>]+>/g, '').trim();
        if (entityName) parts.push(`Entity Name: ${entityName}`);
      }

      // Extract entity type
      const typeMatch = html.match(/ENTITY:|OFFICER:|INTERMEDIARY:|ADDRESS:/i);
      if (typeMatch) {
        parts.push(`Type: ${typeMatch[0].replace(':', '').trim()}`);
      }

      // Extract registered country/jurisdiction
      const regMatch = html.match(/REGISTERED IN:[\s\S]*?<[^>]*>([^<]+)<\/[^>]*>/i);
      if (regMatch) {
        parts.push(`Registration: ${regMatch[1].trim()}`);
      }

      // Extract incorporation/closed dates
      const incMatch = html.match(/Incorporated:[\s\S]*?([\d]{2}-[A-Z]{3}-[\d]{4})/i);
      if (incMatch) parts.push(`Incorporation: ${incMatch[1]}`);

      const closedMatch = html.match(/Closed:[\s\S]*?([\d]{2}-[A-Z]{3}-[\d]{4})/i);
      if (closedMatch) parts.push(`Closure: ${closedMatch[1]}`);

      // Extract officers (owners, directors, etc.)
      const officerSection = html.match(/Officer[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
      if (officerSection) {
        const rows = officerSection[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        const officers: string[] = [];
        for (const row of rows) {
          const cells = row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          const cellTexts: string[] = [];
          for (const cell of cells) {
            const text = cell[1].replace(/<[^>]+>/g, '').trim();
            if (text) cellTexts.push(text);
          }
          if (cellTexts.length >= 2) {
            officers.push(`${cellTexts[0]} (${cellTexts[1]})`);
          }
        }
        if (officers.length > 0) {
          parts.push(`\nOfficers/Owners:\n${officers.map(o => `- ${o}`).join('\n')}`);
        }
      }

      // Extract addresses
      const addrSection = html.match(/Address[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
      if (addrSection) {
        const rows = addrSection[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        const addrs: string[] = [];
        for (const row of rows) {
          const text = row[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (text) addrs.push(text);
        }
        if (addrs.length > 0) {
          parts.push(`\nAddresses:\n${addrs.map(a => `- ${a}`).join('\n')}`);
        }
      }

      // Extract data source (Panama Papers, Paradise Papers, etc.)
      const sourceMatch = html.match(/Data From[\s\S]*?<[^>]*>([\w\s]+Papers|[\w\s]+Leaks)<\/[^>]*>/i) ||
                          html.match(/(Panama Papers|Paradise Papers|Pandora Papers|Bahamas Leaks|Offshore Leaks)/i);
      if (sourceMatch) {
        parts.push(`Data Source: ${sourceMatch[1].trim()}`);
      }

      // Extract any connections graph info
      const connectionsMatch = html.match(/CONNECTIONS:/i);
      if (connectionsMatch) {
        parts.push('\nThis entity has connections to other nodes (ICIJ graph database).');
      }

      // Extract NOTE
      const noteMatch = html.match(/NOTE:[\s\S]*?<[^>]*>([\s\S]*?)<\/[^>]*>/i);
      if (noteMatch) {
        const note = noteMatch[1].replace(/<[^>]+>/g, '').trim();
        if (note) parts.push(`Note: ${note}`);
      }
    }
  } catch (fetchErr) {
    console.warn('[Scan] ICIJ page fetch failed:', fetchErr);
  }

  // Also try Reconciliation API for additional context
  try {
    const reconcileUrl = 'https://offshoreleaks.icij.org/api/v1/reconcile';
    const response = await fetch(reconcileUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: nodeId }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.result && Array.isArray(data.result)) {
        const match = data.result.find((r: { id?: string }) => String(r.id) === String(nodeId));
        if (match) {
          if (match.name) parts.push(`Reconcile Adı: ${match.name}`);
          if (match.type?.[0]?.name) parts.push(`Reconcile Tipi: ${match.type[0].name}`);
        }
      }
    }
  } catch {
    // Reconcile fallback is optional
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════
// OPENSANCTIONS CONTENT EXTRACTION
// ═══════════════════════════════════════════════════════

async function extractOpenSanctionsContent(
  externalId: string | null,
  metadata: Record<string, unknown>
): Promise<string> {
  if (!externalId) return '';

  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  if (!apiKey) return '';

  const parts: string[] = [];

  try {
    // Fetch entity detail
    const url = `https://api.opensanctions.org/entities/${externalId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const entity = await response.json();

      if (entity.caption) parts.push(`Name: ${entity.caption}`);
      if (entity.schema) parts.push(`Type: ${entity.schema}`);

      const props = entity.properties || {};
      if (props.nationality) parts.push(`Nationality: ${props.nationality.join(', ')}`);
      if (props.birthDate) parts.push(`Birth Date: ${props.birthDate.join(', ')}`);
      if (props.position) parts.push(`Position: ${props.position.join(', ')}`);
      if (props.topics) parts.push(`Topics: ${props.topics.join(', ')}`);
      if (props.notes) parts.push(`Notes: ${props.notes.join(' ')}`);
      if (props.description) parts.push(`Description: ${props.description.join(' ')}`);
      if (props.sanctions) parts.push(`Sanctions: ${props.sanctions.join(', ')}`);
      if (props.address) parts.push(`Address: ${props.address.join(', ')}`);

      // Datasets this entity appears in
      if (entity.datasets && Array.isArray(entity.datasets)) {
        parts.push(`Datasets: ${entity.datasets.join(', ')}`);
      }

      // Referrals/references
      if (entity.referents && Array.isArray(entity.referents)) {
        parts.push(`Related Sources: ${entity.referents.length} references`);
      }
    }
  } catch (err) {
    console.warn('[Scan] OpenSanctions entity fetch failed:', err);
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════
// COURTLISTENER CONTENT EXTRACTION
// ═══════════════════════════════════════════════════════

async function extractCourtListenerContent(
  externalId: string | null
): Promise<string> {
  if (!externalId) return '';

  const apiKey = process.env.COURTLISTENER_API_KEY;
  if (!apiKey) return '';

  const parts: string[] = [];

  try {
    // Try opinions endpoint first
    const url = `https://www.courtlistener.com/api/rest/v4/opinions/${externalId}/?format=json`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const opinion = await response.json();

      if (opinion.case_name || opinion.caseName) {
        parts.push(`Case: ${opinion.case_name || opinion.caseName}`);
      }
      if (opinion.court) parts.push(`Court: ${opinion.court}`);
      if (opinion.date_filed || opinion.dateFiled) {
        parts.push(`Filed: ${opinion.date_filed || opinion.dateFiled}`);
      }
      if (opinion.judge) parts.push(`Judge: ${opinion.judge}`);
      if (opinion.type) parts.push(`Decision Type: ${opinion.type}`);

      // Extract plain text from HTML opinion
      if (opinion.html_with_citations || opinion.plain_text) {
        let text = opinion.plain_text || '';
        if (!text && opinion.html_with_citations) {
          text = (opinion.html_with_citations as string)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        // Limit to first 3000 chars to stay within token limits
        if (text.length > 3000) {
          text = text.substring(0, 3000) + '... [truncated]';
        }
        parts.push(`\nDecision Text:\n${text}`);
      }
    }
  } catch (err) {
    console.warn('[Scan] CourtListener opinion fetch failed:', err);
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════
// NETWORK NODE NAMES (for entity matching)
// ═══════════════════════════════════════════════════════

const getNetworkNodeNames = async (networkId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('nodes')
      .select('name')
      .eq('network_id', networkId);

    if (error) {
      console.warn('Failed to fetch node names:', error);
      return [];
    }

    return (data || []).map((n) => n.name);
  } catch (error) {
    console.warn('Error fetching node names:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════
// (Dedup + types now handled by consensusEngine.ts)
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// MAIN SCAN ENDPOINT
// ═══════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  // Rate limit check — GCP_RATE_LIMIT (10/min)
  const blocked = applyRateLimit(req, GCP_RATE_LIMIT);
  if (blocked) return blocked;

  // Request body size check — 2MB default for JSON
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const { documentId, fingerprint, extracted_text } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Fetch document
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // ═══ CLEAN START POLICY: Refuse to scan documents without files ═══
    // Exception: if extracted_text is provided (OCR already done client-side)
    const hasFile = document.file_path && document.file_path.trim() !== '';
    const hasRawContent = document.raw_content && (document.raw_content as string).length > 50;
    const hasExtractedText = extracted_text && extracted_text.length > 50;

    if (!hasFile && !hasRawContent && !hasExtractedText) {
      // Legacy metadata-only document — cannot be scanned
      return NextResponse.json(
        {
          error: 'SCAN_REQUIRES_FILE',
          message: 'This document cannot be scanned: no file. Clean Start Policy: only documents with actual files can be scanned.',
          hint: 'Re-upload the document with its actual file using /api/documents/manual-upload.',
          policy: 'Truth Constitution #8: Incorrect data is always more dangerous than incomplete data.',
        },
        { status: 422 }
      );
    }

    // Mark as scanning
    await supabaseAdmin
      .from('documents')
      .update({ scan_status: 'scanning' })
      .eq('id', documentId);

    // ═══ CONTENT SOURCE PRIORITY ═══
    // 1. extracted_text parameter (text from OCR — manual upload)
    // 2. raw_content column (saved during import, full text)
    // 3. Fallback: old extractRealDocumentContent() (fetches from provider again)
    let documentText = '';

    if (extracted_text && extracted_text.length > 50) {
      // OCR-extracted text from manual upload
      const metaContext = buildMetadataContext(document);
      documentText = `${metaContext}\n\n--- TEXT EXTRACTED VIA OCR ---\n${extracted_text}`;

      // Save OCR text to raw_content column
      await supabaseAdmin
        .from('documents')
        .update({
          raw_content: extracted_text,
          ocr_status: 'completed',
          ocr_extracted_text: extracted_text,
        })
        .eq('id', documentId);
    } else {
      const rawContent = document.raw_content as string | null;

      if (rawContent && rawContent.length > 50) {
        // Include metadata context + stored raw content
        const metaContext = buildMetadataContext(document);
        documentText = `${metaContext}\n\n--- SOURCE CONTENT ---\n${rawContent}`;
      } else {
        // Fallback: fetch from provider (for old documents)
        documentText = await extractRealDocumentContent(document);
      }
    }

    // Get network node names for matching
    const nodeNames = await getNetworkNodeNames(document.network_id);
    const nodeList = nodeNames.length > 0 ? nodeNames.join(', ') : 'None';

    // Check if we have enough content to scan
    const hasRealContent = documentText.length > 100;

    // ═══════════════════════════════════════════════════════
    // 3-PASS CONSENSUS SCAN ENGINE
    // ═══════════════════════════════════════════════════════
    // Replaces the old single-pass approach with:
    // Pass 1 (Conservative) → Pass 2 (Verification) → Pass 3 (Aggressive)
    // Then consensus voting + 8-signal post-hoc confidence scoring

    const sourceProvider = (document.source_type as string) || 'manual';
    const documentType = (document.document_type as string) || 'other';
    const promptVersion = 'v1.0'; // Will be fetched from prompt_versions table in future

    // Build case context for case validation (if document has docket info)
    const docMetadata = document.metadata as Record<string, unknown> | null;
    const docketNumber = docMetadata?.docket_number as string | undefined;
    const caseName = docMetadata?.case_name as string | undefined;
    const caseContext = docketNumber
      ? `This document should belong to case "${caseName || 'Unknown'}" (docket: ${docketNumber}). Verify the document content matches this case.`
      : undefined;

    console.log(`[Scan] Starting 3-pass consensus scan for doc ${documentId} (${documentType}, ${sourceProvider})${caseContext ? ' [case validation ON]' : ''}`);

    let scanJobResult: ScanJobResult;
    try {
      scanJobResult = await runThreePassScan(
        groq,
        documentText,
        nodeList,
        hasRealContent,
        documentType,
        sourceProvider,
        promptVersion,
        caseContext,
      );
    } catch (scanErr) {
      // If 3-pass fails completely, mark document as failed
      await supabaseAdmin
        .from('documents')
        .update({ scan_status: 'failed' })
        .eq('id', documentId);
      throw scanErr;
    }

    // ═══ SOURCE VALIDATION — Truth Constitution #8 ═══
    // Verify that AI-extracted entities actually appear in the document text
    // Entities not found → confidence penalty or rejection
    const rawConsensus = scanJobResult.consensus;
    const validatedConsensus = validateConsensusEntities(rawConsensus, documentText);

    // Replace consensus in scanJobResult with validated version
    scanJobResult.consensus = validatedConsensus;
    const consensus = validatedConsensus;

    const validationRejected = validatedConsensus.rejected_entities.length - rawConsensus.rejected_entities.length;
    if (validationRejected > 0) {
      console.log(`[Scan] Source validation: ${validationRejected} entities REJECTED (not found in document text)`);
    }

    const { passes, confidence_signals, confidence_composite, confidence_route } = scanJobResult;

    console.log(`[Scan] 3-pass complete: ${consensus.stats.total_accepted} accepted, ${consensus.stats.consensus_1_3_rejected} rejected (${validationRejected} by validation), composite=${confidence_composite}, route=${confidence_route}, duration=${scanJobResult.duration_ms}ms`);

    // ═══ CREATE SCAN JOB AUDIT RECORD ═══
    // (graceful — table may not exist yet if migration hasn't been run)
    let scanJobId: string | null = null;
    try {
      const { data: jobData, error: jobError } = await supabaseAdmin
        .from('scan_jobs')
        .insert({
          document_id: documentId,
          prompt_version: promptVersion,
          passes_completed: 3,
          pass_1_entities: consensus.stats.pass1_entities,
          pass_2_verified: consensus.stats.pass2_verified,
          pass_3_additions: consensus.stats.pass3_additions,
          consensus_3_3: consensus.stats.consensus_3_3,
          consensus_2_3: consensus.stats.consensus_2_3,
          consensus_1_3: consensus.stats.consensus_1_3_rejected,
          total_entities: consensus.stats.total_accepted,
          total_relationships: consensus.relationships.length,
          token_total: scanJobResult.token_total,
          duration_ms: scanJobResult.duration_ms,
          cost_estimate: scanJobResult.token_total * 0.00000005, // Groq pricing estimate
          confidence_signals: confidence_signals,
          confidence_composite: confidence_composite,
        })
        .select('id')
        .single();

      if (!jobError && jobData) {
        scanJobId = jobData.id;
      } else if (jobError) {
        console.warn('[Scan] scan_jobs insert failed (run SPRINT_PIPELINE_MIGRATION.sql):', jobError.message);
      }
    } catch (jobErr) {
      console.warn('[Scan] scan_jobs error:', jobErr);
    }

    // ═══ BUILD BACKWARD-COMPATIBLE SCAN RESULT ═══
    // The old UI reads scan_result.entities, .relationships, .summary, .keyDates, .confidence
    // We keep that shape but add consensus metadata
    const scanResult = {
      entities: consensus.entities,
      relationships: consensus.relationships,
      summary: consensus.summary,
      keyDates: consensus.keyDates,
      confidence: confidence_composite,
      // New fields for 3-pass pipeline
      consensus_stats: consensus.stats,
      rejected_entities: consensus.rejected_entities,
      confidence_signals: confidence_signals,
      confidence_route: confidence_route,
      scan_job_id: scanJobId,
      prompt_version: promptVersion,
      // Legacy compat
      rawContent: documentText.substring(0, 50000),
    };

    // ═══ UPDATE DOCUMENT WITH SCAN RESULTS ═══
    // Store both old columns (scan_result, quality_score) and new pipeline columns
    const updatePayload: Record<string, unknown> = {
      scan_status: 'scanned',
      scan_result: scanResult,
      scanned_by: fingerprint || null,
      scanned_at: new Date().toISOString(),
      quality_score: Math.round(confidence_composite * 100),
    };

    // New pipeline columns (graceful — only set if migration has been run)
    // These will be ignored by Supabase if the columns don't exist yet
    try {
      const pipelineUpdate: Record<string, unknown> = {
        ...updatePayload,
        scan_job_id: scanJobId,
        scan_prompt_version: promptVersion,
        scan_pass_1_raw: passes[0],
        scan_pass_2_raw: passes[1],
        scan_pass_3_raw: passes[2],
        scan_consensus_result: consensus,
        scan_model: 'llama-3.3-70b-versatile',
        scan_token_usage: {
          pass1: passes[0].token_usage,
          pass2: passes[1].token_usage,
          pass3: passes[2].token_usage,
          total: scanJobResult.token_total,
        },
        scan_duration_ms: scanJobResult.duration_ms,
        confidence_signals: confidence_signals,
        confidence_composite: confidence_composite,
        confidence_ai_raw: passes[0].confidence, // Pass 1's self-reported confidence (for calibration comparison)
        confidence_route: confidence_route,
      };

      const { error: pipelineUpdateError } = await supabaseAdmin
        .from('documents')
        .update(pipelineUpdate)
        .eq('id', documentId);

      if (pipelineUpdateError) {
        // Fallback: update without new pipeline columns
        console.warn('[Scan] Pipeline columns not available, using legacy update:', pipelineUpdateError.message);
        await supabaseAdmin
          .from('documents')
          .update(updatePayload)
          .eq('id', documentId);
      }
    } catch {
      // Ultimate fallback
      await supabaseAdmin
        .from('documents')
        .update(updatePayload)
        .eq('id', documentId);
    }

    // ═══ CLEAR OLD DERIVED ITEMS (prevent duplicates on re-scan) ═══
    await supabaseAdmin
      .from('document_derived_items')
      .delete()
      .eq('document_id', documentId)
      .in('status', ['pending', 'archived']);

    // ═══ CLEAR OLD QUARANTINE ITEMS (prevent duplicates on re-scan) ═══
    try {
      await supabaseAdmin
        .from('data_quarantine')
        .delete()
        .eq('document_id', documentId)
        .in('verification_status', ['quarantined', 'pending_review']);
    } catch (qCleanErr) {
      console.warn('[Scan] Quarantine cleanup error:', qCleanErr);
    }

    // ═══ DERIVED ITEMS FROM CONSENSUS RESULTS ═══
    // Only consensus-approved entities go to derived items (not rejected 1/3 entities)
    const isStructuredSource = ['icij', 'opensanctions', 'courtlistener'].includes(sourceProvider);
    const confidenceThreshold = isStructuredSource ? 0.4 : 0.5;

    if (consensus.entities.length > 0) {
      const entityItems = consensus.entities
        .filter((e) => e.confidence >= confidenceThreshold && !isPlaceholderName(e.name || ''))
        .map((entity) => {
          const importance = entity.importance || 'medium';
          const isLowImportance = importance === 'low';
          return {
            document_id: documentId,
            item_type: 'entity',
            item_data: {
              ...entity,
              consensus: entity.consensus,
              passes: entity.passes,
            },
            status: isLowImportance ? 'archived' : 'pending',
            confidence: entity.confidence,
          };
        });

      if (entityItems.length > 0) {
        const { error: entityError } = await supabaseAdmin
          .from('document_derived_items')
          .insert(entityItems);
        if (entityError) console.warn('Failed to insert entity items:', entityError);
      }
    }

    if (consensus.relationships.length > 0) {
      const relItems = consensus.relationships
        .filter((r) => r.confidence >= confidenceThreshold)
        .map((rel) => ({
          document_id: documentId,
          item_type: 'relationship',
          item_data: { ...rel, consensus: rel.consensus, passes: rel.passes },
          status: 'pending',
          confidence: rel.confidence,
        }));

      if (relItems.length > 0) {
        const { error: relError } = await supabaseAdmin
          .from('document_derived_items')
          .insert(relItems);
        if (relError) console.warn('Failed to insert relationship items:', relError);
      }
    }

    if (consensus.keyDates.length > 0) {
      const dateItems = consensus.keyDates.map((kd) => ({
        document_id: documentId,
        item_type: 'date',
        item_data: kd,
        status: 'pending',
        confidence: confidence_composite,
      }));

      if (dateItems.length > 0) {
        const { error: dateError } = await supabaseAdmin
          .from('document_derived_items')
          .insert(dateItems);
        if (dateError) console.warn('Failed to insert date items:', dateError);
      }
    }

    // ═══ QUARANTINE PIPELINE — Confidence-Routed ═══
    // Route to quarantine with required_reviews based on calculated composite score
    try {
      const isStructured = ['icij', 'opensanctions', 'courtlistener'].includes(sourceProvider);
      const sourceType = isStructured ? 'structured_api' : 'ai_extraction';

      const quarantineItems: Array<Record<string, unknown>> = [];

      // Entity items → quarantine (consensus-approved only, skip low importance)
      for (const entity of consensus.entities.filter((e) => {
        return e.confidence >= confidenceThreshold
          && !isPlaceholderName(e.name || '')
          && e.importance !== 'low';
      })) {
        // Route based on confidence composite
        let requiredReviews: number;
        let verificationStatus: string;
        if (confidence_composite >= 0.90) {
          requiredReviews = 0; // auto_accept — spot check only
          verificationStatus = 'pending_review';
        } else if (confidence_composite >= 0.70) {
          requiredReviews = 1;
          verificationStatus = 'pending_review';
        } else if (confidence_composite >= 0.50) {
          requiredReviews = 2;
          verificationStatus = 'quarantined';
        } else {
          requiredReviews = 3;
          verificationStatus = 'quarantined';
        }

        quarantineItems.push({
          document_id: documentId,
          network_id: document.network_id,
          item_type: 'entity',
          item_data: {
            ...entity,
            consensus: entity.consensus,
            passes: entity.passes,
            confidence_route: confidence_route,
          },
          confidence: entity.confidence,
          verification_status: verificationStatus,
          source_type: sourceType,
          source_provider: sourceProvider,
          source_url: (document.external_url as string) || null,
          required_reviews: requiredReviews,
          submitted_by: fingerprint || null,
          provenance_chain: JSON.stringify([{
            action: 'extracted',
            timestamp: new Date().toISOString(),
            source_type: sourceType,
            source_provider: sourceProvider,
            confidence: entity.confidence,
            consensus: entity.consensus,
            confidence_composite: confidence_composite,
            confidence_route: confidence_route,
            scan_job_id: scanJobId,
            scanner: fingerprint,
          }]),
        });
      }

      // Relationship items → quarantine
      for (const rel of consensus.relationships.filter((r) => r.confidence >= 0.5)) {
        quarantineItems.push({
          document_id: documentId,
          network_id: document.network_id,
          item_type: 'relationship',
          item_data: { ...rel, consensus: rel.consensus, passes: rel.passes },
          confidence: rel.confidence,
          verification_status: confidence_composite >= 0.70 ? 'pending_review' : 'quarantined',
          source_type: sourceType,
          source_provider: sourceProvider,
          source_url: (document.external_url as string) || null,
          required_reviews: confidence_composite >= 0.70 ? 1 : 2,
          submitted_by: fingerprint || null,
          provenance_chain: JSON.stringify([{
            action: 'extracted',
            timestamp: new Date().toISOString(),
            source_type: sourceType,
            source_provider: sourceProvider,
            confidence: rel.confidence,
            scan_job_id: scanJobId,
            scanner: fingerprint,
          }]),
        });
      }

      if (quarantineItems.length > 0) {
        const { error: qError } = await supabaseAdmin
          .from('data_quarantine')
          .insert(quarantineItems);
        if (qError) {
          console.warn('[Scan] Quarantine insert failed:', qError.message);
        }
      }
    } catch (quarantineErr) {
      console.warn('[Scan] Quarantine pipeline error:', quarantineErr);
    }

    // ═══ REPUTATION AWARD ═══
    if (fingerprint) {
      try {
        const entityCount = consensus.entities.length;
        const relCount = consensus.relationships.length;
        const rejectedCount = consensus.rejected_entities.length;
        // Bonus scales with quality: accepted entities earn more, rejected ones subtract
        const bonus = Math.min(10, Math.floor(entityCount / 3) + Math.floor(relCount / 3) * 2);
        const penalty = Math.floor(rejectedCount / 5); // Mild penalty for hallucinations
        const totalReputation = Math.max(1, 5 + bonus - penalty);

        await supabaseAdmin.from('reputation_transactions').insert({
          user_fingerprint: fingerprint,
          transaction_type: 'earn',
          amount: totalReputation,
          reason: `Document scan: ${entityCount} entities (${consensus.stats.consensus_3_3} high-conf), ${relCount} relationships, ${rejectedCount} rejected`,
          metadata: {
            document_id: documentId,
            entity_count: entityCount,
            relationship_count: relCount,
            rejected_count: rejectedCount,
            confidence_composite: confidence_composite,
            confidence_route: confidence_route,
            scan_job_id: scanJobId,
          },
        });

        const { data: userData } = await supabaseAdmin
          .from('truth_users')
          .select('reputation_score')
          .eq('anonymous_id', fingerprint)
          .maybeSingle();

        if (userData) {
          await supabaseAdmin
            .from('truth_users')
            .update({ reputation_score: (userData.reputation_score || 0) + totalReputation })
            .eq('anonymous_id', fingerprint);
        }
      } catch (repErr) {
        console.warn('Failed to award reputation:', repErr);
      }
    }

    // ═══ PROVENANCE RECORD ═══
    // Record the scan in data_provenance table (if it exists)
    try {
      await supabaseAdmin.from('data_provenance').insert({
        entity_type: 'document',
        entity_id: documentId,
        action: 'scanned',
        actor_type: 'system',
        actor_id: 'consensus_engine_v1',
        details: {
          prompt_version: promptVersion,
          scan_job_id: scanJobId,
          passes_completed: 3,
          total_accepted: consensus.stats.total_accepted,
          total_rejected: consensus.stats.consensus_1_3_rejected,
          confidence_composite: confidence_composite,
          confidence_route: confidence_route,
          token_total: scanJobResult.token_total,
          duration_ms: scanJobResult.duration_ms,
        },
      });
    } catch {
      // data_provenance table may not exist — non-fatal
    }

    return NextResponse.json(scanResult);
  } catch (error: unknown) {
    return safeErrorResponse('POST /api/documents/scan', error);
  }
}
