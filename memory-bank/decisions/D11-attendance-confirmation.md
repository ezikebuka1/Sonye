# D11 — Attendance Confirmation

**Decided:** 2026-05-21
**Status:** ✅ Decided. Implementation in M3.2 (schema patch) and M4/M5
(scheduled job, SMS dispatch, confirmation routes, lobby peer-report
link).
**Amends:** D7 (post-game prompt was previously underspecified); feeds
D9 (cap-unlock-via-completion mechanism becomes operational).
**Blocks:** M3.2 (schema patch for attendance_token and
attest_attendance function), M4/M5 (scheduled-job implementation,
/c/y and /c/n routes, lobby peer-report link).
**Related:** D7 (product mechanics), D9 (concurrent join cap unlocks
on attended set), D10 (lobby phone visibility — peer-report link
sits in the same lobby surface), V1 Realness Strategy
(per-user attendance is the strongest realness signal), V1 Decision
Principle (Density Over Everything — flakers are the dominant density
threat).

## The Decision

V1 confirms attendance via **outbound SMS magic link**, sent two
hours after each slot's `starts_at`. Each joined member receives a
personalized SMS with two tappable links (yes / no). Tapping a link
hits Sonye's web app over HTTPS and writes `attended` on that
member's `session_memberships` row via the `attest_attendance`
transaction function. No inbound SMS parsing. No Twilio webhook.

Unconfirmed attendances stay NULL and fall into a manual
owner-review queue (a saved SQL query in the Supabase dashboard).
Peer accountability lives in the lobby as a low-fi "text the
organizer" link.

Attendance is **per-user**, not per-slot. The schema already
enforces this — `attended` lives on `session_memberships`.

## The Problem

D9's concurrent-join cap unlocks when "the slot's match completes
(attended or no-show)." V1's Realness Strategy names attendance
track record as "the single strongest real-person signal." Both
mechanisms depend on `attended` being populated reliably, per-user,
for every joined membership after game time.

