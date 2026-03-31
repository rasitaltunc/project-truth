/**
 * /api/game/profile
 * GET: Get investigator profile (fully transparent — anyone can see anyone's stats)
 *
 * Sprint G1: Investigator Profiles + Radical Transparency
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GAME_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GAME_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 });
    }

    // Get profile
    const { data: profile, error } = await supabaseAdmin
      .from('investigator_profiles')
      .select('*')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      // Create new profile
      const { data: newProfile } = await supabaseAdmin
        .from('investigator_profiles')
        .upsert({ fingerprint }, { onConflict: 'fingerprint' })
        .select('*')
        .single();

      return NextResponse.json({ profile: newProfile, history: [], stats: {} });
    }

    // Get recent activity (ŞEFFAFLIK — herkes görebilir)
    const { data: recentActivity } = await supabaseAdmin
      .from('task_assignments')
      .select(`
        id, task_id, response, response_time_ms, reasoning,
        confidence_self_report, is_calibration, is_correct,
        created_at, trace_id
      `)
      .eq('user_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get accuracy by domain
    const { data: domainStats } = await supabaseAdmin
      .from('task_assignments')
      .select(`
        task_id,
        is_calibration,
        is_correct,
        investigation_tasks!inner(task_type, role_affinity)
      `)
      .eq('user_fingerprint', fingerprint)
      .eq('is_calibration', true);

    // Calculate domain accuracy
    const domainAccuracy: Record<string, { total: number; correct: number; accuracy: number }> = {};
    if (domainStats) {
      for (const stat of domainStats) {
        const task = stat.investigation_tasks as unknown as Record<string, unknown>;
        const role = (task?.role_affinity as string) || 'general';
        if (!domainAccuracy[role]) {
          domainAccuracy[role] = { total: 0, correct: 0, accuracy: 0 };
        }
        domainAccuracy[role].total++;
        if (stat.is_correct) domainAccuracy[role].correct++;
        domainAccuracy[role].accuracy =
          domainAccuracy[role].correct / domainAccuracy[role].total;
      }
    }

    // Get disputes filed by this user
    const { data: disputes, count: disputeCount } = await supabaseAdmin
      .from('disputes')
      .select('id, title, status, created_at, trace_id', { count: 'exact' })
      .eq('filed_by_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      profile: {
        ...profile,
        // Anonymize fingerprint for display but keep functional
        display_id: fingerprint.substring(0, 8) + '***',
      },
      history: recentActivity || [],
      domain_accuracy: domainAccuracy,
      disputes: {
        items: disputes || [],
        total: disputeCount || 0,
      },
      transparency: {
        trust_weight_formula: profile.trust_weight_formula,
        tier_thresholds: {
          novice: '0-49 XP',
          researcher: '50-199 XP',
          analyst: '200-499 XP',
          senior: '500-999 XP',
          expert: '1000+ XP',
        },
        note: 'All metrics are publicly visible. Trust weight formula is open for audit.',
      },
    });
  } catch (error) {
    return safeErrorResponse('GET /api/game/profile', error);
  }
}
