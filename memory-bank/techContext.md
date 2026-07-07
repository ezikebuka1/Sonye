# Tech Context

## Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Runtime:** Node.js v25.9.0
- **Python:** 3.13.12
- **Package Manager:** npm
- **Version Control:** Git 2.39.5 + GitHub

## Cursor Plugins
- Superpowers / Frontend Design
- Playwright (E2E testing)
- Context7 (live docs)

## Key Commands
- `npm run dev` — start local server
- `git add <specific files> && git commit -m "…"` — commit only; NEVER `git add .`
  (untracked clutter exists) and NEVER push — Ebuka pushes (HARD RULE #1)

## Gotchas
- Playwright battery is racy run bare: fullyParallel + local workers:undefined runs
  spec FILES concurrently against one mutable DB with shared test phones →
  users_phone_key collisions. CI pins workers:1. Locally: --workers=1 or per-file runs
  (each spec header documents its invocation).
- e2e teardowns don't clear auth.users: throwaway public.users rows are deleted but
  their auth.users rows survive, breaking the next run's dev-login bind (duplicate-
  phone / null-first_name symptoms). Until the e2e-repair dispatch extends teardowns,
  clear stale throwaway auth.users rows before a battery run (never the real owner's).
- Authed payload proofs CAN run on a prod server: the test-OTP allowlist lives in
  GoTrue (config.toml), not /dev-login — sign in via /auth with an allowlisted phone
  under `npm run build && npm start`. Prefer this for payload-grep legs (kills the
  dev-vs-prod caveat).