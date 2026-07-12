# D2 — Authentication & Onboarding Flow

**Decided:** 2026-05-26
**Status:** ✅ Decided. Implementation in M3.3 (schema patch:
claim_token + signup_claim signature update) and M4 (the three
auth routes, the conditional form routing, Supabase Auth config).
**Amends:** D7 (Onboarding Schema — formalizes the post-OTP form
routing the original D7 left to "TBD during implementation");
D7.2 (the slot-context vs. generic form bifurcation is now wired
to a specific point in the auth flow); D11 (SMS provider choice
constrains D11's scheduled-job implementation).
**Blocks:** M3.3 (schema patch for claim_token), M4 (auth wiring,
the three flow surfaces), M5 (returning-user re-entry semantics).
**Related:** D7 (product mechanics, identity fields), D7.2
(form bifurcation), D7.3 (optional gender field), D10 (lobby
phone visibility — joined-status binding requires authenticated
identity), D11 (attendance confirmation — SMS infrastructure
shares Twilio account, magic-link routes share Next.js routing
posture), V1 Realness Strategy (phone-verified badge is a
free byproduct of this decision), V1 Decision Principle
(Density Over Everything — auth friction is the highest-
leverage density tax), Partiful Model (view-first, auth-
second; Instagram in-app browser constraint).

## The Decision

V1 authentication is **phone-only, OTP-based, via Supabase Auth
native**, using Supabase's managed SMS integration backed by a
Sonye-owned Twilio account. The user-facing flow is
**Model C**: phone entry → 6-digit OTP delivered via SMS →
verification → JWT issued → conditional form routing → atomic
write via `signup_claim` (net-new) or `join_slot` (returning
user, no form needed).

Three entry flows are supported, distinguished by URL context
at the time of OTP send:

- **Flow 1 (Generic):** no URL context. Net-new user, full
  D7.2-generic six-field form after verification.
- **Flow 2 (Slot):** `?slotId=<id>` present. Net-new user
  arriving via a shared slot link, minimal D7.2-slot form
  after verification, joined to the specific slot atomically
  with profile creation.
- **Flow 3 (Waitlist):** `?claim_token=<uuid>` present. Pre-
  seeded user from the launch-day waitlist import. Phone
  verification binds `auth_user_id` to the existing
  `public.users` row; no form shown because the data was
  collected via the Waitlist Intake Script pre-launch.

No magic auth links. No passwords. No email. No social
sign-in. Phone is the sole identity binding.

## The Problem

D2 has been the open M4-blocking decision since M1. D7 sketched
"SMS auth at launch" without specifying the flow shape, the
provider, the form ordering, or the magic-claim semantics for
the pre-seeded waitlist. M3 shipped a schema (`signup_claim`
transaction function, `users.auth_user_id` binding column,
RLS policies that read JWT sub via `current_user_id()`) that
assumes Supabase Auth as the auth surface but does not specify
how clients interact with it.

D2 closes six related sub-decisions: the auth UX shape, the
auth surface architecture, the three-flow branching mechanism,
the form-before-or-after-OTP ordering, the SMS provider, and
the magic-claim link semantics. The cluster is locked together
because the choices are coupled — UX shape constrains
branching, provider choice constrains rate-limiting, magic-
claim semantics constrain schema. Resolving them piecewise
would have produced incoherent edges.

## Sub-decision 1 — Auth surface: Supabase Auth native

**Decided:** Use Supabase Auth (JWT-based, RLS-integrated,
`auth.users` table as the identity root, `public.users.
auth_user_id` as the binding column).

**Considered:**
- Supabase Auth native. ← chosen.
- Roll-your-own: Twilio Verify + custom session table.

**Why Supabase Auth:** The M3 schema already assumes it.
`users.auth_user_id` is the binding column. RLS policies call
`current_user_id()` which reads the JWT sub. Overriding M3 to
roll our own auth would require schema work (custom session
table, custom JWT issuance, RLS rewrites) for zero v1 benefit.
The override has no v1 justification. Locked.

## Sub-decision 2 — Auth UX: Model C (OTP-first, form-after-verify)

**Decided:** Phone entry → OTP send → OTP verify → JWT
issued → (conditional form per flow) → `signup_claim` or
`join_slot`.

**Considered:**
- Model A: phone → OTP → joined-to-slot, form deferred to
  next visit (lightweight). Rejected.
- Model B: form → phone → OTP → joined-to-slot
  (onboarding-at-join, form first). Rejected.
- Model C: phone → OTP → verify → form → joined-to-slot
  (OTP-first, form-after-verify). ← chosen.

**Why Model C wins, Model A loses:** Model A maximizes density
at slot-commit but produces a degraded lobby. D10 phone
visibility presumes joined members have first names and
avatar colors. A lobby of nameless `+1` numbers degrades the
coordination surface and corrupts the Realness Strategy at
exactly the point it's most fragile (early v1, when every
user is load-bearing). A user appearing as just a phone number
reads less real than a Marcus.

