-- =============================================================
-- D10 Amendment A: redact peer phone in slot_roster to owner-only
-- Source: Phase 5 Architect dispatch (Phone Redaction, D10-A)
-- Applies AFTER: 20260613001515_4a_slot_roster_order_by.sql
--
-- Closes the M5+D9 number-harvesting hole: the original D10 reveal
-- ("joined members see each other's phones") let any joined player
-- harvest every co-member's number. D10-A narrows the phone
-- projection to the slot OWNER only. Players still see the full
-- roster (names, avatars, status) — only the phone column is
-- redacted (NULL) for non-owner callers.
--
-- Body is byte-identical to 20260613001515 (the prior definition)
-- with ONE change: the phone CASE drops the `is_joined_member`
-- disjunct, leaving `is_owner()` as the sole reveal predicate.
-- Return shape UNCHANGED, so CREATE OR REPLACE suffices (no DROP).
-- Security boundary lives HERE (the RPC): a non-owner caller never
-- receives a peer's phone, so there is nothing for the UI to leak.
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
                 AND public.is_owner()
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
