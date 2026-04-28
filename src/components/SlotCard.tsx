"use client";

import { useState, useEffect } from "react";
import { Activity, MapPin, Check } from "lucide-react";

type SkillLevel = "beginner" | "advanced_beginner" | "intermediate" | "advanced";
type OptedInUser = { id: string; avatar_color: string };

type SlotCardProps = {
  slotId: string;
  sport: string;
  skillLevel: SkillLevel;
  dayLabel: string;
  timeLabel: string;
  venueName: string;
  fillCount: number;
  capacity: number;
  isJoined: boolean;
  isFull: boolean;
  optedInUsers: OptedInUser[];
  onJoin: (slotId: string) => void;
  onJoinWaitlist: (slotId: string) => void;
};

const skillBadge: Record<SkillLevel, { bg: string; text: string; label: string }> = {
  beginner:          { bg: "bg-skill-beg-bg",    text: "text-skill-beg-ink",    label: "Beginner" },
  advanced_beginner: { bg: "bg-skill-advbeg-bg", text: "text-skill-advbeg-ink", label: "Adv. Beginner" },
  intermediate:      { bg: "bg-skill-int-bg",    text: "text-skill-int-ink",    label: "Intermediate" },
  advanced:          { bg: "bg-skill-adv-bg",    text: "text-skill-adv-ink",    label: "Advanced" },
};

const MAX_VISIBLE_AVATARS = 5;

function JoinedButton() {
  return (
    <button
      disabled
      className="w-full bg-inset text-ink border border-card-border rounded-xl py-2.5 font-sans font-medium text-[15px] flex items-center justify-center gap-1.5 cursor-default"
      aria-label="Already joined"
    >
      <Check size={16} aria-hidden="true" />
      Joined
    </button>
  );
}

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
            style={{ backgroundColor: u.avatar_color }}
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
  isJoined,
  isFull,
  optedInUsers,
  onJoin,
  onJoinWaitlist,
}: SlotCardProps) {
  const badge = skillBadge[skillLevel];
  const showSocialProof = fillCount / capacity >= 0.5;

  return (
    <article className="bg-card rounded-2xl border border-[0.5px] border-card-border p-4 space-y-3">
      {/* Row 1: sport icon chip + skill badge */}
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-br from-coral/80 to-coral rounded-xl p-2.5 text-white">
          <Activity size={18} aria-hidden="true" />
        </div>
        <span className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-1 text-xs font-medium`}>
          {badge.label}
        </span>
      </div>

      {/* Row 2: day · time */}
      <p className="font-sans text-ink text-lg font-semibold leading-tight">
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

      {/* Row 5: CTA button — three mutually exclusive states */}
      {isJoined ? (
        <JoinedButton />
      ) : isFull ? (
        <button
          onClick={() => onJoinWaitlist(slotId)}
          className="w-full bg-coral text-white rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:bg-coral-dark active:bg-coral-dark"
          aria-label={`Join waitlist for ${dayLabel} ${timeLabel}`}
        >
          Join waitlist
        </button>
      ) : (
        <button
          onClick={() => onJoin(slotId)}
          className="w-full bg-coral text-white rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:bg-coral-dark active:bg-coral-dark"
          aria-label={`Join game on ${dayLabel} ${timeLabel}`}
        >
          Join game
        </button>
      )}
    </article>
  );
}
