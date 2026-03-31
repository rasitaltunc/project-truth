/**
 * Verification Engine — Doğrulama Masası v2 Backend Motoru
 *
 * Tüm post-review hesaplamaları burada yapılır:
 *
 * 1. spotlight_resistance — Honeypot sonuçlarından 6. güven sinyali
 * 2. Delayed Consensus — Ağırlıklı oy + gecikmeli karar
 * 3. Auto-Promote — Doğrulanan veriyi quarantine'den ağa taşıma
 * 4. Coordinated Attack Detection — Anomali tespiti
 * 5. Hallucination Rate Tracker — AI halüsinasyon oranı izleme
 * 6. Re-verification Queue — Düşük güvenli verileri yeniden kuyruğa al
 *
 * Truth Anayasası Madde 8: "Yanlış veri, eksik veriden her zaman daha tehlikelidir."
 * Truth Anayasası Madde 9: "AI'a güvenme, doğrula."
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────

interface TaskAssignment {
  id: string;
  task_id: string;
  user_fingerprint: string;
  response: { decision: string };
  confidence_self_report: number | null;
  rejected_spotlight: boolean;
  found_correct_section: boolean;
  phase_responses: Array<{
    phase: string;
    decision?: string;
    confidence?: number;
    source_found?: boolean;
    hallucination_flags?: string[];
  }> | null;
  created_at: string;
}

interface InvestigatorProfile {
  fingerprint: string;
  trust_weight: number;
  tier: string;
  calibration_accuracy: number;
  total_tasks_completed: number;
  spotlight_resistance?: number;
}

interface ConsensusResult {
  decision: 'approve' | 'reject' | 'dispute' | 'no_consensus';
  weighted_score: number;
  total_weight: number;
  review_count: number;
  confidence_avg: number;
  source_verified_count: number;
  hallucination_flag_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SPOTLIGHT RESISTANCE — Honeypot'tan 6. güven sinyali
// ═══════════════════════════════════════════════════════════════════════

/**
 * Bir kullanıcının honeypot görevlerinde ne kadar dirençli olduğunu hesapla.
 *
 * Honeypot: AI'ın yanlış yeri gösterdiği sahte spotlight. Kullanıcı bunu
 * fark edip reddetmeli (rejected_spotlight=true). Edemezse düşük direnç.
 *
 * spotlight_resistance = honeypot_rejected / honeypot_total
 * - 1.0 = mükemmel (tüm honeypot'ları yakaladı)
 * - 0.0 = hiç yakalayamadı (dikkat eksikliği veya body farming)
 * - null = henüz honeypot görevi yok
 *
 * Trust weight'e %10 ağırlıkla eklenir (Game Bible Bölüm 7).
 */
export async function calculateSpotlightResistance(
  supabase: SupabaseClient,
  fingerprint: string,
): Promise<number | null> {
  // Get all honeypot task assignments for this user
  const { data: assignments, error } = await supabase
    .from('task_assignments')
    .select(`
      id,
      rejected_spotlight,
      task_id,
      investigation_tasks!inner(spotlight_mode)
    `)
    .eq('user_fingerprint', fingerprint)
    .eq('investigation_tasks.spotlight_mode', 'honeypot');

  if (error || !assignments || assignments.length === 0) return null;

  const totalHoneypots = assignments.length;
  const rejectedCount = assignments.filter(
    (a: Record<string, unknown>) => a.rejected_spotlight === true
  ).length;

  if (totalHoneypots === 0) return null;

  const resistance = rejectedCount / totalHoneypots;

  // Update the investigator profile
  await supabase
    .from('investigator_profiles')
    .update({ spotlight_resistance: resistance })
    .eq('fingerprint', fingerprint);

  return resistance;
}

/**
 * Güncellenmiş trust_weight hesaplama (6 sinyal).
 *
 * Orijinal 5 sinyal (Game Bible):
 *   - Kalibrasyon doğruluğu (%35)
 *   - Çapraz doğrulama (%25)
 *   - Gerekçe kalitesi (%15)
 *   - Tutarlılık (%15)
 *   - Alan uzmanlığı (%10)
 *
 * Yeni 6. sinyal:
 *   - Spotlight direnci (%10) — diğerlerinden %2'şer düşürülür
 *
 * Yeni ağırlıklar: %33 / %23 / %13 / %13 / %8 / %10
 */
