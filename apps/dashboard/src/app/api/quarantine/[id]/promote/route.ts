/**
 * /api/quarantine/[id]/promote
 * POST: Promote a verified quarantine item to the live network
 *
 * Only works for items with verification_status = 'verified'
 * Creates actual node/link in the network + provenance trail
 *
 * Sprint 17: Zero Hallucination Data Integrity
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(req, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id: quarantineId } = await params;
    const body = await req.json();
    const { fingerprint } = body as { fingerprint: string };

    // Fetch quarantine item
    const { data: qItem, error: qError } = await supabaseAdmin
      .from('data_quarantine')
      .select('*')
      .eq('id', quarantineId)
      .single();

    if (qError || !qItem) {
      return NextResponse.json({ error: 'Quarantine item not found' }, { status: 404 });
    }

    if (qItem.verification_status !== 'verified') {
      return NextResponse.json(
        { error: `Cannot promote: status is "${qItem.verification_status}", must be "verified"` },
        { status: 400 }
      );
    }

    const itemData = qItem.item_data as Record<string, unknown>;
    let createdId: string | null = null;

    // Promote based on item_type
    if (qItem.item_type === 'entity') {
      // Create a node in the network
      const entityName = (itemData.name as string) || 'Unknown';
      const entityType = (itemData.type as string) || 'person';

      // Check for existing node with same name to prevent duplicates
      const { data: existing } = await supabaseAdmin
        .from('nodes')
        .select('id, name')
        .eq('network_id', qItem.network_id)
        .ilike('name', entityName)
        .maybeSingle();

      if (existing) {
        // Node already exists — mark quarantine as promoted but don't create duplicate
        await supabaseAdmin
          .from('data_quarantine')
          .update({
            verification_status: 'verified',
            updated_at: new Date().toISOString(),
            provenance_chain: [
              ...(Array.isArray(qItem.provenance_chain) ? qItem.provenance_chain : []),
              {
                action: 'promoted_existing',
                timestamp: new Date().toISOString(),
                existing_node_id: existing.id,
                actor: fingerprint,
              },
            ],
          })
          .eq('id', quarantineId);

        createdId = existing.id;

        return NextResponse.json({
          promoted: true,
          type: 'entity',
          action: 'linked_existing',
          nodeId: existing.id,
          nodeName: existing.name,
        });
      }

      // Map entity type to node type
      const nodeType =
        entityType === 'person' ? 'person' :
        entityType === 'organization' ? 'organization' :
        entityType === 'location' ? 'location' :
        'entity';

      // Create new node
      // Legacy Migration: Yeni kolonlar kullanılıyor (source_document_id, data_origin, source_location)
      const { data: newNode, error: nodeError } = await supabaseAdmin
        .from('nodes')
        .insert({
          network_id: qItem.network_id,
          name: entityName,
          type: nodeType,
          description: (itemData.context as string) || (itemData.role as string) || null,
          tier: 3, // Default to outer tier, community can adjust
          risk: 0,
          verification_level: 'community',
          // Yeni kolonlar — her node'un "doğum belgesi"
          source_document_id: qItem.document_id || null,
          source_location: (itemData.sourceLocation as string) || null,
          data_origin: qItem.source_type === 'structured_api' ? 'structured_import'
            : qItem.source_type === 'ai_extraction' ? 'ai_extracted'
            : 'community_verified',
          // fingerprint trigger tarafından otomatik oluşturulur
          metadata: {
            quarantine_id: quarantineId,
            source_document: qItem.document_id,
            source_type: qItem.source_type,
            confidence: qItem.confidence,
            promoted_at: new Date().toISOString(),
            promoted_by: fingerprint,
          },
        })
        .select()
        .single();

      if (nodeError) throw nodeError;
      createdId = newNode?.id || null;

      return NextResponse.json({
        promoted: true,
        type: 'entity',
        action: 'created_new',
        nodeId: newNode?.id,
        nodeName: entityName,
      });
    } else if (qItem.item_type === 'relationship') {
      // Create a link in the network
      const sourceName = (itemData.sourceName as string) || '';
      const targetName = (itemData.targetName as string) || '';
      const relType = (itemData.relationshipType as string) || 'associated_with';
      const evidenceType = (itemData.evidenceType as string) || 'official_document';

      // Find source and target nodes
      const { data: sourceNode } = await supabaseAdmin
        .from('nodes')
        .select('id')
        .eq('network_id', qItem.network_id)
        .ilike('name', sourceName)
        .maybeSingle();

      const { data: targetNode } = await supabaseAdmin
        .from('nodes')
        .select('id')
        .eq('network_id', qItem.network_id)
        .ilike('name', targetName)
        .maybeSingle();

      if (!sourceNode || !targetNode) {
        return NextResponse.json(
          {
            error: `Cannot create link: ${!sourceNode ? `source "${sourceName}"` : ''} ${!targetNode ? `target "${targetName}"` : ''} not found in network`,
            hint: 'Promote entity items first, then relationships',
          },
          { status: 400 }
        );
      }

      // Check for existing link
      const { data: existingLink } = await supabaseAdmin
        .from('links')
        .select('id')
        .eq('network_id', qItem.network_id)
        .eq('source_id', sourceNode.id)
        .eq('target_id', targetNode.id)
        .maybeSingle();

      if (existingLink) {
        return NextResponse.json({
          promoted: true,
          type: 'relationship',
          action: 'already_exists',
          linkId: existingLink.id,
        });
      }

      // Legacy Migration: Yeni kolonlar kullanılıyor
      const { data: newLink, error: linkError } = await supabaseAdmin
        .from('links')
        .insert({
          network_id: qItem.network_id,
          source_id: sourceNode.id,
          target_id: targetNode.id,
          relationship_type: relType,
          evidence_type: evidenceType,
          confidence_level: qItem.confidence,
          source_hierarchy: qItem.source_type === 'structured_api' ? 'primary' : 'secondary',
          evidence_count: 1,
          // Yeni kolonlar — her link'in "doğum belgesi"
          source_document_id: qItem.document_id || null,
          source_location: (itemData.sourceLocation as string) || null,
          data_origin: qItem.source_type === 'structured_api' ? 'structured_import'
            : qItem.source_type === 'ai_extraction' ? 'ai_extracted'
            : 'community_verified',
          metadata: {
            quarantine_id: quarantineId,
            source_document: qItem.document_id,
            description: itemData.description,
            promoted_at: new Date().toISOString(),
            promoted_by: fingerprint,
          },
        })
        .select()
        .single();

      if (linkError) throw linkError;
      createdId = newLink?.id || null;

      return NextResponse.json({
        promoted: true,
        type: 'relationship',
        action: 'created_new',
        linkId: newLink?.id,
      });
    }

    // Update quarantine status
    await supabaseAdmin
      .from('data_quarantine')
      .update({
        updated_at: new Date().toISOString(),
        provenance_chain: [
          ...(Array.isArray(qItem.provenance_chain) ? qItem.provenance_chain : []),
          {
            action: 'promoted',
            timestamp: new Date().toISOString(),
            created_id: createdId,
            actor: fingerprint,
          },
        ],
      })
      .eq('id', quarantineId);

    // Provenance entry
    if (createdId) {
      await supabaseAdmin.from('data_provenance').insert({
        entity_type: qItem.item_type === 'entity' ? 'node' : 'link',
        entity_id: createdId,
        action: 'promoted',
        actor_fingerprint: fingerprint,
        actor_type: 'user',
        details: {
          quarantine_id: quarantineId,
          document_id: qItem.document_id,
          source_type: qItem.source_type,
          confidence: qItem.confidence,
        },
      });
    }

    return NextResponse.json({
      promoted: true,
      type: qItem.item_type,
      createdId,
    });
  } catch (error) {
    return safeErrorResponse('POST /api/quarantine/[id]/promote', error);
  }
}