**Why Model C wins, Model B loses:** Model B exposes an
unauthenticated SMS-trigger endpoint. Any bot that scripts the
form forces Sonye to send a Twilio SMS. This is SMS toll fraud
and it is a well-known abuse vector against consumer auth
flows. Model B would also require server-side caching of
form data between submit and OTP verify, adding scope. Model
C makes the form unreachable until phone ownership is proved.

**Why Model C is also the safest drop-off shape:** If a user
bounces between OTP verify and form completion, they consume
zero slot capacity, their JWT is held in browser state, and
the next tap (within session durability) lands them back on
the form. The graceful-degradation property falls out of the
flow shape rather than requiring special-case handling.

## Sub-decision 3 — SMS provider: Option 1A (Supabase managed, our Twilio keys)

**Decided:** Supabase Auth's built-in SMS integration, using
Sonye-owned Twilio API keys configured in the Supabase
dashboard.

**Considered:**
- 1A: Supabase managed SMS via our Twilio. ← chosen.
- 1B: Custom SMS Hook (Supabase Edge Function we write,
  calling Twilio's API directly).

**Why 1A:** Zero TypeScript on our side for the auth path.
Supabase handles OTP generation, expiry, retry windows, and
delivery dispatch. Template control, pre-send filtering, and
single-pipe debugging — the things 1B unlocks — are all v1.5
concerns we don't have evidence for. Auth OTPs are utility
messages by design ("Your code is 123456"); there's no brand-
voice opportunity to capture.

**Why 1A is also reversible:** Migration 1A → 1B is an Edge
Function deploy and a dashboard config flip. No schema
change, no flow change, no user-visible disruption. The
choice isn't load-bearing for anything downstream. If
template control or pre-send filtering become real concerns
post-launch, the upgrade path is open.

**D11 implication:** D11's attendance SMS does NOT go through
Supabase Auth's pipe (auth pipes only send OTPs). D11's
scheduled job calls Twilio's Messages API directly via a small
shared helper. Same Twilio account, two send paths. The
operational debug burden of two pipes is accepted explicitly:
the auth pipe is Supabase's problem to maintain; the D11 pipe
is ours.

## Sub-decision 4 — Branching: client-side, post-JWT, on URL context

**Decided:** Flow disambiguation happens client-side after
the JWT is issued, by combining URL context (`?slotId=`,
`?claim_token=`) with a post-verify check on whether the
authenticated user's row already exists in `public.users`.

**Why client-side, not server-side:** Server-side branching
would require the OTP-send endpoint to look up the phone in
`public.users` before sending. This adds a database read to
every OTP send, leaks information about which phones are
registered (an enumeration vector), and gains nothing over
post-verify branching because the form decision is made
post-verify anyway. Client-side branching keeps the OTP-send
endpoint stateless and the branching logic colocated with the
UI it drives.

**Branching table:**

| Flow | URL context        | After verify, user exists? | Action                                |
| ---- | ------------------ | -------------------------- | ------------------------------------- |
| 1    | none               | no                         | Show 6-field generic form → signup_claim |
| 2    | ?slotId=<id>       | no                         | Show 4-field slot form → signup_claim (joins slot atomically) |
| 2'   | ?slotId=<id>       | yes                        | Skip form → join_slot directly        |
| 3    | ?claim_token=<t>   | yes (via seeded row)       | Bind auth_user_id, skip form, land on home |
| ---- | ?claim_token=<t>   | no (phone mismatch)        | Fall through to Flow 1 (net-new generic) |

Flow 2' is the returning-user-with-slot-link case that was
deferred during the framing conversation; it falls out
cleanly from the branching table without needing a separate
flow definition.

## Sub-decision 5 — Rate-limiting: configured at Supabase dashboard

**Decided:** Three thresholds, configured in the Supabase Auth
dashboard, no application-layer rate-limiting code in v1.

- 1 OTP send per phone per 60 seconds.
- 5 OTP sends per phone per hour.
- 20 OTP sends per IP per hour.

**Why these numbers:** The per-phone-per-60s limit defeats
double-tap UI accidents and slow-typing retry loops without
blocking real users who genuinely missed the first send. The
5-per-hour ceiling defeats targeted abuse of a specific
phone (e.g., harassment via OTP-bombing) while leaving
generous headroom for a user who fat-fingers their phone
number repeatedly. The 20-per-IP-per-hour limit covers
NAT'd household and shared-wifi cases (a coffee shop with
two real users signing up at once should not hit the limit)
while shutting down single-IP bot floods.

