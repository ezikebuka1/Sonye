# Sonye Design System — Overview & Index

**This folder is the single source of truth for Sonye's visual design.** It
consolidates the design decisions that were scattered across ~12 decision docs
(D5, D7.x, D8.x, D9, D10, D13, D14, D15, D3-gender) into one place, organized by
area, so the design never has to be reconstructed from the decision-doc trail
again.

**Read these files — not the individual D-docs — when designing or building.**
The D-docs remain the historical record of *why* each call was made; these files
state *what is currently true*. Each file cites its source decision(s) for
provenance.

---

## The files

| File | Covers |
|---|---|
| `00-overview.md` | This file — aesthetic, voice, supersession map, index |
| `colors.md` | All color tokens (core, accent, feedback, skill ramp) |
| `typography.md` | Fonts, weights, sizes |
| `slot-card.md` | The slot card anatomy + the 50% fill rule + sport icon + gender tag |
| `buttons-and-states.md` | Every CTA / status / terminal button state |
| `avatars.md` | Gender→color mapping + visibility rules |
| `forms.md` | Onboarding form, auth flow shape, locked copy, accessibility |
| `feedback-toasts.md` | Toast pattern + the voice/tone & punctuation rules |
| `lobby.md` | The lobby wall (canned taps + free-text) |
| `owner-dashboard.md` | Owner dashboard + cancel sheet |

---

## The aesthetic — "Pickup Ready" (D8)

The north star: **it should feel like getting invited to play by a friend who
has good taste.** Casual but polished. Active but not gamer. Personal but not
pastel. Positioned deliberately between Playtomic (too corporate) and Timeleft
(too events-focused).

**What it is NOT:**
- Not dark mode. The soft pale-blue wash is the foundation.
- Not neon. Coral is saturated but organic, never electric.
- Not corporate. No enterprise blue-gray, no dense information cards.
- Not minimal/empty. Cards carry real content density; the screen feels populated.
- Not cluttered. One card type, repeated. No icons-for-the-sake-of-icons.

---

## The product principles that shape the design (projectbrief.md)

These aren't visual rules, but they're *why* the visual rules exist — every
design call traces back to one of them:

- **Density Over Everything (V1 Decision Principle):** the test for any feature
  or field is "does it improve density, or fracture the user base?" This is why
  onboarding is ruthlessly short (every cut field is a "density multiplier"), why
  there are no filters/segmentation axes, and why the 50% fill rule exists (a
  small number makes a game look dead → suppresses opt-ins → hurts density).
- **The Partiful Model:** view-first, auth-second. Friction between link-tap and
  on-the-list is a density tax. This is why the public feed shows real games
  before any wall, and why the onboarding form is minimal.
- **The Realness Strategy:** real-person credibility comes from *byproducts*
  (track record, useful coordination, populated games), NOT profile pictures
  (which are iceboxed). This is why avatars are abstract color dots, not photos.

---

## Supersession map (resolved — for provenance only)

You do **not** need to track these chains when using this folder; they're already
resolved into the files. Listed only so you know which D-doc a decision came from.

- **D8** — the original system. Its **aesthetic, the slot-card anatomy, and the
  50% fill rule still hold.** Its **colors and fonts are SUPERSEDED by D8.2.**
- **D8.1** — avatar colors encode gender (amends D8's "blue only" avatars).
- **D8.2** — **current colors + fonts.** Supersedes D8 on both.
- **D8.2-action-colors** — the Home-card button color roles (primary/secondary/status).
- **D8.3** — the sport icon (bare orange pickleball mark, no chip).
- **D5** — the toast pattern + tone rules.
- **D7 / D7.1 / D7.2 / D7.3 / D7.4** — onboarding. **D7.4 is the current form**
  (4 fields); D7.1 cut willing-to-drive; D7.2's field-bifurcation is RETIRED by
  D7.4; D7.3 added optional gender.
- **D9** — same-day collision UX + the toast-punctuation nuance.
- **D10 + Amendments A & B** — the lobby wall (peer-phone-visibility was removed
  in Amendment A; the wall replaced it in Amendment B).
- **D13** — the four-state button table + the all-server feed architecture.
- **D14 / D15** — owner cancel mechanics (D14 backend) + the cancel-sheet UI (D15).
- **D3-gender-amendment** — the slot gender tag (a card label).

---

## ⚠️ Documented drift (the reason this folder exists)

Multiple build sessions found that **CLAUDE.md / older memory says `#D4724A`
coral + DM Sans / Instrument Serif, but the SHIPPED app uses `#EE5E00` coral +
Nunito Sans / Baloo 2** (D15 and the D8.2 docs both caught this independently).
The shipped values in `src/app/globals.css` are the runtime truth. This folder
states the shipped truth; if any older doc disagrees, the older doc is stale.

**Rule of thumb:** `globals.css` (`@theme`) is the runtime source of truth for
tokens. When this folder and globals.css disagree, reconcile toward globals.css.

---

## Process

- **Sketches before code** (D7 / systemPatterns): all visual changes go through
  the architect session as rendered sketches, approved before Code builds.
- **Keep this folder current:** when a new design decision lands, update the
  relevant file here and cite the new decision. Don't let the folder drift back
  into being out-of-date — that defeats its purpose.
