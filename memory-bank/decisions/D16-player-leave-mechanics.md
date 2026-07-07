# D16 — Player-Leave Mechanics

**Decided:** 2026-06-16
**Status:** ✅ Decided. Schema: NONE required — verified against the live `leave_slot` definition. UI is M5 (a single UI-only dispatch).
**Related:** D7 (one reason question, no reschedule — this IS the player-leave flow; **amends** D7's "no leaving once locked"), D9 (leave frees the same-day cap — the load-bearing unlock), D10 (lobby = joined-members surface; the leave entry point), D11 (post-start belongs to attendance, not leave), D14/D15 (CancelSheet is the visual + action template), D8.2 (token sheet).

## The decision
A joined player leaves via a D8.2 bottom-sheet (`LeaveSheet`, modeled on `CancelSheet`): title + map-pin game info, dynamic consequence copy, a REQUIRED single-select reason picker, an OPTIONAL free-text note, a red "Leave game" (disabled until a reason is picked), and a quiet "Keep my spot". Confirm → `leave_slot` → `router.refresh()`.

## Verified against the live schema (raw `leave_slot`) — M5 is UI-only
- `found_other_game` is ALREADY in `leave_slot`'s allow-list → "Switching to another game" maps to it. No new reason code, no migration.
- `leave_slot` already takes `p_leave_reason_note` and writes a `leave_reason_note` column → the optional note costs ZERO schema.
- `leave_slot` has NO capacity/locked guard → leaving a full game already works (see D7 amendment).
- Therefore no schema change. The banked `REVOKE UPDATE ON slots FROM anon` stays banked (its own future micro-dispatch) — NOT bolted onto M5.

## Reason picker (required, single-select)
Five chips → existing allow-list codes:
`Schedule conflict`→`schedule_conflict` · `Injured or sick`→`injured` · `Switching to another game`→`found_other_game` · `Can't make it anymore`→`no_longer_available` · `Other`→`other`.
Single-select **radiogroup** (`role="radiogroup"`/`role="radio"`/`aria-checked`) — NOT `aria-pressed` toggles. Selected = sky `#8DBCF1` + `border-strong` + check; ≥44px. "Leave game" is `disabled` until a reason is chosen.

Guardrails (Gemini, endorsed): (1) reason mandatory, "Switching to another game" explicitly present; (2) no reschedule prompt anywhere; (3) no inline-switch affordance — the sheet only lets you leave (the D9 toast is what tells them to leave-then-join).

## Note (optional, free text)
Re-included after the live schema showed `leave_reason_note` already exists. Unlike CancelSheet (which composes chip + note into ONE free-text `cancellation_reason`), the player path stores them SEPARATELY: chip → `p_leave_reason_code` (coded), note → `p_leave_reason_note` (free text). White field, steel placeholder (the dark-on-dark fix). Rescues "Other" from being a dead data point; feeds D7's v2 reschedule-data mandate.

## Consequence copy (dynamic, JOINED-leaver)
- `waitlist_count > 0`: "Your spot will go to the next player on the waitlist." (bold) + "You may not get it back, but you'll be free to join another game today." (steel)
- `waitlist_count = 0`: "Your spot will open up for someone else." (bold) + same steel line.
NOT "this can't be undone" — owner-cancel kills the slot; a player leave is recoverable. The lost-seat cost IS the deliberate D9 friction.

## D7 amendment — leave IS allowed on full (locked) games
D7 line 28 ("no one joins or leaves a locked session") is superseded for leaves; D7 line 108 had already flagged "opt out of a joined slot" as "confirm during implementation." Rationale: the waitlist only exists at 6/6 and `leave_slot` calls `promote_from_waitlist` (joined-leaver only), so capacity-gating leave would make backfill dead code and trap a sick player with a locked D9 cap. Leave-eligibility is gated by TIME, not capacity.

## Time gate — strict `starts_at > now()` (NO owner grace)
Players may leave only while `starts_at > now()`. The 2h padding owners get (D15, to cancel a broken game at the courts) does NOT apply: a post-start "leave" would dodge the D11 "Did you make it?" no-show flag. After start, the slot belongs to the attendance flow, not leave.

## Scope — joined-leave only (M5); waitlist-leave deferred
`leave_slot` promotes the waitlist only when the leaver was joined. A waitlisted-leaver gets no promotion and no D9 unlock (waitlisting never locked the cap), and the lobby (D10) is a joined-members surface. M5 = joined-leave (the cap-freeing, density-preserving critical path). Waitlist-leave (same sheet, different copy, no promotion) is a fast-follow.

## Entry point + rider
Group lobby (D10), the viewing player's own joined membership: a demoted red "Leave game" text link (destructive weight lives in the sheet, per D15's cancel demotion) → opens `LeaveSheet`. Gated to `status='joined' AND starts_at > now()`. (Home-feed entry point: out of M5, pending Code's report of current joined-state rendering.) Bundled rider: an owner-gated global-header nav link to `/dashboard`, hidden for non-owners.

## Action
`leaveSlotAction` mirrors `cancelSlotAction`: server client, one `.rpc('leave_slot', {p_slot_id, p_leave_reason_code, p_leave_reason_note})`, RETURNS boolean (success = no error), RAISE-message → typed `LeaveResult`, `router.refresh()` after (source of truth — reflects the left membership + any promotion). No optimistic mutation.

## As-built annotation — nav rider location (2026-07-02)
§"Entry point + rider" specced the /dashboard rider as "an owner-gated global-header
nav link." As BUILT (M5), no global header existed; the rider shipped as an owner-only
entry in BottomTabBar.tsx (isOwner prop, "M5 rider" comment). Removed 2026-07-01 by
the profile dispatch, which consolidated the owner-dashboard entry onto /profile (the
only entry point outside the route itself). Spec text above left as written —
historical record; this note reconciles doc to tree.
