# Project Brief

## The Problem
Organizing casual sports is high-friction. For a 25-45-year-old who just moved to a new city, showing up to a park alone is intimidating, and managing a messy group chat is a logistical nightmare. People flake, skill levels clash, and games fall apart.

## The Solution
A mobile-first PWA that acts as a matchmaking and coordination engine. Users input their availability, skill, and preferred venues. The system autonomously forms reliable, critical-mass groups by filling pre-published time slots.

## V1 Mechanism (per D7)
V1 implements brief-aligned matching via **manually curated, recurring time slots** that users opt into. Pickleball only. Three Dallas venues at launch (Cole Park, Churchill Park, Fretz Park). Group size of 6 to absorb 1-2 flakes without breaking the experience. Owner manually curates slots and waitlist expansion for the first month, then automates based on observed patterns.

## V2 Vision (deferred, captured for direction)
Multi-activity (paintball, tennis, etc.). "Play Now" button for spontaneous autonomous matching once user pool supports it. Reschedule prompts on cancellation, automated slot spawning, weather monitoring. All deferred to v2 — see `decisions/D7-product-mechanics-v1.md`.

## The Goal
Design, build, and deliver a fully functional, reliable MVP. Pre-launch waitlist of real users (collected manually) is pre-seeded into the database; launch day onboards them via SMS magic-claim links. Measure engagement, iterate based on real-world coordination data.

## V1 Decision Principle: Density Over Everything

The dominant risk in v1 is not bad matching — it is empty slots. A slot
with 3 players and mediocre chemistry is strictly better than a slot
with 1 player and perfect chemistry, because the first produces a game
and the second does not.

Every feature proposal during v1 must answer: "Does this improve
density and liquidity, or does it fracture the user base further?"
Filters, preferences, and segmentation axes all carry a density cost,
because each one splits the pool of opt-ins into smaller sub-pools.

Features that improve density earn a place in v1. Features that
fracture — no matter how good the product intuition behind them — go
to v2 until post-launch data shows density is high enough to afford
the segmentation.

This principle was articulated 2026-04-24 during M1 checkpoint, in
response to the play-reason matching proposal (see `PLAN.md` icebox
for that specific deferral).

## V1 Design Pattern: The Partiful Model

V1 optimizes for frictionless group-chat-to-on-the-list conversion.
Inspiration: Partiful, which bypasses the native-app graveyard by
being shareable via rich-link-preview into iMessage/WhatsApp/Signal
and auth-less until commitment.

Concrete v1 implications (acceptance criteria for relevant milestones):
- Slot detail pages have dynamic, state-aware Open Graph metadata so
  shared links unfurl as compelling previews in group chats. Preview
  content shifts by fill state (0/6 leads with vibe; 3/6-5/6 leads
  with social proof; 6/6 leads with waitlist FOMO).
- View-first, auth-second: unauthenticated users can see a slot, its
  fill count, and the named members already in (first name + initial
  avatar — that's it). Auth wall triggers only at the Join button.
- Lobby/slot views show name + initial only. No skill, no badges, no
  extra metadata. Clean, scannable, fast — the page stays calm even
  with a full roster. Curious users tap a name to open that player's
  profile, where richer detail (skill level, games played, preferred
  venues, member-since) appears. Progressive disclosure: information
  is there for those who want it, out of the way for those who don't.
- Member identity in v1 = first name + initial avatar in roster
  contexts; full profile available on tap. Profile pictures NOT in
  v1 (see PLAN.md icebox).
- Auth is SMS OTP only. No passwords, no email. D2 will codify.
- SMS is the notification layer for commitment-critical events only
  (game locked, game tomorrow). Chat messages never trigger SMS —
  avoiding the notification-fatigue failure mode.
- Share surfaces emphasize the sharer when they are a slot member
  (e.g. "Jordan is playing Pickleball Sunday at Fretz, join them")
  — leveraging player-as-voucher social proof, which is stronger
  than owner-as-promoter.

This pattern serves the density principle: every friction cut between
link-tap and on-the-list is a density multiplier; every friction step
is a density tax. Captured 2026-04-18 from architect discussion of
Gemini's Partiful analysis.

Note on divergence from Partiful proper: Partiful's unit is a one-time
event with a host-curated invite list. SquadUp's unit is a recurring
slot with an owner-curated supply and a demand pool of skill-matched
players. The sharing mechanics are borrowed; the matching and
quality-control problems are ours to solve.

## V1 Realness Strategy: Real People Without Density Tax

Real-user feedback raised the question: "How do users know other users
are real humans, not bots or stale profiles?" The default answer in
most consumer apps is profile pictures — which fails the V1 Decision
Principle on density grounds (see PLAN.md icebox).

V1 instead leans on realness signals that fall out of the existing
mechanics for free, with zero added onboarding friction:

- **First names, not handles.** "Marcus" reads as a person; usernames
  read as bots. Already enforced via D7 onboarding schema.
- **Human-written chat.** Three seeded lobby messages model the
  expected register: real, specific, useful. Sets the tone for real
  user chat.
- **Avatar color variance.** Blue palette of 4-5 shades distinguishes
  members visually without needing photos.
- **Member-since timestamp on profiles** (M3+). Account-creation date
  signals real-person history; bot patterns (all created same day)
  become visible.
- **Games-played counter on profiles** (M5+). Track record is the
  single strongest real-person signal. Bots don't show up to games.
- **Last-played timestamp on profiles** (M5+). Distinguishes active
  humans from drifted-away accounts.
- **SMS-verified phone badge on profiles** (M4+). Cost-floor for
  bot operators. Free byproduct of D2/SMS-OTP auth.

The structural realness move, beyond any individual signal, is
**density itself**. A populated SquadUp is automatically credible;
an empty one is automatically suspect. The launch-day strategy of
onboarding the entire pre-launch waitlist simultaneously via SMS
magic links is the realness move. Pre-launch waitlist is not just
users — it is manufactured social proof.

Captured 2026-04-18 from real-user feedback during M1 pause.
