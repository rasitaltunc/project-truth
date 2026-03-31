/**
 * /api/game/generate
 * POST: Generate investigation tasks from quarantine items
 *
 * Sprint G1: Task Generation Pipeline
 * quarantine → investigation_tasks (+ calibration questions mixed in)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GAME_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Difficulty mapping based on item type and source
function calculateDifficulty(item: Record<string, unknown>): number {
  const sourceType = item.source_type as string;
  const itemType = item.item_type as string;

  let base = 2;

  // Structured API data = easier, AI extraction = harder
  if (sourceType === 'structured_api') base = 1;
  else if (sourceType === 'html_parse') base = 2;
  else if (sourceType === 'ai_extraction') base = 3;
  else if (sourceType === 'manual_entry') base = 2;

  // Relationships harder than entities
  if (itemType === 'relationship') base = Math.min(base + 1, 5);
  if (itemType === 'claim') base = Math.min(base + 1, 5);

  return base;
}

// Determine role affinity from item content
function determineRoleAffinity(itemData: Record<string, unknown>): string {
  const name = ((itemData.name as string) || '').toLowerCase();
  const type = ((itemData.type as string) || '').toLowerCase();
  const context = JSON.stringify(itemData).toLowerCase();

  if (context.includes('bank') || context.includes('wire') || context.includes('fund') ||
      context.includes('account') || context.includes('financial') || context.includes('money') ||
      context.includes('shell company') || context.includes('offshore')) {
    return 'finance';
  }
  if (context.includes('court') || context.includes('indictment') || context.includes('verdict') ||
      context.includes('deposition') || context.includes('testimony') || context.includes('attorney') ||
      context.includes('judge') || type.includes('legal')) {
    return 'legal';
  }
  if (context.includes('journalist') || context.includes('reporter') || context.includes('media') ||
      context.includes('source') || context.includes('investigation')) {
    return 'journalism';
  }
  return 'general';
}

// Build task display data from quarantine item
function buildTaskData(item: Record<string, unknown>) {
  const itemData = item.item_data as Record<string, unknown>;
  const itemType = item.item_type as string;

  // For relationships, build a display name from source → target
  let displayName: unknown = itemData.name || itemData.entity_name || itemData.label || itemData.title;
  if (!displayName && itemType === 'relationship') {
    const src = itemData.sourceName || itemData.source || itemData.from || '?';
    const tgt = itemData.targetName || itemData.target || itemData.to || '?';
    const relType = itemData.relationshipType || itemData.relationship_type || itemData.relation || 'bağlantı';
    displayName = `${src} → ${relType} → ${tgt}`;
  }
  if (!displayName) {
    displayName = itemData.caption || `[${itemType || 'varlık'}]`;
  }

  const base = {
    quarantine_id: item.id,
    item_type: itemType,
    entity_name: displayName,
    entity_type: itemData.type || itemData.entity_type || itemType || 'unknown',
    confidence: item.confidence,
    source_type: item.source_type,
    source_provider: item.source_provider,
    source_url: item.source_url,
    raw_data: itemData,
    // Verification Desk v2: Source citation for spotlight
    source_sentence: (itemData.source_sentence as string) || (itemData.context as string) || '',
    source_page: (itemData.source_page as number) || null,
  };

  if (itemType === 'relationship') {
    return {
      ...base,
      source_entity: itemData.source || itemData.sourceName || itemData.from,
      target_entity: itemData.target || itemData.targetName || itemData.to,
      relationship_type: itemData.relationship_type || itemData.relationshipType || itemData.relation,
    };
  }

  if (itemType === 'date') {
    return {
      ...base,
      date_value: itemData.date || itemData.value,
      date_context: itemData.context || itemData.description,
    };
  }

  return base;
}

// Verification Desk v2: Assign spotlight mode
// %50 normal, %20 honeypot, %30 none
function assignSpotlightMode(): 'normal' | 'honeypot' | 'none' {
  const roll = Math.random();
  if (roll < 0.50) return 'normal';
  if (roll < 0.70) return 'honeypot';
  return 'none';
}

// Verification Desk v2: Detect high-risk content
// Suç, mağduriyet, ölüm iddiaları → 48 saat bekleme + 3 reviewer
const HIGH_RISK_KEYWORDS = [
  'kill', 'murder', 'trafficking', 'abuse', 'assault', 'rape',
  'victim', 'mağdur', 'suç', 'ölüm', 'istismar', 'cinayet',
  'co-conspirator', 'accomplice', 'perpetrator', 'trafficker',
  'criminal', 'manslaughter', 'homicide', 'exploitation',
];

const HIGH_RISK_EVIDENCE_TYPES = [
  'criminal_accusation', 'victim_identification',
];

function detectRiskLevel(itemData: Record<string, unknown>): 'standard' | 'high' {
  const context = JSON.stringify(itemData).toLowerCase();

  // Check evidence type
  const evidenceType = (itemData.evidenceType as string || itemData.evidence_type as string || '').toLowerCase();
  if (HIGH_RISK_EVIDENCE_TYPES.some(t => evidenceType.includes(t))) return 'high';

  // Check category
  const category = (itemData.category as string || '').toLowerCase();
  if (category === 'victim' || category === 'subject') return 'high';

  // Check keywords in context
  if (HIGH_RISK_KEYWORDS.some(kw => context.includes(kw))) return 'high';

  return 'standard';
}

export async function POST(req: NextRequest) {
  const blocked = applyRateLimit(req, GAME_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { network_id, limit = 50 } = body;

    if (!network_id) {
      return NextResponse.json({ error: 'network_id is required' }, { status: 400 });
    }

    // ALL game tables use UUID for network_id — resolve slug to UUID first
    let resolvedNetworkId: string | null = network_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(network_id);
    if (!isUUID) {
      const { data: network } = await supabaseAdmin
        .from('networks')
        .select('id')
        .or(`slug.eq.${network_id},name.ilike.%${network_id.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      if (network) {
        resolvedNetworkId = network.id;
      } else {
        return NextResponse.json(
          { error: `Network "${network_id}" not found`, generated: 0 },
          { status: 404 }
        );
      }
    }

    // 1. Fetch quarantine items that don't have tasks yet
    let quarantineQuery = supabaseAdmin
      .from('data_quarantine')
      .select('*')
      .in('verification_status', ['quarantined', 'pending_review'])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (resolvedNetworkId) {
      quarantineQuery = quarantineQuery.eq('network_id', resolvedNetworkId);
    }

    const { data: quarantineItems, error: qError } = await quarantineQuery;

    if (qError) throw qError;
    if (!quarantineItems || quarantineItems.length === 0) {
      return NextResponse.json({ generated: 0, message: 'No quarantine items to process' });
    }

    // 2. Check which already have tasks
    const quarantineIds = quarantineItems.map((q: Record<string, unknown>) => q.id);
    const { data: existingTasks } = await supabaseAdmin
      .from('investigation_tasks')
      .select('source_quarantine_id')
      .in('source_quarantine_id', quarantineIds);

    const existingSet = new Set((existingTasks || []).map((t: Record<string, unknown>) => t.source_quarantine_id));

    // 3. Generate tasks for items without existing tasks
    const newTasks = quarantineItems
      .filter((q: Record<string, unknown>) => !existingSet.has(q.id))
      .map((item: Record<string, unknown>) => {
        const itemType = item.item_type as string;
        const itemData = item.item_data as Record<string, unknown>;
        const riskLevel = detectRiskLevel(itemData);
        const spotlightMode = assignSpotlightMode();

        // High-risk: 3 reviewers + 48h cooling period
        const requiredReviews = riskLevel === 'high' ? 3 :
          (item.source_type === 'structured_api' ? 1 : 2);

        const coolingExpiresAt = riskLevel === 'high'
          ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          : null;

        return {
          network_id: resolvedNetworkId,
          task_type: `${itemType}_verification`,
          difficulty: calculateDifficulty(item),
          role_affinity: determineRoleAffinity(itemData),
          source_document_id: item.document_id,
          source_quarantine_id: item.id,
          task_data: buildTaskData(item),
          context_data: {
            document_id: item.document_id,
            source_provider: item.source_provider,
            source_url: item.source_url,
            original_confidence: item.confidence,
          },
          is_calibration: false,
          required_reviews: requiredReviews,
          status: 'open',
          // Verification Desk v2
          spotlight_mode: spotlightMode,
          risk_level: riskLevel,
          cooling_expires_at: coolingExpiresAt,
        };
      });

    if (newTasks.length === 0) {
      return NextResponse.json({ generated: 0, message: 'All items already have tasks' });
    }

    // 4. Insert tasks
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('investigation_tasks')
      .insert(newTasks)
      .select('id');

    if (insertError) throw insertError;

    // 5. Log to transparency log
    await supabaseAdmin.from('transparency_log').insert(
      (inserted || []).map((t: Record<string, unknown>) => ({
        action_type: 'task_created',
        actor_type: 'system',
        target_type: 'task',
        target_id: t.id as string,
        action_data: { source: 'quarantine_pipeline', batch_size: newTasks.length },
        network_id: resolvedNetworkId,
      }))
    );

    return NextResponse.json({
      generated: inserted?.length || 0,
      total_quarantine: quarantineItems.length,
      already_had_tasks: existingSet.size,
    });
  } catch (error) {
    return safeErrorResponse('POST /api/game/generate', error);
  }
}
