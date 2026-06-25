# Forms & Auth Flow

**Source:** D7.4 (the CURRENT unified form — supersedes D7.2's bifurcation),
D7.3 (optional gender), D7.1 (willing-to-drive cut), D7 (original schema), D2
(auth flow shape + the three entry flows).

---

## The auth flow shape (D2 — "Model C")

Phone-only, OTP-based, via Supabase Auth. **No passwords, no email, no social
sign-in, no magic auth links.** Phone is the sole identity.

**Sequence:** phone entry → 6-digit OTP via SMS → verify → JWT issued →
(conditional form, per flow) → atomic write.

**Why form-AFTER-verify (not before):** a form-first flow exposes an
unauthenticated SMS-trigger endpoint (toll-fraud vector) and degrades the lobby
to nameless `+1` numbers. Form-after-verify makes the form unreachable until
phone ownership is proven, and a user who bounces mid-form consumes zero slot
capacity.

### The three entry flows (distinguished by URL context at OTP-send)
| Flow | Trigger | Form? |
|---|---|---|
| **Flow 1 (Generic)** | no URL context | yes — the 4-field form |
| **Flow 2 (Slot)** | `?slotId=<id>` present (arrived via shared slot link) | yes — same 4-field form, different frame + post-submit |
| **Flow 3 (Waitlist claim)** | `?claim_token=<uuid>` present (pre-seeded user) | **no form** — data was collected pre-launch |
| (Returning user) | known phone | **no form** — auth only |

Branching runs **server-side** post-verify (D2 Amendment B): one round trip,
existence check, redirect to the resolved destination — no client flash.

---

## The onboarding form (D7.4 — CURRENT)

**ONE unified form, FOUR fields, for ALL net-new users** (both Flow 1 and Flow 2):

1. `first_name` (required)
2. `last_name` (required)
3. `skill_level` (required — 4-tier radiogroup)
4. `gender` (optional — radiogroup, skippable)

> **`general_availability` and `preferred_venues` are DROPPED** from in-app
> onboarding (recorded NULL). They failed the Density test: no v1 read path
> consumes them (there are only 3 vetted venues, and slot opt-in *is* the
> availability signal). They stay in the schema as v2 seams.
>
> D7.2's older slot-vs-generic *field* bifurcation is **RETIRED** — the two
> net-new flows now differ only in frame and post-submit behavior, never fields.

### Name = two inputs
"First name" / "Last name" as **two separate inputs** (stored as distinct
columns). Single-input-with-split was rejected — fails on mononyms and complex
names.

### Flow 1 vs Flow 2 — frame only (D7.4)
| | Flow 2 (slot) | Flow 1 (generic) |
|---|---|---|
| Banner | pinned "You're joining…" (+ "N already in" if fill ≥50%) | none |
| Header | "phone verified. you're one step from the game." | "phone verified. let's find your game." |
| CTA | "Join the game" | "Find games" |
| Footer | phone-privacy disclosure (D10) under CTA | "your number stays private until you join a game" |

---

## Locked copy (D7.4, D5 register — Gemini-locked)

- First-name error: *"we need a first name — it's how your group knows you"*
- Skill helper: *"pick whatever feels right — you can change it later"*
- Headers / CTAs / footers: per the table above.

---

## Accessibility (D7.4 — corrected at Phase 3B verification)

- **Touch targets:** 46px chips / 52px inputs / 56px CTA.
- Explicit `<label for>` on every input.
- **Skill AND gender are radiogroups:** `role="radiogroup"` + `role="radio"` +
  `aria-checked` on each chip. (NOT `aria-pressed` — these are single-select, not
  toggles. The original D7.4 board said `aria-pressed`; corrected.)
- Gender's "none selected" default is a **first-class state**, not an error.
- **Selection is never color-alone:** tint + ring + ✓ (checkmark).
- **Errors:** `role="alert"` + `aria-invalid="true"` + resolving
  `aria-describedby`; error red `#D64B4B`; **validate on submit, never while
  typing**; on failed submit, scroll to and focus the first error.

---

## ⚠️ Known drift to sweep (D8.2 / D15)

The Phase 3B onboarding chips shipped with **retired tokens**: `#D4724A` coral
selected-state and `#FAF0DC`/`#854F0B` amber, and the selected Intermediate chip
rendered the *adv-beginner* ramp colors instead of intermediate green. **Function
and a11y are correct** — it's a token-sync issue. A UI-polish pass aligns this
surface to D8.2 (coral → `#EE5E00`, fix the Intermediate chip → green) before
Phase 6.
