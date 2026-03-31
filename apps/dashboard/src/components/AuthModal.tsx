// ============================================
// TRUTH PROTOCOL - Auth Modal (DEPRECATED)
// Sprint Auth — Bu bileşen devre dışı bırakıldı.
// Yeni auth sistemi: /[locale]/auth/page.tsx (PKCE + Magic Link)
//
// SECURITY: Eski password-based login modal kaldırıldı.
// Bu dosya sadece import uyumluluğu için boş component döndürür.
// ============================================

'use client';

/**
 * @deprecated Use /auth page instead. This modal is disabled for security.
 * Old password-based auth bypassed PKCE protection.
 */
export function AuthModal() {
    // SECURITY: Render nothing — old auth modal is a security risk
    return null;
}

export default AuthModal;
