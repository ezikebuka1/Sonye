-- ================================================================
-- D11 Verification Proofs: attest_attendance token round-trip
-- Proof 12  (per D11 -- Attendance Confirmation)
--
-- LOCAL VERIFICATION ONLY: Do not run against cloud database.
-- This script uses direct UPDATEs to seed attendance tokens on
-- existing membership rows for verification purposes only.
-- Application-layer writes to attended go exclusively through
-- attest_attendance per the M3 discipline.
--
-- Prerequisites (must have run in order on the same local DB):
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql  (P6 race)
--   phase3b_proofs.sql  (P6-P8; also drops phase3b_test_state)
--   phase3b_proofs_d10.sql  (P9-P11)
--
-- Fixture users: Charlie (Legs A+B), Dana (Leg C), Eve (Leg D).
-- All three are pre-filled joined members of S_race in
-- phase3b_setup.sql, seeded before the race sessions run.
-- Their status = 'joined' on S_race is deterministic regardless
-- of race outcome. Grace and Henry are excluded (race participants
-- whose join/waitlist outcome is non-deterministic). Alice and Bob
-- are excluded to maintain strict per-leg fixture isolation.
--
-- Expected S_race state when this file runs:
--   Charlie, Dana, Eve: status=joined, attended=NULL, no token
--   (Alice and Bob also joined; Grace or Henry joined, the other
--    waitlisted -- race outcome varies, not used by this proof)
--
-- Four legs exercise all three branches of attest_attendance:
--   A: lookup-finds + not-yet-set  => 'success' (write + invalidate)
--   B: lookup-misses (token NULL)  => 'invalid_or_expired'
--   C: lookup-finds + expiry past  => 'invalid_or_expired' (no write)
--   D: lookup-finds + already-set  => 'success' (idempotent no-op)
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== D11 PROOFS: attest_attendance token round-trip ==='

-- Resolve S_race slot id.
SELECT id AS s_race_id
FROM   public.slots
WHERE  starts_at = '2026-07-11 23:00:00+00'
LIMIT  1
\gset

-- Resolve the three fixture membership rows.
-- All three are guaranteed joined regardless of race outcome.
SELECT sm.id AS charlie_sm_id
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  u.first_name = 'Charlie'
  AND  sm.slot_id   = :'s_race_id'::uuid
  AND  sm.status    = 'joined'
\gset

SELECT sm.id AS dana_sm_id
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  u.first_name = 'Dana'
  AND  sm.slot_id   = :'s_race_id'::uuid
  AND  sm.status    = 'joined'
\gset

SELECT sm.id AS eve_sm_id
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  u.first_name = 'Eve'
  AND  sm.slot_id   = :'s_race_id'::uuid
  AND  sm.status    = 'joined'
\gset

\echo 'PRE-STATE: fixture rows before any leg runs (EXPECTED: attended=NULL, has_token=f for all three):'
SELECT u.first_name,
       sm.status,
       sm.attended,
       sm.attendance_token IS NOT NULL AS has_token
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id   = :'s_race_id'::uuid
  AND  u.first_name IN ('Charlie', 'Dana', 'Eve')
ORDER  BY u.first_name;

-- ---------------------------------------------------------------
-- LEG A: success path
-- Charlie gets a fresh token (48h expiry). attest_attendance must
-- return 'success'. Post-call: attended=true, token=NULL.
-- Exercises: lookup-finds + not-yet-set branch (the write path).
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 12 LEG A: success path (write + invalidate) ==='

\echo 'P12-A-SETUP: seeding token on Charlie membership (direct UPDATE, verification-only):'
UPDATE public.session_memberships
   SET attendance_token             = gen_random_uuid(),
       attendance_token_expires_at  = now() + interval '48 hours'
 WHERE id = :'charlie_sm_id'::uuid
RETURNING attendance_token AS charlie_token
\gset

\echo 'P12-A: calling attest_attendance(charlie_token, true):'
\echo 'EXPECTED: success'
SELECT public.attest_attendance(:'charlie_token'::uuid, true) AS result;

\echo 'P12-A-CHECK: Charlie membership post-call (EXPECTED: attended=true, token_invalidated=true):'
SELECT attended,
       attendance_token IS NULL AS token_invalidated
FROM   public.session_memberships
WHERE  id = :'charlie_sm_id'::uuid;

\echo 'LEG A COMPLETE.'
\echo 'EXPECTED: result=success, attended=true, token_invalidated=true'

