-- ============================================
-- TRUTH ENGINE - STEP 2: Indexes
-- Run this AFTER Step 1 completes successfully
-- ============================================

-- ENTITIES indexes
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_normalized_name ON entities(normalized_name);
CREATE INDEX IF NOT EXISTS idx_entities_verification ON entities(verification_status);
CREATE INDEX IF NOT EXISTS idx_entities_confidence ON entities(confidence DESC);

-- Full-text search on entities
CREATE INDEX IF NOT EXISTS idx_entities_fts ON entities USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- RELATIONSHIPS indexes
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_ai ON relationships(ai_generated) WHERE ai_generated = true;

-- DOCUMENTS indexes
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Full-text search on documents
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN (
    to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, ''))
);

-- INVESTIGATION LEADS indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON investigation_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON investigation_leads(priority DESC);
CREATE INDEX IF NOT EXISTS idx_leads_type ON investigation_leads(type);

-- PROCESSING QUEUE indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON processing_queue(priority, created_at);

-- ENTITY CACHE indexes
CREATE INDEX IF NOT EXISTS idx_entity_cache_name ON entity_cache(normalized_name);

-- QUERY CACHE indexes
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);

-- COST RECORDS indexes
CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_operation ON cost_records(operation);
CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_records(user_id);

-- Verify indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
