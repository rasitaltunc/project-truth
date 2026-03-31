# ENTITY RESOLUTION IMPLEMENTATION COOKBOOK
## Practical Code & Architecture Guide for Project Truth

**Target Audience:** Engineering team implementing Phase 1-2 entity resolution
**Status:** Implementation-ready (copy-paste code available)
**Scope:** 159→10,000 entities with zero false merges

---

## PART 1: POSTGRESQL SCHEMA & SETUP

### 1.1 Create Extensions

```sql
-- Run once as superuser
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- trigram fuzzy matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch; -- Levenshtein, Jaro-Winkler
CREATE EXTENSION IF NOT EXISTS unaccent; -- Remove accents (é→e)
CREATE EXTENSION IF NOT EXISTS uuid-ossp; -- UUID generation

-- Verify installation
SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'fuzzystrmatch', 'unaccent');
```

### 1.2 Core Knowledge Graph Tables

```sql
-- Main nodes table (entities)
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,

  -- Core identification
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL, -- lowercase, trimmed, normalized
  normalized_name TEXT NOT NULL, -- unaccented, no special chars
  fingerprint TEXT NOT NULL UNIQUE, -- SHA256(canonical_name)
  node_type VARCHAR(20) NOT NULL, -- person, organization, location, event

  -- Entity metadata
  birth_date DATE,
  death_date DATE,
  organization_type VARCHAR(50), -- company, government, nonprofit
  jurisdiction VARCHAR(10), -- US-NY, US-FL, TR, etc
  risk_level INT DEFAULT 0,
  tier INT DEFAULT 3,

  -- Investigation tracking
  verification_level VARCHAR(30) DEFAULT 'unverified',
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  properties JSONB DEFAULT '{}',

  -- Document linking
  source_documents UUID[] DEFAULT ARRAY[]::UUID[],
  document_count INT DEFAULT 0,
  mention_count INT DEFAULT 0,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_type CHECK (node_type IN ('person', 'organization', 'location', 'event')),
  CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0.0 AND 1.0)
);

-- Indexes
CREATE INDEX idx_nodes_network ON knowledge_graph_nodes(network_id);
CREATE INDEX idx_nodes_canonical ON knowledge_graph_nodes(canonical_name);
CREATE INDEX idx_nodes_fingerprint ON knowledge_graph_nodes(fingerprint);
CREATE INDEX idx_nodes_type ON knowledge_graph_nodes(node_type);
CREATE INDEX idx_nodes_trgm ON knowledge_graph_nodes USING GIN(normalized_name gin_trgm_ops);
CREATE INDEX idx_nodes_verification ON knowledge_graph_nodes(verification_level);

-- Edges/relationships table
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,

  relationship_type VARCHAR(50) NOT NULL, -- employed_by, traveled_with, etc
  is_directional BOOLEAN DEFAULT TRUE,

  -- Epistemological layer
  evidence_type VARCHAR(50), -- court_record, leaked_document, etc
  confidence_level FLOAT DEFAULT 0.5 CHECK (confidence_level BETWEEN 0.0 AND 1.0),
  source_hierarchy VARCHAR(20) DEFAULT 'tertiary', -- primary, secondary, tertiary
  evidence_count INT DEFAULT 0,

  -- Temporal validity
  start_date DATE,
  end_date DATE,

  -- Metadata
  properties JSONB DEFAULT '{}',
  source_documents UUID[] DEFAULT ARRAY[]::UUID[],

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT no_self_loop CHECK (source_id != target_id),
  CONSTRAINT valid_confidence CHECK (confidence_level BETWEEN 0.0 AND 1.0)
);

CREATE INDEX idx_edges_source ON knowledge_graph_edges(source_id);
CREATE INDEX idx_edges_target ON knowledge_graph_edges(target_id);
CREATE INDEX idx_edges_type ON knowledge_graph_edges(relationship_type);

-- Entity merge tracking table
CREATE TABLE IF NOT EXISTS entity_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,

  merge_type VARCHAR(20) NOT NULL, -- automatic, human_approved, disputed
  algorithm_used VARCHAR(50), -- jaro_winkler, levenshtein, semantic, manual
  confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0.0 AND 1.0),

  merged_at TIMESTAMP DEFAULT NOW(),
  merged_by UUID REFERENCES auth.users(id),
  properties_before JSONB, -- for potential unmerge

  CONSTRAINT different_nodes CHECK (source_node_id != target_node_id)
);

CREATE INDEX idx_merges_source ON entity_merges(source_node_id);
CREATE INDEX idx_merges_target ON entity_merges(target_node_id);
CREATE INDEX idx_merges_type ON entity_merges(merge_type);

-- Candidate pairs for matching
CREATE TABLE IF NOT EXISTS entity_match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id),
  entity_a_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
  entity_b_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,

  -- Scoring
  jaro_winkler_score FLOAT,
  levenshtein_score FLOAT,
  trigram_score FLOAT,
  combined_score FLOAT,

  -- Decision tracking
  merge_decision VARCHAR(30), -- pending, approved, rejected, disputed
  confidence_for_merge FLOAT CHECK (confidence_for_merge BETWEEN 0.0 AND 1.0),
  reason TEXT,

  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT different_nodes CHECK (entity_a_id != entity_b_id),
  CONSTRAINT ordered_ids CHECK (entity_a_id < entity_b_id) -- prevent duplicates
);

CREATE INDEX idx_candidates_network ON entity_match_candidates(network_id);
CREATE INDEX idx_candidates_decision ON entity_match_candidates(merge_decision);
CREATE INDEX idx_candidates_combined_score ON entity_match_candidates(combined_score DESC);

-- Provenance tracking
CREATE TABLE IF NOT EXISTS knowledge_graph_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
  edge_id UUID REFERENCES knowledge_graph_edges(id) ON DELETE CASCADE,

  action VARCHAR(30) NOT NULL, -- created, verified, merged, rejected, disputed
  source_document_id UUID,
  source_page INT,
  source_snippet TEXT,

  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  confidence_before FLOAT,
  confidence_after FLOAT,
  reason TEXT,

  CONSTRAINT one_target CHECK (
    (node_id IS NOT NULL AND edge_id IS NULL) OR
    (node_id IS NULL AND edge_id IS NOT NULL)
  )
);

CREATE INDEX idx_provenance_node ON knowledge_graph_provenance(node_id);
CREATE INDEX idx_provenance_action ON knowledge_graph_provenance(action);
```

