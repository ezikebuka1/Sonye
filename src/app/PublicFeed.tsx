import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";
import { formatCentral } from "@/lib/format-central";
import PublicSlotCard from "@/components/PublicSlotCard";

// The logged-out front door at / (D20 + the 2026-06-26 design amendments B).
// Async Server Component — NO 'use client'. Anon data path: get_public_feed is
// the SECURITY DEFINER anon RPC (anon has no SELECT on slots, so a table read
// can't power this). We use createAnonClient() — the established anon-surface
// convention (slot-preview, /auth) — NOT the cookie-bound server client; this
// surface is for visitors with no session. (createAnonClient is SYNC, no await.)
//
// page.tsx stays force-dynamic, so this render is per-request (live feed). Day/
// time labels are derived SERVER-SIDE here via formatCentral (RULING #1), same
// as HomeClient, and passed pre-derived into PublicSlotCard.

// Row shape from get_public_feed (D20). neighborhood is in the projection and
// is now consumed by PublicSlotCard (Row 3 → "venue · neighborhood", §B).
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

export default async function PublicFeed() {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_public_feed");

  // Safe fallback: an RPC error renders the calm empty state, never a blank or
  // broken screen (the public front door must always show *something* sane).
  if (error) {
    console.error("[public-feed] get_public_feed failed:", error.message);
  }
  const rows: PublicFeedRow[] = error ? [] : ((data ?? []) as PublicFeedRow[]);

  return (
    <main className="min-h-screen bg-wash">
      <div className="max-w-[390px] mx-auto px-5 pt-6 pb-12 space-y-5">
        {/* Header: lowercase `sonye` wordmark + `dallas` pill · outlined Log in
            (nav affordance — this stays "Log in", NOT the game CTA). */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-2xl text-ink lowercase">sonye</span>
            <span className="bg-card border border-card-border rounded-full px-2.5 py-0.5 font-sans text-xs font-medium text-ink-soft">
              dallas
            </span>
          </div>
          <Link
            href="/auth"
            className="border border-ink text-ink rounded-xl px-4 py-2 font-sans font-medium text-sm"
          >
            Log in
          </Link>
        </header>

        {/* Intro */}
        <div className="space-y-1.5">
          <h1 className="font-serif font-bold text-3xl text-ink leading-tight">
            Upcoming pickleball games
          </h1>
          <p className="font-sans text-sm text-[#4A6E92]">
            Curated games at Dallas courts. Pick a slot, verify your phone, and join.
          </p>
        </div>

        {/* Feed (5 demo slots: 2 button-only sub-50%, 3 dots+count) or the
            empty state when get_public_feed returns 0 rows. */}
        {rows.length > 0 ? (
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
        ) : (
          <div className="bg-card rounded-2xl border border-[0.5px] border-card-border p-6 text-center space-y-2">
            <p className="font-serif font-bold text-lg text-ink">No open games right now</p>
            <p className="font-sans text-sm text-ink-soft">
              New Dallas pickleball slots are posted a few days ahead. Check back for Cole,
              Churchill, and Lake Highlands North games.
            </p>
            <p className="font-sans font-semibold text-sm text-ink">Games lock at 6 players.</p>
          </div>
        )}

        {/* Footer: policy links (public, reachable unauthenticated). */}
        <footer className="pt-2 text-center font-sans text-xs text-[#4A6E92]">
          <Link href="/privacy" className="underline">Privacy</Link>
          <span className="mx-2" aria-hidden="true">·</span>
          <Link href="/terms" className="underline">Terms</Link>
        </footer>
      </div>
    </main>
  );
}
