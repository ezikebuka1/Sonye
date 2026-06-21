-- ================================================================
-- D10 Verification Proofs: slot_roster phone projection
-- Proofs 9, 10, 11  (per D10 -- Lobby Communication; AMENDED by
-- D10 Amendment A -- peer phone redacted to OWNER-ONLY)
--
-- LOCAL VERIFICATION ONLY: Do not run against cloud database.
-- This script creates a test owner fixture for Proof 11.
-- The seeded placeholder owner (auth_user_id = NULL) is the
-- cloud-apply tripwire per m3-closeout.md and must not be
-- mutated by verification scripts.
--
-- Prerequisites (must have run in order on the same local DB):
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql  (P6 race)
--   phase3b_proofs.sql  (P6-P8; also drops phase3b_test_state)
--
-- Expected S_race state when this file runs:
--   joined     : Alice, Bob, Charlie, Dana, Eve + one of (Grace|Henry)  (6)
--   waitlisted : the other of (Grace|Henry)                             (1)
--   Race outcome is non-deterministic; P9/P10 resolve the actual
--   joined/waitlisted racer from session_memberships at runtime.
--
-- The state table is dropped by phase3b_proofs.sql.
-- IDs are derived directly from live tables here.
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== D10 PROOFS: slot_roster phone projection ==='

-- S_race: CDT July 11 slot, inserted as 18:00-05 = 23:00 UTC
SELECT id AS s_race_id
FROM   public.slots
WHERE  starts_at = '2026-07-11 23:00:00+00'
LIMIT  1
\gset

-- ----------------------------------------------------------------
-- Proof 11 fixture: dedicated test-owner user.
-- auth_user_id is a fixed, obviously-test-shaped UUID:
--   00000000-0000-0000-0000-d10000000001
--   (all zeros; last segment prefixed with 'd1' for D10 traceability)
-- phone +19990000000 is unmistakably synthetic test data.
-- The seeded placeholder owner (auth_user_id = NULL) is NOT touched.
-- ----------------------------------------------------------------
\echo 'P11-FIXTURE: inserting dedicated test-owner (not the seeded placeholder):'
INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+19990000000', 'TestOwner', 'intermediate', 'owner',
        '00000000-0000-0000-0000-d10000000001')
RETURNING auth_user_id AS owner_auth
\gset

\echo 'D10-PRE: S_race counts (EXPECTED: member_count=6, waitlist_count=1):'
SELECT member_count, waitlist_count
FROM   public.slots WHERE id = :'s_race_id'::uuid;

-- ---------------------------------------------------------------
-- PROOF 9 (D10-A): joined NON-owner caller sees NO phones.
-- Pre-D10-A this caller saw joined phones; the redaction now NULLs
-- every phone column for any non-owner. Role resolved dynamically
-- from session_memberships truth so the proof is correct regardless
-- of race outcome (Grace or Henry) -- the racer is a player, not
-- the owner, so is_owner() is false and no phone is revealed.
-- ---------------------------------------------------------------

-- Resolve whichever of Grace/Henry ended up joined this run.
SELECT u.first_name  AS joined_racer_name,
       u.auth_user_id AS joined_racer_auth
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id    = :'s_race_id'::uuid
  AND  sm.status     = 'joined'
  AND  u.first_name  IN ('Grace', 'Henry')
LIMIT  1
\gset

-- Resolve whichever of Grace/Henry ended up waitlisted this run.
SELECT u.first_name  AS waitlisted_racer_name,
       u.auth_user_id AS waitlisted_racer_auth
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id    = :'s_race_id'::uuid
  AND  sm.status     = 'waitlisted'
  AND  u.first_name  IN ('Grace', 'Henry')
LIMIT  1
\gset

\echo ''
\echo '=== PROOF 9 (D10-A): joined NON-owner caller -- EVERY phone NULL ==='
\echo 'Joined racer this run: ' :joined_racer_name

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'joined_racer_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'P9-A: full roster as joined racer:' :joined_racer_name
\echo 'EXPECTED (D10-A): 6 joined rows with NULL phone, 1 waitlisted row with NULL phone -- non-owner sees no phones.'
SELECT status,
       phone,
       phone IS NOT NULL AS phone_visible
