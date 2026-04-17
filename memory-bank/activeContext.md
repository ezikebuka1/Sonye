# Active Context

## Current State
M1 in progress — frontend skeleton. No backend, no auth, no API calls. D7 v1 product mechanics decided 2026-04-15; memory bank aligned to D7 same day.

## What Exists
- Welcome/splash screen at `/onboarding` (misnamed — see "Known Issues" below)
- Root page (`/`) redirects to `/onboarding` (placeholder; will be replaced when welcome moves to `/`)

## What Does NOT Exist Yet
- Welcome screen at `/` (splash must be moved here and redesigned per approved sketch)
- Real onboarding form at `/onboarding` per D7 7-field schema
- Home screen at `/` showing published slots per D7
- Group Lobby page at `/group-lobby`
- Mock data module at `src/lib/mockData.ts` per D7 schema
- Reusable components (`CommitmentTracker`, `ChatBubble`, `Avatar`, etc.)
- Navigation between pages

## Known Issues
- `/onboarding` is currently a splash screen, not the onboarding form it claims to be. Will be resolved by splitting into `/` (welcome) and `/onboarding` (form) per D7.

## Current Focus
Aesthetic direction conversation (words → sketch → approval → spec → Code) per the Sketches Before Code rule. Welcome screen is the first sketch deliverable.

## Decisions Made
- Next.js App Router (already scaffolded; not Vite)
- Claude Code + Cursor AI running simultaneously on same project
- Blue + Black design system (blue-600 primary, black bg, gray-900 cards) — **may be revised in the aesthetic conversation; not load-bearing**
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