### 1.3 Normalization Functions

```sql
-- Function to normalize names for matching
CREATE OR REPLACE FUNCTION normalize_entity_name(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- Remove accents
  normalized := unaccent(input_text);

  -- Lowercase
  normalized := LOWER(normalized);

  -- Remove special characters except spaces
  normalized := regexp_replace(normalized, '[^a-z0-9\s]', '', 'g');

  -- Remove multiple spaces
  normalized := regexp_replace(normalized, '\s+', ' ', 'g');

  -- Trim whitespace
  normalized := TRIM(normalized);

  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate fingerprint (unique identifier)
CREATE OR REPLACE FUNCTION generate_entity_fingerprint(
  name TEXT,
  entity_type VARCHAR(20)
)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      LOWER(TRIM(name)) || '::' || entity_type,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate Jaro-Winkler with threshold
CREATE OR REPLACE FUNCTION jaro_winkler_match(
  text1 TEXT,
  text2 TEXT,
  threshold FLOAT DEFAULT 0.85
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN jarowinkler(text1, text2) >= threshold;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate Levenshtein similarity (0-1 scale)
CREATE OR REPLACE FUNCTION levenshtein_similarity(
  text1 TEXT,
  text2 TEXT
)
RETURNS FLOAT AS $$
DECLARE
  max_len INT;
  dist INT;
BEGIN
  max_len := GREATEST(LENGTH(text1), LENGTH(text2));
  IF max_len = 0 THEN
    RETURN 1.0;
  END IF;

  dist := levenshtein(text1, text2);
  RETURN 1.0 - (dist::FLOAT / max_len);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update normalized_name
CREATE OR REPLACE FUNCTION update_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_entity_name(NEW.name);
  NEW.fingerprint := generate_entity_fingerprint(NEW.name, NEW.node_type);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_normalized_name
BEFORE INSERT OR UPDATE ON knowledge_graph_nodes
FOR EACH ROW
EXECUTE FUNCTION update_normalized_name();
```

