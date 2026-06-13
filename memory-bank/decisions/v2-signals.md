# V2 Signal Log

Status: Locked 2026-05-16

> Ideas deferred out of v1, with the trigger that would make each
> reconsiderable. Deferral is not rejection. Each entry: what it is,
> why it's not in v1, what data would earn it a second look.

## The v2 evolution axes

v1 can grow in four possible directions. Which one comes first is
decided by real v1 data, not now:

1. Activity-broad — add tennis, basketball, etc. (from the brief)
2. Geography-broad — add Austin, Houston, etc. (from the brief)
3. Mechanic-broad — scheduled games → spontaneous "Play Now"
   (from field research)
4. Coordination-broad — organizer-run → player-run via park
   communities (from the QR-code idea)

## Deferred features

Play Now / Hyper-Spontaneous home screen. Field research showed
players act on impulse, day-of, weather-driven. v1 stays scheduled
because we don't have enough players yet for "find me a game right
now" to actually produce a game. Revisit when v1 density data shows
enough liquidity. The spontaneous-player archetype is the target
user for this when it ships.

Duo Pairing. Letting two solo players team up before joining a game.
Cut from v1 — it's a real feature build that doesn't actually add
players (two solos joining = same fill as a pair joining). Revisit
if v1 data shows pairs joining the same game within minutes of each
other is a frequent pattern.

Vetted Network / friend list. Players want a digital address book of
people they've played with and trust. Cut from v1 — it's a full
social-graph feature, not a free byproduct. Revisit if v1 share-link
traffic clusters heavily around past teammates. The park-community
idea below may be the better-shaped version of this.

Sub-In (transfer your spot to a friend). A player bails because a
real-life friend became available; they hand their game spot to that
friend. Cut from v1 — needs the friend in the system, and grows the
friend-network not Sonye's network. The v1 path is "leave with
reason," and "a friend became available" is one of the leave reasons.
Revisit if that becomes the dominant leave reason in the first month.

