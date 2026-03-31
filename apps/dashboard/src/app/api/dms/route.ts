// ═══════════════════════════════════════════
// DMS (Dead Man's Switch) API — Sprint 9
// POST: Oluştur/Check-in/Pause/Cancel
// GET: Kullanıcının switch'lerini listele
//
// SECURITY SPRINT S1+S2: Rate limiting + fingerprint validation
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { checkRateLimit, getClientId, EVIDENCE_RATE_LIMIT, DMS_CRITICAL_RATE_LIMIT } from '@/lib/rateLimit';
import { quickValidateFingerprint } from '@/lib/serverFingerprint';
import { logAuditActionFromRequest } from '@/lib/auditLog';
import { validateSession } from '@/lib/sessionValidator';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';

// ── GET: Kullanıcının DMS listesi ──
// SECURITY A1: Fingerprint from X-User-Fingerprint header (URL param fallback for backwards compat)
// SECURITY B5: Session validation (cookie ↔ header fingerprint match)
export async function GET(request: NextRequest) {
  try {
    // SECURITY B5: Validate session first
    const session = await validateSession(request);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }
    const fingerprint = session.fingerprint;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Geçerli fingerprint parametresi gerekli' },
        { status: 400 }
      );
    }

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        switches: [],
        source: 'no_db',
        message: 'Supabase bağlantısı yok',
      });
    }

    const { data, error } = await (supabase as any)
      .from('dead_man_switches')
      .select('id, name, description, trigger_type, trigger_days, trigger_date, last_checkin, status, triggered_at, recipients, created_at, updated_at')
      .eq('user_id', fingerprint)
      .order('created_at', { ascending: false });

    if (error) {
      // Tablo yoksa boş döndür
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ switches: [], source: 'no_table' });
      }
      console.error('DMS fetch error:', error);
      return NextResponse.json({ switches: [], error: error.message });
    }

    return NextResponse.json({
      switches: data || [],
      source: 'supabase',
    });
  } catch (err: any) {
    return safeErrorResponse('GET /api/dms', err);
  }
}

