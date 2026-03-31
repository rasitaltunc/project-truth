import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/auth';
import { checkRateLimit, getClientId } from '@/lib/rateLimit';

// ============================================
// REPORT ERROR API — Sprint 18 Legal Fortress Requirement
// "Bu bilgi yanlış" bildirimi
// ============================================

const REPORT_RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10/saat

const VALID_REASONS = new Set([
  'inaccurate', 'outdated', 'no_evidence', 'misleading',
  'privacy', 'harmful', 'duplicate', 'other',
]);

const VALID_TARGET_TYPES = new Set(['node', 'link', 'evidence', 'annotation']);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(`report:${clientId}`, REPORT_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla bildirim gönderdiniz. Lütfen bekleyin.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      targetType,
      targetId,
      targetName,
      networkId,
      reason,
      details,
      correctInfo,
      sourceUrl,
      email,
      fingerprint,
      timestamp,
    } = body;

    // ── Input validation ──
    if (!targetType || !VALID_TARGET_TYPES.has(targetType)) {
      return NextResponse.json({ error: 'Geçersiz hedef tipi' }, { status: 400 });
    }

    if (!targetId || typeof targetId !== 'string' || targetId.length > 100) {
      return NextResponse.json({ error: 'Geçersiz hedef ID' }, { status: 400 });
    }

    if (!reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Geçersiz bildirim nedeni' }, { status: 400 });
    }

    if (!details || typeof details !== 'string' || details.trim().length < 10) {
      return NextResponse.json(
        { error: 'Detay açıklaması en az 10 karakter olmalı' },
        { status: 400 }
      );
    }

    if (details.length > 2000) {
      return NextResponse.json(
        { error: 'Detay açıklaması 2000 karakteri aşamaz' },
        { status: 400 }
      );
    }

    // URL validation (if provided)
    if (sourceUrl && typeof sourceUrl === 'string' && sourceUrl.length > 0) {
      try {
        const url = new URL(sourceUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return NextResponse.json({ error: 'Geçersiz URL protokolü' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Geçersiz URL formatı' }, { status: 400 });
      }
    }

    // Email validation (if provided)
    if (email && typeof email === 'string' && email.length > 0) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: 'Geçersiz e-posta formatı' }, { status: 400 });
      }
    }

    // ── Store report ──
    const reportData = {
      target_type: targetType,
      target_id: String(targetId).slice(0, 100),
      target_name: String(targetName || '').slice(0, 200),
      network_id: networkId ? String(networkId).slice(0, 100) : null,
      reason,
      details: details.trim().slice(0, 2000),
      correct_info: correctInfo ? String(correctInfo).trim().slice(0, 2000) : null,
      source_url: sourceUrl ? String(sourceUrl).trim().slice(0, 500) : null,
      reporter_email: email ? String(email).trim().slice(0, 200) : null,
      reporter_fingerprint: fingerprint ? String(fingerprint).slice(0, 100) : null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Try to store in Supabase if available
    if (isSupabaseReady() && supabase) {
      try {
        const { error: dbError } = await (supabase as any)
          .from('error_reports')
          .insert(reportData);

        if (dbError) {
          // Table might not exist yet — log and continue
          console.warn('[report-error] Supabase insert failed:', dbError.message);
          // Fall through to file-based logging
        } else {
          return NextResponse.json({
            success: true,
            message: 'Bildirim alındı. Teşekkür ederiz.',
          });
        }
      } catch (dbErr) {
        console.warn('[report-error] Supabase error:', dbErr);
      }
    }

    // Fallback: Log to console (will be captured by Sentry)
    console.log('[ERROR_REPORT]', JSON.stringify(reportData));

    return NextResponse.json({
      success: true,
      message: 'Bildirim alındı. Teşekkür ederiz.',
    });

  } catch (err: any) {
    console.error('[report-error] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
