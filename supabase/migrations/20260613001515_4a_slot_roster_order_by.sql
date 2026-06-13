-- =============================================================
-- 4A-pre: deterministic ordering in slot_roster (ruling G1)
-- Source: Phase 4A Architect ruling sheet (micro-dispatch 4A-pre)
-- Applies AFTER: 20260610120000_fix_signup_claim_jwt_phone.sql
--
-- slot_roster had NO ORDER BY — row order was unspecified, but the
-- lobby's waitlist ordinals ("you're Nth in line") require a stable,
-- meaningful order. Body is byte-identical to the base definition
-- (20260520044919, M3.1 phone projection) with ONE addition: the
-- final ORDER BY — joined block first, then FIFO by created_at,
-- sm.id as tiebreak for equal timestamps. Return shape UNCHANGED,
-- so CREATE OR REPLACE suffices (no DROP; grants preserved).
-- =============================================================

CREATE OR REPLACE FUNCTION public.slot_roster(target_slot uuid)
RETURNS TABLE (
    membership_id uuid,
    first_name text,
    gender text,
    phone text,
    status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT
        sm.id,
        u.first_name,
        u.gender,
        CASE
            WHEN sm.status = 'joined'
                 AND (public.is_joined_member(target_slot)
                      OR public.is_owner())
            THEN u.phone
            ELSE NULL
        END AS phone,
        sm.status
    FROM public.session_memberships sm
    JOIN public.users u ON u.id = sm.user_id
    WHERE sm.slot_id = target_slot
      AND sm.status IN ('joined','waitlisted')
      AND (public.is_active_member(target_slot)
           OR public.is_owner())
    ORDER BY (sm.status = 'joined') DESC, sm.created_at ASC, sm.id ASC
$$;

-- Re-assert grants (CREATE OR REPLACE preserves existing grants,
-- but explicit re-grant confirms authenticated-only EXECUTE — anon
-- must never read the roster)
REVOKE ALL ON FUNCTION public.slot_roster(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_roster(uuid) TO authenticated;
