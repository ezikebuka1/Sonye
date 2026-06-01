-- ================================================================
-- D2 Verification Proofs: claim_token strict-match + mismatch + race
-- Proofs 13, 14, 15  (per D2 — Authentication & Onboarding Flow)
--
-- LOCAL VERIFICATION ONLY: Do not run against cloud database.
--
-- Run order (Phase 4):
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql  (P6 race)
--   phase3b_proofs.sql
--   phase3b_proofs_d10.sql
--   phase3b_proofs_d11.sql
--   phase3b_setup_claim_race.sql            ← seeds Proof 15 fixture
--   phase3b_session_claim_race1.sql   \     (concurrent)
--   phase3b_session_claim_race2.sql   /
--   phase3b_proofs_d2.sql             ← this file (Proofs 13 + 14 inline;
--                                        Proof 15 post-race assertion)
--
-- Proofs 13 and 14 insert their own fixture users inline.
-- Proof 15 asserts against state left by the two concurrent race sessions
-- that ran before this file. The Proof 15 fixture user was pre-seeded
-- by phase3b_setup_claim_race.sql.
--
-- Three proofs:
--   13: claim success — JWT phone matches seeded row phone, token nullified
--   14: phone mismatch — JWT phone ≠ seeded row phone, claim_token_mismatch raised,
--       row unmutated
--   15: concurrent-claim race — same claim_token, same phone, two sessions;
--       exactly one succeeds, the other gets claim_token_mismatch
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== D2 PROOFS: claim_token strict-match (D2 Flow 3) ==='

-- ---------------------------------------------------------------
-- PROOF 13 — claim success path
-- JWT phone matches the pre-seeded row. Token must be nullified
-- atomically with the auth_user_id bind.
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 13: claim success — JWT phone match, token nullified ==='

\echo 'P13-SETUP: inserting pre-seeded waitlist user (WaitlistAlice):'
INSERT INTO public.users (phone, first_name, last_name, skill_level, claim_token)
VALUES (
    '+15555550013',
    'WaitlistAlice',
    'Test',
    'intermediate',
    '11111111-1111-1111-1111-111111111111'
)
RETURNING id AS p13_user_id
\gset

\echo 'P13-PRE: WaitlistAlice state before claim (EXPECTED: auth_user_id=NULL, claim_token IS NOT NULL):'
SELECT auth_user_id IS NULL AS auth_unbound,
       claim_token   IS NOT NULL AS token_present
FROM   public.users WHERE id = :'p13_user_id'::uuid;

\echo 'P13: calling signup_claim with matching JWT phone (+15555550013):'
\echo 'EXPECTED: returns WaitlistAlice user id'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object(
        'sub',   '22222222-2222-2222-2222-222222222222',
        'phone', '+15555550013',
        'role',  'authenticated'
    )::text, true);
SELECT public.signup_claim(
    '+15555550013',
    '22222222-2222-2222-2222-222222222222'::uuid,
    NULL, NULL, NULL, NULL,
    '11111111-1111-1111-1111-111111111111'::uuid,
    NULL, NULL
) AS p13_returned_id
\gset
COMMIT;

\echo 'P13-CHECK A: returned id matches pre-seeded user id (EXPECTED: id_match=true):'
SELECT :'p13_returned_id'::uuid = :'p13_user_id'::uuid AS id_match;

\echo 'P13-CHECK B: auth_user_id bound + claim_token nullified (EXPECTED: auth_bound=true, token_nullified=true):'
SELECT auth_user_id = '22222222-2222-2222-2222-222222222222'::uuid AS auth_bound,
       claim_token  IS NULL AS token_nullified
FROM   public.users WHERE id = :'p13_user_id'::uuid;

\echo 'PROOF 13 COMPLETE.'
\echo 'EXPECTED: id_match=true, auth_bound=true, token_nullified=true'

-- ---------------------------------------------------------------
-- PROOF 14 — phone mismatch raises claim_token_mismatch
-- JWT phone does NOT match the pre-seeded row phone. Row must be
-- left unmutated; exception message must be claim_token_mismatch.
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 14: phone mismatch — claim_token_mismatch raised, row unmutated ==='

\echo 'P14-SETUP: inserting pre-seeded waitlist user (WaitlistBob, phone +15555550033):'
INSERT INTO public.users (phone, first_name, last_name, skill_level, claim_token)
VALUES (
    '+15555550033',
    'WaitlistBob',
    'Test',
    'intermediate',
    '33333333-3333-3333-3333-333333333333'
)
RETURNING id AS p14_user_id
\gset