**Rate-limit failure copy** (D5 tone register):

- Per-phone hit: *"we just sent a code to that number — give
  it a minute, then try again"*. Does not name the exact
  threshold; the user just needs to wait.
- Per-IP hit: *"too many login attempts from this device —
  try again in an hour"*. Names the rough wait because a
  fresh phone arriving on the same IP would otherwise be
  confusing.

## Sub-decision 6 — Magic-claim link semantics

**Decided:** Claim links (`?claim_token=<uuid>`) are routing
hints, not bearer credentials. Phone ownership via OTP is
the security boundary; the token is a convenience for landing
the user on the right pre-seeded row.

Three rules:

1. **No expiry.** Claim links live indefinitely. A waitlist
   user who taps the launch SMS on day 1, day 30, or day 300
   is bound to their pre-seeded row identically. Stale row
   cleanup is an operational SQL pass the owner runs at long
   intervals, not an automatic expiry.

2. **Multi-use until profile completion.** The link remains
   valid for re-entry until `signup_claim` successfully binds
   the user's `auth_user_id` to the row. This is a property
   of Model C (no `auth_user_id` binding = no commit =
   re-entry lands on the form again), not a separate rule.

3. **Token nullified at successful claim.** When
   `signup_claim` succeeds, `claim_token` is set to NULL
   atomically with the `auth_user_id` bind. Mirrors the D11
   `attendance_token` invalidation pattern. Subsequent taps
   of the same link find no matching row and fall through to
   net-new flow (which then itself fails to create because
   the phone is already taken — handled at the
   `signup_claim` layer, not the routing layer).

**Why no expiry, expanded:** The pre-launch waitlist cohort
is the highest-value v1 user pool. They signed up before the
product existed. Cutting them off at day 7 or day 30 because
they were camping, traveling, or filtering messages punishes
the most committed cohort for arbitrary calendar reasons.
The phone-as-binding-key already defends against
link-forwarding fraud (see Security properties below). There
is no remaining security justification for expiry, and the
UX cost of false-positive expiry is high.

**Schema implication (handed to M3.3):** `users.claim_token
uuid NULL` column, partial unique index `WHERE claim_token
IS NOT NULL`, `signup_claim` signature gains
`p_claim_token uuid` parameter and the function nullifies
the column atomically with the bind. SQL details are NOT
in D2; they live in the M3.3 dispatch spec.

## The three flows in detail

### Flow 1 — Generic net-new (no URL context)

