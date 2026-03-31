# CONSENSUS SCORING IMPLEMENTATION GUIDE
## Step-by-Step Code for Project Truth

**Date:** March 23, 2026
**Target:** All files in `apps/dashboard/src/`
**Language:** TypeScript + PostgreSQL
**Status:** READY TO IMPLEMENT

---

## FILE 1: `lib/consensus/dawid-skene.ts`

Expectation-Maximization algorithm for reviewer quality estimation.

```typescript
/**
 * Dawid-Skene EM Algorithm
 * Estimates reviewer error rates and true labels simultaneously
 */

import * as math from 'mathjs';

interface Review {
  item_id: string;
  reviewer_id: string;
  decision: 'approve' | 'reject' | 'dispute';
}

interface ConfusionMatrix {
  [decided: string]: {
    [true_label: string]: number;
  };
}

interface EMParams {
  itemLabels: Map<string, string>;
  reviewerErrorRates: Map<string, ConfusionMatrix>;
}

const CLASS_LABELS = ['approve', 'reject', 'dispute'];

export function dawidSkeneEM(
  reviews: Review[],
  numIterations: number = 50,
  convergenceThreshold: number = 0.001
): EMParams {

  const itemLabels = new Map<string, string>();
  const reviewerErrorRates = new Map<string, ConfusionMatrix>();

  // === INITIALIZATION ===
  // Start with majority vote

  const itemVotes = new Map<string, Map<string, number>>();
  const reviewerIds = new Set<string>();
  const itemIds = new Set<string>();

  // Count votes per item
  for (const review of reviews) {
    itemIds.add(review.item_id);
    reviewerIds.add(review.reviewer_id);

    if (!itemVotes.has(review.item_id)) {
      itemVotes.set(review.item_id, new Map());
    }

    const voteCount = itemVotes.get(review.item_id)!;
    voteCount.set(
      review.decision,
      (voteCount.get(review.decision) || 0) + 1
    );
  }

  // Get majority vote for each item
  for (const [itemId, votes] of itemVotes.entries()) {
    let maxVotes = 0;
    let majorityLabel = CLASS_LABELS[0];

    for (const label of CLASS_LABELS) {
      const count = votes.get(label) || 0;
      if (count > maxVotes) {
        maxVotes = count;
        majorityLabel = label;
      }
    }

    itemLabels.set(itemId, majorityLabel);
  }

  // Initialize error rates: 90% diagonal, 10% off-diagonal
  for (const reviewerId of reviewerIds) {
    const errorMatrix: ConfusionMatrix = {};

    for (const decided of CLASS_LABELS) {
      errorMatrix[decided] = {};
      for (const true_label of CLASS_LABELS) {
        errorMatrix[decided][true_label] =
          decided === true_label ? 0.90 : 0.05;
      }
    }

    reviewerErrorRates.set(reviewerId, errorMatrix);
  }

  // === EM ITERATIONS ===

  for (let iteration = 0; iteration < numIterations; iteration++) {

    // --- E-STEP ---
    const newItemLabels = new Map<string, string>();

    for (const itemId of itemIds) {
      const itemReviews = reviews.filter(r => r.item_id === itemId);

      let bestLabel: string | null = null;
      let bestLikelihood = -Infinity;

      // Try each possible true label
      for (const trueLabel of CLASS_LABELS) {

        // Calculate P(observations | true_label)
        let logLikelihood = 0;

        for (const review of itemReviews) {
          const reviewer = reviewerErrorRates.get(review.reviewer_id)!;
          const decidedLabel = review.decision;

          const prob = reviewer[decidedLabel]?.[trueLabel] || 0.01;
          logLikelihood += Math.log(Math.max(prob, 1e-10));
        }

        if (logLikelihood > bestLikelihood) {
          bestLikelihood = logLikelihood;
          bestLabel = trueLabel;
        }
      }

      newItemLabels.set(itemId, bestLabel || CLASS_LABELS[0]);
    }

    // Check convergence
    let changed = 0;
    for (const [itemId, label] of newItemLabels) {
      if (itemLabels.get(itemId) !== label) {
        changed++;
      }
    }

    const convergenceRate = changed / itemIds.size;
    if (convergenceRate < convergenceThreshold && iteration > 10) {
      console.log(`EM converged at iteration ${iteration}, rate: ${convergenceRate}`);
      return { itemLabels: newItemLabels, reviewerErrorRates };
    }

    for (const [itemId, label] of newItemLabels) {
      itemLabels.set(itemId, label);
    }

    // --- M-STEP ---
    for (const reviewerId of reviewerIds) {
      const reviewerReviews = reviews.filter(r => r.reviewer_id === reviewerId);
      const newErrorMatrix: ConfusionMatrix = {};

      // Initialize counts
      for (const decided of CLASS_LABELS) {
        newErrorMatrix[decided] = {};
        for (const true_label of CLASS_LABELS) {
          newErrorMatrix[decided][true_label] = 0;
        }
      }

      // Count: how often did reviewer decide X when true was Y?
      for (const review of reviewerReviews) {
        const decidedLabel = review.decision;
        const trueLabel = itemLabels.get(review.item_id) || CLASS_LABELS[0];

        newErrorMatrix[decidedLabel][trueLabel]++;
      }

      // Normalize to probabilities
      for (const decided of CLASS_LABELS) {
        const total = CLASS_LABELS.reduce(
          (sum, label) => sum + (newErrorMatrix[decided][label] || 0),
          0
        );

        for (const true_label of CLASS_LABELS) {
          newErrorMatrix[decided][true_label] =
            total > 0
              ? (newErrorMatrix[decided][true_label] || 0) / total
              : 1 / CLASS_LABELS.length;
        }
      }

      reviewerErrorRates.set(reviewerId, newErrorMatrix);
    }
  }

  return { itemLabels, reviewerErrorRates };
}

export function extractReviewerQuality(errorMatrix: ConfusionMatrix) {
  // Accuracy = diagonal sum / total
  let correctCount = 0;
  let totalCount = 0;

  for (const decided of CLASS_LABELS) {
    for (const true_label of CLASS_LABELS) {
      const count = errorMatrix[decided]?.[true_label] || 0;
      totalCount += count;

      if (decided === true_label) {
        correctCount += count;
      }
    }
  }

  const accuracy = totalCount > 0 ? correctCount / totalCount : 0.5;

  // Precision & Recall
  const precision: Record<string, number> = {};
  const recall: Record<string, number> = {};

  for (const label of CLASS_LABELS) {
    // Precision = TP / (TP + FP) = diagonal / column sum
    const columnSum = CLASS_LABELS.reduce(
      (sum, d) => sum + (errorMatrix[d]?.[label] || 0),
      0
    );
    precision[label] = columnSum > 0 ? errorMatrix[label]?.[label] || 0 / columnSum : 0;

    // Recall = TP / (TP + FN) = diagonal / row sum
    const rowSum = CLASS_LABELS.reduce(
      (sum, tl) => sum + (errorMatrix[label]?.[tl] || 0),
      0
    );
    recall[label] = rowSum > 0 ? errorMatrix[label]?.[label] || 0 / rowSum : 0;
  }

  // F1 Score
  let f1ScoreSum = 0;
  let count = 0;
  for (const label of CLASS_LABELS) {
    const p = precision[label];
    const r = recall[label];
    if (p + r > 0) {
      f1ScoreSum += (2 * p * r) / (p + r);
      count++;
    }
  }

  const f1Score = count > 0 ? f1ScoreSum / count : 0;

  return {
    accuracy: Math.round(accuracy * 10000) / 10000,
    precision,
    recall,
    f1Score: Math.round(f1Score * 10000) / 10000,
  };
}
```

