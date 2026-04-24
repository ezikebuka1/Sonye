# SquadUp — Project Plan

**One-line definition:** SquadUp is a frictionless group formation and coordination engine for casual sports — users input availability, skill, and location, and the system autonomously forms reliable critical-mass groups. Mobile-first PWA. Single location, few time frames at launch, by design, for liquidity density.

**Status:** M1 in progress. D7 v1 mechanics decided 2026-04-15. D8 design system approved 2026-04-17. Memory bank reconciled 2026-04-18. Next step: home screen implementation at `/` per Option A.

**How to read this plan:**
- Milestones, not weeks. Order matters; duration doesn't. Don't estimate dates.
- Every task has a "done when" line. If you can't tell whether a task is done, it isn't.
- Three kinds of items: 🏗️ architecture decision, 🔨 implementation task, 🧪 verification.
- After each milestone, do the Checkpoint. Don't skip them — they're the highest-leverage hours in the project.

---

## Decisions Register (M0)

Architectural decisions that shape everything downstream. Make them deliberately, in order, before the milestone that depends on them.

| # | Decision | Blocks | Status |
|---|----------|--------|--------|
| D1 | 🏗️ State management — Zustand for client state | M2 navigation | ✅ decided 2026-04-18 |
| D2 | 🏗️ Anonymous vs authenticated onboarding flow | M4 auth | ⏳ pending |
| D3 | 🏗️ Database schema (relationships, foreign keys, queue state representation) | M3 backend | ⏳ pending |
| D4 | 🏗️ Matching algorithm (FCFS vs optimal, client vs edge function, immediate vs round-based) | M5 matching | ⏳ pending |
| D5 | 🏗️ Loading and error state design system | M2 onward | ⏳ pending |
| D6 | 🏗️ Realtime architecture (Supabase channels vs polling vs hybrid) | M5 realtime | ⏳ pending |
| D7 | 🏗️ V1 product mechanics (slot model, group size, waitlist, onboarding schema) | M1 onward | ✅ decided 2026-04-15 |

Each decision becomes a one-page doc in `memory-bank/decisions/` before becoming implementable.

---

## M0 — Foundation ✅

- [x] GitHub repo created and pushed
- [x] Dev environment installed (Cursor, Git, Node, Next.js, Tailwind, TypeScript)
- [x] Memory bank scaffolded with five canonical files
- [x] `CLAUDE.md` configured with Memory Bank Protocol
- [x] `AGENTS.md` configured to guard against stale Next.js API hallucinations
- [x] Husky pre-commit hook enforcing memory bank updates on `src/` changes
- [x] Multi-session protocol established (Code as implementer, Claude.ai as architect, Gemini as third perspective)
- [x] Drift cleanup: removed activity-browse code from `/`, replaced with redirect to `/onboarding`, reconciled memory bank with filesystem (2026-04-12)

---

## M1 — Frontend Skeleton (in progress)

**Goal:** three mobile-first pages exist as routes, render with mock data, look like the real app. No backend, no auth, no realtime.

- [ ] 🔨 Onboarding form at `/onboarding` (per D7 schema — currently a splash screen, must be rebuilt)
  - **Done when:** captures all 7 D7 fields (name, phone, sport, skill_level, general_availability, preferred_venues, willing_to_drive); submit disabled until name, phone, skill, availability, and at least one venue are set; renders correctly at 390px.
- [ ] 🔨 Home screen at `/` per Option A (merged welcome + slot browse)
  - **Done when:** single screen at `/` replaces the redirect; greeting adapts to onboarded state ("Hey there" → "Hey [Name]"); hero text "Find your squad." with Instrument Serif italic coral accent; social proof strip; coral-bordered onboarding banner visible only when user has no profile, routes to `/onboarding`, hides once 7 D7 fields are captured; slot cards render per D8 with 50% fill rule; bottom tab bar (Home / Squad / Profile) with Home active in coral; renders correctly at 390px.
- [x] 🔨 Root route `/` redirects to `/onboarding`
  - **Done when:** server-side redirect, no UI, minimal implementation.
- Note: original M1 plan included a `/queue` "searching" page; D7 retired this concept. Slot-based opt-in replaces real-time queueing for v1.
- [ ] 🔨 Group Lobby page at `/group-lobby`
  - **Done when:** displays mock locked session at venue/time, commitment tracker showing 5/6 filled (D7 group size), read-only chat with 3 mock messages, "leave session" button (non-functional in M1), renders correctly at 390px.
- [ ] 🔨 Mock data module at `src/lib/mockData.ts`
  - **Done when:** flat ID-referenced shapes for `users` (with all D7 fields), `venues` (Cole/Churchill/Fretz Park), `slots` (recurring publishable slots), `sessions` (locked groups). Pure helper functions. No mutation. Matches D7 schema including v2 breadcrumb fields.
- [ ] 🔨 Reusable components extracted: `CommitmentTracker`, `ChatBubble`, `Avatar`, `PrimaryButton`, `SecondaryButton`, `Badge`, `CriteriaChip`
  - **Done when:** components live in `src/components/`, take props per architect prop contracts, no business logic.
