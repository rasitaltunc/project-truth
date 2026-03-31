-- ============================================================================
-- SPRINT 6C — TABLO YARATMA (seed verisi hariç)
-- link_evidence_timeline tablosu + indexler + RLS + RPC
-- ============================================================================

-- 1. TABLO
CREATE TABLE IF NOT EXISTS link_evidence_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES evidence_archive(id) ON DELETE SET NULL,
    event_date TIMESTAMPTZ,
    date_precision TEXT DEFAULT 'day' CHECK (date_precision IN ('day', 'month', 'year', 'approximate')),
    direction TEXT DEFAULT 'bidirectional' CHECK (direction IN ('source_to_target', 'target_to_source', 'bidirectional')),
    visual_weight NUMERIC(3,1) DEFAULT 1.0 CHECK (visual_weight BETWEEN 0.1 AND 3.0),
    display_label TEXT NOT NULL,
    display_summary TEXT,
    community_votes INT DEFAULT 0,
    is_keystone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(link_id, evidence_id)
);

-- 2. INDEXLER
CREATE INDEX IF NOT EXISTS idx_let_link ON link_evidence_timeline(link_id);
CREATE INDEX IF NOT EXISTS idx_let_evidence ON link_evidence_timeline(evidence_id);
CREATE INDEX IF NOT EXISTS idx_let_date ON link_evidence_timeline(event_date);
CREATE INDEX IF NOT EXISTS idx_let_keystone ON link_evidence_timeline(is_keystone) WHERE is_keystone = TRUE;
CREATE INDEX IF NOT EXISTS idx_let_link_date ON link_evidence_timeline(link_id, event_date);

-- 3. RLS
ALTER TABLE link_evidence_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "let_public_read" ON link_evidence_timeline;
CREATE POLICY "let_public_read" ON link_evidence_timeline
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "let_authenticated_insert" ON link_evidence_timeline;
CREATE POLICY "let_authenticated_insert" ON link_evidence_timeline
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "let_authenticated_update" ON link_evidence_timeline;
CREATE POLICY "let_authenticated_update" ON link_evidence_timeline
    FOR UPDATE USING (true);

-- 4. RPC FONKSİYONLARI

-- 4.1 Timeline getir (link_id ile)
CREATE OR REPLACE FUNCTION get_link_evidence_timeline(p_link_id UUID)
RETURNS TABLE (
    timeline_id UUID,
    evidence_id UUID,
    event_date TIMESTAMPTZ,
    date_precision TEXT,
    direction TEXT,
    visual_weight NUMERIC,
    display_label TEXT,
    display_summary TEXT,
    community_votes INT,
    is_keystone BOOLEAN,
    evidence_type TEXT,
    evidence_title TEXT,
    source_name TEXT,
    source_url TEXT,
    verification_status TEXT,
    ai_confidence NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        let.id, let.evidence_id, let.event_date, let.date_precision,
        let.direction, let.visual_weight, let.display_label, let.display_summary,
        let.community_votes, let.is_keystone,
        ea.evidence_type, ea.title, ea.source_name, ea.source_url,
        ea.verification_status, ea.ai_confidence
    FROM link_evidence_timeline let
    LEFT JOIN evidence_archive ea ON let.evidence_id = ea.id
    WHERE let.link_id = p_link_id
    ORDER BY let.event_date ASC NULLS LAST;
END;
$$;

-- 4.2 Link ID bul (node isimleriyle)
CREATE OR REPLACE FUNCTION get_link_id_by_nodes(p_source_label TEXT, p_target_label TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_link_id UUID;
BEGIN
    SELECT l.id INTO v_link_id
    FROM links l
    JOIN nodes s ON l.source_id = s.id
    JOIN nodes t ON l.target_id = t.id
    WHERE (s.name = p_source_label AND t.name = p_target_label)
       OR (s.name = p_target_label AND t.name = p_source_label)
    LIMIT 1;
    RETURN v_link_id;
END;
$$;

-- 4.3 Oylama
CREATE OR REPLACE FUNCTION vote_on_timeline_event(p_timeline_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_votes INT;
BEGIN
    UPDATE link_evidence_timeline
    SET community_votes = community_votes + 1,
        is_keystone = CASE WHEN community_votes + 1 >= 5 THEN TRUE ELSE is_keystone END,
        updated_at = NOW()
    WHERE id = p_timeline_id
    RETURNING community_votes INTO v_votes;
    RETURN v_votes;
END;
$$;

-- 4.4 Link evidence count güncelle
CREATE OR REPLACE FUNCTION recalculate_link_evidence_count(p_link_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM link_evidence_timeline WHERE link_id = p_link_id;
    UPDATE links SET evidence_count = v_count WHERE id = p_link_id;
    RETURN v_count;
END;
$$;

-- ============================================================================
-- TAMAMLANDI — Şimdi LINK_EVIDENCE_TIMELINE_SEED.sql çalıştırabilirsin
-- ============================================================================
