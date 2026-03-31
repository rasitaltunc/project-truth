/**
 * /api/documents/derived-items/[id]/approve
 * POST: Approve a derived item → CREATE REAL NODE/LINK in the network
 *
 * Flow:
 * 1. Fetch derived item + parent document
 * 2. If entity → find or create node in network
 * 3. If relationship → find or create both nodes + create link
 * 4. Award reputation
 * 5. Return { itemId, nodeId?, linkId?, reputationAwarded }
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, VOTE_RATE_LIMIT } from '@/lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Map AI-extracted entity types to node types
 */
function mapEntityTypeToNodeType(entityType?: string): string {
  if (!entityType) return 'person';
  const t = entityType.toLowerCase();
  if (t.includes('person') || t.includes('individual')) return 'person';
  if (t.includes('org') || t.includes('company') || t.includes('institution')) return 'organization';
  if (t.includes('location') || t.includes('address') || t.includes('country')) return 'location';
  if (t.includes('event') || t.includes('incident')) return 'event';
  return 'person';
}

/**
 * Find existing node by name (case-insensitive) in this network,
 * or create a new one if it doesn't exist.
 */
async function findOrCreateNode(
  networkId: string,
  name: string,
  entityType?: string,
  role?: string,
  confidence?: number,
  documentId?: string
): Promise<{ id: string; created: boolean }> {
  // Search for existing node with similar name
  const { data: existing } = await supabaseAdmin
    .from('nodes')
    .select('id')
    .eq('network_id', networkId)
    .ilike('name', name.trim())
    .limit(1)
    .single();

  if (existing) {
    return { id: existing.id, created: false };
  }

  // Create new node
  const nodeType = mapEntityTypeToNodeType(entityType);
  const { data: newNode, error } = await supabaseAdmin
    .from('nodes')
    .insert({
      network_id: networkId,
      name: name.trim(),
      type: nodeType,
      tier: 3, // Outer orbit — community-level discovery
      risk: 50, // Default medium risk
      is_alive: true,
      role: role || null,
      summary: `Discovered via document scan${documentId ? ` (doc: ${documentId.slice(0, 8)})` : ''}`,
      verification_level: 'community',
      country_tags: [],
      is_active: true,
      details: JSON.stringify({
        scan_origin: documentId,
        confidence: confidence || 0.5,
        discovered_at: new Date().toISOString(),
      }),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[approve] Failed to create node:', error);
    throw new Error(`Failed to create node: ${error.message}`);
  }

  return { id: newNode.id, created: true };
}

/**
 * Award reputation points (fire-and-forget via direct DB insert)
 */
async function awardReputation(fingerprint: string, amount: number, reason: string) {
  try {
    await supabaseAdmin.from('reputation_transactions').insert({
      fingerprint,
      amount,
      reason,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[approve] Failed to award reputation:', err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(req, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await req.json();
    const { fingerprint } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Derived item ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch derived item
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('document_derived_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: 'Derived item not found' },
        { status: 404 }
      );
    }

    // 2. Fetch parent document (need network_id)
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('id, network_id, title')
      .eq('id', item.document_id)
      .single();

    if (!document || !document.network_id) {
      return NextResponse.json(
        { error: 'Parent document or network not found' },
        { status: 404 }
      );
    }

    // 3. Update approval status
    const { error: updateError } = await supabaseAdmin
      .from('document_derived_items')
      .update({
        status: 'approved',
        approved_by: fingerprint || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Handle item type — CREATE REAL NODES/LINKS
    let nodeId: string | null = null;
    let linkId: string | null = null;
    let reputationAwarded = 0;
    const itemData = item.item_data as Record<string, unknown>;

    if (item.item_type === 'entity') {
      // ── ENTITY: Find or create node ──
      const result = await findOrCreateNode(
        document.network_id,
        (itemData.name as string) || 'Unknown',
        itemData.type as string,
        itemData.role as string,
        item.confidence,
        document.id
      );
      nodeId = result.id;
      reputationAwarded = result.created ? 3 : 2; // More rep for new discovery

    } else if (item.item_type === 'relationship') {
      // ── RELATIONSHIP: Find/create both nodes + create link ──
      const sourceName = (itemData.sourceName as string) || '';
      const targetName = (itemData.targetName as string) || '';

      if (!sourceName || !targetName) {
        return NextResponse.json(
          { error: 'Relationship must have sourceName and targetName' },
          { status: 400 }
        );
      }

      // Find or create both endpoints
      const sourceNode = await findOrCreateNode(
        document.network_id,
        sourceName,
        'person',
        undefined,
        item.confidence,
        document.id
      );

      const targetNode = await findOrCreateNode(
        document.network_id,
        targetName,
        'person',
        undefined,
        item.confidence,
        document.id
      );

      // Check if link already exists between these two
      const { data: existingLink } = await supabaseAdmin
        .from('links')
        .select('id')
        .eq('source_id', sourceNode.id)
        .eq('target_id', targetNode.id)
        .limit(1)
        .single();

      if (existingLink) {
        // Link exists — update evidence count
        await supabaseAdmin
          .from('links')
          .update({
            evidence_count: 1, // ideally increment, but safe overwrite for now
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.id);
        linkId = existingLink.id;
        reputationAwarded = 2;
      } else {
        // Create new link
        const { data: newLink, error: linkError } = await supabaseAdmin
          .from('links')
          .insert({
            source_id: sourceNode.id,
            target_id: targetNode.id,
            network_id: document.network_id,
            relationship_type: (itemData.relationshipType as string) || 'associated',
            strength: Math.round((item.confidence || 0.5) * 100),
            description: (itemData.description as string) || `Discovered via scan of "${document.title}"`,
            evidence_type: (itemData.evidenceType as string) || 'official_document',
            confidence_level: item.confidence || 0.5,
            source_hierarchy: 'secondary',
            evidence_count: 1,
          })
          .select('id')
          .single();

        if (linkError) {
          console.error('[approve] Failed to create link:', linkError);
          // Don't throw — nodes were already created, that's still valuable
        } else {
          linkId = newLink.id;
        }
        reputationAwarded = 5; // Highest reward for new relationship
      }

      nodeId = sourceNode.id; // Return source node for highlighting
    }

    // 5. Award reputation
    if (fingerprint && reputationAwarded > 0) {
      await awardReputation(
        fingerprint,
        reputationAwarded,
        `Approved derived item: ${item.item_type} from document scan`
      );
    }

    // 6. Return enriched response
    return NextResponse.json({
      id: item.id,
      item_type: item.item_type,
      item_data: item.item_data,
      status: 'approved',
      approved_by: fingerprint,
      nodeId,
      linkId,
      reputationAwarded,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/documents/derived-items/[id]/approve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
