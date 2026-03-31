// ============================================
// TRUTH PROTOCOL - OAuth/Magic Link Callback Route
// Redirects to client-side PKCE callback handler
//
// WHY REDIRECT?
// PKCE code exchange requires code_verifier from the SAME browser
// that initiated the request. Server-side can't access it.
// So we redirect to /en/auth/callback (client-side page) which
// has access to Supabase's localStorage code_verifier.
// ============================================

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    // Forward ALL query parameters to client-side callback
    // Supabase sends either ?code=xxx (success) or ?error=xxx (failure)
    // Both need to reach the client page for proper handling
    const allParams = searchParams.toString();

    if (allParams) {
        return NextResponse.redirect(`${origin}/en/auth/callback?${allParams}`);
    }

    return NextResponse.redirect(`${origin}/en/auth?error=no_code`);
}
