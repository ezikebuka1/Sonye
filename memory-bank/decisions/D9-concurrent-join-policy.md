# D9 — Concurrent Join Policy

**Decided:** 2026-05-01
**Status:** ✅ Decided. Implementation deferred to M3 (schema) and
M4–M5 (Join-time enforcement + leave flow); blocked by D3.
**Blocks:** D3 (schema must support same-day-active query +
attended flag + left_at), M4 (Join-time enforcement), M5 (leave
flow becomes load-bearing for the unlock mechanism)
**Related:** D7 (product mechanics, cancellation reason capture),
D5 (toast pattern), V1 Decision Principle (density), V1 Realness
Strategy

## The Decision

A user may hold a maximum of **one Joined slot per calendar day**.
The cap unlocks when:
  (a) the user leaves the current slot (via M5 cancellation flow
      with reason capture), or
  (b) the slot's match completes (attended or no-show).

Across different days, no aggregate cap.

> **Owner-cancel (D14):** an owner cancelling the slot is a third unlock path —
> `cancel_slot` flips every active membership to `'left'` (a status transition,
> exactly like a self-leave), so the same-day lock releases. See
> `D14-owner-cancel-slot-mechanics.md`.

## The Problem

Without a cap, a user can join unlimited concurrent slots. This
inflates apparent density (high opt-in counts) at the cost of real
density (actual game turnout). A user joined to three games who
shows up to one creates two phantom commitments — slots that
appeared full to other users but turn out broken at game time.

This is the failure mode the V1 Realness Strategy names directly:
"track record is the single strongest real-person signal. Bots
don't show up to games." A high opt-in / low attend ratio degrades
the realness signal the strategy is built around.

## Why "leave OR complete" as unlocks

Considered three policies:
- Strict one-at-a-time globally (Policy D).
- One per day, complete-to-unlock only.
- One per day, leave-or-complete to unlock. ← chosen.

Chose leave-or-complete for four reasons:

1. **Reuses existing infrastructure.** M5 cancellation flow with
   reason capture (D7) is happening regardless. Same-day collision
   resolution and cancellation become the same flow.

2. **Honest-switcher path exists.** A user who realizes mid-day
   they want a different slot can act cleanly: leave with reason
   "switching to another game" → join the new one. No forced flake
   on the original slot just to "complete" it.

3. **Reason data gets richer.** Cancellation-reason picker gains
   a new category (switching) that informs v2 reschedule design.

4. **Phantom flakes still pay.** A user who joins and doesn't show
   up is marked no-show at match end; the no-show flag feeds the
   realness strategy regardless of when the slot "unlocked."

## What this policy is NOT

- Not strict one-at-a-time — cross-day joins unrestricted.
- Not a permanent lockout — same-day always recoverable via leave.
- Not enforced by group size — slot capacity is separate.
- Not a trust score — flake history may inform future systems but
  does not extend the cap window.

## Same-day collision UX

When a user with an active Joined slot taps Join on another
same-day slot:
- Tap fires an error-variant toast (D5 pattern):

  > "You're already in a game today. Leave that one or complete it
  > to join another."

- The blocked Join button stays in its pre-tap state. No
  fake-disabled state, no inline switching affordance.
