-- ============================================================
-- D10 Amendment B — Lobby Wall author reader (slot_wall).
-- Source: Phase 5 Architect dispatch (Lobby Wall UI, D10-B).
--
-- WHY THIS EXISTS (gap found at pre-flight): the wall UI must label
-- each message with its author. chat_messages carries user_id; the
-- lobby's only peer-name source is slot_roster (SECURITY DEFINER),
-- which returns membership_id, NOT user_id — nothing to match on. And
-- a joined NON-owner cannot bridge the two by hand:
--   • session_memberships SELECT = (user_id = current_user_id())
--     OR is_owner()  → sees only their OWN membership row.
--   • users SELECT           = (auth_user_id = auth.uid())
--     OR is_owner()  → reads only their OWN name.
-- So without a definer reader a joined player could resolve only
-- "You"; every peer would fall back to "Player". slot_wall closes
-- that gap the same way slot_roster does — one SECURITY DEFINER read,
-- gated to the SAME audience as the chat SELECT policy.
--
-- Mirrors slot_roster EXACTLY: LANGUAGE sql, STABLE, SECURITY DEFINER,
-- SET search_path = '', REVOKE…PUBLIC / GRANT EXECUTE…authenticated.
-- READ-ONLY: no table change, no data, no policy change. The chat
-- write/delete boundary is untouched (RLS + owner_delete_message).
--
-- Gate note: SECURITY DEFINER bypasses RLS, so the audience predicate
-- (is_joined_member OR is_owner) lives in the WHERE clause — it is row-
-- independent, so a caller who is neither joined nor owner gets 0 rows
-- (never another slot's messages). is_owner()/current_user_id() read
-- the CALLER's auth context even inside the definer body.
-- ============================================================

CREATE OR REPLACE FUNCTION public.slot_wall(target_slot uuid)
RETURNS TABLE(
    message_id        uuid,
    body              text,
    created_at        timestamptz,
    author_id         uuid,
    author_first_name text,
    author_gender     text,
    is_host           boolean,
    is_self           boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT
        cm.id,
        cm.body,
        cm.created_at,
        cm.user_id,
        u.first_name,
        u.gender,
        (cm.user_id = s.created_by)             AS is_host,   -- author created the slot
        (cm.user_id = public.current_user_id()) AS is_self
    FROM public.chat_messages cm
    JOIN public.users u ON u.id = cm.user_id
    JOIN public.slots s ON s.id = cm.slot_id
    WHERE cm.slot_id = target_slot
      AND (public.is_joined_member(target_slot) OR public.is_owner())
    ORDER BY cm.created_at ASC, cm.id ASC
$$;

REVOKE ALL    ON FUNCTION public.slot_wall(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_wall(uuid) TO authenticated;
