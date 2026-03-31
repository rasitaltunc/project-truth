-- ============================================
-- THE TRUTH ENGINE - Database Schema
-- PROJECT TRUTH's Knowledge Graph Foundation
-- ============================================
-- Bu migration, tüm bilgi grafiğinin temelini oluşturur.
-- pgvector extension gerekli: CREATE EXTENSION vector;
-- ============================================

-- Enable pgvector for embeddings (run this first in Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ENTITIES TABLE - Bilgi Grafiğinin Düğümleri
-- ============================================

CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'person', 'organization', 'location', 'event',
        'document', 'asset', 'financial', 'media', 'communication'
    )),

    -- Core fields
    name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL, -- Lowercase, for search
    aliases TEXT[] DEFAULT '{}',
    description TEXT,

    -- Metadata
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    source_count INTEGER DEFAULT 1,
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),

    -- Verification
    verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN (
        'unverified', 'community_verified', 'expert_verified', 'disputed'
    )),
    verified_by UUID[] DEFAULT '{}',
    dispute_reasons TEXT[] DEFAULT '{}',

    -- AI-generated
    embedding vector(1536), -- OpenAI ada-002 embedding dimension
    extracted_from UUID[] DEFAULT '{}',

    -- Type-specific properties (JSONB for flexibility)
    properties JSONB DEFAULT '{}',

    -- Indexes için
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_normalized_name ON entities(normalized_name);
CREATE INDEX IF NOT EXISTS idx_entities_verification ON entities(verification_status);
CREATE INDEX IF NOT EXISTS idx_entities_confidence ON entities(confidence DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_entities_fts ON entities USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Vector similarity index (for embedding search)
CREATE INDEX IF NOT EXISTS idx_entities_embedding ON entities
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- RELATIONSHIPS TABLE - Bağlantılar
-- ============================================

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'family', 'friend', 'romantic', 'associate',
        'employer', 'employee', 'board_member', 'founder', 'investor', 'advisor', 'client', 'partner',
        'funded', 'received_funds', 'owns', 'owned_by', 'transaction',
        'visited', 'lives_at', 'worked_at', 'headquartered',
        'attended', 'organized', 'witnessed', 'mentioned_in',
        'authored', 'signed', 'appears_in', 'referenced_in',
        'connected_to', 'same_as'
    )),

    -- Connection
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

    -- Details
    description TEXT,
    start_date DATE,
    end_date DATE,
    ongoing BOOLEAN DEFAULT true,

    -- Evidence
    evidence_ids UUID[] DEFAULT '{}',
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- User ID or NULL for AI
    verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN (
        'unverified', 'verified', 'disputed'
    )),

    -- AI-specific
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence INTEGER,
    ai_reasoning TEXT,

    -- Prevent duplicate relationships
    UNIQUE(source_entity_id, target_entity_id, type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_ai ON relationships(ai_generated) WHERE ai_generated = true;

-- ============================================
-- DOCUMENTS TABLE - Belgeler ve Kanıtlar
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'text', 'pdf', 'image', 'video', 'audio', 'webpage',
        'news_article', 'court_document', 'financial_record',
        'flight_log', 'email', 'social_media', 'leaked_document',
        'official_record', 'other'
    )),

    -- Content
    title VARCHAR(1000) NOT NULL,
    content TEXT,
    original_url TEXT,
    file_path TEXT,
    file_hash VARCHAR(64), -- SHA-256 for deduplication
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Dates
    source_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID,

    -- Processing
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    processing_level VARCHAR(50) DEFAULT 'none' CHECK (processing_level IN (
        'none', 'local', 'embedding', 'ai_analyzed'
    )),
    processing_error TEXT,

    -- AI results (stored as JSONB for flexibility)
    embedding vector(1536),
    extracted_entities JSONB DEFAULT '[]',
    extracted_relationships JSONB DEFAULT '[]',
    summary TEXT,
    key_facts TEXT[] DEFAULT '{}',

    -- Reliability
    source_reliability VARCHAR(50) DEFAULT 'unknown' CHECK (source_reliability IN (
        'unknown', 'low', 'medium', 'high', 'verified'
    )),
    verification_notes TEXT,

    -- Connections
    related_document_ids UUID[] DEFAULT '{}',
    mentioned_entity_ids UUID[] DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN (
    to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, ''))
);

