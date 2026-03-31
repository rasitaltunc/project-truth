// ============================================
// TRUTH PROTOCOL - Verification System
// Topluluk doğrulama ve güven yükseltme
// ============================================

import { supabase } from './auth';
import { TrustLevel } from './auth';

// ============================================
// TYPES
// ============================================

export interface VerificationVote {
    evidenceId: string;
    voterId: string;
    voteType: 'verify' | 'dispute' | 'flag';
    confidence: number; // 1-100
    reasoning?: string;
}

export interface EvidenceVerificationStatus {
    evidenceId: string;
    totalVotes: number;
    verifyVotes: number;
    disputeVotes: number;
    flagVotes: number;
    weightedScore: number;
    status: 'pending' | 'verified' | 'disputed' | 'flagged';
    confidenceLevel: number;
}

export interface TrustUpgradeRequest {
    userId: string;
    currentLevel: TrustLevel;
    requestedLevel: TrustLevel;
    evidence: {
        type: string;
        data: any;
    }[];
}

// ============================================
// VOTING SYSTEM
// ============================================

/**
 * Submit a verification vote
 */
export async function submitVerificationVote(
    vote: VerificationVote
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if user already voted
        const { data: existingVote } = await supabase
            .from('evidence_votes')
            .select('id')
            .eq('evidence_id', vote.evidenceId)
            .eq('voter_id', vote.voterId)
            .single();

        if (existingVote) {
            return { success: false, error: 'Bu kanıt için zaten oy kullandınız' };
        }

        // Get voter's trust level for weighted voting
        const { data: voter } = await supabase
            .from('truth_users')
            .select('trust_level, reputation_score')
            .eq('id', vote.voterId)
            .single();

        const voteWeight = calculateVoteWeight(voter?.trust_level || 0, voter?.reputation_score || 0);

        // Insert vote
        const { error } = await supabase
            .from('evidence_votes')
            .insert({
                evidence_id: vote.evidenceId,
                voter_id: vote.voterId,
                vote_type: vote.voteType,
                confidence: vote.confidence,
                reasoning: vote.reasoning,
                vote_weight: voteWeight
            });

        if (error) throw error;

        // Update evidence verification status
        await updateEvidenceVerificationStatus(vote.evidenceId);

        // Record contribution
        await supabase
            .from('user_contributions')
            .insert({
                user_id: vote.voterId,
                contribution_type: 'verification_vote',
                reference_table: 'evidence_votes',
                reference_id: vote.evidenceId,
                status: 'approved',
                impact_score: 2
            });

        return { success: true };

    } catch (err: any) {
        console.error('Vote submission error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Calculate vote weight based on trust level and reputation
 */
function calculateVoteWeight(trustLevel: number, reputation: number): number {
    // Base weight from trust level
    const trustWeights: Record<number, number> = {
        0: 0.5,  // Anonim
        1: 1.0,  // Doğrulanmış İnsan
        2: 1.5,  // Doğrulanmış Tanık
        3: 2.0,  // Doğrulanmış İçeriden
        4: 3.0   // İsimli Kaynak
    };

    const baseWeight = trustWeights[trustLevel] || 0.5;

    // Reputation bonus (max +1.0)
    const reputationBonus = Math.min(reputation / 500, 1.0);

    return baseWeight + reputationBonus;
}

/**
 * Update evidence verification status based on votes
 */
async function updateEvidenceVerificationStatus(evidenceId: string): Promise<void> {
    // Get all votes for this evidence
    const { data: votes } = await supabase
        .from('evidence_votes')
        .select('vote_type, confidence, vote_weight')
        .eq('evidence_id', evidenceId);

    if (!votes || votes.length === 0) return;

    // Calculate weighted scores
    let verifyScore = 0;
    let disputeScore = 0;
    let flagScore = 0;
    let totalWeight = 0;

    for (const vote of votes) {
        const weight = vote.vote_weight * (vote.confidence / 100);
        totalWeight += vote.vote_weight;

        if (vote.vote_type === 'verify') {
            verifyScore += weight;
        } else if (vote.vote_type === 'dispute') {
            disputeScore += weight;
        } else if (vote.vote_type === 'flag') {
            flagScore += weight;
        }
    }

    // Determine status
    let newStatus = 'pending';
    const verifyRatio = verifyScore / (totalWeight || 1);
    const disputeRatio = disputeScore / (totalWeight || 1);
    const flagRatio = flagScore / (totalWeight || 1);

    if (votes.length >= 5) { // Minimum votes required
        if (flagRatio > 0.5) {
            newStatus = 'flagged';
        } else if (disputeRatio > 0.5) {
            newStatus = 'disputed';
        } else if (verifyRatio > 0.6) {
            newStatus = 'community_verified';
        }
    }

    // Update evidence
    await supabase
        .from('evidence_archive')
        .update({
            verification_status: newStatus,
            community_score: Math.round(verifyRatio * 100),
            vote_count: votes.length
        })
        .eq('id', evidenceId);
}

// ============================================
// TRUST LEVEL UPGRADES
// ============================================

/**
 * Request trust level upgrade
 */
export async function requestTrustUpgrade(
    request: TrustUpgradeRequest
): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
        // Validate upgrade path
        if (request.requestedLevel !== request.currentLevel + 1) {
            return { success: false, error: 'Sadece bir seviye yükseltilebilir' };
        }

        // Check requirements for requested level
        const requirementsMet = await checkUpgradeRequirements(
            request.userId,
            request.requestedLevel
        );

        if (!requirementsMet.eligible) {
            return { success: false, error: requirementsMet.reason };
        }

        // Create verification request
        const { data: verification, error } = await supabase
            .from('user_verifications')
            .insert({
                user_id: request.userId,
                verification_type: `trust_upgrade_${request.requestedLevel}`,
                verification_data: { evidence: request.evidence },
                status: 'pending'
            })
            .select('id')
            .single();

        if (error) throw error;

        return { success: true, verificationId: verification.id };

    } catch (err: any) {
        console.error('Trust upgrade error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Check if user meets requirements for trust level upgrade
 */
async function checkUpgradeRequirements(
    userId: string,
    requestedLevel: TrustLevel
): Promise<{ eligible: boolean; reason?: string }> {
    // Get user stats
    const { data: user } = await supabase
        .from('truth_users')
        .select('*')
        .eq('id', userId)
        .single();

    if (!user) {
        return { eligible: false, reason: 'Kullanıcı bulunamadı' };
    }

    // Requirements for each level
    const requirements: Record<number, { minContributions: number; minVerified: number; minReputation: number; special?: string }> = {
        1: { minContributions: 0, minVerified: 0, minReputation: 0 }, // Just need human verification
        2: { minContributions: 5, minVerified: 3, minReputation: 30, special: 'location_proof' },
        3: { minContributions: 20, minVerified: 15, minReputation: 200, special: 'institutional_proof' },
        4: { minContributions: 50, minVerified: 40, minReputation: 500, special: 'identity_revealed' }
    };

    const req = requirements[requestedLevel];
    if (!req) {
        return { eligible: false, reason: 'Geçersiz seviye' };
    }

    if (user.contributions_count < req.minContributions) {
        return { eligible: false, reason: `En az ${req.minContributions} katkı gerekli` };
    }

    if (user.verified_contributions < req.minVerified) {
        return { eligible: false, reason: `En az ${req.minVerified} doğrulanmış katkı gerekli` };
    }

    if (user.reputation_score < req.minReputation) {
        return { eligible: false, reason: `En az ${req.minReputation} itibar puanı gerekli` };
    }

    return { eligible: true };
}

/**
 * Process a trust upgrade verification (admin/system)
 */
export async function processTrustUpgrade(
    verificationId: string,
    approved: boolean,
    reviewerId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get verification details
        const { data: verification } = await supabase
            .from('user_verifications')
            .select('*')
            .eq('id', verificationId)
            .single();

        if (!verification) {
            return { success: false, error: 'Doğrulama bulunamadı' };
        }

        // Update verification status
        await supabase
            .from('user_verifications')
            .update({
                status: approved ? 'verified' : 'rejected',
                verified_at: approved ? new Date().toISOString() : null
            })
            .eq('id', verificationId);

        // If approved, upgrade user's trust level
        if (approved) {
            const newLevel = parseInt(verification.verification_type.split('_').pop() || '0');

            await supabase
                .from('truth_users')
                .update({
                    trust_level: newLevel,
                    updated_at: new Date().toISOString()
                })
                .eq('id', verification.user_id);
        }

        return { success: true };

    } catch (err: any) {
        console.error('Trust upgrade process error:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// CROSS-REFERENCE DETECTION
// ============================================

/**
 * Find potential cross-references between evidence
 */
export async function findCrossReferences(
    evidenceId: string
): Promise<{ matches: CrossReference[]; error?: string }> {
    try {
        // Get the evidence
        const { data: evidence } = await supabase
            .from('evidence_archive')
            .select('*')
            .eq('id', evidenceId)
            .single();

        if (!evidence) {
            return { matches: [], error: 'Kanıt bulunamadı' };
        }

        // Find other evidence with similar content
        // This is a simple implementation - in production, use vector similarity
        const { data: potentialMatches } = await supabase
            .from('evidence_archive')
            .select('*')
            .neq('id', evidenceId)
            .or(`source_name.ilike.%${evidence.source_name}%,title.ilike.%${evidence.title.split(' ')[0]}%`);

        const matches: CrossReference[] = [];

        for (const match of potentialMatches || []) {
            const similarity = calculateSimilarity(evidence, match);
            if (similarity > 0.3) {
                matches.push({
                    evidenceId: match.id,
                    title: match.title,
                    similarity,
                    matchType: similarity > 0.7 ? 'strong' : 'potential'
                });
            }
        }

        return { matches };

    } catch (err: any) {
        console.error('Cross-reference error:', err);
        return { matches: [], error: err.message };
    }
}

interface CrossReference {
    evidenceId: string;
    title: string;
    similarity: number;
    matchType: 'strong' | 'potential';
}

/**
 * Simple similarity calculation
 */
function calculateSimilarity(a: any, b: any): number {
    let score = 0;
    let checks = 0;

    // Same source
    if (a.source_name && b.source_name) {
        checks++;
        if (a.source_name.toLowerCase() === b.source_name.toLowerCase()) {
            score += 0.3;
        }
    }

    // Same date
    if (a.source_date && b.source_date && a.source_date === b.source_date) {
        score += 0.2;
        checks++;
    }

    // Same type
    if (a.evidence_type === b.evidence_type) {
        score += 0.1;
        checks++;
    }

    // Same node (different evidence for same person)
    if (a.node_id === b.node_id) {
        score += 0.2;
        checks++;
    }

    // Title word overlap
    const titleWordsA: Set<string> = new Set((a.title || '').toLowerCase().split(/\s+/));
    const titleWordsB: Set<string> = new Set((b.title || '').toLowerCase().split(/\s+/));
    let overlap = 0;
    for (const word of titleWordsA) {
        if (titleWordsB.has(word) && word.length > 3) overlap++;
    }
    if (titleWordsA.size > 0) {
        score += Math.min(overlap / titleWordsA.size, 0.2);
    }

    return score;
}

// ============================================
// VERIFICATION STATS
// ============================================

/**
 * Get verification statistics for an evidence
 */
export async function getVerificationStats(
    evidenceId: string
): Promise<EvidenceVerificationStatus | null> {
    const { data: votes } = await supabase
        .from('evidence_votes')
        .select('vote_type, confidence, vote_weight')
        .eq('evidence_id', evidenceId);

    if (!votes) return null;

    let verifyVotes = 0;
    let disputeVotes = 0;
    let flagVotes = 0;
    let weightedScore = 0;
    let totalWeight = 0;

    for (const vote of votes) {
        if (vote.vote_type === 'verify') verifyVotes++;
        else if (vote.vote_type === 'dispute') disputeVotes++;
        else if (vote.vote_type === 'flag') flagVotes++;

        const weight = vote.vote_weight * (vote.confidence / 100);
        if (vote.vote_type === 'verify') {
            weightedScore += weight;
        } else {
            weightedScore -= weight;
        }
        totalWeight += vote.vote_weight;
    }

    const confidenceLevel = totalWeight > 0 ? (weightedScore / totalWeight + 1) * 50 : 50;

    let status: EvidenceVerificationStatus['status'] = 'pending';
    if (votes.length >= 5) {
        if (flagVotes / votes.length > 0.5) status = 'flagged';
        else if (disputeVotes / votes.length > 0.5) status = 'disputed';
        else if (verifyVotes / votes.length > 0.6) status = 'verified';
    }

    return {
        evidenceId,
        totalVotes: votes.length,
        verifyVotes,
        disputeVotes,
        flagVotes,
        weightedScore,
        status,
        confidenceLevel
    };
}
