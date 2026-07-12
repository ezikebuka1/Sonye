# D10 — Lobby Communication

> ⚠️ SUPERSEDED IN PART by Amendment A (end of doc). Peer phone visibility is
> removed — phone numbers are visible to the game owner only, never between
> players. The "joined members see each other's phones" decision below
> (§The Decision, the reveal/waitlist asymmetry, and the UX-disclosure copy)
> is no longer in effect. Coordination moves to the lobby wall
> (Amendment B, below).

**Decided:** 2026-05-21
**Status:** ✅ Decided. Implementation in M3.1 (schema patch) and M4
(lobby UI surface).
**Amends:** D3 working schema (slot_roster shape); supersedes any
prior assumption that in-app chat is v1's coordination channel.
**Blocks:** M3.1 (schema patch), M4 (lobby phone-directory UI).
**Related:** D7 (lobby is part of v1 mechanics), D8 (visual surface),
D9 (joined-status is the gate), V1 Decision Principle (density), V1
Realness Strategy, Partiful Model.

## The Decision

V1 does NOT use in-app chat for coordination. Locked-group
communication happens off-platform via SMS/iMessage on the users'
own phones.

Mechanism: members of a slot who hold `status = 'joined'` see each
other's phone numbers in the lobby. Tapping a number opens the
device's native messaging app (`sms:` URI scheme, prefilled body
in M4). Coordination — confirming attendance, asking who's bringing
balls, last-minute cancellations — happens in iMessage, not in
Sonye.

## The Problem

V1 is a web app, not a native app. Web-app chat is dead chat —
users do not open browser tabs to read a message thread the way
they open iMessage. Building lobby chat as a coordination surface
in a web context is building a feature users won't use.

The schema's `chat_messages` table was designed before this
realization. Keeping it as the coordination channel meant shipping
a feature the user research and operating principles both predict
will fail.

## Why phone-number reveal instead of group-SMS-from-Sonye

Considered three alternatives:
- Auto-create a Twilio group thread on lock.
- Keep in-app chat as a thin "courtesy" surface.
- Reveal phone numbers and get out of the way. ← chosen.

Chose phone reveal for five reasons:

1. **Matches the Partiful Model.** Frictionless coordination on
   the rails users already live on. Sonye's job is to form the
   group; the conversation is the group's.

2. **Zero ongoing infrastructure.** No Twilio account, no per-
   message billing, no moderation surface, no group-MMS provider
   support burden, no compliance work around carrier rules.

3. **Density-positive.** A user who joins a 3/6 slot can text the
   two others: "trying to grab a buddy for doubles — anyone know
   another?" The reveal mechanic itself becomes a recruitment
   surface. Group-SMS-from-Sonye does not.

4. **Reinforces the Realness Strategy.** A user willing to text
   strangers about a real game is a real user. A bot operator
   running fake accounts cannot service real SMS conversations
   without scaling cost. Phone-as-coordination is itself a
   realness amplifier.

5. **Privacy gate is meaningful and consent-shaped.** Numbers
   reveal only between users who have *both* committed to the
   same specific game by holding `status = 'joined'`. Not a
   directory, not searchable, not exposed to anonymous viewers,
   not exposed to home-screen browsers, not exposed to waitlisted
   users.

## Reveal trigger: joined-status, asymmetric with waitlist

Numbers reveal the moment a user holds `status = 'joined'` in a
slot, not on slot lock. Reveal-at-lock was considered and rejected
because:
- Information given cannot be ungiven. If lock triggers reveal
  and a member subsequently leaves, hiding numbers in-app is
  theater (the numbers are already in iMessage history).
  Reveal-at-join avoids the entire state-mismatch class.
- Reveal-at-join enables pre-lock liquidity behavior (members
  recruiting more members via direct text) that reveal-at-lock
  silently kills.

Asymmetry with waitlist:
- Joined users see each other's phones.
- Joined users do NOT see waitlisted users' phones.
- Waitlisted users do NOT see joined users' phones.
- A waitlisted user who is promoted to joined enters the visible
  set at the moment of promotion.

Why asymmetric: waitlisted users have not secured a seat. The
phone-visible set is the "people committed to playing this game"
circle. Waitlist is a queue, not a commitment. Symmetry would dilute
the realness signal and expose phones across a softer threshold than
the schema otherwise treats as meaningful.

## chat_messages table: dormant

The `chat_messages` table, its index, its RLS policies, and the
chat_messages-relevant grants stay in the schema. They are not
exercised by any v1 UI. Rationale:
- A DROP migration on a freshly-applied schema is wasted churn.
- The table is zero-cost when idle.
- V2 evolution paths (Play Now, multi-day campaigns, organizer-
  facilitated chat for women's/men's games) may legitimately
  resurrect a chat surface, and rebuilding the table later costs
  more than leaving it dormant now.

The seeded "three lobby messages" in mockData remains for design
reference only; M4 ships no chat read path.

## What this policy is NOT

- Not a permanent removal of chat. v2 may revisit.
- Not a removal of the chat_messages table.
- Not a notification channel. Sonye sends SMS only for
  commitment-critical events (per the brief's Partiful Model
  notes). Coordination texts are user-to-user, off Sonye's path.
