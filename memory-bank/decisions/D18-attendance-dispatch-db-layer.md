# D18 — Attendance-Dispatch DB Layer (D11 sender prerequisite)

## Decision
Add the DB layer the D11 attendance-SMS dispatcher needs, as a service_role-only surface:
(1) a per-membership dedup column session_memberships.attendance_sms_sent_at timestamptz,
(2) a SECURITY DEFINER RPC claim_attendance_dispatch(p_slot_id uuid) that atomically mints
the attendance token + 48h expiry + stamps sent_at on not-yet-sent JOINED rows of an eligible
past slot, and returns those rows for sending. The dispatcher (B2) calls this; the app never does.

## Why
Recon (read-only, against live schema) established three facts that shaped this:
1. attest_attendance consumes session_memberships.attendance_token gated by
   attendance_token_expires_at > now(); NO writer exists anywhere — the mint side is net-new.
2. slot_roster CANNOT serve the dispatcher: it redacts phone to is_owner() and gates its whole
   WHERE on current_user_id()→auth.uid(), so a headless service caller gets ZERO rows + NULL
   phones. The dispatcher needs a dedicated service_role read.
3. NO dedup state exists — attended records a tap result, not that a send happened. Nothing
   makes sending idempotent; a double-fire would re-text. Hence the sent_at column.

## Design
- Dedup is per-membership (tracks individual delivery), bounded by a slot-level temporal window
  so a game's roster is structurally closed for automation once it ages out.
- Eligibility window: ends_at < now() - 2h (game done, matches D15 grace) AND
  ends_at > now() - 26h (survives a missed cron cycle; never texts about a >1-day-old game)
  AND cancelled_at IS NULL (cancel_slot already flipped memberships to 'left'; also excluded by
  the status='joined' filter).
- R6 lock hierarchy: the RPC acquires the parent slots row FOR UPDATE before touching
  session_memberships — same ordering as join_slot/leave_slot/cancel_slot, so it cannot deadlock
  against a concurrent cancel_slot.
- Idempotency is in the DB: mint+stamp+return in one UPDATE…RETURNING over rows WHERE
  attendance_sms_sent_at IS NULL. A second call finds nothing to claim → returns zero rows. Safe
  under concurrent double-fire, not just sequential.
- Grants: service_role only. REVOKE EXECUTE FROM PUBLIC, anon, authenticated (honors the D17
  matrix). Token convention mirrors claim_token: bare uuid, partial-unique-where-not-null,
  app-minted, NULLed on consume by attest_attendance.

## Open/related (NOT in this dispatch)
- join_slot accepts joining past (non-cancelled) slots — a real defect (no now() guard on
  starts_at/ends_at), logged for a separate isolated migration. B1's window is the
  defense-in-depth that contains the texting path regardless.

## Verification
Fresh local db reset + battery: dedup proven (second claim returns zero rows), R6 lock present,
window excludes too-old/too-recent/cancelled, waitlisted/left excluded, minted tokens satisfy
attest_attendance, and has_function_privilege(anon/authenticated)=false.
