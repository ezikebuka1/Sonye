# Active Context

## Current State
M1 in progress — frontend skeleton. No backend, no auth, no API calls. D7 v1 product mechanics decided 2026-04-15; D8 design system approved 2026-04-17. Home screen shipped 2026-04-20.

## What Exists
- Home screen at `/` per Option A (greeting, hero, social proof, conditional onboarding banner, slot cards with 50% fill rule, bottom tab bar) — mock data only
- Mock data module at `src/lib/mockData.ts` with D7-aligned flat ID-referenced shapes and v2 breadcrumb fields
- Presentational components: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard, BottomTabBar
- D8 tokens wired into Tailwind v4 @theme in globals.css
- DM Sans + Instrument Serif wired via next/font in layout.tsx
- Old splash screen at `/onboarding` (misnamed — see "Known Issues" below)

## What Does NOT Exist Yet
- Real onboarding form at `/onboarding` per D7 7-field schema
- Group Lobby page at `/group-lobby`
- Navigation wiring between pages (arrives in M2 with D1)
- Client state store (arrives in M2 with D1)
- `CommitmentTracker`, `ChatBubble` components (needed for group lobby)

## Known Issues
- `/onboarding` is currently a splash screen, not the onboarding form it claims to be. Will be resolved when the D7 7-field form is built at `/onboarding` (next spec after home screen).

## Current Focus
Real onboarding form at `/onboarding` per D7 7-field schema. Home screen shipped 2026-04-20; current onboarding route is still the old splash and must be rebuilt next.

## Decisions Made
- Next.js App Router (already scaffolded; not Vite)
- Claude Code + Cursor AI running simultaneously on same project
- D8 design system: soft blue wash (#EEF4FA), warm coral accent (#D4724A), DM Sans + Instrument Serif italic (approved 2026-04-17)
- D7: slot-based v1 mechanics (see `decisions/D7-product-mechanics-v1.md`)
- Sketches Before Code rule effective 2026-04-15

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
