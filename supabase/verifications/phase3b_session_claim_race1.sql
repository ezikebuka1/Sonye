-- ================================================================
-- Phase 3B Claim Race Session 1 (sub_A — the expected winner)
-- Proof 15: concurrent claim_token race
--
-- Start BEFORE Session 2. Session 2 should start ~1 second later.
-- This session calls signup_claim (which UPDATEs and locks the row),
-- then holds the transaction open via pg_sleep(5) so Session 2
-- starts while the lock is held.
-- ================================================================

\timing on
\set ON_ERROR_ROLLBACK on

\echo 'CLAIM RACE SESSION 1 (sub_A): start'
\echo 'Timestamp:'
SELECT now();

\echo 'Session 1: calling signup_claim with sub_A (66666666-...) — will hold txn lock 5s:'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object(
        'sub',   '66666666-6666-6666-6666-666666666666',
        'phone', '+15555550055',
        'role',  'authenticated'
    )::text, true);

SELECT public.signup_claim(
    '+15555550055',
    '66666666-6666-6666-6666-666666666666'::uuid,
    NULL, NULL, NULL, NULL,
    '55555555-5555-5555-5555-555555555555'::uuid,
    NULL, NULL
)::text AS session1_result;

\echo 'Holding txn lock for 5s via pg_sleep (Session 2 should start now)...'
SELECT pg_sleep(5);

\echo 'pg_sleep done, committing:'
COMMIT;

\echo 'Timestamp after commit:'
SELECT now();
\echo 'CLAIM RACE SESSION 1 COMPLETE'
