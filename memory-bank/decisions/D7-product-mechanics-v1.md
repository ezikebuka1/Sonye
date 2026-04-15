# D7 — Product Mechanics for V1

**Decided:** 2026-04-15
**Status:** Approved, supersedes any prior assumptions about matching mechanics
**Relationship to projectbrief.md:** Clarifies the v1 implementation of "autonomously forms reliable critical-mass groups." Does not contradict the brief.

## Summary

V1 of SquadUp implements brief-aligned matching via **manually curated, recurring time slots** that users opt into. The system autonomously forms groups by filling published slots — not by searching across users in real time. Real-time autonomous matching ("Play Now") is deferred to v2 once liquidity supports it.

## Product Mechanics

### Slot model
- Slots are recurring weekly published time blocks (e.g., "Beginner Pickleball, Wednesday 7 PM at Cole Park").
- Slots are manually created by the project owner for v1. No automated slot generation.
- V1 launches with 1-3 slots and expands as liquidity grows.
- Each slot has: skill level, day of week, time, venue, sport, group capacity.

### Group size
- 6 players per slot for pickleball v1.
- Reasoning: a 4-player group with 1-2 no-shows produces a broken experience that drives users away. 6 absorbs 1-2 flakes and still produces a playable game (4+ players for doubles).
- Different sports may have different optimal group sizes in v2.

### Opt-in flow
- User sees available slots on the home screen.
- User taps a slot to opt in.
- When the slot fills (hits capacity of 6), the session is locked and all members are notified.
- Locked sessions are immutable — no one joins or leaves a locked session.

### Waitlist behavior
- Original slot is always the priority. Users opting into a slot with available spots go directly into the slot, not the waitlist.
- Waitlist exists only when the original slot is full (6/6).
- Waitlist holds 2 people for that specific slot.
- When a 3rd user attempts to join a full slot, the system notifies the project owner ("3 people waiting on Wednesday 7 PM — consider opening a new slot"). The owner manually decides whether to publish a new slot. **No automated slot spawning in v1.**
- Reasoning: extending Wizard of Oz pattern to slot expansion costs nothing (owner is already manual curator) and produces real demand intel before automation is built. Automate after first month of observation.

### Cancellation
- When a user cancels, the system asks one question: reason for cancellation (free text or short list — TBD during implementation).
- No reschedule prompt in v1. Reasoning: a user cancelling is the least-likely person to commit to a new time in the same flow. Reschedule UX must be tested with real users before being built.
- Cancellation reason data is collected to inform v2 reschedule design.

### Sole-occupant slot handling
- If a slot has only 1 opted-in user as game time approaches, the user is notified and prompted to either:
  - Join an existing slot that has room, OR
  - Join the waitlist for a different slot
- Original sparse slot is cancelled.
- Threshold for "approaching game time" — TBD during implementation. Default: 6 hours before slot start.

## Onboarding Schema (v1)

The in-app onboarding form captures these seven fields. The Waitlist Intake Script (separate document, not in repo) collects identical fields manually for pre-launch waitlist users.

| Field | Type | Notes |
|-------|------|-------|
| Name | text | Display name in app |
| Phone number | text | Required for SMS auth at launch |
| Sport | single-select | Hardcoded to "pickleball" in v1; field exists for v2 multi-sport readiness |
| Skill level | single-select | beginner / advanced beginner / intermediate / advanced |
| General availability | multi-select | weekday evenings / Saturday morning / Saturday evening / Sunday morning / Sunday evening |
| Preferred venues | multi-select | Cole Park (Dallas) / Churchill Park (Dallas) / Fretz Park (Dallas) |
| Willing to drive | single-select | Under 10 min / Under 20 min / Under 30 min / 30+ min or as far as needed |

**Why venue multi-select and not radius slider:** v1 venues are a small finite set of three specific vetted Dallas courts, not a search space. "Pick which of these works for you" is more honest UX than "draw a circle on a map." Radius search becomes relevant in v2 when venue count expands.

**Why "willing to drive" is collected in v1 even though v1 doesn't use it for matching:** schema consistency with manual collection (no migration at launch), and v2 matching algorithm will use this field to filter slot visibility. Capturing v2-relevant fields in v1 prevents needing to ask existing users to fill them in later.

## Waitlist Import Strategy

Pre-collected waitlist users (collected manually before app launch via Waitlist Intake Script) are pre-seeded into the database before launch day.

### Mechanics
- Waitlist data lives in a Google Sheet with the seven onboarding fields above.
- Pre-launch import script (`npm run seed:waitlist`) reads the CSV and creates user records with all preference data populated.
- On launch day, each waitlist user receives an SMS with a magic claim link.
- Tapping the link opens a "claim your account" flow: user verifies phone via OTP, account is linked to the pre-seeded record, user lands on home screen with preferences already set.
- User does not re-onboard. They confirm and start opting into slots.

### Why
- Waitlist users gave you data once already. Asking them to re-enter it is friction that loses conversions.
- Pre-seeded accounts mean launch day starts with active users, not an empty database.
- Trust signal: "we remembered you" reads better than "sign up like everyone else."

## V2 Architectural Breadcrumbs

V1 is built with the following affordances so v2 doesn't require migration:

| Field | Where | V1 use | V2 use |
|-------|-------|--------|--------|
| `creation_mode` on `sessions` | sessions table | always `scheduled_slot` | distinguishes `scheduled_slot` vs `play_now` |
| `sport` on `sessions`, `users` | sessions and users tables | always `pickleball` | enables multi-sport |
| `willing_to_drive` on `users` | users table | collected, not used | matching algorithm filters slots by user's drive willingness |

## V2 Roadmap (deferred, captured for context)

These features are explicitly out of scope for v1 but inform v1 architecture:

- **Play Now button:** real-time autonomous matching for spontaneous play. Requires substantial user pool. Activated once liquidity supports it.
- **Multi-sport:** expand beyond pickleball. Schema is ready; UI and venue inventory are the work.
- **Reschedule prompt on cancellation:** revisit only after collecting cancellation-reason data from v1 and testing the prompt with real users.
- **Automated slot spawning from waitlist:** revisit after first month of manual slot management. Owner will know the right thresholds from observation.
- **Weather monitoring:** non-critical for v1.

## Open Questions (to resolve during implementation)

- Exact sole-occupant timing threshold (default 6h before game; may tune)
- Cancellation reason format (free text vs short list)
- Magic claim link expiration (probably 7 days, TBD)
- What happens when a user wants to opt out of a non-locked slot they joined (probably "leave anytime before lock," confirm during implementation)

## Decisions This Document Replaces

- Original blueprint's "radius slider in miles" → replaced with venue multi-select
- Original blueprint's "specific time slot picker (Tonight 6pm, etc.)" → replaced with general availability multi-select
- Plan's M5 description of "matching algorithm" → simplified to "slot fill triggers session lock"
- Any prior assumption that v1 includes real-time autonomous matching → deferred to v2 as Play Now

## Process Note: Sketches Before Code

As of 2026-04-15, all visual design proposals must be presented as sketches (rendered HTML/SVG artifact previewable in browser) before any implementation. The architect session enforces this rule. No design decisions get handed to Code without an approved visual sketch.
