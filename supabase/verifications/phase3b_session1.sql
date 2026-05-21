-- ================================================================
-- Phase 3B Session 1 (Grace, the blocker) -- Proof 6
-- ================================================================

\timing on
\set ON_ERROR_ROLLBACK on

\echo 'SESSION 1 (Grace, blocker): start'
\echo 'Timestamp:'
SELECT now();

-- Load slot and auth ids from state table
SELECT value FROM public.phase3b_test_state WHERE key = 's_race_id'
\gset
SELECT value AS grace_auth FROM public.phase3b_test_state WHERE key = 'grace_auth_id'
\gset

\echo 'Grace joining S_race -- will hold lock 5s via pg_sleep'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'grace_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
\echo 'Grace calls join_slot (EXPECTED: joined, then lock held 5s):'
SELECT * FROM public.join_slot(:'value'::uuid);
\echo 'Holding slot lock for 5s via pg_sleep...'
SELECT pg_sleep(5);
\echo 'pg_sleep done, committing:'
COMMIT;
\echo 'Timestamp after commit:'
SELECT now();
\echo 'SESSION 1 COMPLETE'
