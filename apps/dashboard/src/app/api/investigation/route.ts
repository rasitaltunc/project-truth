// ============================================
// PROJECT TRUTH: INVESTIGATION API
// POST   /api/investigation — yeni draft oluştur
// PATCH  /api/investigation — güncelle (yayınla, başlık ekle)
// Uses RPC functions (bypasses PostgREST schema cache)
// SECURITY: C1 (Input Validation) + E1 (Error Sanitization)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { investigationCreateSchema, validateBody } from '@/lib/validation';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ============================================
// POST — Yeni investigation başlat (draft)
// ============================================

// SECURITY C1: Zod schema for POST validation
const investigationCreateValidationSchema = z.object({
  fingerprint: z.string().min(8).max(128),
  networkId: z.string().uuid().optional(),
  authorName: z.string().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    // SECURITY C1: Validate request body with Zod
    const validation = await validateBody(request, investigationCreateValidationSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { fingerprint, networkId, authorName } = validation.data;

    const { data, error } = await supabaseAdmin.rpc('create_investigation', {
      p_network_id: networkId || null,
      p_author_name: authorName || 'Anonim Araştırmacı',
      p_author_fingerprint: fingerprint,
    });

    // SECURITY E1: Don't expose RPC error details to client
    if (error) {
      console.error('Investigation create error:', error.message);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    return NextResponse.json({ investigation: data });

  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic message to client
    console.error('Investigation POST error:', error?.message || error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// ============================================
// PATCH — Investigation güncelle (yayınla, başlık ekle)
// ============================================

// SECURITY C1: Zod schema for PATCH validation
const investigationUpdateSchema = z.object({
  id: z.string().uuid('Geçersiz ID formatı'),
  fingerprint: z.string().min(8).max(128),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export async function PATCH(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    // SECURITY C1: Validate request body with Zod
    const validation = await validateBody(request, investigationUpdateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { id, fingerprint, title, description, status } = validation.data;

    const { data, error } = await supabaseAdmin.rpc('update_investigation', {
      p_id: id,
      p_fingerprint: fingerprint,
      p_title: title || null,
      p_description: description || null,
      p_status: status || null,
    });

    // SECURITY E1: Don't expose RPC error details to client
    if (error) {
      console.error('Investigation update error:', error.message);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Bulunamadı veya yetki yok' }, { status: 404 });
    }

    return NextResponse.json({ investigation: data });

  } catch (error: any) {
    // SECURITY E1: Log details server-side, return generic message to client
    console.error('Investigation PATCH error:', error?.message || error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
