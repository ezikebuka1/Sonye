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

## 🔧 Open (non-blocking)

- **Test-fidelity pair** (clean up together, not bugs):
  - P8 drift-injection used `99` (over capacity) — should use a within-capacity value.
  - P1-B stale leg — D17 revoked `anon claim_lookups`, so the old proof now correctly shows
    permission denied; the test expectation is stale, not the code.
- **P2 table-grant lockdown** — 5 RLS-shadowed tables could take explicit grants for
  defense-in-depth. Not exploitable today (RLS covers them); a hardening nicety.
- **e2e/home-feed.spec.ts:169** — stale pre-D20 assertion ("anon GET / redirects to the
  auth wall"); since D20, anon / renders the public feed BY DESIGN. Fails on clean main
  (stash-verified 2026-07-01). Fix: invert to assert the feed renders for anon. Blocks 4
  downstream serial tests.
- **e2e/dashboard-cancel.spec.ts V2** — fixture joins 14 tester phones (+15550000001…011,
  +15550100001…003) never present in seed.sql (baseline = D20 demo users); "2/0" vs "0/0"
  on any fresh reset (stash-verified 2026-07-01). Fix: fixture self-seeds its tester users.
  Blocks V3–V6.

## Notes

- **The duplicated-literal pattern is intentional.** SlotCard and PublicSlotCard share
  visuals by *identical Tailwind classes written in each file*, NOT a shared constant —
  this preserves the D20 isolation boundary (the public surface must not couple to the
  D19-hardened SlotCard). The drift risk (one card changes, the other doesn't) is mitigated
  by RULING #2 discipline + the design folder. Do NOT extract a shared className constant.
- The canonical design reference is `memory-bank/design/` (README quick-ref + area files +
  AMENDMENTS-2026-06-26). `globals.css` `@theme` is runtime token truth.
