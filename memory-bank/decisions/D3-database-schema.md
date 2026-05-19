# D3 — Database Schema (Canonical M3 Implementation Specification)

Status: LOCKED. Source of truth for the M3 migration. Code transcribes
this verbatim; it assembles nothing.
Assembled: 2026-05-18. Supersedes all prior schema notes on conflict.

================================================================
PART 1 — CONSOLIDATED DECISION INDEX
================================================================

Consolidates: D3 Steps 1 (read paths), 2 (write paths W1–W18), 3.1–3.8
(this); D7, D7.1 (willing_to_drive cut), D7.2 (onboarding bifurcation),
D7.3 (optional gender); D8.1 (avatar palette / gender-derived color, no
stored color); D9 (one joined slot per Dallas calendar day); D3
gender-category amendment (slot tags open/women/men); projectbrief-A1
(venues: Cole, Churchill, Lake Highlands North; Fretz removed).

================================================================
PART 2 — ARCHITECTURAL PRINCIPLES (binding)
================================================================

1. Single Source of Truth. Derived data is derived, never stored,
   unless an integrity rule cannot be enforced otherwise. Two
   justified denormalizations only: slots.member_count/waitlist_count
   (trigger-maintained cache), session_memberships.slot_date (D9
   cannot be a partial unique index without it). Slot lifecycle is
   derived from starts_at/ends_at vs now() — never stored. Avatar
   color is derived from gender — never stored.

2. The Partiful Model. View-first, auth-second. Public/anon surface
   is a gated definer-view projection, never raw table access.

3. Evolution-First seams. Growth axes (metros, sports) are reference
   tables with FKs — add a city/sport via INSERT, never migration.
   Closed attribute sets (status, skill, gender, leave-reason) are
   TEXT+CHECK, not native enums.

4. The Calibration Principle. Access-gate tightness is calibrated to
   projection sensitivity. Non-identifying projection → loose gate
   (slot_social_proof: any authenticated, fill-gated). Identity in
   projection → tight gate (slot_roster: names, member/owner-gated).

5. Base tables are self/owner only. No client ever directly reads
   another identity's row. Every cross-identity/public read is a
   SECURITY DEFINER view with a minimal explicit projection.

6. Transactions are definer functions, not RLS. Any write needing
   procedure (D9, capacity math, tz derivation) is a SECURITY
   DEFINER function. session_memberships has zero client write
   policies. Sole exception: chat_messages INSERT (pure append, no
   procedure) is direct RLS.

7. Helper-function backbone. Four SECURITY DEFINER helpers
   (is_owner, is_active_member, current_user_id,
   slot_fill_meets_social_threshold) are the lattice spine. Policies
   call them; never inlined. Definer = bypass RLS internally = no
   recursive policy evaluation.

================================================================
PART 3 — LOAD-BEARING DEPENDENCY REGISTER
================================================================

R1. D9 enforceability requires slot immutability. sm_d9_one_joined
    _per_day is a partial unique index on the denormalized
    session_memberships.slot_date. Safe ONLY because a slot's
    starts_at cannot change once it has members (slots_update_owner
    WITH CHECK). Any future time-shift-of-joined-slot feature
    silently breaks D9. Re-evaluate before any such feature.

R2. The timezone-correct slot_date derivation is the single
    highest-risk line in M3. Must be
    (slots.starts_at AT TIME ZONE 'America/Chicago')::date — NOT
    starts_at::date (UTC; wrong for late-evening Dallas games).
    Lives in join_slot.

R3. Migration order is load-bearing. Helpers before policies that
    call them. Tables in FK order. RLS/grants after objects. See
    Part 8.

R4. No client deletes anywhere; ON DELETE RESTRICT on every FK.
    Makes "messages persist as authored" and "membership history
    permanent" structurally true. Any delete path must be
    deliberate and re-checked against every RESTRICT.

R5. DEFINER on the 4 helpers is load-bearing for non-recursion.
    Never change to SECURITY INVOKER. is_active_member stays PURE —
    owner-ness is added additively per-policy via OR is_owner(),
    never folded into the helper.

