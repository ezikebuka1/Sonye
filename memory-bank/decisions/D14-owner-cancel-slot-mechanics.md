# D14 — Owner Cancel-Slot Mechanics

**Decided:** 2026-06-15
**Status:** ✅ Decided. Schema implemented in Phase 5 Dispatch 1
(`cancel_slot` RPC + `slot_cancelled` reason code + RLS hardening).
Owner dashboard / cancel-sheet UI is Phase 5 Dispatch 2 (wired to this RPC).
**Related:** D7 (player-leave cancellation reason — distinct from this),
D9 (same-day cap; cancellation frees it via a status transition),
D11 (attendance cron must not text members of a cancelled game),
D13 (all-server player surfaces; mutations via SECURITY DEFINER RPCs),
R1 (non-empty slots immutable), R4 (no client hard-deletes),
R6/R7 (slot-lock-first, re-entrant count trigger).

## The Decision (Option A)

The owner cancels a slot through a new **`cancel_slot(p_slot_id, p_cancellation_reason)`**
SECURITY DEFINER RPC that, in one transaction:

1. Acquires the parent slot lock (`FOR UPDATE`) **first** (R6).
2. Sets `cancelled_at = now()` + `cancellation_reason` on the slot.
3. **Flips every still-active membership** (`status IN ('joined','waitlisted')`)
   to `status = 'left'`, `left_at = now()`, `leave_reason_code = 'slot_cancelled'`.
   Each row's status change fires `trg_sync_slot_counts` (re-entrant under the
   held lock, R7) so `member_count` / `waitlist_count` drive to 0.
4. Does **not** call `promote_from_waitlist` — the slot is dead (the one
   deliberate divergence from `leave_slot` / `kick_member`).

Plus a **column-privilege inversion** that makes this RPC the *only* path able
to write `cancelled_at` / `cancellation_reason`.

## The Problem — why a raw RLS cancel is wrong

Today there is **no** `cancel_slot` function. The only way to cancel is a raw
owner RLS `UPDATE slots SET cancelled_at = now(), cancellation_reason = …`,
which `slots_update_owner`'s `WITH CHECK (… member_count = 0 OR cancelled_at IS
NOT NULL)` actively *permits* even on a full slot. That orphans the memberships:

- **D9 cap stays locked.** Joined members keep `status = 'joined'`, so the
  partial unique index `sm_d9_one_joined_per_day` (WHERE `status='joined'`) still
  holds their same-day slot — they cannot join another game that day for a game
  that will never happen.
- **Counts go stale.** `trg_sync_slot_counts` fires `AFTER INSERT OR UPDATE OF
  status ON session_memberships` only. An UPDATE that touches `slots.cancelled_at`
  fires nothing, so `member_count` / `waitlist_count` stay non-zero.
- **D11 attendance cron still texts them.** The single-use attendance tokens key
  off active memberships; an orphaned `'joined'` row keeps the member in the
  "did you make it?" SMS path for a cancelled game.

A correct cancel must change membership **status** — that is the only thing the
count trigger, the D9 index, and the attendance path all key on.

## Mechanics

### (a) New reason code `'slot_cancelled'`

`sm_leave_reason_code_valid` gains `'slot_cancelled'` (a CHECK can't be amended
in place — DROP + re-ADD). It is a **cancel-only** code: `leave_slot`'s
function-level allow-list (`'schedule_conflict','injured','found_other_game',
'no_longer_available','other'`) is left **byte-for-byte unchanged** so a player
can never self-assign it — exactly as that list already excludes
`'kicked_by_owner'`. Only `cancel_slot` (running as definer) writes it.

### (b) The RPC

Mirrors `kick_member`'s shape: owner-gated (`is_owner()` → `insufficient_privilege`),
reason-required (NULL/blank → clean RAISE, never let it fall to the
`slots_cancellation_consistency` CHECK), R6 slot-lock-first, a double-cancel guard
(`cancelled_at` already set → `object_not_in_prerequisite_state`), the
status-filtered membership flip (the `status IN ('joined','waitlisted')` clause is
mandatory — it must **not** rewrite a legitimate earlier leaver's `left_at` /
reason), no promotion, `RETURN true`. `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE TO
authenticated` (owner is authenticated and gated inside).

### (c) RLS hardening — close the raw-cancel path

**Postgres column-privilege mechanic (load-bearing):** you cannot *subtract* a
column from a blanket table grant. With `authenticated` holding table-level
`UPDATE ON slots`, a `REVOKE UPDATE (cancelled_at, …)` is a silent no-op. To get
per-column control you must **invert**: revoke the table-level UPDATE, then grant
UPDATE on exactly the allowed columns.

- `REVOKE UPDATE ON slots FROM authenticated;`
- `GRANT UPDATE (venue_id, sport_id, starts_at, ends_at, capacity,
  gender_category, skill_level) ON slots TO authenticated;` — the slot's
  owner-editable content columns, **omitting** `cancelled_at` /
  `cancellation_reason` (RPC-only now), `member_count` / `waitlist_count`
  (trigger-managed, never client-written), and `id` / `created_by` / `created_at`
  (identity/audit, never client-written).
- The SECURITY DEFINER `cancel_slot`, running as the table owner, **bypasses**
  this column grant and remains the only path that can set `cancelled_at`.
- Replace `slots_update_owner`: drop the `cancelled_at IS NOT NULL` disjunct →
  `USING (is_owner())`, `WITH CHECK (is_owner() AND member_count = 0)`. With the
  raw-cancel path removed, the disjunct only existed to let an owner edit an
  already-cancelled slot; non-empty slots are otherwise immutable (R1).

## Alternatives rejected

- **Raw RLS `UPDATE cancelled_at`** — the orphan bug above. Rejected.
- **`REVOKE UPDATE (cancelled_at) …` without inversion** — a Postgres no-op
  (column privileges were never granted separately; the table grant wins). Must
  invert.
- **Call `promote_from_waitlist` after the flip** — pointless and wrong on a dead
  slot; would churn a waitlisted member into `'joined'` on a cancelled slot.
  Deliberately skipped.
- **Hard-delete the slot / memberships** — blocked by `ON DELETE RESTRICT` FKs
  and violates R4; also drifts counts (trigger is blind to DELETE). Cancel is a
  soft `cancelled_at` flip.

## Consequences

- `cancel_slot` is the single authority for cancellation; the column inversion
  makes that structurally enforced, not just by convention.
- After cancel: counts are 0, every active member is `'left'` with
  `'slot_cancelled'`, the D9 cap frees for those members, and the attendance path
  no longer sees them.
- A new `cancel_slot()` RPC follows the established grant pattern (REVOKE PUBLIC +
  GRANT authenticated).
- Phase 5 Dispatch 2 (owner dashboard + cancel sheet) wires the UI to this RPC.
