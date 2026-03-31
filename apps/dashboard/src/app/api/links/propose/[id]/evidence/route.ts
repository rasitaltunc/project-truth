// ═══════════════════════════════════════════
// EVIDENCE API — Sprint 10
// POST: Hayalet ipe kanıt ekle
// GET: Bir ipin kanıtlarını listele
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, linkProposeEvidenceSchema } from '@/lib/validationSchemas';
import { safeErrorResponse } from '@/lib/errorHandler';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({ evidence: [], source: 'no_db' });
    }

    // SECURITY A2: Explicit select — excludes fingerprint columns
    const { data, error } = await (supabase as any)
      .from('proposed_link_evidence')
      .select('id, proposed_link_id, evidence_type, evidence_url, description, created_at')
      .eq('proposed_link_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ evidence: [], source: 'no_table' });
      }
      throw error;
    }

    return NextResponse.json({ evidence: data || [], source: 'supabase' });
  } catch (err: any) {
    return safeErrorResponse('GET /api/links/propose/[id]/evidence', err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id: linkId } = await params;
    const body = await request.json();
    const validation = validateBody(linkProposeEvidenceSchema, body);
    if (!validation.success) return validation.response;

    const {
      evidence_type,
      confidence_level,
      source_url,
      description,
      reputation_staked,
    } = validation.data;

    // Resolve identity from request
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli.' },
        { status: 401 }
      );
    }

    // Check permission: submitting evidence is a contribution
    if (!identityHasPermission(identity, 'submit_evidence')) {
      return NextResponse.json(
        { error: 'Bu işlem için yeterli izniniz yok.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        evidence: {
          id: `mock-ev-${Date.now()}`,
          proposed_link_id: linkId,
          contributor_fingerprint: fingerprint,
          evidence_type: evidence_type || 'document',
          confidence_level: confidence_level || 0.5,
          source_url,
          description,
          reputation_staked: reputation_staked || 0,
          created_at: new Date().toISOString(),
        },
        source: 'mock',
      });
    }

    // ── Insert evidence ──
    const { data: evData, error: evError } = await (supabase as any)
      .from('proposed_link_evidence')
      .insert({
        proposed_link_id: linkId,
        contributor_fingerprint: fingerprint,
        evidence_type: evidence_type || 'document',
        confidence_level: confidence_level || 0.5,
        source_url: source_url || null,
        description,
        reputation_staked: reputation_staked || 0,
      })
      .select()
      .single();

    if (evError) {
      if (evError.code === '23505') {
        return NextResponse.json(
          { error: 'Bu oneri icin zaten kanit eklediniz' },
          { status: 409 }
        );
      }
      if (evError.code === '42P01') {
        return NextResponse.json({ evidence: null, source: 'no_table' });
      }
      throw evError;
    }

    // ── Update evidence count ──
    const { data: countData } = await (supabase as any)
      .from('proposed_link_evidence')
      .select('id', { count: 'exact' })
      .eq('proposed_link_id', linkId);

    const newCount = countData?.length || 0;

    // ── Check threshold → auto status update ──
    const { data: linkData } = await (supabase as any)
      .from('proposed_links')
      .select('evidence_threshold, status')
      .eq('id', linkId)
      .single();

    const threshold = linkData?.evidence_threshold || 3;
    const newStatus = newCount >= threshold ? 'pending_vote' : linkData?.status;

    const { data: updated } = await (supabase as any)
      .from('proposed_links')
      .update({
        evidence_count: newCount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)
      .select()
      .single();

    return NextResponse.json({
      evidence: evData,
      updated,
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('POST /api/links/propose/[id]/evidence', err);
  }
}