// ── POST: DMS İşlemleri (create, checkin, pause, cancel) ──
// SECURITY B5: Session validation + B8: per-fingerprint rate limiting
export async function POST(request: NextRequest) {
  try {
    // SECURITY B5: Validate session first
    const session = await validateSession(request);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting — IP-based (general)
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(clientId, EVIDENCE_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit aşıldı. Lütfen bekleyin.' },
        { status: 429 }
      );
    }

    // Request body size check — 2MB default for JSON
    const tooBig = checkBodySize(request);
    if (tooBig) return tooBig;

    const body = await request.json();
    const { action } = body;
    // SECURITY B5: Use session fingerprint, not body fingerprint
    const fingerprint = session.fingerprint!;

    // SECURITY B8: Per-fingerprint rate limit for critical actions
    if (['create'].includes(action)) {
      const fpRateCheck = checkRateLimit(`fp:dms:${fingerprint}`, DMS_CRITICAL_RATE_LIMIT);
      if (!fpRateCheck.allowed) {
        return NextResponse.json(
          { error: 'Bu işlem için çok sık istekte bulunuyorsunuz.' },
          { status: 429 }
        );
      }
    }

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        success: false,
        source: 'no_db',
        message: 'Supabase bağlantısı yok',
      });
    }

    switch (action) {
      case 'create': {
        const {
          name,
          description,
          trigger_type,
          trigger_days,
          trigger_date,
          encrypted_content,
          content_hash,
          content_preview,
          recipients,
        } = body;

        // SECURITY CR5+D3: Input validasyonu — DMS oluşturma
        if (!name || typeof name !== 'string' || name.length > 200) {
          return NextResponse.json(
            { error: 'Geçersiz anahtar adı (max 200 karakter)' },
            { status: 400 }
          );
        }
        if (!encrypted_content || typeof encrypted_content !== 'string') {
          return NextResponse.json(
            { error: 'encrypted_content gerekli' },
            { status: 400 }
          );
        }
        if (description && (typeof description !== 'string' || description.length > 2000)) {
          return NextResponse.json(
            { error: 'Geçersiz açıklama (max 2000 karakter)' },
            { status: 400 }
          );
        }

        // SECURITY CR4: trigger_days bounds kontrolü
        const safeTriggerType = trigger_type === 'scheduled' ? 'scheduled' : 'no_checkin';
        const safeTriggerDays = typeof trigger_days === 'number'
          ? Math.max(1, Math.min(365, Math.floor(trigger_days)))
          : 7;

        // SECURITY CR5: Recipients validasyonu — email format + max count
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const VALID_RECIPIENT_TYPES = new Set(['email', 'journalist', 'authority', 'trusted_user']);
        const MAX_RECIPIENTS = 10;
        const validatedRecipients: Array<{ type: string; value: string; name?: string }> = [];

        if (Array.isArray(recipients)) {
          if (recipients.length > MAX_RECIPIENTS) {
            return NextResponse.json(
              { error: `Maksimum ${MAX_RECIPIENTS} alıcı eklenebilir` },
              { status: 400 }
            );
          }
          for (const r of recipients) {
            if (!r || typeof r !== 'object') continue;
            const rType = String(r.type || 'email').toLowerCase();
            const rValue = String(r.value || '').trim();
            const rName = r.name ? String(r.name).slice(0, 100) : undefined;

            // Tip kontrolü
            if (!VALID_RECIPIENT_TYPES.has(rType)) continue;

            // Email format kontrolü (public hariç tüm tipler email gerektirir)
            if (!rValue || !EMAIL_REGEX.test(rValue)) continue;

            // localhost, internal domain engelleme
            const emailDomain = rValue.split('@')[1]?.toLowerCase();
            if (emailDomain === 'localhost' || emailDomain?.endsWith('.local') || emailDomain?.endsWith('.internal')) {
              continue;
            }

            validatedRecipients.push({ type: rType, value: rValue, name: rName });
          }
        }

        // SECURITY D4: content_preview sınırlama (hassas bilgi sızıntısı)
        const safeContentPreview = content_preview
          ? String(content_preview).slice(0, 200)
          : null;

        const { data, error } = await (supabase as any)
          .from('dead_man_switches')
          .insert({
            user_id: fingerprint,
            name: name.slice(0, 200),
            description: description ? String(description).slice(0, 2000) : null,
            trigger_type: safeTriggerType,
            trigger_days: safeTriggerDays,
            trigger_date: trigger_date || null,
            last_checkin: new Date().toISOString(),
            encrypted_content,
            content_hash,
            content_preview: safeContentPreview,
            recipients: validatedRecipients,
            status: 'active',
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return NextResponse.json({
              success: false,
              source: 'no_table',
              message: 'dead_man_switches tablosu henüz oluşturulmamış',
            });
          }
          throw error;
        }

        // Audit log
        logAuditActionFromRequest(request, {
          fingerprint,
          action: 'dms_create',
          resource: 'dead_man_switches',
          resourceId: data.id,
          result: 'success',
        });

        return NextResponse.json({
          success: true,
          switchId: data.id,
          source: 'supabase',
        });
      }

      case 'checkin': {
        const { switch_id } = body;
        if (!switch_id) {
          return NextResponse.json(
            { error: 'switch_id gerekli' },
            { status: 400 }
          );
        }

        const { error } = await (supabase as any)
          .from('dead_man_switches')
          .update({
            last_checkin: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', switch_id)
          .eq('user_id', fingerprint);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          action: 'checkin',
          timestamp: new Date().toISOString(),
        });
      }

      case 'pause': {
        const { switch_id: pauseId } = body;
        if (!pauseId) {
          return NextResponse.json(
            { error: 'switch_id gerekli' },
            { status: 400 }
          );
        }

        const { error } = await (supabase as any)
          .from('dead_man_switches')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pauseId)
          .eq('user_id', fingerprint);

        if (error) throw error;

        return NextResponse.json({ success: true, action: 'pause' });
      }

      case 'resume': {
        const { switch_id: resumeId } = body;
        if (!resumeId) {
          return NextResponse.json(
            { error: 'switch_id gerekli' },
            { status: 400 }
          );
        }

        const { error } = await (supabase as any)
          .from('dead_man_switches')
          .update({
            status: 'active',
            last_checkin: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId)
          .eq('user_id', fingerprint);

        if (error) throw error;

        return NextResponse.json({ success: true, action: 'resume' });
      }

      case 'cancel': {
        const { switch_id: cancelId } = body;
        if (!cancelId) {
          return NextResponse.json(
            { error: 'switch_id gerekli' },
            { status: 400 }
          );
        }

        const { error } = await (supabase as any)
          .from('dead_man_switches')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', cancelId)
          .eq('user_id', fingerprint);

        if (error) throw error;

        return NextResponse.json({ success: true, action: 'cancel' });
      }

      default:
        return NextResponse.json(
          { error: `Bilinmeyen aksiyon: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return safeErrorResponse('POST /api/dms', err);
  }
}
