# D17 — Function EXECUTE Grant Matrix Lockdown

## Decision
Pin every custom public function's EXECUTE privilege explicitly in one migration: revoke
EXECUTE from PUBLIC, anon, authenticated on all 19, then grant back per the matrix. service_role
is left untouched (trusted admin role). Replaces the un-versioned default-ACL posture (anon
held EXECUTE on all 19) with a repo-pinned matrix cloud reproduces exactly.

## Why
Audit found anon held EXECUTE on all 19 via pg_default_acl, never stripped by any migration —
the `TO authenticated` whitelist was silently defeated. Not exploitable today (functions
self-gate), but the grant is the missing second layer, and cloud parity was non-deterministic.

## The matrix (grounded in the live pg_proc + pg_policies enumeration)
A — KEEP anon + authenticated (only unauthenticated entry points):
  slot_share_preview, attest_attendance
B — authenticated-only (revoke anon):
  slot_roster, slot_wall, slot_social_proof, join_slot, leave_slot, kick_member, cancel_slot,
  owner_delete_message, signup_claim, is_owner, is_joined_member, current_user_id
C — internal-only (revoke anon AND authenticated; definer/service_role only):
  promote_from_waitlist, sync_slot_counts, is_active_member, slot_fill_meets_social_threshold,
  claim_lookups

## Load-bearing findings that set the buckets
1. attest_attendance MUST keep anon — the unauthenticated /c/y, /c/n routes call it with the
   anon key (migration #6 grants it explicitly; there is NO service-role key in src/ — the
   documented service.ts bypass was a ghost). Revoking anon breaks D11 attendance.
2. Policy-helpers (is_owner, is_joined_member, current_user_id) do NOT need anon — every RLS
   policy is scoped `TO authenticated`, so anon hits default-deny WITHOUT evaluating the policy
   expression and never invokes them. They keep authenticated, lose anon.
3. is_active_member is in zero policies (D10-B swapped chat policies to is_joined_member) →
   internal-only, not a policy-helper.

## Verification
Full battery on a fresh local apply must pass — Proof 1 (anon zero-row reads, not permission
denied), Proof 12 (attest_attendance legs), Proof 8 (trigger still fires post-revoke),
slot_share_preview anon-caller proof — plus a has_function_privilege probe confirming anon only
on A, authenticated on A+B, neither on C.
