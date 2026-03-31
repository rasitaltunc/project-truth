// ============================================
// CONNECTION TIMELINE API
// İki entity arasındaki olayları getir
// ============================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get('source');
        const targetId = searchParams.get('target');

        if (!sourceId || !targetId) {
            return NextResponse.json({
                success: false,
                error: 'source and target parameters are required'
            }, { status: 400 });
        }

        // 1. Get both entities
        const { data: entities } = await supabase
            .from('truth_nodes')
            .select('*')
            .in('id', [sourceId, targetId]);

        if (!entities || entities.length < 2) {
            return NextResponse.json({
                success: false,
                error: 'One or both entities not found'
            }, { status: 404 });
        }

        const sourceNode = entities.find(e => e.id === sourceId);
        const targetNode = entities.find(e => e.id === targetId);

        // 2. Get the link between them
        const { data: link } = await supabase
            .from('truth_links')
            .select('*')
            .or(`and(source.eq.${sourceId},target.eq.${targetId}),and(source.eq.${targetId},target.eq.${sourceId})`)
            .single();

        // 3. Get evidence that mentions BOTH entities
        const { data: sharedEvidence } = await supabase
            .from('evidence_archive')
            .select('*')
            .or(`node_id.eq.${sourceId},node_id.eq.${targetId}`)
            .order('source_date', { ascending: true });

        // 4. Get timeline entries for both entities
        const { data: sourceTimeline } = await supabase
            .from('node_timeline')
            .select('*')
            .eq('node_id', sourceId)
            .order('event_date', { ascending: true });

        const { data: targetTimeline } = await supabase
            .from('node_timeline')
            .select('*')
            .eq('node_id', targetId)
            .order('event_date', { ascending: true });

        // 5. Get connection events (if exists)
        const { data: connectionEvents } = await supabase
            .from('connection_events')
            .select('*')
            .or(`and(source_id.eq.${sourceId},target_id.eq.${targetId}),and(source_id.eq.${targetId},target_id.eq.${sourceId})`)
            .order('event_date', { ascending: true });

        // 6. Build combined timeline
        const events = buildConnectionTimeline(
            sourceTimeline || [],
            targetTimeline || [],
            sharedEvidence || [],
            connectionEvents || [],
            sourceId,
            targetId
        );

        // 7. Calculate date range
        let firstContact: string | undefined;
        let lastContact: string | undefined;

        if (events.length > 0) {
            const dates = events.map(e => new Date(e.date).getTime()).filter(d => !isNaN(d));
            if (dates.length > 0) {
                firstContact = new Date(Math.min(...dates)).toISOString();
                lastContact = new Date(Math.max(...dates)).toISOString();
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                sourceNode: {
                    id: sourceNode.id,
                    label: sourceNode.label,
                    img: sourceNode.img,
                    type: sourceNode.type,
                    role: sourceNode.role
                },
                targetNode: {
                    id: targetNode.id,
                    label: targetNode.label,
                    img: targetNode.img,
                    type: targetNode.type,
                    role: targetNode.role
                },
                linkType: link?.type || 'associated',
                strength: link?.strength || 50,
                firstContact,
                lastContact,
                events
            }
        });

    } catch (error: any) {
        console.error('Connection timeline error:', error);
        return safeErrorResponse('GET /api/truth/connection', error);
    }
}

// ============================================
// HELPER: Build combined timeline
// ============================================

function buildConnectionTimeline(
    sourceTimeline: any[],
    targetTimeline: any[],
    sharedEvidence: any[],
    connectionEvents: any[],
    sourceId: string,
    targetId: string
) {
    const events: any[] = [];
    const seenIds = new Set<string>();

    // 1. Add direct connection events (highest priority)
    for (const event of connectionEvents) {
        const id = `conn-${event.id}`;
        if (!seenIds.has(id)) {
            seenIds.add(id);
            events.push({
                id,
                date: event.event_date || event.created_at,
                title: event.title,
                description: event.description,
                type: mapEventType(event.event_type),
                location: event.location,
                source: event.source_name,
                sourceUrl: event.source_url,
                confidence: event.confidence || 70,
                verified: event.verified || false,
                evidenceIds: event.evidence_ids
            });
        }
    }

    // 2. Find overlapping timeline events (same date/location)
    const sourceByDate: Record<string, any[]> = {};
    for (const e of sourceTimeline) {
        const dateKey = e.event_date?.substring(0, 10) || '';
        if (!sourceByDate[dateKey]) sourceByDate[dateKey] = [];
        sourceByDate[dateKey].push(e);
    }

    for (const targetEvent of targetTimeline) {
        const dateKey = targetEvent.event_date?.substring(0, 10) || '';
        const sourceEvents = sourceByDate[dateKey];

        if (sourceEvents) {
            // Found events on same date!
            for (const sourceEvent of sourceEvents) {
                const id = `overlap-${sourceEvent.id}-${targetEvent.id}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);

                    // Check if same location
                    const sameLocation = sourceEvent.location &&
                        targetEvent.location &&
                        sourceEvent.location.toLowerCase() === targetEvent.location.toLowerCase();

                    events.push({
                        id,
                        date: sourceEvent.event_date || targetEvent.event_date,
                        title: sameLocation
                            ? `Aynı lokasyonda: ${sourceEvent.location}`
                            : `Aynı gün aktivite`,
                        description: `${sourceEvent.title}: ${sourceEvent.description}\n\n${targetEvent.title}: ${targetEvent.description}`,
                        type: sameLocation ? 'meeting' : 'other',
                        location: sourceEvent.location || targetEvent.location,
                        source: 'Timeline karşılaştırması',
                        confidence: sameLocation ? 80 : 50,
                        verified: false
                    });
                }
            }
        }
    }

    // 3. Add shared evidence
    for (const evidence of sharedEvidence) {
        const id = `evidence-${evidence.id}`;
        if (!seenIds.has(id)) {
            seenIds.add(id);
            events.push({
                id,
                date: evidence.source_date || evidence.created_at,
                title: evidence.title,
                description: evidence.content?.substring(0, 500) || evidence.title,
                type: mapEvidenceType(evidence.evidence_type),
                location: evidence.location,
                source: evidence.source_name,
                sourceUrl: evidence.source_url,
                confidence: evidence.verification_score || 60,
                verified: evidence.verification_status === 'verified' || evidence.verification_status === 'community_verified',
                evidenceIds: [evidence.id]
            });
        }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
}

function mapEventType(type: string): string {
    const mapping: Record<string, string> = {
        'meeting': 'meeting',
        'travel': 'travel',
        'flight': 'travel',
        'transaction': 'transaction',
        'financial': 'transaction',
        'call': 'communication',
        'email': 'communication',
        'message': 'communication',
        'document': 'document',
        'witness': 'witness',
        'testimony': 'witness',
        'media': 'media',
        'news': 'media',
        'legal': 'legal',
        'court': 'legal',
        'arrest': 'legal'
    };
    return mapping[type?.toLowerCase()] || 'other';
}

function mapEvidenceType(type: string): string {
    const mapping: Record<string, string> = {
        'flight_log': 'travel',
        'financial': 'transaction',
        'document': 'document',
        'photo': 'media',
        'video': 'media',
        'testimony': 'witness',
        'court_document': 'legal',
        'communication': 'communication'
    };
    return mapping[type?.toLowerCase()] || 'document';
}
