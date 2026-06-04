-- =============================================================
-- Local seed — Phase 0 dev owner
-- LOCAL ONLY. auth_user_id is NULL at seed time; bound at first
-- test-OTP login via signup_claim (phone-unclaimed path).
-- Do NOT apply to cloud. The cloud placeholder owner row lives
-- in the migration itself ('+10000000000'); this is a second,
-- separate owner row for local development only.
-- =============================================================

INSERT INTO public.users (phone, first_name, skill_level, role)
VALUES ('+15555550101', 'Dev Owner', 'advanced', 'owner')
ON CONFLICT (phone) DO NOTHING;