---

## PART 2: ENTITY MATCHING PIPELINE

### 2.1 Generate Blocking Candidates

```sql
-- Create materialized view of candidate pairs (blocking stage)
CREATE MATERIALIZED VIEW entity_match_blocking AS
SELECT DISTINCT
  n1.id AS entity_a_id,
  n2.id AS entity_b_id,
  n1.network_id,
  n1.name AS name_a,
  n2.name AS name_b,
  n1.node_type
FROM knowledge_graph_nodes n1
INNER JOIN knowledge_graph_nodes n2 ON n1.network_id = n2.network_id
  AND n1.node_type = n2.node_type
  AND n1.id < n2.id
WHERE
  -- Type-based blocking
  n1.node_type = n2.node_type
  -- Signature blocking: first 3 chars match
  AND LEFT(n1.normalized_name, 3) = LEFT(n2.normalized_name, 3)
  -- Optional: year blocking for persons (birth_year ± 2)
  AND (
    n1.node_type != 'person'
    OR ABS(EXTRACT(YEAR FROM n1.birth_date)::INT - EXTRACT(YEAR FROM n2.birth_date)::INT) <= 2
  );

CREATE INDEX idx_blocking_network ON entity_match_blocking(network_id);
```

### 2.2 Score Candidates Batch Processing

```sql
-- Populate match candidates with scores
CREATE OR REPLACE FUNCTION score_entity_candidates(
  p_network_id UUID,
  p_batch_size INT DEFAULT 1000
)
RETURNS TABLE (
  candidates_scored INT,
  high_confidence_matches INT,
  review_candidates INT
) AS $$
DECLARE
  v_scored INT := 0;
  v_high_conf INT := 0;
  v_review INT := 0;
BEGIN
  -- Clear existing candidates for fresh run
  DELETE FROM entity_match_candidates
  WHERE network_id = p_network_id
    AND merge_decision IS NULL
    AND created_at < NOW() - INTERVAL '24 hours';

  -- Insert new candidates with scores
  INSERT INTO entity_match_candidates (
    network_id, entity_a_id, entity_b_id,
    jaro_winkler_score, levenshtein_score, trigram_score,
    merge_decision
  )
  SELECT
    b.network_id,
    b.entity_a_id,
    b.entity_b_id,
    jarowinkler(n1.normalized_name, n2.normalized_name)::FLOAT,
    levenshtein_similarity(n1.normalized_name, n2.normalized_name),
    similarity(n1.normalized_name, n2.normalized_name)::FLOAT,
    'pending'
  FROM entity_match_blocking b
  JOIN knowledge_graph_nodes n1 ON b.entity_a_id = n1.id
  JOIN knowledge_graph_nodes n2 ON b.entity_b_id = n2.id
  WHERE b.network_id = p_network_id
    AND NOT EXISTS (
      SELECT 1 FROM entity_match_candidates
      WHERE entity_a_id = b.entity_a_id
        AND entity_b_id = b.entity_b_id
    )
  LIMIT p_batch_size;

  GET DIAGNOSTICS v_scored = ROW_COUNT;

  -- Calculate combined score and make recommendations
  UPDATE entity_match_candidates
  SET
    combined_score = GREATEST(jaro_winkler_score, levenshtein_score),
    confidence_for_merge = CASE
      WHEN jaro_winkler_score >= 0.95 AND levenshtein_score >= 0.90 THEN 0.98
      WHEN jaro_winkler_score >= 0.90 AND levenshtein_score >= 0.85 THEN 0.85
      WHEN jaro_winkler_score >= 0.85 AND levenshtein_score >= 0.80 THEN 0.70
      ELSE 0.50
    END
  WHERE network_id = p_network_id
    AND merge_decision = 'pending'
    AND combined_score IS NULL;

  -- Count high confidence matches
  SELECT COUNT(*) INTO v_high_conf
  FROM entity_match_candidates
  WHERE network_id = p_network_id
    AND merge_decision = 'pending'
    AND combined_score >= 0.90;

  -- Count review candidates
  SELECT COUNT(*) INTO v_review
  FROM entity_match_candidates
  WHERE network_id = p_network_id
    AND merge_decision = 'pending'
    AND combined_score BETWEEN 0.75 AND 0.90;

  RETURN QUERY SELECT v_scored, v_high_conf, v_review;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM score_entity_candidates('network-uuid'::UUID, 1000);
```

