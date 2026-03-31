import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ═══════════════════════════════════════════
// GET /api/truth/link-evidence
// Bir link'e ait tüm evidence timeline'ı getir
// Query: ?sourceId=X&targetId=Y veya ?linkId=Z
// ═══════════════════════════════════════════
export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const linkId = searchParams.get('linkId');
        const sourceId = searchParams.get('sourceId');
        const targetId = searchParams.get('targetId');

        let resolvedLinkId = linkId;

        // linkId yoksa, sourceId + targetId ile link'i bul
        if (!resolvedLinkId && sourceId && targetId) {
            const { data: linkData, error: linkError } = await supabase
                .from('links')
                .select('id')
                .or(`and(source_id.eq.${sourceId},target_id.eq.${targetId}),and(source_id.eq.${targetId},target_id.eq.${sourceId})`)
                .limit(1)
                .single();

            if (linkData) {
                resolvedLinkId = linkData.id;
            }
        }

        if (!resolvedLinkId) {
            return NextResponse.json({ evidences: [], totalCount: 0 }, { status: 200 });
        }

        // Timeline verilerini çek — önce join ile dene, başarısız olursa join'siz çek
        let timeline: any[] | null = null;
        let timelineError: any = null;

        // Deneme 1: evidence_archive join ile (metadata oradan gelir)
        const { data: t1, error: e1 } = await supabase
            .from('link_evidence_timeline')
            .select(`
                id,
                link_id,
                evidence_id,
                event_date,
                date_precision,
                direction,
                visual_weight,
                display_label,
                display_summary,
                community_votes,
                is_keystone,
                created_at,
                evidence_archive (
                    id,
                    evidence_type,
                    title,
                    description,
                    source_name,
                    source_url,
                    source_date,
                    verification_status,
                    ai_confidence
                )
            `)
            .eq('link_id', resolvedLinkId)
            .order('event_date', { ascending: true });

        if (!e1 && t1) {
            timeline = t1;
        } else {
            // Deneme 2: join'siz basit sorgu (FK ilişkisi yoksa)
            const { data: t2, error: e2 } = await supabase
                .from('link_evidence_timeline')
                .select(`
                    id,
                    link_id,
                    evidence_id,
                    event_date,
                    date_precision,
                    direction,
                    visual_weight,
                    display_label,
                    display_summary,
                    community_votes,
                    is_keystone,
                    created_at
                `)
                .eq('link_id', resolvedLinkId)
                .order('event_date', { ascending: true });

            if (e2) {
                return NextResponse.json({ evidences: [], totalCount: 0 }, { status: 200 });
            }
            timeline = t2;
        }

        // Link metadata'sını da çek
        const { data: linkMeta } = await supabase
            .from('links')
            .select(`
                id,
                source_id,
                target_id,
                relationship_type,
                evidence_type,
                confidence_level,
                source_hierarchy,
                evidence_count
            `)
            .eq('id', resolvedLinkId)
            .single();

        // Node label'larını çek — linkMeta varsa oradan, yoksa doğrudan sourceId/targetId ile
        let sourceLabel = sourceId || '';
        let targetLabel = targetId || '';
        const srcId = linkMeta?.source_id || sourceId;
        const tgtId = linkMeta?.target_id || targetId;
        if (srcId && tgtId) {
            const { data: nodes } = await supabase
                .from('nodes')
                .select('id, label')
                .in('id', [srcId, tgtId]);
            if (nodes) {
                const srcNode = nodes.find(n => n.id === srcId);
                const tgtNode = nodes.find(n => n.id === tgtId);
                if (srcNode) sourceLabel = srcNode.label;
                if (tgtNode) targetLabel = tgtNode.label;
            }
        }

        // Evidence pulse formatına dönüştür
        const evidences = (timeline || []).map((item: any, index: number) => {
            const total = timeline?.length || 1;
            return {
                timelineId: item.id,
                evidenceId: item.evidence_id,
                evidenceType: item.evidence_archive?.evidence_type || item.evidence_type || 'inference',
                title: item.display_label,
                summary: item.display_summary,
                sourceName: item.evidence_archive?.source_name || item.source_name || null,
                sourceUrl: item.evidence_archive?.source_url || item.source_url || null,
                eventDate: item.event_date,
                datePrecision: item.date_precision,
                direction: item.direction,
                visualWeight: item.visual_weight,
                isKeystone: item.is_keystone,
                communityVotes: item.community_votes,
                verificationStatus: item.evidence_archive?.verification_status || item.verification_status || 'pending',
                confidence: item.evidence_archive?.ai_confidence || item.confidence || 0.5,
                // Kronolojik pozisyon: 0=en eski, 1=en yeni
                pulsePosition: total > 1 ? index / (total - 1) : 0.5,
            };
        });

        // Tarih aralığı
        const dates = evidences.filter((e: any) => e.eventDate).map((e: any) => new Date(e.eventDate).getTime());
        const dateRange = dates.length > 0
            ? { earliest: new Date(Math.min(...dates)).toISOString(), latest: new Date(Math.max(...dates)).toISOString() }
            : null;

        return NextResponse.json({
            link: {
                id: resolvedLinkId,
                sourceId: linkMeta?.source_id || sourceId,
                targetId: linkMeta?.target_id || targetId,
                sourceLabel,
                targetLabel,
                type: linkMeta?.relationship_type,
                evidenceType: linkMeta?.evidence_type,
                confidenceLevel: linkMeta?.confidence_level,
            },
            evidences,
            totalCount: evidences.length,
            keystoneCount: evidences.filter((e: any) => e.isKeystone).length,
            dateRange,
        });
    } catch (err: any) {
        return safeErrorResponse('GET /api/truth/link-evidence', err);
    }
}
