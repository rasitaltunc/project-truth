// ============================================
// TRUTH PROTOCOL - Auth Context
// Global auth state yönetimi
// ============================================

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    TruthUser,
    TrustLevel,
    TRUST_LEVELS,
    getCurrentUser,
    createAnonymousUser,
    sendMagicLink as authSendMagicLink,
    loginWithGoogle as authLoginWithGoogle,
    handleOAuthCallback,
    logout as authLogout,
    getStoredAnonymousUser,
    storeAnonymousUser,
    clearAnonymousUser,
    getReputationLevel,
    supabase
} from '@/lib/auth';
import { getAuthClient } from '@/lib/supabaseAuth';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
    // User state
    user: TruthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAnonymous: boolean;

    // Trust & Reputation
    trustLevel: typeof TRUST_LEVELS[TrustLevel] | null;
    reputationInfo: { level: string; color: string; icon: string } | null;

    // Auth actions — SECURITY: Only PKCE-safe methods exposed
    // login/register with password REMOVED — credential stuffing/brute force risk
    sendMagicLink: (email: string) => Promise<{ success: boolean; error: string | null }>;
    loginWithGoogle: () => Promise<{ success: boolean; error: string | null }>;
    logout: () => Promise<void>;
    initAnonymousSession: () => Promise<void>;

    // Permission checks
    hasPermission: (permission: string) => boolean;
    canSubmitEvidence: boolean;
    canVote: boolean;
    canAccessSensitive: boolean;

    // UI state — DEPRECATED: Old modal state kept for backward compatibility
    // These do nothing — new auth uses /auth page redirect
    showAuthModal: boolean;
    setShowAuthModal: (show: boolean) => void;
    authModalMode: 'login' | 'register';
    setAuthModalMode: (mode: 'login' | 'register') => void;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // State
    const [user, setUser] = useState<TruthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

    // Derived state
    const isAuthenticated = !!user;
    const isAnonymous = user ? !user.auth_id : false;
    const trustLevel = user ? TRUST_LEVELS[user.trust_level] : null;
    const reputationInfo = user ? getReputationLevel(user.reputation_score) : null;

    // ============================================
    // INIT - Check for existing session
    // ============================================

    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);
            try {
                // 1. Check for Supabase auth session
                const authUser = await getCurrentUser();
                if (authUser) {
                    setUser(authUser);
                    setIsLoading(false);
                    return;
                }

                // 2. Check for stored anonymous user
                const storedAnon = getStoredAnonymousUser();
                if (storedAnon) {
                    setUser(storedAnon);
                    setIsLoading(false);
                    return;
                }

                // 3. No session - user is guest
                setUser(null);
            } catch (err: any) {
                // AbortError from Supabase Web Locks API — harmless, ignore
                if (err?.name === 'AbortError' || err?.message?.includes('signal is aborted')) {
                    console.warn('Auth init: AbortError (Web Locks) — ignoring');
                } else {
                    console.error('Auth init error:', err);
                }
                setUser(null);
            }
            setIsLoading(false);
        };

        initAuth();

        // Listen for auth changes (including OAuth callback + PKCE Magic Link)
        // SECURITY: Use PKCE-enabled auth client for proper session detection
        const pkceClient = typeof window !== 'undefined' ? getAuthClient() : supabase;
        if (!pkceClient) return;

        const { data: { subscription } } = pkceClient.auth.onAuthStateChange(async (event: any, session: any) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // First try to get existing TruthUser
                let truthUser = await getCurrentUser();

                // If no TruthUser exists (first OAuth login), create one via callback handler
                if (!truthUser) {
                    truthUser = await handleOAuthCallback();
                }

                if (truthUser) {
                    clearAnonymousUser();
                    setUser(truthUser);
                    setShowAuthModal(false);
                    setIsLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // ============================================
    // AUTH ACTIONS
    // ============================================

    // SECURITY: login() and register() with password REMOVED
    // Old password-based auth was vulnerable to credential stuffing and brute force
    // Only Magic Link (PKCE) and Google OAuth remain as auth methods

    const sendMagicLink = useCallback(async (email: string) => {
        setIsLoading(true);
        const result = await authSendMagicLink(email);
        setIsLoading(false);
        // Magic link sent — user clicks email link → redirects to /auth/callback
        // onAuthStateChange will handle the rest
        return result;
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        await authLogout();
        clearAnonymousUser();
        setUser(null);
        setIsLoading(false);
    }, []);

    const loginWithGoogle = useCallback(async () => {
        setIsLoading(true);
        const result = await authLoginWithGoogle();
        if (!result.success) {
            setIsLoading(false);
        }
        // If success, browser will redirect to Google OAuth
        // onAuthStateChange will handle the rest after redirect back
        return result;
    }, []);

    const initAnonymousSession = useCallback(async () => {
        // Don't create if already has user
        if (user) return;

        setIsLoading(true);
        try {
            const anonUser = await createAnonymousUser();
            if (anonUser) {
                storeAnonymousUser(anonUser);
                setUser(anonUser);
            }
        } catch (err) {
            console.error('Anonymous session error:', err);
        }
        setIsLoading(false);
    }, [user]);

    // ============================================
    // PERMISSION CHECKS
    // ============================================

    const hasPermission = useCallback((permission: string): boolean => {
        if (!user || !trustLevel) return false;
        return (trustLevel.permissions as readonly string[]).includes(permission);
    }, [user, trustLevel]);

    const canSubmitEvidence = user ? hasPermission('submit_evidence') : false;
    const canVote = user ? hasPermission('vote') : false;
    const canAccessSensitive = user ? hasPermission('sensitive_access') : false;

    // ============================================
    // CONTEXT VALUE
    // ============================================

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        isAnonymous,
        trustLevel,
        reputationInfo,
        sendMagicLink,
        loginWithGoogle,
        logout,
        initAnonymousSession,
        hasPermission,
        canSubmitEvidence,
        canVote,
        canAccessSensitive,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// ============================================
// HELPER HOOK - Require Auth
// ============================================

export function useRequireAuth(options?: {
    minTrustLevel?: TrustLevel;
    redirectToLogin?: boolean;
}) {
    const { user, isLoading, setShowAuthModal, setAuthModalMode } = useAuth();
    const { minTrustLevel = 0, redirectToLogin = true } = options || {};

    useEffect(() => {
        if (!isLoading && !user && redirectToLogin) {
            setAuthModalMode('login');
            setShowAuthModal(true);
        }
    }, [user, isLoading, redirectToLogin, setShowAuthModal, setAuthModalMode]);

    const meetsRequirement = user && user.trust_level >= minTrustLevel;

    return {
        user,
        isLoading,
        isAuthorized: meetsRequirement,
        insufficientTrust: user && !meetsRequirement,
    };
}
