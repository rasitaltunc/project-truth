-- ============================================
-- SELF-GROWING ENGINE TABLES
-- Yaşayan organizma altyapısı
-- ============================================

-- ============================================
-- PROCESSING QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'queued',
    data JSONB,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    result JSONB,

    CONSTRAINT valid_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'paused'))
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON processing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_created ON processing_queue(created_at);

-- ============================================
-- AUTO DISCOVERIES
-- ============================================

CREATE TABLE IF NOT EXISTS auto_discoveries (
    id TEXT PRIMARY KEY,
    discovery_type VARCHAR(50) NOT NULL,
    confidence INTEGER DEFAULT 50,
    title TEXT NOT NULL,
    description TEXT,
    suggested_action VARCHAR(100),
    related_ids UUID[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,

    CONSTRAINT valid_discovery_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_discoveries_status ON auto_discoveries(status);
CREATE INDEX IF NOT EXISTS idx_discoveries_confidence ON auto_discoveries(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_discoveries_type ON auto_discoveries(discovery_type);

-- ============================================
-- SYSTEM ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS system_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_type ON system_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON system_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON system_activity(user_id);

-- Auto-cleanup old activity logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS void AS $$
BEGIN
    DELETE FROM system_activity
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GROWTH METRICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_growth_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    new_nodes INTEGER,
    new_connections INTEGER,
    new_evidence INTEGER,
    verified_items INTEGER,
    auto_discoveries INTEGER,
    user_contributions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (days_back || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE AS date
    ),
    daily_nodes AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM truth_nodes
        WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_connections AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM truth_links
        WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_evidence AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM evidence_archive
        WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_verified AS (
        SELECT DATE(verified_at) as date, COUNT(*) as count
        FROM evidence_archive
        WHERE verified_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        AND verification_status = 'verified'
        GROUP BY DATE(verified_at)
    ),
    daily_discoveries AS (
        SELECT DATE(discovered_at) as date, COUNT(*) as count
        FROM auto_discoveries
        WHERE discovered_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(discovered_at)
    ),
    daily_contributions AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM user_contributions
        WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT
        ds.date,
        COALESCE(dn.count, 0)::INTEGER as new_nodes,
        COALESCE(dc.count, 0)::INTEGER as new_connections,
        COALESCE(de.count, 0)::INTEGER as new_evidence,
        COALESCE(dv.count, 0)::INTEGER as verified_items,
        COALESCE(dd.count, 0)::INTEGER as auto_discoveries,
        COALESCE(dco.count, 0)::INTEGER as user_contributions
    FROM date_series ds
    LEFT JOIN daily_nodes dn ON ds.date = dn.date
    LEFT JOIN daily_connections dc ON ds.date = dc.date
    LEFT JOIN daily_evidence de ON ds.date = de.date
    LEFT JOIN daily_verified dv ON ds.date = dv.date
    LEFT JOIN daily_discoveries dd ON ds.date = dd.date
    LEFT JOIN daily_contributions dco ON ds.date = dco.date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SHARED EVIDENCE PAIRS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION find_shared_evidence_pairs()
RETURNS TABLE (
    node_a UUID,
    node_b UUID,
    shared_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEAST(e1.node_id, e2.node_id) as node_a,
        GREATEST(e1.node_id, e2.node_id) as node_b,
        COUNT(DISTINCT e1.source_name) as shared_count
    FROM evidence_archive e1
    JOIN evidence_archive e2 ON e1.source_name = e2.source_name AND e1.node_id < e2.node_id
    WHERE e1.node_id IS NOT NULL AND e2.node_id IS NOT NULL
    GROUP BY LEAST(e1.node_id, e2.node_id), GREATEST(e1.node_id, e2.node_id)
    HAVING COUNT(DISTINCT e1.source_name) >= 2
    ORDER BY shared_count DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE auto_discoveries;
ALTER PUBLICATION supabase_realtime ADD TABLE system_activity;

-- ============================================
-- VIEWS
-- ============================================

-- Queue Summary View
CREATE OR REPLACE VIEW queue_summary AS
SELECT
    type,
    status,
    COUNT(*) as count,
    AVG(attempts) as avg_attempts,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM processing_queue
GROUP BY type, status;

-- System Health View
CREATE OR REPLACE VIEW system_health AS
SELECT
    (SELECT COUNT(*) FROM truth_nodes) as total_nodes,
    (SELECT COUNT(*) FROM truth_links) as total_connections,
    (SELECT COUNT(*) FROM evidence_archive) as total_evidence,
    (SELECT COUNT(*) FROM evidence_archive WHERE verification_status = 'verified') as verified_evidence,
    (SELECT COUNT(*) FROM processing_queue WHERE status = 'queued') as queue_depth,
    (SELECT COUNT(*) FROM processing_queue WHERE status = 'processing') as active_jobs,
    (SELECT COUNT(*) FROM auto_discoveries WHERE status = 'pending') as pending_discoveries,
    (SELECT MAX(created_at) FROM system_activity) as last_activity;

-- Recent Discoveries View
CREATE OR REPLACE VIEW recent_discoveries AS
SELECT
    ad.*,
    ARRAY(
        SELECT label FROM truth_nodes WHERE id = ANY(ad.related_ids)
    ) as related_labels
FROM auto_discoveries ad
WHERE ad.status = 'pending'
ORDER BY ad.confidence DESC, ad.discovered_at DESC
LIMIT 20;

-- ============================================
-- SCHEDULED CLEANUP
-- ============================================

-- Function to clean up old completed/failed jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
    -- Keep completed jobs for 7 days
    DELETE FROM processing_queue
    WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';

    -- Reset stuck processing jobs (older than 1 hour)
    UPDATE processing_queue
    SET status = 'queued', started_at = NULL
    WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE processing_queue IS 'Background job processing queue for async operations';
COMMENT ON TABLE auto_discoveries IS 'AI-discovered potential connections and entities';
COMMENT ON TABLE system_activity IS 'Activity log for system events and user actions';