### 2.3 Automatic Merge for High-Confidence Matches

```sql
-- Automatically merge entities with very high confidence
CREATE OR REPLACE FUNCTION auto_merge_entities(
  p_network_id UUID,
  p_jw_threshold FLOAT DEFAULT 0.95,
  p_lev_threshold FLOAT DEFAULT 0.90
)
RETURNS TABLE (
  merged_count INT,
  created_edges INT
) AS $$
DECLARE
  v_merge_count INT := 0;
  v_edge_count INT := 0;
  v_target_id UUID;
  v_source_id UUID;
  v_record RECORD;
BEGIN
  -- Find candidates meeting automatic merge criteria
  FOR v_record IN
    SELECT entity_a_id, entity_b_id, combined_score
    FROM entity_match_candidates
    WHERE network_id = p_network_id
      AND merge_decision = 'pending'
      AND jaro_winkler_score >= p_jw_threshold
      AND levenshtein_score >= p_lev_threshold
      AND combined_score >= 0.95
  LOOP
    -- Keep larger ID as primary (more recent)
    v_source_id := LEAST(v_record.entity_a_id, v_record.entity_b_id);
    v_target_id := GREATEST(v_record.entity_a_id, v_record.entity_b_id);

    -- Move all edges from source to target
    UPDATE knowledge_graph_edges
    SET source_id = v_target_id
    WHERE source_id = v_source_id;

    UPDATE knowledge_graph_edges
    SET target_id = v_target_id
    WHERE target_id = v_source_id;

    -- Merge properties
    UPDATE knowledge_graph_nodes
    SET
      source_documents = array_cat(
        source_documents,
        (SELECT source_documents FROM knowledge_graph_nodes WHERE id = v_source_id)
      ),
      mention_count = mention_count + (
        SELECT mention_count FROM knowledge_graph_nodes WHERE id = v_source_id
      ),
      document_count = array_length(source_documents, 1),
      confidence_score = GREATEST(confidence_score, (
        SELECT confidence_score FROM knowledge_graph_nodes WHERE id = v_source_id
      ))
    WHERE id = v_target_id;

    -- Record merge
    INSERT INTO entity_merges (
      source_node_id, target_node_id,
      merge_type, algorithm_used, confidence_score
    ) VALUES (
      v_source_id, v_target_id,
      'automatic', 'jaro_winkler_levenshtein', v_record.combined_score
    );

    -- Log in provenance
    INSERT INTO knowledge_graph_provenance (
      node_id, action, reason, confidence_before, confidence_after
    ) VALUES (
      v_target_id,
      'merged',
      'Automatic merge: JW=' || v_record.combined_score::TEXT,
      (SELECT confidence_score FROM knowledge_graph_nodes WHERE id = v_source_id),
      (SELECT confidence_score FROM knowledge_graph_nodes WHERE id = v_target_id)
    );

    -- Delete source node (already moved edges)
    DELETE FROM knowledge_graph_nodes WHERE id = v_source_id;

    v_merge_count := v_merge_count + 1;

    -- Mark candidate as merged
    UPDATE entity_match_candidates
    SET merge_decision = 'approved'
    WHERE entity_a_id = v_source_id AND entity_b_id = v_target_id;
  END LOOP;

  RETURN QUERY SELECT v_merge_count, v_edge_count;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM auto_merge_entities('network-uuid'::UUID);
```

