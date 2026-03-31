// ═══════════════════════════════════════════
// PROPOSE LINK API — Sprint 10
// POST: Yeni bağlantı önerisi oluştur
// GET: Hayalet linkleri listele
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { applyRateLimit, EVIDENCE_RATE_LIMIT, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, linkProposeSchema } from '@/lib/validationSchemas';
import { safeErrorResponse } from '@/lib/errorHandler';
import { safeLimit, safeOffset } from '@/lib/inputSanitizer';
import { resolveIdentity, identityHasPermission } from '@/lib/authBridge';

// ── Mock data (Supabase yokken) ──
const mockLinks: any[] = [];

export async function GET(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('network_id');
    const status = searchParams.get('status');
    const limit = safeLimit(searchParams.get('limit'), 50);
    const offset = safeOffset(searchParams.get('offset'));

    if (!isSupabaseReady() || !supabase) {
      // Mock mode
      let filtered = [...mockLinks];
      if (networkId) filtered = filtered.filter(l => l.network_id === networkId);
      if (status) {
        const statuses = status.split(',');
        filtered = filtered.filter(l => statuses.includes(l.status));
      }
      return NextResponse.json({
        links: filtered.slice(offset, offset + limit),
        total: filtered.length,
        source: 'mock',
      });
    }

    // SECURITY A2: Explicit select — excludes fingerprint columns
    let query = (supabase as any)
      .from('proposed_links')
      .select('id, network_id, source_node_id, target_node_id, relationship_type, description, status, community_upvotes, community_downvotes, total_votes, evidence_count, created_at, updated_at, expires_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (networkId) query = query.eq('network_id', networkId);
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ links: [], total: 0, source: 'no_table' });
      }
      throw error;
    }

    return NextResponse.json({
      links: data || [],
      total: count || 0,
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('GET /api/links/propose', err);
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const blocked = applyRateLimit(request, EVIDENCE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = validateBody(linkProposeSchema, body);
    if (!validation.success) return validation.response;

    const {
      network_id,
      source_id,
      target_id,
      relationship_type,
      description,
      badge_tier,
      reputation_staked,
      initial_evidence_url,
      initial_evidence_description,
    } = validation.data;

    // ── AUTH BRIDGE: Resolve identity (auth token OR fingerprint header) ──
    // SECURITY: NEVER fall back to body.fingerprint — attacker can fabricate it
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli. Giriş yapın veya anonim oturum başlatın.' },
        { status: 401 }
      );
    }

    // ── PERMISSION CHECK: Only contributors+ can propose links ──
    if (!identityHasPermission(identity, 'propose_link')) {
      return NextResponse.json(
        { error: 'Bağlantı önermek için giriş yapmanız gerekiyor.' },
        { status: 403 }
      );
    }

    const fingerprint = identity.fingerprint;

    if (source_id === target_id) {
      return NextResponse.json(
        { error: 'Kaynak ve hedef ayni olamaz' },
        { status: 400 }
      );
    }

    const record = {
      network_id: network_id || null,
      source_id,
      target_id,
      relationship_type: relationship_type || 'unknown',
      description,
      proposer_fingerprint: fingerprint,
      proposer_badge_tier: badge_tier || 'community',
      status: 'pending_evidence',
      evidence_count: initial_evidence_url ? 1 : 0,
      evidence_threshold: 3,
      community_upvotes: 0,
      community_downvotes: 0,
      total_votes: 0,
      reputation_staked: reputation_staked || 0,
      initial_evidence_url: initial_evidence_url || null,
      initial_evidence_description: initial_evidence_description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (!isSupabaseReady() || !supabase) {
      // Mock mode
      const mockRecord = { ...record, id: `mock-${Date.now()}` };
      mockLinks.push(mockRecord);
      return NextResponse.json({ link: mockRecord, source: 'mock' });
    }

    // ── Duplicate kontrolu ──
    const { data: existing } = await (supabase as any)
      .from('proposed_links')
      .select('id')
      .eq('source_id', source_id)
      .eq('target_id', target_id)
      .in('status', ['pending_evidence', 'pending_vote'])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Bu baglanti icin zaten bekleyen bir oneri var' },
        { status: 409 }
      );
    }

    // ── Insert ──
    const { data, error } = await (supabase as any)
      .from('proposed_links')
      .insert(record)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        const mockRecord = { ...record, id: `mock-${Date.now()}` };
        mockLinks.push(mockRecord);
        return NextResponse.json({ link: mockRecord, source: 'no_table' });
      }
      throw error;
    }

    // Ilk kanit varsa evidence tablosuna da ekle
    if (initial_evidence_url && data) {
      await (supabase as any)
        .from('proposed_link_evidence')
        .insert({
          proposed_link_id: data.id,
          contributor_fingerprint: fingerprint,
          evidence_type: 'document',
          confidence_level: 0.5,
          source_url: initial_evidence_url,
          description: initial_evidence_description || 'Ilk kanit',
          reputation_staked: 0,
        })
        .catch(() => {}); // Fire-and-forget
    }

    return NextResponse.json({ link: data, source: 'supabase' });
  } catch (err: any) {
    return safeErrorResponse('POST /api/links/propose', err);
  }
}
