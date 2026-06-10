-- Fix: GoTrue JWT 'phone' claim strips the leading '+'.
-- signup_claim's claim_token path was comparing the raw JWT phone (e.g. '15555550033')
-- against public.users.phone which is always E.164 ('+15555550033'), so the UPDATE
-- found no match and always raised claim_token_mismatch.  Normalise v_jwt_phone to
-- E.164 before the WHERE clause.

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
        -- GoTrue JWT strips the leading '+' from E.164 numbers.
        -- Normalise so the WHERE clause matches the DB's stored format.
        v_jwt_phone_raw text := auth.jwt() ->> 'phone';
        v_jwt_phone     text := CASE
            WHEN v_jwt_phone_raw LIKE '+%' THEN v_jwt_phone_raw
            ELSE '+' || v_jwt_phone_raw
        END;
        v_jwt_sub       uuid := (auth.jwt() ->> 'sub')::uuid;
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

    -- Path A: phone known + unclaimed (no auth_user_id yet)
    SELECT id INTO v_user_id
    FROM public.users
    WHERE phone = p_phone
      AND auth_user_id IS NULL
    FOR UPDATE;

    IF v_user_id IS NOT NULL THEN
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

    -- Path C: phone known + already has auth (returning user) — read-only
    SELECT id INTO v_user_id
    FROM public.users
    WHERE phone = p_phone
      AND auth_user_id IS NOT NULL;

    IF v_user_id IS NOT NULL THEN
        RETURN v_user_id;
    END IF;

    -- Path D: net-new INSERT
    BEGIN
        INSERT INTO public.users (
            auth_user_id, phone, first_name, last_name,
            skill_level, gender, general_availability,
            preferred_venues, role
        ) VALUES (
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
