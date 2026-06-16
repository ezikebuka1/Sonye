-- ============================================================
-- D14 — owner cancel-slot mechanics (Phase 5 Dispatch 1).
--
-- Today the ONLY way to cancel a slot is a raw owner RLS UPDATE that sets
-- cancelled_at. That orphans memberships: joined members stay 'joined' (their
-- D9 same-day cap stays locked), member_count / waitlist_count stay stale (the
-- count trigger fires only on membership *status* changes), and the D11
-- attendance cron still texts them for a game that never happened.
--
-- Fix (Option A, per D14): a cancel_slot RPC that flips every active membership
-- to 'left' (the trigger then zeroes counts and the cap frees), plus a
-- column-privilege INVERSION that makes the RPC the only path able to write
-- cancelled_at / cancellation_reason.
--
-- R3 migration-order note: cancel_slot references slots + session_memberships,
-- both created in the initial migration — no ordering trap in a new file.
-- ============================================================

-- ------------------------------------------------------------
-- (a) EXTEND leave_reason_code: add the cancel-only 'slot_cancelled' code.
--     A CHECK can't be amended in place — DROP then re-ADD with it appended.
--     leave_slot is NOT touched: its function-level allow-list already excludes
--     'slot_cancelled' exactly as it excludes 'kicked_by_owner', so a player can
--     never self-assign the cancel code.
-- ------------------------------------------------------------
ALTER TABLE public.session_memberships
    DROP CONSTRAINT sm_leave_reason_code_valid;

ALTER TABLE public.session_memberships
    ADD CONSTRAINT sm_leave_reason_code_valid
        CHECK (
            leave_reason_code IN (
                'schedule_conflict','injured','found_other_game',
                'no_longer_available','kicked_by_owner','other','slot_cancelled'
            )
            OR leave_reason_code IS NULL
        );

-- ------------------------------------------------------------
-- (b) cancel_slot RPC. Mirrors kick_member's structure; the ONE deliberate
--     divergence is that it does NOT call promote_from_waitlist (the slot is
--     dead).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_slot(
    p_slot_id             uuid,
    p_cancellation_reason text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cancelled timestamptz;
BEGIN
    -- Owner-only (mirrors kick_member).
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'cancel_slot: owner only'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Reason required: reject NULL/blank with a clean error, BEFORE it can fall
    -- through to a slots_cancellation_consistency CHECK violation.
    IF p_cancellation_reason IS NULL
       OR btrim(p_cancellation_reason) = '' THEN
        RAISE EXCEPTION 'cancel_slot: cancellation reason required'
            USING ERRCODE = 'check_violation';
    END IF;

    -- R6: lock the parent slot FIRST, before any membership write.
    SELECT cancelled_at
      INTO v_cancelled
    FROM public.slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'cancel_slot: slot % not found', p_slot_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Double-cancel guard.
    IF v_cancelled IS NOT NULL THEN
        RAISE EXCEPTION 'cancel_slot: slot % already cancelled', p_slot_id
            USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

    -- Cancel the slot (cancelled_at + reason set together → satisfies
    -- slots_cancellation_consistency).
    UPDATE public.slots
    SET cancelled_at        = now(),
        cancellation_reason = p_cancellation_reason
    WHERE id = p_slot_id;

    -- Transition every STILL-ACTIVE membership to 'left'. The status IN (...)
    -- filter is LOAD-BEARING: it must NOT touch rows already 'left' (preserve a
    -- legitimate earlier leaver's left_at / reason). Each row's status change
    -- fires trg_sync_slot_counts; the slot lock is already held (R7 re-entrant
    -- no-op), so member_count + waitlist_count drive to 0.
    UPDATE public.session_memberships
    SET status            = 'left',
        left_at           = now(),
        leave_reason_code = 'slot_cancelled',
        leave_reason_note = NULL
    WHERE slot_id = p_slot_id
      AND status IN ('joined','waitlisted');

    -- NO promote_from_waitlist — the slot is dead. (The deliberate divergence
    -- from leave_slot / kick_member.)

    RETURN true;
END;
$$;

REVOKE ALL    ON FUNCTION public.cancel_slot(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_slot(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- (c) RLS HARDENING — close the raw-cancel path.
--
--     Postgres column-privilege mechanic: you CANNOT subtract a column from a
--     blanket table grant — REVOKE UPDATE (cancelled_at) on a table-level grant
--     is a silent no-op. To get per-column control you must INVERT: revoke the
--     table-level UPDATE, then GRANT UPDATE on exactly the allowed columns.
--
--     Granted = the owner-editable CONTENT columns. OMITTED:
--       - cancelled_at, cancellation_reason   → RPC-only now (cancel_slot)
--       - member_count, waitlist_count        → trigger-managed, never client-written
--       - id, created_by, created_at          → identity/audit, never client-written
--
--     cancel_slot is SECURITY DEFINER (runs as table owner) and BYPASSES this
--     column grant — it stays the only path that can write cancelled_at.
-- ------------------------------------------------------------
REVOKE UPDATE ON public.slots FROM authenticated;

GRANT UPDATE (
    venue_id,
    sport_id,
    starts_at,
    ends_at,
    capacity,
    gender_category,
    skill_level
) ON public.slots TO authenticated;

-- Replace slots_update_owner: drop the cancelled_at disjunct (the raw-cancel
-- path is gone). Non-empty slots are otherwise immutable (R1).
DROP POLICY slots_update_owner ON public.slots;

CREATE POLICY slots_update_owner ON public.slots
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (
        public.is_owner()
        AND member_count = 0
    );
