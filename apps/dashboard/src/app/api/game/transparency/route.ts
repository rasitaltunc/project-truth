/**
 * /api/game/transparency
 * GET: Query the transparency log + platform metrics
 *
 * Sprint G1: Radical Transparency — everything is auditable
 * "Bize güvenme, kendin bak."
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GAME_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';
import { safePage, safeLimit } from '@/lib/inputSanitizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GAME_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get('network_id');
    const targetId = searchParams.get('target_id');
    const actionType = searchParams.get('action_type');
    const view = searchParams.get('view') || 'log'; // 'log' | 'metrics' | 'entity_trail'
    const page = safePage(searchParams.get('page'));
    const limit = safeLimit(searchParams.get('limit'), 50);

    // ALL game tables use UUID for network_id — resolve slug to UUID
    let resolvedNetworkId: string | null = networkId;
    if (networkId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(networkId);
      if (!isUUID) {
        const { data: network } = await supabaseAdmin
          .from('networks')
          .select('id')
          .or(`slug.eq.${networkId},name.ilike.%${networkId.replace(/-/g, ' ')}%`)
          .limit(1)
          .maybeSingle();
        resolvedNetworkId = network?.id || null;
      }
    }

    // === VIEW: Transparency Log ===
    if (view === 'log') {
      let query = supabaseAdmin
        .from('transparency_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (resolvedNetworkId) {
        query = query.eq('network_id', resolvedNetworkId);
      } else {
        query = query.is('network_id', null);
      }
      if (targetId) query = query.eq('target_id', targetId);
      if (actionType) query = query.eq('action_type', actionType);

      const { data, count, error } = await query;
      if (error) throw error;

      return NextResponse.json({
        view: 'log',
        entries: data || [],
        totalCount: count || 0,
        page,
        limit,
      });
    }

    // === VIEW: Platform Metrics (kamuya açık) ===
    if (view === 'metrics') {
      // Each query is wrapped in try-catch to prevent one failing table
      // from killing the entire metrics response (graceful degradation)

      // Stored metrics from platform_metrics table
      let storedMetrics: unknown[] = [];
      try {
        let metricsQuery = supabaseAdmin
          .from('platform_metrics')
          .select('*')
          .order('measured_at', { ascending: false })
          .limit(50);

        if (resolvedNetworkId) {
          metricsQuery = metricsQuery.eq('network_id', resolvedNetworkId);
        } else {
          metricsQuery = metricsQuery.is('network_id', null);
        }

        const { data: metrics, error } = await metricsQuery;
        if (!error && metrics) {
          // Deduplicate: keep latest per metric_name
          const latestMetrics: Record<string, unknown> = {};
          for (const m of metrics) {
            if (!latestMetrics[m.metric_name as string]) {
              latestMetrics[m.metric_name as string] = m;
            }
          }
          storedMetrics = Object.values(latestMetrics);
        }
      } catch (e) {
        console.warn('[transparency/metrics] platform_metrics query failed (table may not exist):', e);
      }

      // Live task stats (graceful per-query)
      let totalTasks = 0;
      let completedTasks = 0;
      let activeInvestigators = 0;
      let totalDisputes = 0;
      let openDisputes = 0;

      try {
        let totalTasksQuery = supabaseAdmin
          .from('investigation_tasks')
          .select('id', { count: 'exact', head: true });
        if (resolvedNetworkId) {
          totalTasksQuery = totalTasksQuery.eq('network_id', resolvedNetworkId);
        } else {
          totalTasksQuery = totalTasksQuery.is('network_id', null);
        }
        const { count } = await totalTasksQuery;
        totalTasks = count || 0;
      } catch (e) {
        console.warn('[transparency/metrics] investigation_tasks count failed:', e);
      }

      try {
        let completedTasksQuery = supabaseAdmin
          .from('investigation_tasks')
          .select('id', { count: 'exact', head: true })
          .in('status', ['consensus', 'promoted', 'rejected']);
        if (resolvedNetworkId) {
          completedTasksQuery = completedTasksQuery.eq('network_id', resolvedNetworkId);
        } else {
          completedTasksQuery = completedTasksQuery.is('network_id', null);
        }
        const { count } = await completedTasksQuery;
        completedTasks = count || 0;
      } catch (e) {
        console.warn('[transparency/metrics] completed_tasks count failed:', e);
      }

      try {
        const { count } = await supabaseAdmin
          .from('task_assignments')
          .select('user_fingerprint', { count: 'exact', head: true });
        activeInvestigators = count || 0;
      } catch (e) {
        console.warn('[transparency/metrics] active_investigators count failed:', e);
      }

      try {
        let totalDisputesQuery = supabaseAdmin
          .from('disputes')
          .select('id', { count: 'exact', head: true });
        if (resolvedNetworkId) {
          totalDisputesQuery = totalDisputesQuery.eq('network_id', resolvedNetworkId);
        } else {
          totalDisputesQuery = totalDisputesQuery.is('network_id', null);
        }
        const { count } = await totalDisputesQuery;
        totalDisputes = count || 0;
      } catch (e) {
        console.warn('[transparency/metrics] total_disputes count failed:', e);
      }

      try {
        let openDisputesQuery = supabaseAdmin
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open');
        if (resolvedNetworkId) {
          openDisputesQuery = openDisputesQuery.eq('network_id', resolvedNetworkId);
        } else {
          openDisputesQuery = openDisputesQuery.is('network_id', null);
        }
        const { count } = await openDisputesQuery;
        openDisputes = count || 0;
      } catch (e) {
        console.warn('[transparency/metrics] open_disputes count failed:', e);
      }

      return NextResponse.json({
        view: 'metrics',
        stored_metrics: storedMetrics,
        live: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(1) + '%' : '0%',
          active_investigators: activeInvestigators,
          total_disputes: totalDisputes,
          open_disputes: openDisputes,
        },
        note: 'All platform metrics are publicly visible. No hidden data.',
      });
    }

    // === VIEW: Entity Trail (bilginin tam hayat hikayesi) ===
    if (view === 'entity_trail' && targetId) {
      // Get ALL transparency log entries for this entity
      const { data: trail } = await supabaseAdmin
        .from('transparency_log')
        .select('*')
        .eq('target_id', targetId)
        .order('created_at', { ascending: true });

      // Get related task
      const { data: task } = await supabaseAdmin
        .from('investigation_tasks')
        .select('*, task_assignments(*)')
        .or(`id.eq.${targetId},source_quarantine_id.eq.${targetId}`)
        .limit(1)
        .maybeSingle();

      // Get quarantine record if applicable
      const { data: quarantine } = await supabaseAdmin
        .from('data_quarantine')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      // Get disputes about this entity
      const { data: disputes } = await supabaseAdmin
        .from('disputes')
        .select('*')
        .eq('target_id', targetId)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        view: 'entity_trail',
        target_id: targetId,
        trail: trail || [],
        task,
        quarantine,
        disputes: disputes || [],
        summary: {
          total_events: (trail || []).length,
          first_seen: trail?.[0]?.created_at || null,
          last_event: trail?.[trail.length - 1]?.created_at || null,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    return safeErrorResponse('GET /api/game/transparency', error);
  }
}
