"use client";

import { useState, useEffect } from "react";
import { MapPin, Check, ChevronRight, Clock } from "lucide-react";
import PickleballIcon from "@/components/icons/PickleballIcon";

export type SkillLevel = "beginner" | "advanced_beginner" | "intermediate" | "advanced";
type OptedInUser = { id: string };

type MembershipStatus = 'joined' | 'waitlisted' | null;

type SlotCardProps = {
  slotId: string;
  skillLevel: SkillLevel;
  dayLabel: string;
  timeLabel: string;
  venueName: string;
  fillCount: number;
  capacity: number;
  // The viewer's ACTIVE membership for this slot (left_at IS NULL), or null.
  // Drives the four locked button states (D13). isFull splits the null case.
  membershipStatus: MembershipStatus;
  isFull: boolean;
  optedInUsers: OptedInUser[];
  genderCategory: 'open' | 'women' | 'men';
  // Dispatch 2 (D13): this card's join_slot Server Action is in flight — the
  // active button shows a disabled "Joining…" (per-card; others unaffected).
  pending?: boolean;
  // Dispatch 2 (D13): join_slot RAISEd "is cancelled" for this card — the CTA
  // is replaced IN PLACE by a non-interactive, greyed "Cancelled" label.
  cancelled?: boolean;
  // D19: join_slot RAISEd "has already started" for this card — the CTA is
  // replaced IN PLACE by a non-interactive "Already started" footer (full
  // contrast, Clock icon; terminal like cancelled, but a distinct "past" look).
  started?: boolean;
  onJoin: (slotId: string) => void;
  onJoinWaitlist: (slotId: string) => void;
};

// The locked D8.2 skill ramp (the SKILL_RAMP). Exported so the owner dashboard
// reuses the exact same color-coded chip — NOT a re-implementation.
export const skillBadge: Record<SkillLevel, { bg: string; text: string; label: string }> = {
  beginner:          { bg: "bg-skill-beg-bg",    text: "text-skill-beg-ink",    label: "Beginner" },
  advanced_beginner: { bg: "bg-skill-advbeg-bg", text: "text-skill-advbeg-ink", label: "Adv. Beginner" },
  intermediate:      { bg: "bg-skill-int-bg",    text: "text-skill-int-ink",    label: "Intermediate" },
  advanced:          { bg: "bg-skill-adv-bg",    text: "text-skill-adv-ink",    label: "Advanced" },
};

const MAX_VISIBLE_AVATARS = 5;

// D7.3: fill dots are gender-neutral on the pre-join feed (gender is
// lobby-only). Single slate, distinct from all three gender families.
const FILL_DOT_COLOR = "#AEBED0";

