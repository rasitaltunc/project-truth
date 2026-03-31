// ============================================
// SPRINT 6B: CLAIMREVIEW API
// GET  /api/evidence/claimreview?evidence_id=uuid — ClaimReview JSON-LD getir
// POST /api/evidence/claimreview — IFCN rating ekle (Tier 3+ gerekli)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, uuidSchema } from '@/lib/validationSchemas';

const claimReviewSchema = z.object({
  evidence_id: uuidSchema,
  ifcn_rating: z.enum(['true', 'mostly_true', 'half_true', 'mostly_false', 'false', 'unverifiable']),
});

export const dynamic = 'force-dynamic';

// IFCN rating → insan tarafından okunabilir etiket
const IFCN_LABELS: Record<string, string> = {
  true: 'Doğru',
  mostly_true: 'Çoğunlukla Doğru',
  half_true: 'Yarı Doğru',
  mostly_false: 'Çoğunlukla Yanlış',
  false: 'Yanlış',
  pants_on_fire: 'Tamamen Yanlış',
  missing_context: 'Bağlam Eksik',
  unverifiable: 'Doğrulanamaz',
};

// IFCN rating → sayısal değer (0-5)
const IFCN_VALUES: Record<string, number> = {
  true: 5,
  mostly_true: 4,
  half_true: 3,
  mostly_false: 2,
  false: 1,
  pants_on_fire: 0,
  missing_context: 3,
  unverifiable: 2,
};

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidence_id');
    const format = searchParams.get('format') || 'json'; // json veya jsonld

    if (!evidenceId) {
      return NextResponse.json(
        { error: 'evidence_id parametresi gerekli' },
        { status: 400 }
      );
    }

    const { data: evidence, error } = await supabaseAdmin
      .from('evidence_archive')
      .select('id, title, ifcn_rating, ifcn_rated_by, ifcn_rating_date, claim_review_json, claim_review_published, source_date, source_url, source_name')
      .eq('id', evidenceId)
      .single();

    if (error || !evidence) {
      return NextResponse.json(
        { error: 'Kanıt bulunamadı' },
        { status: 404 }
      );
    }

    if (!evidence.ifcn_rating) {
      return NextResponse.json(
        { error: 'Bu kanıt henüz IFCN değerlendirmesi almamış' },
        { status: 404 }
      );
    }

    // ClaimReview JSON-LD oluştur veya mevcut olanı döndür
    const claimReview = evidence.claim_review_json || {
      '@context': 'https://schema.org',
      '@type': 'ClaimReview',
      datePublished: evidence.ifcn_rating_date || new Date().toISOString(),
      claimReviewed: evidence.title,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: IFCN_VALUES[evidence.ifcn_rating] ?? 2,
        bestRating: 5,
        worstRating: 0,
        alternateName: IFCN_LABELS[evidence.ifcn_rating] || evidence.ifcn_rating,
      },
      itemReviewed: {
        '@type': 'Claim',
        datePublished: evidence.source_date,
        author: evidence.source_name
          ? { '@type': 'Organization', name: evidence.source_name }
          : undefined,
      },
      author: {
        '@type': 'Organization',
        name: 'Project Truth',
        url: 'https://projecttruth.org',
      },
      url: evidence.source_url,
    };

    // Format: application/ld+json veya normal JSON
    if (format === 'jsonld') {
      return new NextResponse(JSON.stringify(claimReview, null, 2), {
        headers: {
          'Content-Type': 'application/ld+json',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json({
      claimReview,
      rating: evidence.ifcn_rating,
      ratingLabel: IFCN_LABELS[evidence.ifcn_rating],
      ratedBy: evidence.ifcn_rated_by,
      ratedAt: evidence.ifcn_rating_date,
      published: evidence.claim_review_published,
    });
  } catch (err) {
    console.error('[evidence/claimreview] GET error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await request.json();

    // Validate claimreview data
    const validation = validateBody(claimReviewSchema, body);
    if (!validation.success) return validation.response;
    const { evidence_id, ifcn_rating } = validation.data;

    // Extract fingerprint from body (not validated by schema in this route)
    const { fingerprint } = body;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'evidence_id, ifcn_rating ve fingerprint gerekli' },
        { status: 400 }
      );
    }

    // Tier 3+ (Gazeteci veya Kurumsal) kontrolü
    const { data: badge } = await supabaseAdmin
      .rpc('get_user_badge', {
        p_fingerprint: fingerprint,
        p_network_id: null,
      })
      .maybeSingle();

    const allowedTiers = ['journalist', 'institutional'];
    if (!badge || !allowedTiers.includes(badge.badge_tier)) {
      return NextResponse.json(
        { error: 'IFCN değerlendirmesi yalnızca Gazeteci (Tier 3) ve üzeri kullanıcılar tarafından yapılabilir.' },
        { status: 403 }
      );
    }

    // ClaimReview JSON-LD oluştur
    const { data: evidence } = await supabaseAdmin
      .from('evidence_archive')
      .select('title, source_date, source_name, source_url')
      .eq('id', evidence_id)
      .single();

    if (!evidence) {
      return NextResponse.json({ error: 'Kanıt bulunamadı' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const claimReview = {
      '@context': 'https://schema.org',
      '@type': 'ClaimReview',
      datePublished: now,
      claimReviewed: evidence.title,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: IFCN_VALUES[ifcn_rating],
        bestRating: 5,
        worstRating: 0,
        alternateName: IFCN_LABELS[ifcn_rating],
      },
      itemReviewed: {
        '@type': 'Claim',
        datePublished: evidence.source_date,
        author: evidence.source_name
          ? { '@type': 'Organization', name: evidence.source_name }
          : undefined,
      },
      author: {
        '@type': 'Organization',
        name: 'Project Truth',
        url: 'https://projecttruth.org',
      },
      url: evidence.source_url,
    };

    // Evidence güncelle
    const { error: updateError } = await supabaseAdmin
      .from('evidence_archive')
      .update({
        ifcn_rating,
        ifcn_rated_by: fingerprint,
        ifcn_rating_date: now,
        claim_review_json: claimReview,
        claim_review_published: true,
      })
      .eq('id', evidence_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      claimReview,
      rating: ifcn_rating,
      ratingLabel: IFCN_LABELS[ifcn_rating],
    });
  } catch (err) {
    console.error('[evidence/claimreview] POST error:', err);
    return NextResponse.json({ error: 'Server hatası' }, { status: 500 });
  }
}
