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

## Amendment — Phase 4 Dispatch 2 (Home join wiring, 2026-06-15)

Real `join_slot` calls now drive toasts from the Home feed. No new tokens —
the error `#D64B4B` / success `#4BAE78` variants already exist (D8.2). New copy:

| Case | Copy | Action | Variant |
|------|------|--------|---------|
| Slot cancelled mid-tap | That game was cancelled | (none) | error |
| One-game-per-day collision (D9) | You're already in a game today. Leave that one or complete it to join another. | (none) | error |

The JOINED outcome is intentionally toast-less — the action `redirect()`s to
`/group-lobby`, and the lobby IS the confirmation (D2 Amdt B). The waitlist
string is unchanged from M2.2.

### Punctuation nuance (the rule these two strings establish)

- **Single-clause toast → NO trailing period.** "That game was cancelled" is
  sentence case (capital first), one statement, no period — matching the M2.2
  tone ("no trailing period") and the bare-statement waitlist string.
- **Multi-clause toast → keep grammatical punctuation.** The D9 collision
  string is two sentences (sentence-break period after "today") plus a
  two-option clause joined on "or", so it keeps both its internal period and
  its terminal period. Dropping them would garble a two-sentence instruction.

So "no trailing period" is the default for atomic feedback; punctuation
returns the moment the copy carries more than one clause/sentence.
