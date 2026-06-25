# Colors

**Source:** D8.2 (current tokens, supersedes D8), D8.1 (avatar colors), D5
(feedback token notes), D15 (confirms live coral). Retired D8 values flagged.

**Runtime truth:** `src/app/globals.css` (`@theme`). If this doc and globals.css
disagree, globals.css wins — reconcile.

---

## Core

| Role | Hex | Usage |
|---|---|---|
| Pale background | `#E6F0FF` | Page background |
| Card surface | `#FFFFFF` | Cards |
| Card inset | `#F6F9FC` | Inset areas within cards (venue line, secondary info) |
| Ink (primary text) | `#14304D` | Headings, names, key info, day/time hero |
| Steel (secondary text) | `#5E80A3` | Labels, counts, supporting text |
| Muted | `#9DB8D2` | Placeholder text, inactive states |
| Venue text | `#4A7A9E` | Venue names inside insets |
| Sky (brand) | `#8DBCF1` | Secondary action (waitlist) background |
| Border (card) | `#DAE7F1` | Card borders — 0.5px solid |
| Border (subtle / strong) | `#CFE0F4` / `#B7D2EE` | Secondary borders; selection edge |

---

## Accent & action

| Role | Hex | Rule |
|---|---|---|
| **Action / CTA** | `#EE5E00` | All primary buttons ("Join game"). Used 2–3 places per screen MAX — never more. |
| Decorative orange | `#FF6A00` | Hero accents + the sport icon **only**. NEVER a CTA. |
| Yellow | `#FFC63D` | Sparingly. |

> ### ⚠️ RETIRED — do not use
> - `#D4724A` (D8's old coral) → the CTA color is now **`#EE5E00`**.
> - `#E8997E` (D8's "coral-light" / old avatar variant) → retired.
> - `#B85D3A` (D8's coral-dark hover) → superseded by D8.2 token hover behavior.
>
> Any surface still rendering `#D4724A` is **drift to sweep**. The Phase 3B
> onboarding chips are a known example (see `forms.md` → drift note).

---

## Feedback

| Role | Hex | Note |
|---|---|---|
| Error | `#D64B4B` | **Locked.** Clay `#C2452D` was explicitly rejected to avoid token bloat. |
| Success | `#4BAE78` | (Toast.tsx historically hardcoded `#88D7A0` at M2.2 — the D8.2 success token `#4BAE78` is current.) |

---

## Skill ramp (per-level pill: background / ink)

Four tiers. Same map used on slot cards AND the owner dashboard (exported as
`skillBadge` from `SlotCard.tsx`, NOT re-implemented anywhere).

| Level | Background | Ink |
|---|---|---|
| Beginner | `#DCEBFF` | `#15457B` |
| Advanced Beginner | `#FFF1CC` | `#8A5A00` |
| Intermediate | `#D8EFDF` | `#246B42` |
| Advanced | `#D7E0EC` | `#14304D` |

> **Selection-state caution (D15):** the sky selection token `#8DBCF1` is used for
> selected chips (e.g. cancel-reason chips) — deliberately NOT the beginner tint
> `#DCEBFF`, which would collide with the skill ramp.

---

## Avatar colors → see `avatars.md`

Avatar colors encode gender and have their own rules (D8.1). Summary: woman →
pink, man → blue, non-binary/null → green. **Coral is forbidden for avatars.**

---

## Other specific values in use

| Value | Where | Note |
|---|---|---|
| `#EEF2F8` | "On the waitlist" pill bg; "Cancelled" terminal lock bg | The one button-area value without a globals token (arbitrary value). |
| `#AEBED0` | Pre-join / public feed fill dots | Gender-neutral slate — NOT the gendered avatar colors (gender is lobby-only). |
