# Drift Backlog

Tracked visual/code drift and test-fidelity items. Closed items kept for provenance.

## ✅ Closed (this cycle — card visual cleanup, commits 007be14 → f5fff02)

- **Hero day/time font** — shipped `font-sans` (Nunito), spec wanted `font-serif`
  (Baloo 2). FIXED in both SlotCard + PublicSlotCard. Architect + Claude Design + founder
  all reviewed the real pixels → Baloo 2 kept (Nunito was the drift, not the spec). Rider:
  `tabular-nums` added to the hero so times don't shift width as digits change.
- **CTA tap target** — coral Join CTAs were ~38px (`py-2.5`), under WCAG 44px (amendments
  §D). FIXED: `min-h-[44px]` on the three Join CTAs ("Join game", "Join waitlist",
  "Join this game") + the pending "Joining…" state (so the button doesn't shrink on tap).
  Measured 44px at 390×844. The four D19 terminal/membership footers deliberately LEFT
  (not join CTAs; D19-hardened).
- **Lowercase `sonye` wordmark** — applied across the public feed + `/auth` (replaced the
  capitalized "Sonye" h1). The decision had no prior doc; recorded in AMENDMENTS-2026-06-26.
- **`neighborhood` not wired** — PublicSlotCard didn't consume the RPC's `neighborhood`
  field. FIXED: shown as "{venue} · {neighborhood}" (defensive render — omitted when null;
  prop typed `string | null`). Public-feed only; authed SlotCard untouched.

## ✅ Closed (2026-07-08 — e2e repair + test-infra hardening, one commit)

- **e2e/home-feed.spec.ts anon-`/` assertion** — was the stale pre-D20 "anon / → /auth"
  expectation. FIXED: inverted to assert the D22 landing renders (manifesto heading
  "Join a squad, without the group chat." + the "This week in Dallas" section; URL stays
  `/`, no redirect). Its 4 downstream serial tests unblocked — all green.
- **e2e/dashboard-cancel.spec.ts V2 ("2/0" vs "0/0")** — the fixture referenced 14 filler
  tester phones in its membership seed but never inserted them as `public.users`, so the
  seat JOIN dropped them and counts came out 0. FIXED: the fixture now self-seeds the 14
  fillers as `public.users` rows (no auth binds) and tears them down. V2–V6 green.
- **Harness hazard — parallel phone collision** — `workers: 1` pinned unconditionally in
  playwright.config; the bare `npx playwright test` is now the documented invocation.
- **Harness hazard — auth.users teardown gap** — every fixtured spec's teardown now deletes
  its throwaway `auth.users` rows (hard-coded guard excludes the dev owner), so the battery
  reruns green with NO db reset. Proven by a back-to-back bare run (auth.users stays at
  1 = owner only).

## 🔧 Open (non-blocking)

- **Test-fidelity pair** (clean up together, not bugs):
  - P8 drift-injection used `99` (over capacity) — should use a within-capacity value.
  - P1-B stale leg — D17 revoked `anon claim_lookups`, so the old proof now correctly shows
    permission denied; the test expectation is stale, not the code.
- **P2 table-grant lockdown** — 5 RLS-shadowed tables could take explicit grants for
  defense-in-depth. Not exploitable today (RLS covers them); a hardening nicety.
- **App-wide AA gap (found via D22 design loop):** `steel #5E80A3` fails WCAG AA (4.5:1)
  at body sizes and is used for body-size secondary text on shipped surfaces (feed cards,
  lobby, profile). D22 introduces `steel-aa #4A6B8C` for the landing; migrating existing
  surfaces is a deliberate visual pass — do not drive-by fix.
- **npm-audit baseline (recorded 2026-07-12; post-launch triage):** `npm audit` reports
  **5 vulnerabilities — 1 low, 3 moderate, 1 high**, all in framework/tooling deps, none
  reachable in the shipped bundle:
  - `next` — **high** (App Router advisory cluster: Server-Components DoS, cache-poisoning,
    middleware/proxy bypass, image-optimization DoS, SSRF).
  - `postcss` <8.5.10 — moderate (XSS via unescaped `</style>` in stringify), pulled by `next`.
  - `brace-expansion` 5.0.2–5.0.5 — moderate (ReDoS), via `@typescript-eslint`.
  - `js-yaml` 4.0.0–4.1.1 — moderate (quadratic DoS on merge keys).
  - `@babel/core` <=7.29.0 — low (arbitrary file read via `sourceMappingURL`).
  These are a **pre-existing baseline unrelated to the brand-asset deps** — the `to-ico` stack
  (17 vulns, incl. the deprecated `request` chain) was removed pre-commit at `acfea8f` by
  swapping to `png-to-ico` (adds zero vulns). Triage is **post-launch**; the only real fix is a
  `next` framework bump behind its own dispatch. **`npm audit fix --force` is NEVER to be run**
  (it force-installs `next@16.2.10`, outside the stated dependency range).

## Notes

- **The duplicated-literal pattern is intentional.** SlotCard and PublicSlotCard share
  visuals by *identical Tailwind classes written in each file*, NOT a shared constant —
  this preserves the D20 isolation boundary (the public surface must not couple to the
  D19-hardened SlotCard). The drift risk (one card changes, the other doesn't) is mitigated
  by RULING #2 discipline + the design folder. Do NOT extract a shared className constant.
- The canonical design reference is `memory-bank/design/` (README quick-ref + area files +
  AMENDMENTS-2026-06-26). `globals.css` `@theme` is runtime token truth.
