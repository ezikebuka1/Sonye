# Active Context

## Current State
M2 complete — onJoin wired with optimistic Zustand state, Toast/D5 landed 2026-04-28. Post-ship iOS fix: `type="button"` audit across all `<button>` elements + WebKit Playwright project added (2026-04-28). No backend, no auth, no API calls. D7 v1 product mechanics decided 2026-04-15; D8 design system approved 2026-04-17.

## What Exists
- Home screen at `/` per Option A (greeting, hero, social proof, conditional onboarding banner, slot cards with 50% fill rule, bottom tab bar) — mock data only
- Mock data module at `src/lib/mockData.ts` with D7-aligned flat ID-referenced shapes and v2 breadcrumb fields; includes `seedUser` named export (demo identity for ?onboarded=1 toggle)
- Zustand store at `src/lib/store.ts` — `useAppStore` with `currentUser`, `setUser`, `clearUser`; in-memory only (intentional at M2.1; persistence in M3)
- Zustand store extended (M2.2): slots slice (`Record<string, Slot>`, initialized from `mockData.initialSlots`), `joinSlot` action (optimistic update + 600ms simulated async + rollback), toast slice (single visible toast, replace-not-queue)
- Toast component at `src/components/Toast.tsx` — top-of-viewport, slide-down, auto-dismiss 5s, error/success variants
- D5 minimal pattern: toast only at M2.2; skeleton/spinner deferred to M3
- Presentational components: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard (M2.2: isJoined/isFull/fillCount + JoinedButton + SocialProofBlock 200ms fade-in), BottomTabBar, Toast
- All `<button>` elements across src/ carry explicit `type="button"` (10 instances across 6 files); HTML default `type="submit"` eliminated as an iOS Safari hazard
- Playwright: both `chromium` (Desktop Chrome) and `webkit-iphone` (iPhone 14) projects; 24 tests total (12 per engine)
- D8 tokens wired into Tailwind v4 @theme in globals.css
- DM Sans + Instrument Serif wired via next/font in layout.tsx
- D7 onboarding form at `/onboarding` capturing all 7 fields (name, phone, sport, skill_level, general_availability, preferred_venues, willing_to_drive); submit navigates to `/?onboarded=1` (M1 uses URL param demo toggle; real persistence in M3)
- Group Lobby at `/group-lobby` — read-only view of the seeded "forming" session: header with venue + neighborhood + day/time + skill badge, commitment tracker (5/6), member avatar stack, read-only chat with 3 seeded messages, non-functional Leave session button
- Seeded session + chat messages in mockData with consistency assertion between session.member_user_ids and slot.opted_in_user_ids

## What Does NOT Exist Yet
- Persistence (store is in-memory only; localStorage/Supabase in M3)
- Real backend/Supabase (M3)
- Auth flow (M4, D2 decision pending)

## Icebox
- **`src/app/queue/` empty directory** — leftover ghost from Drift Cleanup #1. Not
  wired, not referenced, not in the memory bank. Proposal: leave it as a route
  placeholder; `/queue` is a planned M-future page (CLAUDE.md). Observe for a week,
  then decide: keep as placeholder, scaffold stub, or delete. Do not act until
  deliberately decided. (2026-04-24)

## Current Focus
M2 complete. D1 (Zustand) and D5 (minimal toast) both decided and implemented.
Next: M3 — Supabase backend. D3 (database schema) decision must be made first,
then D2 (auth flow) before M4. Real persistence replaces in-memory store.

