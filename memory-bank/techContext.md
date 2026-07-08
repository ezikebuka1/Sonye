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
- Playwright battery: `workers: 1` is pinned UNCONDITIONALLY in playwright.config
  (2026-07-08 e2e-repair). The live-session specs share one mutable local DB with
  overlapping throwaway phones, so parallel FILES collided on users_phone_key.
  Serial is now the law → the bare `npx playwright test` is THE documented
  invocation (no --workers flag, no per-file dance). History: was
  `workers: CI ? 1 : undefined`, which raced locally.
- e2e teardowns clear auth.users too (2026-07-08 e2e-repair): every fixtured spec's
  `teardownSql` deletes the throwaway auth.users rows its dev-logins minted (phone
  stored WITHOUT the leading '+') with a hard-coded guard excluding the dev owner
  (+15555550101), so the battery reruns green with NO db reset between runs (proven:
  auth.users stays at 1 = owner across back-to-back runs). History: teardowns were
  public.users-only, so stale auth rows broke the next dev-login bind.
- Authed payload proofs CAN run on a prod server: the test-OTP allowlist lives in
  GoTrue (config.toml), not /dev-login — sign in via /auth with an allowlisted phone
  under `npm run build && npm start`. Prefer this for payload-grep legs (kills the
  dev-vs-prod caveat).