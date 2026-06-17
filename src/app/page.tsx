import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeClient, { type FeedSlot } from "./HomeClient";

// D13: the Home feed is per-request (live auth + slot/membership state) —
// never cached, never streamed. Mirrors /group-lobby's force-dynamic.
export const dynamic = "force-dynamic";

// Raw DB row shape from the slots select (venues embedded to-one).
type SlotRow = {
  id: string;
  starts_at: string;
  capacity: number;
  member_count: number;
  skill_level: FeedSlot["skillLevel"];
  gender_category: FeedSlot["genderCategory"];
  venue_id: string;
  venues: { name: string } | null;
};

type MembershipRow = { slot_id: string; status: "joined" | "waitlisted" };

export default async function HomePage() {
  const supabase = await createClient();

  // Server-side session (D13: all-server). Anon → the login wall. Mirrors
  // /group-lobby's `!user → redirect('/auth?slotId=')`, minus the slot
  // context Home lacks — never flash a broken authed layout to a visitor.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Eligible slots: future starts_at + not cancelled, chronological.
  // `starts_at > now()` compares two absolute instants (both timestamptz) —
  // DST/timezone-safe, no naive-UTC civil-date truncation (D13/R2). RLS
  // `slots_select_authenticated USING (true)` permits the read.
  const nowIso = new Date().toISOString();
  const { data: slotData } = await supabase
    .from("slots")
    .select(
      "id, starts_at, capacity, member_count, skill_level, gender_category, venue_id, venues(name)"
    )
    .is("cancelled_at", null)
    .gt("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  const rows = (slotData ?? []) as unknown as SlotRow[];

  // The viewer's ACTIVE memberships (left_at IS NULL) for these slots, to
  // derive per-card state. The explicit user_id filter is REQUIRED: the dev
  // owner satisfies is_owner(), so sm_select_self_or_owner would otherwise
  // return every member's rows. current_user_id() = public.users.id (the
  // same self-pin the lobby uses).
  const { data: uidData } = await supabase.rpc("current_user_id");
  const uid = (uidData as string | null) ?? null;

  // Owner flag for the owner-only Dashboard nav entry (M5 rider). Same
  // is_owner() RPC the dashboard + create-slot gate on (UI layer; RLS is the
  // real boundary). Non-owners never see the link.
  const { data: ownerFlag } = await supabase.rpc("is_owner");
  const isOwner = ownerFlag === true;

  // The viewer's own profile, for the greeting + onboarding banner (D13 —
  // all-server, no client Supabase). Self-pin on `id` (= current_user_id):
  // the explicit filter is REQUIRED because the owner satisfies is_owner(),
  // so users_select_self_or_owner would otherwise return every row. A blank/
  // unset first_name (e.g. the placeholder dev-owner row) reads as null →
  // fallback greeting + "set up your profile" banner.
  let firstName: string | null = null;
  if (uid) {
    const { data: profile } = await supabase
      .from("users")
      .select("first_name")
      .eq("id", uid)
      .maybeSingle();
    const raw = (profile?.first_name as string | null) ?? null;
    firstName = raw && raw.trim() !== "" ? raw : null;
  }

  const bySlot = new Map<string, MembershipRow["status"]>();
  const slotIds = rows.map((r) => r.id);
  if (uid && slotIds.length > 0) {
    const { data: memData } = await supabase
      .from("session_memberships")
      .select("slot_id, status")
      .eq("user_id", uid)
      .is("left_at", null)
      .in("slot_id", slotIds);
    for (const m of (memData ?? []) as MembershipRow[]) {
      bySlot.set(m.slot_id, m.status);
    }
  }

  const slots: FeedSlot[] = rows.map((r) => ({
    id: r.id,
    startsAt: r.starts_at,
    venueName: r.venues?.name ?? "",
    skillLevel: r.skill_level,
    capacity: r.capacity,
    fillCount: r.member_count,
    genderCategory: r.gender_category,
    membershipStatus: bySlot.get(r.id) ?? null,
  }));

  return (
    <Suspense>
      <HomeClient slots={slots} firstName={firstName} isOwner={isOwner} />
    </Suspense>
  );
}
