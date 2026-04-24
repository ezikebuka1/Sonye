# Active Context

## Current State
M1 in progress — frontend skeleton. No backend, no auth, no API calls. D7 v1 product mechanics decided 2026-04-15; D8 design system approved 2026-04-17. Home screen shipped 2026-04-20.

## What Exists
- Home screen at `/` per Option A (greeting, hero, social proof, conditional onboarding banner, slot cards with 50% fill rule, bottom tab bar) — mock data only
- Mock data module at `src/lib/mockData.ts` with D7-aligned flat ID-referenced shapes and v2 breadcrumb fields
- Presentational components: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard, BottomTabBar
- D8 tokens wired into Tailwind v4 @theme in globals.css
- DM Sans + Instrument Serif wired via next/font in layout.tsx
- D7 onboarding form at `/onboarding` capturing all 7 fields (name, phone, sport, skill_level, general_availability, preferred_venues, willing_to_drive); submit navigates to `/?onboarded=1` (M1 uses URL param demo toggle; real persistence in M3)
- Group Lobby at `/group-lobby` — read-only view of the seeded "forming" session: header with venue + neighborhood + day/time + skill badge, commitment tracker (5/6), member avatar stack, read-only chat with 3 seeded messages, non-functional Leave session button
- Seeded session + chat messages in mockData with consistency assertion between session.member_user_ids and slot.opted_in_user_ids

## What Does NOT Exist Yet
- Navigation wiring between pages (arrives in M2 with D1)
- Client state store (arrives in M2 with D1)

## Icebox
- **`src/app/queue/` empty directory** — leftover ghost from Drift Cleanup #1. Not
  wired, not referenced, not in the memory bank. Proposal: leave it as a route
  placeholder; `/queue` is a planned M-future page (CLAUDE.md). Observe for a week,
  then decide: keep as placeholder, scaffold stub, or delete. Do not act until
  deliberately decided. (2026-04-24)

## Current Focus
M1 complete (all three pages shipped, polished per checkpoint). D1 decided:
Zustand for client state. Next build: M2 navigation & client state wiring
per D1. D5 (loading/error states) still pending; can be decided once the
first async operation in M2 needs a loading state.

## Decisions Made
- Next.js App Router (already scaffolded; not Vite)
- Claude Code + Cursor AI running simultaneously on same project
- D8 design system: soft blue wash (#EEF4FA), warm coral accent (#D4724A), DM Sans + Instrument Serif italic (approved 2026-04-17)
- D7: slot-based v1 mechanics (see `decisions/D7-product-mechanics-v1.md`)
- Sketches Before Code rule effective 2026-04-15

## Known Environment Quirks
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

## Known M1 Shortcuts

These are intentional deferrals, not bugs. Each has a documented owner milestone.

- **"Hey Jordan" hardcode on the home screen.** The `?onboarded=1` demo
  toggle returns a user with a hardcoded name. The onboarding form
  captures a real name and logs it, but that name does not thread to
  the home screen. Real name flow requires persistence — lands in M3
  with Supabase. Do not demo to external eyes without flagging.
- **`onJoin` is a console.log stub.** Tapping "Join game" on the home
  screen does not navigate or mutate state. Wires in M2 with D1.
- **"Leave session" button is a console.log stub.** Cancellation reason
  prompt lands in M5 per D7.
- **`/group-lobby` has no entry point from `/`.** Direct URL only at M1.
  Real navigation (join slot → lock at capacity → lobby) wires in M5.

## History

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
