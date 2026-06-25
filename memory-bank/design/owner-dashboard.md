# Owner Dashboard & Cancel Sheet

**Source:** D15 (the UI), D14 (the `cancel_slot` mechanics it wires to), D7 (one
reason question, NO reschedule), D8.2 (tokens).

The owner's "Your games" surface at `/dashboard` — net-new in Phase 5. Lists the
owner's slots and lets them cancel via a bottom-sheet. (The attendance-review
queue is **deferred** — no "Needs review" section in v1.)

---

## The dashboard cards

Mirror the player feed's card, with owner-specific differences:

- **Single-line venue** name (truncate) on the top row; skill chip on the right.
  Reuses the exact `skillBadge` skill ramp (imported from `SlotCard.tsx`, NOT
  re-implemented or neutralized).
- **Fill dots — ALWAYS shown (NOT the 50% rule).** This is the key divergence
  from the player card: an owner must see *every* slot's fill, so the dashboard
  renders all `capacity` dots — first `memberCount` filled (`bg-ink`), the rest
  empty rings (`border-strong`). This is net-new rendering, NOT the player feed's
  `SocialProofBlock` (which is 50%-gated).
  - Label: "{n} / {cap} joined" (`text-ink`) when partial; "{cap} / {cap} full"
    with a success-green check (`text-success`) when full.
- **Waitlist demand nudge:** a neutral inset panel (`bg-inset`) "{n} players on
  the waitlist" + a coral **"Open another slot"** action → `/create-slot`.
  Rendered ONLY when `memberCount === capacity && waitlistCount > 0`.
- **Cancel = a quiet right-aligned red text link** ("Cancel game", `text-error`,
  no border). The destructive weight lives in the sheet, not the card.
- **Eyebrow stays "Upcoming"** — the dashboard shows slots until `starts_at + 2h`
  (a 2h grace so an owner at an empty court can still cancel a just-started game),
  and those linger-past-start games are within that short grace.

---

## The cancel bottom-sheet (D15)

Modeled on `Toast.tsx`'s overlay mechanics (no Modal/BottomSheet primitive
exists): a fixed dim scrim (`bg-ink/40`, tap = "Keep this game") + a fixed
slide-up panel (`requestAnimationFrame` mount, `translate-y-full → translate-y-0`,
safe-area inset).

- **Reason chips:** 4 chips (Weather / Not enough players / Venue issue / Other)
  in a **2×2 grid, 48px** (≥44px tap target, single line).
  - **Selected chip = TRUE SKY `#8DBCF1`** with a `border-strong` (`#B7D2EE`)
    edge + check — deliberately NOT the beginner-skill tint `#DCEBFF` (would
    collide with the skill ramp).
  - **The picker is REQUIRED** — the confirm button is `disabled` until a reason
    is picked.
- **Optional note field is WHITE** (`bg-card`, `placeholder:text-steel`) — the
  dark-on-dark fix (asserted at computed-style `rgb(255,255,255)`).
- Reason + note compose into ONE string: `note.trim() ? "{chip} — {note}" : chip`.
- **Dynamic consequence copy** from `memberCount` + `waitlistCount`: cancellation
  **frees** the joined players' daily game limit and **clears** the waitlist.
  Singular/plural handled. The player phrase + waitlist phrase + **"This can't be
  undone."** are bold; the "(freeing up their daily game limit)" parenthetical is
  `text-steel`.
- **NO reschedule prompt** (D7) — a cancelling owner is the least-likely to
  commit to a new time in the same flow.

---

## Post-cancel behavior

On success: show the toast, close the sheet, `router.refresh()`. The re-run
server query drops the now-cancelled slot (filtered by `cancelled_at IS NULL`).
Refresh is the source of truth — NO optimistic row mutation.

---

## Drift note (D15 recon caught this)

D15's recon independently confirmed the **same drift** flagged across this folder:
live coral CTA is **`#EE5E00`** (not CLAUDE.md's `#D4724A`), and live fonts are
**Nunito Sans + Baloo 2** (not DM Sans / Instrument Serif). The dashboard heading
+ sheet heading use Baloo 2 (`--font-serif`); all card-internal text uses Nunito
Sans (`--font-sans`), matching SlotCard.
