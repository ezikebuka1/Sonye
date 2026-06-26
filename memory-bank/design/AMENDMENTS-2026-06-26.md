# Design Amendments — Public Feed, Merged Auth & Misc (post-consolidation)

**Status:** Approved (sketch-reviewed; ChatGPT design review reconciled against canon).
**Date:** 2026-06-26
**Affects:** new `public-feed.md` + `forms.md` (auth) + `00-overview.md`/`typography.md`
(wordmark) + `slot-card.md` (icon provenance).

These decisions were made while designing the v1 **public feed** and the **merged
`/auth`** screen, after the initial design folder was consolidated. Fold them into
the files noted, or keep this as the amendment log. Each is sketch-approved.

---

## A. The wordmark is lowercase: `sonye`

- The brand wordmark renders **lowercase** — `sonye` — everywhere it appears as a
  UI wordmark (header, auth screen, etc.). In plain body copy it may be capitalized
  normally ("Sonye runs curated…").
- **Why this is recorded:** no prior doc specified wordmark case. A design review
  *assumed* lowercase; rather than accept an assumption, it's now a real decision.
  (Add to `typography.md` or `00-overview.md`.)

---

## B. New surface — the Public Feed (`/`)

The logged-out front door. **This reverses the deferred "public browse" item in
`v2-signals.md`** (brought into v1 — it's the strongest Twilio-compliance proof
*and* the best top-of-funnel; the Partiful view-first model). It is NOT D12 (that's
the skill-level patch); the public-browse deferral was unnumbered.

**Routing (load-bearing — D13 constraint):** `src/app/page.tsx` becomes
`if (session) → <HomeClient/> else → <PublicFeed/>`. Do NOT displace the
authenticated feed to another route.

**What it shows:** real upcoming games as cards, reusing the slot-card anatomy and
**honoring the 50% fill rule** (below 50% = button only; ≥50% = dots + count).

**Card differences from the authed feed:**
- Button label: **"Join this game"** (NOT "Log in to join" — keep the emotional
  action on joining), with a helper line beneath: **"phone sign-in required"**.
- Tapping → routes to `/auth` (with the slot context — see section C).
- **Fill display (≥50% cards):** show **six dots** (filled + empty rings) +
  "X/6 filled · N left" — teaches "games lock at 6" and adds urgency. **Below 50%,
  still nothing** (the 50% rule wins over "always show dots" — a small number looks
  dead, which is the exact density failure the rule prevents).
- **No organizer name.** The logged-out feed stays roster-anonymous. Trust signal =
  real court + real time + real skill + real fill, NOT "Marcus is hosting" (avoids
  social-network/meetup framing + privacy expectations). First names appear only
  after joining (lobby).
- Fill dots are gender-neutral slate `#5E80A3` filled / `#C4D5E8` empty ring (gender
  is lobby-only).

**Header:** lowercase `sonye` + a `dallas` pill, and a top-right outlined **Log in**
button (this one stays "Log in" — it's the nav affordance, not the game CTA).

**Intro copy:** headline "Upcoming pickleball games"; subhead "Curated games at
Dallas courts. Pick a slot, verify your phone, and join." ("Recurring" dropped from
the first line — it can read as a weekly-commitment ask; use it later, not here.)

**Empty state (no upcoming games):** a calm inset card —
> **No open games right now**
> New Dallas pickleball slots are posted a few days ahead. Check back for Cole,
> Churchill, and Lake Highlands North games.
> **Games lock at 6 players.**

Do NOT show a blank screen, and do NOT invent demand or promise notifications that
don't exist.

> ⚠️ **Empty-state copy is coupled to the venue list.** It hardcodes the venue
> names. When venues change, this string must change too. (See section E — Fretz
> was already swapped for Lake Highlands North; this copy reflects that.) A future
> version could pull venue names from the `venues` table to remove the coupling.

**Schema dependency:** the public feed needs a NEW `SECURITY DEFINER` RPC,
`get_public_feed()`, returning a TABLE of upcoming non-cancelled slots, projecting
ONLY anon-safe fields (venue, time, skill, fill count — NO rosters, NO owner
phones/names), granted anon+authenticated per the D17 grant pattern, filtering
`starts_at > now() AND cancelled_at IS NULL`. (`slot_share_preview` CANNOT power it
— it needs a specific slot ID, and anon can't read the `slots` table to get the
list of UUIDs.) **Build it via recon → migration → routing.** (Suggest a new file
`public-feed.md` for this surface.)

