-- ============================================
-- CONNECTION EVENTS TABLE
-- İki entity arasındaki olayları sakla
-- ============================================

-- Connection Events Table
CREATE TABLE IF NOT EXISTS connection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- İki entity
    source_id UUID REFERENCES truth_nodes(id) ON DELETE CASCADE,
    target_id UUID REFERENCES truth_nodes(id) ON DELETE CASCADE,

    -- Olay detayları
    event_date DATE,
    event_type VARCHAR(50) NOT NULL DEFAULT 'other',
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,

    -- Kaynak bilgileri
    source_name VARCHAR(255),
    source_url TEXT,

    -- Doğrulama
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Bağlı kanıtlar
    evidence_ids UUID[] DEFAULT '{}',

    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    -- Her iki yönü de kontrol et (A-B veya B-A)
    CONSTRAINT unique_event_pair UNIQUE (source_id, target_id, event_date, title)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connection_events_source ON connection_events(source_id);
CREATE INDEX IF NOT EXISTS idx_connection_events_target ON connection_events(target_id);
CREATE INDEX IF NOT EXISTS idx_connection_events_date ON connection_events(event_date);
CREATE INDEX IF NOT EXISTS idx_connection_events_type ON connection_events(event_type);

-- Event Types
COMMENT ON COLUMN connection_events.event_type IS
'meeting, transaction, travel, communication, document, witness, media, legal, other';

-- ============================================
-- RPC: Get Connection Timeline
-- ============================================

CREATE OR REPLACE FUNCTION get_connection_timeline(
    p_source_id UUID,
    p_target_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'events', COALESCE((
            SELECT json_agg(e ORDER BY e.event_date ASC)
            FROM (
                SELECT
                    ce.id,
                    ce.event_date as date,
                    ce.title,
                    ce.description,
                    ce.event_type as type,
                    ce.location,
                    ce.source_name as source,
                    ce.source_url as "sourceUrl",
                    ce.confidence,
                    ce.verified,
                    ce.evidence_ids as "evidenceIds"
                FROM connection_events ce
                WHERE (ce.source_id = p_source_id AND ce.target_id = p_target_id)
                   OR (ce.source_id = p_target_id AND ce.target_id = p_source_id)
            ) e
        ), '[]'::json),
        'link', (
            SELECT json_build_object(
                'type', COALESCE(l.type, 'associated'),
                'strength', COALESCE(l.strength, 50),
                'first_seen', l.first_seen,
                'last_activity', l.last_activity
            )
            FROM truth_links l
            WHERE (l.source = p_source_id AND l.target = p_target_id)
               OR (l.source = p_target_id AND l.target = p_source_id)
            LIMIT 1
        ),
        'shared_evidence_count', (
            SELECT COUNT(DISTINCT ea.id)
            FROM evidence_archive ea
            WHERE ea.node_id IN (p_source_id, p_target_id)
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Update timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_connection_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_connection_event_timestamp ON connection_events;
CREATE TRIGGER trigger_connection_event_timestamp
    BEFORE UPDATE ON connection_events
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_event_timestamp();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to add sample data:
/*
INSERT INTO connection_events (source_id, target_id, event_date, event_type, title, description, location, source_name, confidence, verified)
SELECT
    (SELECT id FROM truth_nodes LIMIT 1 OFFSET 0),
    (SELECT id FROM truth_nodes LIMIT 1 OFFSET 1),
    '2010-05-15',
    'meeting',
    'Özel Ada Buluşması',
    'İki taraf özel adada bir araya geldi. Toplantı yaklaşık 3 saat sürdü.',
    'Little St. James, US Virgin Islands',
    'Uçuş Kayıtları',
    85,
    true
WHERE EXISTS (SELECT 1 FROM truth_nodes LIMIT 2);
*/

-- ============================================
-- VIEWS
-- ============================================

-- Most Connected Pairs
CREATE OR REPLACE VIEW most_connected_pairs AS
SELECT
    LEAST(ce.source_id, ce.target_id) as entity_a,
    GREATEST(ce.source_id, ce.target_id) as entity_b,
    n1.label as entity_a_name,
    n2.label as entity_b_name,
    COUNT(*) as event_count,
    MIN(ce.event_date) as first_event,
    MAX(ce.event_date) as last_event,
    AVG(ce.confidence) as avg_confidence
FROM connection_events ce
JOIN truth_nodes n1 ON n1.id = LEAST(ce.source_id, ce.target_id)
JOIN truth_nodes n2 ON n2.id = GREATEST(ce.source_id, ce.target_id)
GROUP BY entity_a, entity_b, n1.label, n2.label
ORDER BY event_count DESC;

-- Recent Connection Events
CREATE OR REPLACE VIEW recent_connection_events AS
SELECT
    ce.id,
    ce.source_id,
    ce.target_id,
    ce.event_date,
    ce.event_type,
    ce.title,
    ce.description,
    ce.location,
    ce.source_name as event_source,
    ce.source_url,
    ce.confidence,
    ce.verified,
    ce.evidence_ids,
    ce.created_at,
    n1.label as source_node_name,
    n2.label as target_node_name,
    n1.img as source_img,
    n2.img as target_img
FROM connection_events ce
JOIN truth_nodes n1 ON n1.id = ce.source_id
JOIN truth_nodes n2 ON n2.id = ce.target_id
ORDER BY ce.created_at DESC
LIMIT 50;

COMMENT ON TABLE connection_events IS 'Stores events and interactions between two entities for timeline visualization';
