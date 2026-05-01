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

For M5 (leave flow + attendance confirmation):
- Leave flow surfaces reason picker per D7.
- Reason categories include "Switching to another game" alongside
  the existing categories.
- Leaving sets left_at + leave_reason on the membership record.
- Post-game prompt: "Did you make it? Yes / No / I'll let you know."
- Setting attended unblocks the cap independently of left_at.

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
