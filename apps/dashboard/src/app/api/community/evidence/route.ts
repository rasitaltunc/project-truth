import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

// ============================================
// GET: Fetch community evidence for a node
// Query params: nodeId, status (optional), limit (optional)
// ============================================
export async function GET(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId');
        const status = searchParams.get('status') || 'all'; // pending | rejected | promoted | all
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!nodeId) {
            return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
        }

        if (!supabase) {
            return NextResponse.json({ evidence: [], count: 0, nodeId });
        }

        let query = supabase
            .from('community_evidence')
            .select('*')
            .eq('node_id', nodeId)
            .order('helpful_count', { ascending: false })
            .limit(limit);

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            // Return empty array gracefully for any error
            return NextResponse.json({ evidence: [], count: 0, nodeId });
        }

        return NextResponse.json({
            evidence: data || [],
            count: data?.length || 0,
            nodeId,
        });
    } catch (error: any) {
        console.error('❌ Community Evidence GET:', error);
        return safeErrorResponse('GET /api/community/evidence', error);
    }
}

// ============================================
// POST: Submit community evidence for a node
// Body: { node_id, evidence_type, title, description, source_name, source_url, submitted_by }
// Writes to community_evidence table only (NOT evidence_archive)
// ============================================
export async function POST(request: NextRequest) {
    // Rate limiting
    const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const body = await request.json();
        const {
            node_id,
            evidence_type = 'document',
            title,
            description,
            source_name,
            source_url,
            submitted_by = null,
        } = body;

        // Validation
        if (!node_id || !title || !source_name) {
            return NextResponse.json(
                { error: 'node_id, title, and source_name are required' },
                { status: 400 }
            );
        }

        // Helper: Check if string is valid UUID
        const isValidUUID = (str: string): boolean => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
        };

        // Convert non-UUID submitted_by to 'anonymous'
        const normalizedSubmittedBy = submitted_by && isValidUUID(submitted_by) ? submitted_by : 'anonymous';

        // Rate limiting: max 20 submissions per hour per user
        if (normalizedSubmittedBy !== 'anonymous') {
            try {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { count } = await supabase
                    .from('community_evidence')
                    .select('id', { count: 'exact', head: true })
                    .eq('submitted_by', normalizedSubmittedBy)
                    .gte('created_at', oneHourAgo);

                if ((count || 0) >= 20) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded: maximum 20 submissions per hour' },
                        { status: 429 }
                    );
                }
            } catch (err: any) {
                // Continue anyway - don't block the submission if rate limit fails
            }
        }

        // Insert into community_evidence
        let evidenceData: any;
        try {
            const { data, error } = await supabase
                .from('community_evidence')
                .insert({
                    node_id,
                    evidence_type,
                    title,
                    description,
                    source_name,
                    source_url,
                    submitted_by: normalizedSubmittedBy,
                    status: 'pending',
                    vote_count: 0,
                    vote_weight: 0,
                    helpful_count: 0,
                })
                .select()
                .single();

            if (error) {
                // Table doesn't exist
                if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                    return NextResponse.json(
                        { error: 'Community evidence table not configured' },
                        { status: 503 }
                    );
                }
                throw error;
            }
            evidenceData = data;
        } catch (err: any) {
            if (err.message?.includes('does not exist')) {
                return NextResponse.json(
                    { error: 'Community evidence table not configured' },
                    { status: 503 }
                );
            }
            throw err;
        }

        return NextResponse.json({
            success: true,
            evidence: evidenceData,
            message: 'Evidence submitted to community pool. Will be reviewed by journalists.',
        });
    } catch (error: any) {
        console.error('❌ Community Evidence POST:', error);
        return safeErrorResponse('POST /api/community/evidence', error);
    }
}
