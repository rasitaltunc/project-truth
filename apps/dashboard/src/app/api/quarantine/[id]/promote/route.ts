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
import { findBestMatch } from '@/lib/entityResolution';
import { scoreEntity, type ScoringEntity } from '@/lib/scoring/confidenceCalculator';
// CER Hafta 3 entegrasyonu — paralel mod (eski + yeni motor birlikte yazıyor)
import { promoteEntityToCer, promoteRelationshipToCer } from '@/lib/cerWriter';

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

    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 8) {
      return NextResponse.json({ error: 'Valid fingerprint required' }, { status: 400 });
    }

    // UUID format check for quarantineId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(quarantineId)) {
      return NextResponse.json({ error: 'Invalid quarantine ID format' }, { status: 400 });
    }

    // SECURITY (Sprint B2): Verify the user's tier from DB before allowing promote
    // Only 'community' tier and above can promote items to the live network.
    // Schema fix (10 May 2026): user_badges columns are user_fingerprint + badge_tier (text),
    // not fingerprint + tier (int). badge_tier values: 'anonymous' | 'community' | 'journalist' | 'institutional'.
    const { data: userBadge } = await supabaseAdmin
      .from('user_badges')
      .select('badge_tier')
      .eq('user_fingerprint', fingerprint)
      .maybeSingle();

    const userTier = userBadge?.badge_tier || 'anonymous';
    const ALLOWED_TIERS = ['community', 'journalist', 'institutional'];
    if (!ALLOWED_TIERS.includes(userTier)) {
      return NextResponse.json(
        { error: `Insufficient permissions: 'community' tier or above required to promote items to the network. Current tier: '${userTier}'.` },
        { status: 403 }
      );
    }

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

      // ═══ FIX #2: Fuzzy Entity Resolution (replaces simple ilike) ═══
      // Fetch all nodes in this network for intelligent matching
      const { data: allNetworkNodes } = await supabaseAdmin
        .from('nodes')
        .select('id, name, type')
        .eq('network_id', qItem.network_id);

      const fuzzyMatch = allNetworkNodes && allNetworkNodes.length > 0
        ? findBestMatch(entityName, allNetworkNodes, 0.85)
        : null;

      if (fuzzyMatch) {
        // Node already exists (exact or fuzzy match) — don't create duplicate
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
                existing_node_id: fuzzyMatch.nodeId,
                match_score: fuzzyMatch.score,
                match_method: fuzzyMatch.method,
                actor: fingerprint,
              },
            ],
          })
          .eq('id', quarantineId);

        createdId = fuzzyMatch.nodeId;

        // ═══ FIX #3: Link orphan citations to EXISTING node ═══
        // Same logic as new-node citation linking, but for existing matches
        if (qItem.document_id) {
          try {
            const { data: orphanCitations } = await supabaseAdmin
              .from('evidence_citations')
              .select('id, excerpt_public')
              .eq('document_id', qItem.document_id)
              .is('node_id', null)
              .is('link_id', null)
              .eq('status', 'active');

            if (orphanCitations && orphanCitations.length > 0) {
              const matchingIds = orphanCitations
                .filter(c =>
                  c.excerpt_public &&
                  c.excerpt_public.toLowerCase().includes(entityName.toLowerCase())
                )
                .map(c => c.id);

              if (matchingIds.length > 0) {
                await supabaseAdmin
                  .from('evidence_citations')
                  .update({ node_id: fuzzyMatch.nodeId, updated_at: new Date().toISOString() })
                  .in('id', matchingIds);

                console.log(`[Promote] Linked ${matchingIds.length} citations to existing node "${fuzzyMatch.nodeName}" (${fuzzyMatch.nodeId})`);
              }
            }
          } catch (citErr) {
            console.warn('[Promote] Citation linking to existing node error:', citErr);
          }
        }

        // Provenance for existing match
        await supabaseAdmin.from('data_provenance').insert({
          entity_type: 'node',
          entity_id: fuzzyMatch.nodeId,
          action: 'promoted',
          actor_fingerprint: fingerprint,
          actor_type: 'user',
          details: {
            quarantine_id: quarantineId,
            document_id: qItem.document_id,
            match_type: fuzzyMatch.method,
            match_score: fuzzyMatch.score,
            original_name: entityName,
            matched_name: fuzzyMatch.nodeName,
          },
        });

        // ═══ CER HAFTA 3 — Paralel yazım (yeni motor) ═══
        // Eski sistem fuzzy match buldu, mevcut node'a bağladı.
        // Yeni motor kendi içinde tekrar fuzzy match yapacak (CER tablosundan)
        // ve aynı veya farklı bir karar verebilir — iki sistem bağımsız.
        const cerResultLinked = await promoteEntityToCer(
          supabaseAdmin,
          {
            item_data: itemData,
            source_type: qItem.source_type,
            document_id: qItem.document_id,
            confidence: qItem.confidence,
            network_id: qItem.network_id,
          },
          fuzzyMatch.nodeId,
        );

        return NextResponse.json({
          promoted: true,
          type: 'entity',
          action: 'linked_existing',
          nodeId: fuzzyMatch.nodeId,
          nodeName: fuzzyMatch.nodeName,
          matchScore: fuzzyMatch.score,
          matchMethod: fuzzyMatch.method,
          // CER paralel yazım sonucu (legacy nodes/links bozulmadan)
          cer: cerResultLinked.success
            ? { written: true, canonical_id: cerResultLinked.canonical_id }
            : { written: false, error: cerResultLinked.error },
        });
      }

      // Map entity type to node type
      const nodeType =
        entityType === 'person' ? 'person' :
        entityType === 'organization' ? 'organization' :
        entityType === 'location' ? 'location' :
        'entity';

      // ═══ FIX #4 + #5: Recalculate confidence with 5-layer scoring engine ═══
      // Instead of blindly copying qItem.confidence (which came from AI),
      // we recalculate using our deterministic post-hoc scoring formula.
      // Also passes mention_count (#5) for proper GRADE layer volume bonus.
      let calculatedConfidence = qItem.confidence; // fallback
      let scoringBand = 'UNVERIFIED';
      try {
        // Fetch document type for scoring context
        const { data: docRecord } = await supabaseAdmin
          .from('documents')
          .select('document_type')
          .eq('id', qItem.document_id)
          .maybeSingle();

        const docType = docRecord?.document_type || 'court_filing';

        // Map quarantine item_data to ScoringEntity
        const scoringEntity: ScoringEntity = {
          name: entityName,
          type: (entityType === 'person' || entityType === 'institution' || entityType === 'location' || entityType === 'event' || entityType === 'document')
            ? entityType as ScoringEntity['type']
            : 'person',
          mentions: (itemData.mention_count as number) || (itemData.mentions as number) || 1,
          role: (itemData.role as string) || '',
          evidence_types: Array.isArray(itemData.evidence_types)
            ? (itemData.evidence_types as string[])
            : ['court_record'],
          nato_reliability: (itemData.nato_reliability as ScoringEntity['nato_reliability']) || 'B',
          nato_credibility: (itemData.nato_credibility as string | number) || '2',
          sub_source: (itemData.sub_source as string) || docType,
        };

        const scoringResult = scoreEntity(scoringEntity, docType);
        calculatedConfidence = scoringResult.final_confidence;
        scoringBand = scoringResult.band;

        console.log(`[Promote] Scored "${entityName}": ${qItem.confidence} (AI) → ${calculatedConfidence} (calculated, ${scoringBand})`);
      } catch (scoreErr) {
        // Scoring is non-fatal — fall back to quarantine confidence
        console.warn(`[Promote] Scoring failed for "${entityName}", using quarantine confidence:`, scoreErr);
      }

      // Create new node
      // SCHEMA FIX (10 May 2026): nodes tablosunda 'description', 'metadata', 'tier' kolonları YOK.
      // Gerçek kolonlar: summary (text), details (jsonb). tier kavramı details içine taşındı.
      const nodeDescription = (itemData.context as string) || (itemData.role as string) || null;
      const { data: newNode, error: nodeError } = await supabaseAdmin
        .from('nodes')
        .insert({
          network_id: qItem.network_id,
          name: entityName,
          type: nodeType,
          summary: nodeDescription,
          risk: 0,
          verification_level: 'community',
          // Yeni kolonlar — her node'un "doğum belgesi"
          source_document_id: qItem.document_id || null,
          source_location: (itemData.sourceLocation as string) || null,
          data_origin: qItem.source_type === 'structured_api' ? 'structured_import'
            : qItem.source_type === 'ai_extraction' ? 'ai_extracted'
            : 'community_verified',
          details: {
            tier: 3, // Default to outer tier, community can adjust
            quarantine_id: quarantineId,
            source_document: qItem.document_id,
            source_type: qItem.source_type,
            confidence_original: qItem.confidence,
            confidence_calculated: calculatedConfidence,
            confidence_band: scoringBand,
            mention_count: (itemData.mention_count as number) || 1,
            is_redacted: (itemData.is_redacted as boolean) || false,
            promoted_at: new Date().toISOString(),
            promoted_by: fingerprint,
          },
        })
        .select()
        .single();

      if (nodeError) throw nodeError;
      createdId = newNode?.id || null;

      // ═══ CER HAFTA 3 — Paralel yazım (yeni motor) ═══
      // Eski sistem yeni node yarattı. Yeni motor da kendi canonical entity'sini yaratır.
      // İki sistem arasındaki bağ: cer_canonical_entities.natural_ids.legacy_node_id
      const cerResultNew = createdId
        ? await promoteEntityToCer(
            supabaseAdmin,
            {
              item_data: itemData,
              source_type: qItem.source_type,
              document_id: qItem.document_id,
              confidence: qItem.confidence,
              network_id: qItem.network_id,
            },
            createdId,
          )
        : { success: false, error: 'legacy node creation failed' };

      return NextResponse.json({
        promoted: true,
        type: 'entity',
        action: 'created_new',
        nodeId: newNode?.id,
        nodeName: entityName,
        // CER paralel yazım sonucu
        cer: cerResultNew.success
          ? { written: true, canonical_id: cerResultNew.canonical_id }
          : { written: false, error: cerResultNew.error },
      });
    } else if (qItem.item_type === 'relationship') {
      // Create a link in the network
      // SCHEMA FIX (10 May 2026): AI/karantina hem camelCase hem snake_case yazabiliyor.
      // İkisini de oku — defansif (Anayasa Madde 8: yanlış>eksik için tip esnekliği gerekli).
      const sourceName = (itemData.sourceName as string) || (itemData.source_name as string) || '';
      const targetName = (itemData.targetName as string) || (itemData.target_name as string) || '';
      const relType = (itemData.relationshipType as string) || (itemData.relationship_type as string) || 'associated_with';
      const evidenceType = (itemData.evidenceType as string) || (itemData.evidence_type as string) || 'official_document';

      // ═══ FIX #2 (relationships): Fuzzy node lookup for source/target ═══
      const { data: relNetworkNodes } = await supabaseAdmin
        .from('nodes')
        .select('id, name, type')
        .eq('network_id', qItem.network_id);

      const sourceMatch = relNetworkNodes && relNetworkNodes.length > 0
        ? findBestMatch(sourceName, relNetworkNodes, 0.85)
        : null;
      const targetMatch = relNetworkNodes && relNetworkNodes.length > 0
        ? findBestMatch(targetName, relNetworkNodes, 0.85)
        : null;

      const sourceNode = sourceMatch ? { id: sourceMatch.nodeId } : null;
      const targetNode = targetMatch ? { id: targetMatch.nodeId } : null;

      if (!sourceNode || !targetNode) {
        return NextResponse.json(
          {
            error: `Cannot create link: ${!sourceNode ? `source "${sourceName}"` : ''} ${!targetNode ? `target "${targetName}"` : ''} not found in network`,
            hint: 'Promote entity items first, then relationships',
            sourceMatch: sourceMatch ? { name: sourceMatch.nodeName, score: sourceMatch.score } : null,
            targetMatch: targetMatch ? { name: targetMatch.nodeName, score: targetMatch.score } : null,
          },
          { status: 400 }
        );
      }

      // Check for existing link
      // SCHEMA FIX (10 May 2026): links tablosunda network_id kolonu YOK.
      // unique constraint (source_id, target_id, relationship_type) zaten duplicate'i engelliyor.
      const { data: existingLink } = await supabaseAdmin
        .from('links')
        .select('id')
        .eq('source_id', sourceNode.id)
        .eq('target_id', targetNode.id)
        .eq('relationship_type', relType)
        .maybeSingle();

      if (existingLink) {
        // Idempotent CER yazımı — link önceki bir denemede yaratılmış olabilir
        // ama CER tarafı patlamış olabilir (örn. defansif okuma fix öncesi).
        // CER'e de yaz, eğer zaten varsa cerWriter kendisi kontrol edip atlar.
        const cerRelExisting = await promoteRelationshipToCer(supabaseAdmin, {
          item_data: itemData,
          source_type: qItem.source_type,
          document_id: qItem.document_id,
          confidence: qItem.confidence,
        });

        return NextResponse.json({
          promoted: true,
          type: 'relationship',
          action: 'already_exists',
          linkId: existingLink.id,
          cer: cerRelExisting.success
            ? {
                written: true,
                statement_id: cerRelExisting.statement_id,
                source_canonical_id: cerRelExisting.source_canonical_id,
                target_canonical_id: cerRelExisting.target_canonical_id,
              }
            : { written: false, error: cerRelExisting.error },
        });
      }

      // ═══ FIX #4 (links): Use calculated confidence for links ═══
      // For relationships, we score using the relationship entity's properties
      let linkConfidence = qItem.confidence;
      try {
        const { data: docRecord } = await supabaseAdmin
          .from('documents')
          .select('document_type')
          .eq('id', qItem.document_id)
          .maybeSingle();

        const docType = docRecord?.document_type || 'court_filing';

        // Score using relationship context
        const relScoringEntity: ScoringEntity = {
          name: `${sourceName} → ${targetName}`,
          type: 'event', // relationships treated as events in scoring
          mentions: (itemData.mention_count as number) || 1,
          role: relType,
          evidence_types: Array.isArray(itemData.evidence_types)
            ? (itemData.evidence_types as string[])
            : [evidenceType === 'official_document' ? 'court_record' : evidenceType],
          nato_reliability: (itemData.nato_reliability as ScoringEntity['nato_reliability']) || 'B',
          nato_credibility: (itemData.nato_credibility as string | number) || '3',
          sub_source: (itemData.sub_source as string) || docType,
        };

        const relScoring = scoreEntity(relScoringEntity, docType);
        linkConfidence = relScoring.final_confidence;

        console.log(`[Promote] Scored link "${sourceName}→${targetName}": ${qItem.confidence} (AI) → ${linkConfidence} (calculated, ${relScoring.band})`);
      } catch (scoreErr) {
        console.warn('[Promote] Link scoring failed, using quarantine confidence:', scoreErr);
      }

      // SCHEMA FIX (10 May 2026): links tablosunda 'network_id' ve 'metadata' kolonları YOK.
      // 'description' DOĞRUDAN kolon olarak var — metadata içeriğini description ve fingerprint'e dağıtıyoruz.
      // İzleme bilgisi (quarantine_id) provenance_chain'de zaten kalıyor.
      const { data: newLink, error: linkError } = await supabaseAdmin
        .from('links')
        .insert({
          source_id: sourceNode.id,
          target_id: targetNode.id,
          relationship_type: relType,
          description: (itemData.description as string) || null,
          evidence_type: evidenceType,
          confidence_level: linkConfidence,
          source_hierarchy: qItem.source_type === 'structured_api' ? 'primary' : 'secondary',
          evidence_count: 1,
          // Yeni kolonlar — her link'in "doğum belgesi"
          source_document_id: qItem.document_id || null,
          source_location: (itemData.sourceLocation as string) || null,
          data_origin: qItem.source_type === 'structured_api' ? 'structured_import'
            : qItem.source_type === 'ai_extraction' ? 'ai_extracted'
            : 'community_verified',
          fingerprint: fingerprint,
        })
        .select()
        .single();

      if (linkError) throw linkError;
      createdId = newLink?.id || null;

      // ═══ CER HAFTA 3 — Paralel ilişki yazımı (yeni motor) ═══
      // Eski sistem yeni link yarattı. Yeni motorda da ilişki statement'ı yazılır.
      // CER'de source/target entity'leri YOKSA atlar (eski sistem yeterli, regresyon yok).
      const cerRelResult = await promoteRelationshipToCer(supabaseAdmin, {
        item_data: itemData,
        source_type: qItem.source_type,
        document_id: qItem.document_id,
        confidence: qItem.confidence,
      });

      return NextResponse.json({
        promoted: true,
        type: 'relationship',
        action: 'created_new',
        linkId: newLink?.id,
        // CER paralel yazım sonucu
        cer: cerRelResult.success
          ? {
              written: true,
              statement_id: cerRelResult.statement_id,
              source_canonical_id: cerRelResult.source_canonical_id,
              target_canonical_id: cerRelResult.target_canonical_id,
            }
          : { written: false, error: cerRelResult.error },
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

    // ═══ EVIDENCE CITATIONS — "DOĞUM BELGESİ" BAĞLAMA ═══
    // Scan sırasında oluşturulan orphan citation'ları (node_id/link_id = null)
    // yeni oluşturulan entity'ye bağla (entity adı excerpt'te aranır)
    if (createdId && qItem.document_id) {
      try {
        const entityName = (itemData.name as string) || (itemData.sourceName as string) || '';
        if (entityName) {
          const targetColumn = qItem.item_type === 'entity' ? 'node_id' : 'link_id';

          // Aynı belgeden, henüz bağlanmamış, excerpt'inde entity adı geçen citation'ları bul
          const { data: orphanCitations } = await supabaseAdmin
            .from('evidence_citations')
            .select('id, excerpt_public')
            .eq('document_id', qItem.document_id)
            .is('node_id', null)
            .is('link_id', null)
            .eq('status', 'active');

          if (orphanCitations && orphanCitations.length > 0) {
            // Entity adı excerpt'te geçen citation'ları filtrele
            const matchingIds = orphanCitations
              .filter(c =>
                c.excerpt_public &&
                c.excerpt_public.toLowerCase().includes(entityName.toLowerCase())
              )
              .map(c => c.id);

            if (matchingIds.length > 0) {
              const { error: linkCitError } = await supabaseAdmin
                .from('evidence_citations')
                .update({ [targetColumn]: createdId, updated_at: new Date().toISOString() })
                .in('id', matchingIds);

              if (!linkCitError) {
                console.log(`[Promote] Linked ${matchingIds.length} citations to ${qItem.item_type} "${entityName}" (${createdId})`);
              }
            }
          }
        }
      } catch (citLinkErr) {
        // Citation linking is non-fatal
        console.warn('[Promote] Citation linking error:', citLinkErr);
      }
    }

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
