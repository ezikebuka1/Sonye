"use client";

import { MapPin } from "lucide-react";
import PickleballIcon from "@/components/icons/PickleballIcon";
// RULING #3: reuse SkillLevel + the skillBadge ramp from SlotCard by NAMED
// import — do NOT re-implement the ramp and do NOT touch SlotCard's default
// export. (SlotCard is a client module; this card is "use client" so the
// import resolves to the real object, not a server client-reference proxy.)
import { skillBadge, type SkillLevel } from "@/components/SlotCard";

type GenderCategory = "open" | "women" | "men";

// The logged-out / public-feed slot card (D20 + the 2026-06-26 design
// amendments). RENDER-ONLY: anon has no membership, so there are no join /
// waitlist / cancelled / started / pending states here — the single CTA is a
// navigation to /auth (phone sign-in), never a join Server Action. Keeping it
// separate from SlotCard isolates the public surface from Phase-4 membership +
// D19 terminal state (the D20 scope boundary), so SlotCard is untouched.
//
// RULING #2 (anti-drift, CRITICAL): everywhere this card shares a visual with
// SlotCard it uses the SAME Tailwind class by reference (never a re-hardcoded
// hex) — that is what prevents re-introducing the #D4724A / #EE5E00 coral drift.
// The ONLY deliberate departures (design-folder values, intentional):
//   • icon is w-6 (SlotCard ships w-7), same #FF6A00 color class
//   • Row-1 sport label is uppercase 11px #4A6E92 (the a11y small-text blue)
//   • CTA label "Join this game" + a "phone sign-in required" helper line
//   • CTA target is /auth?slotId=… (the Flow-2 "you're joining" banner), NOT a join
//   • fill display is a capacity meter (filled/empty dots) + "x/n filled · k left"
type PublicSlotCardProps = {
  slotId: string;
  skillLevel: SkillLevel;
  // RULING #1: derived server-side in PublicFeed via formatCentral(starts_at),
  // exactly as HomeClient does — so the hero reads "Sat, Jul 18 · 8:00 AM".
  dayLabel: string;
  timeLabel: string;
  venueName: string;
  capacity: number;
  // D20 50% fill mask: the RPC returns member_count ONLY at ≥50% of capacity,
  // else NULL (anon never receives a sub-threshold count — "silence beats a
  // small number"). fillShown mirrors that as a boolean. Below threshold we
  // render NO social proof at all (the 50% rule wins over "always show dots").
  fillCount: number | null;
  fillShown: boolean;
  genderCategory: GenderCategory;
};

// Capacity-meter dot colors (intentional difference — design amendment B). The
// pre-join feed is gender-neutral (avatar color is lobby-only, D7.3): filled =
// slate, empty = a pale ring. These are design-folder values, not SlotCard
// tokens, so they are arbitrary-value classes by design.
const DOT_FILLED = "#5E80A3"; // slate (== steel)
const DOT_EMPTY_RING = "#C4D5E8";

export default function PublicSlotCard({
  slotId,
  skillLevel,
  dayLabel,
  timeLabel,
  venueName,
  capacity,
  fillCount,
  fillShown,
  genderCategory,
}: PublicSlotCardProps) {
  const badge = skillBadge[skillLevel];
  // Only render social proof when the data layer un-masked the count (≥50%).
  const showFill = fillShown && fillCount !== null;

  return (
    <article
      data-slot-id={slotId}
      className="bg-card rounded-2xl border border-[0.5px] border-card-border p-4 space-y-3"
    >
      {/* Row 1: sport icon + label (w-6 / uppercase #4A6E92 — the two intentional
          diffs) · skill badge + gender tag (SHARED — identical to SlotCard). */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PickleballIcon aria-hidden="true" className="w-6 h-6 text-[#FF6A00]" />
          <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-[#4A6E92]">
            Pickleball
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {genderCategory !== "open" && (
            <span className="bg-inset border border-card-border rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft">
              {genderCategory === "women" ? "Women's" : "Men's"}
            </span>
          )}
          <span className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-1 text-xs font-medium`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Row 2: day · time (THE HERO). Now font-serif (Baloo 2) per the
          typography spec. Identical literal to SlotCard:149 — duplicated by
          RULING #2 discipline, NOT a shared constant (the D20 isolation
          boundary), so the swap is applied in each file independently. */}
      <p className="font-serif text-ink text-lg font-semibold leading-tight">
        {dayLabel} · {timeLabel}
      </p>

      {/* Row 3: venue inset. SHARED — identical to SlotCard. */}
      <div className="bg-inset rounded-xl px-3 py-2 flex items-center gap-1.5">
        <MapPin size={13} className="text-ink-soft shrink-0" aria-hidden="true" />
        <span className="font-sans text-ink-soft text-sm">{venueName}</span>
      </div>

      {/* Row 4: capacity meter (≥50% only — the 50% rule). Intentional diff:
          filled/empty dots + "x/n filled · k left" (vs SlotCard's avatar stack
          + "x/y spots filled"), teaching "games lock at <capacity>". */}
      {showFill && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: capacity }).map((_, i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={
                  i < fillCount
                    ? { backgroundColor: DOT_FILLED }
                    : { border: `1.5px solid ${DOT_EMPTY_RING}` }
                }
              />
            ))}
          </div>
          <span className="font-sans text-ink-soft text-sm">
            {fillCount}/{capacity} filled · {capacity - fillCount} left
          </span>
        </div>
      )}

      {/* Row 5: CTA. SHARED coral token by reference (bg-coral text-white — the
          exact class SlotCard's "Join game" button uses), but an <a> to /auth
          (a navigation, not a join) + the helper line beneath. */}
      <div>
        <a
          href={`/auth?slotId=${slotId}`}
          className="w-full bg-coral text-white rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:brightness-95 active:brightness-90 flex items-center justify-center"
          aria-label={`Join this game — ${dayLabel} ${timeLabel} — phone sign-in required`}
        >
          Join this game
        </a>
        <p className="mt-1.5 text-center font-sans text-xs text-[#4A6E92]">
          phone sign-in required
        </p>
      </div>
    </article>
  );
}
