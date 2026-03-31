// ============================================
// TRUTH PROTOCOL - Auth Provider Wrapper
// Client component to wrap AuthProvider for layout.tsx
// ============================================

'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <AuthModal />
        </AuthProvider>
    );
}
