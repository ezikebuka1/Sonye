# Sonye — Design System (consolidated)

**Status:** Living reference. This is the single source of truth for Sonye's
visual design. It consolidates and resolves the scattered design decisions
(D8, D8.1, D8.2, D8.2-action-colors, D8.3) into one place so no archaeology
or supersession-tracking is needed.

**How to use this doc:** if you're designing or building any Sonye screen,
read this — not the individual D8.x docs. Those remain the historical record
of *why* each decision was made; this doc states *what is currently true*.

**Supersession map (already resolved below — listed only for provenance):**
- D8 — original system. Its **aesthetic, component anatomy, and the 50% fill
  rule still hold.** Its **colors and fonts are superseded by D8.2.**
- D8.1 — avatar colors encode gender (amends D8's "blue only").
- D8.2 — **current colors + fonts.** Supersedes D8 on both.
- D8.2-action-colors — the Home-card button states (primary/secondary/status).
- D8.3 — the sport icon (bare orange pickleball mark, no chip).

---

## 1. Aesthetic — "Pickup Ready"

The north star: **it should feel like getting invited to play by a friend who
has good taste.** Casual but polished. Active but not gamer. Personal but not
pastel. Sits deliberately between Playtomic (too corporate) and Timeleft (too
events-focused).

**What it is NOT:**
- Not dark mode. The soft pale-blue wash is the foundation.
- Not neon. Coral is saturated but organic, never electric.
- Not corporate. No enterprise blue-gray, no dense information cards.
- Not minimal/empty. Cards carry real content density; the screen feels populated.
- Not cluttered. One card type, repeated. No icons-for-the-sake-of-icons.

---

## 2. Color tokens (D8.2 — current)

### Core
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
| Border (subtle) | `#CFE0F4` / `#B7D2EE` | Secondary borders |

### Accent & action
| Role | Hex | Rule |
|---|---|---|
| **Action / CTA** | `#EE5E00` | All primary buttons ("Join game"). 2–3 uses per screen max. |
| Decorative orange | `#FF6A00` | Hero accents + the sport icon **only**. NEVER a CTA. |
| Yellow | `#FFC63D` | Sparingly. |

> **Retired (do not use):** D8's `#D4724A` coral and `accent-coral-light`
> `#E8997E`. The current CTA color is `#EE5E00`. Any surface still using
> `#D4724A` is drift to sweep.

### Feedback
| Role | Hex |
|---|---|
| Error | `#D64B4B` (locked — clay `#C2452D` was rejected to avoid token bloat) |
| Success | `#4BAE78` |

### Skill ramp (per-level pill: background / ink)
| Level | Background | Ink |
|---|---|---|
| Beginner | `#DCEBFF` | `#15457B` |
| Advanced Beginner | `#FFF1CC` | `#8A5A00` |
| Intermediate | `#D8EFDF` | `#246B42` |
| Advanced | `#D7E0EC` | `#14304D` |

### Avatar colors (D8.1 — encode gender)
| Gender | Family | Note |
|---|---|---|
| Woman | Pink | Exact hex finalized in M5 lobby polish; mirror the blue palette's saturation/lightness so it's not muted-blue-vs-loud-pink. |
| Man | Blue | `#1A3650` / `#3A7CB8` / `#5A9FD4` (existing D8 blues). |
| Non-binary / Prefer not to say / NULL | Green | Reuse skill-green family (`#D8EFDF` / `#246B42`). |

> **Coral is FORBIDDEN for avatars.** Coral is action-only.

---

## 3. Typography (D8.2 — current)

| Role | Font | Weight | Size |
|---|---|---|---|
| Hero headline | **Baloo 2** | 600–800 | ~30–32px |
| Card title (day/time) | Baloo 2 | 600 | 18px |
| Section header | Nunito Sans | 700–800 | 11px uppercase, letter-spacing 0.08em |
| Card label (sport) | Nunito Sans | 700 | 11px uppercase |
| Body / UI | **Nunito Sans** | 600–700 | 13–15px |

**Rules:**
- **Baloo 2** = display/hero (rounded, friendly). **Nunito Sans** = all body/UI.
- DM Sans and Instrument Serif are **retired** (D8's font choices are dead).
- One emotional display accent per screen, in Baloo 2 (formerly Instrument Serif).
- OG images burn these fonts in as TTF ArrayBuffers (`@vercel/og` requirement).

---

## 4. The Slot Card (D8 anatomy + D8.2 skin)

The core repeated component. Anatomy from D8; colors/fonts from D8.2.

**Container:** white, 20px border-radius, 20px padding, 0.5px `#DAE7F1` border.

**Row 1 — sport + skill (D8.3):**
- Left: the **PickleballIcon** (bare orange `#FF6A00` paddle-and-ball mark,
  ball holes knocked out transparent) + "Pickleball" label. **No chip** — a
  filled orange chip above the orange CTA would split the action signal.
- Right: skill badge — pill, colored per the skill ramp table.

**Row 2 — day/time (the hero):**
- "Saturday · 8:00 AM" in Baloo 2, 18px, 600. This is the **primary decision
  the user is making**, so it's the visual hero of the card.

**Row 3 — venue inset:**
- Pin icon + venue name on a `#F6F9FC` inset, 12px radius, venue text `#4A7A9E`.

**Row 4 — social proof (CONDITIONAL — see the 50% rule below).**

**Row 5 — the CTA / status** (see button states below).

### ⚖️ The 50% Fill Threshold Rule (load-bearing — D8, carried into D8.2)

This is a real product decision, not a style choice. Honor it everywhere a
slot card renders.

- **Below 50% of capacity filled:** the card shows the **Join button ONLY**.
  No avatars, no count. The card looks clean and available.
- **At or above 50% filled:** the card shows the **avatar stack + "X/Y spots
  filled"** alongside the CTA. Social proof appears only when it's credible.

**Why:** "1/6 spots filled" makes a game look *dead* and discourages opt-ins.
"3/6" creates momentum. Below 50%, **silence beats a small number.**

*(Fill dots on the pre-join / public feed are gender-neutral slate `#AEBED0`,
not the gendered avatar colors — gender is lobby-only, per D7.3.)*

---

## 5. Button & status states (D8.2-action-colors + D13)

The Row-5 area is **mutually exclusive** — it shows exactly one of these. The
viewer's state decides which. Precedence: terminal lock → membership → pending
→ available.

### Actions (no active membership)
| State | Label | Treatment |
|---|---|---|
| Seat available | **Join game** | coral `#EE5E00` bg, white text |
| Slot full | **Join waitlist** | sky `#8DBCF1` bg, **ink `#14304D` text** |

> **Why ink-on-sky, not white:** white-on-`#8DBCF1` is ~1.8:1 (fails WCAG AA);
> ink passes. The waitlist action is intentionally lower-urgency than coral.

### Status (viewer already has a membership)
| State | Label | Treatment |
|---|---|---|
| Joined | **In lobby** | outlined: ink border + text, check + chevron, links to lobby |
| Waitlisted | **On the waitlist** | muted pill: `#EEF2F8` bg, steel `#5E80A3` text, clock icon, links to lobby |

### Terminal (locked, non-interactive — the card is "dead")
Both render as a non-interactive element (not a button), full contrast (no
opacity dimming), `cursor-not-allowed`, `select-none`, with an `aria-label`.
They are visually **distinct** from each other:
| State | Label | Treatment |
|---|---|---|
| Cancelled | **Cancelled** | `#EEF2F8` slate fill, steel text — "the game no longer exists" |
| Started/ended | **Already started** | `#E6F0FF` inset fill + Clock icon — "you missed the window" |

> Copy rule (D5): toasts/labels for single clauses carry **no trailing period**
> (e.g. toast "Game already started", not "...started.").

---

## 6. Other components (D8)

**Greeting (authed home):** time-of-day line ("Good morning") in steel; name
line ("Hey [Name]") in 26px/600 ink. Notification bell: 44px white circle,
subtle border.

**Social proof strip (authed home):** row of ~4 small avatar dots (22px) +
"[count] players active in [city] this week" — count in ink/600, rest in steel.

**Bottom tab bar:** white, 0.5px top border. Three tabs (Home, Squad, Profile).
Active = coral icon + coral label; inactive = muted blue. 28px bottom padding
(home-indicator safe area).

---

## 7. Process rules

- **Sketches before code.** All visual changes go through the architect session
  as rendered sketches, approved before Code implements. (From D7/systemPatterns.)
- **D8.x docs are the historical record** of *why*; this doc is *what's true now*.
  When a new design decision lands, update this doc and note the source decision.
- **Tokens live in** `src/app/globals.css` (`@theme`). When this doc and
  globals.css disagree, globals.css is the runtime truth — reconcile them.

---

## 8. Known drift to sweep (banked)

Surfaces still on retired tokens, to align in a UI-polish pass before Phase 6:
- The Phase 3B onboarding form chips shipped with retired `#D4724A` coral
  selected-state and `#FAF0DC`/`#854F0B` amber; the selected Intermediate chip
  rendered adv-beginner ramp colors instead of intermediate green. Function and
  a11y are correct — it's a token-sync, not a blocker.
- Any other surface still referencing `#D4724A` → should be `#EE5E00`.
