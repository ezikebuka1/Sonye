// The OUTBOUND fill-count mask for the invite/share voucher text. Mirrors the
// SQL 50% rule EXACTLY: fill is shown iff (member_count / capacity) >= 0.5 —
// see slot_share_preview
// (supabase/migrations/20260520044919_m3_initial_schema.sql:230) and
// get_public_feed (supabase/migrations/20260626120000_get_public_feed.sql:31).
//
// Returns the "N spots left" clause ONLY when at/above the 50% threshold AND the
// slot is not full; null otherwise (below threshold → masked, no count; full →
// no clause). This is the SINGLE hand-rolled threshold for outbound text — do
// not re-derive the 0.5 rule anywhere else (the RPCs own the on-surface mask).
export function spotsClause(memberCount: number, capacity: number): string | null {
  if (capacity <= 0) return null;
  if (memberCount >= capacity) return null; // full → no clause
  if (memberCount / capacity < 0.5) return null; // below 50% → masked, no count
  const left = capacity - memberCount;
  return `${left} spot${left === 1 ? "" : "s"} left`;
}