- To switch slots, user navigates to their currently-Joined slot,
  taps Leave (M5 flow with reason picker including "Switching to
  another game"), then returns and taps Join on the new slot.
- Tone register matches D5: contractions, lowercase mid-sentence.
  This copy ends with a period because it's two clauses joined by
  "or". D5 register update: "no period at end" applies to single-
  clause toasts; multi-clause toasts keep grammatical punctuation.
  Note this nuance in D5 doc on next D5 amendment. Not blocking
  for D9.

## Why not inline-switch affordance (option C considered)

A toast with an inline "Switch?" button that routes to leave-flow-
with-rejoin-context would be lower-friction UX, but:

- Requires a new toast affordance pattern (action-with-routing-
  context) we don't have elsewhere.
- Requires the leave flow to know about a "rejoin after leaving"
  intent — schema and state work that adds M4/M5 scope.
- Friction is partly the feature: leave-and-rejoin should feel
  slightly deliberate, not effortless. Effortless switching can
  itself become a flake vector.

Captured as a v1.5 / v2 amendment trigger: if 30-day data shows
"Switching to another game" as a dominant leave-reason category,
the friction has earned the build cost and we add the inline
affordance.

## Implementation requirements

For D3 (schema):
- Session-membership records need `attended: boolean | null`.
  - null = pending / not confirmed
  - true = confirmed attended
  - false = confirmed no-show
- Session-membership records need `left_at: timestamp | null` and
  `leave_reason: string | null` for the cancellation case.
- Indexed query: "user's currently-active same-day commitments" —
  composite index on (user_id, slot_date, left_at, attended).
- "Currently active" predicate:
    Joined AND left_at IS NULL AND attended IS NULL
    AND slot_start_time > now()

For M4 (enforcement):
- joinSlot action queries the same-day-active set for current user
  before optimistic update.
- Non-empty set → abort optimistic update, surface same-day-
  collision toast.
- Server-side authoritative; client-side short-circuit for UX
  speed only, not for security.

> **Amended by D13 (2026-06-14):** the client-side same-day short-circuit
> above is **dropped**. Phase 4 player surfaces are all-server (see
> `D13-phase4-player-surface-data-architecture.md`); `join_slot`'s same-day
> RAISE (`'D9 violation'`, ERRCODE `unique_violation`) is the **sole**
> same-day guard, caught in the join Server Action and surfaced as the
> collision toast after a brief round-trip. The "currently active same-day"
> client pre-query in the M4 bullets above is not built.

For M5 (leave flow + attendance confirmation):
- Leave flow surfaces reason picker per D7.
- Reason categories include "Switching to another game" alongside
  the existing categories.
- Leaving sets left_at + leave_reason on the membership record.
- Post-game prompt: "Did you make it? Yes / No / I'll let you know."
- Setting attended unblocks the cap independently of left_at.

### M5 status-transition constraint (recorded 2026-06-15) — NO HARD DELETES

Per R4 ("no client deletes"), the M5 leave path and any
waitlist-promotion path MUST mutate the membership **status**
(→ `'left'` / `'removed'`) and set `left_at` / `leave_reason` —
**never hard-delete the row.**

**Why this is load-bearing:** `trg_sync_slot_counts` fires
`AFTER INSERT OR UPDATE OF status` only, and its body reads
`NEW.slot_id`. On a `DELETE` there is no `NEW` row (`NEW.slot_id`
is NULL), so the trigger does not reconcile — a hard delete
**silently drifts `member_count`** with no error. A status→`'left'`
UPDATE is covered by the trigger; the count reconciles correctly.

**Use the existing transaction function if present.** M5 should
reuse a `leave_slot` (or equivalently-named) transaction function
IF one already exists — confirm at M5 time. If absent, build the
leave path with status-transition semantics (status→`'left'` +
`left_at` + `leave_reason`), **not** a delete, and behind a
transaction function (M3 discipline — all membership mutations go
through explicit Postgres transaction functions).

**Harmless aside:** `attest_attendance` updates `attended`, not
`status`, so it correctly does **not** trip `trg_sync_slot_counts`
— counts don't depend on attendance. Only status transitions move
`member_count`.

## Provisional for v1

Watch the first month of real M5+ data:
- Low flake rate + frequent cap-bumping → soften toward unlimited
  concurrent.
- High flake rate even with cap → consider strict global
  one-at-a-time.
- "Switching to another game" dominates leave reasons → consider
  inline-switch affordance (option C upgrade).

Decision doc gets amended with observation data; not rewritten.

## When to revisit

- After 30 days of real attendance + leave-reason data (M5+).
- If Density principle observably suffers (cap reduces opt-in
  counts faster than it improves attend counts).
- If user research surfaces same-day collision as a top friction
  point with no clean leave-and-rejoin path being used.
