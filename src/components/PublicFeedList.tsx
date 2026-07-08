import { createAnonClient } from "@/lib/supabase/anon";
import { formatCentral } from "@/lib/format-central";
import PublicSlotCard from "@/components/PublicSlotCard";

// D22 — the reusable public-feed list, extracted from the old standalone
// public-feed shell (now deleted). Async Server Component — NO 'use client'.
// Owns the anon data path: get_public_feed is the SECURITY DEFINER anon RPC
// (anon has no SELECT on slots, so a table read can't power this). Uses
// createAnonClient() — the anon-surface convention (slot-preview, /auth) — NOT
// the cookie-bound server client; this surface is for visitors with no session.
//
// The consuming page stays force-dynamic, so this render is per-request (live
// feed). Day/time labels are derived SERVER-SIDE via formatCentral (RULING #1),
// same as HomeClient, and passed pre-derived into PublicSlotCard. PublicSlotCard
// is shared-by-import (D20 isolation) — never copied.
//
// The empty-state copy is a PROP so the list carries no hard-coded copy: the
// landing passes its D22 string, and any future consumer passes its own.

// Row shape from get_public_feed (D20). neighborhood is consumed by
// PublicSlotCard (Row 3 -> "venue · neighborhood").
type PublicFeedRow = {
  slot_id: string;
  venue_name: string;
  neighborhood: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  skill_level: "beginner" | "advanced_beginner" | "intermediate" | "advanced";
  gender_category: "open" | "women" | "men";
  fill_count: number | null; // NULL below the 50% threshold (D20 mask)
  fill_shown: boolean;
};

export default async function PublicFeedList({
  emptyCopy,
}: {
  emptyCopy: string;
}) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_public_feed");

  // Safe fallback: an RPC error renders the calm empty state, never a blank or
  // broken screen (the public front door must always show *something* sane).
  if (error) {
    console.error("[public-feed] get_public_feed failed:", error.message);
  }
  const rows: PublicFeedRow[] = error ? [] : ((data ?? []) as PublicFeedRow[]);

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-2xl border-[0.5px] border-card-border p-6 text-center">
        <p className="font-sans text-sm text-steel-aa">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const { dayLabel, timeLabel } = formatCentral(row.starts_at);
        return (
          <PublicSlotCard
            key={row.slot_id}
            slotId={row.slot_id}
            skillLevel={row.skill_level}
            dayLabel={dayLabel}
            timeLabel={timeLabel}
            venueName={row.venue_name}
            neighborhood={row.neighborhood}
            capacity={row.capacity}
            fillCount={row.fill_count}
            fillShown={row.fill_shown}
            genderCategory={row.gender_category}
          />
        );
      })}
    </div>
  );
}
