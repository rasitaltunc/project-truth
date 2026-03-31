import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { fetchCourtEvidence, searchCases } from '@/lib/community/courtListenerEngine';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/community/courtlistener?q=epstein&court=sdny
 *
 * Search mode: Returns matching cases (preview)
 */
export async function GET(req: NextRequest) {
    const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const court = searchParams.get('court') || undefined;
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!query) {
            return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
        }

        const cases = await searchCases(query, court, limit);

        return NextResponse.json({
            success: true,
            query,
            count: cases.length,
            cases,
        });
    } catch (error: any) {
        console.error('CourtListener GET error:', error);
        return safeErrorResponse('GET /api/community/courtlistener', error);
    }
}

/**
 * POST /api/community/courtlistener
 *
 * Import mode: Fetches court documents and writes to evidence_archive
 * Body: { query, court?, node_id, max_cases?, max_docs? }
 *
 * ⚠️ Bu endpoint DOĞRULANMIŞ kanıt olarak yazar (source_of_truth = 'court')
 * Topluluk katkısı DEĞİLDİR.
 */
export async function POST(req: NextRequest) {
    const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const body = await req.json();
        const { query, court, node_id, max_cases = 3, max_docs = 10 } = body;

        if (!query || !node_id) {
            return NextResponse.json(
                { error: 'query and node_id are required' },
                { status: 400 },
            );
        }

        const supabase = getSupabase();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 },
            );
        }

        // Verify node exists
        const { data: node } = await supabase
            .from('nodes')
            .select('id, label')
            .eq('id', node_id)
            .single();

        if (!node) {
            return NextResponse.json(
                { error: 'Node not found' },
                { status: 404 },
            );
        }

        // Fetch court evidence
        const courtEvidence = await fetchCourtEvidence(query, court, max_cases, max_docs);

        if (courtEvidence.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No court documents found',
                imported: 0,
            });
        }

        // Write to evidence_archive as VERIFIED court documents
        let imported = 0;
        let skipped = 0;

        for (const ev of courtEvidence) {
            // Check for duplicates (same source_url)
            if (ev.source_url) {
                const { data: existing } = await supabase
                    .from('evidence_archive')
                    .select('id')
                    .eq('node_id', node_id)
                    .eq('source_url', ev.source_url)
                    .maybeSingle();

                if (existing) {
                    skipped++;
                    continue;
                }
            }

            const { error } = await supabase
                .from('evidence_archive')
                .insert({
                    node_id,
                    evidence_type: 'legal',
                    title: ev.title,
                    description: ev.description,
                    source_name: ev.source_name,
                    source_url: ev.source_url,
                    source_date: ev.source_date || null,
                    verification_status: 'official',
                    is_primary_source: true,
                    source_of_truth: 'court',
                    language: 'en',
                });

            if (!error) {
                imported++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `${imported} mahkeme belgesi içe aktarıldı`,
            imported,
            skipped,
            total_found: courtEvidence.length,
            node: node.label,
        });
    } catch (error: any) {
        console.error('CourtListener POST error:', error);
        return safeErrorResponse('POST /api/community/courtlistener', error);
    }
}
