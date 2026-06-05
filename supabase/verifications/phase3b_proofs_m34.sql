-- ================================================================
-- M3.4 Verification Proofs: slots.skill_level
-- Proofs 16a, 16b, 16c
--
-- LOCAL VERIFICATION ONLY. Run as the last step of the full battery:
--   supabase db reset
--   phase3a_proofs.sql
--   phase3b_setup.sql
--   phase3b_session1.sql + phase3b_session2.sql  (P6 race)
--   phase3b_proofs.sql
--   phase3b_proofs_d10.sql
--   phase3b_proofs_d11.sql
--   phase3b_setup_claim_race.sql
--   phase3b_session_claim_race1.sql + phase3b_session_claim_race2.sql
--   phase3b_proofs_d2.sql
--   phase3b_proofs_m34.sql   <- this file
--
-- Three proofs:
--   16a: all four valid tiers can be inserted (beginner, advanced_beginner,
--        intermediate, advanced)
--   16b: an invalid tier ('pro') is rejected by slots_skill_level_valid CHECK
--   16c: slot_share_preview returns the correct skill_level column value
-- ================================================================

\set ON_ERROR_ROLLBACK on
\timing

\echo ''
\echo '=== M3.4 PROOFS: slots.skill_level column + constraint + slot_share_preview ==='

-- Resolve owner id from the migration seed row
SELECT id AS owner_id FROM public.users WHERE role = 'owner' LIMIT 1
\gset

-- ---------------------------------------------------------------
-- PROOF 16a -- all four valid tiers accept on INSERT
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 16a: all four valid skill_level tiers accept ==='

\echo 'P16a-1: INSERT skill_level=beginner (EXPECTED: success):'
INSERT INTO public.slots
    (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-08-01 08:00:00-05:00', '2026-08-01 10:00:00-05:00', 4, 'beginner'
)
RETURNING id AS s_beginner_id, skill_level AS sl_beginner
\gset

\echo 'P16a-2: INSERT skill_level=advanced_beginner (EXPECTED: success):'
INSERT INTO public.slots
    (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-08-02 08:00:00-05:00', '2026-08-02 10:00:00-05:00', 4, 'advanced_beginner'
)
RETURNING id AS s_adv_beginner_id, skill_level AS sl_adv_beginner
\gset

\echo 'P16a-3: INSERT skill_level=intermediate (EXPECTED: success):'
INSERT INTO public.slots
    (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-08-03 08:00:00-05:00', '2026-08-03 10:00:00-05:00', 4, 'intermediate'
)
RETURNING id AS s_intermediate_id, skill_level AS sl_intermediate
\gset

\echo 'P16a-4: INSERT skill_level=advanced (EXPECTED: success):'
INSERT INTO public.slots
    (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
VALUES (
    'cole-park', 'pickleball', :'owner_id'::uuid,
    '2026-08-04 08:00:00-05:00', '2026-08-04 10:00:00-05:00', 4, 'advanced'
)
RETURNING id AS s_advanced_id, skill_level AS sl_advanced
\gset

\echo 'P16a-SUMMARY: all four rows exist in slots (EXPECTED: 4 rows, one per tier):'
SELECT skill_level
FROM public.slots
WHERE starts_at BETWEEN '2026-08-01' AND '2026-08-05'
ORDER BY skill_level;

\echo 'PROOF 16a COMPLETE.'
\echo 'EXPECTED: four rows returned -- advanced, advanced_beginner, beginner, intermediate'

-- ---------------------------------------------------------------
-- PROOF 16b -- invalid tier 'pro' rejected by CHECK constraint
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 16b: invalid tier pro rejected by slots_skill_level_valid CHECK ==='

\echo 'P16b: attempt INSERT with skill_level=pro (EXPECTED: check_violation caught):'
DO $$
BEGIN
    INSERT INTO public.slots
        (venue_id, sport_id, created_by, starts_at, ends_at, capacity, skill_level)
    VALUES (
        'cole-park', 'pickleball',
        (SELECT id FROM public.users WHERE role = 'owner' LIMIT 1),
        '2026-08-05 08:00:00-05:00', '2026-08-05 10:00:00-05:00', 4, 'pro'
    );
    RAISE EXCEPTION 'P16b_TEST_FAIL: INSERT with pro should have been rejected but succeeded';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'P16b: PASS -- CHECK violation raised as expected (SQLSTATE 23514)';
    WHEN others THEN
        RAISE EXCEPTION 'P16b_TEST_FAIL: unexpected exception SQLSTATE=% MSG=%',
            SQLSTATE, SQLERRM;
END;
$$;

\echo 'P16b-CONFIRM: no pro row exists (EXPECTED: 0):'
SELECT count(*) AS pro_count
FROM public.slots
WHERE skill_level = 'pro';

\echo 'PROOF 16b COMPLETE.'
\echo 'EXPECTED: PASS notice from DO block, pro_count=0'

-- ---------------------------------------------------------------
-- PROOF 16c -- slot_share_preview returns skill_level + ends_at
-- (M3.5: ends_at was already present from the base migration;
--  this assertion confirms it survives across migrations.)
-- ---------------------------------------------------------------
\echo ''
\echo '=== PROOF 16c: slot_share_preview returns skill_level + ends_at columns ==='

\echo 'P16c: slot_share_preview on the intermediate slot:'
\echo 'EXPECTED: skill_level=intermediate, ends_at=2026-08-03T13:00:00Z (10:00 CDT)'
SELECT venue_name, starts_at, ends_at, skill_level
FROM public.slot_share_preview(:'s_intermediate_id'::uuid);

\echo 'P16c-anon: same call as anon role (EXPECTED: ends_at + skill_level -- grants preserved):'
BEGIN;
SET LOCAL ROLE anon;
SELECT starts_at, ends_at, skill_level
FROM public.slot_share_preview(:'s_intermediate_id'::uuid);
COMMIT;

\echo 'P16c-authenticated: same call as authenticated (EXPECTED: ends_at + skill_level):'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
SELECT starts_at, ends_at, skill_level
FROM public.slot_share_preview(:'s_intermediate_id'::uuid);
COMMIT;

\echo 'PROOF 16c COMPLETE.'
\echo 'EXPECTED: starts_at/ends_at/skill_level all returned for service-role, anon, authenticated'

\echo ''
\echo '=== ALL M3.4/M3.5 PROOFS COMPLETE ==='
\echo 'Proof 16a: all four valid tiers accepted.                         EXPECTED: PASS'
\echo 'Proof 16b: pro tier rejected by CHECK constraint.                 EXPECTED: PASS'
\echo 'Proof 16c: slot_share_preview returns ends_at + skill_level.      EXPECTED: PASS'