---

## FILE 2: `lib/consensus/dempster-shafer.ts`

Evidence combination across documents.

```typescript
/**
 * Dempster-Shafer Theory of Evidence
 * Combines confidence from multiple sources
 */

export function combineConfidenceDempsterShafer(
  conf1: number,
  conf2: number
): number {
  if (conf1 < 0 || conf1 > 1 || conf2 < 0 || conf2 > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  // Calculate conflict
  const conflict = (conf1 * (1 - conf2)) + ((1 - conf1) * conf2);

  // Complete contradiction
  if (conflict >= 1.0) {
    return 0.0;
  }

  // Combine using Dempster's rule
  const combined = (conf1 * conf2) / (1.0 - conflict);

  // Cap at 0.9999 to avoid overconfidence
  return Math.min(0.9999, combined);
}

/**
 * Combine multiple confidence values
 * Applies DS sequentially
 */
export function combineMultipleConfidences(
  confidences: number[]
): number {
  if (confidences.length === 0) return 0.5;
  if (confidences.length === 1) return confidences[0];

  let result = confidences[0];
  for (let i = 1; i < confidences.length; i++) {
    result = combineConfidenceDempsterShafer(result, confidences[i]);
  }

  return result;
}

/**
 * Calculate conflict between two belief states
 * Useful for detecting source contradictions
 */
export function calculateConflict(
  conf1: number,
  conf2: number
): number {
  return (conf1 * (1 - conf2)) + ((1 - conf1) * conf2);
}

/**
 * Example: Entity verified in multiple documents
 */
export function calculateNetworkEntityConfidence(
  documentConfidences: number[]
): {
  combined: number;
  count: number;
  conflict: number;
} {
  if (documentConfidences.length === 0) {
    return { combined: 0.5, count: 0, conflict: 0 };
  }

  // Start with prior (neutral)
  let combined = 0.5;
  let totalConflict = 0;

  for (const conf of documentConfidences) {
    const conflict = calculateConflict(combined, conf);
    totalConflict += conflict;

    combined = combineConfidenceDempsterShafer(combined, conf);
  }

  // Discount slightly for potential collusion
  combined *= 0.95;

  return {
    combined,
    count: documentConfidences.length,
    conflict: totalConflict / documentConfidences.length,
  };
}
```

