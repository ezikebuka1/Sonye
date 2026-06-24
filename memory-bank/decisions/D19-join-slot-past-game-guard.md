# D19 — join_slot Past-Game Guard + Started Terminal State

## Decision
Add an absolute-time guard to join_slot rejecting joins to a started/ended game
(starts_at <= now()), and surface the new terminal "started" state across all three join
callers + the Home feed (a locked, non-interactive "Already started" footer, mirroring the
cancelled race-fallback). Defect fix + its UX.

## Why (the defect)
Recon confirmed join_slot reads neither now() vs starts_at nor ends_at — a user can join an
already-ended (non-cancelled) game via a direct URL / stale feed, which burns the D9
one-per-day cap, pollutes rosters, and occupies a seat in a dead game. The Home feed filters
to future slots, so this is an out-of-band/race path, but it's a real integrity hole
independent of SMS. (Logged originally as a D11-dispatcher carry-forward; the dispatcher's
ends_at+2h window contained only the TEXTING path — this closes the join path itself.)

## The guard (placement + orthogonality)
- v_starts_at is already in scope from the existing FOR UPDATE lock SELECT — the guard reads
  it directly, NO second query (avoids a TOCTOU seam), NO ::date, NO AT TIME ZONE.
- Placed AFTER the cancelled check, BEFORE the v_slot_date civil-date derivation. The guard
  compares an absolute timestamptz instant (starts_at <= now()); D9 compares a Dallas civil
  date (slot_date). Different columns, types, and questions — fully orthogonal; the guard
  cannot read/write/alter D9 state. (Proven by GUARD-C.)
- Guard sits AFTER the FOR UPDATE lock (not before): reading starts_at pre-lock would need a
  separate SELECT + introduce a TOCTOU race, to save a lock on a rare rejection path. R6 lock
  ordering and happy-path integrity win over optimizing the rejection path. (Decision recorded
  vs the alternative of guarding pre-lock.)
- ERRCODE object_not_in_prerequisite_state (same as the cancelled guard — a terminal-state
  rejection). Message 'join_slot: slot % has already started' follows the existing RAISE
  convention; substring 'already started' is the unique key all callers match.

## The UX (started = terminal, like cancelled)
- Label "Already started" (NOT "In progress" — "In progress" falsely implies a joinable
  ongoing game; a join surface must not imply a closed door is open). Toast "Game already
  started" (D5: no trailing period).
- Started and cancelled are BOTH terminal race-fallbacks (each normally drops off the feed),
  rendered as non-interactive locked footers. Design-review refinements adopted: full contrast
  (NO opacity dim — fixes the cancelled card's prior sub-AA status text too), non-interactive
  <div> with cursor-not-allowed + select-none + aria-label, signalled by form not fading.
  Started is visually DISTINCT from cancelled (started: bg-inset + Clock icon = "past";
  cancelled: lighter slate, strikethrough-free, label "Cancelled" = "erased") so a scan tells
  them apart, while both stay legible and clearly dead.
- Wired through all THREE join callers (joinSlotAction return; join/page.tsx + onboarding
  redirects → ?toast=started) — the onboarding path specifically, or a first-time user hitting
  a started game would get the false-success 'welcomed' toast (the trap recon caught).
- SlotCard (Home-feed-only) carries the footer; other cancelled surfaces (join/onboarding
  redirects, slot-detail page, slot-preview lib) are independent and out of scope here (noted
  as future parallel-copy candidates if a started concept is wanted there).

## Verification
phase3a battery + GUARD-A (guard fires, SQLSTATE 22023, 'has already started'), GUARD-B
(future slot still joins), GUARD-C (D9 still independent), pre-existing P4/P5 unchanged.
Frontend: build clean, grep confirms all three callers wired, screenshots of started + the
de-dimmed cancelled footer.