R6. Global Lock Hierarchy. Every transaction that mutates
    memberships MUST acquire SELECT ... FOR UPDATE on the parent
    slots row FIRST, before any session_memberships read/write.
    Slots-before-memberships, always. Deadlock-prevention invariant
    binding on join_slot, leave_slot, kick_member.

R7. The sync_slot_counts FOR UPDATE slot lock is load-bearing for
    the join_slot last-seat-race serialization. The trigger's lock
    and join_slot taking the same lock before the capacity read are
    jointly what make the last-seat race correct. Re-entrant within
    a transaction (no self-deadlock).

================================================================
PART 4 — TABLES (verbatim, FK/dependency order)
================================================================

-- 4.1 metros, sports (Step 3.1) -------------------------------

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

-- 4.2 venues (Step 3.2) ---------------------------------------

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

-- 4.3 users (Step 3.3; claim_token uuid, no column default) ----

CREATE TABLE users (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id            uuid        UNIQUE,
    phone                   text        NOT NULL UNIQUE,
    claim_token             uuid        UNIQUE,
    claim_token_expires_at  timestamptz,
    claimed_at              timestamptz,
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
        CHECK (role IN ('player','owner')),
    CONSTRAINT users_claim_consistency
        CHECK (
            (claim_token IS NULL AND claim_token_expires_at IS NULL)
            OR
            (claim_token IS NOT NULL AND claim_token_expires_at IS NOT NULL)
        )
);
CREATE INDEX users_auth_user_id_idx ON users (auth_user_id);
CREATE INDEX users_claim_token_idx  ON users (claim_token);

-- 4.4 slots (Step 3.4) ----------------------------------------

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

-- 4.5 session_memberships (Step 3.5) --------------------------

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
    created_at         timestamptz NOT NULL DEFAULT now(),
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

-- 4.6 chat_messages (Step 3.6) --------------------------------

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

================================================================
PART 5 — HELPER FUNCTIONS (Step 3.8.1) — CREATED FIRST
================================================================

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

