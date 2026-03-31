-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT C5: RPC Function Access Control
-- Problem: SECURITY DEFINER functions callable by anon/authenticated roles
--          bypassing RLS when called directly with Supabase anon key
-- Fix: REVOKE EXECUTE from anon/authenticated on all sensitive functions
--       Only service_role (API routes) can call them
--
-- SAFE EXECUTION: Each REVOKE is wrapped in a DO block so if one fails
-- (e.g., function doesn't exist), the rest continue executing.
-- ═══════════════════════════════════════════════════════

-- ╔══════════════════════════════════════╗
-- ║  Sprint 13: Collective DMS RPCs     ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_user_collective_dms(TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_user_collective_dms not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_user_held_shards(TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_user_held_shards not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_chain_length(TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_chain_length not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_expired_collective_dms() FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_expired_collective_dms not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION approve_guarantor(UUID, TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'approve_guarantor not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION vote_on_alert(UUID, TEXT, TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'vote_on_alert not found, skipping'; END $$;

-- ╔══════════════════════════════════════╗
-- ║  Sprint 5: Node Query Stats RPCs    ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION upsert_node_query_stat(UUID, TEXT, TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'upsert_node_query_stat not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_node_stat(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_node_stat not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_node_name(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_node_name not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_node_query_stats() FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_node_query_stats not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_gap_nodes(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_gap_nodes not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_node_connection_counts(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_node_connection_counts not found, skipping'; END $$;

-- ╔══════════════════════════════════════╗
-- ║  Sprint 6A: Badge & Reputation RPCs ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_user_badge(TEXT, UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_user_badge not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION record_reputation(TEXT, TEXT, INT, TEXT, TEXT, TEXT, UUID, INT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'record_reputation not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION submit_staked_evidence(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, INT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'submit_staked_evidence not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION resolve_evidence(UUID, TEXT, TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'resolve_evidence not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION nominate_for_community(TEXT, TEXT, UUID, TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'nominate_for_community not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION check_and_promote_badge(TEXT, UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'check_and_promote_badge not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_reputation_leaderboard(UUID, TEXT, INT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_reputation_leaderboard not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_reputation_history(TEXT, INT, INT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_reputation_history not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_or_init_user_badge(TEXT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_or_init_user_badge not found, skipping'; END $$;

-- ╔══════════════════════════════════════╗
-- ║  Sprint 17: Quarantine RPCs         ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION process_quarantine_reviews(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'process_quarantine_reviews not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION promote_quarantine_to_network(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'promote_quarantine_to_network not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_quarantine_stats(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_quarantine_stats not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_pending_quarantine_for_reviewer(UUID, INTEGER, INTEGER) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_pending_quarantine_for_reviewer not found, skipping'; END $$;
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION create_quarantine_item(UUID, UUID, TEXT, JSONB, TEXT, TEXT, TEXT, DECIMAL) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'create_quarantine_item not found, skipping'; END $$;

-- ╔══════════════════════════════════════╗
-- ║  Sprint S2: Atomic Voting RPC       ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION submit_quarantine_review(UUID, TEXT, TEXT, TEXT, INT) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'submit_quarantine_review not found, skipping'; END $$;

-- ╔══════════════════════════════════════╗
-- ║  Sprint 16: Document Stats RPC      ║
-- ╚══════════════════════════════════════╝
DO $$ BEGIN REVOKE EXECUTE ON FUNCTION get_document_stats(UUID) FROM anon, authenticated; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'get_document_stats not found, skipping'; END $$;

-- ═══════════════════════════════════════════════════════
-- VERIFICATION: Run this after the above to check results.
-- Should return EMPTY or only non-sensitive utility functions.
-- ═══════════════════════════════════════════════════════
-- SELECT routine_name, grantee
-- FROM information_schema.routine_privileges
-- WHERE grantee IN ('anon', 'authenticated')
--   AND routine_schema = 'public'
--   AND privilege_type = 'EXECUTE'
-- ORDER BY routine_name;
