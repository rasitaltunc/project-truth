/**
 * /api/auth/ensure-user
 * POST: Ensures a truth_user record exists for the current Supabase auth session
 *
 * WHY THIS EXISTS:
 * Client-side truth_user creation can fail silently due to RLS policies
 * on truth_users table. This route uses supabaseAdmin (service role) to
 * bypass RLS and guarantee the record exists.
 *
 * FLOW:
 * 1. Client sends Supabase access_token in Authorization header
 * 2. Server verifies token → gets auth user
 * 3. Checks if truth_user exists for this auth_id
 * 4. Creates one if not (using admin client — bypasses RLS)
 * 5. Returns the truth_user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // 1. Get access token from Authorization header or body
    const authHeader = request.headers.get('authorization');
    const body = await request.json().catch(() => ({}));
    const accessToken = authHeader?.replace('Bearer ', '') || body.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 401 });
    }

    // 2. Verify token by getting user from Supabase
    const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user: authUser }, error: authError } = await verifyClient.auth.getUser(accessToken);

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // 3. Use admin client to check/create truth_user (bypasses RLS)
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if truth_user already exists
    const { data: existing, error: selectError } = await admin
      .from('truth_users')
      .select('*')
      .eq('auth_id', authUser.id)
      .limit(1);

    if (selectError) {
      console.error('[ensure-user] SELECT error:', selectError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      // User exists — update last_active and return
      await admin
        .from('truth_users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', existing[0].id);

      return NextResponse.json({ user: existing[0], created: false });
    }

    // 4. Create new truth_user
    const displayName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı';
    const anonymousId = `WITNESS_${authUser.id.substring(0, 8)}`;

    // Try with email first, fallback without
    const insertData: Record<string, any> = {
      auth_id: authUser.id,
      anonymous_id: anonymousId,
      display_name: displayName,
      trust_level: 1,
      reputation_score: 10,
      contributions_count: 0,
      verified_contributions: 0,
      false_contributions: 0,
      preferred_language: 'tr',
    };

    let newUser = null;

    const { data: d1, error: e1 } = await admin
      .from('truth_users')
      .insert({ ...insertData, email: authUser.email })
      .select()
      .single();

    if (e1) {
      // Retry without email column (schema might not have it)
      const { data: d2, error: e2 } = await admin
        .from('truth_users')
        .insert(insertData)
        .select()
        .single();

      if (e2) {
        console.error('[ensure-user] INSERT error:', e2);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
      newUser = d2;
    } else {
      newUser = d1;
    }

    console.log('[ensure-user] Created truth_user:', newUser?.id, 'for auth:', authUser.id);
    return NextResponse.json({ user: newUser, created: true });

  } catch (err: any) {
    console.error('[ensure-user] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
