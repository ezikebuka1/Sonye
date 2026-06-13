-- ================================================================
-- Phase 4A-pre Proof: slot_roster deterministic ORDER BY (G1)
--
-- Asserts: joined block first, then waitlisted; FIFO by created_at
-- within each block (sm.id tiebreak). Run as a JOINED member.
--
-- LOCAL VERIFICATION ONLY: Do not run against cloud database.
--
-- Prerequisites (same chain as phase3b_proofs_d10.sql):
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql  (P6 race)
--   phase3b_proofs.sql
-- Run this BEFORE phase3b_proofs_d10.sql: the second-waitlister
-- fixture below is created inside a transaction and ROLLED BACK,
-- so S_race state (6 joined, 1 waitlisted) is left untouched.
--
-- The ruling requires >=2 joined and >=2 waitlisted: S_race has
-- 6 joined + 1 waitlisted, so a second waitlisted member is added
-- via join_slot (slot is full -> waitlisted) inside the rollback.
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== 4A-PRE PROOF: slot_roster deterministic ordering ==='

-- S_race: CDT July 11 slot, inserted as 18:00-05 = 23:00 UTC
SELECT id AS s_race_id
FROM   public.slots
WHERE  starts_at = '2026-07-11 23:00:00+00'
LIMIT  1
\gset

-- Resolve whichever of Grace/Henry ended up joined this run.
SELECT u.first_name   AS joined_racer_name,
       u.auth_user_id AS joined_racer_auth
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id    = :'s_race_id'::uuid
  AND  sm.status     = 'joined'
  AND  u.first_name  IN ('Grace', 'Henry')
LIMIT  1
\gset

\echo 'PRE: S_race counts (EXPECTED: member_count=6, waitlist_count=1):'
SELECT member_count, waitlist_count
FROM   public.slots WHERE id = :'s_race_id'::uuid;

BEGIN;

-- ----------------------------------------------------------------
-- Fixture (rolled back): TestWaitlister2, joins the FULL slot via
-- join_slot -> waitlisted #2. Synthetic ids mirror the d10 fixture
-- convention (last segment prefixed '4a' for traceability).
-- ----------------------------------------------------------------
\echo 'FIXTURE: inserting TestWaitlister2 (rolled back at end):'
INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+19990000002', 'TestWaitlister2', 'intermediate', 'player',
        '00000000-0000-0000-0000-4a0000000002')
RETURNING auth_user_id AS w2_auth
\gset

SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'w2_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'FIXTURE: TestWaitlister2 calls join_slot (EXPECTED: waitlisted):'
SELECT * FROM public.join_slot(:'s_race_id'::uuid);

-- ----------------------------------------------------------------
-- ORDERING PROOF: roster as the joined racer, called twice.
-- EXPECTED both runs, identical:
--   pos 1..6  status=joined     (Alice,Bob,Charlie,Dana,Eve in seed
--                                order, racer 6th), phone_visible=t
--   pos 7     waitlisted racer  (Grace|Henry), phone_visible=f
--   pos 8     TestWaitlister2,  phone_visible=f
-- ----------------------------------------------------------------
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'joined_racer_auth', 'role', 'authenticated')::text, true);

\echo ''
\echo 'ORDER PROOF RUN A (caller = joined racer' :joined_racer_name '):'
SELECT row_number() OVER () AS pos,
       membership_id, first_name, status,
       (phone IS NOT NULL) AS phone_visible
FROM   public.slot_roster(:'s_race_id'::uuid);

\echo 'ORDER PROOF RUN B (same caller, second call):'
SELECT row_number() OVER () AS pos,
       membership_id, first_name, status,
       (phone IS NOT NULL) AS phone_visible
FROM   public.slot_roster(:'s_race_id'::uuid);

-- ----------------------------------------------------------------
-- MACHINE ASSERT: roster order == ground-truth ORDER BY over the
-- base table. RESET ROLE (postgres reads session_memberships
-- without RLS; jwt claims persist so the SECURITY DEFINER fn still
-- evaluates the joined-racer identity).
-- ----------------------------------------------------------------
RESET ROLE;

\echo 'GROUND TRUTH (base table, ruled ORDER BY):'
SELECT row_number() OVER (
           ORDER BY (sm.status = 'joined') DESC, sm.created_at ASC, sm.id ASC
       ) AS pos,
       sm.id AS membership_id, u.first_name, sm.status, sm.created_at
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id = :'s_race_id'::uuid
  AND  sm.status IN ('joined','waitlisted')
ORDER  BY 1;

\echo 'ASSERT (EXPECTED mismatches=0):'
WITH r AS (
    SELECT row_number() OVER () AS pos, membership_id
    FROM   public.slot_roster(:'s_race_id'::uuid)
),
t AS (
    SELECT row_number() OVER (
               ORDER BY (sm.status = 'joined') DESC, sm.created_at ASC, sm.id ASC
           ) AS pos,
           sm.id AS membership_id
    FROM   public.session_memberships sm
    WHERE  sm.slot_id = :'s_race_id'::uuid
      AND  sm.status IN ('joined','waitlisted')
)
SELECT count(*) AS mismatches
FROM   ((SELECT * FROM r EXCEPT SELECT * FROM t)
        UNION ALL
        (SELECT * FROM t EXCEPT SELECT * FROM r)) x;

ROLLBACK;

\echo 'POST (after ROLLBACK): S_race counts (EXPECTED: member_count=6, waitlist_count=1):'
SELECT member_count, waitlist_count
FROM   public.slots WHERE id = :'s_race_id'::uuid;

\echo ''
\echo '=== 4A-PRE ORDERING PROOF COMPLETE ==='
\echo 'Run this script twice; order must be identical across runs.'
