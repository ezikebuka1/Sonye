# Cutover Runbook — Sonye v1 Go-Live

**Purpose:** the single checklist for launch day. Everything that must happen at
go-live (and nothing that happens before) lives here, so cutover isn't
reconstructed from scattered notes.

**Status:** auth cutover **DONE + verified 2026-06-30** (see §1). The only thing left
before public launch is the recommended attorney review (§6). No remaining feature work.

---

## §1 — Twilio Verify swap (login OTP) — ✅ DONE (2026-06-30)

**Status: COMPLETE — 2026-06-30.** Provider swapped Messaging → Verify in the Supabase
Cloud dashboard — zero code, exactly as recon predicted. Both smoke-test legs verified
against the live cloud DB via raw output:
- **Returning owner login (Path A):** owner row `auth_user_id` flipped NULL → bound and
  linked to a real `auth.users` row — proves the `+`-normalization round-trips under Verify.
- **Net-new cold signup (Path D):** fresh number → new `role='player'` row, bound to its
  new auth UID on the spot, onboarding fields persisted.
Local dev confirmed unaffected (test-OTP short-circuit). Post-validation cleanup: test
player + its orphaned Auth identity removed; owner's vestigial `claim_token` nulled. Cloud
state: one owner row (bound, token-free) ↔ one Auth identity. (Historical steps below.)

**What:** switch login OTP delivery from Twilio **Messaging** → Twilio **Verify**.

**Why:** the A2P 10DLC campaign hit structural rejection **30923** — Sonye's login
*is* SMS (OTP is the only auth), so "agree to receive texts" is unavoidably bundled
with "use the app," which 30923 prohibits. No wording fix resolves it. **Twilio
Verify needs NO A2P campaign at all** (OTP/2FA is exempt). Recon confirmed
(2026-06-26) this is a **provider swap with ZERO code change** — GoTrue's
`signInWithOtp`/`verifyOtp` contract and the JWT `phone` claim are unchanged, so
`signup_claim` and all `src/` code keep working.

**Steps (CLOUD ONLY — do NOT touch config.toml's local dummy / `test_otp` blocks):**
1. Twilio Console → create a **Verify Service** → copy the **Verify Service SID**
   (`VA…`).
2. Supabase Cloud Dashboard → **Authentication → Providers → Phone (SMS)**: switch
   the Twilio provider from **Messaging Service SID (`MG…`)** → **Verify Service SID
   (`VA…`)**.
3. **Smoke test on the live env** (real phone):
   - Request code → receive via Verify → verify → confirm a session is minted.
   - Confirm `signup_claim` binds the owner row (exercises the `+`-normalization
     path — GoTrue strips the leading `+`, the migration re-adds it).
   - Test **BOTH** a net-new signup **and** a returning login.
4. Confirm **local dev still works unchanged** (the `test_otp` map short-circuits
   before any provider call — no real Twilio involved locally).

**Why no build:** confirmed by read-only recon — login goes exclusively through
`supabase.auth.signInWithOtp` / `verifyOtp`; the only Twilio call in `src/` is the
DEFERRED attendance dispatcher (`src/lib/sms/transport.ts`), which the login path
never touches. The `+`-normalization (`20260610120000_fix_signup_claim_jwt_phone.sql`)
operates on the JWT `phone` claim, which GoTrue mints regardless of provider.

---

## §2 — HALT A2P campaign efforts — REQUIRED (do this now, not at launch)

- **Stop all A2P 10DLC campaign submissions.** The campaign is abandoned in favor
  of Verify (§1).
- **Do NOT appeal 30923.** Appealing as "2FA-only," then later sending attendance
  traffic, = carrier blocking + fines (the campaign would be approved for one use
  case and used for another). Clean separation is the safe path.

---

## §3 — D11 Attendance SMS — DEFERRED to v1.1 (do NOT enable at launch)

The post-game attendance confirmation feature stays **dormant** for v1.

- **Already built + safely parked:** the `/c/y` and `/c/n` attendance routes, the B2
  cron dispatcher (`src/app/api/cron/attendance/route.ts`), the transport
  (`src/lib/sms/transport.ts`), and the D18 DB layer all exist and are inert.
- **Do NOT enable the attendance cron at launch** (see §4 — the scheduled workflow
  is NOT created for v1).
- **v1.1 path:** attendance SMS is the ONLY message type that needs A2P 10DLC.
  Register it then as its own **clean, optional, post-launch campaign** — with a
  real opt-in that's separate from mandatory login (which is exactly why it was
  bundling-rejected as part of login). Once it's its own campaign, the 30923
  bundling problem doesn't apply.

---

## §4 — Attendance cron (GitHub Actions) — DEFERRED with §3

- Vercel Hobby rejects sub-daily crons; `vercel.json` is `{}` (no Vercel cron).
- The plan was a free **GitHub Actions scheduled workflow** to `curl` the dispatcher
  route hourly using the `CRON_SECRET` bearer.
- **NOT created for v1** — it only matters once attendance SMS is live (§3). When
  v1.1 turns attendance on, create the scheduled workflow then.

---

## §5 — Owner auth binding — verify at launch

- Owner identity binds via the `signup_claim` flow once SMS auth is live. At cutover,
  confirm the owner's `auth_user_id` is correctly bound after the first real login
  (part of the §1 smoke test — the owner row in `seed.sql` is phone `+15555550101`
  locally; the real owner number binds in cloud).

---

## §6 — Pre-launch gates (NOT cutover, but must be done before §1)

Tracked elsewhere; listed here so launch isn't triggered with these open:
- **Public feed + merged `/auth`** shipped + pushed (the front door — `get_public_feed`
  RPC, `PublicSlotCard`, and the `page.tsx` routing split are all live on `main`).
- **Legal docs published** (Privacy + Terms) — gated on the lobby-wall UI deploy and
  the safety-persistence amendment, per their own tracking.
- **Licensed Texas attorney review** of the release/arbitration language (recommended
  before public launch).

---

## Quick launch-day sequence
1. (Pre-done) §6 gates cleared.
2. §1 — swap Messaging SID → Verify SID in Supabase cloud; smoke-test real login.
3. §5 — confirm owner binding on first real login.
4. Confirm §3/§4 stay OFF (attendance not enabled).
5. Go live.