D7 sketched a post-game prompt ("Did you make it? Yes / No / I'll
let you know.") but did not specify the trigger, the surface, or
the failure modes. D11 specifies them.

## Why outbound SMS magic link (not inbound SMS, not in-app prompt)

Considered four mechanisms:
- In-app web prompt next time the user opens the app.
- Owner-confirmed only (manual).
- Inbound SMS reply parsing ("reply YES/NO").
- Outbound SMS magic link. ← chosen.

Chose outbound magic link for four reasons:

1. **Matches the Partiful Model.** Users live in iMessage, not in
   the web app. SMS reaches them on the rails they actually use.
   In-app prompts assume users will return to the app — D10's
   premise was the opposite.

2. **Avoids the inbound-SMS infrastructure trap.** Inbound SMS
   parsing would require provisioning a Twilio webhook, a Next.js
   API route to receive payloads, fuzzy text-matching ("yes" / "ya"
   / "yep" / "👍"), and inbound-number-to-user resolution across
   multiple active memberships. This is exactly the kind of vendor
   and moderation burden D10 was designed to avoid.

3. **One-tap UX over HTTPS.** The user taps a link, the browser
   opens, the Next.js app writes the database, done. Standard web
   transaction. Zero new infrastructure beyond the outbound SMS
   dispatch path (which D2 will define anyway for OTP).

4. **Idempotent and unguessable by design.** A single-use token
   per membership means each link works exactly once for exactly
   one assertion. Standard pattern, well-understood failure modes.

## Mechanism

### Trigger

A server-side scheduled job runs at `starts_at + 2h` for each slot.
For every membership in that slot with `status = 'joined'`:
- Generate an `attendance_token` (UUID, single-use).
- Set `attendance_token_expires_at = now() + 48 hours`.
- Send an outbound SMS to the user's phone with two tappable links.

The specific scheduling mechanism (Postgres `pg_cron`, Supabase
Edge Function with cron trigger, Vercel Cron route, etc.) is NOT
locked by D11. It resolves with D2 — the choice depends on which
SMS provider D2 selects (Supabase's built-in SMS auth vs. Twilio
direct vs. other) and how that provider integrates with the rest
of the stack.

### SMS copy (reference draft, M5 finalizes)

Tone register: D5 (contractions, lowercase mid-sentence, no
trailing period on single clauses). Reference draft (final copy
finalized in M5 with sketch approval):

> did you play at Churchill Park tonight?
> yes: sonye.com/c/y/<token>
> no:  sonye.com/c/n/<token>

The venue name is interpolated per slot. The two URLs share the
same token (one token, two paths) — the path itself encodes the
assertion. **The one-token / two-paths routing structure is a
load-bearing technical requirement** for M4/M5; M5 copy revisions
must preserve it.

### Confirmation route handling

`GET /c/y/<token>` and `GET /c/n/<token>` are Next.js routes that
call the `attest_attendance(p_token, p_attended)` transaction
function and render the result. The route handlers do NOT issue
raw UPDATEs against `session_memberships` — all writes to
`attended` go through the transaction function, preserving the M3
discipline that membership mutations happen exclusively via
explicit Postgres transaction functions.

`attest_attendance` semantics:

1. Look up the membership row by `attendance_token`.
2. If the token does not exist, or if
   `attendance_token_expires_at <= now()`, return an
   `'invalid_or_expired'` status. No write.
3. If `attended` is already populated, return a `'success'` status
   without writing (idempotent — second taps are no-ops, including
   when the second tap is the opposite path).
4. Otherwise, set `attended = p_attended`, invalidate the token by
   setting `attendance_token = NULL`, and return `'success'`.
5. The function is SECURITY DEFINER and the only application-layer
   write path for `attended`.

The route handler renders one of two pages — success or
invalid/expired. The invalid/expired page surfaces the same
low-fi `sms:` peer-report link the lobby uses, so a user with a
stale link can still reach the owner.

### Granularity

`attended` is per-membership, not per-slot. The schema enforces
this — `attended` is a column on `session_memberships`, not
`slots`. Each user attests for themselves only. A user who attends
while another flakes is recorded accurately — critical for the
Realness Strategy and for protecting density via flaker
identification.

### Waitlist exclusion

`attendance_token` is generated only for memberships with
`status = 'joined'` at the time the scheduled job runs. Waitlisted
users who were never promoted to joined have no attestation;
their `attended` remains NULL forever, by design. They didn't play;
there's nothing to confirm. This is explicit, not an oversight.

## Failure modes

### Expired link, never tapped

If the 48-hour expiry passes without a tap, `attended` stays NULL.
The membership falls into the manual owner-review queue (see
"Owner-review queue" below).

**Why not auto-default to no-show:** false-positive flake labels
destroy user trust and corrupt the Realness Strategy at exactly
the point it's most fragile (early v1, when every user is
load-bearing for density). The cost of a manual sweep is bounded
and visible; the cost of false flake labels is unbounded and
invisible.

### Cross-confirmation by other members

Iceboxed for v2. The schema, the SMS template, and the routes all
operate at the per-user level. If 5 of 6 confirm and 1 ignores, the
ignorer's row stays NULL — no consensus inference. v1 manual
review handles edge cases; v2 may add cross-confirmation logic
when there's data to design against.

### In-app fallback after expiry

NOT built for v1. A user who lets the SMS expire and then logs in
later does NOT see a "confirm your past game" prompt blocking the
home screen. Building that interceptor pattern adds real M4/M5
scope (history queries, blocking modals, attended-mutation paths
from non-link sources) for an edge case manual review handles.

If owner-review burden exceeds ~3 hours per week, that's the v1.5
threshold condition for an in-app fallback. Until then: SMS or
nothing.

## Peer accountability — "Text the Organizer"

The locked lobby surface gains a low-fi link below the phone
roster, in muted typography (D8 secondary text token):

> someone didn't show? let us know

The link is a native `sms:` URI with the owner's phone in E.164
and a prefilled body. No backend, no API route, no database
mutation. Tapping opens the user's messaging app with a draft
already composed:

> sms:+1XXXXXXXXXX?body=Reporting a no-show for [VENUE] on [DAY]:

The owner's phone number is injected via a Next.js build-time
environment variable (`NEXT_PUBLIC_SUPPORT_PHONE`), not a DB read.
Changes to the owner phone are an env-var update + redeploy.

**Why low-fi, not a peer-report UI:** zero backend work, zero
new schema, zero moderation surface. The signal still reaches the
owner via the rails already in use (SMS). The cost of building a
peer-report UI is real (forms, abuse prevention, queue management,
notification routing); the marginal value over an `sms:` link is
near-zero at v1 scale.