-- ============================================
-- INVESTIGATION LEADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS investigation_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'connection', 'pattern', 'anomaly', 'timeline', 'network'
    )),

    -- Content
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    detailed_analysis TEXT,

    -- Related items
    involved_entities UUID[] DEFAULT '{}',
    involved_documents UUID[] DEFAULT '{}',
    suggested_connections JSONB DEFAULT '[]',

    -- Priority
    priority INTEGER DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
        'new', 'investigating', 'verified', 'dismissed'
    )),

    -- AI metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by VARCHAR(50) DEFAULT 'nightly_job',
    ai_confidence INTEGER,

    -- Community feedback
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON investigation_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON investigation_leads(priority DESC);
CREATE INDEX IF NOT EXISTS idx_leads_type ON investigation_leads(type);

-- ============================================
-- PROCESSING QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'document_extraction', 'entity_enrichment',
        'relationship_discovery', 'lead_generation'
    )),

    -- Target
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN (
        'low', 'normal', 'high', 'urgent'
    )),

    -- Status
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN (
        'queued', 'processing', 'completed', 'failed'
    )),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Cost
    estimated_cost DECIMAL(10, 6) DEFAULT 0,
    actual_cost DECIMAL(10, 6)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON processing_queue(priority, created_at);

-- ============================================
-- ENTITY CACHE TABLE - For fast lookups
-- ============================================

CREATE TABLE IF NOT EXISTS entity_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    entity_name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL,
    embedding vector(1536),

    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,

    UNIQUE(normalized_name)
);

-- Index for name lookup
CREATE INDEX IF NOT EXISTS idx_entity_cache_name ON entity_cache(normalized_name);

-- ============================================
-- QUERY CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    result JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    hit_count INTEGER DEFAULT 0
);

-- Index for hash lookup
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);

-- ============================================
-- COST TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation VARCHAR(50) NOT NULL,

    -- Details
    model_used VARCHAR(100),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,

    -- Cost in USD
    cost DECIMAL(10, 6) NOT NULL,

    -- Related
    user_id UUID,
    document_id UUID,
    job_id UUID
);

-- Indexes for aggregation
CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_operation ON cost_records(operation);
CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_records(user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to normalize entity names for matching
CREATE OR REPLACE FUNCTION normalize_entity_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
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
        1 - (e.embedding <=> query_embedding) as similarity
    FROM entities e
    WHERE e.embedding IS NOT NULL
      AND 1 - (e.embedding <=> query_embedding) > similarity_threshold
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
        1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

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
SELECT DISTINCT ON (entity_id)
    entity_id,
    entity_name,
    entity_type,
    rel_type as relationship_type,
    depth,
    path
FROM network
WHERE depth > 0
ORDER BY entity_id, depth;
$$ LANGUAGE sql;

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see all public documents
CREATE POLICY documents_public_read ON documents
    FOR SELECT
    USING (true);

-- Policy: Users can only insert their own documents
CREATE POLICY documents_insert ON documents
    FOR INSERT
    WITH CHECK (uploaded_by = auth.uid() OR uploaded_by IS NULL);

-- Policy: Users can only see their own cost records
CREATE POLICY cost_records_own ON cost_records
    FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- INITIAL DATA & STATS VIEW
-- ============================================

-- Create a view for system statistics
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

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON entities TO authenticated;
GRANT SELECT ON relationships TO authenticated;
GRANT SELECT ON documents TO authenticated;
GRANT SELECT ON investigation_leads TO authenticated;
GRANT SELECT ON system_stats TO authenticated;

-- Grant insert/update for contributions
GRANT INSERT, UPDATE ON entities TO authenticated;
GRANT INSERT, UPDATE ON relationships TO authenticated;
GRANT INSERT ON documents TO authenticated;
GRANT INSERT, UPDATE ON processing_queue TO authenticated;