- [ ] 🧪 All three pages tested manually at 390px
  - **Done when:** screenshots captured, no horizontal scroll, tap targets ≥44px tall.

**Checkpoint M1:**
1. Re-read `projectbrief.md`. Is the one-line definition still accurate?
2. Do the three pages feel like one product or three? If three, tighten the design system before moving on.
3. Have D1, D2, D5 been made? If not, M2 cannot start.
4. Is `activeContext.md` reconciled with the filesystem? Reconcile any drift.

---

## M2 — Navigation & Client State

**Depends on:** M1 complete, D1 made, D5 made.

**Goal:** the three pages are wired together. Preferences flow from Onboarding through Queue to Group Lobby. State lives in the client store chosen in D1.

- [ ] 🏗️ D1 decision doc committed to `memory-bank/decisions/D1-state-management.md`
- [ ] 🔨 Client state store implemented per D1
  - **Done when:** preferences object survives navigation, has TypeScript types, clean API.
- [ ] 🔨 `router.push()` wiring between pages, replacing the hardcoded `// TODO: D1` chips on Queue
- [ ] 🔨 Loading state component per D5
- [ ] 🔨 Empty state component per D5
- [ ] 🧪 End-to-end flow test
  - **Done when:** Onboarding → Queue → Group Lobby completes, preferences match selections.
- [ ] 🧪 Cleanup test
  - **Done when:** Cancel from Queue mid-timer does NOT cause auto-navigation to fire after the user has left.

**Checkpoint M2:**
1. Test on a real phone over local network, not just devtools.
2. Loading states the right length? Transitions smooth?
3. Update `activeContext.md` with the navigation pattern.

---

## M3 — Backend Foundation

**Depends on:** M2 complete, D3 made.

**Goal:** Supabase connected. Real data flows. Mock data deleted.

- [ ] 🏗️ D3 decision doc committed (full schema, foreign keys, RLS plan)
- [ ] 🔨 Supabase project created, secrets in `.env.local`, `.env.example` committed, `.gitignore` verified
- [ ] 🔨 Database tables created per D3 with permissive RLS stubs
- [ ] 🔨 Supabase client at `src/lib/supabase.ts`
- [ ] 🔨 `npm run seed` script populates dev data matching `mockData.ts` shape
- [ ] 🔨 Replace mock data with Supabase queries on all three pages
- [ ] 🧪 Fresh-clone test: another machine can clone, set env, seed, and run
- [ ] 🔨 RLS policies permit anonymous reads on published slots and
      anonymized member avatar data (Partiful view-first pattern —
      see projectbrief.md)

**Checkpoint M3:**
1. Schema worth showing another engineer? If not, refactor before adding auth.
2. Indexes on commonly queried fields?
3. **Critical:** `git check-ignore .env.local` returns the file. If you've already committed secrets, rotate them now.

---

## M4 — Authentication

**Depends on:** M3 complete, D2 made.

- [ ] 🏗️ D2 decision doc committed
- [ ] 🔨 Supabase Auth integrated (signup/login/logout)
- [ ] 🔨 Protected route wrapper
- [ ] 🔨 Editable user profile page
- [ ] 🔨 Onboarding handles auth transition per D2 without losing selections
- [ ] 🔨 RLS policies tightened — verified by attempting to read another user's data with a different account
- [ ] 🧪 Auth edge cases: expired session, password reset, two-tab sync
- [ ] 🔨 SMS OTP auth via Supabase phone provider; no password path,
      no email path. D2 decision must codify Partiful-style SMS-only
      auth with a decision between onboarding-at-Join (Model B) and
      lightweight-join-with-later-profiling (Model A). See
      projectbrief.md V1 Design Pattern.

**Checkpoint M4:**
1. Try to break your own auth. Guess URLs in a private window.
2. Is the "frictionless" promise from the brief still alive after auth landed?

---

## M5 — Slot Mechanics & Realtime

**Depends on:** M4 complete, D6 made. (D4 substantially reduced in scope by D7.)

**Goal:** the actual product. Slot opt-in works against real data, sessions lock at capacity, lobby updates in realtime, chat works.

D7 dramatically simplified what "matching" means in v1. There is no real-time matching algorithm — slots are pre-published, users opt in, slot fills, session locks. The "hard part" is now realtime UI + chat + lock semantics, not algorithm design. Real-time autonomous matching ("Play Now") is deferred to v2.

