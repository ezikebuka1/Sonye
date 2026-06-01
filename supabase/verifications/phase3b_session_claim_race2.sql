-- ================================================================
-- Phase 3B Claim Race Session 2 (sub_B — the expected loser)
-- Proof 15: concurrent claim_token race
--
-- Start ~1 second AFTER Session 1. This session will BLOCK on
-- Session 1's UPDATE row lock, then find 0 matching rows after
-- Session 1 commits (claim_token is now NULL), and get
-- claim_token_mismatch. With \set ON_ERROR_ROLLBACK on, psql
-- rolls back on the error and continues cleanly.
-- ================================================================

\timing on
\set ON_ERROR_ROLLBACK on

\echo 'CLAIM RACE SESSION 2 (sub_B): start'
\echo 'Timestamp:'
SELECT now();

\echo 'Session 2: calling signup_claim with sub_B (77777777-...) — expected to block then mismatch:'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object(
        'sub',   '77777777-7777-7777-7777-777777777777',
        'phone', '+15555550055',
        'role',  'authenticated'
    )::text, true);

SELECT public.signup_claim(
    '+15555550055',
    '77777777-7777-7777-7777-777777777777'::uuid,
    NULL, NULL, NULL, NULL,
    '55555555-5555-5555-5555-555555555555'::uuid,
    NULL, NULL
)::text AS session2_result;

COMMIT;

\echo 'Timestamp after commit/rollback:'
SELECT now();
\echo 'CLAIM RACE SESSION 2 COMPLETE'
\echo '(EXPECTED outcome: claim_token_mismatch error caught by ON_ERROR_ROLLBACK)'