---

## C. The Merged `/auth` screen (landing page folded into login)

The **standalone landing page is DELETED.** There are two public surfaces only:
the public feed (`/`) and the enriched `/auth`. `/auth` carries "what Sonye is"
context so a cold arrival knows what they're signing into, without burying the
phone field. (D2's flow architecture is unchanged — this is the existing `/auth`,
enriched.)

**Two variants by entry path (uses the EXISTING D2 Flow-1/Flow-2 distinction):**

**Flow 2 — arrived from tapping a specific game (`?slotId=`):** show a **"you're
joining" context banner** at the top — the game stays visible through sign-in (this
is the key conversion fix; a generic screen makes the user feel "where did my game
go?"):
> [paddle icon]  **you're joining**
> **Sat · 9:00 AM**
> Cole Park · intermediate · 2 spots left

Then: "Enter your number to join this game" → trust line → phone field → consent →
links → Send code.

**Flow 1 — cold arrival (no slot context):** instead of the banner, a compact
**3-point "how it works" strip** (one line each: find a game · join six players ·
show up & play) — gives context without a wall of marketing. Then "Enter your
number to log in or join a game" → same fields.

**Both variants share:**
- A **plain-English trust line** above the consent disclosure: **"No password.
  We'll text you a 6-digit code."** (directly answers phone-number anxiety).
- A reassurance under the Send-code button: **"Your number stays private and is
  never shared."**
- The **SMS consent disclosure is unchanged** (byte-identical, compliance-critical
  — do NOT reword). Placement stays between the phone field and the button. Treat
  it at regular weight, slightly narrower line length, readable contrast — present
  but visually subordinate to the phone field and CTA.
- Terms · Privacy on the same visual level as the consent text (not floating far).

**Intro line (cold variant):** "Curated pickleball games in Dallas." (dropped
"recurring," same reason as the feed).

---

## D. Accessibility — small-text contrast

The steel `#5E80A3` is too low-contrast against the pale `#E6F0FF` for **small**
text (helper text, disclosures, footer links). It's fine for large/bold text.

- **Use `#4A6E92`** (a darker secondary blue) for small secondary text — passes
  WCAG AA on pale blue where `#5E80A3` is borderline.
- Keep `#14304D` ink for primary labels/body.
- (Verify the exact ratio against WCAG AA before locking the token; `#4A6E92` is
  the proposed value. Update `colors.md`'s "Steel" guidance with a small-text note.)

Other a11y holds from existing docs: 44px+ tap targets, make the full card CTA
tappable (not just the text), visible focus states on the phone input and all
buttons/chips.

---

## E. Venue list correction (provenance note — already canon)

The v1 venue set is **Cole Park · Churchill Park · Lake Highlands North Park**.
**Fretz Park was removed** (projectbrief amendment A1, 2026-05-16 — Fretz is a paid,
gated, reservation-only court, incompatible with the tap-to-join model) and
**swapped for Lake Highlands North**. Any design copy listing venues (e.g. the
empty state) uses this set. Recorded here because design surfaces hardcode venue
names and must not regress to the old "Cole/Churchill/Fretz" list.

---

## F. Icon source provenance (PickleballIcon)

- The `PickleballIcon` source asset is `assets/paddle-source.svg` — a **clean
  single-color trace** (one path, `currentColor`, even-odd hole knockouts, ~2.5KB)
  derived from the site favicon. It is NOT the 652KB photographic auto-trace that
  was briefly attached (1,102 paths / ~50 colors — unusable).
- The favicon itself lives at `src/app/favicon.ico` (Next App Router auto-serves it).
- At build, `PickleballIcon` is regenerated from `assets/paddle-source.svg` per the
  D8.3 process (replace fills with `currentColor`, holes transparent). Call-site
  color is decorative orange `#FF6A00`; sizing `w-6`/`w-7`, bare (no chip).
- Note: the trace is raster-derived (faithful at icon sizes). If a pixel-perfect
  large-format mark is ever needed, source the original design-tool vector.