## Owner-review queue (operational artifacts)

Two SQL queries live in the Supabase dashboard's saved-query
section. They are not app features; they are owner operational
tools.

### Query 1: Unconfirmed attendances past expiry

```sql
SELECT u.first_name, u.phone, s.starts_at, v.name AS venue
FROM session_memberships sm
JOIN users u ON u.id = sm.user_id
JOIN slots s ON s.id = sm.slot_id
JOIN venues v ON v.id = s.venue_id
WHERE sm.status = 'joined'
  AND sm.attended IS NULL
  AND sm.attendance_token_expires_at < now()
ORDER BY s.starts_at DESC;
```

The owner runs this weekly. Each row is a manual decision: text
the user, mark as attended/not, or leave NULL if the game itself
was clearly disrupted (weather, owner-cancelled, etc.).

### Query 2: Flaker detection

```sql
SELECT u.first_name, u.phone,
       COUNT(sm.id) AS total_joined,
       SUM(CASE WHEN sm.attended = false THEN 1 ELSE 0 END) AS flakes
FROM users u
JOIN session_memberships sm ON sm.user_id = u.id
WHERE sm.status = 'joined'
GROUP BY u.id, u.first_name, u.phone
HAVING SUM(CASE WHEN sm.attended = false THEN 1 ELSE 0 END) >= 2
ORDER BY flakes DESC;
```

The owner runs this weekly. **The 2-flake threshold in the HAVING
clause is provisional** — the owner adjusts it (up or down) based
on observed flake patterns in real data. It is not a hard product
rule; it is a saved-query parameter.

## Flaker management (v1 operational, v1.5 structural)

### V1: Ghost-ban via phone-set in a reserved block

To prevent a flaker from joining future games, the owner manually
updates that user's `phone` to a value within a reserved
ghost-ban block: **`+19990001000` through `+19990009999`**.

Reserving a block makes the `users` table visually scannable —
any phone matching `+1999000[1-9][0-9][0-9][0-9]` is a
ghost-banned user. Distinct from the test-owner fixture's
`+19990000000` (test infrastructure, not a real user).

Effective immediately, zero code, fully reversible. The user's
next OTP request goes to a number they don't control.

Constraint: the substituted phone MUST remain E.164-valid per the
existing `users_phone_e164_format` CHECK. The reserved block
values all satisfy the regex by construction.

### V1.5: Structural ban flag

If ghost-ban-by-phone-set becomes burdensome (e.g., the owner
needs to track which phones are "real banned-user phones" vs.
real users), add `users.is_banned boolean DEFAULT false` plus
one line to `join_slot`:

```sql
IF v_caller.is_banned THEN
    RAISE EXCEPTION 'User is suspended';
END IF;
```

Trigger condition: owner reports the operational burden of
phone-set ghost-bans exceeds 15 minutes per week, or the count of
ghost-banned users exceeds ~5.

NOT a v1 schema column. NOT in M3.2.

## Schema implications (feed M3.2)

The M3.2 patch adds:

- `session_memberships.attendance_token uuid NULL`.
- `session_memberships.attendance_token_expires_at timestamptz NULL`.
- Partial unique index on `attendance_token` WHERE
  `attendance_token IS NOT NULL`.
- `attest_attendance(p_token uuid, p_attended boolean)`
  transaction function (SECURITY DEFINER, sets `attended`,
  invalidates the token, returns a status string). This function
  is the sole application-layer write path for `attended`,
  preserving the M3 discipline that all membership mutations
  happen via explicit transaction functions.

Both new columns are nullable because:
- Until the scheduled job runs, neither value exists.
- After the user taps the link, the token is invalidated (NULL).
- For waitlisted users who never reach joined-at-game-time, both
  stay NULL forever.

## What this policy is NOT

- Not in-app confirmation. Confirmation happens via SMS magic
  link only. (Tapping the link routes through the web app, but
  the call to action lives in SMS.)
- Not consensus-based. Each user attests for themselves.
- Not a peer-review UI. Peer accountability is the `sms:` link.
- Not automated flake punishment. Flake counts are observed by
  the owner via SQL; bans are manual.
- Not a notification surface for chat or coordination. Only
  attendance-relevant SMS goes out — one per slot per joined
  member.