-- ---------------------------------------------------------------
-- LEG B: idempotent second tap
-- Same token (charlie_token) is now NULL on the row after Leg A.
-- attest_attendance must return 'invalid_or_expired' because the
-- token lookup finds nothing (the row's token column is NULL).
-- Exercises: lookup-misses branch (token was invalidated in Leg A).
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 12 LEG B: idempotent second tap (token now NULL) ==='

\echo 'P12-B: calling attest_attendance(charlie_token, true) a second time:'
\echo 'EXPECTED: invalid_or_expired (token is NULL on the row -- lookup finds nothing)'
SELECT public.attest_attendance(:'charlie_token'::uuid, true) AS result;

\echo 'P12-B-CHECK: Charlie membership unchanged (EXPECTED: attended=true, token_still_null=true):'
SELECT attended,
       attendance_token IS NULL AS token_still_null
FROM   public.session_memberships
WHERE  id = :'charlie_sm_id'::uuid;

\echo 'LEG B COMPLETE.'
\echo 'EXPECTED: result=invalid_or_expired, attended=true, token_still_null=true'

-- ---------------------------------------------------------------
-- LEG C: expired token rejection
-- Dana gets a token with expiry already in the past.
-- attest_attendance must return 'invalid_or_expired'.
-- Post-call: attended still NULL, token still NOT NULL (no write
-- and no invalidation -- the expiry check fires before any UPDATE).
-- Exercises: lookup-finds + expiry past branch.
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 12 LEG C: expired token rejection (no write) ==='

\echo 'P12-C-SETUP: seeding expired token on Dana membership (expires 1 hour ago):'
UPDATE public.session_memberships
   SET attendance_token             = gen_random_uuid(),
       attendance_token_expires_at  = now() - interval '1 hour'
 WHERE id = :'dana_sm_id'::uuid
RETURNING attendance_token AS dana_token
\gset

\echo 'P12-C: calling attest_attendance(dana_token, true):'
\echo 'EXPECTED: invalid_or_expired (attendance_token_expires_at < now())'
SELECT public.attest_attendance(:'dana_token'::uuid, true) AS result;

\echo 'P12-C-CHECK: Dana membership unchanged (EXPECTED: attended_still_null=true, token_still_present=true):'
SELECT attended              IS NULL     AS attended_still_null,
       attendance_token      IS NOT NULL AS token_still_present
FROM   public.session_memberships
WHERE  id = :'dana_sm_id'::uuid;

\echo 'LEG C COMPLETE.'
\echo 'EXPECTED: result=invalid_or_expired, attended_still_null=true, token_still_present=true'

-- ---------------------------------------------------------------
-- LEG D: idempotent same-path retap on already-set membership
-- Eve gets attended=true plus a fresh token+expiry (simulating a
-- hypothetical duplicate token send). attest_attendance must
-- return 'success' (v_already_set branch fires) without writing.
-- Post-call: attended stays true, token remains NOT NULL because
-- the v_already_set branch returns before the UPDATE that would
-- invalidate the token.
-- Exercises: lookup-finds + already-set branch (idempotent no-op).
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 12 LEG D: idempotent retap on already-set membership ==='

\echo 'P12-D-SETUP: seeding attended=true + fresh token on Eve membership:'
UPDATE public.session_memberships
   SET attended                     = true,
       attendance_token             = gen_random_uuid(),
       attendance_token_expires_at  = now() + interval '48 hours'
 WHERE id = :'eve_sm_id'::uuid
RETURNING attendance_token AS eve_token
\gset

\echo 'P12-D: calling attest_attendance(eve_token, true):'
\echo 'EXPECTED: success (v_already_set branch fires -- no write, no token invalidation)'
SELECT public.attest_attendance(:'eve_token'::uuid, true) AS result;

\echo 'P12-D-CHECK: Eve membership (EXPECTED: attended=true, token_still_present=true):'
SELECT attended,
       attendance_token IS NOT NULL AS token_still_present
FROM   public.session_memberships
WHERE  id = :'eve_sm_id'::uuid;

\echo 'LEG D COMPLETE.'
\echo 'EXPECTED: result=success, attended=true, token_still_present=true'

\echo ''
\echo '=== ALL D11 PROOFS COMPLETE ==='
\echo 'Proof 12 summary:'
\echo '  Leg A (Charlie): valid token, attended unset  => success  (write + invalidate)'
\echo '  Leg B (Charlie): same token (now NULL)        => invalid_or_expired  (no write)'
\echo '  Leg C (Dana):    expired token                => invalid_or_expired  (no write, token preserved)'
\echo '  Leg D (Eve):     valid token, attended set    => success  (idempotent no-op, token preserved)'
\echo 'Key invariant: attended is only written when token is valid, unexpired, and attended was NULL.'
