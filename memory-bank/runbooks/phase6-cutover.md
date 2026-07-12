# Sonye — Phase 6 Cloud Cutover Runbook

> **HISTORICAL — superseded; merged by pointer into `cutover.md`.** This is the pre-launch
> **A2P-approval** cutover plan: it assumes the Twilio **Messaging** / 10DLC campaign path
> (Step 3) and waiting on campaign approval. That path is **dead** — the campaign hit a
> structural rejection (30923) and login OTP moved to **Twilio Verify** (no A2P campaign),
> cut over and verified **2026-06-30**. The live, canonical launch-day checklist is
> **`memory-bank/cutover.md`** (Verify swap §1, A2P halt §2, attendance-deferred §3–§4, owner
> binding §5, pre-launch gates §6). Current live state: `activeContext.md` + `progress.md`.
> The steps below are preserved for provenance only — **do not execute them.**

Purpose: the ordered go-live sequence, executed once Twilio A2P is approved. Nothing here runs until that approval lands. Critical-path note: Step 0 (build the D11 dispatcher) is a prerequisite build, not a cutover action — it's your task during the Twilio wait. Steps 1+ are the actual cutover.

## Step 0 — BUILD: D11 SMS dispatcher (prerequisite, do during the Twilio wait)

The D11 database layer (tokens, `attest_attendance`, RLS) is built and proven. The sender is not. Build it before cutover.

* What it does: on a schedule, finds games past `ends_at + 2h` that haven't had confirmations sent, generates each joined player's magic-link token, sends the attendance SMS via the Twilio API (links to `/c/y/[token]` · `/c/n/[token]`), marks them sent.
* Form (your choice — determines creds location):
   * Vercel Cron route → Twilio creds live in Vercel env vars.
   * Supabase Edge Function → Twilio creds live in Supabase Edge Function secrets (cannot read Vercel env).
* Architectural guardrails for the build dispatch (so it fits canon): the send path needs a privileged DB context (it reads rosters + writes tokens across users) — that's the one legitimate service-role use, and it must be a server-only secret, never `NEXT_PUBLIC_*`, never imported into a client file. Idempotency is essential: a dedup marker so a given game's texts send once even if the job runs twice. STOP-compliance: respect opt-outs (GoTrue/Twilio handles STOP at the carrier level, but the dispatcher shouldn't re-text a known opt-out).
* This gets its own spec + Gemini cross-check + verification before it's cutover-ready. Flag when you want to start it.

## Step 1 — Pre-flight: verify cloud owner row (manual SQL, you run it)

Before anything irreversible, confirm the cloud owner row holds your real E.164, not the `+10000000000` placeholder. (Gemini's canon says it was manually set 2026-06-03; this is eyes-on confirmation of a load-bearing assumption I can't see.)

In the Supabase Cloud Dashboard → SQL Editor, run:

```sql
SELECT id, phone, role, auth_user_id, first_name
FROM public.users
WHERE role = 'owner';
```

* PASS: `phone` is your real number, `role = 'owner'`. (`auth_user_id` may be NULL — that's expected; you bind it in Step 5.) → proceed.
* STOP: if `phone` shows `+10000000000`, or there's no owner row → do not continue. The seed swap didn't take; we fix the cloud owner row first (manual `UPDATE` in the dashboard) before any login binding, or first-login creates a net-new user instead of binding the owner.

## Step 2 — Apply schema to cloud (`supabase db push`)

Push applies only new migrations — it will not re-run the m3 seed INSERT, so your real cloud owner row from Step 1 is untouched. The D17 grant-lockdown migration is in this batch and rides along.

```bash
supabase db push
```

* ⛔ NEVER `supabase db reset` against cloud — reset drops and rebuilds the database, which would wipe real data and re-seed the placeholder owner. `db push` only.
* The seed file stays untouched (`+10000000000` placeholder remains, per Seed PII Discipline) — correct and intended; push doesn't run it.
* After push, sanity-check in the dashboard: the migration list shows `20260622120000_grant_matrix_lockdown` applied, and re-run the `has_function_privilege` probe if you want to confirm the matrix landed (anon on exactly `slot_share_preview` + `attest_attendance`).

## Step 3 — Twilio credential swap (two parts)

Real Twilio creds replace the local `config.toml` dummies. `config.toml` is local-only — cloud never reads it — so there's nothing to change in the repo; you're setting creds in two live environments:

Part A — OTP login codes (Supabase Auth):

* Supabase Cloud Dashboard → Authentication → Phone provider (SMS): enter the real Twilio Account SID, Auth Token, and Messaging Service SID. This is what sends login codes via GoTrue.

Part B — D11 attendance texts (the dispatcher from Step 0):

* Set the same Twilio creds where the dispatcher runs — Vercel env vars or Supabase Edge Function secrets, per your Step 0 choice. Plus the service-role key as a server-only secret in that same environment.

## Step 4 — Vercel environment (app config)

In Vercel → Environment Variables (Production), confirm all set:

* `NEXT_PUBLIC_SUPABASE_URL` — the cloud project URL (not local)
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the cloud anon key
* `NEXT_PUBLIC_BASE_URL` = `https://sonye.app` (already set)
* `NEXT_PUBLIC_SUPPORT_PHONE` — optional; only drives the no-show report `sms:` link
* (if D11 is a Vercel Cron route: the Twilio creds + service-role key from Step 3B live here too)

Then redeploy so the app picks up the cloud Supabase values, and confirm the deploy points at `sonye.app`.

## Step 5 — Bind your owner identity (first login)

With the swap live, log into sonye.app once with your real phone. This runs `signup_claim` (D2 Flow 3) and binds your `auth_user_id` to the existing owner row from Step 1 — turning the seeded owner into you.

* This is why Step 1 matters: if the owner row had the placeholder phone, your login wouldn't match it and you'd create a new user instead of binding the owner.

## Step 6 — Smoke test (prod, real SMS)

End-to-end on the live site:

1. OTP login — request a code, receive the Twilio SMS, sign in. (validates Step 3A + Step 4)
2. Owner check — you land as the owner; your curated slots are visible. (validates Step 5)
3. Join flow — from a second test number, join a slot; confirm roster + counts.
4. The wall — joined players see it, post a message.
5. D11 end-to-end — trigger (or wait for) the dispatcher on a past game; confirm the attendance SMS arrives and the `/c/y` · `/c/n` tap records via `attest_attendance`. (validates Step 0 + Step 3B)

## Rollback notes

* Schema (`db push`) is forward-only; there's no clean auto-rollback, which is exactly why Step 1's pre-flight and the prior local `db reset` proof exist — you're applying a battery-verified set.
* If OTP login fails post-swap → re-check Step 3A creds in the Supabase Auth dashboard (most likely a wrong/missing Messaging Service SID).
* If attendance texts don't send → the dispatcher (Step 0) or its creds (Step 3B), not the database — `attest_attendance` is proven, so suspect the sender.