### 2.4 Batch Processing Orchestration

```sql
-- Master orchestration function (run daily)
CREATE OR REPLACE FUNCTION run_entity_resolution_daily(p_network_id UUID)
RETURNS TABLE (
  phase VARCHAR(50),
  records_processed INT,
  high_confidence INT,
  review_needed INT,
  automatic_merges INT
) AS $$
DECLARE
  v_scored INT;
  v_high_conf INT;
  v_review INT;
  v_merged INT;
  v_edges INT;
BEGIN
  -- Phase 1: Generate blocking candidates
  REFRESH MATERIALIZED VIEW CONCURRENTLY entity_match_blocking;
  RETURN QUERY SELECT 'Phase 1: Blocking'::VARCHAR, -1, -1, -1, -1;

  -- Phase 2: Score candidates (batch 1000)
  SELECT candidates_scored, high_confidence_matches, review_candidates
  INTO v_scored, v_high_conf, v_review
  FROM score_entity_candidates(p_network_id, 1000);

  RETURN QUERY SELECT 'Phase 2: Scoring'::VARCHAR, v_scored, v_high_conf, v_review, 0;

  -- Phase 3: Automatic merge (high confidence only)
  SELECT merged_count, created_edges
  INTO v_merged, v_edges
  FROM auto_merge_entities(p_network_id);

  RETURN QUERY SELECT 'Phase 3: Auto-merge'::VARCHAR, v_merged, 0, 0, v_merged;
END;
$$ LANGUAGE plpgsql;
```

---

## PART 3: HUMAN REVIEW INTERFACE PREPARATION

### 3.1 API Endpoint Data Preparation (TypeScript/Node.js)

```typescript
// types/entity-review.ts
export interface EntityNode {
  id: string;
  name: string;
  canonical_name: string;
  node_type: 'person' | 'organization' | 'location' | 'event';
  birth_date?: Date;
  death_date?: Date;
  organization_type?: string;
  confidence_score: number;
  source_documents: string[];
  properties: Record<string, any>;
}

export interface EntityMatchCandidate {
  id: string;
  entity_a: EntityNode;
  entity_b: EntityNode;
  jaro_winkler_score: number;
  levenshtein_score: number;
  trigram_score: number;
  combined_score: number;
  confidence_for_merge: number;
  suggested_action: 'auto_merge' | 'review' | 'skip';
}

export interface ReviewDecision {
  candidate_id: string;
  decision: 'approved' | 'rejected' | 'disputed';
  reviewer_notes?: string;
  confidence_override?: number;
  reviewed_by: string;
  reviewed_at: Date;
}
```

