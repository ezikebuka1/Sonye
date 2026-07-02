import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, { type OwnerSlot } from "./DashboardClient";

// The owner dashboard is per-request (live auth + slot/count state) — never
// cached. Mirrors page.tsx / group-lobby's force-dynamic.
export const dynamic = "force-dynamic";

// Raw DB row from the owner-slots select (venues embedded to-one).
type OwnerSlotRow = {
  id: string;
  starts_at: string;
  capacity: number;
  member_count: number;
  waitlist_count: number;
  skill_level: OwnerSlot["skillLevel"];
  gender_category: "open" | "women" | "men";
  venue_id: string;
  venues: { name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Auth gate — send unauthenticated visitors to the login wall (mirrors
  // create-slot/page.tsx exactly).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Owner gate (UI layer — RLS is the real boundary).
  const { data: isOwner } = await supabase.rpc("is_owner");
  if (!isOwner) {
    return (
      <main className="min-h-screen bg-wash">
        <div className="max-w-[390px] mx-auto px-5 pt-10">
          <p className="font-sans text-error font-medium">
            Access denied — owner only.
          </p>
        </div>
      </main>
    );
  }

  // The owner's public.users.id for the slot filter — current_user_id(), NOT
  // auth.uid() (same resolution create-slot uses for created_by).
  const { data: ownerIdData } = await supabase.rpc("current_user_id");
  const ownerId = (ownerIdData as string | null) ?? null;

  // The owner's own, not-cancelled slots. The lower time bound is PADDED by 2h
  // (NOT a bare `starts_at > now`): a game stays functionally active — and
  // cancellable — until its D11 attendance window opens at starts_at + 2h. A
  // bare future-only filter would drop a 7:00 PM game at 7:00:01 PM, hiding the
  // card from an owner who arrives at an empty court and tries to cancel at
  // 7:02 PM (cancel_slot itself has no time guard — D14). `now - 2h` keeps each
  // slot visible until exactly starts_at + 2h, then it drops.
  const lowerBoundIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: slotData } = await supabase
    .from("slots")
    .select(
      "id, starts_at, capacity, member_count, waitlist_count, skill_level, gender_category, venue_id, venues(name)",
    )
    .eq("created_by", ownerId)
    .is("cancelled_at", null)
    .gt("starts_at", lowerBoundIso)
    .order("starts_at", { ascending: true });

  const rows = (slotData ?? []) as unknown as OwnerSlotRow[];

  const slots: OwnerSlot[] = rows.map((r) => ({
    id: r.id,
    startsAt: r.starts_at,
    venueName: r.venues?.name ?? "",
    skillLevel: r.skill_level,
    capacity: r.capacity,
    memberCount: r.member_count,
    waitlistCount: r.waitlist_count,
  }));

  return <DashboardClient slots={slots} />;
}
