# SquadUp — Project Plan

**One-line definition:** SquadUp is a frictionless group formation and coordination engine for casual activities — match users into squads by skill, location, and availability, then coordinate them through to the activity.

**Status:** M1 in progress. Drift cleanup completed 2026-04-12 — activity-browse code at `/` removed, root now redirects to `/onboarding`. Queue page at `/queue` is the next build task. M0 decisions D1-D6 still pending — see Decisions section.

**How to read this plan:**
- Milestones, not weeks. Order matters; duration doesn't. Don't estimate dates.
- Every task has a "done when" line. If you can't tell whether a task is done, it isn't.
- Three kinds of items: build architecture decision (needs design before implementation), build implementation task (can hand straight to Code), test verification (must be tested, not assumed).
- After each milestone, do the Checkpoint at the bottom of that section. Don't skip checkpoints — they're the highest-leverage hours in the project.

---

## Decisions Register (M0)

These are the architectural decisions that shape everything downstream. Make them deliberately, in order, before the milestone that depends on them. If you skip ahead and build on an unmade decision, you'll refactor later.

| # | Decision | Depends on | Blocks | Status |
|---|----------|------------|--------|--------|
| D1 | State management approach (Zustand vs Context vs URL params vs server state) | nothing | M2 (navigation) | pending |
| D2 | Anonymous vs authenticated onboarding flow | nothing | M4 (auth) | pending |
| D3 | Database schema (relationships, foreign keys, how `committedUserIds` is stored) | mock data shape (done) | M3 (backend) | pending |
| D4 | Matching algorithm design (FCFS vs optimal grouping, client vs edge function vs cron, immediate vs round-based) | D3 | M5 (matching) | pending |
| D5 | Error and loading state design system (skeletons vs spinners, empty state visuals) | nothing | M2 onward | pending |
| D6 | Realtime architecture (Supabase channels vs polling vs hybrid) | D3, D4 | M5 (realtime) | pending |

**How decisions get made:** each decision becomes a short conversation with the architect session (Claude.ai), produces a one-page decision doc in `memory-bank/decisions/`, and only then becomes implementable. Do not implement against an unmade decision.

---

## M0 — Foundation (complete)

Done. Captured here for completeness.

- [x] GitHub repo created and first commit pushed
- [x] Dev environment installed (Cursor, Git, Node, Next.js, Tailwind, TypeScript)
- [x] Memory bank scaffolded with five canonical files
- [x] `CLAUDE.md` configured with project context, design system, and Memory Bank Protocol
- [x] `AGENTS.md` configured to guard against stale Next.js API hallucinations
- [x] Husky pre-commit hook enforcing memory bank updates on `src/` changes
- [x] Multi-session protocol established (Claude Code as implementer, Claude.ai as architect, Gemini as third perspective)

**Done when:** all of the above are committed to GitHub and verifiable in the repo. (complete)

---

## M1 — Frontend Skeleton (in progress)

**Goal:** three mobile-first pages exist as routes, render with mock data, look like the app the user will eventually use. No backend, no auth, no realtime.

- [x] Onboarding page renders at `/onboarding`
  - **Done when:** skill selector, radius slider, and availability picker all work; submit button is disabled until at least one slot is selected; renders correctly on a 390px viewport.
- [ ] Queue page renders at `/queue`
  - **Done when:** animated search state visible, criteria chips reflect mock preferences, cancel button visible, renders correctly at 390px.
- [ ] Group Lobby page renders at `/group-lobby`
  - **Done when:** displays mock session with location card, commitment tracker showing 3/4 filled, read-only chat with mock messages, "commit to play" button (non-functional), renders correctly at 390px.
- [ ] Mock data module exists at `src/lib/mockData.ts`
  - **Done when:** flat ID-referenced shapes for `users`, `locations`, `availabilitySlots`, `groupSessions`; pure helper functions (`getUser`, `getLocation`, `getSlot`); no mutation; matches the architectural blueprint from the architect session.