```typescript
// api/entity-review.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function getEntityMatchCandidates(
  networkId: string,
  limit: number = 100,
  filterByScore: 'high' | 'medium' | 'all' = 'medium'
) {
  let query = supabase
    .from('entity_match_candidates')
    .select(`
      id, entity_a_id, entity_b_id,
      jaro_winkler_score, levenshtein_score, trigram_score,
      combined_score, confidence_for_merge,
      entity_a:knowledge_graph_nodes!entity_a_id(*),
      entity_b:knowledge_graph_nodes!entity_b_id(*),
      reviewed_by, reviewed_at
    `)
    .eq('network_id', networkId)
    .eq('merge_decision', 'pending')
    .limit(limit);

  if (filterByScore === 'high') {
    query = query.gte('combined_score', 0.90);
  } else if (filterByScore === 'medium') {
    query = query.gte('combined_score', 0.75)
              .lt('combined_score', 0.90);
  }

  const { data, error } = await query.order('combined_score', { ascending: false });

  if (error) throw error;

  return data as EntityMatchCandidate[];
}

export async function submitReviewDecision(
  candidateId: string,
  decision: ReviewDecision
) {
  const { data, error } = await supabase
    .from('entity_match_candidates')
    .update({
      merge_decision: decision.decision,
      reason: decision.reviewer_notes,
      reviewed_by: decision.reviewed_by,
      reviewed_at: decision.reviewed_at,
      confidence_for_merge: decision.confidence_override || null
    })
    .eq('id', candidateId)
    .select();

  if (error) throw error;

  // If approved, trigger merge
  if (decision.decision === 'approved') {
    await triggerEntityMerge(candidateId);
  }

  return data[0];
}

async function triggerEntityMerge(candidateId: string) {
  const { data: candidate } = await supabase
    .from('entity_match_candidates')
    .select('entity_a_id, entity_b_id')
    .eq('id', candidateId)
    .single();

  if (!candidate) return;

  // Call database function to perform merge
  const { error } = await supabase.rpc('merge_entities_manual', {
    entity_a_id: candidate.entity_a_id,
    entity_b_id: candidate.entity_b_id
  });

  if (error) throw error;
}
```

### 3.2 React Component for Review UI

```typescript
// components/EntityMergeReview.tsx
import React, { useState, useEffect } from 'react';
import {
  EntityMatchCandidate,
  ReviewDecision
} from '@/types/entity-review';

export interface EntityMergeReviewProps {
  networkId: string;
  onMergeComplete?: () => void;
}

export const EntityMergeReview: React.FC<EntityMergeReviewProps> = ({
  networkId,
  onMergeComplete
}) => {
  const [candidates, setCandidates] = useState<EntityMatchCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    reviewed: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadCandidates();
  }, [networkId]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await getEntityMatchCandidates(
        networkId,
        100,
        'medium'
      );
      setCandidates(data);
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: ReviewDecision) => {
    try {
      await submitReviewDecision(candidates[currentIndex].id, decision);

      // Update stats
      setStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        [decision.decision]: (prev[decision.decision] || 0) + 1
      }));

      // Move to next
      if (currentIndex < candidates.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Load more
        loadCandidates();
      }
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  if (loading || candidates.length === 0) {
    return <div>Loading candidates...</div>;
  }

  const current = candidates[currentIndex];
  const matchScore = current.combined_score * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Entity Merge Review</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-lg font-semibold">{stats.reviewed}</div>
          <div className="text-gray-600">Reviewed</div>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <div className="text-lg font-semibold">{stats.approved}</div>
          <div className="text-gray-600">Approved</div>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <div className="text-lg font-semibold">{stats.rejected}</div>
          <div className="text-gray-600">Rejected</div>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Entity A */}
          <div className="border-r pr-6">
            <h3 className="text-lg font-bold mb-4">
              {current.entity_a.name}
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-600">Type</dt>
                <dd>{current.entity_a.node_type}</dd>
              </div>
              {current.entity_a.birth_date && (
                <div>
                  <dt className="font-semibold text-gray-600">Born</dt>
                  <dd>{new Date(current.entity_a.birth_date).toLocaleDateString()}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-gray-600">Confidence</dt>
                <dd>{(current.entity_a.confidence_score * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-600">Sources</dt>
                <dd>{current.entity_a.source_documents.length} documents</dd>
              </div>
            </dl>
          </div>

          {/* Entity B */}
          <div className="pl-6">
            <h3 className="text-lg font-bold mb-4">
              {current.entity_b.name}
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-600">Type</dt>
                <dd>{current.entity_b.node_type}</dd>
              </div>
              {current.entity_b.birth_date && (
                <div>
                  <dt className="font-semibold text-gray-600">Born</dt>
                  <dd>{new Date(current.entity_b.birth_date).toLocaleDateString()}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-gray-600">Confidence</dt>
                <dd>{(current.entity_b.confidence_score * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-600">Sources</dt>
                <dd>{current.entity_b.source_documents.length} documents</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Match Scores */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold mb-3">Match Scores</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Jaro-Winkler</span>
            <span className="font-mono">{(current.jaro_winkler_score * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Levenshtein</span>
            <span className="font-mono">{(current.levenshtein_score * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Combined Match</span>
            <span className="font-mono text-lg">{matchScore.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecision({
            candidate_id: current.id,
            decision: 'approved',
            reviewed_by: 'current-user-id' // Replace with actual user
          })}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          ✓ Merge ({matchScore.toFixed(0)}%)
        </button>
        <button
          onClick={() => handleDecision({
            candidate_id: current.id,
            decision: 'rejected',
            reviewed_by: 'current-user-id'
          })}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          ✗ Don't Merge
        </button>
        <button
          onClick={() => handleDecision({
            candidate_id: current.id,
            decision: 'disputed',
            reviewed_by: 'current-user-id'
          })}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
        >
          ? Unclear
        </button>
      </div>

      {/* Progress */}
      <div className="mt-6 text-center text-gray-600">
        Reviewing {currentIndex + 1} of {candidates.length} candidates
      </div>
    </div>
  );
};
```

