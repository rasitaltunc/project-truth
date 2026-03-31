// ═══════════════════════════════════════════
// DMS CRON — Sprint 9
// Periyodik check: Süresi dolan switch'leri tetikle
// Vercel Cron veya harici webhook ile kullanılır
//
// SECURITY B2: Auth via Authorization header (NOT query param)
// Vercel Cron: sends Authorization: Bearer <CRON_SECRET>
// Manual: curl -H "Authorization: Bearer $CRON_SECRET" /api/dms/cron
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { sendEmail, dmsAlertEmail, dmsCheckInReminderEmail } from '@/lib/email';
import { safeErrorResponse } from '@/lib/errorHandler';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * SECURITY CR1: Constant-time string comparison — timing attack önlemi.
 * Uzunluk farkında bile sabit zamanda çalışır (length leak yok).
 * Saldırgan response time'dan secret uzunluğunu çıkaramaz.
 */
function timingSafeCompare(a: string, b: string): boolean {
  // Her zaman en uzun string kadar iterasyon yap
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // Uzunluk farkı varsa result !== 0 ama timing sabit
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY B2: CRON_SECRET env var zorunlu
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET environment variable is not configured' },
        { status: 503 }
      );
    }

    // SECURITY CR3: SADECE Authorization header kabul edilir.
    // Query param fallback KALDIRILDI — URL parametreleri:
    // 1. Sunucu loglarında görünür (Vercel, nginx, CloudFlare)
    // 2. Proxy loglarında düz metin kalır
    // 3. Tarayıcı geçmişinde saklanır
    // 4. Referrer header ile üçüncü taraflara sızabilir
    const authHeader = request.headers.get('authorization');

    let providedSecret: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      providedSecret = authHeader.slice(7);
    }

    if (!providedSecret || !timingSafeCompare(providedSecret, CRON_SECRET)) {
      return NextResponse.json(
        { error: 'Geçersiz cron secret' },
        { status: 401 }
      );
    }

    if (!isSupabaseReady() || !supabase) {
      return NextResponse.json({
        triggered: [],
        reminded: [],
        source: 'no_db',
      });
    }

    // ── Aktif switch'leri çek ──
    // SECURITY B3: Explicit select — only fields needed for cron processing
    const { data: switches, error } = await (supabase as any)
      .from('dead_man_switches')
      .select('id, name, trigger_type, trigger_days, trigger_date, last_checkin, status, content_preview, recipients, user_email')
      .eq('status', 'active');

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ triggered: [], reminded: [], source: 'no_table' });
      }
      throw error;
    }

    const now = new Date();
    const triggered: string[] = [];
    const reminded: string[] = [];
    const errors: string[] = [];

    for (const dms of switches || []) {
      try {
        let triggerTime: Date | null = null;

        if (dms.trigger_type === 'no_checkin' && dms.trigger_days) {
          const lastCheckin = new Date(dms.last_checkin);
          triggerTime = new Date(lastCheckin.getTime() + dms.trigger_days * 24 * 60 * 60 * 1000);
        } else if (dms.trigger_type === 'scheduled' && dms.trigger_date) {
          triggerTime = new Date(dms.trigger_date);
        }

        if (!triggerTime) continue;

        const msRemaining = triggerTime.getTime() - now.getTime();
        const hoursRemaining = msRemaining / (1000 * 60 * 60);

        // ── TETIKLEME: Süre geçmiş ──
        if (msRemaining <= 0) {
          // Status'u triggered yap
          await (supabase as any)
            .from('dead_man_switches')
            .update({
              status: 'triggered',
              triggered_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', dms.id);

          // SECURITY B3: Alıcılara bildirim gönder
          // content_preview email'e dahil EDİLMEZ — içerik sadece platformda erişilebilir
          // trigger_days gibi operasyonel detaylar da minimuma indirilir
          for (const recipient of dms.recipients || []) {
            if (recipient.value && recipient.type !== 'public') {
              const template = dmsAlertEmail({
                switchName: dms.name || 'İsimsiz Anahtar',
                recipientName: recipient.name,
                // SECURITY B3: contentPreview KASITLI olarak gönderilmiyor
                // Hassas içerik email üzerinden sızmamalı, platforma yönlendir
                triggerReason: dms.trigger_type === 'no_checkin'
                  ? 'Kullanıcı belirlenen süre içinde check-in yapmadı.'
                  : 'Planlanan tetikleme koşulu gerçekleşti.',
              });
              template.to = recipient.value;
              await sendEmail(template);
            }
          }

          triggered.push(dms.id);
          continue;
        }

        // ── HATIRLATMA: Son 24 saat kalmışsa ──
        if (hoursRemaining > 0 && hoursRemaining <= 24) {
          // Kullanıcının e-postası varsa hatırlat
          // (user_id fingerprint — Supabase'den email alınamayabilir, ama recipients'tan bulabiliriz)
          const ownerEmail = dms.user_email; // Eğer tabloda varsa
          if (ownerEmail) {
            const reminder = dmsCheckInReminderEmail({
              switchName: dms.name,
              recipientEmail: ownerEmail,
              hoursRemaining: Math.round(hoursRemaining),
            });
            await sendEmail(reminder);
            reminded.push(dms.id);
          }
        }
      } catch (switchErr: any) {
        console.error(`DMS switch ${dms.id} error:`, switchErr);
        errors.push(`Switch ${dms.id}: processing failed`);
      }
    }

    return NextResponse.json({
      triggered,
      reminded,
      errors: errors.length > 0 ? errors : undefined,
      checked: (switches || []).length,
      timestamp: now.toISOString(),
      source: 'supabase',
    });
  } catch (err: any) {
    console.error('DMS cron error:', err);
    return safeErrorResponse('GET /api/dms/cron', err);
  }
}
