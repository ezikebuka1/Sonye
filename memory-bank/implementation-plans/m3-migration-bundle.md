# M3 Migration Bundle

> Generated 2026-05-05. Single-use reference for starting a fresh architect thread at M3.
> Source files unchanged. Git log is canonical history.

---

## projectbrief.md (full strategic frame)

# Project Brief

## Vision (the destination)

A frictionless way for adults to participate in any group activity
they want — tennis, go-karting, basketball, anything —
without depending on the friends who flaked, the group chat that
died, or the night of staying home because the logistics broke.

You see something you want to do tonight. You tap Join Now. You're
in a game with other people who also wanted to do that thing
tonight. The group forms. You play.

The brand promise at this destination: **nothing holding you back.**

This is the long-horizon product. It is not what v1 ships.

## Operating philosophy: evolution-first, not scalable-first

InTotality (working name) is deliberately built to evolve, not to scale.

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
discipline applied to schema.

## V1 — the first form

V1 is **manually curated, recurring time slots in pickleball, in
Dallas**. The owner publishes Saturday 8 AM Cole Park three days
in advance. Users opt in. When the slot fills (capacity 6), the
group locks. The game happens.

V1's honest brand promise: **curated games with reliable groups,
in Dallas.**

This is narrower than the vision on every dimension:
- **Mechanic:** scheduled slots, not spontaneous matching.
- **Activity:** one sport only. Not multi-activity.
- **Geography:** Dallas only. Three vetted courts (Cole Park,
  Churchill Park, Fretz Park).
- **Curation:** manual by the owner. Not autonomous.
- **Promise:** reliability and quality, not zero-friction spontaneity.

V1's narrowness is the strategy, not a limitation to apologize for.

## What v1 deliberately does NOT do

- No real-time autonomous matching ("Play Now"). Deferred until
  density supports it — likely Vn where n ≥ 2.
- No multi-activity. One sport only at launch. Schema is multi-
  activity-ready; product surface is not.
- No multi-city. Dallas only. Schema is multi-city-ready; product
  surface is not.
- No filters or segmentation that fracture the user pool.
- No profile pictures. See V1 Realness Strategy below.

These are not features missing from v1; they are evolution surface
area held in reserve.

## V1 → Vn evolution map (the trajectory)

Two plausible next moves; ordering deliberately TBD until v1 data:
- **Activity-broad next:** one sport Dallas → tennis Dallas → more activities.
- **Geography-broad next:** one sport Dallas → same sport Austin/Houston/OKC.

The decision between these is gated on observed density patterns
in v1. Both seams must stay open in M3 (D3 schema).

Real-time autonomous matching ("Play Now") sits beyond either of
these expansions. It requires sufficient liquidity and is the
long-horizon mechanic, not the immediate next step.

## V1 Decision Principle: Density Over Everything

The dominant risk in v1 is not bad matching — it is empty slots. A
slot with 3 players and mediocre chemistry is strictly better than
a slot with 1 player and perfect chemistry, because the first
produces a game and the second does not.

Every feature proposal during v1 must answer: "Does this improve
density and liquidity, or does it fracture the user base further?"
Filters, preferences, and segmentation axes all carry a density
cost.

Features that improve density earn a place in v1. Features that
fracture are held for Vn until post-launch data shows density is
high enough to afford the segmentation.

## V1 Design Pattern: The Partiful Model

V1 optimizes for frictionless group-chat-to-on-the-list conversion.

Concrete v1 implications:
- Slot detail pages have dynamic, state-aware Open Graph metadata.
  Preview content shifts by fill state (0/6 → vibe; 3/6–5/6 →
  social proof; 6/6 → waitlist FOMO).
- View-first, auth-second: unauthenticated users can see a slot,
  its fill count, and named members (first name + initial avatar).
  Auth wall triggers only at the Join button.
- Member identity = first name + initial avatar in roster contexts;
  full profile on tap. Progressive disclosure.