- [ ] Reusable components extracted: `CommitmentTracker`, `ChatBubble`, `Avatar`, `PrimaryButton`, `SecondaryButton`, `Badge`
  - **Done when:** components live in `src/components/`, take props per the prop contracts in the architect's blueprint, are reused across at least two pages where applicable, and contain no business logic.
- [ ] All three pages tested manually at 390px width in browser devtools
  - **Done when:** screenshots captured of each page at 390px, no horizontal scroll, no broken layouts, tap targets are at least 44px tall.

**Checkpoint M1 — read before proceeding to M2:**
1. Re-read `memory-bank/projectbrief.md`. Is the one-line definition still accurate?
2. Look at the three pages side by side. Do they feel like one product or three pages? If three, the design system needs tightening before more pages get added.
3. Have the three hidden decisions D1, D2, D5 been made yet? If not, M2 cannot start. Stop and make them.
4. Is `activeContext.md` up to date with what was actually built vs what's in this plan? Reconcile any drift before moving on.

---

## M2 — Navigation & Client State

**Depends on:** M1 complete, D1 made (state management), D5 made (loading/error states).

**Goal:** the three pages are no longer islands. A user can flow from Onboarding -> Queue -> Group Lobby with their preferences carried through, and back out. No backend yet — state lives in the chosen client store.

- [ ] D1 decision doc written and committed to `memory-bank/decisions/D1-state-management.md`
- [ ] Client state store implemented (Zustand or whatever D1 picked)
  - **Done when:** preferences object survives navigation between routes, has TypeScript types, exposes a clean API (`setPreferences`, `clearPreferences`).
- [ ] `router.push()` wiring between pages
  - **Done when:** Onboarding submit goes to Queue, Queue auto-transitions to Group Lobby after 3.5s with `setTimeout` cleanup in `useEffect`, Cancel from Queue returns to Onboarding, Start Over from Group Lobby returns to Onboarding.
- [ ] "Demo skip wait" affordance on Queue page
  - **Done when:** small low-contrast button bypasses the timer, useful for stakeholder demos and developer iteration.
- [ ] Loading state component built per D5 decision
  - **Done when:** reusable `<LoadingState />` exists, has a clear visual identity, used in at least one place.
- [ ] Empty state component built per D5 decision
  - **Done when:** reusable `<EmptyState />` exists, takes a message and optional action prop, used in at least one place.
- [ ] Manual end-to-end flow test
  - **Done when:** user can complete Onboarding -> Queue -> Group Lobby and the preferences shown in Queue match what was selected in Onboarding.
- [ ] Cleanup test
  - **Done when:** user can hit Cancel on Queue mid-timer and the auto-transition does NOT fire after they've left the page (this catches the most common `setTimeout` bug).

**Checkpoint M2:**
1. Does the flow feel frictionless on a real phone (not just devtools)? If you don't have it deployed yet, run `npm run dev` and open the local URL on your actual phone over your local network.
2. Are there any moments where the user would be confused about what's happening? Loading states the right length? Transitions abrupt?
3. Update `memory-bank/activeContext.md` with the navigation pattern decided so future sessions know.

---

## M3 — Backend Foundation

**Depends on:** M2 complete, D3 made (database schema).

**Goal:** Supabase is connected. Real data flows in and out of the three pages. Mock data is gone.

- [ ] D3 decision doc written and committed to `memory-bank/decisions/D3-database-schema.md`
  - Must include: full ER diagram, foreign key definitions, decision on `committedUserIds` (join table vs Postgres array), how "currently in queue" state is represented, indexes on commonly queried fields.
- [ ] Supabase project created
  - **Done when:** project URL and anon key stored in `.env.local` (never committed), `.env.example` committed showing required variables, `.gitignore` updated.
- [ ] Database tables created per D3
  - **Done when:** all tables exist in Supabase, foreign keys enforced, row-level security policies stubbed (even if permissive for now — "no RLS" is a footgun, "permissive RLS" is honest).
- [ ] Supabase client wired into Next.js
  - **Done when:** `src/lib/supabase.ts` exports a typed client, used by at least one page to fetch real data.
- [ ] Seed script for development data
  - **Done when:** `npm run seed` populates the database with the same shapes that were in `mockData.ts`, so development feels the same as the prototype.
