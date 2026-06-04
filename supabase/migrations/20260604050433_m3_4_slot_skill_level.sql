-- =============================================================
-- M3.4: Add slots.skill_level — corrective schema patch
-- Source: memory-bank/decisions/D12-slot-skill-level.md
-- Applies AFTER: 20260520044919_m3_initial_schema.sql (already cloud-applied)
-- =============================================================

-- Step 1: Add column (no DEFAULT — owner form always provides it;
-- fail-loud if missing; safe because slots is empty on fresh DB + cloud)
ALTER TABLE public.slots ADD COLUMN skill_level text NOT NULL;

-- Step 2: Enforce the same four tiers as users_skill_level_valid
ALTER TABLE public.slots ADD CONSTRAINT slots_skill_level_valid
    CHECK (skill_level IN ('beginner','advanced_beginner','intermediate','advanced'));

-- Step 3: Replace slot_share_preview — append skill_level to RETURNS TABLE
-- and SELECT projection. Everything else byte-identical to base migration.
-- Column must exist before this statement (LANGUAGE sql validates at CREATE time).
-- DROP required: PostgreSQL forbids CREATE OR REPLACE when RETURNS TABLE columns change.
DROP FUNCTION IF EXISTS public.slot_share_preview(uuid);
CREATE FUNCTION public.slot_share_preview(target_slot uuid)
RETURNS TABLE (
    venue_name text, neighborhood text, sport_name text,
    starts_at timestamptz, ends_at timestamptz, capacity int,
    gender_category text, is_cancelled boolean,
    owner_first_name text, fill_count int, fill_ratio_shown boolean,
    skill_level text
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
        public.slot_fill_meets_social_threshold(s.id),
        s.skill_level
    FROM public.slots s
    JOIN public.venues v     ON v.id = s.venue_id
    JOIN public.sports sp    ON sp.id = s.sport_id
    JOIN public.users  owner ON owner.id = s.created_by
    WHERE s.id = target_slot
$$;

-- Re-assert grants (CREATE OR REPLACE preserves existing grants,
-- but explicit re-grant confirms anon + authenticated both have EXECUTE)
REVOKE ALL ON FUNCTION public.slot_share_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_share_preview(uuid) TO anon, authenticated;
