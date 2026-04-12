# Active Context

## Current State
M1 in progress — frontend skeleton. No backend, no auth, no API calls yet.

## What Exists
- Onboarding page (`/onboarding`) — ✅ Done
- Root page (`/`) — redirects to `/onboarding` (server-side redirect)

## What Does NOT Exist Yet
- Queue page (`/queue`) — not started. Was never built at this route. An activity-browse UI existed at `/` but did not match the M1 queue spec (no animated search state, no criteria chips, no cancel button). Deleted 2026-04-12 as part of drift cleanup.
- Group Lobby page (`/group-lobby`) — not started.
- Mock data module (`src/lib/mockData.ts`) — not started.
- Reusable components (`CommitmentTracker`, `ChatBubble`, `Avatar`, etc.) — not started.

## Current Focus
- Build queue page at `/queue` per M1 spec
- Then build group lobby page at `/group-lobby`

## Drift Cleanup (2026-04-12)
- Discovered memory bank claimed queue page was done, but `/queue` route never existed
- Activity-browse code at `/` deleted, replaced with redirect to `/onboarding`
- activeContext.md, progress.md, and CLAUDE.md corrected to match filesystem reality

## Decisions Made
- Using Next.js instead of Vite (already scaffolded)
- Claude Code + Cursor AI running simultaneously on same project
- Blue + Black design system chosen (blue-600 primary, black bg, gray-900 cards)