- [ ] Replace mock data calls with real Supabase queries on all three pages
  - **Done when:** `mockData.ts` is deleted (or kept only for tests), all pages render from Supabase, loading states fire during fetches.
- [ ] Verify on a fresh clone
  - **Done when:** another developer (or you on a different machine) can clone the repo, set up `.env.local`, run `npm run seed && npm run dev`, and see the app working.

**Checkpoint M3:**
1. Is the database schema something you'd be proud to show another engineer? If not, refactor before adding auth on top of it.
2. Are queries efficient or are you fetching whole tables on every page load? Add indexes where needed.
3. **Critical:** is `.env.local` definitely in `.gitignore`? Verify with `git check-ignore .env.local`. If you've already committed secrets, rotate them now.

---

## M4 — Authentication

**Depends on:** M3 complete, D2 made (anonymous vs authenticated onboarding).

**Goal:** users have accounts. Pages know who's looking at them. The decision from D2 has been implemented.

- [ ] D2 decision doc committed to `memory-bank/decisions/D2-auth-flow.md`
  - Must answer: when does login happen relative to onboarding? What happens to anonymous preferences? Email/password or magic link or OAuth (and if OAuth, which providers)?
- [ ] Supabase Auth integrated
  - **Done when:** signup, login, logout all work end-to-end.
- [ ] Protected route wrapper implemented
  - **Done when:** unauthenticated users hitting a protected page get redirected (or shown a login prompt — per D2).
- [ ] User profile page exists and is editable
  - **Done when:** user can view and update their skill level, default location, and display name.
- [ ] Onboarding flow handles the auth transition per D2
  - **Done when:** the case D2 specifies (anonymous -> account creation, or login-first, or whatever) actually works without losing the user's selections.
- [ ] Row-level security policies tightened
  - **Done when:** users can only read/write their own data and the sessions they're a member of. Test by trying to read someone else's data with a different account — should fail.
- [ ] Auth edge cases tested
  - **Done when:** verified: expired session -> redirect, password reset flow works, logout actually clears state, two browser tabs stay in sync.

**Checkpoint M4:**
1. Try to break your own auth. Open the app in a private window and try to access protected routes by guessing URLs. Try to access another user's data via the Supabase client.
2. Is the friction the brief promised ("no friction") still present after auth was added? If not, that's a product problem, not an engineering problem — and it deserves a real conversation, not a checkbox.

---

## M5 — Matching & Realtime (the hard part)

**Depends on:** M4 complete, D4 made (matching algorithm), D6 made (realtime architecture).

**Goal:** the actual reason this app exists. Users join a queue. The system matches them. Group Lobby updates in realtime as players commit.

This is the milestone that decides whether SquadUp is a real product or a portfolio piece. Take it seriously. Don't rush.

- [ ] D4 decision doc committed to `memory-bank/decisions/D4-matching-algorithm.md`
  - Must answer: matching strategy (FCFS, optimal, hybrid), where it runs (client/edge function/cron), trigger model (immediate/round-based), how to handle the "almost full but stuck" case, how to handle skill-level boundaries (does an intermediate match with an advanced if no other options?).
- [ ] D6 decision doc committed to `memory-bank/decisions/D6-realtime-architecture.md`
  - Must answer: Supabase channels vs polling, fallback strategy if realtime fails, how to handle reconnection.
- [ ] Matching algorithm implemented per D4
  - **Done when:** given a populated queue, the algorithm produces valid `GroupSession` rows that satisfy the skill+radius+availability constraints.
- [ ] Queue -> Lobby transition wired to real matching (replacing the `setTimeout`)
  - **Done when:** user joins queue, matching runs, user is placed in a real session and routed to Group Lobby.
- [ ] Realtime queue updates
  - **Done when:** Group Lobby updates live as other users commit/drop, no page refresh needed.
- [ ] Group chat (write-capable) implemented per D6
  - **Done when:** messages send, persist, and appear in other users' lobbies in realtime.
- [ ] Session lock-in logic
  - **Done when:** when commitment hits capacity, session status flips to `locked`, no more users can be added, all members get notified.