- Not infinite. Each token expires at 48 hours; expired tokens
  cannot be used to write attendance.

## Implementation requirements

For M3.2 (schema patch, follows the M3.1 pattern):

1. Add two columns to `session_memberships`:
   `attendance_token uuid NULL`,
   `attendance_token_expires_at timestamptz NULL`.

2. Add partial unique index:
   `CREATE UNIQUE INDEX sm_attendance_token_unique
    ON session_memberships (attendance_token)
    WHERE attendance_token IS NOT NULL;`.

3. Add `attest_attendance(p_token uuid, p_attended boolean)`
   transaction function. SECURITY DEFINER, LANGUAGE plpgsql.
   Returns a text status (`'success'` |
   `'invalid_or_expired'`). Handles lookup, expiry check,
   idempotency, write, and token invalidation atomically.

4. Add verification Proof 12 — the token round-trip:
   - Joined membership gets a token + expiry.
   - First `attest_attendance` call writes `attended` and
     invalidates the token; returns `'success'`.
   - Second `attest_attendance` call with the same token returns
     `'invalid_or_expired'` (token is now NULL — not findable).
   - Separate proof leg: a token whose
     `attendance_token_expires_at < now()` returns
     `'invalid_or_expired'` on first try, without writing
     `attended`.

5. Update `m3-closeout.md` with an "M3.2 patch" section noting
   the new columns, the new function, the new index, and
   Proof 12.

For M4/M5 (application layer):

- Confirmation routes `/c/y/<token>` and `/c/n/<token>` call
  `attest_attendance`. Render the result.
- Scheduled job at `starts_at + 2h` generates tokens and
  dispatches SMS via whatever provider D2 selects.
- Lobby gains the low-fi peer-report `sms:` link in muted
  typography per D8.
- `NEXT_PUBLIC_SUPPORT_PHONE` env var set in Vercel before
  launch.
- Operational SQL queries (review queue, flaker detection) saved
  in the Supabase dashboard.

## What this policy depends on for v1

- D2 lands and resolves the SMS provider question. Until D2
  lands, the trigger mechanism is named but not implementable.
- D9's cap-unlock-on-completion reads `attended` via this flow.
  If the SMS infrastructure isn't shipped at launch, D9's
  cap-unlock-via-completion path doesn't trigger, and the cap
  unlocks only via leave-flow (M5). This is recoverable but
  degraded.
- The E.164 CHECK constraint stays load-bearing on both the
  `sms:` lobby link and on the ghost-ban mechanism.
- The owner has a real phone number set in the seed (replacing
  the placeholder `+10000000000`) and in
  `NEXT_PUBLIC_SUPPORT_PHONE`. Both required pre-launch.

## Provisional for v1

Watch the first month of real M5+ data:
- If owner-review queue burden exceeds ~3 hours per week,
  consider in-app fallback for past-game confirmation.
- If ghost-ban operational burden exceeds 15 min/week or
  >5 ghost-banned users, ship the `is_banned` v1.5 hook.
- If unconfirmed-NULL count after expiry consistently exceeds
  ~40% of memberships, the SMS delivery or copy may be failing
  — investigate before adding mechanisms.
- If cross-confirmation patterns appear in the data (members
  texting the owner "X didn't show" frequently), evaluate the
  v2 cross-confirmation feature.
- The 2-flake threshold in Query 2's HAVING clause is the first
  thing to adjust as real data lands.

## When to revisit

- After 30 days of real attendance data.
- If D2's SMS provider choice creates friction with this flow
  (e.g., per-message cost makes outbound-at-game-time
  burdensome).
- If a v2 peer-trust feature (Vetted Network from v2-signals)
  ships, the peer-report link becomes the natural place for
  surfacing trust signals — D11's low-fi pattern becomes the
  seed of a richer surface.

## Amendment A — Supabase Free-Tier Auto-Pause (2026-06-02)

Supabase projects on the free tier auto-pause after `~7 days` of
inactivity. First request after pause unpauses the project with
a 5-10 second cold start. This is documented Supabase free-tier
behavior, not a bug.

**Why this is load-bearing for Sonye:**

