-- D20: get_public_feed() — anon read RPC for the v1 public feed (logged-out front door).
-- SECURITY DEFINER + search_path='' (modeled on slot_share_preview), but a LIST with no input
-- param and an anon-safe projection: NO owner_first_name (PII dropped from the list surface),
-- NO sport_name (v1 single-sport), NO is_cancelled (rows filtered to non-cancelled).
-- Fill is masked at the data layer: member_count only when >= 50% of capacity, else NULL.
-- The 50% ratio is INLINED (not slot_fill_meets_social_threshold, which is D17-revoked from anon)
-- so the RPC is self-contained. Filter mirrors the authed feed: starts_at > now() AND
-- cancelled_at IS NULL (no ends_at filter; a started game is not joinable per D19), starts_at ASC.
-- Grants: D17 Bucket A (anon + authenticated), same bucket as slot_share_preview.

CREATE OR REPLACE FUNCTION public.get_public_feed()
 RETURNS TABLE(
   slot_id uuid, venue_name text, neighborhood text,
   starts_at timestamptz, ends_at timestamptz,
   capacity integer, skill_level text, gender_category text,
   fill_count integer, fill_shown boolean
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT
        s.id,
        v.name,
        v.neighborhood,
        s.starts_at,
        s.ends_at,
        s.capacity,
        s.skill_level,
        s.gender_category,
        CASE WHEN (s.member_count::numeric / NULLIF(s.capacity, 0)) >= 0.5
             THEN s.member_count ELSE NULL END,
        (s.member_count::numeric / NULLIF(s.capacity, 0)) >= 0.5
    FROM public.slots s
    JOIN public.venues v ON v.id = s.venue_id
    WHERE s.cancelled_at IS NULL
      AND s.starts_at > now()
    ORDER BY s.starts_at ASC
$function$;

REVOKE EXECUTE ON FUNCTION public.get_public_feed() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_public_feed() TO anon, authenticated;