- Not contact-sharing in the social-graph sense. There is no
  address book, no contact list, no "people you've played with"
  view in v1. Phones are visible only inside the slot lobby, only
  for the duration of joined membership.

## UX disclosure

The privacy posture must be visible to the user. Concrete
requirements for M4:
- A one-line disclosure at the join action (either on the slot
  card's join confirmation toast, or as a tooltip-style note on
  the Join button itself): "Members of a game can see each
  other's phone numbers." Tone register: D5 (contractions,
  lowercase mid-sentence acceptable, no period if single clause).
- The lobby surface labels the phone directory area clearly
  enough that a user understands what it is on first view.
- Final copy and placement: M4 architect call with sketch.

## Implementation requirements

For M3.1 (schema patch, in-place edit to migration file before
cloud apply):

1. New helper `is_joined_member(p_slot uuid) RETURNS boolean`:
   - LANGUAGE sql STABLE SECURITY DEFINER, SET search_path = ''.
   - Body: EXISTS over session_memberships filtered to
     `user_id = current_user_id() AND status = 'joined'`.
   - Mirrors `is_active_member` pattern exactly. Stays PURE per
     load-bearing dependency R5; owner-ness is added per-policy
     via OR is_owner().
   - REVOKE FROM PUBLIC; GRANT EXECUTE TO authenticated.

2. `CREATE OR REPLACE FUNCTION slot_roster(target_slot uuid)`:
   - Return TABLE shape gains `phone text` column. New shape:
     `(membership_id uuid, first_name text, gender text,
       phone text, status text)`.
   - WHERE clause unchanged: roster visibility still gated on
     `is_active_member(target_slot) OR is_owner()`. Waitlisted
     users continue to see the roster.
   - Phone projection uses a CASE expression:
       phone visible iff
         (caller is joined OR caller is owner)
         AND row.status = 'joined'
       else NULL.
   - Owner sees all joined-row phones via the is_owner() branch.

3. Verification additions to phase3b:
   - **Proof 9:** joined user A in slot X sees joined user B's
     phone in slot_roster; sees NULL for any waitlisted user's
     phone column.
   - **Proof 10:** waitlisted user C in slot X sees the roster
     (existing behavior preserved) but ALL phone columns return
     NULL.
   - **Proof 11 (owner branch):** owner sees joined users'
     phones across any slot via is_owner() branch; sees NULL on
     waitlisted-row phones.
   - Existing proofs continue to pass; the slot_roster shape
     change requires updating the expected-columns list in any
     proof that asserts roster shape.

4. The migration file is edited in place. Re-run the full local
   verification battery (Phases 3A + 3B + new proofs 9–11). All
   must pass before the schema is considered re-ready for cloud
   apply.

5. Closeout document `m3-closeout.md` is amended with a brief
   "M3.1 patch" section noting the new helper, the slot_roster
   shape change, and the two-to-three new proofs. The seven
   load-bearing dependencies list gains a new entry if the M3.1
   build surfaces one — none expected from the spec alone.

For M4 (lobby phone-directory UI):
- Lobby view, joined-section: phone shown alongside first name
  and avatar for each joined member except self.
- Phone rendered as a tap-to-message link (`sms:` URI with
  prefilled `?body=` introducing the sender by name and slot).
- iOS/Android `sms:` quirks handled per device — captured in M4
  build, not D10's surface area.
