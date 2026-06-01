-- =============================================================
-- M3 Initial Schema Migration
-- Source: memory-bank/decisions/D3-database-schema.md (d64fc59)
-- Order per PART 10 (load-bearing — do not reorder):
--   1. pgcrypto
--   2. Tables in FK order + indexes (Part 4)
--   3. Helper fns (Part 5)
--   4. Read fns (Part 6)
--   5. Transaction fns + trigger (Part 7)
--   6. RLS ENABLE + policies (Part 8)
--   7. Grants matrix (Part 9)
--   8. Seed (Part 11)
-- NOT YET APPLIED — Phase 3 applies and verifies.
-- =============================================================

-- 1. Extension ---------------------------------------------------

create extension if not exists pgcrypto;

-- 2. Tables in FK order + indexes (Part 4) -----------------------

-- 4.1 metros, sports

CREATE TABLE metros (
    id          text        PRIMARY KEY,
    name        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT metros_id_slug_format  CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT metros_name_unique     UNIQUE (name)
);

CREATE TABLE sports (
    id          text        PRIMARY KEY,
    name        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sports_id_slug_format  CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT sports_name_unique     UNIQUE (name)
);

-- 4.2 venues

CREATE TABLE venues (
    id            text        PRIMARY KEY,
    metro_id      text        NOT NULL REFERENCES metros(id) ON DELETE RESTRICT,
    name          text        NOT NULL,
    neighborhood  text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT venues_id_slug_format  CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT venues_name_unique     UNIQUE (name)
);
CREATE INDEX venues_metro_id_idx ON venues (metro_id);

-- 4.3 users

CREATE TABLE users (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id            uuid        UNIQUE,
    phone                   text        NOT NULL UNIQUE,
    claim_token             uuid        NULL,
    first_name              text        NOT NULL,
    last_name               text,
    skill_level             text        NOT NULL,
    gender                  text,
    general_availability    jsonb,
    preferred_venues        jsonb,
    willing_to_drive        text,
    role                    text        NOT NULL DEFAULT 'player',
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_phone_e164_format
        CHECK (phone ~ '^\+[1-9]\d{1,14}$'),
    CONSTRAINT users_skill_level_valid
        CHECK (skill_level IN ('beginner','advanced_beginner','intermediate','advanced')),
    CONSTRAINT users_gender_valid
        CHECK (gender IN ('woman','man','non_binary','prefer_not_to_say') OR gender IS NULL),
    CONSTRAINT users_willing_to_drive_valid
        CHECK (willing_to_drive IN ('under_20','flexible','wont_drive') OR willing_to_drive IS NULL),
    CONSTRAINT users_role_valid
        CHECK (role IN ('player','owner'))
);
CREATE INDEX users_auth_user_id_idx ON users (auth_user_id);
CREATE UNIQUE INDEX users_claim_token_unique
  ON public.users (claim_token)
  WHERE claim_token IS NOT NULL;

-- 4.4 slots

