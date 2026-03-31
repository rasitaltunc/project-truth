// ============================================
// SUPABASE RE-EXPORT — SINGLETON (UNTYPED)
// API route'lar bu dosyadan import eder
// Database type'ında olmayan tablolar için untyped
// ============================================

import { createClient } from '@supabase/supabase-js';
import { supabase as typedSupabase } from './supabaseClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = typedSupabase as any;

// ============================================
// SUPABASE ADMIN CLIENT — Service Role Key
// RLS bypass — sadece server-side API route'larda kullan
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // fallback to anon if service key missing
