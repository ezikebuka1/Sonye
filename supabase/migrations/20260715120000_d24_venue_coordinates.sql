-- =============================================================
-- D24: venue court coordinates + slot_share_preview lat/lng
-- Source: memory-bank/decisions/D24 (courts-level coordinates, Phase 2)
-- Applies AFTER: 20260626120000_get_public_feed.sql (current latest)
-- =============================================================

-- Step 1: Add nullable lat/lng to venues (no DEFAULT — coordinates are set
-- explicitly per venue below; unset venues stay NULL and render plain).
ALTER TABLE public.venues
  ADD COLUMN lat double precision,
  ADD COLUMN lng double precision;

-- Step 2: Range + pairing integrity. All three pass while the columns are
-- NULL/NULL (added above), so ordering is safe.
ALTER TABLE public.venues
  ADD CONSTRAINT venues_lat_range  CHECK (lat IS NULL OR (lat >= -90  AND lat <= 90)),
  ADD CONSTRAINT venues_lng_range  CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
  ADD CONSTRAINT venues_coords_paired CHECK ((lat IS NULL) = (lng IS NULL));

-- Step 3: Courts-level coordinates (all three FINAL, confirmed in D24 Phase 2).
UPDATE public.venues SET lat=32.812312, lng=-96.793444 WHERE id='cole-park';
UPDATE public.venues SET lat=32.918421, lng=-96.782705 WHERE id='churchill-park';
UPDATE public.venues SET lat=32.885735, lng=-96.730095 WHERE id='lake-highlands-north';

-- Step 4: Extend slot_share_preview — append venue_lat, venue_lng as the LAST
-- two RETURNS TABLE columns and v.lat, v.lng after s.skill_level in the SELECT.
-- Body is otherwise the current post-D12 definition (per m3_4, confirmed
-- against live pg_get_functiondef); only venue_lat, venue_lng are appended.
-- Uses DROP + CREATE (matching m3_4, the repo precedent for a return-shape
-- change on this function): reliably installs the new 14-col shape
-- regardless of CREATE OR REPLACE's trailing-column rules. Grants are
-- re-asserted below because DROP resets them.
DROP FUNCTION IF EXISTS public.slot_share_preview(uuid);
CREATE FUNCTION public.slot_share_preview(target_slot uuid)
RETURNS TABLE (
    venue_name text, neighborhood text, sport_name text,
    starts_at timestamptz, ends_at timestamptz, capacity int,
    gender_category text, is_cancelled boolean,
    owner_first_name text, fill_count int, fill_ratio_shown boolean,
    skill_level text,
    venue_lat double precision, venue_lng double precision
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
        s.skill_level,
        v.lat, v.lng
    FROM public.slots s
    JOIN public.venues v     ON v.id = s.venue_id
    JOIN public.sports sp    ON sp.id = s.sport_id
    JOIN public.users  owner ON owner.id = s.created_by
    WHERE s.id = target_slot
$$;

-- Re-assert grants (R3 exact — D17 Bucket A: anon + authenticated EXECUTE,
-- PUBLIC not granted). DROP reset grants to default, so this restores lockdown.
REVOKE ALL ON FUNCTION public.slot_share_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_share_preview(uuid) TO anon, authenticated;
