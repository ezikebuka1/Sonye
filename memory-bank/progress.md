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
- Welcome screen redesign + move to `/` (per D7 + sketches-before-code rule)
- Real onboarding form at `/onboarding` (per D7 7-field schema)
- Home screen (`/`) showing available slots — net new per D7
- Group Lobby page (`/group-lobby`) — per D7 slot-fill model
- Mock data module (`src/lib/mockData.ts`) — per D7 schema
- Reusable components extraction
- Navigation between pages

## Up Next
- Aesthetic direction conversation (words → sketch → approval → spec → Code)
- Welcome screen redesign as first sketch deliverable
- Then onboarding form, home screen, group lobby in sequence

## Blockers
- None currently