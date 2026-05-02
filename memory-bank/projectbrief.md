# Project Brief

## Vision (the destination)

A frictionless way for adults to participate in any group activity
they want — pickleball, tennis, go-karting, basketball, anything —
without depending on the friends who flaked, the group chat that
died, or the night of staying home because the logistics broke.

You see something you want to do tonight. You tap Join Now. You're
in a game with other people who also wanted to do that thing
tonight. The group forms. You play.

The brand promise at this destination: **nothing holding you back.**

This is the long-horizon product. It is not what v1 ships.

## Operating philosophy: evolution-first, not scalable-first

InTotality (working name; see naming notes in activeContext.md) is
deliberately built to evolve, not to scale.

A scalable product is one whose v1 architecture handles v100 with
more capacity. An evolutionary product is one whose v1 architecture
is designed to **become a different product** as conditions change.
v1 is the first form. v2 is a different form, gated on real-world
threshold conditions (density, liquidity, observed demand). v3 is
yet another form. Each version is designed to outgrow itself.

This is harder to build than scalable-first because every v1
decision must be evaluated against a second filter beyond v1
correctness: does this decision preserve future evolution paths,
or does it foreclose them? D7's v2 breadcrumbs (creation_mode,
sport, willing_to_drive — fields collected in v1 that v2 will use
without forced migration) are the first concrete instance of this
discipline applied to schema. The same discipline applies to every
future architectural choice.

The cost of this discipline is real. The benefit is that when
density data tells us it's time to evolve, the path is open.

## V1 — the first form

V1 is **manually curated, recurring time slots in pickleball, in
Dallas**. The owner publishes Saturday 8 AM Cole Park three days
in advance. Users opt in. When the slot fills (capacity 6), the
group locks. The game happens.

V1's honest brand promise: **curated games with reliable groups,
in Dallas.**

This is narrower than the vision on every dimension:
- **Mechanic:** scheduled slots, not spontaneous matching. The
  user joins a pre-existing group at a set time, not a "right now"
  group.
- **Activity:** pickleball only. Not multi-activity.
- **Geography:** Dallas only. Three vetted courts (Cole Park,
  Churchill Park, Fretz Park).
- **Curation:** manual by the owner. Not autonomous.
- **Promise:** reliability and quality, not zero-friction
  spontaneity.

V1's narrowness is the strategy, not a limitation to apologize for.
Density requires concentration. The waitlist exists in Dallas.
Curation is feasible at the scale of three venues and one sport.
Doing the narrow thing well is the gate that unlocks doing broader
things at all.

## What v1 deliberately does NOT do

- No real-time autonomous matching ("Play Now"). Deferred until
  density supports it — likely Vn where n ≥ 2, gated on observed
  liquidity, not calendar.
- No multi-activity. One sport only at launch. Schema is multi-
  activity-ready; product surface is not.
- No multi-city. Dallas only. Schema is multi-city-ready; product
  surface is not.
- No filters or segmentation that fracture the user pool (skill
  filters beyond the existing slot tier, play-style preferences,
  etc.). See V1 Decision Principle below.
- No profile pictures. See V1 Realness Strategy below.

These are not features missing from v1; they are evolution surface
area held in reserve.

## V1 → Vn evolution map (the trajectory)

The next evolution after v1 hits density depends on what real users
do and what the liquidity principle dictates. Two plausible next
moves; ordering is deliberately TBD until v1 data informs it:

- **Activity-broad next:** one sport Dallas → tennis Dallas →
  more activities in Dallas. Stay narrow geographically; broaden
  activity-wise.
- **Geography-broad next:** one sport Dallas → same sport Austin
  / Houston / OKC. Stay narrow activity-wise; broaden
  geographically.

The decision between these is gated on observed density patterns
and waitlist signal in v1. Capturing both as live options
intentionally — not picking now means the schema must keep both
seams open in M3 (D3).

