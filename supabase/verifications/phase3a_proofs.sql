-- ================================================================
-- Phase 3A Proof Script -- local Supabase schema verification
-- Schema: D3 canonical (d64fc59), migration fix (d604292)
-- Date: 2026-05-21
-- Run via: docker exec -i supabase_db_squadup psql -U postgres postgres
-- ================================================================

\set ON_ERROR_ROLLBACK on

-- ================================================================
\echo '=== SETUP: Seeding test users and slots ==='
-- ================================================================

-- Player A: Alice
INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000001', 'Alice', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS alice_id, auth_user_id AS alice_auth_id
\gset

-- Player B: Bob
INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000002', 'Bob', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS bob_id, auth_user_id AS bob_auth_id
\gset

-- Capture owner id (seeded by migration Part 11)
SELECT id AS owner_id FROM public.users WHERE role = 'owner' LIMIT 1
\gset

-- Slot S1: Cole Park, sport, 2026-06-13 18:00 CDT (23:00 UTC)
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-06-13 18:00:00-05:00', '2026-06-13 20:00:00-05:00', 6, 'intermediate'
)
RETURNING id AS s1_id
\gset

-- Slot S2: same Dallas day, same venue, 21:00 CDT
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-06-13 21:00:00-05:00', '2026-06-13 23:00:00-05:00', 6, 'intermediate'
)
RETURNING id AS s2_id
\gset

-- Slot S_tz: 11:30pm CDT Saturday = 04:30 UTC Sunday (timezone red-flag)
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-06-13 23:30:00-05:00', '2026-06-14 01:00:00-05:00', 6, 'intermediate'
)
RETURNING id AS stz_id
\gset

\echo 'Seeded IDs captured via gset:'
SELECT
    :'alice_id'      AS alice_id,
    :'alice_auth_id' AS alice_auth_id,
    :'bob_id'        AS bob_id,
    :'bob_auth_id'   AS bob_auth_id,
    :'owner_id'      AS owner_id,
    :'s1_id'         AS s1_id,
    :'s2_id'         AS s2_id,
    :'stz_id'        AS stz_id;

-- ================================================================
\echo ''
\echo '=== PROOF 1: Anon vault ==='
-- ================================================================
-- Verifies: anon role sees 0 rows from all private tables.
-- Verifies: anon CAN call claim_lookups() and slot_share_preview()
--           (SECURITY DEFINER with explicit anon grants).

BEGIN;
SET LOCAL ROLE anon;

\echo 'P1-A: Direct table reads as anon (EXPECTED: all counts = 0):'
SELECT count(*) AS users_anon_count     FROM public.users;
SELECT count(*) AS slots_anon_count     FROM public.slots;
SELECT count(*) AS sm_anon_count        FROM public.session_memberships;
SELECT count(*) AS chat_anon_count      FROM public.chat_messages;

\echo 'P1-B: claim_lookups random UUID (EXPECTED: 1 row, is_valid = false):'
SELECT is_valid FROM public.claim_lookups(gen_random_uuid());

\echo 'P1-C: slot_share_preview S1 empty slot (EXPECTED: venue_name=Cole Park, fill_count=NULL, fill_ratio_shown=false):'
SELECT venue_name, fill_count, fill_ratio_shown
FROM public.slot_share_preview(:'s1_id'::uuid);

COMMIT;
\echo 'PROOF 1 COMPLETE. Expected: 4x count=0, is_valid=f, fill_count=<null>, fill_ratio_shown=f'

-- ================================================================
\echo ''
\echo '=== PROOF 2: Cross-user deny ==='
-- ================================================================
-- Verifies: authenticated user sees ONLY their own users row.
-- Policy: users_select_self_or_owner USING (auth_user_id = auth.uid() OR is_owner())

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'alice_auth_id', 'role', 'authenticated')::text,
    true);

\echo 'P2-A: Count all users as Alice (EXPECTED: 1 -- only own row visible):'
SELECT count(*) AS user_count FROM public.users;

\echo 'P2-B: Alice own id visible (EXPECTED: 1 row = Alice id):'
SELECT id FROM public.users;

\echo 'P2-C: Bob row filtered by RLS (EXPECTED: 0):'
SELECT count(*) AS bob_visible FROM public.users WHERE id = :'bob_id'::uuid;

COMMIT;
\echo 'PROOF 2 COMPLETE. Expected: count=1, id=Alice id, bob_visible=0'

-- ================================================================
\echo ''
\echo '=== PROOF 3: Escalation guard ==='
-- ================================================================
-- Verifies: authenticated user CANNOT escalate own role to owner.
-- WITH CHECK: auth_user_id = auth.uid() AND (role = player OR is_owner())
-- Legit self-update (first_name) MUST still succeed.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'alice_auth_id', 'role', 'authenticated')::text,
    true);

