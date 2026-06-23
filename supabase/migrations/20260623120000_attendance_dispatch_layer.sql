-- D18: D11 attendance-dispatch DB layer. Dedup column + service_role-only mint RPC.

-- 1. Per-membership dedup / audit column
ALTER TABLE public.session_memberships
  ADD COLUMN attendance_sms_sent_at timestamptz NULL;

-- Partial index for the dispatcher's "joined, not yet texted" scan
CREATE INDEX sm_attendance_dispatch_pending_idx
  ON public.session_memberships (slot_id)
  WHERE status = 'joined' AND attendance_sms_sent_at IS NULL;

-- 2. service_role-only atomic mint + claim + read
CREATE OR REPLACE FUNCTION public.claim_attendance_dispatch(p_slot_id uuid)
RETURNS TABLE(membership_id uuid, user_id uuid, phone text, first_name text, token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_eligible boolean;
BEGIN
  -- R6: parent slot lock FIRST, and confirm the slot is inside the dispatch window.
  SELECT (s.ends_at < now() - interval '2 hours'
          AND s.ends_at > now() - interval '26 hours'
          AND s.cancelled_at IS NULL)
    INTO v_eligible
  FROM public.slots s
  WHERE s.id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_eligible THEN
    RETURN;  -- slot missing, outside window, or cancelled → nothing to dispatch
  END IF;

  -- Atomic mint + stamp + return, only for joined rows not yet sent.
  RETURN QUERY
  UPDATE public.session_memberships sm
     SET attendance_token            = gen_random_uuid(),
         attendance_token_expires_at = now() + interval '48 hours',
         attendance_sms_sent_at      = now()
   FROM public.users u
   WHERE sm.slot_id = p_slot_id
     AND sm.status = 'joined'
     AND sm.attendance_sms_sent_at IS NULL
     AND u.id = sm.user_id
  RETURNING sm.id, sm.user_id, u.phone, u.first_name, sm.attendance_token;
END;
$function$;

-- 3. Grants: service_role only (honors D17 matrix)
REVOKE EXECUTE ON FUNCTION public.claim_attendance_dispatch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_attendance_dispatch(uuid) TO service_role;