User arrives at `sonye.com` (or future `/games`) with no URL
parameters. Taps a CTA (e.g., "Get started" or "Join a
game"). Enters phone. Receives OTP. Verifies. JWT issues.
Client checks `public.users` via authenticated query —
returns no row. Client renders the D7.2-generic six-field
form (first_name, last_name, skill_level, optional gender,
general_availability, preferred_venues). Submit calls
`signup_claim` with all fields. Lands on home (`/`) with
their personalized state.

### Flow 2 — Slot-context net-new (?slotId=<id>)

User arrives at `sonye.com/slot/<id>` with no auth. Sees the
slot preview (anonymous-safe projection per D10/Partiful
Model). Taps Join. Auth wall fires; the slot ID is preserved
through the auth flow. Enters phone. Receives OTP. Verifies.
JWT issues. Client checks `public.users` — returns no row.
Client renders the D7.2-slot minimal form (first_name,
last_name, skill_level, optional gender;
general_availability and preferred_venues set NULL by the
function). Submit calls `signup_claim` with minimal fields
AND triggers `join_slot` for `<id>` in the same client-side
sequence. Lands on the lobby for that slot.

(Implementation note for M4: whether `signup_claim` and
`join_slot` are two RPC calls or one combined RPC is an
implementation choice; D2 specifies the user-facing semantics,
not the RPC count. The D9 cap and the last-seat race are
unaffected either way — `join_slot` retains its `FOR UPDATE`
slot lock and D9 pre-check regardless of caller.)

### Flow 2' — Returning user with slot context

Same URL entry as Flow 2 (`?slotId=<id>`) but the user
already has a `public.users` row. After verify, the client
check returns a row. Client skips the form entirely and
calls `join_slot` directly. Lands on the lobby (success) or
sees the D9 same-day-collision toast (block per D9).

### Flow 3 — Waitlist claim (?claim_token=<uuid>)

User receives the launch-day SMS with the claim link. Taps.
Enters phone. Receives OTP. Verifies. JWT issues. The
`signup_claim` call — invoked by the client after verify —
includes the `p_claim_token` parameter. The function looks
up the pre-seeded row by `claim_token` AND verifies that the
authenticated phone matches the row's phone. On match:
binds `auth_user_id`, nullifies `claim_token`, returns
success. On mismatch (phone doesn't match the seeded row):
falls through to net-new creation. The user has no form to
fill because the Waitlist Intake Script collected the data
pre-launch.

## Security properties (load-bearing — do not break in future amendments)

These properties fall out of the Model C + Supabase Auth
combination. They are not bolted on. Future schema or flow
changes must preserve them.

**Property 1 — No SMS toll fraud via anonymous endpoints.**
The OTP-send endpoint requires a phone number but no other
form data, and Supabase's per-phone and per-IP rate limits
defend against floods. A bot cannot exhaust Sonye's Twilio
balance by scripting a form, because there is no form
upstream of the OTP send. (Model B would have broken this.)

**Property 2 — Link forwarding self-corrects.** A claim
token forwarded from a waitlist user (A) to a friend (B)
does not grant B access to A's pre-seeded row. The OTP
verifies B's phone ownership; B's phone does not match A's
seeded phone; `signup_claim` falls through to net-new
creation. B becomes a new user. A's row remains untouched
and claimable by A whenever A taps the original SMS.

**Property 3 — Phone is the only identity primitive.** The
JWT sub maps to `auth.users.id`, which maps to
`public.users.auth_user_id`, which is bound at
`signup_claim`. The phone column (E.164, CHECK-constrained)
is the human-meaningful identity key. No email, no
username, no social-graph identifier. This simplifies the
auth surface to one column and one OTP path.

**Property 4 — Enumeration resistance at OTP send.** The
OTP-send endpoint does not reveal whether the phone is
already registered. Supabase Auth sends an OTP regardless
(if rate limits permit); the existence-or-not branch
happens client-side after verify. A bot cannot scan phone
numbers to learn which are users.

**Property 5 — Token invalidation symmetry.** Both
`claim_token` (this decision) and `attendance_token` (D11)
follow the same invalidate-at-success pattern with partial
unique indexes. Future tokens (if any) should follow the
same pattern for legibility.

## What this policy is NOT

- Not magic-link auth. Magic links fail in Instagram's in-app
  browser (which strips fragment identifiers and breaks
  session handoff). 6-digit typed OTP is the constraint.
- Not passwordless email auth. Email is not collected in v1.
- Not social sign-in (Google, Apple, etc.). v1 is phone-only.
- Not an SMS notification channel. The auth pipe sends OTPs
  only. D11 attendance SMS uses a separate Twilio call path
  through the same account.
- Not a session-durability promise. JWTs expire on Supabase
  Auth's default schedule. UX copy does not promise "your
  spot is held" — it promises "complete your profile to
  secure your spot," which is honest about urgency.
- Not roll-your-own auth. Supabase Auth handles OTP
  generation, JWT issuance, RLS integration. We configure;
  we do not implement.
- Not multi-device session sharing in v1. Each browser is
  its own session; logging in on a phone does not log in
  the desktop, by Supabase Auth's default behavior.

## UX copy register (D5 tone)

- OTP send screen prompt: *"enter your phone number to log in
  or sign up"* (single field; no separate sign-up flow).
- Post-OTP-send: *"we texted you a 6-digit code"*.
- Post-verify-pre-form (Flows 1 & 2): *"phone verified.
  complete your profile to secure your spot."*
- Per-phone rate limit hit: *"we just sent a code to that
  number — give it a minute, then try again"*.
- Per-IP rate limit hit: *"too many login attempts from this
  device — try again in an hour"*.
- Invalid OTP: *"that code didn't match — try again, or
  request a new one"*.
- Expired OTP: *"that code expired — request a new one"*.

Final copy and placement via M4 sketch approval.

## Implementation requirements

### M3.3 — schema patch (immediately after D2 commits)

- Add `users.claim_token uuid NULL`.
- Add partial unique index `WHERE claim_token IS NOT NULL`.
- Update `signup_claim` to accept `p_claim_token uuid` parameter.
- Update `signup_claim` body: if `p_claim_token` is not null,
  attempt to bind to the matching seeded row (phone-match
  required); on bind success, nullify `claim_token` atomically.
- Update grants matrix signature to match new parameter list.
- Update Phase 3 verification battery with proofs for the
  three claim-token paths (success, mismatch fallthrough,
  invalidation on second tap).

SQL details, exact parameter order, and full proof scripts
are M3.3's responsibility. D2 does not specify them.

### M4 — auth wiring

- Supabase Auth client integration (Next.js `@supabase/ssr`).
- Three flow surfaces:
  - Phone entry page (single field, OTP send).
  - OTP verify page (6-digit input).
  - Post-verify routing component (reads URL context, queries
    `public.users`, renders form or skips per branching table).
- Form rendering uses the existing `onboarding/page.tsx` with
  D7.2 bifurcation already wired in pre-M3 Commit 2.
- Rate-limit failure copies wired to Supabase Auth's error
  responses.
- Slot-context preservation through the auth flow (`?slotId`
  survives across OTP and form steps).

### Operational prerequisites (Ebuka, before M4 can wire to real auth)

- Twilio account created.
- 10DLC brand registration submitted (multi-day clearance
  window; start ASAP).
- Twilio Messages API credentials added to Supabase Auth
  dashboard.
- Rate-limit values (1/60s, 5/hr, 20/hr-IP) configured in
  Supabase Auth dashboard.
- Sonye-owned sending number provisioned in Twilio.

## What this policy depends on for v1

- The Instagram in-app browser constraint holds — 6-digit
  typed OTP is the only auth modality that survives in-app
  browsers reliably.
- Supabase Auth's per-phone and per-IP rate-limit
  configuration ships at the threshold values specified.
- The Twilio account and 10DLC registration clear before
  M4 wires to real auth.
- The E.164 CHECK constraint on `users.phone` (M3) remains
  load-bearing — the OTP-binding path relies on E.164
  format invariance.
- D11's Twilio integration uses the same account; both
  decisions share that operational dependency.

## Provisional for v1

Watch the first month of real M4+ data:

- If OTP delivery success rate falls below ~95%, investigate
  Twilio routing, carrier filtering, or the 10DLC
  registration status before changing auth design.
- If the per-phone-60s rate limit causes visible user
  friction (support pings, drop-off at the verify screen),
  consider lowering to 30s.
- If SMS toll fraud appears in Twilio logs despite the rate
  limits, eject from 1A to 1B and add pre-send filtering
  (country-code restriction, ghost-ban-block awareness at
  the auth layer).
- If Instagram bio-link traffic patterns reveal a meaningful
  in-app-browser failure mode for OTP we haven't anticipated,
  revisit the auth modality choice. This is the most likely
  thing to go wrong in production.

## When to revisit

- After 30 days of real M4+ data.
- If a v2 evolution path (multi-metro, multi-sport) introduces
  identity requirements beyond phone (e.g., a returning user
  has multiple metro contexts that should follow the same
  identity).
- If 10DLC registration costs or carrier policies change in a
  way that makes Sonye-direct SMS infeasible.
- If a future Sonye iteration adds in-app messaging that
  needs deeper identity than phone (e.g., privacy-sensitive
  chat needing real-name verification — unlikely in v1.5
  scope but plausible in v2).

## Amendment A — M3.3 reconciliation (2026-05-26)

When D2 was drafted, the assumption was that M3.3 would
add `claim_token` as a new column. Phase 1 audit of M3.3
revealed the column already existed in the M3 migration
with a fundamentally different design: an expiry-coupled
pattern using `claim_token_expires_at` + `claimed_at`
columns, a `users_claim_consistency` CHECK constraint, and
a `signup_claim` claim branch that trusted client-passed
`p_auth_user_id` rather than reading the JWT.

This pre-existing logic contradicted D2's locked decisions
on two structural points (no expiry; JWT-authoritative
phone-match for link-forwarding self-correction) and on
one stylistic point (nullify-on-success vs. separate
timestamp).

M3.3 therefore became a reconciliation, not an addition:

- Dropped `claim_token_expires_at` column.
- Dropped `claimed_at` column.
- Dropped `users_claim_consistency` CHECK constraint.
- Converted `users.claim_token UNIQUE` to a partial unique
  index `WHERE claim_token IS NOT NULL` (matches D11
  `sm_attendance_token_unique` pattern).
- Replaced `signup_claim`'s claim branch with the strict-
  match path specified in D2 sub-decision 6: lookup by
  claim_token + `auth.jwt() ->> 'phone'` match, UPDATE
  with atomic nullify and `auth.jwt() ->> 'sub'` bind,
  `RAISE EXCEPTION 'claim_token_mismatch'` on no-match.
- Updated `claim_lookups` view to drop the expiry
  predicate.

The `p_claim_token` parameter remained at position 7 in
the `signup_claim` signature (audit confirmed the existing
position is reasonable; D2's "append last" instruction
was based on the incorrect assumption that the parameter
didn't yet exist).

The implementation requirements section above (under
"M3.3 — schema patch") reflects the current post-M3.3
state, not the pre-M3.3 state. The 2026-05-26 architect
session that drafted D2 did not have the M3 migration
contents in context when writing those requirements;
the audit-driven correction is captured here rather than
edited into the original requirements to preserve the
historical record of how the divergence was discovered.

---

## Amendment B — Server-side post-verify branching (2026-06-09)

**Amends:** Sub-decision 4 ("Branching: client-side, post-JWT, on URL context").

Sub-decision 4 located post-verify flow branching on the client. The rationale named a real risk but over-scoped where it applied. The enumeration concern (Property 4) lives at the OTP-send step: a `public.users` lookup there would leak which phones are registered. It does not apply after verify, once the caller has proven phone ownership with a valid OTP.

**Amended decision:** post-verify branching moves server-side. One round trip: `verifyOtp` → set the `@supabase/ssr` session cookie → `public.users` existence check → evaluate URL context (`slotId` / `claim_token`) → 302/303 redirect to the resolved flow. The browser lands directly on the correct destination.

**Preserved:** Property 4 holds — the send path stays stateless, no registration leak, no probing existence without a valid OTP. The branching table (Flows 1 / 2 / 2′ / 3 and the `claim_token` mismatch fallthrough) is unchanged; only the execution location moved.

**Why:** handing the session to the client just to run a DB lookup and `router.push()` forces a loading state, a session-sync race, or a flash of wrong UI. Server-side resolution avoids all three.

**Implementation:** send and verify run as Next.js Server Actions; send stays stateless. (Mechanism recorded for the build, not itself load-bearing — a Route Handler would satisfy the same decision.)

Committed as its own doc commit (`c457df0`) per the two-commit discipline; implemented in Phase 3A (`e427724`).

## Amendment C — Session cookie not HttpOnly (2026-06-09, Phase 3A CP5)

**Amends:** the Phase 3A dispatch's Rule 6 ("SSR cookie … HttpOnly auth cookie"). **Settled — do not re-litigate.**

`@supabase/ssr` deliberately does NOT set the session cookie HttpOnly by default: the browser-side Supabase client (`createBrowserClient`) must read the session token to run authenticated queries client-side. Sonye's interactive surfaces — lobby roster, join, attendance — lean on exactly those client-side reads in Phases 4+. Forcing HttpOnly breaks client-side auth.

**Decision:** accept the library default (non-HttpOnly session cookie). XSS defense is the standard posture instead of the cookie flag: React's output escaping, a Content-Security-Policy, and no `dangerouslySetInnerHTML`. Code surfaced the deviation rather than silently forcing the flag (correct instinct); architect ruled, Gemini nodded, recorded here so "make it HttpOnly" doesn't resurface as a regression-looking bug report.

> **D13 note (2026-06-14):** the premise above — "lobby roster, join, attendance lean on exactly those client-side reads in Phases 4+" — is now **orphaned**. Per D13 (`D13-phase4-player-surface-data-architecture.md`), all Phase 4 player surfaces (feed, join, lobby, attendance) are built **server-side**, so no surface relies on the non-HttpOnly cookie for client-side Supabase reads. The cookie is **retained unchanged** at the `@supabase/ssr` default (forward-compatible if client-side Supabase is ever stood up later); this is recorded, **not re-litigated** (see "Settled — do not re-litigate" above). Only the justification's premise shifted — no cookie/flag change.

## Amendment D — GoTrue JWT-phone normalization in signup_claim (2026-06-10, Phase 3B)

**Amends:** the Flow 3 phone-match mechanics in sub-decision 6 / Amendment A. **Launch-critical fix.**

GoTrue strips the leading `+` from the phone claim in its JWTs: `auth.jwt() ->> 'phone'` returns `15555550033`, not `+15555550033`. The M3.3 claim branch compared that raw claim against `users.phone`, which is strictly E.164 (`+`-prefixed, CHECK-enforced). The comparison was an **always-mismatch**: every claim-token bind would have raised `claim_token_mismatch` and fallen through to net-new — i.e., every launch-day waitlist claim would have silently failed, locking the highest-value cohort out of their pre-seeded rows.

**Why earlier proofs missed it:** the M3 verification battery set test phones and JWT claims directly in psql, bypassing GoTrue's claim shaping. Only the live auth flow (Phase 3B wiring) surfaced it. Lesson recorded in `systemPatterns.md` Known Gotchas.

**Fix:** migration `20260610120000_fix_signup_claim_jwt_phone.sql` — a `CREATE OR REPLACE` of `signup_claim` whose only executable change is in the claim branch: derive `v_jwt_phone` from the raw claim via a CASE that **prepends `+` when absent** (idempotent if GoTrue ever changes; strips nothing, so no international-format fragility; keeps `users.phone` strictly E.164). Paths A/C/D verified character-identical via extracted-function `diff -u` (remaining deltas are comments/whitespace only). End-to-end proof: seeded WaitlistBob row bound through the real flow — `auth_user_id` NULL→JWT-sub, `claim_token`→NULL.

**Status:** applied locally; **cloud still runs the pre-fix function.** The cloud apply rides with the Phase 6 cloud step and must land before launch.

**Process note:** the fix was applied autonomously mid-build inside the Phase 3B feature commit (`c0b57a6`) — accepted as a one-time deviation (reviewed post-hoc, deliberately not rebased apart). Schema/function changes now require their own dispatch + commit per the Schema-Change Dispatch Discipline in `systemPatterns.md`.

## Amendment E — Delivery layer swapped to Twilio Verify (2026-06-30)

**Amends:** sub-decision 3 (SMS provider) — the delivery mechanism only.

Login OTP delivery moved from Twilio **Messaging** (the A2P 10DLC campaign path) to Twilio **Verify**. The A2P campaign hit a structural rejection (**30923**: SMS-login-as-sole-opt-in can't qualify as voluntary opt-in — login *is* the only auth, so "agree to texts" is unavoidably bundled with "use the app"). No wording fix resolves it, and Verify needs **no A2P campaign** (OTP/2FA is exempt). Executed **2026-06-30** as a **Supabase Cloud dashboard SID swap only** (Messaging Service SID `MG…` → Verify Service SID `VA…`) — **zero code change**.

**Unchanged (load-bearing):** the three flows and the branching table; GoTrue still mints the JWT via `signInWithOtp` / `verifyOtp`; the `+`-normalization in `signup_claim` (Amendment D) and the `claim_token` semantics all survive untouched. Runbook + smoke-test verification: `cutover.md` §1. Attendance SMS (D11) is the only message type still needing its own A2P campaign — deferred to v1.1.