\echo 'P3-A: Attempt role escalation to owner (EXPECTED: RLS WITH CHECK error):'
UPDATE public.users SET role = 'owner'
WHERE auth_user_id = :'alice_auth_id'::uuid;

\echo 'P3-B: Verify role still player after failed escalation (EXPECTED: player):'
SELECT role FROM public.users WHERE id = :'alice_id'::uuid;

\echo 'P3-C: Legit self-update of first_name (EXPECTED: UPDATE 1):'
UPDATE public.users SET first_name = 'Anne'
WHERE auth_user_id = :'alice_auth_id'::uuid;

\echo 'P3-D: Verify name changed (EXPECTED: Anne):'
SELECT first_name FROM public.users WHERE id = :'alice_id'::uuid;

COMMIT;
\echo 'PROOF 3 COMPLETE. Expected: escalation error, role=player, UPDATE 1, first_name=Anne'

-- ================================================================
\echo ''
\echo '=== PROOF 4: D9 two-layer (function pre-check + index backstop) ==='
-- ================================================================
-- Verifies: join_slot blocks second game on same Dallas calendar day.
-- Layer 1: pre-check in join_slot fn raises clean error.
-- Layer 2: partial unique index sm_d9_one_joined_per_day is hard backstop
--          even for direct service-role INSERT.

\echo 'P4-A: Alice joins S1 (EXPECTED: resulting_status = joined):'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'alice_auth_id', 'role', 'authenticated')::text,
    true);
SELECT membership_id, resulting_status FROM public.join_slot(:'s1_id'::uuid);
COMMIT;

\echo 'P4-B: Alice attempts S2 same Dallas day 2026-06-13 (EXPECTED: D9 violation error SQLSTATE 23505):'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'alice_auth_id', 'role', 'authenticated')::text,
    true);
SELECT membership_id, resulting_status FROM public.join_slot(:'s2_id'::uuid);
ROLLBACK;

\echo 'P4-C: Index backstop -- direct INSERT as service role (EXPECTED: unique constraint sm_d9_one_joined_per_day):'
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'alice_id'::uuid, :'s2_id'::uuid, 'joined', '2026-06-13');

\echo 'P4-D: Verify Alice has exactly 1 joined row on 2026-06-13 (EXPECTED: 1):'
SELECT count(*) AS joined_count
FROM public.session_memberships
WHERE user_id = :'alice_id'::uuid
  AND slot_date = '2026-06-13'
  AND status = 'joined';

\echo 'PROOF 4 COMPLETE. Expected: S1=joined, S2=D9 error, index violation, joined_count=1'

-- ================================================================
\echo ''
\echo '=== PROOF 5: Timezone red-flag (R2 -- Dallas civil date, not UTC) ==='
-- ================================================================
-- Verifies: slot_date stored by join_slot uses America/Chicago, NOT UTC.
-- S_tz starts_at: 2026-06-13 23:30 CDT = 2026-06-14 04:30 UTC
-- Correct slot_date: 2026-06-13 (Saturday Dallas)
-- Wrong   slot_date: 2026-06-14 (Sunday UTC) -- D9 false-pass bug

\echo 'P5-A: Bob joins late-night slot S_tz (EXPECTED: resulting_status = joined):'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'bob_auth_id', 'role', 'authenticated')::text,
    true);
SELECT membership_id, resulting_status FROM public.join_slot(:'stz_id'::uuid);
COMMIT;

\echo 'P5-B: slot_date stored for Bob on S_tz (EXPECTED: 2026-06-13 NOT 2026-06-14):'
SELECT slot_date
FROM public.session_memberships
WHERE user_id = :'bob_id'::uuid AND slot_id = :'stz_id'::uuid;

\echo 'P5-C: Side-by-side Dallas vs UTC proof for S_tz slot:'
SELECT
    (starts_at AT TIME ZONE 'America/Chicago')::date  AS dallas_date,
    starts_at::date                                    AS utc_date,
    (starts_at AT TIME ZONE 'America/Chicago')         AS dallas_wallclock,
    starts_at                                          AS utc_instant
FROM public.slots WHERE id = :'stz_id'::uuid;
\echo 'EXPECTED: dallas_date=2026-06-13, utc_date=2026-06-14 (must differ)'

\echo 'P5-D: December CST sanity check (no INSERT -- literal only):'
SELECT
    (('2026-12-12 23:30:00-06:00'::timestamptz) AT TIME ZONE 'America/Chicago')::date AS dec_dallas,
    ('2026-12-12 23:30:00-06:00'::timestamptz)::date                                   AS dec_utc;
\echo 'EXPECTED: dec_dallas=2026-12-12 (Saturday CST), dec_utc=2026-12-13 (Sunday UTC)'

\echo ''
\echo 'PROOF 5 COMPLETE.'

-- ================================================================
\echo ''
\echo '=== ALL PHASE 3A PROOFS COMPLETE ==='
-- ================================================================
