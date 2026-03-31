/**
 * SUPABASE AUTH CLIENT — PKCE-enabled, session-aware
 * Sprint Auth — Güvenlik Araştırması Sonuçları
 *
 * Bu client SADECE auth işlemleri için kullanılır:
 * - Magic Link (PKCE akışı)
 * - Session yönetimi (cookie-based)
 * - Token refresh rotation
 *
 * NEDEN AYRI CLIENT?
 * supabaseClient.ts'deki client persistSession: false ile çalışıyor —
 * veri sorguları için doğru (session gereksiz), ama auth için yanlış.
 * PKCE akışı detectSessionInUrl: true gerektirir.
 *
 * GÜVENLİK KARARLARI:
 * - flowType: 'pkce' → Magic Link yolunda çalınsa bile başka cihazda kullanılamaz
 * - persistSession: true → Supabase internally uses localStorage (NOT httpOnly cookie yet)
 *   TODO: Migrate to @supabase/ssr for true httpOnly cookie session (Release öncesi)
 * - autoRefreshToken: true → Refresh token rotation aktif
 * - detectSessionInUrl: true → PKCE callback'te auth code'u URL'den okur
 *
 * ARAŞTIRMA REF: Güvenli Gazeteci Platformu Auth Tasarımı.md — Bölüm A
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Browser-side auth client — PKCE enabled.
 * Uses standard @supabase/supabase-js with PKCE flow type.
 *
 * SECURITY NOTES:
 * - flowType: 'pkce' prevents magic link interception (code_verifier stays on device)
 * - autoRefreshToken: true enables refresh token rotation (stolen token = all sessions killed)
 * - persistSession: true stores session for page reloads (Supabase uses localStorage internally,
 *   but we will migrate to server-side session management in a future sprint)
 * - detectSessionInUrl: true reads PKCE auth code from callback URL
 */
export function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',           // CRITICAL: Proof Key for Code Exchange
      autoRefreshToken: true,      // Refresh token rotation — stolen token detected
      persistSession: true,        // Session persists across page loads
      detectSessionInUrl: true,    // PKCE callback reads code from URL
    },
  });
}

// Singleton for client-side usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authClientInstance: any = null;

export function getAuthClient() {
  if (typeof window === 'undefined') {
    // Server-side — create fresh instance each time (no singleton)
    return createAuthClient();
  }
  if (!authClientInstance) {
    authClientInstance = createAuthClient();
  }
  return authClientInstance;
}
