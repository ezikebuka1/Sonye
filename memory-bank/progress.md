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
- **M4 Phase 2** — Anon read surfaces: `/slot/[id]` server-rendered detail page (4 states: FORMING/FILLING/FULL/CANCELLED) + `/slot/[id]/opengraph-image` (1200×630 ImageResponse, `runtime=nodejs`). Shared `slot-preview` lib owns fetch/format/state. All times `America/Chicago` (R2). Anon path only — `slot_share_preview` exclusively. Baloo 2 hero, Nunito Sans body. `generateMetadata`: absolute `og:image`, `og:title` ≤35 chars, `og:description`. All 5 checkpoints green.

## In progress 🔧

- **M4 Phase 3** — Player auth UI (D2 Model C): phone entry, OTP verify, post-verify routing, onboarding forms → `signup_claim` + join.

## Up next ⏳

- M4 Phase 3 (player auth UI), Phase 4 (lobby / join / attendance), Phase 5 (owner dashboard / cancel), Phase 6 (Twilio swap + cloud).

## Blockers

- Twilio campaign approval — gates Phase 6 real-SMS only. Phases 2–5 are unblocked.
