// ═══════════════════════════════════════════════════════
// SPRINT 13: KOLEKTİF ALARM CRON JOB
// Periyodik tarama: süresi dolan DMS'leri tespit et, alarm tetikle
// Vercel Cron veya harici webhook ile çağrılır
//
// SECURITY B2: Auth via Authorization header (NOT query param)
// Vercel Cron: sends Authorization: Bearer <CRON_SECRET>
// Manual: curl -H "Authorization: Bearer $CRON_SECRET" /api/collective-dms/cron
// ═══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Yüksek riskli ülkeler — daha hızlı tetikleme (saatler)
const HIGH_RISK_COUNTRIES: Record<string, number> = {
  TR: 24, RU: 24, IR: 24, CN: 24, SA: 24, EG: 24,
  BY: 36, VE: 36, MM: 36, PK: 36, PH: 36,
};

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * SECURITY CR1: Constant-time string comparison — timing attack önlemi.
 * Uzunluk farkında bile sabit zamanda çalışır (length leak yok).
 */
function timingSafeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

export async function GET(req: NextRequest) {
  try {
    // SECURITY B2: CRON_SECRET env var zorunlu
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET environment variable is not configured' },
        { status: 503 }
      );
    }

    // SECURITY CR3: SADECE Authorization header kabul edilir.
    // Query param fallback KALDIRILDI — URL loglarında secret sızdırır.
    const authHeader = req.headers.get('authorization');

    let providedSecret: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      providedSecret = authHeader.slice(7);
    }

    if (!providedSecret || !timingSafeCompare(providedSecret, CRON_SECRET)) {
      return NextResponse.json({ error: 'Geçersiz cron secret' }, { status: 401 });
    }

    // 1. Süresi dolan aktif DMS'leri bul
    const { data: expiredDms, error: expiredError } = await supabase
      .rpc('get_expired_collective_dms');

    if (expiredError) throw expiredError;
    if (!expiredDms || expiredDms.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Süresi dolan DMS yok.' });
    }

    let alarmsCreated = 0;
    let alarmsEscalated = 0;

    for (const dms of expiredDms) {
      const lastCheckin = new Date(dms.last_checkin).getTime();
      const now = Date.now();
      const missedHours = Math.floor((now - lastCheckin) / (1000 * 60 * 60));

      // SECURITY CDCR3: Country code normalizasyonu — büyük/küçük harf farkı tolere edilir
      const normalizedCountry = (dms.country_code || '').toUpperCase().trim();
      const fastTriggerHours = HIGH_RISK_COUNTRIES[normalizedCountry] || 48;

      // Mevcut alarm var mı?
      // SECURITY: Explicit select — sadece gerekli alanlar
      const { data: existingAlerts } = await supabase
        .from('collective_alerts')
        .select('id, alert_level, silent_at, yellow_at, created_at')
        .eq('collective_dms_id', dms.id)
        .in('alert_level', ['silent', 'yellow'])
        .limit(1);

      if (!existingAlerts || existingAlerts.length === 0) {
        // YENİ ALARM: Sessiz alarm oluştur
        await supabase.from('collective_alerts').insert({
          collective_dms_id: dms.id,
          alert_level: 'silent',
          trigger_reason: 'missed_checkin',
          missed_checkin_hours: missedHours,
        });

        await supabase
          .from('collective_dms')
          .update({
            status: 'silent_alarm',
            silent_alarm_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', dms.id);

        alarmsCreated++;
        // TODO: Kefillere email bildirimi gönder (lib/email.ts)
      } else {
        // MEVCUT ALARM: Süre kontrolü ile eskalasyon
        const alert = existingAlerts[0];
        // SECURITY CDCR4: silentAt fallback — silent_at NULL ise yellow_at veya created_at kullan.
        // Yanlış zaman kaynağı kullanmak alarm eskalasyonunu saatlerce geciktirebilir.
        const silentAt = new Date(
          alert.silent_at || alert.yellow_at || alert.created_at
        ).getTime();
        if (isNaN(silentAt)) {
          // Geçersiz tarih — bu alarm atlanır, loga yaz
          console.error(`[collective-dms/cron] Invalid date for alert ${alert.id}`);
          continue;
        }
        const hoursSinceAlarm = Math.floor((now - silentAt) / (1000 * 60 * 60));

        // Silent → Yellow: 48 saat (veya high-risk ülke fast trigger)
        if (alert.alert_level === 'silent' && hoursSinceAlarm >= fastTriggerHours) {
          await supabase
            .from('collective_alerts')
            .update({ alert_level: 'yellow', yellow_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', alert.id);

          await supabase
            .from('collective_dms')
            .update({ status: 'yellow_alarm', yellow_alarm_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', dms.id);

          alarmsEscalated++;
          // TODO: Geniş çevreye bildirim
        }

        // Yellow → Red: 72 saat + kefil çoğunluğu (otomatik eskalasyon değil, oy gerekli)
        // Red alarm sadece vote_on_alert RPC ile tetiklenir — burada sadece hatırlatma
        if (alert.alert_level === 'yellow' && hoursSinceAlarm >= 72) {
          // Oy kullanmamış kefillere hatırlatma gönder
          // TODO: Email hatırlatma
        }
      }
    }

    return NextResponse.json({
      processed: expiredDms.length,
      alarms_created: alarmsCreated,
      alarms_escalated: alarmsEscalated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err?.code === '42P01') {
      return NextResponse.json({ processed: 0, message: 'Tablolar henüz oluşturulmadı.' });
    }
    return safeErrorResponse('GET /api/collective-dms/cron', err);
  }
}
