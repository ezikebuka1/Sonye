# D13 — Phase 4 player-surface data architecture (all-server)

**Decided:** 2026-06-14
**Status:** Locked. Architect proposed → Gemini cross-checked → locked 2026-06-14.
**Amends:** D9 — drops the client-side same-day short-circuit.
**Touches:** D2 Amendment C — its stated justification is now orphaned (recorded below; cookie retained, NOT re-litigated).
**Blocks:** Phase 4 Dispatch 1 (DB-backed Home feed), Dispatch 2 (join wiring).

> Numbering note: assumed next-free decision number (D12 is the deferred v2 public-browse surface). Confirm against the register and rename if it collides.

## Context

The "wire the Home Join" dispatch hit a structure mismatch on read-only recon (Code, zero edits):

- The Home feed is 100% mock — `slot_a..slot_d`, hardcoded string IDs (`mockData` → Zustand); `onJoin` is a mock in-memory mutation. No DB slots, no real UUIDs, so `join_slot` can't be called on these.
- Zero client-side Supabase in the app: the browser client (`client.ts`) exists but has no importers. Every real `join_slot` today is server-side (`join/page.tsx`, `onboarding/actions.ts`). The already-built lobby and attendance are also server-side.
- DB read policies already support a real feed: `slots_select_authenticated USING (true)`; `sm_select_self_or_owner`. No schema/RLS change needed — the gap is purely app-side wiring.

Joining real slots therefore requires a DB-backed Home feed first.

## The decision

Build all Phase 4 player surfaces **server-side**. No client-side Supabase.

1. **Feed.** `page.tsx` is a Server Component. It fetches the session, the eligible slots, and the user's per-slot membership state server-side (server Supabase client), and passes them to `HomeClient` as props. `HomeClient` renders; it does not fetch.

2. **Join.** `HomeClient`'s `onJoin` calls a Server Action (consistent with D2 Amendment B's locked Server Actions). The action runs `join_slot` server-side, catches its RAISEs, and returns a typed outcome. The client does the UX from that outcome: route to lobby (joined), success toast + stay (waitlisted), error toast + stay (collision), error toast + in-place card-lock (cancelled).

3. **The D9 client-side same-day short-circuit is dropped.** D9 designated it "UX speed only, not for security; server authoritative." `join_slot` RAISEs the collision authoritatively; the Server Action catches it and flips the toast. Cost: the collision surfaces after a brief "Joining…" round-trip rather than instantly — accepted for the large reduction in state complexity (no parallel client-side membership read to maintain).

## D2 Amendment C — orphaned premise (recorded, not re-litigated)

Amendment C kept the session cookie non-HttpOnly specifically because "lobby roster, join, attendance lean on client-side reads in Phases 4+." Those surfaces were built (lobby, attendance) or are now being built (join) entirely server-side, so that justification no longer holds. Per Amendment C's own "Settled — do not re-litigate," the cookie stays at the library default for forward-compatibility: if client-side Supabase is ever stood up later (optimistic UI, real-time feed), the cookie is already correct. We are **not** changing the cookie — only recording that its premise shifted.

## Feed scope (locked with Gemini)

- **Eligible slots:** upcoming + non-cancelled, ordered by the existing `sortSlotsForHome`.
- **"Upcoming" is evaluated against the Dallas civil date (`America/Chicago`), never naive UTC** (R2). A slot earlier today in Central time is past; UTC rollover must not leak a stale or premature boundary.
- **50% fill rule (D8.2)** governs the social-proof display — count/avatars shown only at ≥50% of the group size (6).
- **Per-card button state** derives from capacity (group size 6) and the user's **active** membership row (status set AND not left/completed — see note):
    - no active row + `< 6` joined → primary "Join"
    - no active row + `6` joined (full) → waitlist CTA *(copy unlocked — open item)*
    - active row `status = 'joined'` → "In lobby" status, links to the lobby
    - active row `status = 'waitlisted'` → "On the waitlist" status
  - *Active-membership note:* the check is for active memberships only. A slot the user has left or completed reverts the card to "Join". Leave is M5, so this is forward-correctness, not yet exercisable in Phase 4 — but the query is written for it.
- **Anon / no-session at `/`:** `slots_select_authenticated` returns 0 rows for an unauthenticated request. The Server Component must handle `!session` cleanly (redirect to the auth wall, or an anon-friendly empty state) so it never flashes a broken/empty layout.

## Open item (pre-Dispatch-1)