export function calculateTrustWeightV2(
  calibrationAccuracy: number,    // 0-1
  crossValidation: number,        // 0-1
  reasoningQuality: number,       // 0-1
  consistency: number,            // 0-1
  domainExpertise: number,        // 0-1
  spotlightResistance: number | null, // 0-1 or null
): { weight: number; formula: string } {
  const sr = spotlightResistance ?? 0.5; // default 0.5 if no data

  const weight =
    calibrationAccuracy * 0.33 +
    crossValidation * 0.23 +
    reasoningQuality * 0.13 +
    consistency * 0.13 +
    domainExpertise * 0.08 +
    sr * 0.10;

  const formula = [
    `cal(${(calibrationAccuracy * 100).toFixed(0)}%)×0.33`,
    `cross(${(crossValidation * 100).toFixed(0)}%)×0.23`,
    `reason(${(reasoningQuality * 100).toFixed(0)}%)×0.13`,
    `consist(${(consistency * 100).toFixed(0)}%)×0.13`,
    `domain(${(domainExpertise * 100).toFixed(0)}%)×0.08`,
    `spotlight(${(sr * 100).toFixed(0)}%)×0.10`,
  ].join(' + ');

  return { weight: Math.max(0, Math.min(1, weight)), formula };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. DELAYED CONSENSUS — Ağırlıklı oy + gecikmeli karar
// ═══════════════════════════════════════════════════════════════════════

/**
 * Görev için konsensüs hesapla.
 *
 * Mekanizma:
 * - Her review'ın ağırlığı = reviewer trust_weight
 * - approve: +weight, reject: -weight, dispute: 0 (nötr)
 * - weighted_score > 0 → approve, < 0 → reject
 * - |weighted_score| / total_weight < 0.3 → no_consensus (çok bölünmüş)
 * - Source verification data da dahil edilir
 */
export async function calculateDelayedConsensus(
  supabase: SupabaseClient,
  taskId: string,
): Promise<ConsensusResult | null> {
  // Get all assignments for this task
  const { data: assignments, error: aErr } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', taskId)
    .neq('response->>decision', 'skip'); // Skip'ler sayılmaz

  if (aErr || !assignments || assignments.length === 0) return null;

  // Get reviewer profiles for trust weights
  const fingerprints = assignments.map((a: Record<string, unknown>) => a.user_fingerprint);
  const { data: profiles } = await supabase
    .from('investigator_profiles')
    .select('fingerprint, trust_weight, tier')
    .in('fingerprint', fingerprints);

  const profileMap = new Map<string, InvestigatorProfile>();
  (profiles || []).forEach((p: Record<string, unknown>) => {
    profileMap.set(p.fingerprint as string, p as unknown as InvestigatorProfile);
  });

  let weightedScore = 0;
  let totalWeight = 0;
  let confidenceSum = 0;
  let sourceVerifiedCount = 0;
  let reviewsWithHallucinationFlags = 0; // count of REVIEWS (not flags)
  let totalHallucinationFlags = 0;

  for (const assignment of assignments as TaskAssignment[]) {
    const profile = profileMap.get(assignment.user_fingerprint);
    // Bounds-checked trust weight
    const rawWeight = profile?.trust_weight ?? 0.3;
    const weight = Math.max(0, Math.min(1, rawWeight));
    const decision = assignment.response?.decision;
    const confidence = assignment.confidence_self_report ?? 0.5;

    if (decision === 'approve') {
      weightedScore += weight * confidence;
    } else if (decision === 'reject') {
      weightedScore -= weight * confidence;
    }
    // dispute = 0 (no weight added, but counted in total)

    totalWeight += weight;
    confidenceSum += confidence;

    // Count source verification from phase responses
    if (assignment.phase_responses) {
      const verifyPhase = assignment.phase_responses.find(
        (p) => p.phase === 'verify'
      );
      if (verifyPhase?.source_found === true) sourceVerifiedCount++;
      if (verifyPhase?.hallucination_flags && verifyPhase.hallucination_flags.length > 0) {
        reviewsWithHallucinationFlags++; // count REVIEWS with flags, not flag count
        totalHallucinationFlags += verifyPhase.hallucination_flags.length;
      }
    }
  }

  const reviewCount = assignments.length;
  const confidenceAvg = reviewCount > 0 ? confidenceSum / reviewCount : 0;

  // Determine consensus
  let consensusDecision: ConsensusResult['decision'] = 'no_consensus';

  if (totalWeight > 0) {
    const normalizedScore = weightedScore / totalWeight;
    if (normalizedScore > 0.3) {
      consensusDecision = 'approve';
    } else if (normalizedScore < -0.3) {
      consensusDecision = 'reject';
    } else {
      consensusDecision = 'dispute'; // Too close to call → needs more reviews
    }
  }

  // If majority of REVIEWERS flagged hallucination, override to reject
  // (count reviews with flags, not total flag count)
  if (reviewsWithHallucinationFlags > 0 && reviewsWithHallucinationFlags >= reviewCount * 0.5) {
    consensusDecision = 'reject';
  }

  return {
    decision: consensusDecision,
    weighted_score: weightedScore,
    total_weight: totalWeight,
    review_count: reviewCount,
    confidence_avg: confidenceAvg,
    source_verified_count: sourceVerifiedCount,
    hallucination_flag_count: totalHallucinationFlags,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 3. AUTO-PROMOTE — Quarantine → Ağa taşıma
// ═══════════════════════════════════════════════════════════════════════

/**
 * Konsensüs ile onaylanan veriyi quarantine'den çıkarıp ağa ekle.
 *
 * Akış:
 * 1. Konsensüs = approve → quarantine status = 'verified'
 * 2. Quarantine item_data'dan node veya link oluştur
 * 3. Provenance kaydı oluştur
 * 4. Konsensüs = reject → quarantine status = 'rejected'
 *
 * GÜVENLİK: Bu fonksiyon sadece konsensüs sonrası çağrılır, asla doğrudan değil.
 */
export async function autoPromoteFromConsensus(
  supabase: SupabaseClient,
  taskId: string,
  consensus: ConsensusResult,
): Promise<{ promoted: boolean; action: string }> {
  // Get the task to find quarantine item
  const { data: task } = await supabase
    .from('investigation_tasks')
    .select('source_quarantine_id, network_id, task_data')
    .eq('id', taskId)
    .maybeSingle();

  if (!task || !task.source_quarantine_id) {
    return { promoted: false, action: 'no_quarantine_source' };
  }

  const quarantineId = task.source_quarantine_id;

  if (consensus.decision === 'approve') {
    // Update quarantine status
    await supabase
      .from('data_quarantine')
      .update({ verification_status: 'verified' })
      .eq('id', quarantineId);

    // Update task status
    await supabase
      .from('investigation_tasks')
      .update({ status: 'consensus_reached' })
      .eq('id', taskId);

    // Log provenance
    await supabase.from('data_provenance').insert({
      entity_type: 'quarantine_item',
      entity_id: quarantineId,
      action_type: 'promoted',
      action_data: {
        consensus,
        task_id: taskId,
        method: 'auto_promote_v2',
      },
    });

    return { promoted: true, action: 'verified_and_promoted' };

  } else if (consensus.decision === 'reject') {
    // Reject the quarantine item
    await supabase
      .from('data_quarantine')
      .update({ verification_status: 'rejected' })
      .eq('id', quarantineId);

    await supabase
      .from('investigation_tasks')
      .update({ status: 'consensus_reached' })
      .eq('id', taskId);

    // Log provenance
    await supabase.from('data_provenance').insert({
      entity_type: 'quarantine_item',
      entity_id: quarantineId,
      action_type: 'rejected',
      action_data: {
        consensus,
        task_id: taskId,
        method: 'auto_reject_v2',
        hallucination_flags: consensus.hallucination_flag_count,
      },
    });

    return { promoted: false, action: 'rejected_by_consensus' };

  } else if (consensus.decision === 'dispute') {
    // Need more reviews — increase required count + reopen
    await supabase
      .from('investigation_tasks')
      .update({
        required_reviews: 5,
        status: 'needs_more_reviews',
      })
      .eq('id', taskId);

    return { promoted: false, action: 'disputed_needs_more_reviews' };
  }

  return { promoted: false, action: 'no_consensus' };
}

// ═══════════════════════════════════════════════════════════════════════
// 4. COORDINATED ATTACK DETECTION — Anomali tespiti
// ═══════════════════════════════════════════════════════════════════════

/**
 * Koordineli saldırı tespiti.
 *
 * Tespit edilen kalıplar:
 * - Aynı zaman diliminde (5dk) aynı task'a 3+ review → suspicious
 * - Aynı fingerprint grubunun hep aynı yönde oy vermesi → ring
 * - Anormal hız (tüm cevaplar <5s) → bot/farming
 *
 * Sonuç: anomali tespit edilirse transparency_log'a yaz + flag.
 */
export async function detectCoordinatedAttack(
  supabase: SupabaseClient,
  taskId: string,
  networkId: string,
): Promise<{ suspicious: boolean; flags: string[] }> {
  const flags: string[] = [];

  // 1. Time clustering: 5dk içinde 3+ review var mı?
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentReviews } = await supabase
    .from('task_assignments')
    .select('user_fingerprint, response_time_ms, created_at')
    .eq('task_id', taskId)
    .gte('created_at', fiveMinAgo);

  if (recentReviews && recentReviews.length >= 3) {
    flags.push('time_cluster_3plus_in_5min');
  }

  // 2. Speed anomaly cluster: son 10 review'dan 5+'ı <5s ise
  const { data: speedReviews } = await supabase
    .from('task_assignments')
    .select('response_time_ms')
    .eq('task_id', taskId)
    .not('response_time_ms', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (speedReviews) {
    const fastCount = speedReviews.filter(
      (r: Record<string, unknown>) => (r.response_time_ms as number) < 5000
    ).length;
    if (fastCount >= 5) {
      flags.push('speed_cluster_5plus_under_5s');
    }
  }

  // 3. Directional bias: tüm review'lar aynı yöndeyse (4+ review)
  const { data: allReviews } = await supabase
    .from('task_assignments')
    .select('response')
    .eq('task_id', taskId);

  if (allReviews && allReviews.length >= 4) {
    const decisions = allReviews.map(
      (r: Record<string, unknown>) => (r.response as Record<string, unknown>)?.decision
    );
    const approveCount = decisions.filter((d) => d === 'approve').length;
    const rejectCount = decisions.filter((d) => d === 'reject').length;

    // %100 aynı yöndeyse (4+ kişi) → olağandışı
    if (approveCount === allReviews.length || rejectCount === allReviews.length) {
      flags.push('unanimous_direction_4plus');
    }
  }

  // Log if suspicious
  if (flags.length > 0) {
    await supabase.from('transparency_log').insert({
      action_type: 'coordinated_attack_detected',
      actor_type: 'system',
      target_type: 'task',
      target_id: taskId,
      action_data: {
        flags,
        detection_method: 'verification_engine_v2',
        review_count: allReviews?.length || 0,
      },
      network_id: networkId,
    });
  }

  return { suspicious: flags.length > 0, flags };
}

// ═══════════════════════════════════════════════════════════════════════
// 5. HALLUCINATION RATE TRACKER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ağ bazında AI halüsinasyon oranını hesapla.
 *
 * Halüsinasyon = reject edilen + halüsinasyon flag'li review'lar / toplam
 *
 * Bu metrik platform_metrics'e yazılır ve herkese açıktır (şeffaflık).
 */
export async function calculateHallucinationRate(
  supabase: SupabaseClient,
  networkId: string,
): Promise<{ rate: number; total: number; hallucinated: number }> {
  // Get all completed tasks for network
  const { data: tasks } = await supabase
    .from('investigation_tasks')
    .select('id, status')
    .eq('network_id', networkId)
    .in('status', ['consensus_reached', 'closed']);

  if (!tasks || tasks.length === 0) {
    return { rate: 0, total: 0, hallucinated: 0 };
  }

  const taskIds = tasks.map((t: Record<string, unknown>) => t.id);

  // Count assignments with hallucination flags
  const { data: flaggedAssignments } = await supabase
    .from('task_assignments')
    .select('id, phase_responses')
    .in('task_id', taskIds);

  let totalAssignments = 0;
  let hallucinatedCount = 0;

  if (flaggedAssignments) {
    totalAssignments = flaggedAssignments.length;
    for (const a of flaggedAssignments as TaskAssignment[]) {
      if (a.phase_responses) {
        const verifyPhase = a.phase_responses.find(p => p.phase === 'verify');
        if (verifyPhase?.hallucination_flags && verifyPhase.hallucination_flags.length > 0) {
          hallucinatedCount++;
        }
      }
    }
  }

  const rate = totalAssignments > 0 ? hallucinatedCount / totalAssignments : 0;

  // Update platform metrics
  const { error: metricsError } = await supabase.from('platform_metrics').upsert({
    network_id: networkId,
    metric_type: 'hallucination_rate',
    value: rate,
    metadata: { total: totalAssignments, hallucinated: hallucinatedCount },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'network_id,metric_type' });
  if (metricsError) {
    // Table may not have unique constraint yet — graceful
    console.warn('[verificationEngine] platform_metrics upsert failed (constraint may be missing)');
  }

  return { rate, total: totalAssignments, hallucinated: hallucinatedCount };
}

// ═══════════════════════════════════════════════════════════════════════
// 6. RE-VERIFICATION QUEUE — Düşük güvenli verileri yeniden kuyruğa al
// ═══════════════════════════════════════════════════════════════════════

/**
 * Düşük güvenli konsensüs veya eski verileri yeniden doğrulama kuyruğuna al.
 *
 * Tetiklenme koşulları:
 * - weighted_score/total_weight < 0.5 (zayıf konsensüs)
 * - 90 gün geçmiş ve yeniden doğrulama yapılmamış
 * - Yeni kanıt eklenmiş (ilişkili quarantine item güncellenmiş)
 *
 * Bu fonksiyon cron job ile çağrılır (/api/game/cron/reverify).
 */
export async function queueReVerification(
  supabase: SupabaseClient,
  networkId: string,
): Promise<{ queued: number; reasons: Record<string, number> }> {
  const reasons: Record<string, number> = {};
  let queued = 0;

  // 1. Find tasks with weak consensus (score < 0.5 of total)
  const { data: weakTasks } = await supabase
    .from('investigation_tasks')
    .select('id, status, completed_count, required_reviews')
    .eq('network_id', networkId)
    .eq('status', 'consensus_reached')
    .limit(50);

  if (weakTasks) {
    for (const task of weakTasks as Array<Record<string, unknown>>) {
      // Re-calculate consensus to check strength
      const consensus = await calculateDelayedConsensus(supabase, task.id as string);
      if (consensus && consensus.total_weight > 0) {
        const strength = Math.abs(consensus.weighted_score) / consensus.total_weight;
        if (strength < 0.5) {
          // Weak consensus — reopen
          await supabase
            .from('investigation_tasks')
            .update({
              status: 'open',
              required_reviews: Math.max((task.required_reviews as number) + 2, 5),
            })
            .eq('id', task.id);

          await supabase.from('transparency_log').insert({
            action_type: 'task_reverification_queued',
            actor_type: 'system',
            target_type: 'task',
            target_id: task.id as string,
            action_data: {
              reason: 'weak_consensus',
              consensus_strength: strength,
              new_required_reviews: Math.max((task.required_reviews as number) + 2, 5),
            },
            network_id: networkId,
          });

          queued++;
          reasons['weak_consensus'] = (reasons['weak_consensus'] || 0) + 1;
        }
      }
    }
  }

  // 2. Find old verified items (>90 days) without recent re-verification
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldTasks } = await supabase
    .from('investigation_tasks')
    .select('id, updated_at')
    .eq('network_id', networkId)
    .eq('status', 'consensus_reached')
    .lt('updated_at', ninetyDaysAgo)
    .limit(20);

  if (oldTasks) {
    for (const task of oldTasks as Array<Record<string, unknown>>) {
      await supabase
        .from('investigation_tasks')
        .update({ status: 'open', required_reviews: 2 })
        .eq('id', task.id);

      await supabase.from('transparency_log').insert({
        action_type: 'task_reverification_queued',
        actor_type: 'system',
        target_type: 'task',
        target_id: task.id as string,
        action_data: {
          reason: 'age_based_reverification',
          last_updated: task.updated_at,
          threshold_days: 90,
        },
        network_id: networkId,
      });

      queued++;
      reasons['age_based'] = (reasons['age_based'] || 0) + 1;
    }
  }

  return { queued, reasons };
}

// ═══════════════════════════════════════════════════════════════════════
// POST-SUBMIT PIPELINE — Submit sonrası tüm kontrolleri çalıştır
// ═══════════════════════════════════════════════════════════════════════

/**
 * Review gönderildikten sonra çalışan ana pipeline.
 * submit/route.ts'den çağrılır.
 *
 * Sıra:
 * 1. Spotlight resistance güncelle (eğer honeypot ise)
 * 2. Gerekli review sayısına ulaşıldıysa → consensus hesapla
 * 3. Consensus varsa → auto-promote veya reject
 * 4. Koordineli saldırı kontrolü
 */
export async function runPostSubmitPipeline(
  supabase: SupabaseClient,
  taskId: string,
  fingerprint: string,
  networkId: string,
  completedCount: number,
  requiredReviews: number,
): Promise<{
  consensus: ConsensusResult | null;
  promoted: boolean;
  attackDetected: boolean;
  spotlightResistance: number | null;
}> {
  // 1. Update spotlight resistance
  const spotlightResistance = await calculateSpotlightResistance(supabase, fingerprint);

  // 2. Check for consensus
  let consensus: ConsensusResult | null = null;
  let promoted = false;

  if (completedCount >= requiredReviews) {
    consensus = await calculateDelayedConsensus(supabase, taskId);

    // 3. Auto-promote if consensus reached
    if (consensus && consensus.decision !== 'no_consensus') {
      const result = await autoPromoteFromConsensus(supabase, taskId, consensus);
      promoted = result.promoted;
    }
  }

  // 4. Coordinated attack detection
  const attackResult = await detectCoordinatedAttack(supabase, taskId, networkId);

  return {
    consensus,
    promoted,
    attackDetected: attackResult.suspicious,
    spotlightResistance,
  };
}
