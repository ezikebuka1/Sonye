-- ================================================================
-- Phase 3B Session 2 (Henry, the racer) -- Proof 6
-- ================================================================

\timing on
\set ON_ERROR_ROLLBACK on

\echo 'SESSION 2 (Henry, racer): start'
\echo 'Timestamp:'
SELECT now();

-- Load slot and auth ids from state table
SELECT value FROM public.phase3b_test_state WHERE key = 's_race_id'
\gset
SELECT value AS henry_auth FROM public.phase3b_test_state WHERE key = 'henry_auth_id'
\gset

\echo 'Henry racing for last seat -- should BLOCK on Grace lock, then get waitlisted'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'henry_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
\echo 'Henry calls join_slot (EXPECTED: blocks ~4-5s, returns waitlisted):'
SELECT * FROM public.join_slot(:'value'::uuid);
COMMIT;
\echo 'Timestamp after commit:'
SELECT now();
\echo 'SESSION 2 COMPLETE'
