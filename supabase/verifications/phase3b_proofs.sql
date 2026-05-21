-- ================================================================
-- Phase 3B Proofs Script -- P6 verification, P7, P8
-- Date: 2026-05-21
-- ================================================================

\set ON_ERROR_ROLLBACK on

-- Load all needed IDs from state table
SELECT
    (SELECT value FROM public.phase3b_test_state WHERE key = 's_race_id')     AS s_race_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 's_promote_id')  AS s_promote_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 's_conflict_id') AS s_conflict_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 's_drift_id')    AS s_drift_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'frank_auth_id') AS frank_auth_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'frank_id')      AS frank_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'eve_auth_id')   AS eve_auth_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'eve_id')        AS eve_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'uma_id')        AS uma_id,
    (SELECT value FROM public.phase3b_test_state WHERE key = 'charlie_id')    AS charlie_id
\gset

-- ================================================================
\echo ''
\echo '=== PROOF 6 VERIFICATION: Last-seat race post-race state ==='
-- ================================================================
-- Expected: exactly 6 joined, exactly 1 waitlisted. No more than 6 ever joined.

\echo 'P6-A: Slot counts (EXPECTED: member_count=6, waitlist_count=1):'
SELECT member_count, waitlist_count
FROM public.slots
WHERE id = :'s_race_id'::uuid;

\echo 'P6-B: Status breakdown (EXPECTED: joined=6, waitlisted=1):'
SELECT status, count(*) AS cnt
FROM public.session_memberships
WHERE slot_id = :'s_race_id'::uuid
GROUP BY status
ORDER BY status;

\echo 'P6-C: Member roster in join order (EXPECTED: Alice-Eve joined, then Grace or Henry joined and the other waitlisted):'
SELECT u.first_name, sm.status, sm.created_at
FROM public.session_memberships sm
JOIN public.users u ON u.id = sm.user_id
WHERE sm.slot_id = :'s_race_id'::uuid
ORDER BY sm.created_at;

\echo 'PROOF 6 VERIFICATION COMPLETE.'
\echo 'Key invariant: count(joined)=6, count(waitlisted)=1, never 7 joined.'

-- ================================================================
\echo ''
\echo '=== PROOF 7: Promotion D9-skip ==='
-- ================================================================
-- Setup state: S_promote has 6 joined (Alice,Bob,Charlie,Dana,Eve,Frank),
-- 2 waitlisted (Maria, Tom). Maria is D9-blocked (joined on S_conflict
-- slot_date=2026-07-18). Tom has no conflict.

\echo 'P7-0: S_promote initial state (EXPECTED: member_count=6, waitlist_count=2):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_promote_id'::uuid;

-- Variant 1: Frank leaves -> promote_from_waitlist skips Maria (D9), promotes Tom
\echo ''
\echo 'P7 Variant 1: Frank leaves S_promote (EXPECTED: leave=true, Tom promoted, Maria skipped):'

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'frank_auth_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
\echo 'Frank calls leave_slot (EXPECTED: true):'
SELECT public.leave_slot(:'s_promote_id'::uuid, 'schedule_conflict');
COMMIT;

\echo 'P7-A: S_promote roster after Frank leaves (EXPECTED: Frank=left, Tom=joined, Maria=waitlisted):'
SELECT u.first_name, sm.status
FROM public.session_memberships sm
JOIN public.users u ON u.id = sm.user_id
WHERE sm.slot_id = :'s_promote_id'::uuid
ORDER BY sm.created_at, u.first_name;

\echo 'P7-B: S_promote slot counts after Variant 1 (EXPECTED: member_count=6, waitlist_count=1):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_promote_id'::uuid;

-- Variant 2: Add Uma to waitlist, D9-block Uma, Eve leaves -> nobody promoted
\echo ''
\echo 'P7 Variant 2 setup: insert Uma as waitlisted on S_promote (service role):'
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'uma_id'::uuid, :'s_promote_id'::uuid, 'waitlisted', '2026-07-18');

\echo 'Variant 2 setup: D9-block Uma (joined on S_conflict, slot_date 2026-07-18):'
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'uma_id'::uuid, :'s_conflict_id'::uuid, 'joined', '2026-07-18');

\echo 'Verify waitlist now has Maria and Uma (EXPECTED: waitlist_count=2):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_promote_id'::uuid;

\echo 'P7 Variant 2: Eve leaves S_promote (EXPECTED: leave=true, nobody promoted -- Maria & Uma both D9-blocked):'

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'eve_auth_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
\echo 'Eve calls leave_slot (EXPECTED: true):'
SELECT public.leave_slot(:'s_promote_id'::uuid, 'no_longer_available');
COMMIT;

\echo 'P7-C: S_promote roster after Eve leaves (EXPECTED: member_count=5, Eve=left, Maria+Uma still waitlisted):'
SELECT u.first_name, sm.status
FROM public.session_memberships sm
JOIN public.users u ON u.id = sm.user_id
WHERE sm.slot_id = :'s_promote_id'::uuid
ORDER BY sm.created_at, u.first_name;

\echo 'P7-D: S_promote slot counts after Variant 2 (EXPECTED: member_count=5, waitlist_count=2):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_promote_id'::uuid;

\echo 'PROOF 7 COMPLETE.'
\echo 'Var 1: Frank left, Maria skipped (D9), Tom promoted. Var 2: Eve left, Maria+Uma both D9-blocked, nobody promoted.'

-- ================================================================
\echo ''
\echo '=== PROOF 8: Count self-heal ==='
-- ================================================================
-- Verifies sync_slot_counts trigger RECOMPUTES (not increments).
-- S_drift has Frank joined (member_count=1). Corrupt to 99, then insert
-- Charlie. Trigger should recompute to 2, NOT 100.

\echo 'P8-A: S_drift initial state (EXPECTED: member_count=1, waitlist_count=0):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_drift_id'::uuid;

\echo 'P8-B: Corrupt member_count to 99 (deliberate drift):'
UPDATE public.slots SET member_count = 99 WHERE id = :'s_drift_id'::uuid;

\echo 'P8-C: Confirm corruption (EXPECTED: 99):'
SELECT member_count FROM public.slots WHERE id = :'s_drift_id'::uuid;

\echo 'P8-D: Trigger self-heal via Charlie joining S_drift (service role INSERT):'
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'charlie_id'::uuid, :'s_drift_id'::uuid, 'joined', '2026-07-25');

\echo 'P8-E: Verify trigger recomputed (EXPECTED: member_count=2 NOT 100, waitlist_count=0):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_drift_id'::uuid;

\echo 'P8-F: Cross-check against actual memberships:'
SELECT
    count(*) FILTER (WHERE status = 'joined')     AS true_joined,
    count(*) FILTER (WHERE status = 'waitlisted') AS true_waitlisted
FROM public.session_memberships
WHERE slot_id = :'s_drift_id'::uuid;

\echo 'PROOF 8 COMPLETE.'
\echo 'Expected: true_joined=2 (Frank + Charlie), true_waitlisted=0. member_count=2 (recomputed not incremented from 99).'

-- Cleanup state table
DROP TABLE IF EXISTS public.phase3b_test_state;
\echo 'State table dropped.'

\echo ''
\echo '=== ALL PHASE 3B PROOFS COMPLETE ==='
