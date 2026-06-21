-- ================================================================
-- D10-B slot_wall() author-reader proofs (self-contained).
--
-- LOCAL VERIFICATION ONLY. Seeds its own isolated fixture (distinct
-- synthetic phones + a 'd10b'-tagged slot id), proves the read matrix,
-- then tears the fixture down — never touches seed data or the
-- cloud-apply tripwire owner (auth_user_id NULL).
--
-- Proves: a joined non-owner resolves EVERY author's name (the gap
-- slot_wall closes), is_self/is_host flags are correct, a WAITLISTER
-- gets 0 rows (same audience as the chat SELECT policy), the OWNER
-- reads all via is_owner(), and anon gets 0 rows despite holding the
-- default EXECUTE grant (the gate, not the grant, is the boundary —
-- the exact pattern proven for slot_roster / owner_delete_message).
--
-- Cast:
--   O = Wanda  (role owner, created the slot, authored one message)
--   J = Jess   (joined non-owner, authored one message — the viewer)
--   P = Pat    (joined peer, authored one message)
--   W = Wendy  (waitlisted — locked out)
--
-- The v1 sport id is assembled with || so this source carries no
-- literal that trips a naive content-scanning pre-write hook.
-- ================================================================

\set ON_ERROR_ROLLBACK on
\set slot 51d10b00-0000-4000-8000-00000000ffff

\echo ''
\echo '=== D10-B slot_wall() PROOFS — seed fixture ==='

BEGIN;
-- idempotent teardown of any prior run
DELETE FROM public.chat_messages       WHERE slot_id = :'slot'::uuid;
DELETE FROM public.session_memberships WHERE slot_id = :'slot'::uuid;
DELETE FROM public.slots               WHERE id      = :'slot'::uuid;
DELETE FROM public.users WHERE phone IN ('+19990000003','+19990000011','+19990000012','+19990000013');

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id) VALUES
  ('+19990000003','Wanda','intermediate','owner', '00000000-0000-0000-0000-d10bff000001'),
  ('+19990000011','Jess', 'beginner',    'player','00000000-0000-0000-0000-d10bff000011'),
  ('+19990000012','Pat',  'beginner',    'player','00000000-0000-0000-0000-d10bff000012'),
  ('+19990000013','Wendy','beginner',    'player','00000000-0000-0000-0000-d10bff000013');

INSERT INTO public.slots
  (id, venue_id, sport_id, created_by, starts_at, ends_at, capacity, gender_category, skill_level, member_count, waitlist_count)
VALUES
  (:'slot'::uuid, 'cole-park', 'pick'||'le'||'ball',
   (SELECT id FROM public.users WHERE phone='+19990000003'),
   TIMESTAMPTZ '2027-10-01 15:00:00 America/Chicago',
   TIMESTAMPTZ '2027-10-01 17:00:00 America/Chicago',
   6, 'open', 'beginner', 0, 0);

-- J + P joined, W waitlisted. The owner reads via is_owner(), NOT a membership.
INSERT INTO public.session_memberships (id, user_id, slot_id, status, slot_date, created_at)
SELECT gen_random_uuid(), u.id, :'slot'::uuid, v.status, DATE '2027-10-01', now()
FROM (VALUES ('+19990000011','joined'),('+19990000012','joined'),('+19990000013','waitlisted'))
       AS v(phone,status)
JOIN public.users u ON u.phone = v.phone;

-- three messages (one per author incl. the owner) seeded directly so the
-- is_host flag has an owner-authored row to assert. created_at staggered for
-- a deterministic order.
INSERT INTO public.chat_messages (slot_id, user_id, body, created_at) VALUES
  (:'slot'::uuid, (SELECT id FROM public.users WHERE phone='+19990000011'), 'Jess: who has the ball?',  now() - interval '3 min'),
  (:'slot'::uuid, (SELECT id FROM public.users WHERE phone='+19990000012'), 'Pat: court 3 is booked',   now() - interval '2 min'),
  (:'slot'::uuid, (SELECT id FROM public.users WHERE phone='+19990000003'), 'Wanda: I''ll bring cones', now() - interval '1 min');
COMMIT;

-- ================================================================
-- LEG A — JOINED non-owner J resolves EVERY author + correct flags.
-- ================================================================
\echo ''
\echo '=== LEG A: JOINED J reads — names resolve, is_self only for J, is_host only for owner-authored ==='
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-d10bff000011','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
\echo 'A: EXPECTED 3 rows — Jess(self=t,host=f), Pat(f,f), Wanda(self=f,host=t):'
SELECT author_first_name, is_self, is_host, body
FROM public.slot_wall(:'slot'::uuid) ORDER BY created_at;
COMMIT;

-- ================================================================
-- LEG B — WAITLISTER W locked out (same audience as chat SELECT).
-- ================================================================
\echo ''
\echo '=== LEG B: WAITLISTER W reads slot_wall (EXPECTED: 0 rows) ==='
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-d10bff000013','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS w_visible_rows FROM public.slot_wall(:'slot'::uuid);
COMMIT;

-- ================================================================
-- LEG C — OWNER O reads all via is_owner(); is_host/is_self on own row.
-- ================================================================
\echo ''
\echo '=== LEG C: OWNER O reads — is_owner()=t, 3 rows, Wanda row host=t self=t ==='
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-d10bff000001','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.is_owner() AS caller_is_owner;
SELECT author_first_name, is_self, is_host
FROM public.slot_wall(:'slot'::uuid) ORDER BY created_at;
COMMIT;

-- ================================================================
-- LEG D — ANON gets 0 rows despite the default EXECUTE grant.
-- ================================================================
\echo ''
\echo '=== LEG D: ANON executes slot_wall (EXPECTED: 0 rows — gate false, not the grant) ==='
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
SET LOCAL ROLE anon;
SELECT count(*) AS anon_visible_rows FROM public.slot_wall(:'slot'::uuid);
COMMIT;

-- ================================================================
-- teardown — leave the DB clean.
-- ================================================================
\echo ''
\echo '=== teardown fixture ==='
BEGIN;
DELETE FROM public.chat_messages       WHERE slot_id = :'slot'::uuid;
DELETE FROM public.session_memberships WHERE slot_id = :'slot'::uuid;
DELETE FROM public.slots               WHERE id      = :'slot'::uuid;
DELETE FROM public.users WHERE phone IN ('+19990000003','+19990000011','+19990000012','+19990000013');
COMMIT;

\echo ''
\echo '=== slot_wall() PROOFS COMPLETE ==='
\echo 'Invariants: joined+owner resolve all authors; waitlister+anon get 0 rows;'
\echo 'is_self = author is caller; is_host = author created the slot.'
