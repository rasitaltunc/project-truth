// ============================================
// SYSTEM PULSE API
// Yaşayan organizmanın kalp atışı endpoint'i
// ============================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'pulse';

        switch (action) {
            case 'pulse':
                return await getSystemPulse();
            case 'activity':
                const limit = parseInt(searchParams.get('limit') || '30');
                return await getActivityFeed(limit);
            case 'discoveries':
                return await getPendingDiscoveries();
            case 'growth':
                const days = parseInt(searchParams.get('days') || '14');
                return await getGrowthMetrics(days);
            case 'stats':
                return await getSystemStats();
            default:
                return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
        }

    } catch (error: any) {
        return safeErrorResponse('GET /api/system/pulse', error);
    }
}

// POST for actions like approve/reject discoveries
export async function POST(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const body = await request.json();
        const { action, discoveryId, reason } = body;

        if (action === 'approve_discovery' && discoveryId) {
            return await approveDiscovery(discoveryId);
        }

        if (action === 'reject_discovery' && discoveryId) {
            return await rejectDiscovery(discoveryId, reason);
        }

        if (action === 'log_activity') {
            const { type, message, data, userId } = body;
            return await logActivity(type, message, data, userId);
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

    } catch (error: any) {
        return safeErrorResponse('POST /api/system/pulse', error);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getSystemPulse() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    try {
        // Try to get queue stats (may not exist yet)
        let stats = { queued: 0, processing: 0, completed: 0, failed: 0 };

        try {
            const { data: queueStats } = await supabase
                .from('processing_queue')
                .select('status')
                .gte('created_at', todayStart);

            for (const job of queueStats || []) {
                const status = job.status as keyof typeof stats;
                if (status in stats) stats[status]++;
            }
        } catch (e) {
            // Table may not exist yet
        }

        // Last activity
        let lastActivity = now.toISOString();
        try {
            const { data } = await supabase
                .from('system_activity')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) lastActivity = data.created_at;
        } catch (e) {
            // Table may not exist yet
        }

        // Calculate health score
        const totalToday = stats.completed + stats.failed;
        const successRate = totalToday > 0 ? (stats.completed / totalToday) * 100 : 100;
        const queuePressure = Math.max(0, 100 - stats.queued * 2);
        const healthScore = Math.round((successRate + queuePressure) / 2);

        return NextResponse.json({
            success: true,
            data: {
                timestamp: now.toISOString(),
                activeJobs: stats.processing,
                completedToday: stats.completed,
                failedToday: stats.failed,
                queueDepth: stats.queued,
                processingRate: 0,
                healthScore,
                lastActivity,
                activeWorkers: stats.processing > 0 ? 1 : 0
            }
        });

    } catch (error) {
        // Return default values on any error
        return NextResponse.json({
            success: true,
            data: {
                timestamp: now.toISOString(),
                activeJobs: 0,
                completedToday: 0,
                failedToday: 0,
                queueDepth: 0,
                processingRate: 0,
                healthScore: 85,
                lastActivity: now.toISOString(),
                activeWorkers: 0
            }
        });
    }
}

async function getActivityFeed(limit: number) {
    try {
        const { data } = await supabase
            .from('system_activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        return NextResponse.json({
            success: true,
            data: (data || []).map(a => ({
                id: a.id,
                type: a.activity_type,
                message: a.message,
                data: a.data,
                userId: a.user_id,
                createdAt: a.created_at
            }))
        });

    } catch (error) {
        return NextResponse.json({ success: true, data: [] });
    }
}

async function getPendingDiscoveries() {
    try {
        const { data } = await supabase
            .from('auto_discoveries')
            .select('*')
            .eq('status', 'pending')
            .order('confidence', { ascending: false })
            .limit(20);

        return NextResponse.json({
            success: true,
            data: (data || []).map(d => ({
                id: d.id,
                type: d.discovery_type,
                confidence: d.confidence,
                title: d.title,
                description: d.description,
                suggestedAction: d.suggested_action,
                relatedIds: d.related_ids || [],
                status: d.status,
                discoveredAt: d.discovered_at
            }))
        });

    } catch (error) {
        return NextResponse.json({ success: true, data: [] });
    }
}

