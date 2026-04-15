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
- PLAN.md rewritten from week-based format to milestone-based plan with decisions register (M0-M6)
- PLAN.md refined 2026-04-12: tightened one-line definition (casual sports, PWA, liquidity density), added queue spec details (radar pulse, scan text, criteria chips with TODO:D1), added CriteriaChip to components list, added waitlist onboarding to M6, added activity-browse to icebox

## 2026-04-15 — D7 Committed
v1 product mechanics formally specified in memory-bank/decisions/D7-product-mechanics-v1.md.
Key points:
- V1 = manually curated recurring slots + opt-in (slot-based matching)
- Group size: 6 (absorbs 1-2 flakes)
- Onboarding schema: 7 fields incl. venue multi-select (Cole/Churchill/Fretz Park) and willing-to-drive
- Waitlist import via pre-seeded accounts + magic claim link at launch
- V2 features (Play Now, multi-sport, automation) explicitly deferred
- Cascading slot logic deliberately cut for v1 — owner manages manually for first month
- New rule: design proposals come as sketches before code (architect session enforces)

This decision supersedes original blueprint assumptions about radius slider,
specific time slot picker, and real-time autonomous matching as v1 features.

## Decisions Made
- Using Next.js instead of Vite (already scaffolded)
- Claude Code + Cursor AI running simultaneously on same project
- Blue + Black design system chosen (blue-600 primary, black bg, gray-900 cards)