---

## FILE 3: `lib/consensus/anti-gaming.ts`

Detect Sybil attacks, coordinated voting, reputation farming.

```typescript
/**
 * Anti-Gaming Detection
 * Sybil, coordinated voting, reputation farming, behavior change
 */

interface Review {
  quarantine_id: string;
  reviewer_fingerprint: string;
  decision: 'approve' | 'reject' | 'dispute';
  created_at: Date;
  confidence: number;
}

interface ReviewerProfile {
  fingerprint: string;
  totalReviews: number;
  accuracy: number;
  reviews: Review[];
}

/**
 * Pearson Correlation - detect identical voting patterns
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b) / n;
  const meanY = y.reduce((a, b) => a + b) / n;

  let numerator = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;

    numerator += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Detect coordinated voting via voting pattern correlation
 */
export function detectCoordinatedVoting(
  profiles: ReviewerProfile[]
): Array<{
  reviewer_a: string;
  reviewer_b: string;
  correlation: number;
  sharedItems: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  const results = [];

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const profileA = profiles[i];
      const profileB = profiles[j];

      // Get shared items
      const itemsA = new Set(profileA.reviews.map(r => r.quarantine_id));
      const itemsB = new Set(profileB.reviews.map(r => r.quarantine_id));
      const shared = Array.from(itemsA).filter(id => itemsB.has(id));

      if (shared.length < 2) continue;  // Need at least 2 shared items

      // Extract votes on shared items (in same order)
      const votesA = shared.map(id => {
        const review = profileA.reviews.find(r => r.quarantine_id === id);
        return review?.decision === 'approve' ? 1 :
               review?.decision === 'reject' ? -1 : 0;
      });

      const votesB = shared.map(id => {
        const review = profileB.reviews.find(r => r.quarantine_id === id);
        return review?.decision === 'approve' ? 1 :
               review?.decision === 'reject' ? -1 : 0;
      });

      const correlation = pearsonCorrelation(votesA, votesB);

      let risk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (correlation > 0.9) risk = 'HIGH';
      else if (correlation > 0.75) risk = 'MEDIUM';

      if (correlation > 0.75) {
        results.push({
          reviewer_a: profileA.fingerprint,
          reviewer_b: profileB.fingerprint,
          correlation: Math.round(correlation * 1000) / 1000,
          sharedItems: shared.length,
          risk,
        });
      }
    }
  }

  return results;
}

/**
 * Detect temporal bursts - many votes from same group in short window
 */
export function detectTemporalBursts(
  reviews: Review[],
  windowMinutes: number = 5,
  minBurstSize: number = 3
): Array<{
  quarantine_id: string;
  reviewers: string[];
  burstSize: number;
  timeSpanMinutes: number;
  risk: string;
}> {
  const byQuarantine = new Map<string, Review[]>();

  for (const review of reviews) {
    if (!byQuarantine.has(review.quarantine_id)) {
      byQuarantine.set(review.quarantine_id, []);
    }
    byQuarantine.get(review.quarantine_id)!.push(review);
  }

  const results = [];

  for (const [quarantineId, itemReviews] of byQuarantine.entries()) {
    // Sort by time
    itemReviews.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    // Sliding window: find consecutive reviews within windowMinutes
    for (let i = 0; i < itemReviews.length; i++) {
      const windowStart = itemReviews[i].created_at;
      const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60000);

      const inWindow = itemReviews.filter(
        r => r.created_at >= windowStart && r.created_at <= windowEnd
      );

      if (inWindow.length >= minBurstSize) {
        const uniqueReviewers = new Set(inWindow.map(r => r.reviewer_fingerprint));

        const timeSpan =
          (inWindow[inWindow.length - 1].created_at.getTime() -
            inWindow[0].created_at.getTime()) /
          60000;

        results.push({
          quarantine_id: quarantineId,
          reviewers: Array.from(uniqueReviewers),
          burstSize: inWindow.length,
          timeSpanMinutes: Math.round(timeSpan * 100) / 100,
          risk: inWindow.length >= 5 ? 'HIGH' : 'MEDIUM',
        });
      }
    }
  }

  return results;
}

/**
 * Detect reputation farming - only verifying easy items
 */
export function detectReputationFarming(
  profiles: ReviewerProfile[],
  difficultyThreshold: number = 0.85
): Array<{
  fingerprint: string;
  easyItemPercent: number;
  avgDifficulty: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  const results = [];

  for (const profile of profiles) {
    if (profile.totalReviews < 10) continue;  // Need >10 reviews

    const difficulties = profile.reviews.map(r => r.confidence / 100);
    const avgDifficulty = difficulties.reduce((a, b) => a + b) / difficulties.length;

    const easyCount = difficulties.filter(d => d > difficultyThreshold).length;
    const easyPercent = easyCount / profile.totalReviews;

    if (easyPercent > 0.8) {
      let risk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (easyPercent > 0.9) risk = 'HIGH';
      else if (easyPercent > 0.85) risk = 'MEDIUM';

      results.push({
        fingerprint: profile.fingerprint,
        easyItemPercent: Math.round(easyPercent * 10000) / 100,
        avgDifficulty: Math.round(avgDifficulty * 1000) / 1000,
        risk,
      });
    }
  }

  return results;
}

/**
 * CUSUM (Cumulative Sum) for behavior change detection
 */
export function detectBehaviorChange(
  reviews: Review[]
): {
  changePoint: Date | null;
  confidence: number;
  analysis: string;
} {
  if (reviews.length < 10) {
    return { changePoint: null, confidence: 0, analysis: 'Insufficient data' };
  }

  // Convert to numeric scores
  const scores = reviews.map(r =>
    r.decision === 'approve' ? 1 :
    r.decision === 'reject' ? -1 : 0
  );

  const mean = scores.reduce((a, b) => a + b) / scores.length;

  // CUSUM
  const cumulativeSum = [0];
  for (let i = 0; i < scores.length; i++) {
    cumulativeSum[i + 1] = cumulativeSum[i] + (scores[i] - mean);
  }

  // Find change point
  let maxAbsCS = 0;
  let changePointIdx = 0;

  for (let i = 1; i < cumulativeSum.length; i++) {
    if (Math.abs(cumulativeSum[i]) > Math.abs(maxAbsCS)) {
      maxAbsCS = cumulativeSum[i];
      changePointIdx = i;
    }
  }

  if (changePointIdx === 0 || changePointIdx === scores.length) {
    return { changePoint: null, confidence: 0, analysis: 'No change detected' };
  }

  // T-test: is change significant?
  const before = scores.slice(0, changePointIdx);
  const after = scores.slice(changePointIdx);

  const meanBefore = before.reduce((a, b) => a + b) / before.length;
  const meanAfter = after.reduce((a, b) => a + b) / after.length;

  const varBefore = before.reduce((sum, x) => sum + (x - meanBefore) ** 2, 0) / before.length;
  const varAfter = after.reduce((sum, x) => sum + (x - meanAfter) ** 2, 0) / after.length;

  const pooledStd = Math.sqrt((varBefore + varAfter) / 2);
  const tStat = (meanAfter - meanBefore) / (pooledStd / Math.sqrt(before.length));

  // Rough p-value (2-tailed, df ~= 20)
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));

  return {
    changePoint: reviews[changePointIdx]?.created_at || null,
    confidence: Math.max(0, 1 - pValue),
    analysis:
      meanAfter > meanBefore
        ? 'Behavior shifted toward approval (more trusting)'
        : 'Behavior shifted toward rejection (more skeptical)',
  };
}

/**
 * Normal CDF approximation
 */
function normalCDF(z: number): number {
  // Approximation for standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);

  const t = 1.0 / (1.0 + p * absZ);
  const y =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t *
      Math.exp(-absZ * absZ));

  return 0.5 * (1.0 + sign * y);
}
```

