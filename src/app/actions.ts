'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Outcomes that STAY on Home are returned for the client to act on. 'joined'
// (and the route-only edge cases) never return — the action redirect()s
// server-side, so the caller's awaited value is undefined on those paths.
export type JoinResult =
  | { status: 'waitlisted' }
  | { error: 'collision' | 'cancelled' | 'started' };

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
    // D19: the game already started/ended between render and tap → card locks
    // in place with the "Already started" footer + error toast (like cancelled).
    if (msg.includes('already started')) return { error: 'started' };
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

// M5 (D16) — a JOINED player leaves one of their own games from the group
// lobby. Mirrors cancelSlotAction's shape EXACTLY: server client (so the
// player's auth.uid() reaches the SECURITY DEFINER leave_slot — never the
// browser client), ONE rpc call, RAISE-message mapping. leave_slot RETURNS
// boolean (not a table), so success = no error — there is no row to unpack.
//
// UI-only dispatch: the reason code (found_other_game), the note column
// (leave_reason_note), and full-slot/locked leaving ALL already exist in the
// live leave_slot definition — verified. No schema change. The chip code and
// the optional note are stored SEPARATELY (p_leave_reason_code coded,
// p_leave_reason_note free text) — NOT composed into one string like
// cancel_slot's cancellation_reason.
export type LeaveReasonCode =
  | 'schedule_conflict'
  | 'injured'
  | 'found_other_game'
  | 'no_longer_available'
  | 'other';

export type LeaveResult =
  | { ok: true }
  | { error: 'not_joined' | 'not_found' | 'invalid_reason' | 'unknown' };

export async function leaveSlotAction(
  slotId: string,
  reasonCode: LeaveReasonCode,
  note?: string,
): Promise<LeaveResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('leave_slot', {
    p_slot_id: slotId,
    p_leave_reason_code: reasonCode,
    // Empty/whitespace note → NULL (the column is nullable; never store "").
    p_leave_reason_note: note?.trim() || null,
  });

  if (error) {
    const msg = error.message ?? '';
    // Session lapsed mid-tap → the login wall (the lobby already guards anon).
    // ('leave_slot: not authenticated')
    if (msg.includes('not authenticated')) redirect('/auth');
    // Already left / never joined ('leave_slot: no active membership in slot %')
    // — treated as already-resolved by the caller (close + refresh).
    if (msg.includes('no active membership')) return { error: 'not_joined' };
    // Slot vanished ('leave_slot: slot % not found') — defensive.
    if (msg.includes('not found')) return { error: 'not_found' };
    // Reason outside the allow-list ('leave_slot: invalid or reserved leave
    // reason: %') — the picker only offers valid codes; defensive.
    if (msg.includes('invalid or reserved leave reason')) return { error: 'invalid_reason' };
    // Unexpected — surfaced as a retry toast by the caller.
    return { error: 'unknown' };
  }

  return { ok: true };
}

// D10-B — post a message to the lobby wall. Used by BOTH the free-text composer
// AND the canned chips (each chip sends a fixed body). The wall is gated to
// joined members + host in the UI, but this action NEVER trusts that: the RLS
// WITH CHECK (is_joined_member AND user_id = current_user_id()) is the real
// write boundary, and the ends_at + 2h necro-guard below rejects late posts
// even if a caller reaches the action past the hidden UI.
export type PostMessageResult =
  | { ok: true }
  | { error: 'empty' | 'too_long' | 'closed' | 'not_joined' | 'unknown' };

// Mirror the DB CHECK (length(body) <= 2000) so an over-long body is a clean
// app-level reject, not a Postgres constraint error.
const WALL_BODY_MAX = 2000;
const WALL_GRACE_MS = 2 * 60 * 60 * 1000; // chat closes 2h after ends_at

export async function postLobbyMessageAction(
  slotId: string,
  body: string,
): Promise<PostMessageResult> {
  const supabase = await createClient();

  const text = body.trim();
  if (!text) return { error: 'empty' }; // DB CHECK length(btrim(body)) > 0
  if (text.length > WALL_BODY_MAX) return { error: 'too_long' };

  // NECRO-POST GUARD: re-fetch ends_at and reject anything past ends_at + 2h —
  // insert NOTHING. slots_select_authenticated USING (true) permits the read.
  const { data: slot } = await supabase
    .from('slots')
    .select('ends_at')
    .eq('id', slotId)
    .maybeSingle();
  if (!slot) return { error: 'unknown' }; // bad/vanished slot id
  const endsAtMs = new Date((slot as { ends_at: string }).ends_at).getTime();
  if (Date.now() > endsAtMs + WALL_GRACE_MS) return { error: 'closed' };

  // The insert needs user_id = current_user_id() for the RLS WITH CHECK.
  const { data: uidData } = await supabase.rpc('current_user_id');
  const uid = (uidData as string | null) ?? null;
  if (!uid) redirect('/auth'); // session lapsed mid-post

  const { error } = await supabase
    .from('chat_messages')
    .insert({ slot_id: slotId, user_id: uid, body: text });

  if (error) {
    // The only expected failure once the guards pass is the RLS WITH CHECK
    // rejecting a non-joined poster (the wall hides the composer from non-
    // members, so this is the bypass case — e.g. a waitlister or the host who
    // is not also a joined player). 'new row violates row-level security'.
    if ((error.message ?? '').includes('row-level security')) return { error: 'not_joined' };
    return { error: 'unknown' };
  }

  return { ok: true };
}

// D10-B — host removes a wall message. Mirrors cancelSlotAction's shape: server
// client (so the owner's auth.uid() reaches the SECURITY DEFINER RPC), one RPC
// call, RAISE-message mapping. owner_delete_message is the ONLY delete path
// (no DELETE policy on the table); its is_owner() gate is the authority — this
// action never trusts the UI's host-only gate.
export type RemoveMessageResult =
  | { ok: true }
  | { error: 'forbidden' | 'unknown' };

export async function removeLobbyMessageAction(
  messageId: string,
): Promise<RemoveMessageResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('owner_delete_message', {
    p_message_id: messageId,
  });

  if (error) {
    const msg = error.message ?? '';
    // Session lapsed mid-tap → the login wall.
    if (msg.includes('not authenticated')) redirect('/auth');
    // is_owner() false ('owner only' / insufficient_privilege) — a non-host
    // reached the RPC; the gate rejected BEFORE any delete.
    if (msg.includes('owner only')) return { error: 'forbidden' };
    return { error: 'unknown' };
  }

  return { ok: true };
}