---

## PART 4: MONITORING & VALIDATION

### 4.1 Entity Resolution Metrics

```sql
-- View: Entity resolution statistics
CREATE OR REPLACE VIEW entity_resolution_stats AS
SELECT
  n.network_id,
  COUNT(DISTINCT n.id) AS total_entities,
  COUNT(DISTINCT CASE WHEN n.node_type = 'person' THEN n.id END) AS person_count,
  COUNT(DISTINCT CASE WHEN n.node_type = 'organization' THEN n.id END) AS org_count,
  COUNT(DISTINCT CASE WHEN n.node_type = 'location' THEN n.id END) AS location_count,
  COUNT(DISTINCT em.id) AS total_merges,
  COUNT(DISTINCT CASE WHEN em.merge_type = 'automatic' THEN em.id END) AS auto_merges,
  COUNT(DISTINCT CASE WHEN em.merge_type = 'human_approved' THEN em.id END) AS human_merges,
  COUNT(DISTINCT emc.id) AS pending_candidates,
  ROUND(AVG(emc.combined_score)::NUMERIC, 2) AS avg_candidate_score
FROM knowledge_graph_nodes n
LEFT JOIN entity_merges em ON em.target_node_id = n.id
LEFT JOIN entity_match_candidates emc ON emc.network_id = n.network_id
GROUP BY n.network_id;

-- Monthly validation report
CREATE OR REPLACE FUNCTION generate_resolution_report(p_network_id UUID)
RETURNS TABLE (
  metric VARCHAR(100),
  value VARCHAR(200)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total Entities'::VARCHAR,
    (SELECT COUNT(*)::TEXT FROM knowledge_graph_nodes WHERE network_id = p_network_id)
  UNION ALL
  SELECT
    'Total Relationships',
    (SELECT COUNT(*)::TEXT FROM knowledge_graph_edges WHERE source_id IN (
      SELECT id FROM knowledge_graph_nodes WHERE network_id = p_network_id
    ))
  UNION ALL
  SELECT
    'Merges This Month',
    (SELECT COUNT(*)::TEXT FROM entity_merges
     WHERE merged_at >= NOW() - INTERVAL '30 days'
       AND target_node_id IN (SELECT id FROM knowledge_graph_nodes WHERE network_id = p_network_id))
  UNION ALL
  SELECT
    'Avg Merge Confidence',
    (SELECT ROUND(AVG(confidence_score)::NUMERIC, 2)::TEXT FROM entity_merges
     WHERE merged_at >= NOW() - INTERVAL '30 days'
       AND target_node_id IN (SELECT id FROM knowledge_graph_nodes WHERE network_id = p_network_id))
  UNION ALL
  SELECT
    'Pending Review',
    (SELECT COUNT(*)::TEXT FROM entity_match_candidates
     WHERE network_id = p_network_id AND merge_decision = 'pending');
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Precision/Recall Testing

```sql
-- Manual ground truth validation (sample 50 merges monthly)
CREATE TABLE entity_resolution_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_id UUID NOT NULL REFERENCES entity_merges(id),
  validator_id UUID NOT NULL REFERENCES auth.users(id),
  validation_result VARCHAR(20) NOT NULL, -- correct, incorrect, uncertain
  validated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Calculate monthly precision