- [ ] Multi-user testing
  - **Done when:** two browser windows logged in as different users can join the same queue, get matched into the same session, and chat with each other in realtime.
- [ ] Stress test the matching algorithm
  - **Done when:** simulated queue with 20 users gets matched into valid sessions in under 2 seconds.

**Checkpoint M5:**
1. Read the matching decision doc again. Is the algorithm doing what users actually want, or what was easy to build? Be honest.
2. Have a friend use the app for real (not a demo). Watch them. Don't help. Note where they get stuck.
3. This is also the natural moment to re-read the project brief for the third time. Does what you've built match what you said you were building?

---

## M6 — Polish & Launch

**Depends on:** M5 complete.

**Goal:** the app is deployed, monitored, and ready for actual users.

- [ ] Deploy to Vercel
  - **Done when:** production URL works, environment variables set in Vercel dashboard, deploys triggered on push to main.
- [ ] README rewritten
  - **Done when:** explains what SquadUp is, how to run locally, links to architecture docs, mentions the multi-session memory bank protocol.
- [ ] Error tracking installed (Sentry, or even just a Supabase errors table)
  - **Done when:** unhandled errors in production are visible to you within 1 minute of occurring.
- [ ] Basic analytics
  - **Done when:** you can answer "how many users joined a queue in the last 24 hours" without guessing.
- [ ] Playwright tests for the three critical flows
  - **Done when:** Onboarding -> Queue -> Lobby flow has an automated test that runs in CI on every push.
- [ ] Mobile testing on real devices
  - **Done when:** tested on at least one iOS and one Android device. Not devtools.
- [ ] Loading and error states audited app-wide
  - **Done when:** every async operation has both a loading state and an error state. No "infinite spinners that never resolve."
- [ ] Empty states audited app-wide
  - **Done when:** every list has a designed empty state.
- [ ] Pre-launch checklist
  - **Done when:** privacy policy exists (Supabase has a template), terms of service exist, you've thought about what happens if the app gets posted somewhere and gets 1,000 signups in a day.

**Checkpoint M6 — final retrospective:**
1. Read the project brief one last time. Did you build what you set out to build? If you pivoted, was it deliberate or accidental?
2. What did you underestimate? Write it down. Future-you will need to know.
3. What would you cut if you started over? Write that down too.

---

## Risk Register

Things that could go wrong, in rough order of likelihood. Not solved — just named.

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimating M3/M4/M5 by 2-4x and getting demoralized | High — most beginner projects die here | Milestones not weeks. Celebrate completing each milestone regardless of duration. |
| Matching algorithm produces bad squads (uneven skill, too far apart) | High — kills the product value | Build a tuning UI in M5 that lets you inspect why specific matches happened. |
| Supabase free tier limits hit during M5 realtime work | Medium | Know the limits before M5 starts. Have a plan for upgrading or switching. |
| Scope creep ("just one more feature") delays launch indefinitely | High | Anything not in this plan goes in `memory-bank/icebox.md` and is not built until M6 ships. |
| Losing motivation in M3-M4 because it's "all setup" | Medium-High | M2 should be visibly fun. If it's not, fix that before starting M3. |
| Multi-session drift between Claude Code, Claude.ai, Gemini | Medium | Pre-commit hook handles the worst case. Re-read `activeContext.md` at the start of every session. |
| Secrets accidentally committed to GitHub | High if it happens | `.env.local` in `.gitignore`, verified with `git check-ignore` at end of M3. Use Supabase RLS as defense in depth. |
| You build the whole app and nobody uses it | Real but acceptable | Ship to a small group of friends in M6, not the public. Validate before scaling. |

---

## Icebox (not building yet)

Things that are tempting but explicitly out of scope until M6 ships. Adding to this list is good — it means you noticed the temptation and resisted it.

- Push notifications
- Native mobile apps
- Multi-sport support beyond basketball
- Tournament brackets
- Carpooling coordination
- Equipment-bringing coordination
- Friend lists / social graph
- Ratings / reviews after sessions
- Recurring sessions
- Paid sessions
