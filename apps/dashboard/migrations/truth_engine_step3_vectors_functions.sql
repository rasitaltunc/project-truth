-- ============================================
-- TRUTH ENGINE - STEP 3: Vector Indexes & Functions
-- Run this AFTER Step 2 completes successfully
-- ============================================

-- ============================================
-- VECTOR INDEXES (requires pgvector)
-- ============================================

-- Only create vector indexes if there's data with embeddings
-- These can be created later when you have more data

-- For entities (uncomment when you have >100 entities with embeddings)
-- CREATE INDEX IF NOT EXISTS idx_entities_embedding ON entities
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- For documents (uncomment when you have >100 documents with embeddings)
-- CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to normalize entity names for matching
CREATE OR REPLACE FUNCTION normalize_entity_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(input_name, '[^a-zA-Z0-9\s]', '', 'g'),
            '\s+', ' ', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update entity timestamps
CREATE OR REPLACE FUNCTION update_entity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for entity updates
DROP TRIGGER IF EXISTS entity_timestamp_trigger ON entities;
CREATE TRIGGER entity_timestamp_trigger
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_timestamp();

-- ============================================
-- SIMILARITY SEARCH FUNCTIONS
-- ============================================

-- Function to find similar entities by embedding
CREATE OR REPLACE FUNCTION find_similar_entities(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    entity_id UUID,
    entity_name VARCHAR(500),
    entity_type VARCHAR(50),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.name,
        e.type,
        (1 - (e.embedding <=> query_embedding))::FLOAT as sim
    FROM entities e
    WHERE e.embedding IS NOT NULL
      AND (1 - (e.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar documents
CREATE OR REPLACE FUNCTION find_similar_documents(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.75,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    document_id UUID,
    document_title VARCHAR(1000),
    document_type VARCHAR(50),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.type,
        (1 - (d.embedding <=> query_embedding))::FLOAT as sim
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NETWORK TRAVERSAL FUNCTION
-- ============================================

-- Function to get entity network (2 degrees of separation)
CREATE OR REPLACE FUNCTION get_entity_network(
    center_entity_id UUID,
    max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    entity_id UUID,
    entity_name VARCHAR(500),
    entity_type VARCHAR(50),
    relationship_type VARCHAR(50),
    depth INTEGER,
    path UUID[]
) AS $$
WITH RECURSIVE network AS (
    -- Base case: the center entity
    SELECT
        e.id,
        e.name,
        e.type,
        NULL::VARCHAR(50) as rel_type,
        0 as depth,
        ARRAY[e.id] as path
    FROM entities e
    WHERE e.id = center_entity_id

    UNION ALL

    -- Recursive case: connected entities
    SELECT
        e.id,
        e.name,
        e.type,
        r.type as rel_type,
        n.depth + 1,
        n.path || e.id
    FROM network n
    JOIN relationships r ON (r.source_entity_id = n.entity_id OR r.target_entity_id = n.entity_id)
    JOIN entities e ON (
        (r.source_entity_id = e.id AND r.target_entity_id = n.entity_id) OR
        (r.target_entity_id = e.id AND r.source_entity_id = n.entity_id)
    )
    WHERE n.depth < max_depth
      AND NOT (e.id = ANY(n.path)) -- Prevent cycles
)
SELECT DISTINCT ON (network.entity_id)
    network.entity_id,
    network.entity_name,
    network.entity_type,
    network.rel_type as relationship_type,
    network.depth,
    network.path
FROM network
WHERE network.depth > 0
ORDER BY network.entity_id, network.depth;
$$ LANGUAGE sql;

-- ============================================
-- SYSTEM STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW system_stats AS
SELECT
    (SELECT COUNT(*) FROM entities) as total_entities,
    (SELECT COUNT(*) FROM entities WHERE type = 'person') as total_people,
    (SELECT COUNT(*) FROM entities WHERE type = 'organization') as total_organizations,
    (SELECT COUNT(*) FROM relationships) as total_relationships,
    (SELECT COUNT(*) FROM documents) as total_documents,
    (SELECT COUNT(*) FROM documents WHERE processing_status = 'completed') as processed_documents,
    (SELECT COUNT(*) FROM investigation_leads WHERE status = 'new') as pending_leads,
    (SELECT COALESCE(SUM(cost), 0) FROM cost_records WHERE timestamp > NOW() - INTERVAL '30 days') as monthly_cost;

-- Test the functions
SELECT normalize_entity_name('Jeffrey Epstein') as test_normalize;

-- Show what was created
SELECT 'Tables, indexes, and functions created successfully!' as status;