The eventual evolution into real-time autonomous matching ("Play
Now") sits beyond either of these expansions. It requires
sufficient liquidity within whatever scope it operates on. It is
the long-horizon mechanic, not the immediate next step.

## V1 Decision Principle: Density Over Everything

The dominant risk in v1 is not bad matching — it is empty slots. A
slot with 3 players and mediocre chemistry is strictly better than
a slot with 1 player and perfect chemistry, because the first
produces a game and the second does not.

Every feature proposal during v1 must answer: "Does this improve
density and liquidity, or does it fracture the user base further?"
Filters, preferences, and segmentation axes all carry a density
cost, because each one splits the pool of opt-ins into smaller
sub-pools.

Features that improve density earn a place in v1. Features that
fracture — no matter how good the product intuition behind them —
are held for Vn until post-launch data shows density is high
enough to afford the segmentation.

This principle is v1-tactical. It descends from the evolution-first
philosophy: density is the *threshold condition* that gates the
transition from v1 to Vn. Without v1 density, no evolution happens
at all.

(Articulated 2026-04-24 during M1 checkpoint, in response to the
play-reason matching proposal. See PLAN.md icebox.)

## V1 Design Pattern: The Partiful Model

V1 optimizes for frictionless group-chat-to-on-the-list
conversion. Inspiration: Partiful, which bypasses the native-app
graveyard by being shareable via rich-link-preview into iMessage /
WhatsApp / Signal and auth-less until commitment.

Concrete v1 implications (acceptance criteria for relevant
milestones):

- Slot detail pages have dynamic, state-aware Open Graph metadata
  so shared links unfurl as compelling previews in group chats.
  Preview content shifts by fill state (0/6 leads with vibe;
  3/6–5/6 leads with social proof; 6/6 leads with waitlist FOMO).
- View-first, auth-second: unauthenticated users can see a slot,
  its fill count, and the named members already in (first name +
  initial avatar — that's it). Auth wall triggers only at the
  Join button.
- Lobby/slot views show name + initial only. No skill, no badges,
  no extra metadata. Clean, scannable, fast — the page stays calm
  even with a full roster. Curious users tap a name to open that
  player's profile, where richer detail (skill level, games
  played, preferred venues, member-since) appears. Progressive
  disclosure.
- Member identity in v1 = first name + initial avatar in roster
  contexts; full profile available on tap. Profile pictures NOT
  in v1 (see PLAN.md icebox).
- Auth is SMS OTP only. No passwords, no email. D2 will codify.
- SMS is the notification layer for commitment-critical events
  only (game locked, game tomorrow). Chat messages never trigger
  SMS — avoiding the notification-fatigue failure mode.
- Share surfaces emphasize the sharer when they are a slot member
  (e.g. "Jordan is playing Sunday at Fretz, join them") —
  leveraging player-as-voucher social proof, which is stronger
  than owner-as-promoter.

This pattern serves the density principle: every friction cut
between link-tap and on-the-list is a density multiplier; every
friction step is a density tax.

(Captured 2026-04-18 from architect discussion of Gemini's
Partiful analysis.)

Note on divergence from Partiful proper: Partiful's unit is a
one-time event with a host-curated invite list. v1's unit is a
recurring slot with an owner-curated supply and a demand pool of
skill-matched players. The sharing mechanics are borrowed; the
matching and quality-control problems are ours to solve.

## V1 Realness Strategy: Real People Without Density Tax

Real-user feedback raised the question: "How do users know other
users are real humans, not bots or stale profiles?" The default
answer in most consumer apps is profile pictures — which fails the
V1 Decision Principle on density grounds (see PLAN.md icebox).

V1 instead leans on realness signals that fall out of the existing
mechanics for free, with zero added onboarding friction:

- **First names, not handles.** "Marcus" reads as a person;
  usernames read as bots. Already enforced via D7 onboarding
  schema.
- **Human-written chat.** Three seeded lobby messages model the
  expected register: real, specific, useful. Sets the tone for
  real user chat.
- **Avatar color variance.** Blue palette of 4-5 shades
  distinguishes members visually without needing photos.
- **Member-since timestamp on profiles** (M3+). Account-creation
  date signals real-person history; bot patterns (all created
  same day) become visible.
- **Games-played counter on profiles** (M5+). Track record is the
  single strongest real-person signal. Bots don't show up to
  games.
- **Last-played timestamp on profiles** (M5+). Distinguishes
  active humans from drifted-away accounts.
- **SMS-verified phone badge on profiles** (M4+). Cost-floor for
  bot operators. Free byproduct of D2/SMS-OTP auth.

The structural realness move, beyond any individual signal, is
**density itself**. A populated v1 is automatically credible; an
empty one is automatically suspect. The launch-day strategy of
onboarding the entire pre-launch waitlist simultaneously via SMS
magic links is the realness move. Pre-launch waitlist is not just
users — it is manufactured social proof.

(Captured 2026-04-25 from real-user feedback during M1 pause.)

## The Goal (concrete)

Design, build, and deliver a fully functional, reliable v1.
Pre-launch waitlist of real users (collected manually) is
pre-seeded into the database; launch day onboards them via SMS
magic-claim links. Measure engagement, iterate based on real-world
coordination data. Density and follow-through are the metrics that
gate the transition out of v1 into Vn.
