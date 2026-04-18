# Progress

## Done ✅
- GitHub account created
- Cursor AI set up with plugins (Superpowers, Playwright, Context7)
- Claude Code set up
- Git configured and connected to GitHub
- Next.js project scaffolded
- Tailwind CSS v4 installed and configured
- Welcome/splash screen exists at `/onboarding` (NOTE: misnamed — not the actual onboarding form per D7. To be moved to `/` and replaced with the D7-spec form.)
- Root page (`/`) currently redirects to `/onboarding` (will be replaced when welcome screen moves here)
- Drift cleanup #1: removed activity-browse code, reconciled memory bank with filesystem (2026-04-12)
- Drift cleanup #2: identified `/onboarding` is splash-not-form; deferred fix into D7-aligned rebuild (2026-04-15)
- Husky pre-commit hook enforcing memory bank updates (2026-04-15)
- D7 product mechanics decision committed (2026-04-15)

## Not Started ⏳
- Home screen at `/` per Option A (merged welcome + slot browse, conditional onboarding banner)
- Real onboarding form at `/onboarding` (per D7 7-field schema)
- Group Lobby page (`/group-lobby`) — per D7 slot-fill model
- Mock data module (`src/lib/mockData.ts`) — per D7 schema
- Reusable components extraction
- Navigation between pages

## Up Next
- Home screen implementation at `/` per Option A (mock data + SlotCard + OnboardingBanner + greeting + hero + social proof + bottom tab bar)
- Then real onboarding form at `/onboarding` per D7 7-field schema
- Then Group Lobby at `/group-lobby`

## Blockers
- None currently