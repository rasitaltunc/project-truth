
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

// Sprint 15: 30s revalidation cache (reduces DB load while keeping data fresh)
export const revalidate = 30;

export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;
    try {
        // 1. NODES ÇEK
        const { data: nodes, error: nodesError } = await supabase
            .from('nodes')
            .select('*')
            .eq('is_active', true);

        if (nodesError) {
            console.error("❌ Nodes Error:", nodesError);
            throw nodesError;
        }

        // 2. LINKS ÇEK
        const { data: links, error: linksError } = await supabase
            .from('links')
            .select('*');

        if (linksError) {
            console.error("❌ Links Error:", linksError);
            throw linksError;
        }

        // FALLBACK IF DB IS EMPTY (Demo Mode)
        if (!nodes || nodes.length === 0) {
            console.warn("⚠️ DB is empty. Serving MOCK DATA.");
            const { MOCK_NODES, MOCK_LINKS } = await import('@/lib/mockTruthData');
            return NextResponse.json({
                nodes: MOCK_NODES,
                links: MOCK_LINKS,
                source: 'mock',
                timestamp: new Date().toISOString()
            });
        }

        // 3. EVIDENCE ÇEK (tüm node'lar için topluca)
        let evidenceMap: Record<string, any[]> = {};
        try {
            const { data: allEvidence, error: evError } = await supabase
                .from('evidence_archive')
                .select('*')
                .order('source_date', { ascending: false });

            if (!evError && allEvidence) {
                for (const ev of allEvidence) {
                    if (ev.node_id) {
                        if (!evidenceMap[ev.node_id]) evidenceMap[ev.node_id] = [];
                        evidenceMap[ev.node_id].push({
                            id: ev.id,
                            title: ev.title,
                            evidence_type: ev.evidence_type,
                            description: ev.description,
                            source_name: ev.source_name,
                            source_url: ev.source_url,
                            source_date: ev.source_date,
                            verification_status: ev.verification_status || 'unverified',
                            is_primary_source: ev.is_primary_source || false,
                            country_tags: ev.country_tags || [],
                            language: ev.language || 'en',
                        });
                    }
                }
            }
        } catch (e) {
        }

        // 4. TIMELINE ÇEK (tüm node'lar için topluca)
        let timelineMap: Record<string, any[]> = {};
        try {
            const { data: allTimeline, error: tlError } = await supabase
                .from('timeline_events')
                .select('*')
                .order('event_date', { ascending: true });

            if (!tlError && allTimeline) {
                for (const ev of allTimeline) {
                    if (ev.node_id) {
                        if (!timelineMap[ev.node_id]) timelineMap[ev.node_id] = [];
                        timelineMap[ev.node_id].push({
                            id: ev.id,
                            event_date: ev.event_date,
                            event_type: ev.event_type,
                            title: ev.title,
                            description: ev.description,
                            location: ev.location,
                            source_url: ev.source_url,
                            is_verified: ev.is_verified ?? true,
                            importance: ev.importance || 'normal',
                        });
                    }
                }
            }
        } catch (e) {
        }

        // 5. LINKS FORMATLA (Sprint 6B epistemolojik alanlar dahil!)
        const formattedLinks = links?.map((link: any) => ({
            source: link.source_id,
            target: link.target_id,
            type: link.relationship_type,
            strength: link.strength || 1,
            description: link.description,
            // Sprint 6B: Epistemolojik metadata — 3D shader + lens filtreleme için
            evidence_type: link.evidence_type || '',
            confidence_level: link.confidence_level ?? 0,
            source_hierarchy: link.source_hierarchy || 'tertiary',
            evidence_count: link.evidence_count ?? 0,
        })) || [];

        // 6. NODE'LAR İÇİN CONNECTIONS ARRAY OLUŞTUR
        // Her node için bağlı olduğu diğer node'ların listesi
        const nodeMap: Record<string, any> = {};
        nodes.forEach((n: any) => { nodeMap[n.id] = n; });

        const connectionsMap: Record<string, any[]> = {};
        formattedLinks.forEach((link: any) => {
            // Source node'un connections listesine target'ı ekle
            if (!connectionsMap[link.source]) connectionsMap[link.source] = [];
            const targetNode = nodeMap[link.target];
            if (targetNode) {
                connectionsMap[link.source].push({
                    id: link.target,
                    label: targetNode.name,
                    type: link.type || 'associate',
                    strength: link.strength || 50,
                    img: targetNode.image_url,
                    tier: targetNode.tier,
                    role: targetNode.role,
                    nodeType: targetNode.type,
                });
            }

            // Target node'un connections listesine source'u ekle
            if (!connectionsMap[link.target]) connectionsMap[link.target] = [];
            const sourceNode = nodeMap[link.source];
            if (sourceNode) {
                connectionsMap[link.target].push({
                    id: link.source,
                    label: sourceNode.name,
                    type: link.type || 'associate',
                    strength: link.strength || 50,
                    img: sourceNode.image_url,
                    tier: sourceNode.tier,
                    role: sourceNode.role,
                    nodeType: sourceNode.type,
                });
            }
        });

        // 7. VERİYİ FORMATLA — Evidence + Timeline + Connections dahil
        const formattedNodes = nodes.map((node: any) => ({
            id: node.id,
            label: node.name,
            type: node.type,
            img: node.image_url,
            tier: node.tier,
            risk: node.risk ?? 50,
            is_alive: node.is_alive,
            role: node.role,
            summary: node.summary,
            details: node.details || {},
            // GERÇEK VERİ: Tablolardan çekilmiş evidence + timeline + connections
            evidence: evidenceMap[node.id] || node.details?.evidence || [],
            timeline: timelineMap[node.id] || node.details?.timeline || [],
            connections: connectionsMap[node.id] || [],
            // Yeni Alanlar
            verification_level: node.verification_level,
            country_tags: node.country_tags,
            nationality: node.nationality,
            occupation: node.occupation,
            birth_date: node.birth_date,
            death_date: node.death_date,
            created_at: node.created_at || node.updated_at || new Date().toISOString()
        }));

        return NextResponse.json({
            nodes: formattedNodes,
            links: formattedLinks,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // FAILOVER TO MOCK DATA
        const { MOCK_NODES, MOCK_LINKS } = await import('@/lib/mockTruthData');

        return NextResponse.json({
            nodes: MOCK_NODES,
            links: MOCK_LINKS,
            source: 'mock',
            timestamp: new Date().toISOString()
        });
    }
}
