-- ================================================================
-- D10 Amendment B Verification Proofs: lobby wall (chat_messages)
-- joined-only audience + owner-delete RPC + anon write revoke.
--
-- LOCAL VERIFICATION ONLY: Do not run against cloud database.
-- This script creates a dedicated test-owner fixture (WallOwner).
-- The seeded placeholder owner (auth_user_id = NULL) is the
-- cloud-apply tripwire per m3-closeout.md and is NOT touched.
--
-- Prerequisites (the "battery" — run in order on the same fresh DB):
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql   (P6 race)
--   phase3b_proofs.sql                            (P6-P8; drops state tbl)
--   phase3b_proofs_d10b.sql                       (THIS FILE)
--
-- Fixture cast (per dispatch — reuse the D10 approach):
--   J = Alice   — JOINED non-owner   (can read + post the wall)
--   P = Bob     — JOINED peer        (sees J's posts)
--   W = Grace|Henry, whichever waitlisted — LOCKED OUT (the headline)
--   O = WallOwner — role='owner'     (reads wall + owner-deletes)
--
-- S_race state after the battery:
--   joined     : Alice, Bob, Charlie, Dana, Eve + one of (Grace|Henry)
--   waitlisted : the other of (Grace|Henry)
-- Race outcome is non-deterministic; W is resolved at runtime.
-- IDs are derived directly from live tables.
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== D10-B PROOFS: lobby wall joined-only RLS + owner-delete RPC ==='

-- S_race: CDT July 11 slot, inserted as 18:00-05 = 23:00 UTC
SELECT id AS s_race_id
FROM   public.slots
WHERE  starts_at = '2026-07-11 23:00:00+00'
LIMIT  1
\gset

-- ----------------------------------------------------------------
-- O fixture: dedicated D10-B test-owner. Distinct from D10's
-- TestOwner (different phone + auth_user_id), idempotent, and never
-- touches the seeded placeholder owner (auth_user_id = NULL).
--   auth_user_id 00000000-0000-0000-0000-d10b00000001  ('d10b' tag)
--   phone +19990000002  — unmistakably synthetic test data
-- ----------------------------------------------------------------
\echo 'O-FIXTURE: ensure dedicated D10-B test-owner (WallOwner) exists:'
INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
SELECT '+19990000002', 'WallOwner', 'intermediate', 'owner',
       '00000000-0000-0000-0000-d10b00000001'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = '00000000-0000-0000-0000-d10b00000001'
);

SELECT auth_user_id AS owner_auth
FROM   public.users
WHERE  auth_user_id = '00000000-0000-0000-0000-d10b00000001'
\gset

-- Resolve J (Alice, joined) and P (Bob, joined peer).
SELECT u.auth_user_id AS j_auth, u.first_name AS j_name
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id = :'s_race_id'::uuid
  AND  sm.status  = 'joined'
  AND  u.first_name = 'Alice'
LIMIT  1
\gset

SELECT u.auth_user_id AS p_auth, u.first_name AS p_name
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id = :'s_race_id'::uuid
  AND  sm.status  = 'joined'
  AND  u.first_name = 'Bob'
LIMIT  1
\gset

-- Resolve W: whichever of Grace/Henry ended up WAITLISTED this run.
SELECT u.auth_user_id AS w_auth, u.first_name AS w_name
FROM   public.session_memberships sm
JOIN   public.users u ON u.id = sm.user_id
WHERE  sm.slot_id = :'s_race_id'::uuid
  AND  sm.status  = 'waitlisted'
  AND  u.first_name IN ('Grace', 'Henry')
LIMIT  1
\gset

\echo 'Cast resolved → J(joined):' :j_name '  P(joined peer):' :p_name '  W(waitlisted):' :w_name

-- ================================================================
-- LEG 1 — JOINED WORKS: J inserts two wall messages; J reads them;
--          peer P reads them too.
-- ================================================================
\echo ''
\echo '=== LEG 1: JOINED WORKS (J posts, J + peer P read) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'j_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'L1-a: J INSERT msg_a (EXPECTED: INSERT 0 1):'
INSERT INTO public.chat_messages (slot_id, user_id, body)
VALUES (:'s_race_id'::uuid, public.current_user_id(), 'J: who is bringing the ball?')
RETURNING id AS msg_a
\gset

\echo 'L1-b: J INSERT msg_b (EXPECTED: INSERT 0 1):'
INSERT INTO public.chat_messages (slot_id, user_id, body)
VALUES (:'s_race_id'::uuid, public.current_user_id(), 'J: court 3 is booked')
RETURNING id AS msg_b
\gset

\echo 'L1-c: J SELECT own wall (EXPECTED: 2 rows):'
SELECT body FROM public.chat_messages
WHERE slot_id = :'s_race_id'::uuid ORDER BY created_at;
COMMIT;

\echo 'L1-d: peer P SELECT wall (EXPECTED: same 2 rows — joined peer sees them):'
BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'p_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS p_visible_rows FROM public.chat_messages
WHERE slot_id = :'s_race_id'::uuid;
COMMIT;
\echo 'LEG 1 COMPLETE. EXPECTED: two INSERT 0 1, J sees 2, p_visible_rows=2.'

-- ================================================================
-- LEG 2 — WAITLISTER LOCKED OUT (the headline). Under the prior
--          is_active_member predicate W could read AND post. Now:
--          0 rows on SELECT, INSERT rejected by RLS.
-- ================================================================
\echo ''
\echo '=== LEG 2: WAITLISTER LOCKED OUT (headline — was allowed under is_active_member) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'w_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'L2-a: W SELECT wall (EXPECTED: 0 rows — waitlister cannot read despite 2 messages existing):'
SELECT count(*) AS w_visible_rows FROM public.chat_messages
WHERE slot_id = :'s_race_id'::uuid;