## Decisions Made
- Next.js App Router (already scaffolded; not Vite)
- Claude Code + Cursor AI running simultaneously on same project
- D8 design system: soft blue wash (#EEF4FA), warm coral accent (#D4724A), DM Sans + Instrument Serif italic (approved 2026-04-17)
- D7: slot-based v1 mechanics (see `decisions/D7-product-mechanics-v1.md`)
- Sketches Before Code rule effective 2026-04-15
- D5 (loading/error states): minimal toast pattern only; decided 2026-04-28 (see `decisions/D5-loading-error-states.md`)

## Known Shortcuts / Deferrals

These are intentional deferrals, not bugs. Each has a documented owner milestone.

- **"Leave session" button is a console.log stub.** Cancellation reason
  prompt lands in M5 per D7.
- **`/group-lobby` has no entry point from `/`.** Direct URL only at M1.
  Real navigation (join slot → lock at capacity → lobby) wires in M5.
- **Store is in-memory only.** Hard refresh wipes currentUser. Intentional
  at M2.1 — real persistence (Supabase) lands in M3.
- **BottomTabBar tab clicks are no-ops.** Squad and Profile routes don't exist yet; navigation wires when they do.
- **iOS device bug: root cause unconfirmed.** `type="button"` audit shipped
  as defensive hardening after "Join button does nothing on real iPhone"
  report. Playwright WebKit does not reproduce the failure (WebKit passes
  with and without `type="button"`). Diagnostic step (a) — `console.log`
  in onJoin handler, observed via Safari Web Inspector on device — still
  needed to confirm whether the handler fires at all. If it fires and
  nothing updates, the Zustand re-render path on iOS is the next suspect.
  If it does not fire, the root cause is at the DOM/compositor level and
  requires deeper device debugging. Re-test on device after shipping this
  commit.

## Known Environment Quirks
- **Next.js dev server HMR WebSocket — device testing.** `npm run dev`
  binds its HMR WebSocket to `localhost` only. An iPhone on the same
  wifi receives the static HTML but React never hydrates — every button
  appears completely dead, native `<input>` fields still work. Root
  cause: `ws://192.168.1.247:3000/_next/webpack-hmr` connection refused.
  **Device verification must use the production build:**
  ```
  npm run build && npm run start
  ```
  This is a Next.js dev-server quirk, not a SquadUp issue. Discovered
  2026-05-01 during M2.2 bug investigation Round 2.
- User-global Claude Code plugin `claude-plugins-official/security-guidance`
  fires a PreToolUse hook on any Write/Edit containing the substring
  "pickle" — which false-positives on SquadUp's "pickleball" sport enum.
  The hook fires once per file per session, then self-silences. Protocol
  for Code: acknowledge the warning in chat, retry the Write (succeeds on
  retry), fall back to Bash heredoc only if retry fails. Do not bypass
  silently. Plugin is not a SquadUp concern — SquadUp repo is clean.
  Upstream fix is a word-boundary regex; file-able when convenient.
- Shell command substitution (`$(...)`) is blocked by a terminal guard with
  message `Contains command_substitution`. Protocol: use pipes, xargs,
  or two-step commands instead. E.g. instead of `kill $(lsof -ti :3000)`,
  use `lsof -ti :3000 | xargs kill` or `npx kill-port 3000`. Source of the
  guard not yet investigated; not a SquadUp concern.

## History

### 2026-05-01 — D9 Decided: Concurrent Join Policy
- One Joined slot per calendar day; unlock via M5 leave (with reason capture) or
  match completion (attended/no-show). Cross-day multi-join unrestricted.
- Same-day collision surfaces error-variant toast per D5 pattern:
  "You're already in a game today. Leave that one or complete it to join another."
- Blocks D3 schema design (needs `attended`, `left_at`, `leave_reason` on membership
  records; composite index on user_id + slot_date + left_at + attended).
- Provisional for v1; revisit after 30 days of real M5+ data.
- Inline-switch affordance (option C) deferred; amendment trigger: "Switching to
  another game" dominant in leave-reason data.
- Decision doc at `memory-bank/decisions/D9-concurrent-join-policy.md`

### 2026-04-28 — Post-M2.2 iOS Bug Fix + WebKit Coverage
- `type="button"` audit: all 10 `<button>` elements across 6 files now carry explicit
  `type` attribute; HTML default `type="submit"` eliminated as an iOS Safari hazard
- Files touched: SlotCard, Toast, OnboardingBanner, LobbyHeader, GroupLobbyClient,
  onboarding/page.tsx
- `playwright.config.ts`: added `webkit-iphone` project (`devices['iPhone 14']`);
  existing m2.1 + m2.2 specs now run against both engines (24 tests total)
- WebKit binary installed: Playwright WebKit 26.4
- **Deliberate-regression proof INCONCLUSIVE**: Playwright WebKit does not simulate
  the specific iOS Safari touch pipeline that caused the real-device failure.
  With `type="button"` removed from Join button, WebKit still passes 7/7. The
  `type="button"` change ships as defensive hardening, not confirmed root cause.
  Root cause still requires diagnostic step (a) on real device (console.log in
  onJoin handler via Safari Web Inspector).

### 2026-04-28 — M2.2 Shipped: onJoin Wiring + Optimistic State + Minimal D5
- `useAppStore` extended: slots slice, `joinSlot` (optimistic + rollback), toast slice
- SlotCard: `isJoined`/`isFull`/`fillCount` props; `JoinedButton`; `SocialProofBlock` (200ms fade-in)
- Toast: slide-down, 5s auto-dismiss, backdrop-tap, error/success variants
- HomeClient rewired: reads store slots, resolves per-slot state, dispatches `joinSlot`, renders Toast
- Unauthenticated Join tap routes to `/onboarding` (M4 D2 revisits with SMS OTP)
- D5 decided: minimal toast scope; D5 doc at `memory-bank/decisions/D5-loading-error-states.md`
- M2.2 E2E: 7 tests in `e2e/m2.2-join.spec.ts`; AC5 uses pushState+popstate (proven pattern from M2.1); toast selector uses `:not(#__next-route-announcer__)` to exclude Next.js internal element
- M2 complete. Up Next: M3 (Supabase backend, D3 decision first)

### 2026-04-27 — M2.1 E2E Suite Landed
- Playwright installed (`@playwright/test`); `playwright.config.ts` at project root (Chromium-only, webServer auto-start)
- `e2e/m2.1-store.spec.ts`: five tests encoding AC1–AC5; AC5 uses pushState+popstate (not page.goto) to preserve Zustand store across URL change
- `data-testid="onboarding-banner"` added to OnboardingBanner root button for stable test selection
- `npm run test:e2e` added; suite runs in ~6 s
- Deliberate-regression confirmed via committed suite: AC5 fails when `currentUser === null` guard commented out (Alex → Jordan), passes when restored

### 2026-04-25 — M2.1 Shipped: Zustand Store + Name Threading
- zustand installed; `src/lib/store.ts` created with `useAppStore` (currentUser, setUser, clearUser)
- `seedUser` named export added to `mockData.ts` — single source of truth for the demo identity
- Onboarding submit now calls `useAppStore.getState().setUser(user)` and navigates to `/` (no ?onboarded=1)
- HomeClient rewritten to read `currentUser` from store; greeting and banner keyed on store state
- `?onboarded=1` preserved as dev-only demo toggle (useEffect seeds store from seedUser if store is empty)
- "Hey Jordan" hardcode retired — submitted name threads to the home greeting
- `src/app/page.tsx` simplified (no longer reads searchParams server-side)
- M2.1 closes. Next: M2.2 (onJoin slot interaction wiring)

### 2026-04-12 — Drift Cleanup #1
- Memory bank claimed queue page was done; `/queue` route never existed
- Activity-browse code at `/` deleted, replaced with redirect to `/onboarding`
- activeContext.md, progress.md, CLAUDE.md corrected to match filesystem
- PLAN.md rewritten from week-based to milestone-based plan with decisions register (M0-M6)

### 2026-04-15 — Infrastructure & Strategy Day
- Husky pre-commit hook installed to enforce memory bank updates on `src/` changes
- Drift Cleanup #2: identified `/onboarding` is splash-not-form; fix deferred into D7-aligned rebuild
- D7 product mechanics decision committed (`8283f18`): slot-based v1, group size 6, manual curation, 7-field onboarding schema, pre-seed waitlist import, v2 breadcrumbs
- Memory bank aligned to D7 across projectbrief.md, systemPatterns.md, progress.md, PLAN.md (`f3244d5`)
- Sketches Before Code rule added to systemPatterns.md

### 2026-04-15 — Follow-up reconciliation
- This file (activeContext.md) reconciled: previously had split-brain content (top sections pre-D7, bottom sections post-D7). Top now matches bottom.
- PLAN.md status line corrected (no longer says "queue page is next build task")

### 2026-04-17 — D8 Design System Approved
- Aesthetic pivot from blue+black to "Pickup Ready" direction: soft blue wash background, warm coral accent, DM Sans + Instrument Serif italic
- Approved via sketch iteration in architect session (3 rounds)
- 50% fill threshold rule: slot cards show player count/avatars only when ≥50% capacity filled
- CLAUDE.md design system section updated to match D8

### 2026-04-18 — Memory Bank Reconciliation (Drift Cleanup #3)
- systemPatterns.md Color System updated from old blue+black tokens to D8 tokens
- activeContext.md "What Does NOT Exist Yet" consolidated: welcome + home merged into single Option A home screen
- activeContext.md "Current Focus" updated from aesthetic conversation (done) to home screen implementation spec
- progress.md "Up Next" updated to point at home screen implementation
- PLAN.md M1 consolidated: welcome screen and home screen unified per Option A

### 2026-04-20 — Post-ship fixes (smoke test)
- SlotCard: `hover:bg-[#B85D3A]` replaced with `hover:bg-coral-dark`; added `--color-coral-dark` token to globals.css @theme
- SlotCard: removed `import type ... from mockData`; SkillLevel now local type; zero mockData references in src/components/

### 2026-04-20 — Home Screen Shipped (Option A)
- src/app/page.tsx replaced: redirect removed, home screen composition landed
- src/lib/mockData.ts created with D7 shapes + v2 breadcrumb fields (creation_mode, sport, willing_to_drive)
- Six presentational components added under src/components/: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard, BottomTabBar
- D8 tokens wired as Tailwind v4 @theme inline in globals.css; dark mode block removed (D8 is light-only)
- DM Sans + Instrument Serif wired via next/font/google in layout.tsx; Geist removed
- 50% fill rule implemented in SlotCard (showSocialProof conditional)
- Onboarding banner conditional on currentUser.onboarded; ?onboarded=1 URL override for demos
- onJoin callbacks stubbed with console.log + TODO: D1 comment — wired in M2
- lucide-react installed for icons

### 2026-04-24 — M1 Polish (Spec #4.7)
- `willing_to_drive` removed from in-app onboarding form; D7.1 amendment
  appended to D7 doc. Schema unchanged — field stays on User type in mockData,
  collected via Waitlist Intake Script only in v1. Form is now 6 visible fields.
- Group Lobby `pb-24` → `pb-8`; removes ~200px dead whitespace below
  "Leave session" (lobby has no BottomTabBar, so tab-bar padding was wrong)
- progress.md Up Next advanced to M2

### 2026-04-23 — Group Lobby Shipped (M1 complete)
- src/app/group-lobby/page.tsx + GroupLobbyClient.tsx: read-only lobby view
- src/lib/mockData.ts extended: SessionMessage type, one seeded session
  (forming, 5/6 per PLAN.md), three seeded messages, four new pure helpers,
  dev-only consistency assertion between session members and slot opt-ins
- Four new components: CommitmentTracker, MemberAvatarStack, ChatMessageList, LobbyHeader
- assertSeedConsistency called on mount in both HomeClient and GroupLobbyClient
- Known Environment Quirks extended with shell substitution guard note
- New "Known M1 Shortcuts" section documenting "Hey Jordan" hardcode,
  onJoin stub, Leave session stub, and lobby-has-no-entry-point
- All three M1 pages now exist. Remaining M1 work: review + screenshot
  verification per PLAN.md. M1 Checkpoint next.

### 2026-04-18 — Real-User Feedback: Lobby/Profile Split + Realness Strategy
- Friend tested M1 on phone; raised "want to see who's in match" and
  "what about profile pictures?"
- Resolution: lobby/slot views show name + initial only (clean,
  scannable, Partiful-aligned); user profiles (M3+) surface richer
  detail (skill, games-played, preferred venues, member-since) on tap.
  Progressive disclosure pattern.
- Profile pictures iceboxed with full reasoning + reconsideration
  trigger (~500 active users in metro).
- New section in projectbrief.md: V1 Realness Strategy — captures the
  cheap-or-free signals that establish real-person credibility without
  density tax (first names, human chat, avatar variance, member-since,
  games-played, last-played, SMS-verified badge). Density itself
  named as the strongest structural realness move.
- PLAN.md milestones M3-M5 updated with realness-strategy acceptance
  criteria. Profile route at /profile/[userId] explicitly added to M5.
- Second principled scope deferral via density principle (first was
  play-reason matching). Pattern is holding.

### 2026-04-18 — Partiful Pattern Captured as V1 Design Principle
- Architect discussion with Gemini surfaced Partiful's frictionless
  group-chat-to-on-the-list model as the right v1 sharing pattern
- Captured in projectbrief.md as "V1 Design Pattern: The Partiful
  Model" — companion to the density principle
- PLAN.md milestones M3-M6 updated with Partiful-derived acceptance
  criteria (anonymous reads, SMS OTP only, onboarding-at-Join,
  OG metadata, player-as-voucher sharing, SMS notifications)
- Risk Register updated with "Partiful pattern violated" entry
- Implementation deferred to M3+ (requires real backend). No code
  changes in this commit.
- D2 (auth decision, M4-blocking) now has a sharper frame: Model A
  (lightweight-join-with-later-profiling) vs Model B (onboarding-at-
  Join). To be resolved when D2 is written.

### 2026-04-18 — D1 Decided: Zustand
- Four options evaluated (React Context, Zustand, URL params, server state)
- Zustand chosen: scale-fit, mobile performance, cross-milestone durability,
  low blast radius, boring-and-proven
- Decision doc at memory-bank/decisions/D1-state-management.md
- Not implemented yet — install and first store land in first M2 commit
- PLAN.md decisions register updated to reflect ✅ decided

### 2026-04-18 — Play-reason icebox + density principle captured
- Play-reason matching proposal (observed from real play) deferred to v2 on
  density/liquidity grounds; slot-attribute design direction recorded
  alongside the deferral for post-launch reconsideration
- V1 Decision Principle articulated in projectbrief.md: density and
  liquidity trump all other v1 optimizations; filters/segmentation
  default to icebox
- systemPatterns.md: V1 Scope Discipline process pattern added

### 2026-04-22 — Onboarding Form Shipped
- src/app/onboarding/page.tsx replaced: ABCD splash deleted, D7 7-field form landed
- Form state local (useState); submit routes to /?onboarded=1 (M1 demo toggle; M3 wires real persistence)
- Validation: native + computed isValid; submit disabled until name/phone/skill/availability/≥1 venue set
- willing_to_drive collected per D7 but not gated (optional at M1)
- D8 amendment: coral-dark (#B85D3A) documented as hover/active token (already in globals.css from post-ship fix)
- Pickle hook findings documented under new "Known Environment Quirks" section
