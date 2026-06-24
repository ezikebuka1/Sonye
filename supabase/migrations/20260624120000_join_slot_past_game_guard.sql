-- D19: join_slot past-game guard + started terminal state.
-- Surgical CREATE OR REPLACE of public.join_slot: adds ONE absolute-time guard
-- rejecting a join to a started/ended game (starts_at <= now()), placed AFTER
-- the cancelled check and BEFORE the D9 civil-date derivation. Reads the
-- already-locked v_starts_at (no second SELECT, no ::date, no AT TIME ZONE) —
-- fully orthogonal to the D9 civil-date logic. Body byte-identical elsewhere.
-- See memory-bank/decisions/D19-join-slot-past-game-guard.md.

CREATE OR REPLACE FUNCTION public.join_slot(p_slot_id uuid)
RETURNS TABLE (membership_id uuid, resulting_status text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id    uuid;
    v_starts_at  timestamptz;
    v_cancelled  timestamptz;
    v_capacity   int;
    v_member_cnt int;
    v_slot_date  date;
    v_status     text;
    v_new_id     uuid;
BEGIN
    v_user_id := public.current_user_id();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'join_slot: not authenticated'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- R6/R7: lock slot row FIRST (serializes last-seat race).
    SELECT starts_at, cancelled_at, capacity, member_count
      INTO v_starts_at, v_cancelled, v_capacity, v_member_cnt
    FROM public.slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'join_slot: slot % not found', p_slot_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_cancelled IS NOT NULL THEN
        RAISE EXCEPTION 'join_slot: slot % is cancelled', p_slot_id
            USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

    -- Past-game guard: a started/ended game is terminal — not joinable.
    -- Absolute-instant check (timestamptz vs now()); orthogonal to the
    -- civil-date D9 logic below, which it must precede and not touch.
    IF v_starts_at <= now() THEN
        RAISE EXCEPTION 'join_slot: slot % has already started', p_slot_id
            USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

    -- *** R2 RED-FLAG LINE: Dallas civil date, NOT UTC ***
    v_slot_date := (v_starts_at AT TIME ZONE 'America/Chicago')::date;

    -- D9 pre-check (clean error; index is the hard backstop)
    IF EXISTS (
        SELECT 1 FROM public.session_memberships
        WHERE user_id = v_user_id
          AND slot_date = v_slot_date
          AND status = 'joined'
    ) THEN
        RAISE EXCEPTION
            'join_slot: D9 violation — already joined a game on %',
            v_slot_date
            USING ERRCODE = 'unique_violation';
    END IF;

    -- Double-active pre-check (clean error; index backstops)
    IF EXISTS (
        SELECT 1 FROM public.session_memberships
        WHERE user_id = v_user_id
          AND slot_id = p_slot_id
          AND status IN ('joined','waitlisted')
    ) THEN
        RAISE EXCEPTION
            'join_slot: already active in slot %', p_slot_id
            USING ERRCODE = 'unique_violation';
    END IF;

    -- Capacity decision under the lock
    IF v_member_cnt < v_capacity THEN
        v_status := 'joined';
    ELSE
        v_status := 'waitlisted';
    END IF;

    INSERT INTO public.session_memberships
        (user_id, slot_id, status, slot_date)
    VALUES
        (v_user_id, p_slot_id, v_status, v_slot_date)
    RETURNING id INTO v_new_id;

    RETURN QUERY SELECT v_new_id, v_status;

-- *** 3.8.4 FIX: convert a concurrent cross-slot index
-- collision into the SAME clean error the sequential
-- pre-check path produces (one logical condition, one
-- message). Unanticipated unique violations fail loud. ***
EXCEPTION WHEN unique_violation THEN
    IF SQLERRM LIKE '%sm_d9_one_joined_per_day%' THEN
        RAISE EXCEPTION
            'join_slot: D9 violation — already joined a game on %',
            v_slot_date
            USING ERRCODE = 'unique_violation';
    ELSIF SQLERRM LIKE '%sm_prevent_double_active%' THEN
        RAISE EXCEPTION
            'join_slot: already active in slot %', p_slot_id
            USING ERRCODE = 'unique_violation';
    ELSE
        RAISE;
    END IF;
END;
$$;

-- Re-assert the D17 grant matrix (CREATE OR REPLACE preserves existing grants,
-- but re-state explicitly to keep this function REVOKE/GRANT-controlled).
REVOKE EXECUTE ON FUNCTION public.join_slot(p_slot_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_slot(p_slot_id uuid) TO authenticated;
