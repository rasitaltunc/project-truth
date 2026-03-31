// ============================================
// TRUTH PROTOCOL — Email Service
// Sprint 9: Gazeteci Kalkanı
// Resend API entegrasyonu + fallback logging
// ============================================

import { Resend } from 'resend';

// ── Config ──
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Project Truth <noreply@projecttruth.org>';
const IS_PRODUCTION = !!RESEND_API_KEY;

let resend: Resend | null = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

// ── Types ──
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: 'resend' | 'log_only';
}

// ── Send Email ──
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, replyTo, tags } = options;

  // Production: Resend API
  if (IS_PRODUCTION && resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || htmlToText(html),
        replyTo,
        tags,
      });

      if (error) {
        console.error('📧 Resend error:', error);
        return { success: false, error: error.message, mode: 'resend' };
      }

      return { success: true, messageId: data?.id, mode: 'resend' };
    } catch (err: any) {
      console.error('📧 Resend exception:', err);
      return { success: false, error: err.message, mode: 'resend' };
    }
  }

  // Development: Log only
  console.warn('═══════════════════════════════════════');
  console.warn('📧 EMAIL (dev mode — no RESEND_API_KEY)');
  console.warn('═══════════════════════════════════════');
  console.warn('To:', to);
  console.warn('Subject:', subject);
  console.warn('Body:', text || htmlToText(html));
  console.warn('═══════════════════════════════════════');

  return { success: true, messageId: `dev_${Date.now()}`, mode: 'log_only' };
}

// ── Email Templates ──