- Auth is SMS OTP only. No passwords, no email. D2 will codify.
- SMS is the notification layer for commitment-critical events only
  (game locked, game tomorrow). Chat messages never trigger SMS.
- Share surfaces emphasize the sharer when they are a slot member
  ("Jordan is playing Sunday at Fretz, join them") — player-as-
  voucher social proof.

## V1 Realness Strategy: Real People Without Density Tax

V1 leans on realness signals that fall out of existing mechanics
for free, with zero added onboarding friction:

- **First names, not handles.** Already enforced via D7.
- **Human-written chat.** Three seeded lobby messages model the register.
- **Avatar color variance.** Blue palette of 4-5 shades.
- **Member-since timestamp on profiles** (M3+).
- **Games-played counter on profiles** (M5+).
- **Last-played timestamp on profiles** (M5+).
- **SMS-verified phone badge on profiles** (M4+).

The structural realness move: **density itself**. A populated v1
is automatically credible. Launch-day simultaneous onboarding of
the pre-launch waitlist via SMS magic links is the realness move.

## The Goal (concrete)

Design, build, and deliver a fully functional, reliable v1.
Pre-launch waitlist of real users (collected manually) is
pre-seeded into the database; launch day onboards them via SMS
magic-claim links. Measure engagement, iterate based on real-world
coordination data. Density and follow-through are the metrics that
gate the transition out of v1 into Vn.

---

## systemPatterns.md (discipline + process patterns, condensed)

### Architecture
- Next.js 15 App Router — pages at `src/app/[page-name]/page.tsx`
- Mobile-first — design for 390px width, scale up
- One page per folder; reusable components in `src/components/`
- Tailwind only; no inline styles, no CSS modules
- TypeScript strict; no `any` types

### Color System (D8 tokens — hex + usage rules)

| Token | Hex | Usage |
|-------|-----|-------|
| bg-page | `#EEF4FA` | Page background |
| bg-card | `#FFFFFF` | Card surfaces, 0.5px border `#DAE7F1` |
| bg-inset | `#F6F9FC` | Inset panels |
| accent-coral | `#D4724A` | CTAs, hero italic word, active nav only |
| coral-dark | `#B85D3A` | Hover/active state on coral elements |
| text-primary | `#1A3650` | All primary text |
| text-secondary | `#7A9AB8` | Supporting text |
| border-card | `#DAE7F1` | Card borders (0.5px) |

**Skill badges:**
- Beginner: bg `#E0EEF9` / text `#0C447C`
- Advanced Beginner: bg `#FAF0DC` / text `#854F0B`
- Intermediate: bg `#E8F5E9` / text `#27500A`
- Advanced: bg `#FBEAF0` / text `#72243E`

**Avatars:** blue palette only (`#1A3650`, `#3A7CB8`, `#5A9FD4`). Never coral.

**Typography:** DM Sans for all UI. Instrument Serif italic for one hero word per screen only.

**Corners:** buttons `rounded-xl` (14px); cards `rounded-2xl` (20px).

**50% fill rule:** slot cards show player count + avatar dots only when opt-ins ≥ 50% of capacity.

**Token wiring:** Tailwind v4 `@theme` inline in `src/app/globals.css`. Fonts via `next/font/google` in `layout.tsx`.

### Process Patterns

**Sketches Before Code** (effective 2026-04-15): All visual design proposals must be presented as rendered HTML/SVG sketches before implementation. Architect session enforces. No design decisions handed to Code without an approved visual sketch.

**V1 Scope Discipline** (effective 2026-04-18): V1 feature additions must improve density and liquidity. See projectbrief.md → "V1 Decision Principle." Architect session enforces. Scope proposals adding filters, preferences, or segmentation default to the icebox.

**Push Discipline**: Pushes to GitHub are manual, never automated. Push after each shipped feature commit. Verify with `git log origin/main..HEAD --oneline` before declaring work done. Post-commit hooks that auto-push are rejected.

