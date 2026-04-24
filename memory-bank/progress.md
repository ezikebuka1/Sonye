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
- D7 onboarding form at `/onboarding` — 6 fields (willing_to_drive cut per D7.1), local state, submit navigates to /?onboarded=1 (2026-04-22)
- Group Lobby at `/group-lobby` — read-only lobby: header, commitment tracker (5/6), avatar stack, chat (3 messages), Leave stub (2026-04-23)
- Components: CommitmentTracker, MemberAvatarStack, ChatMessageList, LobbyHeader (2026-04-23)
- M1 Polish: willing_to_drive removed from in-app form (D7.1 amendment), lobby pb-24→pb-8 (2026-04-24)
- D1 decided: Zustand for client state (2026-04-24)
- M1 complete ✅

## Not Started ⏳
- Navigation wiring between pages (M2, depends on D1)
- Client state store (M2, depends on D1)

## Up Next
- M2: install Zustand, create src/lib/store.ts (user store), wire navigation
  between pages (onboarding → home, home → lobby), replace ?onboarded=1 hack
  with real store state. Depends on D1 ✅ and D5 (loading/error states, pending).

## Blockers
- None currently
