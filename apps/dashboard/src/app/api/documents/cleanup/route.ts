/**
 * /api/documents/cleanup
 * GET: Preview what will be deleted
 * DELETE: Remove all documents EXCEPT the clean batch import
 *
 * "Sıfırdan temiz başlangıç" — sadece 870 Maxwell batch import kalır
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CLEAN_BATCH_ID = 'maxwell-courtlistener-2026-03-13';

export async function GET() {
  // Find docs that are NOT from our clean batch
  const { data: oldDocs, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, source_type, metadata, created_at')
    .or(`metadata->>import_batch.is.null,metadata->>import_batch.neq.${CLEAN_BATCH_ID}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also check quarantine
  const { count: quarantineCount } = await supabaseAdmin
    .from('data_quarantine')
    .select('id', { count: 'exact', head: true });

  // Check derived items
  const { count: derivedCount } = await supabaseAdmin
    .from('document_derived_items')
    .select('id', { count: 'exact', head: true });

  // Check scan queue
  const { count: scanQueueCount } = await supabaseAdmin
    .from('document_scan_queue')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({
    toDelete: {
      documents: oldDocs?.length || 0,
      quarantine: quarantineCount || 0,
      derivedItems: derivedCount || 0,
      scanQueue: scanQueueCount || 0,
    },
    preview: (oldDocs || []).slice(0, 10).map(d => ({
      id: d.id,
      title: d.title?.substring(0, 80),
      source: d.source_type,
      batch: (d.metadata as Record<string, unknown>)?.import_batch || 'NO_BATCH',
    })),
    cleanBatchId: CLEAN_BATCH_ID,
    message: `${oldDocs?.length || 0} old documents + ${quarantineCount || 0} quarantine + ${derivedCount || 0} derived items + ${scanQueueCount || 0} scan queue will be deleted. Confirm with DELETE.`
  });
}

// ============================================
// PATCH: Server-side dedup — SQL ile tek seferde tüm duplikatları sil
// ============================================
export async function PATCH() {
  try {
    // Step 1: Find all duplicate external_ids using raw SQL via RPC
    // Get ALL documents, group by external_id, find dupes
    const { data: allDocs, error: fetchErr } = await supabaseAdmin
      .from('documents')
      .select('id, external_id, created_at')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Group by external_id in memory
    const groups: Record<string, Array<{ id: string; created_at: string }>> = {};
    for (const d of (allDocs || [])) {
      const key = d.external_id || d.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ id: d.id, created_at: d.created_at });
    }

    // Keep newest per group, delete rest
    const toDeleteIds: string[] = [];
    for (const docs of Object.values(groups)) {
      if (docs.length > 1) {
        docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        for (let i = 1; i < docs.length; i++) {
          toDeleteIds.push(docs[i].id);
        }
      }
    }

    if (toDeleteIds.length === 0) {
      const { count } = await supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true });
      return NextResponse.json({
        success: true,
        deleted: 0,
        remaining: count || 0,
        message: `ZERO DUPLICATES — ${count} clean documents!`
      });
    }

    // Delete in batches of 200
    let totalDeleted = 0;
    for (let i = 0; i < toDeleteIds.length; i += 200) {
      const batch = toDeleteIds.slice(i, i + 200);

      // Delete related data first
      await supabaseAdmin.from('document_derived_items').delete().in('document_id', batch);
      await supabaseAdmin.from('document_scan_queue').delete().in('document_id', batch);
      await supabaseAdmin.from('document_network_mappings').delete().in('document_id', batch);

      const { count } = await supabaseAdmin
        .from('documents')
        .delete({ count: 'exact' })
        .in('id', batch);
      totalDeleted += (count || 0);
    }

    const { count: remaining } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      remaining: remaining || 0,
      duplicatesFound: toDeleteIds.length,
      message: `${totalDeleted} duplikat silindi. ${remaining} tertemiz belge kaldı!`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const startTime = Date.now();
  const log: string[] = [];

  try {
    // 1. Find old document IDs
    const { data: oldDocs } = await supabaseAdmin
      .from('documents')
      .select('id')
      .or(`metadata->>import_batch.is.null,metadata->>import_batch.neq.${CLEAN_BATCH_ID}`);

    const oldIds = (oldDocs || []).map(d => d.id);
    log.push(`Old documents count: ${oldIds.length}`);

    // 2. Delete related data first (foreign key constraints)

    // 2a. Delete derived items for old docs
    if (oldIds.length > 0) {
      const { count: derivedDeleted } = await supabaseAdmin
        .from('document_derived_items')
        .delete({ count: 'exact' })
        .in('document_id', oldIds);
      log.push(`Derived items deleted: ${derivedDeleted || 0}`);
    }

    // 2b. Delete scan queue for old docs
    if (oldIds.length > 0) {
      const { count: scanDeleted } = await supabaseAdmin
        .from('document_scan_queue')
        .delete({ count: 'exact' })
        .in('document_id', oldIds);
      log.push(`Scan queue deleted: ${scanDeleted || 0}`);
    }

    // 2c. Delete document_network_mappings for old docs
    if (oldIds.length > 0) {
      const { count: mappingDeleted } = await supabaseAdmin
        .from('document_network_mappings')
        .delete({ count: 'exact' })
        .in('document_id', oldIds);
      log.push(`Network mappings deleted: ${mappingDeleted || 0}`);
    }

    // 3. Delete ALL quarantine data (fresh start)
    const { count: quarantineDeleted } = await supabaseAdmin
      .from('data_quarantine')
      .delete({ count: 'exact' })
      .gte('created_at', '2000-01-01'); // Delete all
    log.push(`Quarantine deleted: ${quarantineDeleted || 0}`);

    // 4. Delete ALL quarantine reviews
    const { count: reviewsDeleted } = await supabaseAdmin
      .from('quarantine_reviews')
      .delete({ count: 'exact' })
      .gte('created_at', '2000-01-01');
    log.push(`Quarantine reviews deleted: ${reviewsDeleted || 0}`);

    // 5. Delete ALL data provenance
    const { count: provenanceDeleted } = await supabaseAdmin
      .from('data_provenance')
      .delete({ count: 'exact' })
      .gte('created_at', '2000-01-01');
    log.push(`Provenance deleted: ${provenanceDeleted || 0}`);

    // 6. Now delete the old documents themselves
    if (oldIds.length > 0) {
      // Delete in batches of 100
      let totalDeleted = 0;
      for (let i = 0; i < oldIds.length; i += 100) {
        const batch = oldIds.slice(i, i + 100);
        const { count } = await supabaseAdmin
          .from('documents')
          .delete({ count: 'exact' })
          .in('id', batch);
        totalDeleted += (count || 0);
      }
      log.push(`Old documents deleted: ${totalDeleted}`);
    }

    // 7. Also clean up scan queue entries for remaining docs that are orphaned
    const { count: orphanScanDeleted } = await supabaseAdmin
      .from('document_scan_queue')
      .delete({ count: 'exact' })
      .gte('created_at', '2000-01-01');
    log.push(`Orphan scan queue cleaned: ${orphanScanDeleted || 0}`);

    // 8. Verify final state
    const { count: remainingDocs } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true });

    const { count: remainingQuarantine } = await supabaseAdmin
      .from('data_quarantine')
      .select('id', { count: 'exact', head: true });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      deleted: {
        documents: oldIds.length,
        log,
      },
      remaining: {
        documents: remainingDocs || 0,
        quarantine: remainingQuarantine || 0,
      },
      duration: `${duration}s`,
      message: `Cleanup completed! ${remainingDocs} clean Maxwell documents remain. Quarantine reset. Fresh clean start!`
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, log }, { status: 500 });
  }
}