// Mounts at opacity-0, transitions to opacity-100 after the first frame.
// Animation fires once on mount — subsequent re-renders do not re-trigger it.
function SocialProofBlock({
  optedInUsers,
  fillCount,
  capacity,
}: {
  optedInUsers: OptedInUser[];
  fillCount: number;
  capacity: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const visibleUsers = optedInUsers.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = optedInUsers.length - MAX_VISIBLE_AVATARS;

  return (
    <div
      className={`flex items-center justify-between transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center">
        {visibleUsers.map((u, i) => (
          <div
            key={u.id}
            style={{ backgroundColor: FILL_DOT_COLOR }}
            className={`w-6 h-6 rounded-full border-2 border-card${i > 0 ? " -ml-2" : ""}`}
            aria-hidden="true"
          />
        ))}
        {overflowCount > 0 && (
          <span className="ml-1.5 font-sans text-ink-soft text-xs">
            +{overflowCount}
          </span>
        )}
      </div>
      <span className="font-sans text-ink-soft text-sm">
        {fillCount}/{capacity} spots filled
      </span>
    </div>
  );
}

export default function SlotCard({
  slotId,
  skillLevel,
  dayLabel,
  timeLabel,
  venueName,
  fillCount,
  capacity,
  membershipStatus,
  isFull,
  optedInUsers,
  genderCategory,
  pending = false,
  cancelled = false,
  started = false,
  onJoin,
  onJoinWaitlist,
}: SlotCardProps) {
  const badge = skillBadge[skillLevel];
  const showSocialProof = fillCount / capacity >= 0.5;

  return (
    <article
      data-slot-id={slotId}
      className="bg-card rounded-2xl border border-[0.5px] border-card-border p-4 space-y-3"
    >
      {/* Row 1: sport icon chip + badges (skill + gender tag when non-open) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PickleballIcon aria-hidden="true" className="w-7 h-7 text-[#FF6A00]" />
          <span className="font-sans font-medium text-[15px] text-ink">Pickleball</span>
        </div>
        <div className="flex items-center gap-1.5">
          {genderCategory !== 'open' && (
            <span className="bg-inset border border-card-border rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft">
              {genderCategory === 'women' ? "Women's" : "Men's"}
            </span>
          )}
          <span className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-1 text-xs font-medium`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Row 2: day · time */}
      <p className="font-serif text-ink text-lg font-semibold leading-tight tabular-nums">
        {dayLabel} · {timeLabel}
      </p>

      {/* Row 3: venue inset */}
      <div className="bg-inset rounded-xl px-3 py-2 flex items-center gap-1.5">
        <MapPin size={13} className="text-ink-soft shrink-0" aria-hidden="true" />
        <span className="font-sans text-ink-soft text-sm">{venueName}</span>
      </div>

      {/* Row 4: social proof — 200ms fade-in on mount, only at >= 50% fill */}
      {showSocialProof && (
        <SocialProofBlock
          optedInUsers={optedInUsers}
          fillCount={fillCount}
          capacity={capacity}
        />
      )}

      {/* Row 5: CTA button — mutually exclusive states (D13 locked). Join /
          Join-waitlist taps call the join_slot Server Action (Dispatch 2);
          In-lobby / On-waitlist navigate to the lobby. Precedence: a
          cancelled lock wins, then the viewer's membership, then the in-flight
          "Joining…" state, then the open/full join buttons. */}
      {cancelled ? (
        <div
          className="w-full bg-[#EEF2F8] text-ink-soft rounded-xl py-2.5 font-sans font-medium text-[15px] flex items-center justify-center cursor-not-allowed select-none"
          aria-label={`Cancelled — ${dayLabel} ${timeLabel}`}
        >
          Cancelled
        </div>
      ) : started ? (
        <div
          className="w-full bg-inset text-ink-soft rounded-xl py-2.5 font-sans font-medium text-[15px] flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
          aria-label={`Already started — ${dayLabel} ${timeLabel}`}
        >
          <Clock size={16} aria-hidden="true" />
          Already started
        </div>
      ) : membershipStatus === 'joined' ? (
        <a
          href={`/group-lobby?slotId=${slotId}`}
          className="w-full border border-ink text-ink rounded-xl py-2.5 font-sans font-medium text-[15px] flex items-center justify-center gap-1.5"
          aria-label={`In lobby — ${dayLabel} ${timeLabel}`}
        >
          <Check size={16} aria-hidden="true" />
          In lobby
          <ChevronRight size={16} aria-hidden="true" />
        </a>
      ) : membershipStatus === 'waitlisted' ? (
        <a
          href={`/group-lobby?slotId=${slotId}`}
          className="w-full bg-[#EEF2F8] text-steel rounded-xl py-2.5 font-sans font-medium text-[15px] flex items-center justify-center gap-1.5"
          aria-label={`On the waitlist — ${dayLabel} ${timeLabel}`}
        >
          <Clock size={16} aria-hidden="true" />
          On the waitlist
        </a>
      ) : pending ? (
        <button
          type="button"
          disabled
          className={`w-full rounded-xl py-2.5 font-sans font-medium text-[15px] cursor-not-allowed opacity-70 ${
            isFull ? "bg-sky text-ink" : "bg-coral text-white"
          }`}
          aria-label="Joining…"
          aria-busy="true"
        >
          Joining…
        </button>
      ) : isFull ? (
        <button
          type="button"
          onClick={() => onJoinWaitlist(slotId)}
          className="w-full bg-sky text-ink rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:brightness-95 active:brightness-90"
          aria-label={`Join waitlist for ${dayLabel} ${timeLabel}`}
        >
          Join waitlist
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onJoin(slotId)}
          className="w-full bg-coral text-white rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:brightness-95 active:brightness-90"
          aria-label={`Join game on ${dayLabel} ${timeLabel}`}
        >
          Join game
        </button>
      )}
    </article>
  );
}
