// ============================================
// SPRINT 6B: GRAPHML EXPORT API
// GET /api/export/graphml?network_id=uuid — Ağı GraphML formatında dışa aktar
// Gephi, networkx, igraph uyumlu — Akademik kullanıcılar için
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('network_id');

    // Nodes çek
    let nodesQuery = supabaseAdmin
      .from('nodes')
      .select('id, name, type, tier, defcon_score, role, summary, verification_status, nationality, occupation')
      .eq('is_active', true);

    if (networkId) {
      nodesQuery = nodesQuery.eq('network_id', networkId);
    }

    const { data: nodes, error: nodesError } = await nodesQuery;
    if (nodesError) throw nodesError;

    // Links çek (Sprint 6B alanları dahil)
    let linksQuery = supabaseAdmin
      .from('links')
      .select('id, source_id, target_id, relationship_type, strength, description, evidence_type, confidence_level, source_hierarchy, evidence_count');

    if (networkId) {
      linksQuery = linksQuery.eq('network_id', networkId);
    }

    const { data: links, error: linksError } = await linksQuery;
    if (linksError) throw linksError;

    // GraphML XML oluştur
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphstruct.org/graphml"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphstruct.org/graphml http://graphml.graphstruct.org/xmlns/1.0/graphml.xsd">

  <!-- Project Truth — Exported ${new Date().toISOString()} -->
  <!-- FAIR Metadata: CC-BY-SA 4.0 License -->

  <!-- Node Attributes -->
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="tier" for="node" attr.name="tier" attr.type="string"/>
  <key id="defcon_score" for="node" attr.name="defcon_score" attr.type="double"/>
  <key id="role" for="node" attr.name="role" attr.type="string"/>
  <key id="summary" for="node" attr.name="summary" attr.type="string"/>
  <key id="verification_status" for="node" attr.name="verification_status" attr.type="string"/>
  <key id="nationality" for="node" attr.name="nationality" attr.type="string"/>
  <key id="occupation" for="node" attr.name="occupation" attr.type="string"/>

  <!-- Edge Attributes -->
  <key id="relationship_type" for="edge" attr.name="relationship_type" attr.type="string"/>
  <key id="strength" for="edge" attr.name="strength" attr.type="double"/>
  <key id="description" for="edge" attr.name="description" attr.type="string"/>
  <key id="evidence_type" for="edge" attr.name="evidence_type" attr.type="string"/>
  <key id="confidence_level" for="edge" attr.name="confidence_level" attr.type="double"/>
  <key id="source_hierarchy" for="edge" attr.name="source_hierarchy" attr.type="string"/>
  <key id="evidence_count" for="edge" attr.name="evidence_count" attr.type="int"/>

  <graph id="ProjectTruth" edgedefault="undirected">
`;

    // Nodes
    for (const node of (nodes || [])) {
      xml += `    <node id="${escapeXml(node.id)}">
      <data key="name">${escapeXml(node.name)}</data>
      <data key="type">${escapeXml(node.type)}</data>
      <data key="tier">${escapeXml(node.tier)}</data>
      <data key="defcon_score">${node.defcon_score ?? 0}</data>
      <data key="role">${escapeXml(node.role)}</data>
      <data key="summary">${escapeXml(node.summary)}</data>
      <data key="verification_status">${escapeXml(node.verification_status)}</data>
      <data key="nationality">${escapeXml(node.nationality)}</data>
      <data key="occupation">${escapeXml(node.occupation)}</data>
    </node>
`;
    }

    // Edges
    for (const link of (links || [])) {
      xml += `    <edge id="${escapeXml(link.id)}" source="${escapeXml(link.source_id)}" target="${escapeXml(link.target_id)}">
      <data key="relationship_type">${escapeXml(link.relationship_type)}</data>
      <data key="strength">${link.strength ?? 0}</data>
      <data key="description">${escapeXml(link.description)}</data>
      <data key="evidence_type">${escapeXml(link.evidence_type)}</data>
      <data key="confidence_level">${link.confidence_level ?? 0.5}</data>
      <data key="source_hierarchy">${escapeXml(link.source_hierarchy)}</data>
      <data key="evidence_count">${link.evidence_count ?? 0}</data>
    </edge>
`;
    }

    xml += `  </graph>
</graphml>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="project-truth-${networkId || 'all'}-${new Date().toISOString().slice(0, 10)}.graphml"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[export/graphml] error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
