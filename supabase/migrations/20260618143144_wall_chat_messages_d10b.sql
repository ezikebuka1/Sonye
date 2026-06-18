-- ============================================================
-- D10 Amendment B — Lobby Wall (in-app coordination).
-- Source: Phase 5 Architect dispatch (Lobby Wall schema, D10-B).
-- Amendment doc: 001d566.
--
-- Resurrect chat_messages as the lobby "wall". Three changes, all
-- tightenings — schema-only, no data:
--
--   (a) NARROW the audience from is_active_member → is_joined_member
--       on BOTH policies. Under the old predicate a WAITLISTED player
--       could read AND post to the wall; the wall is for the people
--       actually in the game, so it is now JOINED-only (owner still
--       reads via the is_owner() disjunct on SELECT).
--
--   (b) Owner-delete via SECURITY DEFINER RPC. There is deliberately
--       no DELETE policy on the table (players cannot delete; messages
--       are immutable to them). owner_delete_message mirrors
--       cancel_slot / kick_member: is_owner() gate raising the same
--       'owner only' / insufficient_privilege so the app's error
--       mapping stays consistent. SECURITY DEFINER bypasses the absent
--       DELETE policy — the RPC is the ONLY delete path.
--
--   (c) Defense-in-depth: REVOKE anon's INSERT/UPDATE/DELETE. RLS
--       already blocks anon (both policies are TO authenticated), but
--       the table still carries the blanket anon write grants from the
--       initial migration; strip them so anon cannot write even if a
--       future policy slip-up re-opens the door.
--
-- Migration-order note: chat_messages and all three helpers
-- (is_joined_member, is_owner, current_user_id) already exist — this
-- file only ALTERs policies and adds one function. No ordering trap.
-- ============================================================

-- ------------------------------------------------------------
-- (a) Swap the audience predicate off is_active_member onto
--     is_joined_member on both policies. The insert policy keeps its
--     user_id = current_user_id() self-write clause; SELECT keeps the
--     is_owner() disjunct.
-- ------------------------------------------------------------
ALTER POLICY chat_select_member_or_owner ON public.chat_messages
    USING (public.is_joined_member(slot_id) OR public.is_owner());

ALTER POLICY chat_insert_member_self ON public.chat_messages
    WITH CHECK (public.is_joined_member(slot_id)
                AND user_id = public.current_user_id());

-- ------------------------------------------------------------
-- (b) Owner-delete RPC. Mirrors cancel_slot / kick_member: SECURITY
--     DEFINER, search_path = '', is_owner() gate raising
--     'owner only' / insufficient_privilege. Idempotent: deleting a
--     missing/already-gone id affects 0 rows and still returns true.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_delete_message(p_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'owner only' USING ERRCODE = 'insufficient_privilege';
    END IF;

    DELETE FROM public.chat_messages WHERE id = p_message_id;  -- idempotent: 0 rows → true
    RETURN true;
END;
$$;

REVOKE ALL    ON FUNCTION public.owner_delete_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_delete_message(uuid) TO authenticated;

-- ------------------------------------------------------------
-- (c) Defense-in-depth: strip anon's write grants on the wall.
-- ------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.chat_messages FROM anon;