CREATE TABLE slots (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id             text        NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    sport_id             text        NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    created_by           uuid        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
    starts_at            timestamptz NOT NULL,
    ends_at              timestamptz NOT NULL,
    cancelled_at         timestamptz,
    cancellation_reason  text,
    capacity             int         NOT NULL,
    gender_category      text        NOT NULL DEFAULT 'open',
    member_count         int         NOT NULL DEFAULT 0,
    waitlist_count       int         NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT slots_ends_after_starts
        CHECK (ends_at > starts_at),
    CONSTRAINT slots_capacity_valid
        CHECK (capacity IN (4, 6)),
    CONSTRAINT slots_gender_category_valid
        CHECK (gender_category IN ('open','women','men')),
    CONSTRAINT slots_cancellation_consistency
        CHECK (
            (cancelled_at IS NULL AND cancellation_reason IS NULL)
            OR
            (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
        ),
    CONSTRAINT slots_counts_nonnegative
        CHECK (member_count >= 0 AND waitlist_count >= 0),
    CONSTRAINT slots_member_count_within_capacity
        CHECK (member_count <= capacity)
);
CREATE INDEX slots_venue_id_idx   ON slots (venue_id);
CREATE INDEX slots_starts_at_idx  ON slots (starts_at);
CREATE INDEX slots_created_by_idx ON slots (created_by);

-- 4.5 session_memberships

CREATE TABLE session_memberships (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slot_id            uuid        NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
    status             text        NOT NULL,
    slot_date          date        NOT NULL,
    attended           boolean,
    left_at            timestamptz,
    leave_reason_code  text,
    leave_reason_note  text,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    attendance_token             uuid          NULL,
    attendance_token_expires_at  timestamptz   NULL,
    CONSTRAINT sm_status_valid
        CHECK (status IN ('joined','waitlisted','left')),
    CONSTRAINT sm_leave_reason_code_valid
        CHECK (
            leave_reason_code IN (
                'schedule_conflict','injured','found_other_game',
                'no_longer_available','kicked_by_owner','other'
            )
            OR leave_reason_code IS NULL
        ),
    CONSTRAINT sm_left_consistency
        CHECK (
            (status = 'left'  AND left_at IS NOT NULL AND leave_reason_code IS NOT NULL)
            OR
            (status <> 'left' AND left_at IS NULL AND leave_reason_code IS NULL
                              AND leave_reason_note IS NULL)
        )
);
CREATE UNIQUE INDEX sm_d9_one_joined_per_day
    ON session_memberships (user_id, slot_date)
    WHERE status = 'joined';
CREATE UNIQUE INDEX sm_prevent_double_active
    ON session_memberships (user_id, slot_id)
    WHERE status IN ('joined','waitlisted');
CREATE INDEX sm_slot_id_status_idx ON session_memberships (slot_id, status);
CREATE INDEX sm_user_id_idx        ON session_memberships (user_id);
CREATE UNIQUE INDEX sm_attendance_token_unique
    ON session_memberships (attendance_token)
    WHERE attendance_token IS NOT NULL;

-- 4.6 chat_messages

CREATE TABLE chat_messages (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id     uuid        NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chat_messages_body_not_blank
        CHECK (length(btrim(body)) > 0),
    CONSTRAINT chat_messages_body_max_len
        CHECK (length(body) <= 2000)
);
CREATE INDEX chat_messages_slot_id_created_at_idx
    ON chat_messages (slot_id, created_at);

-- 3. Helper functions (Part 5) ----------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = public.current_user_id() AND role = 'owner'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(p_slot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.session_memberships
        WHERE slot_id = p_slot
          AND user_id = public.current_user_id()
          AND status IN ('joined','waitlisted')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_joined_member(p_slot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.session_memberships
        WHERE slot_id = p_slot
          AND user_id = public.current_user_id()
          AND status = 'joined'
    )
$$;

CREATE OR REPLACE FUNCTION public.slot_fill_meets_social_threshold(p_slot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (s.member_count::numeric / NULLIF(s.capacity, 0)) >= 0.5
    FROM public.slots s WHERE s.id = p_slot
$$;

-- 4. Read functions (Part 6) ------------------------------------

CREATE OR REPLACE FUNCTION public.claim_lookups(token uuid)
RETURNS TABLE (first_name text, is_valid boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT
        CASE WHEN u.id IS NOT NULL
             THEN u.first_name ELSE NULL END AS first_name,
        (u.id IS NOT NULL) AS is_valid
    FROM (SELECT 1) dummy
    LEFT JOIN public.users u ON u.claim_token = token
$$;

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
$$;

CREATE OR REPLACE FUNCTION public.slot_share_preview(target_slot uuid)
RETURNS TABLE (
    venue_name text, neighborhood text, sport_name text,
    starts_at timestamptz, ends_at timestamptz, capacity int,
    gender_category text, is_cancelled boolean,
    owner_first_name text, fill_count int, fill_ratio_shown boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT
        v.name, v.neighborhood, sp.name,
        s.starts_at, s.ends_at, s.capacity, s.gender_category,
        (s.cancelled_at IS NOT NULL),
        owner.first_name,
        CASE WHEN public.slot_fill_meets_social_threshold(s.id)
             THEN s.member_count ELSE NULL END,
        public.slot_fill_meets_social_threshold(s.id)
    FROM public.slots s
    JOIN public.venues v     ON v.id = s.venue_id
    JOIN public.sports sp    ON sp.id = s.sport_id
    JOIN public.users  owner ON owner.id = s.created_by
    WHERE s.id = target_slot
$$;

CREATE OR REPLACE FUNCTION public.slot_social_proof(target_slot uuid)
RETURNS TABLE (gender text)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT u.gender
    FROM public.session_memberships sm
    JOIN public.users u ON u.id = sm.user_id
    WHERE sm.slot_id = target_slot
      AND sm.status = 'joined'
      AND public.slot_fill_meets_social_threshold(target_slot)
    ORDER BY sm.created_at ASC
    LIMIT 3
$$;

-- 5. Transaction functions + trigger (Part 7) -------------------

-- 7.1 sync_slot_counts trigger

CREATE OR REPLACE FUNCTION public.sync_slot_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_slot_id      uuid;
    v_member_cnt   int;
    v_waitlist_cnt int;
BEGIN
    v_slot_id := NEW.slot_id;

    PERFORM 1 FROM public.slots WHERE id = v_slot_id FOR UPDATE;

    SELECT
        count(*) FILTER (WHERE status = 'joined'),
        count(*) FILTER (WHERE status = 'waitlisted')
    INTO v_member_cnt, v_waitlist_cnt
    FROM public.session_memberships
    WHERE slot_id = v_slot_id;

    UPDATE public.slots
    SET member_count   = v_member_cnt,
        waitlist_count = v_waitlist_cnt
    WHERE id = v_slot_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_slot_counts
    AFTER INSERT OR UPDATE OF status ON public.session_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_slot_counts();

-- 7.2 signup_claim  [FIX: auth-violation wrappers
--     on steps 1 & 2 — baked in below at *** 3.8.3 FIX *** ]

CREATE OR REPLACE FUNCTION public.signup_claim(
    p_phone                 text,
    p_auth_user_id          uuid,
    p_first_name            text,
    p_skill_level           text,
    p_last_name             text     DEFAULT NULL,
    p_gender                text     DEFAULT NULL,
    p_claim_token           uuid     DEFAULT NULL,
    p_general_availability  jsonb    DEFAULT NULL,
    p_preferred_venues      jsonb    DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF p_phone !~ '^\+[1-9]\d{1,14}$' THEN
        RAISE EXCEPTION 'signup_claim: phone not E.164: %', p_phone
            USING ERRCODE = 'check_violation';
    END IF;

    -- D2 Flow 3 (waitlist claim) — strict match on
    -- claim_token + JWT phone; atomic nullify on bind;
    -- RAISE on mismatch. No expiry, no claimed_at.
    IF p_claim_token IS NOT NULL THEN
      DECLARE
        v_jwt_phone text := auth.jwt() ->> 'phone';
        v_jwt_sub   uuid := (auth.jwt() ->> 'sub')::uuid;
      BEGIN
        UPDATE public.users
           SET auth_user_id = v_jwt_sub,
               claim_token  = NULL
         WHERE claim_token = p_claim_token
           AND phone       = v_jwt_phone
       RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'claim_token_mismatch'
            USING ERRCODE = 'P0001';
        END IF;

        RETURN v_user_id;
      END;
    END IF;

    -- Net-new INSERT path continues below, unchanged.

    -- Step 2: phone + unclaimed (Path A, no usable token)
    SELECT id INTO v_user_id
    FROM public.users
    WHERE phone = p_phone
      AND auth_user_id IS NULL
    FOR UPDATE;

    IF v_user_id IS NOT NULL THEN
        -- *** 3.8.3 FIX: same auth-violation wrapper, step 2 ***
        BEGIN
            UPDATE public.users
            SET auth_user_id = p_auth_user_id,
                first_name   = COALESCE(p_first_name, first_name),
                last_name    = COALESCE(p_last_name,  last_name),
                skill_level  = COALESCE(p_skill_level, skill_level),
                gender       = COALESCE(p_gender,     gender)
            WHERE id = v_user_id;
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION
              'signup_claim: auth identity % already bound to another user (corruption) — phone-unclaimed path',
              p_auth_user_id
              USING ERRCODE = 'unique_violation';
        END;
        RETURN v_user_id;
    END IF;

    -- Step 3: phone + has auth (Path C, returning) — read-only
    SELECT id INTO v_user_id
    FROM public.users
    WHERE phone = p_phone
      AND auth_user_id IS NOT NULL;

    IF v_user_id IS NOT NULL THEN
        RETURN v_user_id;   -- established identity, untouched
    END IF;

    -- Step 4: net-new (Path B)
    BEGIN
        INSERT INTO public.users (
            auth_user_id, phone, first_name, last_name,
            skill_level, gender, general_availability,
            preferred_venues, role
        )
        VALUES (
            p_auth_user_id, p_phone, p_first_name, p_last_name,
            p_skill_level, p_gender, p_general_availability,
            p_preferred_venues, 'player'
        )
        RETURNING id INTO v_user_id;
        RETURN v_user_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_user_id
        FROM public.users WHERE phone = p_phone;
        IF v_user_id IS NULL THEN
            RAISE;   -- violation on something other than phone
        END IF;
        RETURN v_user_id;   -- concurrent net-new race converged
    END;
END;
$$;

-- 7.3 promote_from_waitlist  [FIX: GET
--     DIAGNOSTICS ROW_COUNT guard — *** 3.8.5 FIX *** ]

CREATE OR REPLACE FUNCTION public.promote_from_waitlist(p_slot_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_capacity   int;
    v_member_cnt int;
    v_cand       record;
    v_promoted   uuid := NULL;
    v_rows       int;
BEGIN
    SELECT capacity, member_count
      INTO v_capacity, v_member_cnt
    FROM public.slots
    WHERE id = p_slot_id;     -- already locked by caller (R6)

    IF v_member_cnt >= v_capacity THEN
        RETURN NULL;
    END IF;

    FOR v_cand IN
        SELECT sm.id, sm.user_id, sm.slot_date
        FROM public.session_memberships sm
        WHERE sm.slot_id = p_slot_id
          AND sm.status  = 'waitlisted'
        ORDER BY sm.created_at ASC
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.session_memberships d9
            WHERE d9.user_id  = v_cand.user_id
              AND d9.slot_date = v_cand.slot_date
              AND d9.status    = 'joined'
        ) THEN
            BEGIN
                UPDATE public.session_memberships
                SET status = 'joined'
                WHERE id = v_cand.id
                  AND status = 'waitlisted';
                -- *** 3.8.5 FIX: only treat as promoted if a
                -- row actually changed; a 0-row UPDATE (candidate
                -- concurrently modified) must NOT count — skip
                -- to next candidate instead of false EXIT ***
                GET DIAGNOSTICS v_rows = ROW_COUNT;
                IF v_rows = 1 THEN
                    v_promoted := v_cand.id;
                    EXIT;
                ELSE
                    CONTINUE;
                END IF;
            EXCEPTION WHEN unique_violation THEN
                CONTINUE;   -- D9 index race: skip, try next
            END;
        END IF;
    END LOOP;

    RETURN v_promoted;   -- NULL = nobody eligible = valid success
END;
$$;

-- 7.4 join_slot  [FIX: exception-convert block at
--     end — *** 3.8.4 FIX *** ]

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

-- 7.5 leave_slot

CREATE OR REPLACE FUNCTION public.leave_slot(
    p_slot_id           uuid,
    p_leave_reason_code text,
    p_leave_reason_note text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id    uuid;
    v_membership uuid;
    v_was_joined boolean;
BEGIN
    v_user_id := public.current_user_id();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'leave_slot: not authenticated'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_leave_reason_code NOT IN (
        'schedule_conflict','injured','found_other_game',
        'no_longer_available','other'
    ) THEN
        RAISE EXCEPTION
            'leave_slot: invalid or reserved leave reason: %',
            p_leave_reason_code
            USING ERRCODE = 'check_violation';
    END IF;

    PERFORM 1 FROM public.slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'leave_slot: slot % not found', p_slot_id
            USING ERRCODE = 'no_data_found';
    END IF;

    SELECT id, (status = 'joined')
      INTO v_membership, v_was_joined
    FROM public.session_memberships
    WHERE slot_id = p_slot_id
      AND user_id = v_user_id
      AND status IN ('joined','waitlisted');

    IF v_membership IS NULL THEN
        RAISE EXCEPTION
            'leave_slot: no active membership in slot %', p_slot_id
            USING ERRCODE = 'no_data_found';
    END IF;

    UPDATE public.session_memberships
    SET status            = 'left',
        left_at           = now(),
        leave_reason_code = p_leave_reason_code,
        leave_reason_note = p_leave_reason_note
    WHERE id = v_membership;

    IF v_was_joined THEN
        PERFORM public.promote_from_waitlist(p_slot_id);
    END IF;

    RETURN true;
END;
$$;

-- 7.6 kick_member

CREATE OR REPLACE FUNCTION public.kick_member(
    p_membership_id uuid,
    p_note          text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_slot_id    uuid;
    v_status     text;
    v_was_joined boolean;
BEGIN
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'kick_member: owner only'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Unlocked read of immutable slot_id, THEN slots lock (R6).
    SELECT slot_id, status
      INTO v_slot_id, v_status
    FROM public.session_memberships
    WHERE id = p_membership_id;

    IF v_slot_id IS NULL THEN
        RAISE EXCEPTION
            'kick_member: membership % not found', p_membership_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_status = 'left' THEN
        RAISE EXCEPTION
            'kick_member: membership % already left', p_membership_id
            USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

    PERFORM 1 FROM public.slots WHERE id = v_slot_id FOR UPDATE;

    SELECT (status = 'joined') INTO v_was_joined
    FROM public.session_memberships
    WHERE id = p_membership_id
      AND status IN ('joined','waitlisted');

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'kick_member: membership % no longer active', p_membership_id
            USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;

    UPDATE public.session_memberships
    SET status            = 'left',
        left_at           = now(),
        leave_reason_code = 'kicked_by_owner',
        leave_reason_note = p_note
    WHERE id = p_membership_id;

    IF v_was_joined THEN
        PERFORM public.promote_from_waitlist(v_slot_id);
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.attest_attendance(
    p_token    uuid,
    p_attended boolean
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_membership_id uuid;
    v_already_set   boolean;
BEGIN
    -- Lookup by token; gate on expiry.
    SELECT id, (attended IS NOT NULL)
      INTO v_membership_id, v_already_set
    FROM public.session_memberships
    WHERE attendance_token = p_token
      AND attendance_token_expires_at > now();

    IF v_membership_id IS NULL THEN
        RETURN 'invalid_or_expired';
    END IF;

    -- Idempotent: second tap (including opposite path) is a no-op success.
    IF v_already_set THEN
        RETURN 'success';
    END IF;

    UPDATE public.session_memberships
       SET attended         = p_attended,
           attendance_token = NULL
     WHERE id = v_membership_id;

    RETURN 'success';
END;
$$;

-- 6. RLS ENABLE + policies (Part 8) ----------------------------

-- 8.1 Reference tables

ALTER TABLE metros  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues  ENABLE ROW LEVEL SECURITY;

CREATE POLICY metros_select_authenticated ON metros
    FOR SELECT TO authenticated USING (true);
CREATE POLICY metros_write_owner ON metros
    FOR ALL TO authenticated
    USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY sports_select_authenticated ON sports
    FOR SELECT TO authenticated USING (true);
CREATE POLICY sports_write_owner ON sports
    FOR ALL TO authenticated
    USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY venues_select_authenticated ON venues
    FOR SELECT TO authenticated USING (true);
CREATE POLICY venues_write_owner ON venues
    FOR ALL TO authenticated
    USING (public.is_owner()) WITH CHECK (public.is_owner());

-- 8.2 users

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self_or_owner ON users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_owner());

CREATE POLICY users_update_self ON users
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid()
        AND (role = 'player' OR public.is_owner())
    );
-- NO INSERT policy (rows: service-role seed or signup_claim fn)
-- NO DELETE policy (users never deleted)
-- NO owner UPDATE-others policy (owner read-only on other users)

-- 8.3 slots

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY slots_select_authenticated ON slots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY slots_insert_owner ON slots
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

CREATE POLICY slots_update_owner ON slots
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (
        public.is_owner()
        AND (member_count = 0 OR cancelled_at IS NOT NULL)
    );

CREATE POLICY slots_delete_owner ON slots
    FOR DELETE TO authenticated
    USING (public.is_owner());

-- 8.4 session_memberships

ALTER TABLE session_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_select_self_or_owner ON session_memberships
    FOR SELECT TO authenticated
    USING (
        user_id = public.current_user_id()
        OR public.is_owner()
    );
-- NO client INSERT/UPDATE/DELETE: all writes via SECURITY
-- DEFINER fns (join_slot, leave_slot, kick_member, signup_claim
-- side, promote_from_waitlist). RLS cannot encode procedure.

-- 8.5 chat_messages

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_select_member_or_owner ON chat_messages
    FOR SELECT TO authenticated
    USING (
        public.is_active_member(slot_id)
        OR public.is_owner()
    );

CREATE POLICY chat_insert_member_self ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_active_member(slot_id)
        AND user_id = public.current_user_id()
    );
-- NO UPDATE policy (messages immutable)
-- NO DELETE policy (v1 moderation = kick the person, not
--   delete the message; emergency wipe = service-role)

-- 7. Grants matrix (Part 9) ------------------------------------

REVOKE ALL ON FUNCTION public.current_user_id()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner()                              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_member(uuid)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_joined_member(uuid)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.slot_fill_meets_social_threshold(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_lookups(uuid)                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.slot_roster(uuid)                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.slot_share_preview(uuid)                FROM PUBLIC;
REVOKE ALL ON FUNCTION public.slot_social_proof(uuid)                 FROM PUBLIC;
REVOKE ALL ON FUNCTION public.signup_claim(text,uuid,text,text,text,text,uuid,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_slot(uuid)                         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_slot(uuid,text,text)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kick_member(uuid,text)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_from_waitlist(uuid)             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_slot_counts()                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attest_attendance(uuid,boolean)          FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.slot_fill_meets_social_threshold(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lookups(uuid)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slot_share_preview(uuid)              TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_id()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner()                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_joined_member(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_roster(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_social_proof(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_slot(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_slot(uuid,text,text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_member(uuid,text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_claim(text,uuid,text,text,text,text,uuid,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attest_attendance(uuid,boolean)       TO authenticated;

-- promote_from_waitlist and sync_slot_counts: NO grant. Called
-- only internally by other definer fns / as a trigger. Never
-- client-invoked. REVOKE-only is intentional.

-- 8. Seed data (Part 11) ---------------------------------------

INSERT INTO metros (id, name) VALUES ('dallas', 'Dallas, TX');

INSERT INTO sports (id, name) VALUES ('pickleball', 'Pickleball');

INSERT INTO venues (id, metro_id, name, neighborhood) VALUES
    ('cole-park',            'dallas', 'Cole Park',                 'Lakewood'),
    ('churchill-park',       'dallas', 'Churchill Park',            'Preston Hollow'),
    ('lake-highlands-north', 'dallas', 'Lake Highlands North Park', 'Lake Highlands');

-- OWNER ROW — PLACEHOLDER. The human MUST replace p_phone and
-- auth_user_id with real values before any cloud application.
-- phone must be valid E.164. auth_user_id should be the
-- curator's real Supabase Auth uuid (or left NULL and bound at
-- first owner login via signup_claim, then role hand-set).
-- This row is intentionally a loud placeholder.
INSERT INTO users (phone, first_name, skill_level, role)
VALUES ('+10000000000', 'Owner', 'advanced', 'owner');
-- ^ REPLACE +10000000000 WITH REAL CURATOR PHONE BEFORE CLOUD.