CREATE OR REPLACE FUNCTION public.slot_fill_meets_social_threshold(p_slot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (s.member_count::numeric / NULLIF(s.capacity, 0)) >= 0.5
    FROM public.slots s WHERE s.id = p_slot
$$;

================================================================
PART 6 — READ VIEWS/FUNCTIONS (Steps 3.7.2–3.7.3)
================================================================

CREATE OR REPLACE FUNCTION public.claim_lookups(token uuid)
RETURNS TABLE (first_name text, is_valid boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT
        CASE WHEN u.id IS NOT NULL
             AND u.claimed_at IS NULL
             AND u.claim_token_expires_at > now()
             THEN u.first_name ELSE NULL END AS first_name,
        (u.id IS NOT NULL
            AND u.claimed_at IS NULL
            AND u.claim_token_expires_at > now()) AS is_valid
    FROM (SELECT 1) dummy
    LEFT JOIN public.users u ON u.claim_token = token
$$;

CREATE OR REPLACE FUNCTION public.slot_roster(target_slot uuid)
RETURNS TABLE (membership_id uuid, first_name text, gender text, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
    SELECT sm.id, u.first_name, u.gender, sm.status
    FROM public.session_memberships sm
    JOIN public.users u ON u.id = sm.user_id
    WHERE sm.slot_id = target_slot
      AND sm.status IN ('joined','waitlisted')
      AND (public.is_active_member(target_slot) OR public.is_owner())
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
================================================================
PART 7 — TRANSACTION FUNCTIONS + TRIGGER (Step 3.8.2–3.8.5)
================================================================

-- 7.1 sync_slot_counts trigger (Step 3.8.2) -------------------

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

-- 7.2 signup_claim (Step 3.8.3)  [FIX: auth-violation wrappers
--     on steps 1 & 2 — baked in below at *** 3.8.3 FIX *** ] ---

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

    -- Step 1: token path (Path A happy case)
    IF p_claim_token IS NOT NULL THEN
        SELECT id INTO v_user_id
        FROM public.users
        WHERE claim_token = p_claim_token
          AND claimed_at IS NULL
          AND claim_token_expires_at > now()
        FOR UPDATE;

        IF v_user_id IS NOT NULL THEN
            -- *** 3.8.3 FIX: wrap auth-binding to convert an
            -- auth_user_id UNIQUE violation into a legible,
            -- loud error (corruption: one auth id, two phones) ***
            BEGIN
                UPDATE public.users
                SET auth_user_id = p_auth_user_id,
                    claimed_at   = now(),
                    first_name   = COALESCE(p_first_name, first_name),
                    last_name    = COALESCE(p_last_name,  last_name),
                    skill_level  = COALESCE(p_skill_level, skill_level),
                    gender       = COALESCE(p_gender,     gender),
                    general_availability =
                        COALESCE(p_general_availability, general_availability),
                    preferred_venues =
                        COALESCE(p_preferred_venues, preferred_venues)
                WHERE id = v_user_id;
            EXCEPTION WHEN unique_violation THEN
                RAISE EXCEPTION
                  'signup_claim: auth identity % already bound to another user (corruption) — token path',
                  p_auth_user_id
                  USING ERRCODE = 'unique_violation';
            END;
            RETURN v_user_id;
        END IF;
        -- token unusable: fall through. No error, no duplicate.
    END IF;

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
                claimed_at   = now(),
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
            preferred_venues, role, claim_token, claimed_at
        )
        VALUES (
            p_auth_user_id, p_phone, p_first_name, p_last_name,
            p_skill_level, p_gender, p_general_availability,
            p_preferred_venues, 'player', NULL, now()
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

-- 7.3 promote_from_waitlist (Step 3.8.5a)  [FIX: GET
--     DIAGNOSTICS ROW_COUNT guard — *** 3.8.5 FIX *** ] --------

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

-- 7.4 join_slot (Step 3.8.4)  [FIX: exception-convert block at
--     end — *** 3.8.4 FIX *** ] -------------------------------

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

-- 7.5 leave_slot (Step 3.8.5b) — R6: slots lock first --------

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

-- 7.6 kick_member (Step 3.8.5c) — owner-gated; R6 hierarchy ---

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

================================================================
PART 8 — RLS LATTICE (Steps 3.7.1–3.7.4)
================================================================

-- 8.1 Reference tables (3.7.1) --------------------------------

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

-- 8.2 users (3.7.2) -------------------------------------------

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

-- 8.3 slots (3.7.3) -------------------------------------------

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

-- 8.4 session_memberships (3.7.4) -----------------------------

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

-- 8.5 chat_messages (3.7.4) -----------------------------------

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

================================================================
PART 9 — FUNCTION GRANTS MATRIX
================================================================

REVOKE ALL ON FUNCTION public.current_user_id()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner()                              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_member(uuid)                  FROM PUBLIC;
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

GRANT EXECUTE ON FUNCTION public.slot_fill_meets_social_threshold(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lookups(uuid)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slot_share_preview(uuid)              TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_id()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner()                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_roster(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_social_proof(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_slot(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_slot(uuid,text,text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_member(uuid,text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_claim(text,uuid,text,text,text,text,uuid,jsonb,jsonb) TO authenticated;

-- promote_from_waitlist and sync_slot_counts: NO grant. Called
-- only internally by other definer fns / as a trigger. Never
-- client-invoked. REVOKE-only is intentional.

================================================================
PART 10 — MIGRATION ORDER (load-bearing — do not reorder)
================================================================

1. create extension if not exists pgcrypto;
2. Helper fns (Part 5): current_user_id, is_owner,
   is_active_member, slot_fill_meets_social_threshold
3. Tables FK order (Part 4): metros, sports, venues, users,
   slots, session_memberships, chat_messages
4. All indexes incl. partial uniques (in Part 4 blocks)
5. Read fns/views (Part 6): claim_lookups, slot_roster,
   slot_share_preview, slot_social_proof
6. Transaction fns + trigger (Part 7): sync_slot_counts (+
   trg_sync_slot_counts), signup_claim, promote_from_waitlist,
   join_slot, leave_slot, kick_member
7. ENABLE RLS + policies (Part 8), table by table
8. Grants matrix (Part 9)
9. Seed (Part 11)

Rationale: helpers before policies that call them; tables
before indexes/fns referencing them; RLS after objects; seed
last (service-role, bypasses RLS).

================================================================
PART 11 — SEED DATA (v1)
================================================================

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

================================================================
END OF D3 CANONICAL SCHEMA SPECIFICATION
================================================================
