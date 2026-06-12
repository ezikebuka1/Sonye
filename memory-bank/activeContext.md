# Active Context

Snapshot of *now* — kept lean. History lives in git; load-bearing rules live in `m3-closeout.md` and `systemPatterns.md`.

## Current focus

**Phase 3B done. M4 Phase 4 (lobby / join / attendance) is next.**

**D8.2 Phase 2 + 2-T + §D applied to working tree — UNCOMMITTED. Phase 3 battery GREEN.** Phase 2 diff + 2-T audits Architect-CONFIRMED; §D final residual rulings applied. Phase 3 battery all green: `npm run build` ✓ (10/10 routes), enumerated D8-hex grep all-allowlisted, dead-font grep empty, live-font grep layout.tsx-only, `tsc --noEmit` ✓, `npm run start` serving HTTP 200. **Production server running in background on :3000 for Ebuka's four-surface visual pass.** NO commit until visual pass signs off. **Post-pass amendment:** §5 quarantine on `lib/slot-preview.ts` narrowed per Architect CASE-B proof — the four page-only `footerBg` literals recolored (`:94`/`:140 #7A9AB8→#5E80A3`, `:109 #1A3650→#14304D`, `:126 #D4724A→#FF6A00`); `SKILL_DISPLAY` rows `:155–158` remain quarantined (proven OG-consumed at opengraph-image.tsx:87) until the OG re-skin dispatch. Battery re-verified green after the lift; FILLING footer band confirmed `#FF6A00` on fresh screenshot.

## Just shipped

- **D8.2 Phase 2 foundation (working tree, uncommitted)** — per Architect ruling sheet: `globals.css` → D8.2 canonical token sheet (legacy D8 token names kept as aliases); fonts global — `layout.tsx` loads Nunito Sans (`--font-nunito` 400/500/600/700) + Baloo 2 (`--font-baloo2` 600/700), local font defs deleted from `src/app/slot/[id]/page.tsx` (inline `var(--font-*)` refs now cascade from root); HeroText accent `italic` → `font-semibold`; Tier B recolors (ink `#14304D`, CTA `#EE5E00` + `hover:brightness-95`, error `#D64B4B`, decorative `#FF6A00`, success `#4BAE78`, focus sky `#8DBCF1`) across OtpForm, PhoneForm, auth page, create-slot, OnboardingForm, slot detail, Toast. §4 avatar quarantine untouched (HomeClient, mockData, slot owner avatar). §5 guard fired: `lib/slot-preview.ts` NOT edited (imported by quarantined opengraph-image) — its 3 rulings deferred to the avatar/OG dispatch. **Phase 2-T (Architect-authorized follow-up):** Tier A global replace (10 hexes: `#EEF4FA→#E6F0FF`, `#7A9AB8→#5E80A3`, `#DAE7F1→#CFE0F4`, `#E0EEF9→#DCEBFF`, `#0C447C→#15457B`, `#FAF0DC→#FFF1CC`, `#854F0B→#8A5A00`, `#E8F5E9→#D8EFDF`, `#FBEAF0→#D7E0EC`, `#72243E→#14304D`) across src ts/tsx/css excluding the two whole-file quarantines (`src/app/slot/[id]/opengraph-image.tsx`, `lib/slot-preview.ts`) — all 10 verified 0 outside quarantine. Supplementals: HeroText accent final `font-serif font-semibold text-decorative text-4xl`; advanced skill chip `#D7E0EC`/`#14304D` (tier-mapping bug ships as-is per ruling); FILLING header bg `#FF6A001A` (decorative ~10% alpha); Toast + globals comments cleaned. `tsc --noEmit` clean. **§D final residuals:** slot detail venue `#4A7A9E→#14304D` + footer `#A8C4DB→#9DB8D2`; beginner chip greens `#D8EFDF`/`#246B42` (D8.2 int ramp; tier-mapping bug still ships); globals `--color-inset` reversed to `#E6F0FF` (alias→bg, fixes SlotCard inset white-on-white); SlotCard CTA `hover:brightness-95 active:brightness-90`; HeroText doc comment de-DM-Sans'd (lines 3–4 per ruling **+ line 6** extended to clear the dead-font grep — flagged to Architect). Quarantines untouched: opengraph-image, slot-preview (whole file), §4 avatars.

