# Buttons & States

**Source:** D8.2-action-colors + D13 (the four-state table), D19 (the two terminal
locks). The Row-5 area of the slot card is **mutually exclusive** — it shows
exactly ONE of these. The viewer's state decides which.

**Precedence (highest wins):** terminal lock → membership status → pending →
available action.

---

## 1. Actions (viewer has NO active membership)

| State | Label | Treatment |
|---|---|---|
| Seat available (`< capacity` joined) | **Join game** | coral `#EE5E00` bg, white text |
| Slot full (`= capacity` joined) | **Join waitlist** | sky `#8DBCF1` bg, **ink `#14304D` text** |

> **Why ink text on sky, not white (D8.2-action-colors):** white-on-`#8DBCF1` is
> ~1.8:1 — **fails WCAG AA**. Ink `#14304D`-on-sky passes comfortably. The waitlist
> action is intentionally lower-urgency than coral (a waitlist seat ≠ a confirmed
> seat), so sky reads as "available but not the headline action."

Button geometry: full-width, ~12px padding, 14px border-radius, label 15px.

---

## 2. Status (viewer already HAS a membership — shows a state, not an action)

No coral/sky here — these are status readouts that link to the lobby.

| State | Label | Treatment |
|---|---|---|
| `joined` | **In lobby** | outlined: ink `#14304D` border + text, check + chevron icons, links to lobby |
| `waitlisted` | **On the waitlist** | muted pill: `#EEF2F8` bg, steel `#5E80A3` text, clock icon, links to lobby |

---

## 3. Terminal (locked, non-interactive — the card is "dead") — D19

Both render as a **non-interactive element (NOT a button)** — no onClick, no href.
Both are **full contrast (NO opacity dimming)**, `cursor-not-allowed`,
`select-none`, with an `aria-label`. They are visually **DISTINCT** from each
other so a scan tells them apart:

| State | Label | Treatment | Means |
|---|---|---|---|
| Cancelled | **Cancelled** | `#EEF2F8` slate fill, steel text, no icon | "the game no longer exists" |
| Started/ended | **Already started** | `#E6F0FF` inset fill + Clock icon | "you missed the window" |

> **History (D19):** the cancelled lock previously used `opacity-80`, which pushed
> its status text below WCAG AA contrast. That dim was REMOVED — both terminal
> states now hold full contrast and signal "dead" through *form* (a recessed,
> non-button shape), not fading. Don't reintroduce the dim.

> **Label rationale:** "Already started" — NOT "In progress." "In progress"
> falsely implies a joinable ongoing game; a join surface must never imply a
> closed door is open. "Already started" is a terminal fact.

These are race-condition fallbacks: cancelled and started slots normally *drop off
the feed* on refresh (the feed query filters to future, non-cancelled slots), so
the lock only appears when a slot changes state between render and tap.

---

## In-flight state

| State | Label | Treatment |
|---|---|---|
| Join action in flight | **Joining…** | disabled, ~70% opacity, `aria-busy="true"`; coral if was-available, sky if was-full |

Per-card (other cards unaffected). This is the brief round-trip before the
server action returns its outcome.

---

## Copy rule (D5)

Single-clause button/toast labels carry **no trailing period** (e.g. "Game
already started", not "...started."). See `feedback-toasts.md` for the full
punctuation nuance.