\echo 'L2-b: W INSERT (EXPECTED: ERROR — new row violates row-level security policy):'
INSERT INTO public.chat_messages (slot_id, user_id, body)
VALUES (:'s_race_id'::uuid, public.current_user_id(), 'W: can I get in?');
COMMIT;
\echo 'LEG 2 COMPLETE. EXPECTED: w_visible_rows=0 and the INSERT raised an RLS error.'

-- ================================================================
-- LEG 3 — OWNER READS + DELETES. O reads the wall via the is_owner()
--          disjunct, deletes msg_a via the RPC (returns true), row gone.
-- ================================================================
\echo ''
\echo '=== LEG 3: OWNER READS + DELETES (is_owner() disjunct + owner_delete_message RPC) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'owner_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'L3-a: confirm is_owner() true for WallOwner JWT:'
SELECT public.is_owner() AS caller_is_owner;

\echo 'L3-b: O SELECT wall (EXPECTED: 2 rows — owner reads without being a member):'
SELECT count(*) AS owner_visible_rows FROM public.chat_messages
WHERE slot_id = :'s_race_id'::uuid;

\echo 'L3-c: O owner_delete_message(msg_a) (EXPECTED: t):'
SELECT public.owner_delete_message(:'msg_a'::uuid) AS deleted;

\echo 'L3-d: O SELECT wall after delete (EXPECTED: 1 row — msg_a gone, msg_b remains):'
SELECT body FROM public.chat_messages
WHERE slot_id = :'s_race_id'::uuid ORDER BY created_at;
COMMIT;
\echo 'LEG 3 COMPLETE. EXPECTED: caller_is_owner=t, owner_visible_rows=2, deleted=t, 1 row remains.'

-- ================================================================
-- LEG 4 — NON-OWNER DELETE REJECTED. J calls the RPC → owner-only
--          gate raises insufficient_privilege BEFORE any delete.
-- ================================================================
\echo ''
\echo '=== LEG 4: NON-OWNER DELETE REJECTED (owner_delete_message gate) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'j_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'L4-a: J owner_delete_message(msg_b) (EXPECTED: ERROR — owner only / insufficient_privilege):'
SELECT public.owner_delete_message(:'msg_b'::uuid) AS deleted;

\echo 'L4-b: confirm msg_b survives the rejected delete (EXPECTED: 1 row):'
SELECT count(*) AS msg_b_present FROM public.chat_messages WHERE id = :'msg_b'::uuid;
COMMIT;
\echo 'LEG 4 COMPLETE. EXPECTED: the RPC raised "owner only" (insufficient_privilege); msg_b_present=1.'

-- ================================================================
-- LEG 5 — IMMUTABLE. No UPDATE policy exists, so J's UPDATE matches
--          no row → UPDATE 0; body unchanged.
-- ================================================================
\echo ''
\echo '=== LEG 5: IMMUTABLE (no UPDATE policy on the wall) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'j_auth', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

\echo 'L5-a: J UPDATE msg_b body (EXPECTED: UPDATE 0 — no UPDATE policy, no row qualifies):'
UPDATE public.chat_messages SET body = 'EDITED BY J' WHERE id = :'msg_b'::uuid;

\echo 'L5-b: confirm body unchanged (EXPECTED: original "J: court 3 is booked"):'
SELECT body FROM public.chat_messages WHERE id = :'msg_b'::uuid;
COMMIT;
\echo 'LEG 5 COMPLETE. EXPECTED: UPDATE 0, body unchanged.'

-- ================================================================
-- LEG 6 — ANON BLOCKED. anon INSERT denied (write grant revoked +
--          no policy for anon). anon ALSO cannot delete via the RPC:
--          although anon holds the default EXECUTE grant (matching
--          cancel_slot/kick_member), the is_owner() gate raises before
--          any DELETE — current_user_id() is NULL for anon, so the
--          message id is immaterial. msg_b's id is used for realism.
-- ================================================================
\echo ''
\echo '=== LEG 6: ANON BLOCKED (defense-in-depth — write grant revoked + RPC owner gate) ==='

BEGIN;
SELECT set_config('request.jwt.claims',
    json_build_object('role', 'anon')::text, true);
SET LOCAL ROLE anon;

\echo 'L6-a: anon INSERT (EXPECTED: ERROR — permission denied for table chat_messages):'
INSERT INTO public.chat_messages (slot_id, user_id, body)
VALUES (:'s_race_id'::uuid, :'owner_auth'::uuid, 'anon: hello');

\echo 'L6-b ANON CANNOT DELETE (RPC owner gate): anon owner_delete_message(msg_b)'
\echo '     (EXPECTED: ERROR — owner only / insufficient_privilege; is_owner() false, current_user_id() NULL):'
SELECT public.owner_delete_message(:'msg_b'::uuid) AS deleted;
COMMIT;
\echo 'LEG 6 COMPLETE. EXPECTED: INSERT denied (permission/RLS) AND RPC raised "owner only" (insufficient_privilege).'

\echo ''
\echo '=== ALL D10-B PROOFS COMPLETE ==='
\echo 'Invariants: wall read/write iff is_joined_member (owner reads via is_owner()).'
\echo 'Waitlister locked out; owner-only delete via RPC; messages immutable; anon write-revoked.'