---

## FILE 4: `lib/consensus/quorum.ts`

Dynamic quorum determination.

```typescript
/**
 * Dynamic Quorum Determination
 * Calculates optimal number of reviews needed
 */

interface QuarantineItemContext {
  ai_confidence: number;           // 0-1
  item_type: 'entity' | 'relationship' | 'date' | 'claim';
  current_review_count: number;
  current_reviews: Array<{
    decision: 'approve' | 'reject' | 'dispute';
    confidence: number;
    reviewer_accuracy?: number;
  }>;
}

export function calculateRequiredReviews(
  context: QuarantineItemContext
): {
  required: number;
  base: number;
  difficulty_penalty: number;
  disagreement_penalty: number;
  quality_penalty: number;
  reasoning: string;
} {
  let base_reviews = 3;

  // === DIFFICULTY PENALTY ===
  let difficulty_penalty = 0;
  if (context.ai_confidence > 0.85) {
    difficulty_penalty = 0;  // Easy: structural data
  } else if (context.ai_confidence > 0.70) {
    difficulty_penalty = 1;  // Medium: AI-assisted
  } else {
    difficulty_penalty = 2;  // Hard: speculative
  }

  // === DISAGREEMENT PENALTY ===
  let disagreement_penalty = 0;
  if (context.current_review_count >= 2) {
    const decisions = context.current_reviews.map(r => r.decision);
    const uniqueDecisions = new Set(decisions).size;

    if (uniqueDecisions === 1) {
      // All agree
      disagreement_penalty = 0;
    } else if (uniqueDecisions === 2) {
      // Some disagreement
      disagreement_penalty = 1;
    } else {
      // High disagreement (all 3 options present)
      disagreement_penalty = 2;
    }

    // Extra penalty if unanimous but low confidence
    if (
      uniqueDecisions === 1 &&
      context.current_reviews.every(r => r.confidence < 50)
    ) {
      disagreement_penalty += 2;
    }
  }

  // === QUALITY PENALTY ===
  let quality_penalty = 0;
  if (context.current_review_count > 0) {
    const reviewerAccuracies = context.current_reviews
      .map(r => r.reviewer_accuracy || 0.7)
      .filter(a => a > 0);

    const avgAccuracy =
      reviewerAccuracies.length > 0
        ? reviewerAccuracies.reduce((a, b) => a + b) / reviewerAccuracies.length
        : 0.7;

    if (avgAccuracy >= 0.80) {
      quality_penalty = 0;
    } else if (avgAccuracy >= 0.70) {
      quality_penalty = 1;
    } else if (avgAccuracy >= 0.60) {
      quality_penalty = 2;
    } else {
      // Too low quality
      quality_penalty = 5;
    }
  }

  const required = Math.min(
    base_reviews + difficulty_penalty + disagreement_penalty + quality_penalty,
    9  // Cap at 9 (diminishing returns)
  );

  const reasoning =
    `Base ${base_reviews} + difficulty [${difficulty_penalty}] + ` +
    `disagreement [${disagreement_penalty}] + quality [${quality_penalty}]`;

  return {
    required,
    base: base_reviews,
    difficulty_penalty,
    disagreement_penalty,
    quality_penalty,
    reasoning,
  };
}

/**
 * Determine final decision based on reviews
 */
export function calculateConsensusDecision(
  approval_count: number,
  reject_count: number,
  dispute_count: number,
  total_reviews: number,
  required_reviews: number,
  ai_confidence: number
): {
  status: 'VERIFIED' | 'WEAK_APPROVAL' | 'DISPUTED' | 'REJECTED';
  approval_score: number;
  approval_ratio: number;
  recommendation: string;
} {
  const approval_ratio = approval_count / total_reviews;
  const approval_score = (approval_count - reject_count) / total_reviews;

  // Decision logic
  let status: 'VERIFIED' | 'WEAK_APPROVAL' | 'DISPUTED' | 'REJECTED';
  let recommendation: string;

  if (
    approval_count >= required_reviews * 0.66 &&
    (approval_score > 0.6 || ai_confidence > 0.9)
  ) {
    status = 'VERIFIED';
    recommendation = 'Ready to promote to network';
  } else if (approval_count >= 1 && approval_score > 0) {
    status = 'WEAK_APPROVAL';
    recommendation = 'Promote with "unverified" flag; needs more evidence';
  } else if (approval_score > -0.2 && approval_score < 0.2) {
    status = 'DISPUTED';
    recommendation = 'Stay in quarantine; request expert panel review';
  } else {
    status = 'REJECTED';
    recommendation = 'Archive as rejected; unlikely to recover';
  }

  return {
    status,
    approval_score: Math.round(approval_score * 1000) / 1000,
    approval_ratio: Math.round(approval_ratio * 1000) / 1000,
    recommendation,
  };
}
```

