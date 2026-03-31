/**
 * /api/game/tasks
 * GET: Get next task for user (solo mode)
 *
 * Sprint G1: Task Assignment
 * Picks an unreviewed task, mixes calibration questions (~20%)
 *
 * Verification Desk v2:
 * - 3-layer blind review (existing_reviews hidden until phase 2+)
 * - spotlight_mode + source_sentence for highlight system
 * - risk_level awareness (cooling period filter)
 * - honeypot target section for trust calibration
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GAME_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Build text content for spotlight matching.
 * Includes first 8000 chars + the region around the source sentence/entity name.
 * This ensures spotlight can find the highlighted area even in long documents.
 */
function buildTextForSpotlight(fullText: string, sourceSentence: string, entityName: string): string {
  const base = fullText.substring(0, 8000);

  if (fullText.length <= 8000) return base;

  // Try to find the source sentence region in the full text
  const normFull = fullText.toLowerCase().replace(/\s+/g, ' ');
  let targetIdx = -1;

  if (sourceSentence && sourceSentence.length >= 10) {
    const normSentence = sourceSentence.toLowerCase().replace(/\s+/g, ' ');
    targetIdx = normFull.indexOf(normSentence);
    // Try partial match (first 50 chars)
    if (targetIdx === -1 && normSentence.length > 15) {
      targetIdx = normFull.indexOf(normSentence.substring(0, 50));
    }
  }

  // Fallback: find entity name
  if (targetIdx === -1 && entityName && entityName.length > 2) {
    targetIdx = normFull.indexOf(entityName.toLowerCase());
  }

  // If target is within first 8000 chars, base is enough
  if (targetIdx === -1 || targetIdx < 8000) return base;

  // Append the region around the target (±1500 chars)
  const regionStart = Math.max(0, targetIdx - 1500);
  const regionEnd = Math.min(fullText.length, targetIdx + 1500);
  const region = fullText.substring(regionStart, regionEnd);

  return base + '\n...[spotlight region]...\n' + region;
}

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GAME_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get('network_id');
    const fingerprint = searchParams.get('fingerprint');
    const roleAffinity = searchParams.get('role') || null;

    if (!networkId || !fingerprint) {
      return NextResponse.json(
        { error: 'network_id and fingerprint are required' },
        { status: 400 }
      );
    }

    // ALL game tables use UUID for network_id — resolve slug to UUID
    let resolvedNetworkId = networkId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(networkId);
    if (!isUUID) {
      const { data: network } = await supabaseAdmin
        .from('networks')
        .select('id')
        .or(`slug.eq.${networkId},name.ilike.%${networkId.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      if (network) {
        resolvedNetworkId = network.id;
      } else {
        return NextResponse.json({ task: null, message: 'network_not_found' });
      }
    }

    // Ensure profile exists (non-blocking — log errors but don't fail endpoint)
    try {
      await supabaseAdmin
        .from('investigator_profiles')
        .upsert({ fingerprint }, { onConflict: 'fingerprint', ignoreDuplicates: true });
    } catch (profileError) {
      console.error('Profile upsert error (non-fatal):', profileError);
    }

    // Try to get a calibration task first (~20% chance)
    const shouldCalibrate = Math.random() < 0.2;

    let task = null;

    if (shouldCalibrate) {
      // Get calibration tasks user hasn't done — fetch completed task IDs first
      const { data: userAssignmentsForCal } = await supabaseAdmin
        .from('task_assignments')
        .select('task_id')
        .eq('user_fingerprint', fingerprint);

      const completedTaskIds = new Set(
        (userAssignmentsForCal || []).map((a: Record<string, unknown>) => a.task_id)
      );

      // Get all open calibration tasks
      const { data: calTasks } = await supabaseAdmin
        .from('investigation_tasks')
        .select('*')
        .eq('network_id', resolvedNetworkId)
        .eq('is_calibration', true)
        .eq('status', 'open')
        .limit(20);

      // Filter out tasks user already reviewed
      const availableCal = (calTasks || []).filter(
        (t: Record<string, unknown>) => !completedTaskIds.has(t.id)
      );

      if (availableCal.length > 0) {
        task = availableCal[Math.floor(Math.random() * availableCal.length)];
      }
    }

    if (!task) {
      // Get a regular task — prioritize less-reviewed tasks
      let query = supabaseAdmin
        .from('investigation_tasks')
        .select('*')
        .eq('network_id', resolvedNetworkId)
        .in('status', ['open', 'in_progress'])
        .eq('is_calibration', false);

      // Role affinity: 70% matching, 30% cross-training
      if (roleAffinity && Math.random() < 0.7) {
        query = query.or(`role_affinity.eq.${roleAffinity},role_affinity.eq.general`);
      }

      const { data: tasks } = await query
        .order('completed_count', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(20);

      if (tasks && tasks.length > 0) {
        // Filter out tasks user already reviewed
        const { data: userAssignments } = await supabaseAdmin
          .from('task_assignments')
          .select('task_id')
          .eq('user_fingerprint', fingerprint);

        const doneTaskIds = new Set(
          (userAssignments || []).map((a: Record<string, unknown>) => a.task_id)
        );

        const now = new Date();
        const available = tasks.filter(
          (t: Record<string, unknown>) => !doneTaskIds.has(t.id) &&
            (t.completed_count as number) < (t.required_reviews as number) &&
            // Verification Desk v2: Skip tasks still in cooling period (high-risk 48h wait)
            (!t.cooling_expires_at || new Date(t.cooling_expires_at as string) < now)
        );

        if (available.length > 0) {
          // Pick randomly from top candidates (avoid predictable ordering)
          task = available[Math.floor(Math.random() * Math.min(available.length, 5))];
        }
      }
    }

    if (!task) {
      return NextResponse.json({
        task: null,
        message: 'no_tasks_available',
        hint: 'All tasks have been reviewed or you have completed all available tasks.',
      });
    }

    // Get provenance trail for this task (ŞEFFAFLIK)
    const { data: provenanceData } = await supabaseAdmin
      .from('transparency_log')
      .select('action_type, actor_type, action_data, created_at, trace_id')
      .eq('target_id', task.id)
      .order('created_at', { ascending: true })
      .limit(50);

    // Get existing reviews for this task (ŞEFFAFLIK — herkes görebilir)
    const { data: existingReviews } = await supabaseAdmin
      .from('task_assignments')
      .select('user_fingerprint, response, response_time_ms, reasoning, confidence_self_report, created_at, trace_id')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });

    // Get document context if available (including OCR text for fosforlu kalem)
    let documentContext = null;
    if (task.source_document_id) {
      const { data: doc, error: docError } = await supabaseAdmin
        .from('documents')
        .select('id, title, document_type, source_type, external_url, ocr_extracted_text, raw_content, file_path, file_size, metadata')
        .eq('id', task.source_document_id)
        .maybeSingle();
      if (docError) {
        console.error('[game/tasks] Document fetch error:', docError.message, 'for doc:', task.source_document_id);
      }
      if (doc) {
        // Pick the best available text content (OCR > raw_content)
        const textContent = doc.ocr_extracted_text || doc.raw_content || null;

        // Determine if a renderable PDF file is available via any source:
        // 1. GCS stored copy (metadata.gcs_path)
        // 2. Local file (file_path)
        // 3. External source with PDF (external_url from known providers)
        const docMetadata = (doc.metadata || {}) as Record<string, unknown>;
        const gcsPath = docMetadata.gcs_path as string | undefined;
        const externalUrl = (doc.external_url || '') as string;
        // Only mark as having a PDF file if URL actually points to a PDF
        // CourtListener docket pages are HTML, not PDF — only recap.free.law has actual PDFs
        const hasExternalPdf = externalUrl.includes('.pdf') ||
          externalUrl.includes('recap.free.law') ||
          externalUrl.includes('storage.courtlistener.com') ||
          externalUrl.includes('archive.org');
        const hasFile = !!(gcsPath || doc.file_path || hasExternalPdf);

        documentContext = {
          id: doc.id,
          title: doc.title,
          document_type: doc.document_type,
          source_name: (doc.source_type || 'unknown') as string,
          source_url: externalUrl,
          page_count: doc.file_size ? 1 : 0, // estimated; real count comes from PDF render
          // Include enough text for spotlight matching
          // Strategy: first 8000 chars + the region around source_sentence (if any)
          text_content: textContent ? buildTextForSpotlight(
            textContent as string,
            ((task.task_data as Record<string, unknown>)?.source_sentence as string) || '',
            ((task.task_data as Record<string, unknown>)?.entity_name as string) || '',
          ) : null,
          has_full_text: textContent ? (textContent as string).length > 8000 : false,
          // All file access goes through our proxy — never expose external URLs directly
          has_file: hasFile,
          file_url: hasFile ? `/api/documents/${doc.id}/file` : null,
        };
      }
    }

    // Get user profile for display
    const { data: profile } = await supabaseAdmin
      .from('investigator_profiles')
      .select('tier, xp, streak_days, calibration_accuracy, trust_weight, trust_weight_formula, total_tasks_completed')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    // Mark task as in_progress if it was open
    if (task.status === 'open') {
      await supabaseAdmin
        .from('investigation_tasks')
        .update({ status: 'in_progress', assigned_count: task.assigned_count + 1, updated_at: new Date().toISOString() })
        .eq('id', task.id);
    }

    // Log assignment
    await supabaseAdmin.from('transparency_log').insert({
      action_type: 'task_assigned',
      actor_fingerprint: fingerprint,
      actor_type: 'user',
      target_type: 'task',
      target_id: task.id,
      action_data: { role_affinity: roleAffinity, is_calibration: task.is_calibration },
      network_id: resolvedNetworkId,
    });

    // ── INTEGRITY CHECK: Verify entity actually exists in document text ──
    // This prevents showing a task about entity X with a document that doesn't mention X
    let entityDocumentMismatch = false;
    if (documentContext && task.task_data) {
      const td = task.task_data as Record<string, unknown>;
      const entityName = (td.entity_name as string) || (td.source_entity as string) || '';
      const docText = (documentContext as Record<string, unknown>).text_content as string || '';
      if (entityName.length > 2 && docText.length > 0) {
        const normalizedEntity = entityName.toLowerCase().trim();
        const normalizedDoc = docText.toLowerCase();
        // Check if entity name (or significant part) appears in document
        const nameParts = normalizedEntity.split(' ').filter((w: string) => w.length > 2);
        const fullMatch = normalizedDoc.includes(normalizedEntity);
        const partialMatch = nameParts.length > 0 && nameParts.every((part: string) => normalizedDoc.includes(part));
        if (!fullMatch && !partialMatch) {
          entityDocumentMismatch = true;
          console.warn(`[game/tasks] INTEGRITY WARNING: Entity "${entityName}" NOT FOUND in document text (${docText.length} chars). Task: ${task.id}`);
        }
      }
    }

    // Verification Desk v2: Determine review phase
    // phase query param tells us which layer the reviewer is on
    const phaseParam = searchParams.get('phase') || 'blind';

    // Verification Desk v2: Extract spotlight data for UI
    const taskData = task.task_data as Record<string, unknown> || {};
    const spotlightData = {
      mode: task.spotlight_mode || 'none',
      source_sentence: (taskData.source_sentence as string) || '',
      source_page: (taskData.source_page as number) || null,
      // Honeypot target — only included when spotlight_mode === 'honeypot'
      // This is the WRONG section that the system deliberately highlights
      // Trust-worthy reviewers should reject it
      honeypot_target_section: task.spotlight_mode === 'honeypot'
        ? (task.honeypot_target_section || null)
        : null,
    };

    // ANTI-BIAS CRITICAL: Hide existing reviews during blind phase (Layer 1)
    // Reviewers must form their OWN opinion first before seeing others
    // This is the core anti-bias mechanism — E5 stress test finding
    const shouldShowReviews = phaseParam !== 'blind';

    return NextResponse.json({
      task: {
        id: task.id,
        task_type: task.task_type,
        difficulty: task.difficulty,
        role_affinity: task.role_affinity,
        task_data: task.task_data,
        context_data: task.context_data,
        is_calibration: task.is_calibration, // User sees this AFTER answering
        required_reviews: task.required_reviews,
        completed_count: task.completed_count,
        trace_id: task.trace_id,
        // Verification Desk v2 fields
        spotlight: spotlightData,
        entity_document_mismatch: entityDocumentMismatch,
        risk_level: task.risk_level || 'standard',
        cooling_expires_at: task.cooling_expires_at || null,
        composite_confidence: task.composite_confidence || null,
      },
      document: documentContext,
      provenance: provenanceData || [],
      // ANTI-BIAS: Reviews hidden during blind phase, revealed in compare phase
      existing_reviews: shouldShowReviews
        ? (existingReviews || []).map((r: Record<string, unknown>) => ({
            // Anonymize fingerprint but show everything else (ŞEFFAFLIK)
            reviewer: (r.user_fingerprint as string).substring(0, 8) + '***',
            response: r.response,
            response_time_ms: r.response_time_ms,
            reasoning: r.reasoning,
            confidence: r.confidence_self_report,
            trace_id: r.trace_id,
            created_at: r.created_at,
          }))
        : [], // Empty during blind phase — reviewer sees NOTHING from others
      review_phase: phaseParam,
      reviews_hidden: !shouldShowReviews,
      profile,
    });
  } catch (error) {
    return safeErrorResponse('GET /api/game/tasks', error);
  }
}
