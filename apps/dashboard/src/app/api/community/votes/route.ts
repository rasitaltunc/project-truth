import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { applyRateLimit, VOTE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Sabit anonymous UUID — her anonymous kullanıcı aynı ID'yi paylaşır
const ANONYMOUS_UUID = '00000000-0000-0000-0000-000000000000';

const EMPTY_STATS = { total: 0, helpful: 0, not_helpful: 0, flagged: 0 };

// ============================================
// GET: Fetch vote statistics for an evidence item
// ============================================
export async function GET(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        if (!supabase) {
            return NextResponse.json(EMPTY_STATS);
        }

        const { searchParams } = new URL(request.url);
        const evidenceId = searchParams.get('evidenceId');

        if (!evidenceId) {
            return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('community_votes')
            .select('id, vote_type, created_at')
            .eq('community_evidence_id', evidenceId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json(EMPTY_STATS);
        }

        const votes = data || [];
        return NextResponse.json({
            total: votes.length,
            helpful: votes.filter((v: any) => v.vote_type === 'helpful').length,
            not_helpful: votes.filter((v: any) => v.vote_type === 'not_helpful').length,
            flagged: votes.filter((v: any) => v.vote_type === 'flag').length,
            votes,
        });
    } catch (error: any) {
        console.error('❌ Community Votes GET CATCH:', error);
        return NextResponse.json(EMPTY_STATS);
    }
}

// ============================================
// POST: Record a vote on community evidence
// Body: { community_evidence_id, voter_id, vote_type }
// vote_type: 'helpful' | 'not_helpful' | 'flag'
// ============================================
export async function POST(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, VOTE_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        let body: any;
        try {
            body = await request.json();
        } catch (parseErr: any) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const {
            community_evidence_id,
            voter_id,
            vote_type,
        } = body;

        // Validation
        if (!community_evidence_id || !voter_id || !vote_type) {
            return NextResponse.json(
                { error: 'community_evidence_id, voter_id, and vote_type are required' },
                { status: 400 }
            );
        }

        if (!['helpful', 'not_helpful', 'flag'].includes(vote_type)) {
            return NextResponse.json(
                { error: 'vote_type must be one of: helpful, not_helpful, flag' },
                { status: 400 }
            );
        }

        // Normalize voter_id: UUID olmalı, string gelirse sabit anonymous UUID kullan
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const normalizedVoterId = (voter_id && isUUID.test(voter_id)) ? voter_id : randomUUID();

        // Insert vote
        const { data: voteData, error: voteError } = await supabase
            .from('community_votes')
            .insert({ community_evidence_id, voter_id: normalizedVoterId, vote_type })
            .select()
            .single();

        if (voteError) {
            // Duplicate vote
            if (voteError.code === '23505') {
                return NextResponse.json(
                    { error: 'You have already voted on this evidence' },
                    { status: 409 }
                );
            }
            // FK violation — evidence_id doesn't exist in community_evidence
            if (voteError.code === '23503') {
                return NextResponse.json(
                    { error: 'Evidence not found in community pool. Only community-submitted evidence can be voted on.' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: voteError.message || 'Failed to record vote' },
                { status: 500 }
            );
        }

        // Update helpful_count (best effort)
        if (vote_type === 'helpful') {
            try {
                const { data: ev } = await supabase
                    .from('community_evidence')
                    .select('helpful_count')
                    .eq('id', community_evidence_id)
                    .single();
                if (ev) {
                    await supabase
                        .from('community_evidence')
                        .update({ helpful_count: (ev.helpful_count || 0) + 1 })
                        .eq('id', community_evidence_id);
                }
            } catch (e: any) {
            }
        }

        // Fetch updated stats
        const { data: allVotes } = await supabase
            .from('community_votes')
            .select('id, vote_type')
            .eq('community_evidence_id', community_evidence_id);

        const votes = allVotes || [];

        return NextResponse.json({
            success: true,
            vote: voteData,
            stats: {
                total: votes.length,
                helpful: votes.filter((v: any) => v.vote_type === 'helpful').length,
                not_helpful: votes.filter((v: any) => v.vote_type === 'not_helpful').length,
                flagged: votes.filter((v: any) => v.vote_type === 'flag').length,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to record vote' },
            { status: 500 }
        );
    }
}