FROM   public.slot_roster(:'s_race_id'::uuid)
ORDER BY status DESC, phone;

\echo 'P9-B: count check:'
SELECT
    count(*) FILTER (WHERE status = 'joined'     AND phone IS NOT NULL) AS joined_with_phone,
    count(*) FILTER (WHERE status = 'joined'     AND phone IS NULL)     AS joined_no_phone,
    count(*) FILTER (WHERE status = 'waitlisted' AND phone IS NULL)     AS waitlisted_null,
    count(*) FILTER (WHERE status = 'waitlisted' AND phone IS NOT NULL) AS waitlisted_exposed
FROM   public.slot_roster(:'s_race_id'::uuid);

COMMIT;

\echo 'PROOF 9 COMPLETE.'
\echo 'EXPECTED (D10-A inverted): joined_with_phone=0, joined_no_phone=6, waitlisted_null=1, waitlisted_exposed=0'

-- ---------------------------------------------------------------
-- PROOF 10: waitlisted caller sees roster; ALL phone columns NULL
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 10: waitlisted caller -- roster returned, every phone NULL ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'waitlisted_racer_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'P10-A: full roster as waitlisted racer:' :waitlisted_racer_name
\echo 'EXPECTED: 7 rows returned, phone column NULL on every row.'
SELECT status,
       phone
FROM   public.slot_roster(:'s_race_id'::uuid)
ORDER BY status DESC, phone;

\echo 'P10-B: count check:'
SELECT
    count(*)                                  AS total_rows,
    count(*) FILTER (WHERE phone IS NOT NULL) AS rows_with_phone,
    count(*) FILTER (WHERE phone IS NULL)     AS rows_null_phone
FROM   public.slot_roster(:'s_race_id'::uuid);

COMMIT;

\echo 'PROOF 10 COMPLETE.'
\echo 'EXPECTED: total_rows=7, rows_with_phone=0, rows_null_phone=7'

-- ---------------------------------------------------------------
-- PROOF 11: owner sees joined phones via is_owner() branch;
--           waitlisted rows remain NULL (row-level status filter)
-- Caller: TestOwner (auth_user_id = 00000000-0000-0000-0000-d10000000001)
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 11: owner caller -- is_owner() branch, row-level filter still applies ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'owner_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'P11-A: confirm is_owner() resolves true for TestOwner JWT:'
SELECT public.is_owner() AS caller_is_owner;

\echo 'P11-B: full roster as TestOwner (owner):'
\echo 'EXPECTED: joined rows phone NOT NULL, waitlisted rows phone NULL.'
\echo '(Row-level CASE filter -- sm.status=joined -- constrains even the owner branch.)'
SELECT status,
       phone,
       phone IS NOT NULL AS phone_visible
FROM   public.slot_roster(:'s_race_id'::uuid)
ORDER BY status DESC, phone;

\echo 'P11-C: count check (owner sees the joined phone set; post-D10-A the owner is the ONLY caller that does -- contrast P9):'
SELECT
    count(*) FILTER (WHERE status = 'joined'     AND phone IS NOT NULL) AS joined_with_phone,
    count(*) FILTER (WHERE status = 'joined'     AND phone IS NULL)     AS joined_no_phone,
    count(*) FILTER (WHERE status = 'waitlisted' AND phone IS NULL)     AS waitlisted_null,
    count(*) FILTER (WHERE status = 'waitlisted' AND phone IS NOT NULL) AS waitlisted_exposed
FROM   public.slot_roster(:'s_race_id'::uuid);

COMMIT;

\echo 'PROOF 11 COMPLETE.'
\echo 'EXPECTED: caller_is_owner=true, joined_with_phone=6, joined_no_phone=0, waitlisted_null=1, waitlisted_exposed=0'

\echo ''
\echo '=== ALL D10 PROOFS COMPLETE ==='
\echo 'Key invariant (D10-A): phone visible iff is_owner() AND row.status=joined.'
\echo 'Non-owner callers (joined OR waitlisted): phone NULL on every row. Owner: the ONLY caller who sees phones.'
