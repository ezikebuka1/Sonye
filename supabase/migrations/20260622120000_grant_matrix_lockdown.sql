-- D17: pin function EXECUTE grant matrix. Baseline revoke from PUBLIC/anon/authenticated
-- on all 19, then grant back per matrix. service_role intentionally untouched.

-- Baseline revoke (all 19)
REVOKE EXECUTE ON FUNCTION public.slot_share_preview(target_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attest_attendance(p_token uuid, p_attended boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_roster(target_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_wall(target_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_social_proof(target_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_slot(p_slot_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leave_slot(p_slot_id uuid, p_leave_reason_code text, p_leave_reason_note text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kick_member(p_membership_id uuid, p_note text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_slot(p_slot_id uuid, p_cancellation_reason text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owner_delete_message(p_message_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_claim(p_phone text, p_auth_user_id uuid, p_first_name text, p_skill_level text, p_last_name text, p_gender text, p_claim_token uuid, p_general_availability jsonb, p_preferred_venues jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_joined_member(p_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_from_waitlist(p_slot_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_slot_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_member(p_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_fill_meets_social_threshold(p_slot uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_lookups(token uuid) FROM PUBLIC, anon, authenticated;

-- Bucket A: anon + authenticated
GRANT EXECUTE ON FUNCTION public.slot_share_preview(target_slot uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attest_attendance(p_token uuid, p_attended boolean) TO anon, authenticated;

-- Bucket B: authenticated only
GRANT EXECUTE ON FUNCTION public.slot_roster(target_slot uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_wall(target_slot uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.slot_social_proof(target_slot uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_slot(p_slot_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_slot(p_slot_id uuid, p_leave_reason_code text, p_leave_reason_note text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_member(p_membership_id uuid, p_note text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_slot(p_slot_id uuid, p_cancellation_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_delete_message(p_message_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_claim(p_phone text, p_auth_user_id uuid, p_first_name text, p_skill_level text, p_last_name text, p_gender text, p_claim_token uuid, p_general_availability jsonb, p_preferred_venues jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_joined_member(p_slot uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- Bucket C: internal-only — NO grant back (definer/service_role reach only):
-- promote_from_waitlist, sync_slot_counts, is_active_member,
-- slot_fill_meets_social_threshold, claim_lookups
