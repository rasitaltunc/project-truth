// ============================================
// TRUTH PROTOCOL - Auth Utilities
// Anonim ama doğrulanmış kimlik sistemi
// ============================================

import { supabase } from './supabase';
import { getAuthClient } from './supabaseAuth';

// Re-export for backward compatibility
export { supabase };

// PKCE-enabled auth client (Magic Link, session management, token refresh)
// SECURITY: This client has flowType: 'pkce' — prevents magic link interception
const authClient = typeof window !== 'undefined' ? getAuthClient() : null;

// ============================================
// TYPES
// ============================================

export interface TruthUser {
    id: string;
    auth_id?: string;
    anonymous_id: string;
    display_name?: string;
    trust_level: TrustLevel;
    reputation_score: number;
    contributions_count: number;
    verified_contributions: number;
    false_contributions: number;
    preferred_language: string;
    created_at: string;
}

export type TrustLevel = 0 | 1 | 2 | 3 | 4;

export const TRUST_LEVELS = {
    0: {
        name: 'Anonim Ziyaretçi',
        description: 'Sadece okuma yetkisi',
        icon: '👤',
        color: '#6b7280',
        permissions: ['read']
    },
    1: {
        name: 'Doğrulanmış İnsan',
        description: 'CAPTCHA ve cihaz doğrulaması geçti',
        icon: '✓',
        color: '#f59e0b',
        permissions: ['read', 'submit_evidence', 'vote']
    },
    2: {
        name: 'Doğrulanmış Tanık',
        description: 'Lokasyon veya olay kanıtı sağladı',
        icon: '👁️',
        color: '#3b82f6',
        permissions: ['read', 'submit_evidence', 'vote', 'priority_review']
    },
    3: {
        name: 'Doğrulanmış İçeriden',
        description: 'Kurumsal erişim kanıtı sağladı',
        icon: '🔑',
        color: '#8b5cf6',
        permissions: ['read', 'submit_evidence', 'vote', 'priority_review', 'sensitive_access']
    },
    4: {
        name: 'İsimli Kaynak',
        description: 'Gerçek kimliğini doğruladı',
        icon: '⭐',
        color: '#22c55e',
        permissions: ['read', 'submit_evidence', 'vote', 'priority_review', 'sensitive_access', 'verify_others']
    }
} as const;

// ============================================
// ANONYMOUS ID GENERATOR
// ============================================

const PREFIXES = ['WITNESS', 'SOURCE', 'GUARDIAN', 'SEEKER', 'TRUTH', 'LIGHT', 'SHADOW', 'VOICE'];

