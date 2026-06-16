# D15 — Owner Dashboard + Cancel-Sheet UI

**Decided:** 2026-06-16
**Status:** ✅ Decided & implemented — Phase 5 Dispatch 2 (the UI that wires to
the D14 `cancel_slot` RPC).
**Related:** D14 (the `cancel_slot` mechanics this UI calls), D13 (all-server
player surfaces; mutations via SECURITY DEFINER RPCs from a `'use server'`
action on the server client), D8.2 (token sheet — every color/font is a token),
D7 (one reason question, NO reschedule), D9 (cancellation frees the joined
player's same-day cap — proven by the V5 E2E), D11 (a game stays active until
`starts_at + 2h`; the dashboard's 2h grace mirrors that window).

## Scope (and what is DEFERRED)

This dispatch delivers **only** the owner dashboard ("Your games") + the cancel
bottom-sheet, wired to `cancel_slot`. The **attendance-review queue is
DEFERRED** — no "Needs review" section, and **no `owner_set_attendance`** was
added. The dashboard is a net-new `/dashboard` route (no owner dashboard existed
before; `/create-slot` was the only owner-gated page, reachable only by URL).

## Surface & data

- **`/dashboard`** mirrors the `page.tsx → HomeClient.tsx` split: a
  `force-dynamic` server component gates (`getUser` → `/dev-login`;
  `rpc('is_owner')` → access-denied) and fetches; `DashboardClient` renders +
  owns the sheet.
- **Slot query** mirrors the Home feed select but: adds **`waitlist_count`** (a
  real trigger-managed column the feed never selected); filters
  `.eq('created_by', current_user_id())` (NOT `auth.uid()` — the same id
  resolution create-slot uses); keeps `.is('cancelled_at', null)`; and uses a
  **2-hour-padded lower bound** `starts_at > now() - 2h` rather than a bare
  `starts_at > now()`.
- **Why the 2h pad (load-bearing, not cosmetic):** `cancel_slot` has no time
  guard (D14). A bare future-only filter would drop a 7:00 PM game at 7:00:01 PM,
  hiding the card from an owner standing at an empty court trying to cancel at
  7:02 PM. A game stays functionally active until its D11 attendance window opens
  at `starts_at + 2h`; `now - 2h` keeps each slot visible + cancellable until
  exactly that moment, then it drops. Cancelling a started-but-abandoned game
  also suppresses the D11 texts (cancel sets memberships to `'left'`, so the
  cron's `status='joined'` target is empty). Eyebrow stays **"Upcoming"** — the
  only games that linger past start are within this short grace.

## Adopted Claude-Design refinements (from the approved sketches)

- **Single-line venue** name (truncate) on the card top row; skill chip on the
  right.
- **Waitlist demand nudge** = a neutral inset panel (`bg-inset`) "{n} players on
  the waitlist" + a coral **"Open another slot"** action → `/create-slot`.
  Rendered ONLY when `memberCount === capacity && waitlistCount > 0`.
- **No-show concerns N/A here** (attendance deferred).
- **Cancel demoted** to a quiet right-aligned **red text link** ("Cancel game",
  `text-error`, no border) — the destructive weight lives in the sheet, not the
  card.
- **48px reason chips** (2×2 grid, ≥44px tap target, single line).
- Restored the blunt **"This can't be undone."** in the consequence copy.

## The two overrides

1. **Color-coded skill ramp KEPT.** The dashboard reuses the exact `skillBadge`
   map (the locked D8.2 SKILL_RAMP) — now `export`ed from `SlotCard.tsx` and
   imported, NOT re-implemented and NOT neutralized.
2. **Selection = TRUE SKY `--color-sky` (#8DBCF1).** The selected reason chip
   uses the sky selection token with a `border-strong` (#B7D2EE) edge + check —
   deliberately NOT the beginner-skill tint `#DCEBFF`, which would collide with
   the skill ramp.

## Other decisions

- **Fill dots are NET-NEW, always shown — NOT `SocialProofBlock`.** That block is
  the player feed's 50%-gated social-proof avatars; an owner must see *every*
  slot's fill. The dashboard renders `capacity` dots: first `memberCount` filled
  (`bg-ink`), the rest empty rings (`border-strong`). Label: "{n} / {cap}
  joined" (`text-ink`) when partial; "{cap} / {cap} full" with a success-green
  check (`text-success`) when full.
- **Cancel sheet modeled on `Toast.tsx`.** No Modal/Dialog/BottomSheet primitive
  exists, so `CancelSheet.tsx` is net-new on Toast's overlay mechanics: a fixed
  dim scrim (`bg-ink/40`, tap = "Keep this game") + a fixed slide-up panel
  (`requestAnimationFrame` mount, `translate-y-full → translate-y-0`, safe-area
  inset). The optional **note field is WHITE** (`bg-card`, `placeholder:text-steel`)
  — the dark-on-dark fix, asserted at computed-style (`rgb(255, 255, 255)`).
- **Dynamic consequence copy** from `memberCount` + `waitlistCount`. Cancellation
  **frees** the joined players' daily game limit and **clears** the waitlist — it
  was never capped. Singular/plural handled; the player phrase + waitlist phrase
  + "This can't be undone." are bold; the "(freeing up their daily game limit)"
  parenthetical is `text-steel`.
- **Reason → single `cancellation_reason`.** The four chips (Weather / Not enough
  players / Venue issue / Other) compose with an optional note into ONE free-text
  string: `note.trim() ? "${chipLabel} — ${note.trim()}" : chipLabel`. The
  picker is REQUIRED — the confirm button is `disabled` until a reason is picked.
- **`cancelSlotAction`** mirrors `joinSlotAction` exactly: server client
  (`@/lib/supabase/server`, so the owner's `auth.uid()` reaches the SECURITY
  DEFINER `cancel_slot`), one `.rpc('cancel_slot', { p_slot_id, p_cancellation_reason })`,
  RAISE-message mapping to a typed `CancelResult`. `cancel_slot` RETURNS boolean,
  so success = no error (no row to unpack). Mapped on the **actual** migration
  texts: `'already cancelled'` → `already_cancelled`, `'owner only'` →
  `forbidden`, `'reason'` → `reason_required`, `'not authenticated'` → `/auth`,
  else `unknown`.
- **Post-cancel = `router.refresh()`, NO optimistic row mutation.** On `ok` (or
  `already_cancelled`) the client shows the toast, closes the sheet, and
  `router.refresh()`s; the re-run server query drops the now-cancelled slot via
  `.is('cancelled_at', null)`. Refresh is the source of truth (the live
  HomeClient pattern — NOT the Zustand mock `joinSlot`). The existing toast slice
  (`useAppStore.getState().showToast`) is the live toast.

## CLAUDE.md drifts the recon surfaced (doc trail = `globals.css`)

- **Live coral CTA = `#EE5E00` (`--color-cta`/`--color-coral`)**, NOT CLAUDE.md's
  `#D4724A`. New components use the token.
- **Live fonts = Nunito Sans (`--font-sans`) + Baloo 2 (`--font-serif`)**, NOT
  DM Sans / Instrument Serif. The dashboard heading + sheet heading use
  `font-serif`; all card-internal text uses `font-sans` (matches SlotCard).

## Verification (local live stack, Phase 5 D2)

`npm run build` ✓ (`/dashboard` present). New live-session E2E
(`e2e/dashboard-cancel.spec.ts`, dev-login + self-contained DB fixture, torn
down): **V2** dashboard fill/demand render; **V3** dynamic copy (plural +
waitlist / plural no-waitlist / singular), reason gating, white note, no
reschedule; **V4** cancel → `cancel_slot` → slot row
`["t","Weather — courts flooded","0","0"]`, both memberships
`["left","slot_cancelled"]`, card drops; **V5** the D9 chain — player joined slot
A blocked from same-day slot B, owner cancels A via the dashboard, player then
joins B (BEFORE/AFTER guards rule out a false pass); **V6** no reschedule
anywhere. All green.
