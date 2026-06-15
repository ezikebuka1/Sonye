# D8.2 — action colors (Home feed card buttons)

**Recorded:** 2026-06-15 (Phase 4 Dispatch 1)
**Status:** Locked. Action-color extension of D8.2; button states locked via the signed-off Dispatch-1 sketches + D13.
**Tokens live in:** `src/app/globals.css` (`@theme`). **Heading/filename use `D8_2`; D8.2 has no standalone visual-identity file (its identity lives in globals.css + `systemPatterns.md` + `D8-design-system.md`).**

## Action-color extension

The Home feed card CTA distinguishes a **primary** "get a seat" action from a **secondary** waitlist action:

| Role | Treatment | Token (globals.css) |
|---|---|---|
| **Primary action** — "Join game" (a seat is available) | coral bg `#EE5E00`, white text | `--color-cta` / `--color-coral` (`bg-coral text-white`) |
| **Secondary action** — "Join waitlist" (slot full) | sky bg `#8DBCF1`, **ink `#14304D` text** | `--color-sky` + `--color-ink` (`bg-sky text-ink`) |

**Why ink text on sky, not white:** white-on-`#8DBCF1` is ~1.8:1 — fails WCAG AA. Ink `#14304D`-on-sky passes comfortably. The secondary action is intentionally lower-urgency than coral (a waitlist seat ≠ a confirmed seat), so sky reads as "available but not the headline action."

**New copy locked:** `Join waitlist` (the full-slot CTA on the Home card).

## Status (non-action) treatments — for completeness

When the viewer already holds an active membership, the CTA area shows a **status**, not an action (no coral/sky):

| State | Treatment | Tokens |
|---|---|---|
| `joined` → **"In lobby"** | outlined: `#14304D` border + text, check + chevron, links to the lobby | `border-ink text-ink` |
| `waitlisted` → **"On the waitlist"** | muted pill: `#EEF2F8` bg + `#5E80A3` text, clock icon, links to the lobby | `bg-[#EEF2F8] text-steel` |

`#EEF2F8` is the only value here without a globals token (rendered as an arbitrary value); the other three (`#EE5E00`, `#8DBCF1`, `#14304D`, `#5E80A3`) are existing D8.2 tokens.

See `D13-phase4-player-surface-data-architecture.md` for the four-state button table this implements, and the Dispatch-1 sketches for the visual sign-off.