- [ ] 🏗️ D6 decision doc committed (realtime architecture)
- [ ] 🔨 Owner-facing slot creation (admin form or seed-script-only — TBD)
- [ ] 🔨 Opt-in transaction logic (atomic: slot capacity must not be exceeded under concurrent opt-ins)
- [ ] 🔨 Session lock-in logic when slot reaches capacity (status → `locked`, members notified)
- [ ] 🔨 Sole-occupant detection job (notify single user 6h before slot, offer alternatives)
- [ ] 🔨 Waitlist mechanics (overflow when slot full, owner notification at waitlist size 3)
- [ ] 🔨 Realtime slot/session updates (per D6)
- [ ] 🔨 Write-capable group chat in locked sessions
- [ ] 🔨 Cancellation flow with reason capture
- [ ] 🧪 Two browser windows, two users, opt into same slot, both see updated count in realtime
- [ ] 🧪 Concurrent opt-in stress: simulate 10 users opt into a 6-capacity slot — exactly 6 succeed, 2 land on waitlist, 2 see "slot full" message
- [ ] 🔨 Join flow integrates onboarding-at-Join per D2 decision.
      Target: under 60 seconds from Join-tap to on-the-list, including
      phone OTP and first-time profile form.
- [ ] 🔨 SMS notifications for commitment-critical events only (slot
      locked, slot tomorrow). Chat messages do NOT trigger SMS.

**Checkpoint M5:**
1. Re-read D4. Is the algorithm doing what users want, or what was easy?
2. Have a friend use it (not a demo). Watch silently. Note where they get stuck.
3. Re-read `projectbrief.md` for the third time. Does what you've built match what you said?

---

## M6 — Polish & Launch

**Depends on:** M5 complete.

- [ ] 🔨 Deploy to Vercel, env vars set in dashboard, deploys on push to main
- [ ] 🔨 README rewritten (what SquadUp is, how to run locally, links to architecture)
- [ ] 🔨 Error tracking (Sentry or Supabase errors table)
- [ ] 🔨 Basic analytics ("how many users joined a queue in last 24h")
- [ ] 🔨 Playwright tests for the three critical flows
- [ ] 🔨 Real-device mobile testing (one iOS, one Android, not devtools)
- [ ] 🔨 Audit: every async op has both loading and error state
- [ ] 🔨 Audit: every list has a designed empty state
- [ ] 🔨 Pre-launch: privacy policy, terms, plan for sudden traffic
- [ ] 🔨 Onboard the manual waitlist (names + phone numbers already collected) via SMS
- [ ] 🔨 Dynamic Open Graph metadata on slot detail routes via
      Next.js generateMetadata. Preview content state-aware per fill
      level per Partiful pattern. Tested by pasting a real slot URL
      into iMessage and WhatsApp and visually verifying the unfurl.
- [ ] 🔨 Share affordance on slot detail pages that emphasizes the
      sharer when they are a slot member ("Jordan is playing..." vs
      "Pickleball at..."). Player-as-voucher social proof per
      projectbrief.md.

**Checkpoint M6 — final retrospective:**
1. Did you build what you set out to build? Pivots: deliberate or accidental?
2. What did you underestimate? Write it down.
3. What would you cut if starting over?

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimating M3-M5 by 2-4× and getting demoralized | High | Milestones not weeks. Celebrate completion regardless of duration. |
| Matching algorithm produces bad squads | High | Build a tuning UI in M5 that shows why specific matches happened. |
| Supabase free tier limits hit during M5 realtime | Medium | Know limits before M5 starts. Plan upgrade path. |
| Scope creep ("just one more feature") delays launch | High | Anything not in this plan goes to icebox until M6 ships. |
| Losing motivation during M3-M4 setup grind | Medium-High | M2 should be visibly fun. If not, fix that first. |
| Multi-session drift between Code, Claude.ai, Gemini | Medium | Pre-commit hook handles worst case. Re-read `activeContext.md` at session start. |
| Secrets committed to GitHub | High if it happens | `.env.local` in `.gitignore`, verified at end of M3. RLS as defense in depth. |
| Build the app, nobody uses it | Real but mitigated | You already have a manual waitlist. Onboard them in M6. |
| Partiful pattern violated by a future scope decision (e.g. adding a login wall before slot view, requiring email, adding push-notification install prompt) | High — breaks density multiplier | Every scope decision checked against the V1 Design Pattern in projectbrief.md. Architect session enforces. |

---

## Icebox (not building yet)

Adding to this list is good — it means you noticed the temptation and resisted it.

- Push notifications
- Native mobile apps
- Multi-sport beyond pickleball (paintball, tennis, etc. — see D7 V2 vision)
- Tournament brackets, carpooling, equipment coordination
- Friend lists / social graph
- Ratings / reviews after sessions
- Recurring sessions
- Paid sessions
- Activity browse mode (deliberately removed 2026-04-12 — does not match brief; revisit only if matching engine fails to find product-market fit)
- **Play-reason matching** (observed 2026-04-18 from real play): players
  have different reasons for playing — practice / competitive / learn /
  social. Same skill level + different reason can produce a bad game.
  Owner decision 2026-04-18: slot-attribute model (owners publish slots
  with a play-reason tag, users filter). Deferred to v2 on
  density/liquidity grounds: any additional filter fractures the v1
  user base, and v1's dominant risk is empty slots, not mismatched
  reasons. Re-evaluate after launch data shows whether mismatched-
  reason pairings actually produce bad games at observable rates. If
  yes, write D9 and fold into slot schema; if no, keep in v2 polish bucket.
