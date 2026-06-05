# Progress

Compact milestone ledger. Full detail lives in git history.

## Done ✅

- **M1** — Onboarding form (D7, 6 fields), read-only Group Lobby, presentational components.
- **M2** — Zustand client state; join wiring with optimistic update + minimal D5 toast.
- **M3** — Full Postgres schema (7 tables, RLS lattice, helpers, read + transaction functions, count-sync trigger). 15+ proofs green locally; applied to cloud; post-apply spot-checks pass.
  - **M3.1** lobby phone projection (D10) · **M3.2** attendance token + `attest_attendance` (D11) · **M3.3** claim-token reconciliation (D2) · **M3.4** `slots.skill_level` + `slot_share_preview` projection.
- **D8.2** — New visual identity (brand palette → app tokens); v1 product scope unchanged.
- **M4 Phase 0** — Local auth spine: `@supabase/ssr`, local test-OTP, bound dev owner. All checkpoints green.
- **M4 Phase 1** — Owner create-slot: direct RLS INSERT, Dallas-timezone, owner-gating + non-vacuous anon-filter proven. All checkpoints green.

## In progress 🔧

- **M4 Phase 2** — Anon read surfaces (slot-detail page + state-aware OG share images). Detail page to be sketched first.

## Up next ⏳

- M4 Phase 3 (player auth UI), Phase 4 (lobby / join / attendance), Phase 5 (owner dashboard / cancel), Phase 6 (Twilio swap + cloud).

## Blockers

- Twilio campaign approval — gates Phase 6 real-SMS only. Phases 2–5 are unblocked.
