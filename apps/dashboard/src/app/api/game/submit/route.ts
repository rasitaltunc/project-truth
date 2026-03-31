/**
 * /api/game/submit
 * POST: Submit a task review (approve/reject/dispute/skip)
 *
 * Sprint G1: Task Review Submission + Consensus + Transparency
 * Every action is logged, every decision is traceable
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';
import { sanitizeReasoning, sanitizeCorrection } from '@/lib/inputSanitizer';
import { runPostSubmitPipeline } from '@/lib/verificationEngine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  const blocked = applyRateLimit(req, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const {
      task_id,
      fingerprint,
      decision,        // 'approve' | 'reject' | 'dispute' | 'skip'
      reasoning,       // ZORUNLU — neden bu kararı verdin?
      confidence,      // 0-1 self-reported confidence
      evidence_refs,   // Optional: referans kaynak ID'leri
      highlight_data,  // Optional: fosforlu kalem çizgileri (normalize edilmiş bbox'lar)
      // Verification Desk v2
      phase_responses, // 3-layer phase answers (blind, compare, verify)
      rejected_spotlight, // Did user reject the honeypot spotlight?
      found_correct_section, // Did user find the correct section without spotlight?
      corrections,     // User-submitted corrections to extracted data
    } = body;

    // Validation
    if (!task_id || !fingerprint || !decision) {
      return NextResponse.json(
        { error: 'task_id, fingerprint, and decision are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'dispute', 'skip'].includes(decision)) {
      return NextResponse.json(
        { error: 'decision must be approve, reject, dispute, or skip' },
        { status: 400 }
      );
    }

    // Skip doesn't require reasoning
    if (decision !== 'skip' && (!reasoning || reasoning.trim().length < 10)) {
      return NextResponse.json(
        { error: 'reasoning is required (minimum 10 characters) — transparency is mandatory' },
        { status: 400 }
      );
    }

    // Sanitize confidence (must be number in [0, 1])
    const sanitizedConfidence = typeof confidence === 'number'
      ? Math.max(0, Math.min(1, confidence))
      : null;

    // Verification Desk v2: Sanitize reasoning
    const sanitizedReasoning = reasoning ? sanitizeReasoning(reasoning) : null;

    // Verification Desk v2: Sanitize corrections
    const sanitizedCorrections = Array.isArray(corrections)
      ? corrections.map(sanitizeCorrection).filter(Boolean).slice(0, 20) // max 20 corrections
      : [];

    // Verification Desk v2: Sanitize phase_responses
    const sanitizedPhaseResponses = Array.isArray(phase_responses)
      ? phase_responses.slice(0, 4).map((pr: Record<string, unknown>) => ({
          phase: ['blind', 'compare', 'verify', 'complete'].includes(pr.phase as string)
            ? pr.phase : 'blind',
          decision: ['approve', 'reject', 'dispute', 'skip'].includes(pr.decision as string)
            ? (pr.decision as string) : null,
          reasoning: pr.reasoning ? sanitizeReasoning(pr.reasoning as string) : null,
          confidence: typeof pr.confidence === 'number'
            ? Math.max(0, Math.min(1, pr.confidence)) : null,
          rejected_spotlight: !!pr.rejected_spotlight,
          found_correct_section: !!pr.found_correct_section,
          timestamp: typeof pr.timestamp === 'number' ? pr.timestamp : Date.now(),
        }))
      : null;

    // Check task exists and user hasn't already reviewed
    const { data: task, error: taskError } = await supabaseAdmin
      .from('investigation_tasks')
      .select('*')
      .eq('id', task_id)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('task_assignments')
      .select('id')
      .eq('task_id', task_id)
      .eq('user_fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this task' },
        { status: 409 }
      );
    }

    // Check calibration correctness
    let isCalibration = task.is_calibration;
    let isCorrect: boolean | null = null;

    if (isCalibration && task.known_answer) {
      const knownDecision = (task.known_answer as Record<string, unknown>).decision as string;
      isCorrect = decision === knownDecision;
    }

    // Calculate response time (approximate — from task assignment log)
    const { data: assignLog } = await supabaseAdmin
      .from('transparency_log')
      .select('created_at')
      .eq('target_id', task_id)
      .eq('actor_fingerprint', fingerprint)
      .eq('action_type', 'task_assigned')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const responseTimeMs = assignLog
      ? Date.now() - new Date(assignLog.created_at as string).getTime()
      : null;

    // Validate & sanitize highlight_data (fosforlu kalem strokes)
    // Format: { page: number, canvas: {w,h}, strokes: [{color, bbox: {x,y,w,h}}] }
    // All bbox values are NORMALIZED (0-1 range) relative to canvas size
    let sanitizedHighlightData = null;
    if (highlight_data && typeof highlight_data === 'object') {
      const hd = highlight_data as Record<string, unknown>;
      const strokes = Array.isArray(hd.strokes) ? hd.strokes : [];
      if (strokes.length > 0 && strokes.length <= 50) { // max 50 strokes per page
        sanitizedHighlightData = {
          page: typeof hd.page === 'number' ? hd.page : 1,
          canvas_width: typeof hd.canvas_width === 'number' ? hd.canvas_width : 0,
          canvas_height: typeof hd.canvas_height === 'number' ? hd.canvas_height : 0,
          strokes: strokes.slice(0, 50).map((s: Record<string, unknown>) => ({
            color: typeof s.color === 'string' ? s.color : '#facc15',
            bbox: {
              x: Number(s.nx) || 0,      // normalized x (0-1)
              y: Number(s.ny) || 0,      // normalized y (0-1)
              w: Number(s.nw) || 0,      // normalized width (0-1)
              h: Number(s.nh) || 0,      // normalized height (0-1)
            },
          })),
        };
      }
    }

    // 1. Insert assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('task_assignments')
      .insert({
        task_id,
        user_fingerprint: fingerprint,
        mode: 'solo',
        response: { decision, details: body.details || null },
        response_time_ms: responseTimeMs,
        confidence_self_report: sanitizedConfidence,
        is_calibration: isCalibration,
        is_correct: isCorrect,
        reasoning: sanitizedReasoning || null,
        evidence_references: evidence_refs || [],
        ...(sanitizedHighlightData ? { highlight_data: sanitizedHighlightData } : {}),
        // Verification Desk v2
        ...(sanitizedPhaseResponses ? { phase_responses: sanitizedPhaseResponses } : {}),
        rejected_spotlight: !!rejected_spotlight,
        found_correct_section: !!found_correct_section,
        ...(sanitizedCorrections.length > 0 ? { corrections: sanitizedCorrections } : {}),
      })
      .select('id, trace_id')
      .single();

    if (assignError) throw assignError;

    // 2. Update task completed_count (use RPC for atomic increment)
    const { data: updateResult, error: updateError } = await supabaseAdmin.rpc(
      'increment_task_completed_count',
      { p_task_id: task_id }
    );

    if (updateError) throw updateError;
    const newCompletedCount = updateResult || ((task.completed_count || 0) + 1);

    // 3. Update investigator profile
    await supabaseAdmin.rpc('update_investigator_stats', {
      p_fingerprint: fingerprint,
      p_is_calibration: isCalibration,
      p_is_correct: isCorrect,
    });

    // 4. Check if consensus can be calculated
    let consensusResult = null;
    let highlightConsensus = null;
    if (newCompletedCount >= task.required_reviews) {
      const { data: consensus } = await supabaseAdmin.rpc('calculate_task_consensus', {
        p_task_id: task_id,
      });
      consensusResult = consensus;

      // 4b. Calculate highlight consensus (IoU) if highlight data exists
      if (sanitizedHighlightData) {
        try {
          const { data: hConsensus } = await supabaseAdmin.rpc('calculate_highlight_consensus', {
            p_task_id: task_id,
          });
          highlightConsensus = hConsensus;
        } catch {
          // RPC may not exist yet — graceful fallback
          console.warn('[game/submit] highlight consensus RPC not available yet');
        }
      }
    }

    // 5. Log to transparency trail
    await supabaseAdmin.from('transparency_log').insert({
      action_type: 'task_reviewed',
      actor_fingerprint: fingerprint,
      actor_type: 'user',
      target_type: 'task',
      target_id: task_id,
      action_data: {
        decision,
        reasoning: sanitizedReasoning,
        confidence: sanitizedConfidence,
        response_time_ms: responseTimeMs,
        is_calibration: isCalibration,
        is_correct: isCorrect,
        assignment_id: assignment.id,
        has_highlight: !!sanitizedHighlightData,
        highlight_stroke_count: sanitizedHighlightData?.strokes?.length || 0,
        // Verification Desk v2
        rejected_spotlight: !!rejected_spotlight,
        found_correct_section: !!found_correct_section,
        corrections_count: sanitizedCorrections.length,
        phase_count: sanitizedPhaseResponses?.length || 0,
      },
      network_id: task.network_id,
      related_trace_ids: [assignment.trace_id],
    });

    // 6. If consensus reached, log it
    if (consensusResult) {
      await supabaseAdmin.from('transparency_log').insert({
        action_type: 'task_consensus',
        actor_type: 'system',
        target_type: 'task',
        target_id: task_id,
        action_data: {
          consensus: consensusResult,
          trigger: 'review_threshold_met',
          formula: 'weighted_vote: trust_weight × decision, threshold 67%',
        },
        network_id: task.network_id,
      });
    }

    // 7. Speed anomaly detection
    if (responseTimeMs && responseTimeMs < 3000 && decision !== 'skip') {
      await supabaseAdmin.from('transparency_log').insert({
        action_type: 'behavior_flagged',
        actor_type: 'system',
        target_type: 'profile',
        target_id: fingerprint,
        action_data: {
          flag: 'speed_anomaly',
          response_time_ms: responseTimeMs,
          task_id,
          threshold_ms: 3000,
        },
        network_id: task.network_id,
      });
    }

    // 8. Verification Engine v2: Post-submit pipeline
    //    (spotlight resistance, delayed consensus, auto-promote, attack detection)
    let pipelineResult = null;
    try {
      pipelineResult = await runPostSubmitPipeline(
        supabaseAdmin,
        task_id,
        fingerprint,
        task.network_id,
        newCompletedCount,
        task.required_reviews,
      );
    } catch (pipelineErr) {
      // Pipeline failure should NOT block the submit response
      console.error('[game/submit] v2 pipeline error (non-blocking):', pipelineErr);
    }

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      assignment_id: assignment.id,
      assignment_trace_id: assignment.trace_id,
      completed_count: newCompletedCount,
      required_reviews: task.required_reviews,
    };

    // If calibration, reveal the answer
    if (isCalibration) {
      response.calibration = {
        is_correct: isCorrect,
        known_answer: task.known_answer,
        message: isCorrect
          ? 'Doğru! Bu bir kalibrasyon sorusuydu ve doğru cevapladın.'
          : 'Bu bir kalibrasyon sorusuydu. Doğru cevap farklıydı.',
      };
    }

    // If consensus reached, include it
    if (consensusResult) {
      response.consensus = consensusResult;
    }

    // Include highlight consensus if available
    if (highlightConsensus) {
      response.highlight_consensus = highlightConsensus;
    }

    // Verification Engine v2: Include pipeline results
    if (pipelineResult) {
      if (pipelineResult.consensus) {
        response.v2_consensus = pipelineResult.consensus;
      }
      if (pipelineResult.promoted) {
        response.promoted = true;
      }
      if (pipelineResult.attackDetected) {
        response.attack_warning = true;
      }
      if (pipelineResult.spotlightResistance !== null) {
        response.spotlight_resistance = pipelineResult.spotlightResistance;
      }
    }

    // Get updated profile
    const { data: updatedProfile } = await supabaseAdmin
      .from('investigator_profiles')
      .select('tier, xp, streak_days, calibration_accuracy, trust_weight, trust_weight_formula, total_tasks_completed')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    response.profile = updatedProfile;

    return NextResponse.json(response);
  } catch (error) {
    return safeErrorResponse('POST /api/game/submit', error);
  }
}
