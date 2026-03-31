-- ============================================
-- PROJECT TRUTH: SCHEMA CACHE FIX
-- Supabase SQL Editor'da çalıştır
-- ============================================

-- 1. Schema cache'i yenile (PostgREST tabloları görsün)
NOTIFY pgrst, 'reload schema';

-- 2. Tabloların gerçekten var olduğunu doğrula
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('investigations', 'investigation_steps', 'investigation_votes', 'node_query_stats');
