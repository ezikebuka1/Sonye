-- ================================================================
-- Phase 3B Claim Race Setup — seeds Proof 15 fixture
-- Must run BEFORE phase3b_session_claim_race1.sql and
-- phase3b_session_claim_race2.sql.
-- ================================================================

\set ON_ERROR_ROLLBACK on

\echo '=== CLAIM RACE SETUP: seeding Proof 15 pre-claim fixture ==='

\echo 'Inserting WaitlistRacer (phone +15555550055, claim_token 55555555-...):'
INSERT INTO public.users (phone, first_name, last_name, skill_level, claim_token)
VALUES (
    '+15555550055',
    'WaitlistRacer',
    'Test',
    'intermediate',
    '55555555-5555-5555-5555-555555555555'
)
RETURNING id AS p15_user_id
\gset

\echo 'P15-SEED: WaitlistRacer pre-state (EXPECTED: auth_user_id=NULL, claim_token IS NOT NULL):'
SELECT id,
       phone,
       first_name,
       auth_user_id IS NULL     AS auth_unbound,
       claim_token   IS NOT NULL AS token_present
FROM   public.users WHERE id = :'p15_user_id'::uuid;

\echo '=== CLAIM RACE SETUP COMPLETE ==='
\echo 'WaitlistRacer seeded. Run phase3b_session_claim_race1.sql and'
\echo 'phase3b_session_claim_race2.sql concurrently next.'
