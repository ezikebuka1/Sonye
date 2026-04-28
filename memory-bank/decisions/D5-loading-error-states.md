# D5 — Loading & Error States

**Status:** Decided 2026-04-28 (minimal-scope variant)
**Blocks:** None — continuous design system addition
**Related:** D8 (visual tokens), M2.2 (first async op needing this pattern)

## The Decision

V1 implements a minimal toast pattern for transient feedback on optimistic
operations and stub-success cases. Skeleton loaders, spinners, full-page
loading states, and long-running operation patterns are deferred until
concretely needed.

## What is in scope at M2.2

- One Toast component, two variants (error, success).
- Top-of-viewport position, 16px below safe area inset.
- Slide-down entry (200ms), auto-dismiss at 5s.
- Single visible toast; new toasts replace current (no queue).
- Tap backdrop or X to dismiss early.
- Two copy strings (see Copy register below).

## What is NOT in scope at M2.2

- Skeleton loaders for any state.
- Full-page or inline spinners.
- Network-error copy — M3 owns this when real network calls exist.
- Toast queueing.
- Toast position variants (top chosen; bottom reserved for tab bar).
- Severity levels beyond error/success.

## Copy register

| Case | Copy | Action | Variant |
|------|------|--------|---------|
| Optimistic op failed | Couldn't save that | Retry | error |
| Waitlist join confirmed | On the waitlist — we'll text you | (none) | success |

Tone: contractions, lowercase mid-sentence, no trailing period.

## Token note

Success green #88D7A0 is hardcoded in Toast.tsx — no D8 token exists yet.
Add --color-success to globals.css @theme when a second success-green
use case appears. Single-use hardcode is correct at M2.2.

## Why minimal

The risk of writing a full async-state taxonomy at M2.2 is paying design
cost for states we do not have yet. The minimal toast covers M2.2's actual
surface area; future patterns are added as amendments when their need is
concrete.

## When to revisit

- M3: real Supabase calls need network error copy and skeleton patterns.
- Any op exceeding ~1s perceived latency needs a spinner.
- Five or more simultaneous toast variants in-app need queueing.