async function getGrowthMetrics(days: number) {
    try {
        // Generate date series
        const metrics = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Get counts for this day (simplified - in production would be more efficient)
            const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
            const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

            let newNodes = 0, newConnections = 0, newEvidence = 0;

            try {
                const { count: nodeCount } = await supabase
                    .from('truth_nodes')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', dayStart)
                    .lte('created_at', dayEnd);
                newNodes = nodeCount || 0;
            } catch (e) {}

            try {
                const { count: linkCount } = await supabase
                    .from('truth_links')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', dayStart)
                    .lte('created_at', dayEnd);
                newConnections = linkCount || 0;
            } catch (e) {}

            try {
                const { count: evidenceCount } = await supabase
                    .from('evidence_archive')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', dayStart)
                    .lte('created_at', dayEnd);
                newEvidence = evidenceCount || 0;
            } catch (e) {}

            metrics.push({
                date: dateStr,
                newNodes,
                newConnections,
                newEvidence,
                verifiedItems: 0,
                autoDiscoveries: 0,
                userContributions: 0
            });
        }

        return NextResponse.json({ success: true, data: metrics });

    } catch (error) {
        return NextResponse.json({ success: true, data: [] });
    }
}

async function getSystemStats() {
    try {
        let totalNodes = 0, totalConnections = 0, totalEvidence = 0, totalUsers = 0;
        let verifiedEvidence = 0, pendingVerifications = 0, autoDiscoveries = 0;

        try {
            const { count } = await supabase.from('truth_nodes').select('*', { count: 'exact', head: true });
            totalNodes = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('truth_links').select('*', { count: 'exact', head: true });
            totalConnections = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('evidence_archive').select('*', { count: 'exact', head: true });
            totalEvidence = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('truth_users').select('*', { count: 'exact', head: true });
            totalUsers = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('evidence_archive').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified');
            verifiedEvidence = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('evidence_archive').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
            pendingVerifications = count || 0;
        } catch (e) {}

        try {
            const { count } = await supabase.from('auto_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            autoDiscoveries = count || 0;
        } catch (e) {}

        return NextResponse.json({
            success: true,
            data: {
                totalNodes,
                totalConnections,
                totalEvidence,
                totalUsers,
                verifiedEvidence,
                pendingVerifications,
                autoDiscoveries,
                systemHealth: 85
            }
        });

    } catch (error) {
        return NextResponse.json({
            success: true,
            data: {
                totalNodes: 0,
                totalConnections: 0,
                totalEvidence: 0,
                totalUsers: 0,
                verifiedEvidence: 0,
                pendingVerifications: 0,
                autoDiscoveries: 0,
                systemHealth: 85
            }
        });
    }
}

async function approveDiscovery(discoveryId: string) {
    try {
        const { data: discovery } = await supabase
            .from('auto_discoveries')
            .select('*')
            .eq('id', discoveryId)
            .single();

        if (!discovery) {
            return NextResponse.json({ success: false, error: 'Discovery not found' }, { status: 404 });
        }

        if (discovery.suggested_action === 'create_connection' && discovery.related_ids?.length >= 2) {
            const [sourceId, targetId] = discovery.related_ids;

            await supabase
                .from('truth_links')
                .insert({
                    source: sourceId,
                    target: targetId,
                    type: 'auto_discovered',
                    strength: discovery.confidence,
                    metadata: {
                        discovered_by: 'auto_linker',
                        discovery_id: discoveryId
                    }
                });
        }

        await supabase
            .from('auto_discoveries')
            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
            .eq('id', discoveryId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return safeErrorResponse('POST /api/system/pulse (approveDiscovery)', error);
    }
}

async function rejectDiscovery(discoveryId: string, reason?: string) {
    try {
        await supabase
            .from('auto_discoveries')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', discoveryId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return safeErrorResponse('POST /api/system/pulse (rejectDiscovery)', error);
    }
}

async function logActivity(type: string, message: string, data?: any, userId?: string) {
    try {
        await supabase
            .from('system_activity')
            .insert({
                activity_type: type,
                message,
                data,
                user_id: userId
            });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return safeErrorResponse('POST /api/system/pulse (logActivity)', error);
    }
}
