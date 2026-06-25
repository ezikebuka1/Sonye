# The Slot Card

The core repeated component. **Anatomy from D8; colors/fonts from D8.2; sport
icon from D8.3; gender tag from the D3 gender amendment; the 50% fill rule from
D8 (carried into D8.2, enforced in D13).**

This is "one card type, repeated" — the only card in the player feed. The
shipped component is `src/components/SlotCard.tsx` (Home-feed-only; other
surfaces that show slot info — the dashboard, the slot-detail page — have their
own rendering).

---

## Container

- White background (`#FFFFFF`)
- **20px border-radius**, **20px padding**
- **0.5px solid `#DAE7F1`** border

---

## Anatomy (top to bottom)

### Row 1 — sport + skill
- **Left:** the **PickleballIcon** (D8.3) — a bare orange (`#FF6A00`)
  paddle-and-ball mark (ball holes knocked out transparent), rendered as a
  `currentColor` SVG component, **+ "Pickleball" text label**. **NO chip / no
  container** around it.
  - *Why no chip:* orange is the action color; a filled orange chip sitting above
    the orange CTA would split the action signal (D8: accent reserved for actions,
    2–3 per screen). The bare mark stays subordinate to the CTA.
  - *Why bare at all:* v1 is single-sport (pickleball hardcoded), so there's no
    multi-icon alignment problem a container would solve, and D8 forbids
    icons-for-the-sake-of-icons.
  - *V2 breadcrumb:* when a 2nd sport lands and rows need uniform icon alignment,
    containerize the icon in a **page-blue tile (`#E6F0FF`)**, never orange.
- **Right:** the **skill badge** — a pill, colored per the skill ramp
  (see `colors.md`).
- **Right (conditional):** the **gender tag** (D3 amendment) — shown only when the
  slot's `gender_category` is `'women'` or `'men'` (the `'open'` default ~90% of
  games shows no tag). This is the **strong safety mechanism** (a commitment),
  distinct from avatar color (a snapshot). It is a *label*, not a filter — users
  do NOT filter the feed by it; everyone sees all games.

### Row 2 — day / time (THE HERO)
- "Saturday · 8:00 AM" in **Baloo 2, 18px, 600**.
- This is the **primary decision the user is making**, so it's the visual hero of
  the card. (Derived from `starts_at` in `America/Chicago` — never naive UTC, R2.)

### Row 3 — venue inset
- Pin icon + venue name on a **`#F6F9FC` inset, 12px radius**. Venue text
  `#4A7A9E`. Single-line (truncate if long).

### Row 4 — social proof (CONDITIONAL — see the 50% rule below)

### Row 5 — the CTA / status
- Exactly one button or status element. See `buttons-and-states.md`.

---

## ⚖️ The 50% Fill Threshold Rule (LOAD-BEARING — D8 / D8.2 / D13)

**This is a real product decision, not a style choice. Honor it everywhere a slot
card renders in the player feed.**

- **Below 50% of capacity filled:** the card shows the **Join button ONLY** in the
  bottom area. **No avatars, no count.** The card looks clean and available.
- **At or above 50% filled:** the card shows the **avatar stack + "X/Y spots
  filled"** alongside the CTA. Social proof appears only once it's credible.

**Why:** "1/6 spots filled" makes a game look *dead* and discourages opt-ins.
"3/6" creates momentum and urgency. **Below 50%, silence beats a small number.**
This serves the Density principle directly.

**Capacity is 6** for pickleball v1, so the threshold is 3 joined.

### Fill-dot colors on the feed
The pre-join / public-feed fill dots are **gender-neutral slate `#AEBED0`**, NOT
the gendered avatar colors — because **gender (avatar color) is lobby-only**
(D7.3): it is NOT shown on the public/anonymous preview and NOT on home-screen
cards before joining. The strong safety signal pre-join is the *gender tag*
(Row 1), not the avatar color.

> **Note — owner dashboard differs:** the owner dashboard does NOT use this 50%
> rule. An owner must see *every* slot's fill, so the dashboard always renders
> capacity dots. See `owner-dashboard.md`. The 50% rule is player-feed-only.

---

## What the card does NOT show (pre-join)
- No player names, no faces/photos (profile pictures are iceboxed).
- No phone numbers (those are owner-only, and only inside the lobby — see `lobby.md`).
- No avatar colors / gender of players (lobby-only).
