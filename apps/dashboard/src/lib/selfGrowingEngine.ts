// ============================================
// SELF-GROWING ENGINE (CLIENT-SIDE API)
// Kendini büyüten, yaşayan organizma
// ============================================

// Note: This module uses API routes for data fetching
// to avoid exposing Supabase credentials in the browser
// Server-side processing functions are in the API route

// ============================================
// TYPES
// ============================================

export interface ProcessingJob {
    id: string;
    type: 'document' | 'entity' | 'connection' | 'enrichment' | 'verification';
    priority: number;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
    data: any;
    attempts: number;
    maxAttempts: number;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    result?: any;
}

export interface SystemPulse {
    timestamp: string;
    activeJobs: number;
    completedToday: number;
    failedToday: number;
    queueDepth: number;
    processingRate: number;
    healthScore: number;
    lastActivity: string;
    activeWorkers: number;
}

export interface GrowthMetric {
    date: string;
    newNodes: number;
    newConnections: number;
    newEvidence: number;
    verifiedItems: number;
    autoDiscoveries: number;
    userContributions: number;
}

export interface AutoDiscovery {
    id: string;
    type: 'entity' | 'connection' | 'pattern' | 'anomaly';
    confidence: number;
    title: string;
    description: string;
    suggestedAction: string;
    relatedIds: string[];
    status: 'pending' | 'approved' | 'rejected';
    discoveredAt: string;
}

export type ActivityType =
    | 'document_submitted'
    | 'document_analyzed'
    | 'entity_created'
    | 'entity_updated'
    | 'connection_created'
    | 'evidence_added'
    | 'verification_completed'
    | 'auto_discovery'
    | 'auto_link_approved'
    | 'job_completed'
    | 'job_failed'
    | 'user_joined'
    | 'system_event';

export interface Activity {
    id: string;
    type: ActivityType;
    message: string;
    data?: any;
    userId?: string;
    createdAt: string;
}

export interface SystemStats {
    totalNodes: number;
    totalConnections: number;
    totalEvidence: number;
    totalUsers: number;
    verifiedEvidence: number;
    pendingVerifications: number;
    autoDiscoveries: number;
    systemHealth: number;
}

// ============================================
// API FUNCTIONS (Client-Safe)
// ============================================

/**
 * Get current system health pulse
 */
export async function getSystemPulse(): Promise<SystemPulse> {
    const now = new Date();

    try {
        const res = await fetch('/api/system/pulse?action=pulse');
        const data = await res.json();

        if (data.success && data.data) {
            return data.data;
        }

        throw new Error('Invalid response');

    } catch (err) {
        console.error('System pulse error:', err);
        return {
            timestamp: now.toISOString(),
            activeJobs: 0,
            completedToday: 0,
            failedToday: 0,
            queueDepth: 0,
            processingRate: 0,
            healthScore: 85,
            lastActivity: now.toISOString(),
            activeWorkers: 0
        };
    }
}

/**
 * Get growth metrics for the last N days
 */
export async function getGrowthMetrics(days: number = 30): Promise<GrowthMetric[]> {
    try {
        const res = await fetch(`/api/system/pulse?action=growth&days=${days}`);
        const data = await res.json();

        if (data.success && data.data) {
            return data.data;
        }

        return [];

    } catch (err) {
        console.error('Growth metrics error:', err);
        return [];
    }
}

/**
 * Log system activity
 */
export async function logActivity(
    type: ActivityType,
    message: string,
    data?: any,
    userId?: string
): Promise<void> {
    try {
        await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'log_activity',
                type,
                message,
                data,
                userId
            })
        });
    } catch (err) {
        console.error('Log activity error:', err);
    }
}

/**
 * Get recent activity feed
 */
export async function getActivityFeed(limit: number = 50): Promise<Activity[]> {
    try {
        const res = await fetch(`/api/system/pulse?action=activity&limit=${limit}`);
        const data = await res.json();

        if (data.success && data.data) {
            return data.data;
        }

        return [];

    } catch (err) {
        console.error('Activity feed error:', err);
        return [];
    }
}

/**
 * Get pending auto-discoveries for review
 */
export async function getPendingDiscoveries(limit: number = 20): Promise<AutoDiscovery[]> {
    try {
        const res = await fetch(`/api/system/pulse?action=discoveries`);
        const data = await res.json();

        if (data.success && data.data) {
            return data.data.slice(0, limit);
        }

        return [];

    } catch (err) {
        console.error('Get pending discoveries error:', err);
        return [];
    }
}

/**
 * Apply an auto-discovery (create the suggested connection/entity)
 */
export async function applyDiscovery(
    discoveryId: string,
    approvedBy?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'approve_discovery',
                discoveryId,
                approvedBy
            })
        });

        const data = await res.json();
        return { success: data.success, error: data.error };

    } catch (err: any) {
        console.error('Apply discovery error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Reject a discovery
 */
export async function rejectDiscovery(
    discoveryId: string,
    reason?: string
): Promise<void> {
    try {
        await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reject_discovery',
                discoveryId,
                reason
            })
        });
    } catch (err) {
        console.error('Reject discovery error:', err);
    }
}

/**
 * Get system statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
    try {
        const res = await fetch('/api/system/pulse?action=stats');
        const data = await res.json();

        if (data.success && data.data) {
            return data.data;
        }

        throw new Error('Invalid response');

    } catch (err) {
        console.error('System stats error:', err);
        return {
            totalNodes: 0,
            totalConnections: 0,
            totalEvidence: 0,
            totalUsers: 0,
            verifiedEvidence: 0,
            pendingVerifications: 0,
            autoDiscoveries: 0,
            systemHealth: 85
        };
    }
}

// ============================================
// QUEUE HELPERS (Client-side wrappers)
// These call server-side APIs
// ============================================

/**
 * Queue document for background processing
 */
export async function queueDocumentForProcessing(
    documentId: string,
    content: string,
    metadata?: any
): Promise<string | null> {
    try {
        const res = await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'queue_job',
                jobType: 'document',
                priority: 7,
                data: {
                    documentId,
                    content,
                    metadata,
                    steps: ['extract_entities', 'find_connections', 'verify_claims']
                }
            })
        });

        const data = await res.json();
        return data.success ? data.jobId : null;

    } catch (err) {
        console.error('Queue document error:', err);
        return null;
    }
}

/**
 * Queue entity for enrichment
 */
export async function queueEntityEnrichment(
    entityId: string,
    entityName: string
): Promise<string | null> {
    try {
        const res = await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'queue_job',
                jobType: 'enrichment',
                priority: 5,
                data: {
                    entityId,
                    entityName,
                    steps: ['web_search', 'cross_reference', 'timeline_build']
                }
            })
        });

        const data = await res.json();
        return data.success ? data.jobId : null;

    } catch (err) {
        console.error('Queue enrichment error:', err);
        return null;
    }
}

/**
 * Queue verification task
 */
export async function queueVerification(
    evidenceId: string,
    evidenceType: string
): Promise<string | null> {
    try {
        const res = await fetch('/api/system/pulse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'queue_job',
                jobType: 'verification',
                priority: 6,
                data: {
                    evidenceId,
                    evidenceType,
                    steps: ['source_check', 'duplicate_check', 'credibility_score']
                }
            })
        });

        const data = await res.json();
        return data.success ? data.jobId : null;

    } catch (err) {
        console.error('Queue verification error:', err);
        return null;
    }
}