\echo 'P14-PRE: WaitlistBob state before attempt (EXPECTED: auth_user_id=NULL, claim_token IS NOT NULL):'
SELECT auth_user_id IS NULL     AS auth_unbound,
       claim_token   IS NOT NULL AS token_present
FROM   public.users WHERE id = :'p14_user_id'::uuid;

\echo 'P14: calling signup_claim with mismatched JWT phone (+15555550044 ≠ row phone +15555550033):'
\echo 'EXPECTED: raises claim_token_mismatch; DO block catches and validates message'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object(
        'sub',   '44444444-4444-4444-4444-444444444444',
        'phone', '+15555550044',
        'role',  'authenticated'
    )::text, true);

DO $$
DECLARE
    v_result uuid;
BEGIN
    v_result := public.signup_claim(
        '+15555550044',
        '44444444-4444-4444-4444-444444444444'::uuid,
        NULL, NULL, NULL, NULL,
        '33333333-3333-3333-3333-333333333333'::uuid,
        NULL, NULL
    );
    -- Reaching here means no exception was raised — test fails.
    RAISE EXCEPTION 'P14_TEST_FAIL: signup_claim returned % instead of raising claim_token_mismatch',
        v_result;
EXCEPTION WHEN others THEN
    IF SQLERRM = 'claim_token_mismatch' THEN
        RAISE NOTICE 'P14: PASS — claim_token_mismatch raised as expected';
    ELSE
        RAISE EXCEPTION 'P14_TEST_FAIL: unexpected exception: %', SQLERRM;
    END IF;
END;
$$;

\echo 'P14-CHECK: WaitlistBob row must be unmutated (EXPECTED: auth_still_unbound=true, token_still_present=true):'
SELECT auth_user_id IS NULL     AS auth_still_unbound,
       claim_token   IS NOT NULL AS token_still_present
FROM   public.users WHERE id = :'p14_user_id'::uuid;

COMMIT;

\echo 'PROOF 14 COMPLETE.'
\echo 'EXPECTED: PASS notice from DO block, auth_still_unbound=true, token_still_present=true'

-- ---------------------------------------------------------------
-- PROOF 15 — concurrent-claim race
-- Two sessions raced on the same claim_token + matching phone.
-- This proof asserts the post-race state: exactly one bind succeeded,
-- claim_token is NULL, auth_user_id is one of the two racing subs.
-- The winner is resolved dynamically (does NOT hardcode which session won).
-- Pre-seeded user (phone +15555550055) was seeded by
-- phase3b_setup_claim_race.sql; both race sessions ran before this file.
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 15: concurrent-claim race — one winner, one claim_token_mismatch ==='

\echo 'P15-PRE: resolving post-race state for WaitlistRacer (+15555550055):'
SELECT auth_user_id::text AS winning_sub,
       claim_token  IS NULL       AS token_nullified,
       auth_user_id IS NOT NULL   AS auth_bound
FROM   public.users
WHERE  phone = '+15555550055'
\gset

\echo 'P15-A: claim_token nullified after race (EXPECTED: token_nullified=true):'
SELECT :'token_nullified' AS token_nullified;

\echo 'P15-B: auth_user_id bound to one racer (EXPECTED: auth_bound=true):'
SELECT :'auth_bound' AS auth_bound;

\echo 'P15-C: winning_sub is one of the two racing subs (EXPECTED: winning_sub_valid=true):'
SELECT :'winning_sub'::uuid IN (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
) AS winning_sub_valid;

\echo 'P15-D: winning sub identity (informational — race outcome is non-deterministic):'
SELECT :'winning_sub' AS winning_sub_this_run;

\echo 'PROOF 15 COMPLETE.'
\echo 'EXPECTED: token_nullified=true, auth_bound=true, winning_sub_valid=true'

\echo ''
\echo '=== ALL D2 PROOFS COMPLETE ==='
\echo 'Proof 13 summary: JWT phone match → bind + nullify atomically.         EXPECTED: PASS'
\echo 'Proof 14 summary: JWT phone mismatch → claim_token_mismatch raised, row unmutated. EXPECTED: PASS'
\echo 'Proof 15 summary: Race on same token → one bind, one mismatch, token NULL. EXPECTED: PASS'
\echo 'Key invariant: phone ownership (via JWT) is the sole authority for claim binding.'
