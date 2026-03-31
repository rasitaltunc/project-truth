import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

// Minimum trust level to promote evidence
const MIN_PROMOTER_TRUST = 2; // Verified Witness+

// ============================================
// GET: Promote'a hazır kanıtları listele
// (vote_weight threshold'u geçenler)
// ============================================
export async function GET(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const threshold = parseFloat(searchParams.get('threshold') || '20');
        const limit = parseInt(searchParams.get('limit') || '50');

        const { data, error } = await supabase!
            .from('community_evidence')
            .select('*')
            .eq('status', 'pending')
            .eq('is_flagged', false)
            .gte('vote_weight', threshold)
            .order('vote_weight', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return NextResponse.json({
            ready_for_review: data || [],
            count: data?.length || 0,
            threshold,
        });
    } catch (error: any) {
        return safeErrorResponse('GET /api/community/promote', error);
    }
}

// ============================================
// POST: Topluluk kanıtını core ağa promote et
// → community_evidence → evidence_archive kopyalar
// → Sadece gazeteci/admin (trust_level >= 2) yapabilir
// ============================================
export async function POST(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const body = await request.json();
        const {
            community_evidence_id,
            promoted_by,       // User ID of journalist/admin
            reviewer_notes,    // Why this is being promoted
        } = body;

        if (!community_evidence_id || !promoted_by) {
            return NextResponse.json(
                { error: 'community_evidence_id ve promoted_by zorunludur' },
                { status: 400 }
            );
        }

        // 1. Verify promoter's trust level
        const { data: promoter } = await supabase!
            .from('truth_users')
            .select('trust_level, reputation_score')
            .eq('id', promoted_by)
            .single();

        if (!promoter || (promoter.trust_level || 0) < MIN_PROMOTER_TRUST) {
            return NextResponse.json(
                { error: `Promote yetkiniz yok. Minimum trust level: ${MIN_PROMOTER_TRUST} (Verified Witness)` },
                { status: 403 }
            );
        }

        // 2. Get the community evidence
        const { data: communityEvidence, error: fetchError } = await supabase!
            .from('community_evidence')
            .select('*')
            .eq('id', community_evidence_id)
            .single();

        if (fetchError || !communityEvidence) {
            return NextResponse.json({ error: 'Kanıt bulunamadı' }, { status: 404 });
        }

        if (communityEvidence.status === 'promoted') {
            return NextResponse.json({ error: 'Bu kanıt zaten promote edilmiş' }, { status: 409 });
        }

        // 3. Copy to evidence_archive (CORE NETWORK)
        const { data: coreEvidence, error: insertError } = await supabase!
            .from('evidence_archive')
            .insert({
                node_id: communityEvidence.node_id,
                evidence_type: communityEvidence.evidence_type,
                title: communityEvidence.title,
                description: communityEvidence.description,
                source_name: communityEvidence.source_name,
                source_url: communityEvidence.source_url,
                source_date: communityEvidence.source_date,
                source_of_truth: 'community_verified',
                verification_status: 'community_verified',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Update community_evidence status
        await supabase!
            .from('community_evidence')
            .update({
                status: 'promoted',
                promoted_to_evidence_id: coreEvidence.id,
                promoted_by,
                promoted_at: new Date().toISOString(),
                moderation_notes: reviewer_notes,
                moderated_by: promoted_by,
                moderated_at: new Date().toISOString(),
            })
            .eq('id', community_evidence_id);

        // 5. Reward original submitter (+50 reputation)
        if (communityEvidence.submitted_by) {
            const { data: submitter } = await supabase!
                .from('truth_users')
                .select('reputation_score')
                .eq('id', communityEvidence.submitted_by)
                .single();

            if (submitter) {
                await supabase!
                    .from('truth_users')
                    .update({
                        reputation_score: (submitter.reputation_score || 0) + 50,
                    })
                    .eq('id', communityEvidence.submitted_by);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Kanıt ana ağa başarıyla yükseltildi',
            core_evidence_id: coreEvidence.id,
            community_evidence_id,
            promoted_by,
        });
    } catch (error: any) {
        return safeErrorResponse('POST /api/community/promote', error);
    }
}

// ============================================
// PATCH: Topluluk kanıtını reddet
// ============================================
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            community_evidence_id,
            moderated_by,
            moderation_notes,
            action, // 'reject'
        } = body;

        if (!community_evidence_id || !moderated_by || action !== 'reject') {
            return NextResponse.json(
                { error: 'community_evidence_id, moderated_by ve action=reject zorunludur' },
                { status: 400 }
            );
        }

        const { error } = await supabase!
            .from('community_evidence')
            .update({
                status: 'rejected',
                moderation_notes,
                moderated_by,
                moderated_at: new Date().toISOString(),
            })
            .eq('id', community_evidence_id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Kanıt reddedildi',
        });
    } catch (error: any) {
        return safeErrorResponse('PATCH /api/community/promote', error);
    }
}
