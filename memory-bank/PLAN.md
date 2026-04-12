# SquadUp — Project Plan

**One-line definition:** SquadUp is a frictionless group formation and coordination engine for casual sports — users input availability, skill, and location, and the system autonomously forms reliable critical-mass groups. Mobile-first PWA. Single location, few time frames at launch, by design, for liquidity density.

**Status:** M1 in progress. Drift cleanup completed 2026-04-12. Queue page is the next build task.

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
| D1 | 🏗️ State management (Zustand vs Context vs URL params vs server state) | M2 navigation | ⏳ pending |
| D2 | 🏗️ Anonymous vs authenticated onboarding flow | M4 auth | ⏳ pending |
| D3 | 🏗️ Database schema (relationships, foreign keys, queue state representation) | M3 backend | ⏳ pending |
| D4 | 🏗️ Matching algorithm (FCFS vs optimal, client vs edge function, immediate vs round-based) | M5 matching | ⏳ pending |
| D5 | 🏗️ Loading and error state design system | M2 onward | ⏳ pending |
| D6 | 🏗️ Realtime architecture (Supabase channels vs polling vs hybrid) | M5 realtime | ⏳ pending |

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

- [x] 🔨 Onboarding page at `/onboarding`
  - **Done when:** skill selector, radius slider, availability picker work; submit disabled until valid; renders correctly at 390px.
- [x] 🔨 Root route `/` redirects to `/onboarding`
  - **Done when:** server-side redirect, no UI, minimal implementation.
- [ ] 🔨 Queue page at `/queue`
  - **Done when:** animated radar pulse visible, scan text cycles, 3 criteria chips visible (hardcoded values OK with `// TODO: D1` comment), cancel button routes to `/onboarding`, demo skip button routes to `/group-lobby`, after 3.5s auto-routes to `/group-lobby`, `setTimeout` cleanup verified (no fire after navigation), renders correctly at 390px.
- [ ] 🔨 Group Lobby page at `/group-lobby`
  - **Done when:** displays mock session, location card, commitment tracker showing 3/4 filled, read-only chat with 3 mock messages, "commit to play" button (non-functional), renders correctly at 390px.
- [ ] 🔨 Mock data module at `src/lib/mockData.ts`
  - **Done when:** flat ID-referenced shapes for `users`, `locations`, `availabilitySlots`, `groupSessions`; pure helper functions; no mutation; matches architect blueprint.
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

**Checkpoint M4:**
1. Try to break your own auth. Guess URLs in a private window.
2. Is the "frictionless" promise from the brief still alive after auth landed?

---

## M5 — Matching & Realtime (the hard part)

**Depends on:** M4 complete, D4 made, D6 made.

**Goal:** the actual product. Users join a queue, get matched, lobby updates in realtime, chat works.

This milestone decides whether SquadUp is real. Don't rush. Note: liquidity density is by design — single location, few time frames — which means D4 can be much simpler than "optimal grouping over a giant pool." FCFS within skill+time may be enough for v1.

- [ ] 🏗️ D4 decision doc committed
- [ ] 🏗️ D6 decision doc committed
- [ ] 🔨 Matching algorithm implemented per D4
- [ ] 🔨 Queue → Lobby transition wired to real matching (replaces `setTimeout`)
- [ ] 🔨 Realtime queue updates
- [ ] 🔨 Write-capable group chat
- [ ] 🔨 Session lock-in logic (status → `locked` at capacity, members notified)
- [ ] 🧪 Two browser windows, two users, one queue, end-to-end match + chat
- [ ] 🧪 Stress test: 20 simulated users matched into valid sessions in <2s

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

---

## Icebox (not building yet)

Adding to this list is good — it means you noticed the temptation and resisted it.

- Push notifications
- Native mobile apps
- Multi-sport beyond basketball
- Tournament brackets, carpooling, equipment coordination
- Friend lists / social graph
- Ratings / reviews after sessions
- Recurring sessions
- Paid sessions
- Activity browse mode (deliberately removed 2026-04-12 — does not match brief; revisit only if matching engine fails to find product-market fit)