export function generateAnonymousId(): string {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}_${suffix}`;
}

// ============================================
// REPUTATION HELPERS
// ============================================

export function getReputationLevel(score: number): { level: string; color: string; icon: string } {
    if (score >= 1000) return { level: 'Efsane', color: '#fbbf24', icon: '👑' };
    if (score >= 500) return { level: 'Uzman', color: '#8b5cf6', icon: '💎' };
    if (score >= 200) return { level: 'Güvenilir', color: '#3b82f6', icon: '🛡️' };
    if (score >= 50) return { level: 'Aktif', color: '#22c55e', icon: '✓' };
    if (score >= 10) return { level: 'Yeni', color: '#6b7280', icon: '🌱' };
    return { level: 'Başlangıç', color: '#6b7280', icon: '👤' };
}

export function calculateAccuracyRate(verified: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((verified / total) * 100);
}

// ============================================
// AUTH FUNCTIONS
// ============================================

// Anonim kullanıcı oluştur (login olmadan)
export async function createAnonymousUser(): Promise<TruthUser | null> {
    try {
        // Device fingerprint için basit bir hash
        const deviceId = await getDeviceFingerprint();

        // Önce RPC dene
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('create_truth_user', {
                p_auth_id: null,
                p_display_name: null
            });

        if (!rpcError && rpcData) {
            // RPC returns SETOF (array), get first element
            const user = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            if (user && user.anonymous_id) {
                return user;
            }
        }

        // RPC yoksa veya hata verdiyse direkt INSERT yap
        const anonymousId = generateAnonymousId();

        const { data: insertData, error: insertError } = await supabase
            .from('truth_users')
            .insert({
                anonymous_id: anonymousId,
                trust_level: 0,
                reputation_score: 0,
                contributions_count: 0,
                verified_contributions: 0,
                false_contributions: 0,
                preferred_language: 'tr',
                device_fingerprint: deviceId
            })
            .select()
            .single();

        if (insertError) {
            // Tablo yoksa local-only kullanıcı oluştur
            const localUser: TruthUser = {
                id: crypto.randomUUID(),
                anonymous_id: anonymousId,
                trust_level: 0,
                reputation_score: 0,
                contributions_count: 0,
                verified_contributions: 0,
                false_contributions: 0,
                preferred_language: 'tr',
                created_at: new Date().toISOString()
            };
            return localUser;
        }

        return insertData;
    } catch (err) {
        console.error('Error creating anonymous user:', err);

        // Ultimate fallback: local-only user
        const localUser: TruthUser = {
            id: crypto.randomUUID(),
            anonymous_id: generateAnonymousId(),
            trust_level: 0,
            reputation_score: 0,
            contributions_count: 0,
            verified_contributions: 0,
            false_contributions: 0,
            preferred_language: 'tr',
            created_at: new Date().toISOString()
        };
        return localUser;
    }
}

// Email ile kayıt
export async function registerWithEmail(email: string, password: string, displayName?: string): Promise<{ user: TruthUser | null; error: string | null }> {
    try {
        // 1. Supabase Auth'a kayıt (PKCE-enabled client)
        const client = authClient || supabase;
        if (!client) throw new Error('Auth servisi kullanılamıyor');

        const { data: authData, error: authError } = await client.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        // 2. Truth user oluştur — SAME client for session consistency
        // Try RPC first, then direct insert as fallback
        let truthUser: TruthUser | null = null;

        try {
            const { data: rpcData, error: rpcError } = await client
                .rpc('create_truth_user', {
                    p_auth_id: authData.user.id,
                    p_display_name: displayName || email.split('@')[0]
                });
            if (!rpcError && rpcData) {
                truthUser = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            }
        } catch {
            // RPC not available — fallback to direct insert
        }

        // Fallback: direct insert if RPC failed
        if (!truthUser) {
            const anonymousId = generateAnonymousId();
            const { data: insertData, error: insertError } = await client
                .from('truth_users')
                .insert({
                    auth_id: authData.user.id,
                    anonymous_id: anonymousId,
                    display_name: displayName || email.split('@')[0],
                    trust_level: 1,
                    reputation_score: 10,
                    contributions_count: 0,
                    verified_contributions: 0,
                    false_contributions: 0,
                    preferred_language: 'tr',
                })
                .select()
                .single();

            if (!insertError && insertData) {
                truthUser = insertData;
            } else {
                // Last resort: return a local user object (session exists even if DB insert failed)
                console.warn('Truth user DB insert failed:', insertError?.message);
                truthUser = {
                    id: authData.user.id,
                    auth_id: authData.user.id,
                    anonymous_id: generateAnonymousId(),
                    display_name: displayName || email.split('@')[0],
                    trust_level: 1,
                    reputation_score: 0,
                    contributions_count: 0,
                    verified_contributions: 0,
                    false_contributions: 0,
                    preferred_language: 'tr',
                    created_at: new Date().toISOString(),
                };
            }
        }

        return { user: truthUser, error: null };
    } catch (err: any) {
        console.error('Registration error:', err);
        return { user: null, error: err.message };
    }
}

// Email ile giriş
export async function loginWithEmail(email: string, password: string): Promise<{ user: TruthUser | null; error: string | null }> {
    try {
        // SECURITY: Use PKCE-enabled auth client
        const client = authClient || supabase;
        if (!client) throw new Error('Auth servisi kullanılamıyor');

        const { data: authData, error: authError } = await client.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Login failed');

        // Truth user'ı getir — SAME client for session consistency
        const { data: truthUser, error: truthError } = await client
            .from('truth_users')
            .select('*')
            .eq('auth_id', authData.user.id)
            .maybeSingle();

        if (truthError) {
            console.error('Error fetching truth_user by auth_id:', truthError);
            // Don't throw — return a basic user object so login doesn't fail
        }

        if (!truthUser) {
            // Auth user exists but no truth_user — create one on the fly
            console.warn('No truth_user found for auth_id, creating...', authData.user.id);
            const anonymousId = generateAnonymousId();
            const { data: newUser } = await client
                .from('truth_users')
                .insert({
                    auth_id: authData.user.id,
                    anonymous_id: anonymousId,
                    display_name: authData.user.email?.split('@')[0] || 'Kullanıcı',
                    trust_level: 1,
                    reputation_score: 10,
                    contributions_count: 0,
                    verified_contributions: 0,
                    false_contributions: 0,
                    preferred_language: 'tr',
                })
                .select()
                .single();

            if (newUser) {
                return { user: newUser, error: null };
            }

            // Ultimate fallback — return local user
            return {
                user: {
                    id: authData.user.id,
                    auth_id: authData.user.id,
                    anonymous_id: anonymousId,
                    display_name: authData.user.email?.split('@')[0] || 'Kullanıcı',
                    trust_level: 1,
                    reputation_score: 0,
                    contributions_count: 0,
                    verified_contributions: 0,
                    false_contributions: 0,
                    preferred_language: 'tr',
                    created_at: new Date().toISOString(),
                },
                error: null,
            };
        }

        // Last active güncelle
        await supabase
            .from('truth_users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', truthUser.id);

        return { user: truthUser, error: null };
    } catch (err: any) {
        console.error('Login error:', err);
        return { user: null, error: err.message };
    }
}

// ============================================
// MAGIC LINK (Şifresiz giriş)
// Sprint Auth — Pseudonim hesaplar için birincil yöntem
// ProtonMail, Tutanota vb. anonim email'lerle çalışır
// ============================================

// SECURITY: Email format validation — prevents injection, DoS, garbage accounts
const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 320; // RFC 5321 max

export async function sendMagicLink(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
        // Input validation
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) {
            return { success: false, error: 'Geçerli bir email adresi girin.' };
        }
        if (!EMAIL_REGEX.test(trimmed)) {
            return { success: false, error: 'Geçerli bir email adresi girin.' };
        }

        // SECURITY: Use PKCE-enabled auth client
        // flowType: 'pkce' ensures code_verifier is generated client-side
        // and code_challenge is sent to Supabase. Even if magic link is
        // intercepted in transit, attacker can't use it without code_verifier.
        const client = authClient || supabase;
        if (!client) {
            return { success: false, error: 'Auth servisi kullanılamıyor.' };
        }

        const { error } = await client.auth.signInWithOtp({
            email: trimmed,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                shouldCreateUser: true,
            },
        });

        if (error) throw error;

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Magic link error:', err);
        return { success: false, error: err.message };
    }
}

// Google OAuth ile giriş
export async function loginWithGoogle(): Promise<{ success: boolean; error: string | null }> {
    try {
        const client = authClient || supabase;
        if (!client) throw new Error('Auth servisi kullanılamıyor');

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) throw error;

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Google login error:', err);
        return { success: false, error: err.message };
    }
}

// OAuth callback sonrası TruthUser oluştur/bağla
export async function handleOAuthCallback(): Promise<TruthUser | null> {
    try {
        const client = authClient || supabase;
        if (!client) return null;

        const { data: { user: authUser }, error } = await client.auth.getUser();
        if (error || !authUser) return null;

        // Mevcut truth_user var mı? — Use SAME client for consistency
        const { data: existingUsers, error: existingError } = await client
            .from('truth_users')
            .select('*')
            .eq('auth_id', authUser.id)
            .limit(1);

        if (existingError) {
            console.error('Error fetching existing truth_user:', existingError);
        }

        const existingUser = existingUsers?.[0] || null;
        if (existingUser) {
            // Last active güncelle
            await client
                .from('truth_users')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', existingUser.id);
            return existingUser;
        }

        // Yeni truth_user oluştur
        const displayName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Anonim';
        const anonymousId = `WITNESS_${Math.random().toString(36).substring(2, 10)}`;

        // Build insert data — email column may not exist in older schemas
        const insertData: Record<string, any> = {
            auth_id: authUser.id,
            anonymous_id: anonymousId,
            display_name: displayName,
            trust_level: 1, // Google ile giriş = Level 1 (doğrulanmış)
            reputation_score: 10,
            contributions_count: 0,
            verified_contributions: 0,
            false_contributions: 0,
            preferred_language: 'tr',
        };

        // Try with email first, fallback without
        let newUser = null;
        let createError = null;

        const { data: d1, error: e1 } = await client
            .from('truth_users')
            .insert({ ...insertData, email: authUser.email })
            .select()
            .single();

        if (e1) {
            // Retry without email column
            const { data: d2, error: e2 } = await client
                .from('truth_users')
                .insert(insertData)
                .select()
                .single();
            newUser = d2;
            createError = e2;
        } else {
            newUser = d1;
        }

        if (createError) throw createError;
        return newUser;
    } catch (err) {
        console.error('OAuth callback error:', err);
        return null;
    }
}

// Çıkış
export async function logout(): Promise<void> {
    const client = authClient || supabase;
    if (client) await client.auth.signOut();
}

// Mevcut kullanıcıyı getir
export async function getCurrentUser(): Promise<TruthUser | null> {
    try {
        const client = authClient || supabase;
        if (!client) return null;

        const { data: { user: authUser } } = await client.auth.getUser();

        if (!authUser) return null;

        // Use SAME client for session-aware DB query
        const { data: truthUsers, error } = await client
            .from('truth_users')
            .select('*')
            .eq('auth_id', authUser.id)
            .limit(1);

        if (error) {
            console.error('Error fetching current truth_user:', error);
            return null;
        }

        const truthUser = truthUsers?.[0] || null;
        if (!truthUser) {
            return null; // No truth_user yet - will be created on next login
        }

        return truthUser;
    } catch (err: any) {
        // AbortError from Supabase Web Locks API — harmless on page load
        if (err?.name !== 'AbortError' && !err?.message?.includes('signal is aborted')) {
            console.error('Unexpected error in getCurrentUser:', err);
        }
        return null;
    }
}

// ============================================
// DEVICE FINGERPRINT
// SECURITY A7: High-entropy fingerprint with canvas, WebGL, and persistent salt
// ~80+ bits of entropy (was ~26 bits)
// ============================================

/**
 * Get a persistent random salt. Created once per device, stored in localStorage.
 * This ensures fingerprint uniqueness even for devices with identical hardware.
 */
function getOrCreateSalt(): string {
    const SALT_KEY = '_t_device_salt';
    if (typeof window === 'undefined') return 'server';
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(SALT_KEY, salt);
    }
    return salt;
}

/**
 * Canvas fingerprint: renders specific text/shapes and hashes the pixel data.
 * Different GPUs/drivers produce slightly different rasterization results.
 */
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(50, 1, 85, 30);
        ctx.fillStyle = '#069';
        ctx.fillText('Truth Protocol', 2, 15);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillText('Truth Protocol', 4, 17);

        return canvas.toDataURL().slice(-50); // Last 50 chars of dataURL
    } catch {
        return 'canvas-blocked';
    }
}

/**
 * WebGL fingerprint: GPU vendor + renderer string
 */
function getWebGLFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl || !(gl instanceof WebGLRenderingContext)) return 'no-webgl';

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        return `${vendor}|${renderer}`;
    } catch {
        return 'webgl-blocked';
    }
}

export async function getDeviceFingerprint(): Promise<string> {
    const salt = getOrCreateSalt();

    const signals = [
        // Browser signals (~26 bits)
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth?.toString() || '0',
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || '0',
        (navigator as any).deviceMemory?.toString() || '0',
        navigator.maxTouchPoints?.toString() || '0',

        // Canvas fingerprint (~10-15 bits)
        typeof document !== 'undefined' ? getCanvasFingerprint() : 'ssr',

        // WebGL fingerprint (~10-15 bits)
        typeof document !== 'undefined' ? getWebGLFingerprint() : 'ssr',

        // Platform signals
        navigator.platform || '',
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',

        // Persistent random salt (~128 bits)
        salt,
    ].join('||');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(signals);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialize session: bind fingerprint to httpOnly cookie.
 * Call this once during app initialization.
 */
export async function initSession(fingerprint: string): Promise<void> {
    try {
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
            credentials: 'same-origin', // Include cookies
        });
    } catch {
        // Non-blocking — session binding is a security enhancement, not a requirement
        console.warn('[auth] Session init failed — operating without session cookie');
    }
}

// ============================================
// SESSION STORAGE (Anonim kullanıcılar için)
// SECURITY A4: Obfuscated storage — not plaintext JSON in localStorage
// ============================================

// SECURITY A4: Less obvious key name (was 'truth_anonymous_user')
const ANON_USER_KEY = '_t_session_v2';
// Legacy key for migration
const LEGACY_ANON_USER_KEY = 'truth_anonymous_user';

/**
 * SECURITY A4: Simple XOR obfuscation for localStorage values.
 * This is NOT encryption — it prevents casual snooping (DevTools glancing,
 * browser extensions scanning for patterns). A determined attacker with
 * JS console access can always read the fingerprint from memory.
 * True protection requires httpOnly cookies (Fix A5).
 */
const OBFUSCATION_KEY = 'truth_protocol_v2_obfuscation';

function xorObfuscate(input: string): string {
    const key = OBFUSCATION_KEY;
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode the XOR'd result
}

function xorDeobfuscate(encoded: string): string {
    try {
        const decoded = atob(encoded); // Base64 decode
        const key = OBFUSCATION_KEY;
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch {
        return ''; // Invalid encoding
    }
}

export function getStoredAnonymousUser(): TruthUser | null {
    if (typeof window === 'undefined') return null;

    // Try new obfuscated format first
    const stored = localStorage.getItem(ANON_USER_KEY);
    if (stored) {
        try {
            const json = xorDeobfuscate(stored);
            return JSON.parse(json);
        } catch {
            // Corrupted — clear it
            localStorage.removeItem(ANON_USER_KEY);
        }
    }

    // SECURITY A4: Migrate from legacy plaintext key
    const legacy = localStorage.getItem(LEGACY_ANON_USER_KEY);
    if (legacy) {
        try {
            const user = JSON.parse(legacy) as TruthUser;
            // Re-store in obfuscated format
            storeAnonymousUser(user);
            // Remove legacy plaintext
            localStorage.removeItem(LEGACY_ANON_USER_KEY);
            return user;
        } catch {
            localStorage.removeItem(LEGACY_ANON_USER_KEY);
        }
    }

    return null;
}

export function storeAnonymousUser(user: TruthUser): void {
    if (typeof window === 'undefined') return;
    const json = JSON.stringify(user);
    localStorage.setItem(ANON_USER_KEY, xorObfuscate(json));
    // Clean up legacy key if it exists
    localStorage.removeItem(LEGACY_ANON_USER_KEY);
}

export function clearAnonymousUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ANON_USER_KEY);
    localStorage.removeItem(LEGACY_ANON_USER_KEY); // Clean legacy too
}
