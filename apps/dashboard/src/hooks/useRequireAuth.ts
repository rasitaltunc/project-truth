'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, Permission } from '@/lib/roles';

interface UseRequireAuthOptions {
  /** Required permission — redirects to auth if user lacks it */
  requiredPermission?: Permission;
  /** Redirect URL when not authenticated (default: /auth) */
  redirectTo?: string;
  /** If true, only requires login (any trust level ≥ 1). Default: true */
  requireLogin?: boolean;
}

/**
 * Hook to protect pages/components that require authentication.
 *
 * Usage:
 *   const { isReady, isAllowed } = useRequireAuth({ requiredPermission: 'vote' });
 *   if (!isReady) return <Loading />;
 *   if (!isAllowed) return <AccessDenied />;
 *
 * Or for simple login check:
 *   useRequireAuth(); // redirects to /auth if not logged in
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { requireLogin = true, requiredPermission, redirectTo = '/auth' } = options;
  const { user, isLoading, isAuthenticated, isAnonymous } = useAuth();
  const router = useRouter();

  const trustLevel = user?.trust_level ?? 0;

  // Check if user meets requirements
  const isLoggedIn = isAuthenticated && !isAnonymous;
  const hasRequiredPermission = requiredPermission
    ? hasPermission(trustLevel, requiredPermission)
    : true;

  const isAllowed = requireLogin ? (isLoggedIn && hasRequiredPermission) : hasRequiredPermission;

  useEffect(() => {
    if (isLoading) return; // Still loading — don't redirect yet

    if (requireLogin && !isLoggedIn) {
      // Not logged in — redirect to auth page
      router.push(redirectTo);
    }
  }, [isLoading, isLoggedIn, requireLogin, redirectTo, router]);

  return {
    /** True when auth state has been determined (loading complete) */
    isReady: !isLoading,
    /** True when user meets all requirements (logged in + permission) */
    isAllowed,
    /** Current user trust level */
    trustLevel,
    /** Current user object */
    user,
    /** Whether user is logged in with email (not anonymous) */
    isLoggedIn,
  };
}