QR codes at parks → park communities. Physical QR code at each court;
scan to join that park's community; schedule games with whoever's in
it. Genuinely new idea (owner's own, not from research). Deferred
because naive version fragments players the way the competitor
TeamReach does. If built in v2, must be designed so communities add
visibility, not wall players off. Cleanest candidate to also solve
the Vetted Network need.

Gender enforcement. v1 uses honor-system for women's/men's games
(organizer watches roster manually). Automated enforcement (app
blocks wrong-gender joins) deferred — needs required gender data,
messy with non-binary / skipped users. Revisit if manual oversight
stops scaling.

Pre-join avatar color visibility. Showing game gender-composition on
the home screen before joining. Deferred — a changeable snapshot is
weak grounds for a safety decision; the women's/men's tag is the
strong tool instead. Revisit if women's-tagged games consistently
underfill while mixed games have many women.

Fretz Park (and pay-to-play venues). Removed from v1 — paid, gated,
app-booking required, kills the frictionless model. Reconsiderable
only if a future version builds payment + third-party-booking
integration. Operational facts for that future: gatekeeper was lax
but present (the desk's mere existence repels spontaneous players);
zero solo players observed there at all.

Profile pictures. Already in the brief's icebox. Highest-attrition
onboarding step; the realness strategy is built around not needing
them. Revisit at ~500 active users in one metro.

Play-reason matching. Already in the brief's icebox. Tagging games by
intent (competitive vs casual) and letting players filter. Fragments
density. Field research confirmed players compromise on vibe for
court time anyway. Revisit post-launch if mismatched-intent games
visibly produce bad experiences.

**Public discovery surface + anonymous-viewer privacy posture.**
v1 ships with the locked Partiful Model — anonymous viewers on
slot detail pages (`/slot/<id>`) see first names of joined
members. If Instagram bio-link traffic becomes a meaningful share
channel and the privacy posture starts to feel worth hardening,
this becomes a focused work stream rather than a one-off feature.
Two pieces, designed together:

1. **Public browse-all surface at `/games`** — auth-less list of
   open slots, sorted soonest-first, locked games excluded.
   Top-level route, not an affordance on slot detail (a "see
   other games" button on a slot page is conversion poison — it
   diverts the invited visitor away from the specific game the
   share was for). Bio link points at `/games` when no specific
   slot is being featured; points at `/slot/<id>` when one is.

2. **Anonymous-viewer projection hardening** — for unauthenticated
   viewers across all public surfaces (`/slot/<id>` and `/games`),
   member identity drops to initials only, neutral avatar color,
   no gender tags, no skill badges. Authenticated viewers continue
   to see first names + D8.1 gender-derived avatar colors per the
   existing D10 lobby semantics. Amends D7's Partiful Model.

Deferred because it's one piece of a larger v1.5/v2 privacy pass
that will also need to address profile visibility, attendance-
history exposure, the `chat_messages` dormant table revisit,
account deletion / data export (GDPR-shaped if growth crosses
state or national lines), and possibly rate-limiting on public
slot URLs to defeat scraping. Doing browse-all in isolation now
means redoing it in privacy-pass context later.

Trigger to revisit: when Instagram (or another social channel)
becomes a meaningful share channel and bio-link traffic feels
worth measuring — at which point this work stream and the
broader v1.5/v2 privacy pass earn the build cost together. Also
revisit if a user surfaces a concrete privacy complaint about
the Partiful Model surface during v1.

Structural counter-argument to keep in view when revisiting: a
browse-all surface is a comparison surface. Anonymous visitors
with no specific intent self-select into the most-filled slots —
the ones that least need them — and the lowest-density slots stay
low-density. Same density-fracturing logic that defers skill
filters and play-reason matching. Worth weighing against the
top-of-funnel marketing flexibility browse-all unlocks.

**Availability + courts (optional profile surface).** D7.4
(Locked 2026-06-10) iceboxes `general_availability` and
`preferred_venues` from the in-app onboarding form. Both columns
stay in the schema (nullable). Revisit as an optional, returninguser
profile edit — at their own pace, never onboarding friction — once
v1 ships venue- or time-aware matching that would actually read
these fields.

Cell Division — automated waitlist → new game.
Captured 2026-06-10 (from Phase 3B waitlist design discussion).
Revisit trigger: v1 density proven AND waitlists routinely run
deep — per D7's "automate after first month of observation." This
is the automation of D7's manual owner-spawn step.

The mechanic (proposed): threshold = 4 (minimum viable doubles
game). On hitting 4 waitlisted players: pull them into a NEW slot
inheriting day, time, and skill. Venue = TBD. SMS the four:
"you've got 4 players for [day/time]. claim a venue to unlock the
game." First to claim a venue becomes the organizer.

The court-collision footgun (the keeper insight): cloning the
venue stacks multiple games on one public court — 18 people, one
court, a real turf war. Venue-TBD + organizer-claim forces
geographic distribution instead of stacking.

Why it's v2, not v1:
- Contradicts D7's locked "no automated slot spawning in v1" (the
  manual step earns the demand intel that sets the threshold).
- Introduces user-organized games, which reworks the
  `slots_insert_owner` / `is_owner()` RLS gate and the Public
  Commons venue-vetting model.
- Venueless slots ripple through everything shipped: slot detail
  + OG (Phase 2), lobby, attendance, `slot_share_preview`.
- Depends on outbound SMS (Phase 6).

v1 stays: uncapped waitlist, no hard reject; owner monitors depth
via a saved query and spins up slots by hand.

Open v2 questions: no-claim timeout / fallback; organizer trust +
venue vetting for user-claimed courts; threshold tuning from real
data; interaction with eventual Play-Now matching.

## Phone-reveal timing & opt-out — declined for v1 (2026-06-11)

Two related proposals evaluated and declined (Ebuka + Gemini + architect):

1. Per-user reveal opt-out — declined. No home without breaking canon
   (5th onboarding field breaks D7.4's locked form; join-screen toggle
   taxes the conversion-critical funnel); placebo (first outbound text
   reveals you anyway); reciprocity trap (hidden = unreachable = no-show
   risk, or voyeur-mode degrading group trust).

2. Confirmation-gated reveal (reveal only after "everyone confirms") —
   declined. Reveal is permanent, so delay shrinks but never closes the
   harvest window (a motivated harvester just confirms first); gate fires
   early = reveal-at-lock (already rejected in D10), fires late = kills
   the coordination window D10 exists for; a pre-game confirmation state
   machine is net-new scope overlapping D11's locked post-game flow.

Harvest exposure is already structurally bounded: mutual reveal (you
expose your own verified number to see others'), D9 caps at one joined
game per day (≤5 numbers/day), manual curation surfaces repeat
join-and-bail by name.

Revisit triggers (first month of M4+ data, per D10 provisional):
(a) signups dropping at the join disclosure, (b) women's-game signups
materially lagging, (c) exposure/harassment complaints, (d) no-show
divergence in any hidden-pattern cohort.

If triggered: the canon path is a Sonye-mediated layer (proxy numbers /
hosted group thread per D10) — never a roster toggle or reveal gate.
Pre-explored design banked (2026-06-11 exploration, Direction B):
profile-level "who can text me first," default share, group-facing
label "texts first," disclosure restates the current setting at every
join.
