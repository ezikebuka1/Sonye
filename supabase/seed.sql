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

-- =============================================================
-- DEMO SLOTS (UI verification) — LOCAL ONLY. Do NOT apply to cloud.
-- Purpose: make the public + authed feeds screenshottable and prove the
-- 50% fill mask (get_public_feed / D20) against real seed data.
--
-- Design constraints honored (Phase 0 recon + architect go-ahead):
--   • member_count is TRIGGER-MAINTAINED (sync_slot_counts on session_memberships
--     status='joined') — NEVER set directly; N joined rows ⇒ member_count = N.
--   • sm_d9_one_joined_per_day UNIQUE(user_id, slot_date) WHERE status='joined'
--     is enforced in-DB → each demo slot is on a DISTINCT day (+2/+4/+6/+8/+10),
--     so the 6-player pool can be reused across slots with no D9 collision.
--   • slot_date is COMPUTED as (starts_at AT TIME ZONE 'America/Chicago')::date
--     (matches join_slot's convention — DST-safe, never naive UTC).
--   • RELATIVE dates (now() + interval 'N days') so the slots never go stale
--     under get_public_feed's `starts_at > now()` filter.
--   • created_by resolves the Dev Owner by phone (its id is gen_random_uuid(),
--     so it is NOT stable across `db reset` — never hardcode it).
--
-- Join spread → member_count: 1 / 4 / 6 / 3 / 2
--   SLOT d1 Cole          intermediate      open    1/6  (17% <50% → button only)
--   SLOT d2 Churchill     beginner          open    4/6  (67% ≥50% → dots + count)
--   SLOT d3 Lake Highlands advanced         open    6/6  (full)
--   SLOT d4 Cole          advanced_beginner women   3/6  (50% boundary → SHOWN)
--   SLOT d5 Churchill     advanced          open    2/6  (33% <50% → button only)
-- =============================================================

-- 6 demo players (role='player'); phones +15555551001..1006 are deliberately
-- separate from the [auth.sms.test_otp] set — these users never log in, they are
-- FK targets for memberships only. 3 women (f1/f3/f5) populate the women's slot.
INSERT INTO public.users (id, phone, first_name, last_name, skill_level, gender, role) VALUES
  ('00000000-0000-0000-0000-0000000000f1','+15555551001','Maya','Patel','intermediate','woman','player'),
  ('00000000-0000-0000-0000-0000000000f2','+15555551002','Diego','Romero','beginner','man','player'),
  ('00000000-0000-0000-0000-0000000000f3','+15555551003','Sarah','Kim','advanced','woman','player'),
  ('00000000-0000-0000-0000-0000000000f4','+15555551004','Jordan','Lee','advanced_beginner','non_binary','player'),
  ('00000000-0000-0000-0000-0000000000f5','+15555551005','Aisha','Johnson','intermediate','woman','player'),
  ('00000000-0000-0000-0000-0000000000f6','+15555551006','Tom','Becker','advanced','man','player')
ON CONFLICT (phone) DO NOTHING;

-- 5 demo slots, one per distinct future day. capacity 6 throughout. member_count
-- omitted (defaults 0; the membership trigger raises it). created_by = Dev Owner.
INSERT INTO public.slots
  (id, venue_id, sport_id, created_by, starts_at, ends_at, capacity, gender_category, skill_level) VALUES
  ('00000000-0000-0000-0000-0000000000d1','cole-park','pickleball',
     (SELECT id FROM public.users WHERE phone='+15555550101'),
     now() + interval '2 days',  now() + interval '2 days'  + interval '2 hours', 6, 'open',  'intermediate'),
  ('00000000-0000-0000-0000-0000000000d2','churchill-park','pickleball',
     (SELECT id FROM public.users WHERE phone='+15555550101'),
     now() + interval '4 days',  now() + interval '4 days'  + interval '2 hours', 6, 'open',  'beginner'),
  ('00000000-0000-0000-0000-0000000000d3','lake-highlands-north','pickleball',
     (SELECT id FROM public.users WHERE phone='+15555550101'),
     now() + interval '6 days',  now() + interval '6 days'  + interval '2 hours', 6, 'open',  'advanced'),
  ('00000000-0000-0000-0000-0000000000d4','cole-park','pickleball',
     (SELECT id FROM public.users WHERE phone='+15555550101'),
     now() + interval '8 days',  now() + interval '8 days'  + interval '2 hours', 6, 'women', 'advanced_beginner'),
  ('00000000-0000-0000-0000-0000000000d5','churchill-park','pickleball',
     (SELECT id FROM public.users WHERE phone='+15555550101'),
     now() + interval '10 days', now() + interval '10 days' + interval '2 hours', 6, 'open',  'advanced')
ON CONFLICT (id) DO NOTHING;

-- Memberships (all status='joined'). slot_date is computed per-slot from the
-- slot's starts_at in America/Chicago. Spread: d1=1, d2=4, d3=6, d4=3, d5=2.
-- The women's slot d4 is populated by the three women (f1/f3/f5).
INSERT INTO public.session_memberships (user_id, slot_id, status, slot_date)
SELECT m.user_id, m.slot_id, 'joined', (s.starts_at AT TIME ZONE 'America/Chicago')::date
FROM (VALUES
  -- d1: 1/6
  ('00000000-0000-0000-0000-0000000000f1'::uuid, '00000000-0000-0000-0000-0000000000d1'::uuid),
  -- d2: 4/6
  ('00000000-0000-0000-0000-0000000000f1'::uuid, '00000000-0000-0000-0000-0000000000d2'::uuid),
  ('00000000-0000-0000-0000-0000000000f2'::uuid, '00000000-0000-0000-0000-0000000000d2'::uuid),
  ('00000000-0000-0000-0000-0000000000f3'::uuid, '00000000-0000-0000-0000-0000000000d2'::uuid),
  ('00000000-0000-0000-0000-0000000000f4'::uuid, '00000000-0000-0000-0000-0000000000d2'::uuid),
  -- d3: 6/6 (full)
  ('00000000-0000-0000-0000-0000000000f1'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  ('00000000-0000-0000-0000-0000000000f2'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  ('00000000-0000-0000-0000-0000000000f3'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  ('00000000-0000-0000-0000-0000000000f4'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  ('00000000-0000-0000-0000-0000000000f5'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  ('00000000-0000-0000-0000-0000000000f6'::uuid, '00000000-0000-0000-0000-0000000000d3'::uuid),
  -- d4: 3/6 (boundary, women's — the three women)
  ('00000000-0000-0000-0000-0000000000f1'::uuid, '00000000-0000-0000-0000-0000000000d4'::uuid),
  ('00000000-0000-0000-0000-0000000000f3'::uuid, '00000000-0000-0000-0000-0000000000d4'::uuid),
  ('00000000-0000-0000-0000-0000000000f5'::uuid, '00000000-0000-0000-0000-0000000000d4'::uuid),
  -- d5: 2/6
  ('00000000-0000-0000-0000-0000000000f2'::uuid, '00000000-0000-0000-0000-0000000000d5'::uuid),
  ('00000000-0000-0000-0000-0000000000f6'::uuid, '00000000-0000-0000-0000-0000000000d5'::uuid)
) AS m(user_id, slot_id)
JOIN public.slots s ON s.id = m.slot_id
ON CONFLICT DO NOTHING;
