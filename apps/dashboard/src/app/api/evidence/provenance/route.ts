// ============================================
// SPRINT 6B: EVIDENCE PROVENANCE API
// GET  /api/evidence/provenance?evidence_id=uuid — Provenance zinciri getir
// POST /api/evidence/provenance — Yeni provenance kaydı ekle
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, evidenceProvenanceSchema } from '@/lib/validationSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidence_id');

    if (!evidenceId) {
      return NextResponse.json(
        { error: 'evidence_id parametresi gerekli' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('evidence_provenance')
      .select('*')
      .eq('evidence_id', evidenceId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ provenance: data || [] });
  } catch (err) {
    console.error('[evidence/provenance] GET error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();

    // Validate provenance data
    const validation = validateBody(evidenceProvenanceSchema, body);
    if (!validation.success) return validation.response;
    const {
      evidence_id,
      evidence_table = 'evidence_archive',
      source_type,
      source_hierarchy = 'tertiary',
      source_url,
      source_archive_url,
      source_hash,
      language = 'en',
      metadata_stripped = false,
      link_id, // İlgili link varsa confidence'ı yeniden hesapla
    } = validation.data;

    // Provenance kaydı ekle
    const { data: provenance, error: insertError } = await supabaseAdmin
      .from('evidence_provenance')
      .insert({
        evidence_id,
        evidence_table,
        source_type,
        source_hierarchy,
        source_url: source_url ?? null,
        source_archive_url: source_archive_url ?? null,
        source_hash: source_hash ?? null,
        language,
        metadata_stripped,
        verification_chain: [],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // İlgili link varsa confidence'ı yeniden hesapla
    let updatedConfidence = null;
    if (link_id) {
      try {
        const { data: result } = await supabaseAdmin.rpc(
          'recalculate_link_confidence',
          { p_link_id: link_id }
        );
        updatedConfidence = result;
      } catch {
        // RPC henüz mevcut olmayabilir
      }
    }

    return NextResponse.json({
      provenance,
      updatedConfidence,
    });
  } catch (err) {
    console.error('[evidence/provenance] POST error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