The full-slot waitlist button copy and the four card button-state visual treatments are player-facing and unlocked. Per Sketches-Before-Code, the architect sketches the four states (Join / waitlist-CTA / In lobby / On the waitlist) and locks the waitlist-CTA copy **before** Dispatch 1 is authored.

## Dispatch split (locked)

- **Dispatch 1 — DB-backed Home feed.** Real slots render with correct per-card button states; `sortSlotsForHome` + the 50% fill rule + the `America/Chicago` "upcoming" boundary proven; anon path handled. Proof: raw Playwright/DOM output showing real DB rows, not Zustand mocks.
- **Dispatch 2 — Join wiring.** The five outcomes + the mandatory `slots.member_count` vs `count(*) FILTER (WHERE status='joined')` integrity proof.

---

## Recording & verification note (Code, 2026-06-14)

Recorded to the working tree as the decision-doc artifact (Two-Commit discipline: this commits separately from any implementation). **Not committed or pushed by Code — Ebuka reviews and commits.**

**Numbering — resolved.** D13 is **free** (no collision; verified against every file in `memory-bank/decisions/`). The number stands. ⚠️ Correction to the numbering note above: the parenthetical "(D12 is the deferred v2 public-browse surface)" is inaccurate. The real **D12** is the `slots.skill_level` corrective schema patch ([D12-slot-skill-level.md](./D12-slot-skill-level.md), DECIDED 2026-06-04, migration `20260604050433_m3_4_slot_skill_level.sql`). The deferred-v2 **public-browse `/games` surface is unnumbered** — it lives in `v2-signals.md` (V2 Signal Log), not as a D-number. D13 remains the correct next-free top-level number (D4 and D6 are also historically vacant).

**Context + decision claims — adversarially re-verified against the live codebase (all confirmed):**
- *App-side:* Home feed is 100% mock (`slot_a..slot_d` in `mockData.ts` → Zustand `store.ts` → `HomeClient.tsx`; `onJoin` = in-memory `joinSlot` + `setTimeout`, no DB); `page.tsx` is a non-async Server Component wrapping `<HomeClient/>` in `<Suspense>` with no fetch; the browser client `lib/supabase/client.ts` has **zero importers**; the only two `join_slot` call sites are `join/page.tsx:18` and `onboarding/actions.ts:59` (both via the server client); `group-lobby` + `c/` attendance are server-side.
- *DB-side:* `slots_select_authenticated ... USING (true)` and `sm_select_self_or_owner` (a non-owner is restricted to their own rows via `current_user_id()`); `join_slot(p_slot_id uuid) RETURNS TABLE(membership_id uuid, resulting_status text)`, `'joined'` when `member_count < capacity` else `'waitlisted'`; RAISE messages contain `'is cancelled'` (ERRCODE `object_not_in_prerequisite_state`) and `'D9 violation'` (ERRCODE `unique_violation`); `sync_slot_counts` recomputes `member_count = count(*) FILTER (WHERE status='joined')`; D9 civil date = `(starts_at AT TIME ZONE 'America/Chicago')::date`.

**Schema facts Dispatch 1 must honor (verified):**
- DB `slots` use **`starts_at timestamptz`** (+ `ends_at`), **not** the mock's `day_of_week`/`time_label`. The feed must derive day/time labels from `starts_at` in `America/Chicago`, and apply the "upcoming" boundary as `(starts_at AT TIME ZONE 'America/Chicago')::date` to stay consistent with `join_slot`'s D9 rule. (The existing `sortSlotsForHome` sorts the mock shape; an equivalent ordering over real `starts_at` is needed.)
- **`slots.skill_level` exists** (added by D12's migration; CHECK = the four tiers), so the card's skill badge is backed. `slot_share_preview(uuid)` already projects `skill_level` + the 50%-gated `fill_count`, but it is **single-slot** (anon path); the multi-slot authed feed reads `public.slots` directly under `slots_select_authenticated` (join venues/sports), plus a per-user membership read under `sm_select_self_or_owner`.

**Cross-references wired (this decision-doc change):**
- [D9-concurrent-join-policy.md](./D9-concurrent-join-policy.md) — breadcrumb under the M4-enforcement bullets: the client-side same-day short-circuit is dropped; `join_slot`'s RAISE is the sole same-day guard.
- [D2-auth-flow.md](./D2-auth-flow.md) — breadcrumb at the end of Amendment C: the client-side-reads premise is orphaned; cookie retained, not re-litigated.

**Gate:** Dispatch 1 is **blocked** on the Open item (architect sketches the four card states + locks the waitlist-CTA copy) before its dispatch is authored. Code has authored neither Dispatch 1 nor Dispatch 2; awaiting the Dispatch 1 spec.
