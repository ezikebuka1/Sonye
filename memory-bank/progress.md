# Progress

## Done ✅
- GitHub account created
- Cursor AI set up with plugins (Superpowers, Playwright, Context7)
- Claude Code set up
- Git configured and connected to GitHub
- Next.js project scaffolded
- Tailwind CSS v4 installed and configured
- Old splash screen at `/onboarding` (NOTE: misnamed — not the actual onboarding form per D7. Will be replaced with the D7 7-field form.)
- Root page (`/`) redirect (replaced by home screen 2026-04-20)
- Drift cleanup #1: removed activity-browse code, reconciled memory bank with filesystem (2026-04-12)
- Drift cleanup #2: identified `/onboarding` is splash-not-form; deferred fix into D7-aligned rebuild (2026-04-15)
- Husky pre-commit hook enforcing memory bank updates (2026-04-15)
- D7 product mechanics decision committed (2026-04-15)
- D8 design system approved and committed (2026-04-17)
- Home screen at `/` per Option A (greeting, hero, social proof, onboarding banner, slot cards, tab bar) — mock data (2026-04-20)
- Mock data module `src/lib/mockData.ts` with D7 shapes + v2 breadcrumb fields (2026-04-20)
- Presentational components: Greeting, HeroText, SocialProofStrip, OnboardingBanner, SlotCard, BottomTabBar (2026-04-20)
- D8 tokens wired into Tailwind v4 @theme; DM Sans + Instrument Serif via next/font (2026-04-20)

## Not Started ⏳
- Real onboarding form at `/onboarding` (per D7 7-field schema)
- Group Lobby page (`/group-lobby`) — per D7 slot-fill model
- Navigation wiring between pages (M2, depends on D1)
- Client state store (M2, depends on D1)
- `CommitmentTracker`, `ChatBubble` components (needed for group lobby)

## Up Next
- Real onboarding form at `/onboarding` per D7 7-field schema
- Then Group Lobby at `/group-lobby`
- Then M2: navigation wiring + client state (D1 decision first)

## Blockers
- None currently
