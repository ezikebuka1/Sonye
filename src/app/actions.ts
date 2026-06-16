'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Outcomes that STAY on Home are returned for the client to act on. 'joined'
// (and the route-only edge cases) never return — the action redirect()s
// server-side, so the caller's awaited value is undefined on those paths.
export type JoinResult =
  | { status: 'waitlisted' }
  | { error: 'collision' | 'cancelled' };

// Flow 2′ — returning user joining from the Home feed. D13 (all-server):
// join_slot is the SOLE authority for joined-vs-waitlisted AND for the D9
// one-game-per-Dallas-day collision (no client short-circuit). We catch its
// RAISEs and map them to the five locked outcomes. Mirrors the redirect
// pattern in join/page.tsx + onboarding/actions.ts; never mutates the DB by
// hand — the join itself is the sanctioned write.
export async function joinSlotAction(slotId: string): Promise<JoinResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('join_slot', { p_slot_id: slotId });

  if (error) {
    const msg = error.message ?? '';
    // D9 collision → stay on Home, error toast; tapped button returns pre-tap.
    if (msg.includes('D9 violation')) return { error: 'collision' };
    // Owner cancelled the slot between render and tap → card locks + toast.
    if (msg.includes('is cancelled')) return { error: 'cancelled' };
    // Shouldn't reach the feed (a joined/waitlisted slot renders In lobby /
    // On the waitlist, not Join). If it does, treat as no-op → route to lobby.
    if (msg.includes('already active in slot')) redirect(`/group-lobby?slotId=${slotId}`);
    // Session lapsed mid-tap → the login wall (page.tsx already guards anon).
    if (msg.includes('not authenticated')) redirect('/auth');
    // Slot vanished / unexpected — bounce home; the re-fetched feed self-heals.
    redirect('/');
  }

  // join_slot RETURNS TABLE(membership_id, resulting_status) → supabase-js
  // hands back the row set as an array; success yields exactly one row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { resulting_status?: string }
    | null
    | undefined;

  if (row?.resulting_status === 'joined') {
    // JOINED → the lobby IS the confirmation (no toast). D2 Amendment B.
    redirect(`/group-lobby?slotId=${slotId}`);
  }

  // WAITLISTED → stay on Home; the client shows the success toast and the
  // card flips to "On the waitlist" via router.refresh() (real membership).
  return { status: 'waitlisted' };
}

// Phase 5 Dispatch 2 — owner cancels one of their own slots from the dashboard.
// Mirrors joinSlotAction's shape EXACTLY: server client (so the owner's
// auth.uid() reaches the SECURITY DEFINER cancel_slot — never the browser
// client), one RPC call, RAISE-message mapping. cancel_slot RETURNS boolean
// (not a table), so success = no error — there is no row to unpack.
export type CancelResult =
  | { ok: true }
  | { error: 'already_cancelled' | 'forbidden' | 'reason_required' | 'unknown' };

export async function cancelSlotAction(
  slotId: string,
  reason: string,
): Promise<CancelResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('cancel_slot', {
    p_slot_id: slotId,
    p_cancellation_reason: reason,
  });

  if (error) {
    const msg = error.message ?? '';
    // Double-cancel race ('cancel_slot: slot % already cancelled') — the slot is
    // already gone; the caller closes the sheet + refreshes (it drops off).
    if (msg.includes('already cancelled')) return { error: 'already_cancelled' };
    // Session lapsed mid-tap → the login wall (the dashboard already guards anon).
    if (msg.includes('not authenticated')) redirect('/auth');
    // is_owner() false ('cancel_slot: owner only') — shouldn't happen from the
    // owner dashboard; defensive.
    if (msg.includes('owner only')) return { error: 'forbidden' };
    // Blank-reason guard ('cancel_slot: cancellation reason required') — the UI
    // already blocks empty reasons; defensive.
    if (msg.includes('reason')) return { error: 'reason_required' };
    // Slot vanished / unexpected — surfaced as a retry toast by the caller.
    return { error: 'unknown' };
  }

  return { ok: true };
}
