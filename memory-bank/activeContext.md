# Active Context

Snapshot of *now* — kept lean. History lives in git; load-bearing rules live in `m3-closeout.md` and `systemPatterns.md`.

## Current focus

**M4 Phase 2 — anon read surfaces (IN FLIGHT):** slot-detail landing page + state-aware OG share images. Implementation committed; running 5-checkpoint battery.

## Just shipped

- **M3.5** — audit-trail migration confirming `ends_at` already in `slot_share_preview` from base; P16c updated to assert `ends_at` + `skill_level`. Full 16-proof battery green.
- **Phase 1** — owner-only create-slot (direct RLS INSERT under `slots_insert_owner`; `created_by = current_user_id()`; Dallas-timezone).
- **Phase 0** — local auth spine (`@supabase/ssr`, local test-OTP, bound dev owner).
- **M3.4** — `slots.skill_level` (4-tier CHECK) + `slot_share_preview` projection.
- **D8.2** — new visual identity (brand palette → app tokens); v1 scope unchanged.

## M4 spine (local-first; cloud is the last step)

Phase 0 ✅ · Phase 1 ✅ · **Phase 2 (next)** anon reads + OG · Phase 3 player auth UI (D2) · Phase 4 lobby / join / attendance · Phase 5 owner dashboard / cancel · Phase 6 Twilio swap + cloud. **Only Phase 6 is Twilio-gated.**

## Working facts the build needs now

- **Timezone:** owner enters Dallas-local; store via the named-tz cast `'… America/Chicago' → timestamptz` (Postgres applies DST per-date). Civil date = `(starts_at AT TIME ZONE 'America/Chicago')::date`. Never naive-UTC or browser-local — it silently breaks D9 and attendance timing.
- **Slot create:** direct authenticated `.insert()` on `slots`, gated by `slots_insert_owner` (`WITH CHECK is_owner()`). App sets `created_by = current_user_id()` (the `public.users.id`, not the auth uid). No `create_slot` function. No title/description column — skill is structured (`skill_level`).
- **Slot fields:** `sport_id = 'pickleball'` (fixed in v1) · `capacity ∈ {4, 6}` · `gender_category ∈ {open, women, men}` · `skill_level ∈ {beginner, advanced_beginner, intermediate, advanced}`.
- **Venues (3):** `cole-park` (Lakewood) · `churchill-park` (Preston Hollow) · `lake-highlands-north` (Lake Highlands). `venues_select_authenticated` lets authed sessions read the picker.
- **Local auth:** `config.toml` test-OTP — `+15555550101 = "123456"` is the dev owner; a second number exists for a non-owner test. A dummy Twilio provider is enabled so GoTrue loads. Dev owner: `public.users` role `owner`, `auth_user_id` bound at first login.
- **Cloud owner placeholder:** `+10000000000`, `auth_user_id` NULL, `claim_token` set — binds via D2 Flow 3 at first real login. Loud tripwire; never mutate.

## Deployment guardrail

The dummy Twilio creds + test-OTP in `config.toml` are **local-only**. Production SMS is configured in the Supabase Cloud Dashboard. Never push local SMS config to cloud.

## Locked decisions

D1 Zustand · D2 auth (Model C) · D3 schema (+ M3.1–M3.4) · D5 toast states · D7 product mechanics (+ D7.2 form bifurcation, D7.3 optional gender) · D8 design system (+ D8.1 avatar palette, **D8.2 visual identity — supersedes D8 color/type**) · D9 one-game-per-Dallas-day · D10 lobby comms (no in-app chat in v1; phones to joined members only) · D11 attendance (SMS magic link at `starts_at + 2h`).

## Process disciplines

Dispatch-Only (Code acts only on a single paste headed "DISPATCH SPEC") · Raw-Output Verification at every gate · phased checkpoints with human gates · Two-Commit (decision doc separate from implementation) · push is manual (post-validation) · Sketches-Before-Code · load-bearing decisions cross-checked with Gemini.

## Stack

Next.js · Supabase (Postgres + RLS) · `@supabase/ssr` · Zustand · Playwright · Dockerized local Supabase. Repo `github.com/ezikebuka1/Sonye`, local `~/squadup`.