D11's scheduled job dispatches attendance SMS at each slot's
`starts_at + 2h`. In a low-traffic week (e.g., one slot per
week during early v1, or a quiet stretch between sessions),
the cron firing may be the FIRST request the cloud DB has seen
in `~7 days`. If the cron's HTTP timeout is below the cold-start
window (default Vercel Cron timeout is 10s; Supabase Edge
Function cold start can exceed it under load), the job will
time out before the DB responds, and the attendance SMS will
fail to send for that slot.

The failure mode is silent: no SMS goes out, `attended` stays
NULL for all joined members, the owner-review queue fills with
ghosts that aren't actually flakes. By the time it's noticed,
the data for that game is unrecoverable.

**Three viable mitigations, ranked by structural soundness:**

1. **Upgrade to Pro tier before launch.** $25/month. No auto-
   pause. This is the recommended path — the cost of one
   debugging session during launch week exceeds a month of Pro.
   Budget this as a v1 launch cost, not a v1.5 upgrade.

2. **Tune cron timeouts to absorb cold-start.** Set the
   scheduled job's HTTP timeout to ≥30 seconds. Works on free
   tier, but couples the cron's reliability to Supabase's
   cold-start variance. Not recommended for any user-facing
   write path (the attendance SMS is a write path — every
   miss is a data quality hit).

3. **Keep-warm ping every 6 days.** A no-op cron that runs
   every 6 days to keep the project active. Defeats the cost-
   saving purpose of free tier and adds operational complexity.
   Only use if Pro tier is genuinely unaffordable.

**Pre-launch checklist addition:** before launch day, confirm
the production Supabase project is on Pro tier (or has one of
the alternative mitigations active and tested). Document the
chosen mitigation in the launch-day runbook.

**M5 framing implication:** the scheduled-job implementation
choice (Vercel Cron vs. Supabase Edge Function on cron trigger
vs. `pg_cron`) is downstream of this decision. `pg_cron` lives
inside Postgres and is immune to cold-start by definition, but
free-tier `pg_cron` has its own quotas; verify before choosing.

## Amendment B — Attendance routes run as `anon` (2026-06-15)

**Supersedes** the original D11 "`authenticated`-only grant" on
`attest_attendance` AND the interim Phase 4B service-role
implementation of the `/c/y` and `/c/n` routes.

### The decision

`attest_attendance(uuid, boolean)` is granted EXECUTE to `anon`
(additive — the `authenticated` grant is left intact). Both
confirmation routes (`src/app/c/y/[token]/page.tsx`,
`src/app/c/n/[token]/page.tsx`) call the function through the
project's **standard `@supabase/ssr` anon server client** (the same
`@/lib/supabase/server` `createClient` the Home / lobby / join
Server Components use). The service-role client is removed from
these routes.

### Rationale — the caller is genuinely `anon`

A tapped SMS magic link opens a **brand-new browser tab / in-app
browser that does NOT share the user's Supabase session.** At the
HTTP layer the caller is the `anon` role — there is no cookie, no
JWT. The interim Phase 4B implementation bridged the
`authenticated`-only grant with a service-role (admin) client so
the session-less request could execute the function. The anon
client now matches the reality of the request, and the new anon
grant lets it through.

### Why NOT service-role

Putting `SUPABASE_SERVICE_ROLE_KEY` in a **public, session-less
route** is unacceptable blast radius: if the route is ever
refactored (e.g. a shared helper, an added query, a logging line)
or the admin key leaks, the exposure is the entire database with
RLS bypassed. The token-gated capability needs exactly `anon` +
the function's own self-gating — not god-mode. **Rejected.**

### The security boundary is unchanged

The single-use `attendance_token` + 48-hour expiry remains the
sole capability. `attest_attendance` is `SECURITY DEFINER` and
token-gated: it looks the token up, rejects missing/expired
tokens (`'invalid_or_expired'`, no write), is idempotent on a
consumed/already-set row, and on success writes `attended` and
invalidates the token (`attendance_token = NULL`). Granting `anon`
EXECUTE does not relax any of this — `anon` can only invoke the
same token-gated path. An unguessable UUID that expires in 48h and
dies on first use is the boundary; the role the caller holds is not.

### Why the grant is additive (keep `authenticated`)

A logged-in user who happens to tap the link in a session-bearing
tab is harmless — they hit the identical token-gated path. Revoking
`authenticated` would buy nothing and risk a regression. The grant
migration adds `anon` and touches no other grant.