CREATE OR REPLACE FUNCTION calculate_monthly_precision(p_network_id UUID)
RETURNS TABLE (
  precision FLOAT,
  samples_tested INT,
  false_positives INT,
  true_positives INT
) AS $$
DECLARE
  v_total INT;
  v_correct INT;
  v_incorrect INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE validation_result = 'correct'),
    COUNT(*) FILTER (WHERE validation_result = 'incorrect')
  INTO v_total, v_correct, v_incorrect
  FROM entity_resolution_validation
  WHERE validated_at >= NOW() - INTERVAL '30 days'
    AND merge_id IN (
      SELECT id FROM entity_merges
      WHERE target_node_id IN (SELECT id FROM knowledge_graph_nodes WHERE network_id = p_network_id)
    );

  RETURN QUERY SELECT
    (v_correct::FLOAT / v_total)::FLOAT,
    v_total,
    v_incorrect,
    v_correct;
END;
$$ LANGUAGE plpgsql;
```

---

## PART 5: DEPLOYMENT CHECKLIST

```markdown
# Entity Resolution Phase 1 Deployment Checklist

## Pre-Deployment
- [ ] Run all unit tests for SQL functions
- [ ] Test blocking on sample dataset (159 entities)
- [ ] Verify Jaro-Winkler threshold values by entity type
- [ ] Prepare ground truth validation set (200 merges)
- [ ] Train reviewers on UI and merge criteria

## Database Migration
- [ ] Create all tables (nodes, edges, merges, candidates, provenance)
- [ ] Create all indexes
- [ ] Create normalization functions
- [ ] Create match scoring functions
- [ ] Create merge orchestration functions
- [ ] Refresh blocking materialized view

## Backend Setup
- [ ] Implement API endpoints for candidate fetching
- [ ] Implement API endpoints for decision submission
- [ ] Set up batch processing cron (run daily at 2 AM)
- [ ] Configure Supabase RLS policies for review access
- [ ] Test end-to-end merge flow

## Frontend Setup
- [ ] Build EntityMergeReview component
- [ ] Connect to backend API
- [ ] Test UI with sample candidates
- [ ] Style for accessibility (contrast, keyboard nav)
- [ ] Add keyboard shortcuts (↓ next, A approve, R reject)

## Validation
- [ ] Generate initial candidates (target: 500-1000)
- [ ] Auto-merge high-confidence pairs (JW≥0.95)
- [ ] Review 50 medium-confidence pairs
- [ ] Calculate precision on reviewed set
- [ ] Adjust thresholds if precision <95%

## Monitoring
- [ ] Set up daily metrics dashboard
- [ ] Configure alerts for >10% false merges
- [ ] Schedule weekly manual validation (50 samples)
- [ ] Plan monthly report generation

## Go Live
- [ ] Get sign-off from data quality team
- [ ] Brief all users on new features
- [ ] Monitor first week closely
- [ ] Collect user feedback
- [ ] Plan Phase 2 (semantic enhancements)
```

---

**Document Version:** 1.0
**Status:** Implementation-ready
**Last Updated:** March 22, 2026