- Waitlist section, if shown at all in the lobby, omits the
  phone column entirely (the column simply isn't rendered).
- Privacy disclosure copy and placement per "UX disclosure"
  section above; final wording via sketch approval.
- No new schema reads beyond slot_roster (the patched function
  already returns everything M4 needs).

## What this policy depends on for v1

- D9 holds — one joined slot per Dallas calendar day means a
  given user's phone exposure is bounded: at most one joined-
  group of strangers per day per user. Containment.
- Waitlist promotion (M4–M5 flow) must trigger a UI re-read so
  the newly promoted user immediately sees joined phones and
  their phone becomes visible to the existing joined set. The
  patched slot_roster handles this declaratively — no special
  case in code; the re-read just returns the new shape.
- The leave flow (M5) silently removes the leaver from the
  visible set on subsequent reads. Numbers already exchanged
  remain in iMessage; the in-app surface goes back to truth.

## Provisional for v1

Watch the first month of real M4+ data:
- If users frequently complain about phone-number exposure or
  request a "leave the group chat" action, revisit toward a
  Sonye-hosted group-thread option (Twilio rejoinder).
- If phones-revealed surfaces become a vector for harassment or
  abuse, revisit toward a Sonye-mediated layer (proxy numbers or
  in-app chat resurrected).
- If group-coordination texts visibly improve attendance vs.
  attendance pre-launch (compared against the slot-attended-
  ratio M5 surfaces), that's confirmation; no change needed.

## When to revisit

- After 30 days of real lobby + attendance data.
- If a "Vetted Network" / contact-list surface gets earned in
  v2 (per v2-signals.md), this decision feeds into the broader
  contact-visibility design and is partially superseded.
- If any U.S. carrier policy or regulatory change makes phone-
  number-display in PWAs friction-laden in a way that's not
  visible from current information.

## Amendment A — Peer phone visibility removed (owner-only)
2026-06-18. Amends D10's core decision and the M4 lobby UI. Urgent pre-launch
security fix. Implemented in commits 4c3a3ba (schema) + 5b7b042 (UI).

What changes. Phone numbers are no longer visible between players. slot_roster
projects phone to the owner only (is_owner() branch); every non-owner caller —
joined or waitlisted — receives NULL. The lobby renders the phone + sms: link
only when a phone is present (owner only); players see first name, avatar, skill.

Why. D10's containment argument (§"What this depends on for v1") rested on D9:
one joined slot per Dallas day bounds phone exposure. M5 (player-leave) voids it
— leave frees the D9 cap, so a user can join → read the roster → leave → rejoin
without limit, harvesting the whole Dallas calendar. The rate limit that made the
reveal bounded no longer holds once M5 is live (it is). Independent of the
exploit: auto-revealing a personal number on join is bundled, irreversible
consent and a deterrent to joining (women especially) — a density cost.

Coordination replacement. Off-platform SMS is replaced by an in-app per-game
lobby wall (canned taps + free-text) on the resurrected chat_messages table —
Amendment B, below. Until it ships, coordination routes through the owner,
who retains phone access.

Superseded in D10. §The Decision (joined see phones); the phone half of the
reveal/waitlist asymmetry; the M4 sms: link UI; the UX-disclosure copy.

Unchanged. Roster visibility (joined + waitlisted still see the roster); the
is_owner() owner-sees-phones branch; RLS on users (own-row-only).

Process note. This doc landed after the implementation rather than before — a
one-time deviation from decision-doc-first, recorded and accepted. Main is
consistent as of this commit.

## Amendment B — Lobby Wall (in-app coordination)
2026-06-18. Replaces D10-A's interim "coordination via owner" with an in-app
per-game wall, built on the resurrected chat_messages table.

**The decision.** Coordination moves on-platform to a per-game lobby wall: canned
presence taps ("I'm here," "On my way," "Running ~10 late") plus free-text
messages, both written to chat_messages (a canned tap is just a fixed-body
insert). Visible to the game's joined players and the owner.

**Audience — joined-only.** SELECT gates on is_joined_member(slot_id) OR
is_owner(); INSERT on is_joined_member(slot_id) AND user_id = current_user_id() —
both switched off is_active_member, which had included waitlisters. Waitlisters
can neither read nor post. Rationale: matches D10's committed-players boundary
(waitlist is a queue, not a commitment; promotion brings them in), and prevents
the wall becoming a backdoor for the peer-PII removed in D10-A. The owner reads
every wall (is_owner branch) but posts only where they're a joined player;
owner-broadcast-without-playing is a v2 add if ever needed.

**Moderation — owner-delete via RPC.** No raw client DELETE (M3 R4). Moderation is
owner_delete_message(p_message_id) — SECURITY DEFINER, checks is_owner(), drops
the row. chat_messages is a leaf table, so the delete orphans nothing. Messages
otherwise immutable (no UPDATE policy). Kicking a player removes their access but
leaves their posts; owner-delete pulls a specific bad message.

**Retention — persist, hide post-game.** Rows are retained, not deleted; the wall
is surfaced only while the game is live. Deliberate: the log is a trust-and-safety
audit trail — a next-day harassment report needs evidence a cron-deleted wall
would have destroyed. Comments are retained, surfaced only during the active
window, removed on account deletion (NOT "ephemeral").

**Lifecycle / "over" trigger.** Read- and post-able from joined-membership through
ends_at + 2h — anchored on ends_at (not the dashboard's starts_at + 2h) so it's
robust to game length: a starts_at-based window would close the wall mid-game for
any session over two hours, whereas ends_at-anchored always lands after the real
end. The 2h pad covers the parking-lot cooldown (lost-and-found, wrap-up) and the
realize-it-at-home lag, matches the 2h grace D15 uses, and still blocks next-day
necro-posting. Client fetch/render and the post path both gate on
ends_at + interval '2 hours' > now(); read data persists past it (the audit
trail), unsurfaced. ends_at is already in the slot projections (M3.5) — no cron,
no new field.

**Defense-in-depth.** REVOKE INSERT, UPDATE, DELETE ON chat_messages FROM anon
(grants were wide-open default-Supabase; RLS was the only gate), matching the
slots hardening.

### As-built note — host pill removed (2026-07-02, Host-Neutral canon; append)
The wall shipped a "host" pill: `slot_wall()` returns `is_host` (author = the slot's
`created_by`), and the LobbyWall UI rendered a `HostTag` on the owner's own messages. That
pill was **removed 2026-07-02** under the Host-Neutral Player Surfaces canon — `isHost` was
stripped from the `group-lobby/page.tsx` client mapping, so the flag never reaches the browser
payload. The `slot_wall` RPC is **unchanged** (it still returns `is_host`; the field survives
only in the server-only `WallRow` type, TS-erased at runtime). Author identity on the wall now
renders as plain name + avatar, with no host distinction.