export function dmsAlertEmail(params: {
  switchName: string;
  recipientName?: string;
  contentPreview?: string;
  recoveryUrl?: string;
  triggerReason: string;
}): EmailOptions {
  const { switchName, recipientName, contentPreview, recoveryUrl, triggerReason } = params;

  // SECURITY B10: Escape ALL user-supplied values before HTML interpolation
  const safeSwitchName = escapeHtml(switchName || '');
  const safeRecipientName = recipientName ? escapeHtml(recipientName) : null;
  const safeContentPreview = contentPreview ? escapeHtml(contentPreview) : null;
  const safeTriggerReason = escapeHtml(triggerReason || '');
  // SECURITY E1: recoveryUrl güçlü validasyon
  // 1. Sadece https:// kabul (javascript:, data:, vbscript:, // engellenir)
  // 2. URL.parse ile domain doğrulama (localhost, internal engellenir)
  // 3. Max uzunluk kontrolü (URL overflow engellenir)
  let safeRecoveryUrl: string | null = null;
  if (recoveryUrl && typeof recoveryUrl === 'string' && recoveryUrl.length < 2000) {
    try {
      const parsed = new URL(recoveryUrl);
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
      const blockedTLDs = ['.local', '.internal', '.localhost', '.test'];
      const isBlocked = blockedHosts.includes(parsed.hostname) ||
        blockedTLDs.some(tld => parsed.hostname.endsWith(tld));

      if (parsed.protocol === 'https:' && !isBlocked && parsed.hostname.includes('.')) {
        safeRecoveryUrl = encodeURI(parsed.toString());
      }
    } catch {
      // Geçersiz URL — null bırak
    }
  }

  const greeting = safeRecipientName ? `Sayın ${safeRecipientName},` : 'Sayın Alıcı,';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #dc2626; border-radius: 8px; overflow: hidden;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a0000, #0a0a0a); padding: 24px; border-bottom: 1px solid #dc262640;">
      <div style="font-size: 10px; letter-spacing: 0.4em; color: #dc2626; font-family: monospace;">
        ⚠️ PROJECT TRUTH — GÜVENLİK BİLDİRİMİ
      </div>
      <h1 style="font-size: 18px; color: #fff; margin: 8px 0 0; font-weight: 700;">
        Ölü Adam Anahtarı Tetiklendi
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      <p style="color: #ccc; line-height: 1.6;">${greeting}</p>

      <p style="color: #ccc; line-height: 1.6;">
        <strong style="color: #dc2626;">"${safeSwitchName}"</strong> adlı güvenlik anahtarı tetiklendi.
      </p>

      <div style="background: #1a1a1a; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
        <div style="font-size: 10px; letter-spacing: 0.2em; color: #dc262680; font-family: monospace; margin-bottom: 4px;">
          TETİKLENME NEDENİ
        </div>
        <div style="color: #e5e5e5; font-size: 14px;">
          ${safeTriggerReason}
        </div>
      </div>

      ${safeContentPreview ? `
      <div style="background: #1a1a1a; border: 1px solid #333; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <div style="font-size: 10px; letter-spacing: 0.2em; color: #666; font-family: monospace; margin-bottom: 4px;">
          <!-- SECURITY B3: İçerik önizlemesi email'de GÖSTERİLMEZ -->
          <!-- Hassas belgeler email üzerinden sızmamalı -->
          İÇERİK BİLGİSİ
        </div>
        <div style="color: #999; font-size: 13px;">
          Bu anahtar ile ilişkili içerik mevcuttur. Detaylara erişmek için platforma giriş yapın.
        </div>
      </div>
      ` : ''}

      ${safeRecoveryUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${safeRecoveryUrl}" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.05em;">
          İÇERİĞE ERİŞ
        </a>
      </div>
      ` : ''}

      <p style="color: #666; font-size: 12px; line-height: 1.5; margin-top: 24px;">
        Bu bildirim, bir kullanıcının oluşturduğu "Ölü Adam Anahtarı" tarafından otomatik olarak gönderilmiştir.
        Alıcı olarak siz belirlenmişsiniz.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 24px; border-top: 1px solid #1a1a1a; background: #080808;">
      <div style="font-size: 9px; color: #444; font-family: monospace; letter-spacing: 0.1em;">
        PROJECT TRUTH — Gerçeklik Ağı Platformu
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    to: '', // Will be set by caller
    // SECURITY B3: Switch adı subject'te kısaltılmış — email subject header'ları
    // transit sırasında şifrelenmez ve mail sunucu loglarında görünür
    subject: `⚠️ Project Truth — Güvenlik Anahtarı Tetiklendi`,
    html,
    tags: [
      { name: 'type', value: 'dms_trigger' },
      // SECURITY B3: Tag'larda hassas veri yok, sadece tip bilgisi
    ],
  };
}

export function dmsCheckInReminderEmail(params: {
  switchName: string;
  recipientEmail: string;
  hoursRemaining: number;
}): EmailOptions {
  const { switchName, recipientEmail, hoursRemaining } = params;

  // SECURITY B10: Escape user-supplied values
  const safeSwitchName = escapeHtml(switchName || '');
  const safeHours = Math.max(0, Math.floor(hoursRemaining)); // Sanitize to integer

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #f59e0b; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1a1000, #0a0a0a); padding: 24px; border-bottom: 1px solid #f59e0b40;">
      <div style="font-size: 10px; letter-spacing: 0.4em; color: #f59e0b; font-family: monospace;">
        ⏰ PROJECT TRUTH — CHECK-IN HATIRLATMA
      </div>
    </div>
    <div style="padding: 24px;">
      <p style="color: #ccc; line-height: 1.6;">
        <strong style="color: #f59e0b;">"${safeSwitchName}"</strong> anahtarınız
        <strong>${safeHours} saat</strong> içinde tetiklenecek.
      </p>
      <p style="color: #999; line-height: 1.6;">
        Lütfen platformda check-in yapın. Yoksa, belirlediğiniz alıcılara içerik gönderilecek.
      </p>
    </div>
    <div style="padding: 16px 24px; border-top: 1px solid #1a1a1a; background: #080808;">
      <div style="font-size: 9px; color: #444; font-family: monospace;">
        PROJECT TRUTH — Gerçeklik Ağı Platformu
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    to: recipientEmail,
    // SECURITY B3: Genel subject — switch adı ve saat bilgisi body'de,
    // subject header'ları transit sırasında şifrelenmez
    subject: `⏰ Project Truth — Check-in Hatırlatması`,
    html,
    tags: [
      { name: 'type', value: 'dms_reminder' },
      // SECURITY B3: Tag'larda hassas veri yok
    ],
  };
}

// ── Security Utilities ──

/**
 * SECURITY B10: Escape HTML to prevent injection in email templates.
 * All user-supplied strings MUST pass through this before interpolation.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Utility ──
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