**Raw-Output Reporting** (effective 2026-04-18): When Code reports completion of any task, Code MUST paste raw output of:
1. `git log --oneline -5`
2. `git log origin/main..HEAD --oneline`
3. `git show --stat HEAD` (canonical for verifying what's in a commit vs working tree noise)

Summaries are optional additions, not substitutions. Verbal claims of "clean" or "complete" are rejected without raw output.

**Cross-Engine Verification**: Claude Code (implementer), Claude.ai (architect), Gemini (third perspective). All three sessions share the memory bank as source of truth. Pre-commit Husky hook enforces memory bank update on any `src/` staged changes. Re-read `activeContext.md` at every session start.

---

## activeContext.md — CURRENT STATE (end of M2 / start of M3)

### Current State
M2 complete. D1 (Zustand) and D5 (minimal toast) decided and implemented. No backend, no auth, no API calls. D7 v1 product mechanics ✅. D8 design system ✅. D9 concurrent join policy ✅ decided (implementation deferred to M3 schema + M4/M5 enforcement). Next: M3 — Supabase backend. D3 (database schema) decision must be made first.

### What Exists
- Home screen at `/` per Option A — greeting, hero, social proof, conditional onboarding banner, slot cards with 50% fill rule, bottom tab bar; mock data only
- Mock data module at `src/lib/mockData.ts` with D7-aligned flat ID-referenced shapes, v2 breadcrumb fields, `seedUser` named export
- Zustand store at `src/lib/store.ts` — `useAppStore` with `currentUser`/`setUser`/`clearUser`; slots slice (`Record<string, Slot>`), `joinSlot` (optimistic + 600ms simulated async + rollback), toast slice
- Toast component at `src/components/Toast.tsx` — top-of-viewport, slide-down, auto-dismiss 5s, error/success variants, backdrop-tap dismiss
- D5 minimal pattern: toast only at M2.2; skeleton/spinner deferred to M3
- Presentational components: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard, BottomTabBar, CommitmentTracker, MemberAvatarStack, ChatMessageList, LobbyHeader, Toast
- All `<button>` elements across src/ carry explicit `type="button"` (10 instances, 6 files)
- Playwright: `chromium` + `webkit-iphone` (iPhone 14) projects; 24 tests total (12 per engine); suite at `e2e/`
- D8 tokens wired as Tailwind v4 `@theme` in `globals.css`; DM Sans + Instrument Serif via `next/font` in `layout.tsx`
- D7 onboarding form at `/onboarding` — 6 visible fields (willing_to_drive cut per D7.1); submit writes to Zustand store, navigates to `/`
- Group Lobby at `/group-lobby` — read-only: header (venue/time/skill badge), commitment tracker (5/6), member avatar stack, chat (3 seeded messages), non-functional Leave stub

### What Does NOT Exist Yet
- Persistence (store is in-memory only; Supabase in M3)
- Real backend/Supabase (M3)
- Auth flow (M4; D2 decision pending)
- Real slot join (optimistic only; no DB write)
- Entry point from home to lobby (M5)
- Leave session flow (M5)

### Active Deferrals
- **Leave session button** is a console.log stub. Cancellation reason prompt lands in M5 per D7.
- **`/group-lobby` has no entry point from `/`.** Direct URL only. Real navigation wires in M5.
- **Store is in-memory only.** Hard refresh wipes `currentUser`. Real persistence in M3.
- **BottomTabBar tab clicks are no-ops.** Squad and Profile routes don't exist yet.

### Known Environment Quirks
- **Next.js dev server HMR — device testing.** `npm run dev` binds HMR to `localhost` only. iPhone on same wifi receives static HTML but React never hydrates. **Device verification must use:** `npm run build && npm run start`. Discovered 2026-05-01.
- **Security hook on sport-name substring.** User-global Claude Code plugin fires a PreToolUse hook on Write/Edit containing a specific sport-name substring. Fires once per file per session, then self-silences. Protocol: acknowledge, retry (succeeds on retry).
- **Shell command substitution blocked.** `$(...)` blocked by terminal guard. Use pipes/xargs instead.
- **Husky pre-commit hook.** Fires on any commit where `src/` files are staged. Requires `memory-bank/activeContext.md` also staged.

---

## PLAN.md — registers and milestone summary

### Decisions Register

| # | Decision | Blocks | Status |
|---|----------|--------|--------|
| D1 | State management — Zustand for client state | M2 navigation | ✅ decided 2026-04-18 |
| D2 | Anonymous vs authenticated onboarding flow | M4 auth | ⏳ pending |
| D3 | Database schema (relationships, FKs, RLS, queue state) | M3 backend | ⏳ pending |
| D4 | Matching algorithm (FCFS vs optimal, client vs edge, immediate vs round-based) | M5 matching | ⏳ pending |
| D5 | Loading and error state design system | M2 onward | ✅ decided 2026-04-28 |
| D6 | Realtime architecture (Supabase channels vs polling vs hybrid) | M5 realtime | ⏳ pending |
| D7 | V1 product mechanics (slot model, group size, waitlist, onboarding schema) | M1 onward | ✅ decided 2026-04-15 |
| D9 | Concurrent join policy — max one Joined slot per calendar day | D3 (schema), M4 (enforcement), M5 (leave flow) | ✅ decided 2026-05-01 |

**Note:** D9 blocks D3. Schema must support `attended`, `left_at`, `leave_reason` on membership records and an indexed same-day-active query before enforcement can be implemented.

### Milestone Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 — Foundation | ✅ complete | Repo, env, memory bank, hooks, multi-session protocol |
| M1 — Frontend Skeleton | ✅ complete | Three mobile-first pages, mock data, D8 design system wired |
| M2 — Navigation & Client State | ✅ complete | Zustand store, optimistic join, D5 toast, 24-test E2E suite |
| M3 — Backend Foundation | ⏳ next | D3 decision first, then Supabase tables, seed, RLS stubs |
| M4 — Authentication | ⏳ pending | D2 decision first; SMS OTP only (Supabase phone provider) |
| M5 — Slot Mechanics & Realtime | ⏳ pending | D4, D6 decisions; real opt-in, lock, chat, leave flow |
| M6 — Polish & Launch | ⏳ pending | Deploy, OG metadata, share affordance, waitlist onboard |

### Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimating M3-M5 by 2-4× | High | Milestones not weeks. Celebrate completion regardless of duration. |
| Matching algorithm produces bad squads | High | Build a tuning UI in M5 showing why specific matches happened. |
| Supabase free tier limits during M5 realtime | Medium | Know limits before M5. Plan upgrade path. |
| Scope creep delays launch | High | Anything not in this plan goes to icebox until M6 ships. |
| Multi-session drift | Medium | Pre-commit hook. Re-read activeContext.md at session start. |
| Secrets committed to GitHub | High if it happens | `.env.local` in `.gitignore`. RLS as defense in depth. |
| Partiful pattern violated by future scope decision | High | Every scope decision checked against V1 Design Pattern in projectbrief.md. |

### Icebox (full — load-bearing for D3 boundary decisions)

- Push notifications
- Native mobile apps
- Multi-sport beyond the v1 sport
- Tournament brackets, carpooling, equipment coordination
- Friend lists / social graph
- Ratings / reviews after sessions
- Recurring sessions (beyond the slot model)
- Paid sessions
- Activity browse mode (removed 2026-04-12; revisit if matching engine fails PMF)
- **Profile pictures** — deferred to v2. Photo upload is highest-attrition onboarding step. Optional photos create inconsistency. Opens moderation/GDPR/CDN tax. Underlying "are these real people?" need better served by V1 Realness Strategy. Reconsider when active user count crosses ~500 in a single metro.
- **Play-reason matching** — slot-attribute model (owner tags slot with play reason, users filter). Deferred on density/liquidity grounds. Re-evaluate after launch data shows whether mismatched-reason pairings produce observable bad games.

---

## progress.md

### Done ✅
- M0: GitHub repo, dev env, memory bank, Husky hook, multi-session protocol
- M1: Home screen (`/`), Onboarding form (`/onboarding`), Group Lobby (`/group-lobby`), mock data module, D8 tokens wired, D7 form complete (6 fields per D7.1)
- M2.1: Zustand store + submitted name threads to greeting
- M2.2: `joinSlot` optimistic state + rollback, Toast component, D5 decided
- M2 complete ✅ — 24-test E2E suite (chromium + webkit-iphone), all `<button>` elements have `type="button"`, D9 decided

### Up Next
- M3: Supabase backend. D3 (database schema) decision must be made first, then D2 (auth flow) before M4.

### Not Started ⏳
- Persistence (M3), Auth (M4), Real slot join/lock/realtime (M5), Launch (M6)

---

## D7 — Product Mechanics V1 (FULL)

# D7 — Product Mechanics for V1

**Decided:** 2026-04-15
**Status:** Approved, supersedes any prior assumptions about matching mechanics

## Summary

V1 implements brief-aligned matching via **manually curated, recurring time slots** that users opt into. The system forms groups by filling published slots — not by searching across users in real time. Real-time autonomous matching ("Play Now") is deferred to v2 once liquidity supports it.

## Product Mechanics

### Slot model
- Slots are recurring weekly published time blocks (e.g., "Beginner, Wednesday 7 PM at Cole Park").
- Slots are manually created by the project owner for v1. No automated slot generation.
- V1 launches with 1-3 slots and expands as liquidity grows.
- Each slot has: skill level, day of week, time, venue, sport, group capacity.

### Group size
- 6 players per slot for v1.
- A 4-player group with 1-2 no-shows produces a broken experience. 6 absorbs 1-2 flakes and still produces a playable game (4+ players for doubles).

### Opt-in flow
- User sees available slots on the home screen.
- User taps a slot to opt in.
- When the slot fills (hits capacity of 6), the session is locked and all members are notified.
- Locked sessions are immutable — no one joins or leaves a locked session.

### Waitlist behavior
- Original slot is always the priority.
- Waitlist exists only when the original slot is full (6/6).
- Waitlist holds 2 people for that specific slot.
- When a 3rd user attempts to join a full slot, the system notifies the project owner. No automated slot spawning in v1.

### Cancellation
- When a user cancels, the system asks one question: reason for cancellation (free text or short list — TBD during implementation).
- No reschedule prompt in v1. Cancellation reason data informs v2 reschedule design.

### Sole-occupant slot handling
- If a slot has only 1 opted-in user as game time approaches, the user is notified and prompted to join another slot or waitlist.
- Original sparse slot is cancelled.
- Threshold: default 6 hours before slot start.

## Onboarding Schema (v1)

| Field | Type | Notes |
|-------|------|-------|
| Name | text | Display name in app |
| Phone number | text | Required for SMS auth at launch |
| Sport | single-select | Hardcoded to v1 sport; field exists for v2 multi-sport readiness |
| Skill level | single-select | beginner / advanced beginner / intermediate / advanced |
| General availability | multi-select | weekday evenings / Saturday morning / Saturday evening / Sunday morning / Sunday evening |
| Preferred venues | multi-select | Cole Park (Dallas) / Churchill Park (Dallas) / Fretz Park (Dallas) |
| Willing to drive | single-select | Under 10 min / Under 20 min / Under 30 min / 30+ min |

**Why venue multi-select and not radius slider:** v1 venues are a small finite set of three specific vetted Dallas courts. "Pick which of these works for you" is more honest UX.

**Why `willing_to_drive` collected in v1:** v2 matching algorithm will use this field. Capturing v2-relevant fields in v1 prevents asking existing users to fill them in later.

## Waitlist Import Strategy

- Waitlist data lives in a Google Sheet with the seven onboarding fields.
- Pre-launch import script (`npm run seed:waitlist`) creates user records.
- On launch day, each waitlist user receives an SMS with a magic claim link.
- Tapping: verify phone via OTP → linked to pre-seeded record → land on home screen with preferences already set. No re-onboarding.

## V2 Architectural Breadcrumbs

| Field | Where | V1 use | V2 use |
|-------|-------|--------|--------|
| `creation_mode` on `sessions` | sessions table | always `scheduled_slot` | distinguishes `scheduled_slot` vs `play_now` |
| `sport` on `sessions`, `users` | both tables | always v1 sport | enables multi-sport |
| `willing_to_drive` on `users` | users table | collected, not used | matching algorithm filters by drive willingness |

## V2 Roadmap (deferred, captured for context)

- **Play Now button:** real-time autonomous matching for spontaneous play.
- **Multi-sport:** expand beyond v1 sport. Schema ready; UI and venue inventory are the work.
- **Reschedule prompt on cancellation:** revisit after v1 cancellation-reason data.
- **Automated slot spawning from waitlist:** revisit after first month of manual slot management.

## Open Questions (to resolve during implementation)

- Exact sole-occupant timing threshold (default 6h; may tune)
- Cancellation reason format (free text vs short list)
- Magic claim link expiration (probably 7 days, TBD)
- What happens when a user wants to opt out of a non-locked slot they joined

## D7.1 Amendment — Willing-to-Drive Removed from In-App Form (2026-04-24)

**Status:** Applied during M1 Polish.

The `willing_to_drive` field remains in the user schema and is collected via the Waitlist Intake Script. It is **not** shown in the in-app onboarding form for v1.

**Reason:** Density principle. Adding an optional 4-option chip field increases form length without improving v1 matching. Field preserved in schema for v2 use.

**Impact:** In-app form has 6 visible fields in v1 (not 7). `DrivingWillingness` type stays in `mockData.ts` on the `User` shape — only the form field is removed.

---

## D9 — Concurrent Join Policy (FULL)

# D9 — Concurrent Join Policy

**Decided:** 2026-05-01
**Status:** ✅ Decided. Implementation deferred to M3 (schema) and M4–M5 (enforcement + leave flow).
**Blocks:** D3 (schema must support same-day-active query + attended flag + left_at), M4 (enforcement), M5 (leave flow)
**Related:** D7 (cancellation reason capture), D5 (toast pattern), V1 Decision Principle, V1 Realness Strategy

## The Decision

A user may hold a maximum of **one Joined slot per calendar day**.
The cap unlocks when:
  (a) the user leaves the current slot (via M5 cancellation flow with reason capture), or
  (b) the slot's match completes (attended or no-show).

Across different days, no aggregate cap.

## The Problem

Without a cap, a user can join unlimited concurrent slots. This
inflates apparent density at the cost of real density. A user joined
to three games who shows up to one creates two phantom commitments —
slots that appeared full to other users but turn out broken at game time.

This degrades the realness signal the V1 Realness Strategy is built around:
"track record is the single strongest real-person signal. Bots don't show up to games."

## Why "leave OR complete" as unlocks

1. **Reuses existing infrastructure.** M5 cancellation flow (D7) is happening regardless.
2. **Honest-switcher path exists.** A user who wants a different slot can leave with reason "switching" → join the new one. No forced flake.
3. **Reason data gets richer.** Cancellation-reason picker gains "switching" category that informs v2 reschedule design.
4. **Phantom flakes still pay.** No-show is marked at match end regardless of when the slot "unlocked."

## Same-day collision UX

When a user with an active Joined slot taps Join on another same-day slot:
- Error-variant toast (D5):

  > "You're already in a game today. Leave that one or complete it to join another."

- Blocked Join button stays in pre-tap state. No fake-disabled state, no inline switching affordance.
- To switch: navigate to currently-Joined slot → tap Leave (M5 flow with reason picker including "Switching to another game") → return and tap Join on new slot.
- Tone: D5 register (contractions, lowercase mid-sentence). Multi-clause toast keeps grammatical punctuation.

## Why not inline-switch affordance

Requires new toast affordance pattern + leave flow state work. Friction is partly the feature — leave-and-rejoin should feel slightly deliberate. Captured as v1.5/v2 amendment trigger: if 30-day data shows "Switching to another game" as dominant leave-reason, the build cost is earned.

## Implementation requirements

**For D3 (schema):**
- Session-membership records need `attended: boolean | null` (null = pending; true = confirmed; false = no-show)
- Session-membership records need `left_at: timestamp | null` and `leave_reason: string | null`
- Indexed query: "user's currently-active same-day commitments" — composite index on `(user_id, slot_date, left_at, attended)`
- "Currently active" predicate: `Joined AND left_at IS NULL AND attended IS NULL AND slot_start_time > now()`

**For M4 (enforcement):**
- `joinSlot` action queries same-day-active set before optimistic update.
- Non-empty set → abort, surface collision toast.
- Server-side authoritative; client-side short-circuit for UX speed only, not security.

**For M5 (leave flow + attendance confirmation):**
- Leave flow surfaces reason picker per D7; includes "Switching to another game".
- Leaving sets `left_at` + `leave_reason` on membership record.
- Post-game prompt: "Did you make it? Yes / No / I'll let you know."
- Setting `attended` unblocks the cap independently of `left_at`.

## Provisional for v1

Watch first month of real M5+ data:
- Low flake rate + frequent cap-bumping → soften toward unlimited concurrent.
- High flake rate even with cap → consider strict global one-at-a-time.
- "Switching to another game" dominates leave reasons → consider inline-switch affordance.

---

## Closed Decisions — Summary

### D1 — State Management

Zustand chosen for all client state. Single store at `src/lib/store.ts` using `useAppStore`. Slice pattern: `currentUser`/auth slice + slots slice + toast slice. Selective subscriptions prevent unnecessary re-renders. Coexists with future React Query for server-state caching (M3+) — Zustand owns UI/interaction state, React Query owns async server data. Form state stays local `useState` (not store). In-memory at M2; Supabase persistence in M3.

### D5 — Loading & Error States (Minimal Toast)

Minimal toast pattern only for M2. Top-of-viewport, slide-down 200ms animation, auto-dismiss at 5s, backdrop-tap dismiss, two variants: error (with "Retry" inline action) and success. Single active toast at a time (replace-not-queue). Two copy strings defined: error: "Something went wrong. Try again?" / success: "You're in! See you at [slot]." Skeletons and spinners explicitly deferred until concretely needed in M3+. D5 is provisional; amendments expected as M3-M5 async patterns are built.

### D8 — Design System "Pickup Ready"

Reference card:
- **Colors:** bg-page `#EEF4FA`, bg-card `#FFFFFF`, accent-coral `#D4724A` (hover `#B85D3A`), text-primary `#1A3650`, text-secondary `#7A9AB8`, border-card `#DAE7F1` (0.5px), bg-inset `#F6F9FC`
- **Skill badges:** Beginner `#E0EEF9`/`#0C447C`, Adv Beginner `#FAF0DC`/`#854F0B`, Intermediate `#E8F5E9`/`#27500A`, Advanced `#FBEAF0`/`#72243E`
- **Avatars:** blue palette only (`#1A3650`, `#3A7CB8`, `#5A9FD4`). Never coral.
- **Type:** DM Sans for all UI; Instrument Serif italic for one hero accent word per screen only
- **Corners:** buttons `rounded-xl` (14px); cards `rounded-2xl` (20px)
- **50% fill rule:** slot cards show count + avatars only when fill ≥ 50% of capacity
- **Token wiring:** Tailwind v4 `@theme` inline in `src/app/globals.css`; fonts via `next/font/google` in `layout.tsx`

---

*End of M3 Migration Bundle.*
