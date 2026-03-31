-- ============================================
-- TRUTH ENGINE - STEP 1: Core Tables
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- Enable pgvector (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. ENTITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    description TEXT,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    source_count INTEGER DEFAULT 1,
    confidence INTEGER DEFAULT 50,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    verified_by UUID[] DEFAULT '{}',
    dispute_reasons TEXT[] DEFAULT '{}',
    embedding vector(1536),
    extracted_from UUID[] DEFAULT '{}',
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. RELATIONSHIPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    description TEXT,
    start_date DATE,
    end_date DATE,
    ongoing BOOLEAN DEFAULT true,
    evidence_ids UUID[] DEFAULT '{}',
    confidence INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence INTEGER,
    ai_reasoning TEXT,
    UNIQUE(source_entity_id, target_entity_id, type)
);

-- ============================================
-- 3. DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    title VARCHAR(1000) NOT NULL,
    content TEXT,
    original_url TEXT,
    file_path TEXT,
    file_hash VARCHAR(64),
    file_size INTEGER,
    mime_type VARCHAR(100),
    source_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID,
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_level VARCHAR(50) DEFAULT 'none',
    processing_error TEXT,
    embedding vector(1536),
    extracted_entities JSONB DEFAULT '[]',
    extracted_relationships JSONB DEFAULT '[]',
    summary TEXT,
    key_facts TEXT[] DEFAULT '{}',
    source_reliability VARCHAR(50) DEFAULT 'unknown',
    verification_notes TEXT,
    related_document_ids UUID[] DEFAULT '{}',
    mentioned_entity_ids UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. INVESTIGATION LEADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS investigation_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'connection',
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    detailed_analysis TEXT,
    involved_entities UUID[] DEFAULT '{}',
    involved_documents UUID[] DEFAULT '{}',
    suggested_connections JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'new',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by VARCHAR(50) DEFAULT 'nightly_job',
    ai_confidence INTEGER,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. PROCESSING QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_cost DECIMAL(10, 6) DEFAULT 0,
    actual_cost DECIMAL(10, 6)
);

-- ============================================
-- 6. ENTITY CACHE TABLE
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

-- ============================================
-- 7. QUERY CACHE TABLE
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

-- ============================================
-- 8. COST RECORDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation VARCHAR(50) NOT NULL,
    model_used VARCHAR(100),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) NOT NULL,
    user_id UUID,
    document_id UUID,
    job_id UUID
);

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('entities', 'relationships', 'documents', 'investigation_leads', 'processing_queue', 'entity_cache', 'query_cache', 'cost_records');
