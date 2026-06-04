-- ================================================================
-- Phase 3B Setup Script -- seeds test data for Proofs 6-8
-- Date: 2026-05-21
-- ================================================================

\set ON_ERROR_ROLLBACK on

\echo '=== PHASE 3B SETUP: creating state table ==='

DROP TABLE IF EXISTS public.phase3b_test_state;
CREATE TABLE public.phase3b_test_state (key text PRIMARY KEY, value text);

\echo 'Cleaning up any prior test data (phase3a remnants)...'
DELETE FROM public.chat_messages;
DELETE FROM public.session_memberships;
DELETE FROM public.slots;
DELETE FROM public.users WHERE role != 'owner';


\echo 'Seeding 11 test users...'

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000001', 'Alice', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS alice_id, auth_user_id AS alice_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000002', 'Bob', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS bob_id, auth_user_id AS bob_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000003', 'Charlie', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS charlie_id, auth_user_id AS charlie_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000004', 'Dana', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS dana_id, auth_user_id AS dana_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000005', 'Eve', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS eve_id, auth_user_id AS eve_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000006', 'Frank', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS frank_id, auth_user_id AS frank_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000007', 'Grace', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS grace_id, auth_user_id AS grace_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000008', 'Henry', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS henry_id, auth_user_id AS henry_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000009', 'Maria', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS maria_id, auth_user_id AS maria_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000010', 'Tom', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS tom_id, auth_user_id AS tom_auth_id
\gset

INSERT INTO public.users (phone, first_name, skill_level, role, auth_user_id)
VALUES ('+15550000011', 'Uma', 'intermediate', 'player', gen_random_uuid())
RETURNING id AS uma_id, auth_user_id AS uma_auth_id
\gset

-- Owner id
SELECT id AS owner_id FROM public.users WHERE role = 'owner' LIMIT 1
\gset

\echo 'Seeding 4 slots...'

-- S_race: 5/6 filled for Proof 6 race. Sat 2026-07-11 18:00 CDT
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES ('cole-park', 'pickleball', :'owner_id'::uuid,
        '2026-07-11 18:00:00-05:00', '2026-07-11 20:00:00-05:00', 6, 'intermediate')
RETURNING id AS s_race_id
\gset

-- S_promote: 6/6 full + waitlist for Proof 7. Sat 2026-07-18 18:00 CDT
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES ('cole-park', 'pickleball', :'owner_id'::uuid,
        '2026-07-18 18:00:00-05:00', '2026-07-18 20:00:00-05:00', 6, 'intermediate')
RETURNING id AS s_promote_id
\gset

-- S_conflict: same Dallas day as S_promote (2026-07-18), used to D9-block Maria/Uma
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES ('churchill-park', 'pickleball', :'owner_id'::uuid,
        '2026-07-18 14:00:00-05:00', '2026-07-18 16:00:00-05:00', 6, 'intermediate')
RETURNING id AS s_conflict_id
\gset

-- S_drift: Proof 8 drift slot. Sat 2026-07-25 18:00 CDT
INSERT INTO public.slots (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES ('cole-park', 'pickleball', :'owner_id'::uuid,
        '2026-07-25 18:00:00-05:00', '2026-07-25 20:00:00-05:00', 6, 'intermediate')
RETURNING id AS s_drift_id
\gset

\echo 'Pre-filling S_race (5/6 joined: Alice, Bob, Charlie, Dana, Eve)...'

INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'alice_id'::uuid,   :'s_race_id'::uuid, 'joined', '2026-07-11');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'bob_id'::uuid,     :'s_race_id'::uuid, 'joined', '2026-07-11');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'charlie_id'::uuid, :'s_race_id'::uuid, 'joined', '2026-07-11');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'dana_id'::uuid,    :'s_race_id'::uuid, 'joined', '2026-07-11');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'eve_id'::uuid,     :'s_race_id'::uuid, 'joined', '2026-07-11');

\echo 'Verifying S_race member_count (EXPECTED: 5):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_race_id'::uuid;

\echo 'Pre-filling S_promote (6 joined + 2 waitlisted + Maria D9-blocked)...'

INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'alice_id'::uuid,   :'s_promote_id'::uuid, 'joined', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'bob_id'::uuid,     :'s_promote_id'::uuid, 'joined', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'charlie_id'::uuid, :'s_promote_id'::uuid, 'joined', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'dana_id'::uuid,    :'s_promote_id'::uuid, 'joined', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'eve_id'::uuid,     :'s_promote_id'::uuid, 'joined', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'frank_id'::uuid,   :'s_promote_id'::uuid, 'joined', '2026-07-18');
-- Waitlist: Maria first (earlier created_at), Tom second
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'maria_id'::uuid,   :'s_promote_id'::uuid, 'waitlisted', '2026-07-18');
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'tom_id'::uuid,     :'s_promote_id'::uuid, 'waitlisted', '2026-07-18');
-- D9-block Maria: joined on S_conflict, same Dallas day
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'maria_id'::uuid,   :'s_conflict_id'::uuid, 'joined', '2026-07-18');

\echo 'Verifying S_promote (EXPECTED: member_count=6, waitlist_count=2):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_promote_id'::uuid;

\echo 'Pre-filling S_drift (1 joined: Frank)...'

INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
VALUES (:'frank_id'::uuid, :'s_drift_id'::uuid, 'joined', '2026-07-25');

\echo 'Verifying S_drift (EXPECTED: member_count=1, waitlist_count=0):'
SELECT member_count, waitlist_count FROM public.slots WHERE id = :'s_drift_id'::uuid;

\echo 'Persisting IDs to phase3b_test_state...'

INSERT INTO public.phase3b_test_state (key, value) VALUES
    ('s_race_id',     :'s_race_id'),
    ('s_promote_id',  :'s_promote_id'),
    ('s_conflict_id', :'s_conflict_id'),
    ('s_drift_id',    :'s_drift_id'),
    ('owner_id',      :'owner_id'),
    ('alice_id',      :'alice_id'),
    ('bob_id',        :'bob_id'),
    ('charlie_id',    :'charlie_id'),
    ('dana_id',       :'dana_id'),
    ('eve_id',        :'eve_id'),
    ('eve_auth_id',   :'eve_auth_id'),
    ('frank_id',      :'frank_id'),
    ('frank_auth_id', :'frank_auth_id'),
    ('grace_id',      :'grace_id'),
    ('grace_auth_id', :'grace_auth_id'),
    ('henry_id',      :'henry_id'),
    ('henry_auth_id', :'henry_auth_id'),
    ('maria_id',      :'maria_id'),
    ('tom_id',        :'tom_id'),
    ('uma_id',        :'uma_id'),
    ('uma_auth_id',   :'uma_auth_id');

\echo 'State table populated. Verifying row count (EXPECTED: 21):'
SELECT count(*) AS state_rows FROM public.phase3b_test_state;

\echo 'Seeded IDs summary:'
SELECT key, value FROM public.phase3b_test_state ORDER BY key;

\echo '=== PHASE 3B SETUP COMPLETE ==='
