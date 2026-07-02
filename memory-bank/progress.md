# Progress

Compact milestone ledger. Full detail lives in git history + `activeContext.md`.

**Status: v1 is build-complete and auth is LIVE on Twilio Verify** (cutover done +
verified 2026-06-30). Everything required for launch is built, verified, and pushed to
`origin/main`. The only thing left before public launch is a recommended (non-blocking)
attorney review — no remaining feature work. See "Remaining for launch" below.

## Done ✅

### Foundations
- **M1** — Onboarding form, read-only Group Lobby, presentational components.
- **M2** — Zustand client state; join wiring with optimistic update + minimal D5 toast.
- **M3** — Full Postgres schema (7 tables, RLS lattice, helpers, read + transaction
  functions, count-sync trigger). 15+ proofs green; applied to cloud.
  - **M3.1** lobby phone projection (D10) · **M3.2** attendance token + `attest_attendance`
    (D11) · **M3.3** claim-token reconciliation (D2) · **M3.4** `slots.skill_level` +
    `slot_share_preview` projection.
- **D8.2** — Visual identity (brand palette → app tokens). Canonical: `#EE5E00` coral +
  Baloo 2 / Nunito Sans. (Older `#D4724A` + DM Sans references are superseded — see
  `memory-bank/design/`.)

### Auth & owner flows (M4)
- **M4 Phase 0** — Local auth spine: `@supabase/ssr`, local test-OTP, bound dev owner.
- **M4 Phase 1** — Owner create-slot: direct RLS INSERT, Dallas-timezone, owner-gating.
- **M4 Phase 2** — Anon read surfaces: `/slot/[id]` server-rendered detail (4 states) +
  OG image. Shared `slot-preview` lib. All times `America/Chicago` (R2).
- **M4 Phase 3** — Player auth UI (D2 Model C): phone entry, OTP verify, post-verify
  routing, onboarding → `signup_claim` + join.
- **M4 Phase 4** — Lobby / join / attendance surfaces.
- **M4 Phase 5** — Owner dashboard (D14/D15): dashboard + cancel sheet wired to
  `cancel_slot` (required reason picker, dynamic consequence copy).
- **M5** — Player-leave flow (D9): mandatory reason capture, one-joined-slot-per-day
  guard (enforced in-DB via `sm_d9_one_joined_per_day`).

### Lobby wall (D10 + Amendments A & B)
- **BUILT, verified, tested.** `LobbyWall.tsx` (canned taps + free-text composer,
  host-only delete, closed-state recap); mounted in `group-lobby/page.tsx` (joined +
  owner only, waitlist excluded; closes `ends_at + 2h`). Server actions
  `postLobbyMessageAction` / `removeLobbyMessageAction` → `slot_wall()` /
  `owner_delete_message()` RPCs (SECURITY DEFINER, owner-gated). `chat_messages` RLS:
  DELETE only via RPC. E2E `lobby-wall.spec.ts` covers all six D10-B guardrails.
- **Retention:** messages RETAINED post-game as a trust-and-safety audit trail (only the
  surface hides after `ends_at + 2h`); removed on (admin) account deletion. Disclosed
  accurately in the Privacy Policy — see D21.

### The public funnel (this cycle)
- **D20 — `get_public_feed` RPC** — anon-safe SECURITY DEFINER feed (no owner PII,
  inlined 50% fill mask, `starts_at > now() AND cancelled_at IS NULL`). Grants per D17
  Bucket A.
- **Demo seed** — 5 future-dated slots + 6 demo players + memberships, `member_count`
  spread 1/4/6/3/2 (trigger-computed) → exercises the 50% rule + gender tag.
- **Public feed** — `PublicFeed.tsx` + routing split in `page.tsx`
  (`if session → HomeClient else → PublicFeed`). Logged-out front door at `/`.
  `PublicSlotCard` (render-only, "Join this game" → `/auth?slotId=`, 50% rule honored).
- **`/auth` enrichment** — Flow-2 "you're joining" context banner (with masked-fill +
  full-slot-waitlist + gender-tag variants) + Flow-1 "how it works" strip + trust lines.
  SMS consent disclosure byte-identical/untouched.
- **Card visual cleanup** — hero day/time → `font-serif` (Baloo 2) + `tabular-nums`;
  Join CTAs → 44px WCAG tap target; `neighborhood` shown on public cards. SlotCard's
  D19 terminal states untouched (verified).

### Legal & compliance
- **Privacy Policy + Terms of Service** — final, published as live public routes
  (`/privacy`, `/terms`), un-gated for carrier/Twilio review. Texas governing law;
  arbitration + class-action waiver; SMS disclosures present; retention-for-safety
  disclosed accurately. Support contact: `ezikebuka@outlook.com`.
- **D19** — `join_slot` past-game guard (SQLSTATE 55000, "Already started" terminal state).
- **D17** — grant-matrix lockdown (anon/authenticated EXECUTE buckets).

### Launch cutover
- **Twilio Verify cutover — DONE ✅ (2026-06-30).** Login OTP swapped Messaging → Verify
  in the Supabase Cloud dashboard (zero code). Owner bind (Path A) + cold signup (Path D)
  both verified against the live cloud DB via raw output; local dev unaffected. Cloud
  pruned to a clean owner-only state. See `cutover.md` §1.
- **Cloud schema parity audit + push — DONE ✅ (2026-07-01).** Pre-launch security audit
  found cloud stuck at the June-13 schema (5 of 15 migrations). The 10 pending (D10-A/B,
  D14, D17, D18, D19, D20) were applied via `supabase db push` and re-audited to full
  parity: 21 functions, D17 grant matrix exact, chat policies on `is_joined_member`,
  D19 guard + D10-A phone redaction confirmed in deployed function bodies.

## Remaining for launch ⏳ (no feature work)

1. **Attorney review** (recommended, not strictly blocking) — a licensed Texas attorney
   reviews the release (Terms §7) + arbitration (§12) language before public launch.

_(Done since: the Twilio Verify cutover — verified 2026-06-30, see "Launch cutover" above
— and the D21 safety-persistence gate, which was already satisfied.)_

## Deferred to v1.1+

- **Attendance SMS** (D11) — routes (`/c/y`, `/c/n`) + cron dispatcher BUILT but DORMANT
  (`vercel.json` is `{}`, no scheduled workflow, `CRON_SECRET`-gated). It's the only
  message type needing A2P 10DLC; register it as its own clean campaign post-launch.
- **Squad / Profile tab navigation** (M2 stub in `BottomTabBar.tsx`).
- **v2 signals** tracked in `memory-bank/decisions/v2-signals.md` (public browse-all
  shipped early as the feed; clickable venue → maps; neighborhood-from-table; etc.).

## Blockers

- **None for launch.** (Twilio campaign approval is no longer a blocker — the Verify
  pivot removed it from the critical path entirely.)