---

## FILE 5: `app/api/quarantine/consensus/route.ts`

API endpoint for consensus calculation.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateRequiredReviews, calculateConsensusDecision } from '@/lib/consensus/quorum';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quarantine_id = searchParams.get('quarantine_id');

    if (!quarantine_id) {
      return NextResponse.json(
        { error: 'quarantine_id required' },
        { status: 400 }
      );
    }

    // Get quarantine item
    const { data: quarantine, error: qError } = await supabase
      .from('data_quarantine')
      .select('*')
      .eq('id', quarantine_id)
      .single();

    if (qError || !quarantine) {
      return NextResponse.json(
        { error: 'Quarantine item not found' },
        { status: 404 }
      );
    }

    // Get all reviews for this item
    const { data: reviews, error: rError } = await supabase
      .from('quarantine_reviews')
      .select(
        `
        *,
        reviewer_quality:reviewer_fingerprint (
          accuracy,
          expertise_areas,
          sybil_score
        )
      `
      )
      .eq('quarantine_id', quarantine_id);

    if (rError) {
      return NextResponse.json(
        { error: rError.message },
        { status: 500 }
      );
    }

    // Count decisions
    const approval_count = reviews?.filter(r => r.decision === 'approve').length || 0;
    const reject_count = reviews?.filter(r => r.decision === 'reject').length || 0;
    const dispute_count = reviews?.filter(r => r.decision === 'dispute').length || 0;
    const total_reviews = reviews?.length || 0;

    // Calculate required reviews
    const quorumResult = calculateRequiredReviews({
      ai_confidence: quarantine.confidence,
      item_type: quarantine.item_type,
      current_review_count: total_reviews,
      current_reviews: reviews?.map(r => ({
        decision: r.decision,
        confidence: r.confidence,
        reviewer_accuracy: r.reviewer_quality?.[0]?.accuracy || 0.7,
      })) || [],
    });

    // Calculate consensus
    const consensusResult = calculateConsensusDecision(
      approval_count,
      reject_count,
      dispute_count,
      total_reviews,
      quorumResult.required,
      quarantine.confidence
    );

    // Save to history
    await supabase.from('consensus_history').insert({
      quarantine_id,
      review_count: total_reviews,
      approval_count,
      reject_count,
      dispute_count,
      consensus_score: consensusResult.approval_score,
      required_reviews: quorumResult.required,
      difficulty_level:
        quarantine.confidence > 0.85 ? 'EASY' :
        quarantine.confidence > 0.70 ? 'MEDIUM' : 'HARD',
      final_decision: consensusResult.status,
      final_status: consensusResult.status,
    });

    return NextResponse.json({
      quarantine_id,
      review_count: total_reviews,
      required_reviews: quorumResult.required,

      approval_count,
      reject_count,
      dispute_count,

      consensus_score: consensusResult.approval_score,
      approval_ratio: consensusResult.approval_ratio,

      status: consensusResult.status,
      recommendation: consensusResult.recommendation,

      quorum_breakdown: {
        base: quorumResult.base,
        difficulty_penalty: quorumResult.difficulty_penalty,
        disagreement_penalty: quorumResult.disagreement_penalty,
        quality_penalty: quorumResult.quality_penalty,
        reasoning: quorumResult.reasoning,
      },
    });

  } catch (error) {
    console.error('Consensus calculation error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
```

---

## FILE 6: `app/api/cron/recalculate-reviewer-quality.ts`

Daily cron job for Dawid-Skene EM.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dawidSkeneEM, extractReviewerQuality } from '@/lib/consensus/dawid-skene';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validate cron token
function validateCronToken(request: NextRequest): boolean {
  const token = request.headers.get('Authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || token !== `Bearer ${expectedToken}`) {
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  // Validate token
  if (!validateCronToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting Dawid-Skene EM calculation...');

    // Get all reviews from past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reviews, error: fetchError } = await supabase
      .from('quarantine_reviews')
      .select('quarantine_id, reviewer_fingerprint, decision')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        message: 'No reviews found',
        updated_count: 0,
      });
    }

    // Run EM algorithm
    const emResult = dawidSkeneEM(
      reviews.map(r => ({
        item_id: r.quarantine_id,
        reviewer_id: r.reviewer_fingerprint,
        decision: r.decision as any,
      })),
      50  // iterations
    );

    // Update reviewer quality profiles
    let updatedCount = 0;
    let flaggedCount = 0;

    for (const [fingerprint, errorMatrix] of emResult.reviewerErrorRates.entries()) {
      const quality = extractReviewerQuality(errorMatrix);

      const { error } = await supabase
        .from('reviewer_quality_profiles')
        .upsert({
          reviewer_fingerprint: fingerprint,
          accuracy: quality.accuracy,
          f1_score: quality.f1Score,
          error_matrix: errorMatrix,
          precision_json: quality.precision,
          recall_json: quality.recall,
          last_updated_at: new Date().toISOString(),
          flagged_for_review: quality.accuracy < 0.60,
          flag_reason:
            quality.accuracy < 0.60
              ? `Low accuracy: ${(quality.accuracy * 100).toFixed(1)}%`
              : null,
        });

      if (!error) {
        updatedCount++;

        if (quality.accuracy < 0.60) {
          flaggedCount++;
        }
      }
    }

    console.log(`EM calculation complete: ${updatedCount} profiles updated, ${flaggedCount} flagged`);

    return NextResponse.json({
      message: 'Dawid-Skene EM calculation completed',
      updated_count: updatedCount,
      flagged_count: flaggedCount,
      reviews_processed: reviews.length,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
```

---

## DEPLOYMENT CHECKLIST

- [ ] Create database tables (reviewer_quality_profiles, consensus_history, review_appeals)
- [ ] Deploy lib/consensus/*.ts files
- [ ] Deploy API routes (quarantine/consensus, cron jobs)
- [ ] Create Supabase scheduled function for daily cron job execution
- [ ] Test Dawid-Skene EM with sample data (20+ reviews)
- [ ] Test consensus calculation endpoint
- [ ] Set up monitoring/alerting for cron failures
- [ ] Document runbooks for each failure scenario
- [ ] Train support team on interpretation of metrics

---

**Status:** Ready to implement
**Estimated Time:** 3-4 weeks for full deployment