- **Phase 3B (re-verified)** — a11y: skill AND gender chips both now `role="radiogroup"` + `role="radio"` + `aria-checked` (gender was incorrectly `aria-pressed` in first pass). systemPatterns.md: Known Gotchas section added at `memory-bank/systemPatterns.md`. config.toml: `+15555550198` test_otp added. All raw CP output confirmed.

- **Phase 3B** — onboarding form + sequential writes + D2 landings. New files: `src/app/onboarding/OnboardingForm.tsx` (unified client form: first_name, last_name, skill_level, gender chips; `useActionState`; a11y: `aria-pressed`, `role="alert"`, `aria-invalid`, scroll-to-error), `src/app/onboarding/page.tsx` (Server Component: auth-guard, Flow 3 claim write, slot preview fetch), `src/app/onboarding/actions.ts` (submitOnboardingAction: server-side validation → signup_claim → best-effort join_slot → D2 redirects with `?toast=` params), `src/app/join/page.tsx` (Flow 2′ direct join server component). `HomeClient.tsx` updated to read `?toast=` params on mount (joined/waitlisted/welcomed/cancelled/d9) → Zustand showToast + router.replace('/'). Bug fix migration: `20260610120000_fix_signup_claim_jwt_phone.sql` — GoTrue JWT strips leading `+` from phone; claim_token path in signup_claim was comparing raw JWT phone against E.164 DB phone → always mismatch. Fixed by normalising v_jwt_phone before WHERE. All 7 CPs green. config.toml: +15555550033 (WaitlistBob) added to test_otp.

- **Phase 3A** — player auth UI + server-side D2 router (Amendment B). `/auth` route: phone-entry and OTP-verify screens. `sendOtpAction` stateless (Property 4 — no public.users read). `verifyOtpAction`: SSR session via `@supabase/ssr` server client → reads `public.users` (0 or 1 row) → branches server-side: Flow 3 (claim) → `/onboarding?flow=3`, Flow 2 (new+slot) → `/onboarding?flow=2`, Flow 2′ (returning+slot) → `/join`, Flow 1 (new) → `/onboarding?flow=1`, returning → `/`. Pinned banner (`slot_share_preview` anon read, Dallas-local format) on both screens when `?slotId` present. Locked error copy wired. config.toml: `+15555550199` net-new test-OTP (no `public.users` row). All 6 CPs green.
- **Phase 2** — `/slot/[id]` server-rendered detail page (4 states: FORMING/FILLING/FULL/CANCELLED) + `/slot/[id]/opengraph-image` (1200×630, `runtime=nodejs`, Baloo 2 hero + Nunito Sans body). Shared `slot-preview` lib. All times `America/Chicago` (R2). Anon path only — `slot_share_preview` exclusively; zero identity leak. State flip confirmed at 3/6. `generateMetadata`: absolute `og:image`, `og:title` ≤35 chars, `og:description`. All 5 checkpoints green. Copy fix: FORMING bodyCopy + locked subline; FILLING statusCopy="Filling up", count shown separately, locked subline; "Be first in" and "Spots go fast" deleted.
- **M3.5** — audit-trail migration confirming `ends_at` already in `slot_share_preview` from base; P16c updated to assert `ends_at` + `skill_level`. Full 16-proof battery green.
- **Phase 1** — owner-only create-slot (direct RLS INSERT under `slots_insert_owner`; `created_by = current_user_id()`; Dallas-timezone).
- **Phase 0** — local auth spine (`@supabase/ssr`, local test-OTP, bound dev owner).
- **M3.4** — `slots.skill_level` (4-tier CHECK) + `slot_share_preview` projection.
- **D8.2** — new visual identity (brand palette → app tokens); v1 scope unchanged.

## M4 spine (local-first; cloud is the last step)

Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3A ✅ · Phase 3B ✅ · **Phase 4 (next)** lobby / join / attendance · Phase 5 owner dashboard / cancel · Phase 6 Twilio swap + cloud. **Only Phase 6 is Twilio-gated.**

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
