# D20 — get_public_feed Anon Read RPC (Public Feed Data Layer)

## Decision
Add a SECURITY DEFINER read RPC, get_public_feed(), returning a TABLE of upcoming,
non-cancelled slots with an anon-safe projection, granted anon+authenticated. It is the data
layer for the v1 public feed (logged-out front door at /). Brings the previously-deferred
public-browse item (unnumbered in v2-signals.md) into v1.

## Why an RPC (not a table read)
anon has NO SELECT policy on public.slots (RLS: slots_select_authenticated is TO authenticated
only) — confirmed by recon. So a logged-out client cannot read slots directly. A SECURITY
DEFINER RPC is the only path (same reason slot_share_preview exists). slot_share_preview itself
can't power a feed: it takes a single slot UUID, and anon can't read slots to get the UUID list.

## The projection (and what's deliberately excluded)
Returns: slot_id, venue_name, neighborhood, starts_at, ends_at, capacity, skill_level,
gender_category, fill_count (masked), fill_shown.
- DROPS owner_first_name: slot_share_preview exposes it for a single obscured share link, but a
  PUBLIC LIST of every owner's first name + venue + time is a different (worse) exposure profile
  — PII scraping risk. The logged-out feed stays roster/owner-anonymous; trust signal is real
  court + time + skill + fill, not a host name. (Gemini-flagged.)
- DROPS is_cancelled (rows are filtered to non-cancelled, so it's always false) and sport_name
  (v1 single-sport, pickleball hardcoded).
- KEEPS slot_id (the LIST must return ids so the card can key + build /auth?slotId=<id> for the
  Flow-2 "you're joining" banner; slot ids are already in share URLs) and ends_at (low-
  sensitivity; carried so duration display needs no v1.1 migration — a deliberate keep over
  strict YAGNI, on a near-zero-risk column).

## The 50% fill mask (at the data layer)
fill_count returns member_count only when (member_count/capacity) >= 0.5, else NULL — so anon
never receives a raw sub-threshold count ("silence beats a small number", D8.2, enforced server-
side). The ratio is INLINED, not delegated to slot_fill_meets_social_threshold (D17-revoked from
anon; inlining keeps the RPC self-contained with no cross-grant dependency).

## Filter (parity with the authed feed)
starts_at > now() AND cancelled_at IS NULL, ORDER BY starts_at ASC. NO ends_at filter — matches
the authed feed exactly, and a started game (starts_at <= now()) is not joinable (D19), so the
public feed correctly shows only click-through-joinable games. Both starts_at and now() are
timestamptz → absolute-instant compare, no civil-date drift (R2-safe).

## Grants
D17 Bucket A (anon + authenticated) — the same bucket as slot_share_preview. SECURITY DEFINER +
search_path=''; REVOKE FROM PUBLIC, anon, authenticated; GRANT TO anon, authenticated.

## Scope boundary
Data layer ONLY. The PublicSlotCard component and the page.tsx routing split (if session →
HomeClient else → PublicFeed) are a SEPARATE dispatch — SlotCard is NOT touched (it's coupled to
Phase-4 membership state + D19 terminal states; a render-only PublicSlotCard isolates the public
surface).
