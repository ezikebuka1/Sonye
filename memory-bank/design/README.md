# Sonye Design System — Quick Reference

**This is the cheat-sheet.** The facts you reach for most, on one page. For the
full reasoning and edge cases, see the detail files in this folder (linked below).

> **Runtime truth:** `src/app/globals.css` (`@theme`). If anything here disagrees
> with globals.css, globals.css wins.

---

## ⚠️ Read this first — the drift trap

Older memory / CLAUDE.md says **`#D4724A` coral + DM Sans + Instrument Serif**.
That is **STALE.** The shipped app uses:

- **Coral `#EE5E00`** (NOT `#D4724A`)
- **Baloo 2** (display) + **Nunito Sans** (body) — (NOT DM Sans / Instrument Serif)

Two build sessions hit this independently. If you see the old values anywhere,
it's drift to fix.

---

## Colors (cheat-sheet) → detail: `colors.md`

| Role | Hex |
|---|---|
| Page background | `#E6F0FF` |
| Card | `#FFFFFF` |
| Card inset | `#F6F9FC` |
| Ink (primary text) | `#14304D` |
| Steel (secondary text) | `#5E80A3` |
| Muted / placeholder | `#9DB8D2` |
| **CTA / action** | **`#EE5E00`** (2–3 per screen max) |
| Decorative orange (accents + sport icon, never CTA) | `#FF6A00` |
| Sky (waitlist button) | `#8DBCF1` |
| Error / Success | `#D64B4B` / `#4BAE78` |
| Card border | `#DAE7F1` (0.5px) |

**Skill ramp** (bg / ink): Beginner `#DCEBFF`/`#15457B` · Adv. Beginner
`#FFF1CC`/`#8A5A00` · Intermediate `#D8EFDF`/`#246B42` · Advanced
`#D7E0EC`/`#14304D`.

**Avatars** (→ `avatars.md`): woman = pink, man = blue, non-binary/null = green.
**Coral is forbidden for avatars.** Avatar colors are **lobby-only**.

---

## Typography (cheat-sheet) → detail: `typography.md`

- **Baloo 2** = hero / card title / display (`--font-serif`). Hero ~30–32px;
  card day/time 18px/600.
- **Nunito Sans** = all body / UI (`--font-sans`), 13–15px, weight 600–700.
- One emotional display accent per screen (Baloo 2).

---

## The slot card (cheat-sheet) → detail: `slot-card.md`

White, **20px radius, 20px padding, 0.5px `#DAE7F1` border.** Rows:
1. Sport icon (bare orange paddle, no chip) + "Pickleball" · skill badge ·
   gender tag (only if women/men)
2. **Day · time — the hero** (Baloo 2, 18px/600)
3. Venue inset
4. Social proof — **conditional, see the 50% rule**
5. CTA / status

### ⚖️ THE 50% FILL RULE (load-bearing)
- **< 50% filled** → **Join button ONLY.** No avatars, no count.
- **≥ 50% filled** → avatar stack + "X/Y spots filled" appears.
- *Why:* "1/6" looks dead and kills opt-ins; silence beats a small number.
- Capacity = 6, so threshold = 3 joined.
- *(Owner dashboard is the exception — it always shows fill. See
  `owner-dashboard.md`.)*

---

## Button states (cheat-sheet) → detail: `buttons-and-states.md`

Mutually exclusive. Precedence: terminal → membership → pending → action.

| State | Label | Treatment |
|---|---|---|
| Available | **Join game** | coral, white text |
| Full | **Join waitlist** | sky `#8DBCF1`, **ink text** (white fails AA) |
| Joined | **In lobby** | outlined ink, links to lobby |
| Waitlisted | **On the waitlist** | `#EEF2F8` pill, steel text |
| Cancelled (terminal) | **Cancelled** | `#EEF2F8`, full contrast, non-interactive |
| Started (terminal) | **Already started** | `#E6F0FF` + clock, full contrast |
| In flight | **Joining…** | disabled, ~70% opacity |

Terminal locks: non-interactive `<div>`, NO opacity dim, `cursor-not-allowed`.

---

## Voice & copy (cheat-sheet) → detail: `feedback-toasts.md`

**Tone:** contractions, lowercase mid-sentence, terse, warm. Like a friend
texting you ("you're all set — find your game").

**Punctuation:** single-clause toasts = **no trailing period** ("Game already
started"). Multi-clause = keep grammar ("You're already in a game today. Leave
that one or complete it to join another.").

---

## The rest

| Area | File |
|---|---|
| Full overview, aesthetic, principles, supersession map | `00-overview.md` |
| Onboarding form (4 fields), auth flow, a11y, locked copy | `forms.md` |
| The lobby wall (canned taps + free-text, owner-delete) | `lobby.md` |
| Owner dashboard + cancel sheet | `owner-dashboard.md` |

---

## Process

**Sketches before code** — all visual changes go through the architect session as
rendered sketches before Code builds. Keep this folder current when new design
decisions land.
