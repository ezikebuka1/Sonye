# D8.1a — "Prefer not to say" / NULL avatars resolve to blue

Status: Locked 2026-06-14
Amends: D8.1 (avatar palette), D7.3 (optional gender field)

## Locked mapping (the only correct one)

- woman              → PINK family
- man                → BLUE family
- non_binary         → GREEN family
- prefer_not_to_say  → BLUE family
- NULL / undefined / other → BLUE family

Net: woman → pink, non_binary → green, everything else → blue. Green
appears ONLY for an explicit non-binary selection.

Finalized family hexes (bg), live in `src/lib/avatar.ts`:
- BLUE  #8DBCF1 / #5E80A3 / #14304D / #9DB8D2 — the D8.2 set; reconciled
  from the original D8.1 blue #1A3650 / #3A7CB8 / #5A9FD4.
- PINK  #F18EB7 / #A25D7A / #4D142C / #D29DB3 — finalized 2026-06-14,
  each shade mirrors the matching blue shade's saturation + lightness.
- GREEN #246B42 — non-binary only.

Shade within a family stays the existing hash-by-id selection.

## Why "prefer not to say" / NULL → blue (not green)

1. Privacy. A distinct color for "prefer not to say" defeats the
   opt-out — the avatar would visibly broadcast "this person declined,"
   which is itself a disclosure. Folding PNTS into the default blue keeps
   the opt-out genuinely silent.

2. Storage ambiguity. A skip may be persisted as NULL or as the literal
   'prefer_not_to_say' depending on the onboarding path. Routing BOTH to
   blue makes the rendered color independent of which was stored, and
   preserves D7.3's "skipping = same as prefer not to say."

## Home fill dots carry no gender (D7.3 enforcement)

Gender → color is lobby-only. The pre-join Home feed renders fill dots in
a single neutral (#AEBED0) and never calls `getAvatar`, so the gender mix
is never exposed to non-members.
