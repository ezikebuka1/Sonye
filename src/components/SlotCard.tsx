import { Activity, MapPin } from "lucide-react";

// NOTE: Activity is used as the sport icon placeholder for v1 (single-sport).
// A sport-specific icon is deliberately deferred — this is the single sport
// launch and a lucide placeholder is documented here per the spec.

// SkillLevel is defined locally so this component stays self-contained.
// Presentational components own their types; data resolution lives in the page.
type SkillLevel = "beginner" | "advanced_beginner" | "intermediate" | "advanced";

type OptedInUser = { id: string; avatar_color: string };

type SlotCardProps = {
  slotId: string;
  sport: string; // typed as string; callers pass the resolved value from the page
  skillLevel: SkillLevel;
  dayLabel: string;   // e.g. "Saturday"
  timeLabel: string;  // e.g. "8:00 AM"
  venueName: string;  // e.g. "Cole Park"
  fillRatio: number;  // 0..1, pre-computed by the page
  optedInUsers: OptedInUser[]; // resolved by the page
  capacity: number;
  onJoin: (slotId: string) => void;
};

// D8 skill badge palette — bg + text per skill level.
const skillBadge: Record<SkillLevel, { bg: string; text: string; label: string }> = {
  beginner:          { bg: "bg-skill-beg-bg",    text: "text-skill-beg-ink",    label: "Beginner" },
  advanced_beginner: { bg: "bg-skill-advbeg-bg", text: "text-skill-advbeg-ink", label: "Adv. Beginner" },
  intermediate:      { bg: "bg-skill-int-bg",    text: "text-skill-int-ink",    label: "Intermediate" },
  advanced:          { bg: "bg-skill-adv-bg",    text: "text-skill-adv-ink",    label: "Advanced" },
};

const MAX_VISIBLE_AVATARS = 5;

export default function SlotCard({
  slotId,
  skillLevel,
  dayLabel,
  timeLabel,
  venueName,
  fillRatio,
  optedInUsers,
  capacity,
  onJoin,
}: SlotCardProps) {
  const badge = skillBadge[skillLevel];
  const isFull = fillRatio >= 1.0;
  const showSocialProof = fillRatio >= 0.5; // D8 50% fill threshold rule

  const visibleUsers = optedInUsers.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = optedInUsers.length - MAX_VISIBLE_AVATARS;

  return (
    <article className="bg-card rounded-2xl border border-[0.5px] border-card-border p-4 space-y-3">
      {/* Row 1: sport icon chip + skill badge */}
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-br from-coral/80 to-coral rounded-xl p-2.5 text-white">
          {/* Activity is a placeholder — sport-specific icon deferred to v2 */}
          <Activity size={18} aria-hidden="true" />
        </div>
        <span
          className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-1 text-xs font-medium`}
        >
          {badge.label}
        </span>
      </div>

      {/* Row 2: day · time (hero text) */}
      <p className="font-sans text-ink text-lg font-semibold leading-tight">
        {dayLabel} · {timeLabel}
      </p>

      {/* Row 3: venue inset */}
      <div className="bg-inset rounded-xl px-3 py-2 flex items-center gap-1.5">
        <MapPin size={13} className="text-ink-soft shrink-0" aria-hidden="true" />
        <span className="font-sans text-ink-soft text-sm">{venueName}</span>
      </div>

      {/* Row 4: social proof — rendered only when fill >= 50% (D8 rule) */}
      {showSocialProof && (
        <div className="flex items-center justify-between">
          {/* Avatar dot stack */}
          <div className="flex items-center">
            {visibleUsers.map((u, i) => (
              <div
                key={u.id}
                // Avatar colors are dynamic data — inline backgroundColor is the
                // one documented exception to the no-inline-styles rule per D8.
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
          {/* Spot count */}
          <span className="font-sans text-ink-soft text-sm">
            {optedInUsers.length}/{capacity} spots filled
          </span>
        </div>
      )}

      {/* Join / Join waitlist button — full width, always shown.
          D7: waitlist opens when slot is full — button is never disabled. */}
      <button
        onClick={() => onJoin(slotId)}
        className="w-full bg-coral text-white rounded-xl py-2.5 font-sans font-medium text-[15px] transition-colors hover:bg-coral-dark active:bg-coral-dark"
        aria-label={isFull ? `Join waitlist for ${dayLabel} ${timeLabel}` : `Join game on ${dayLabel} ${timeLabel}`}
      >
        {isFull ? "Join waitlist" : "Join game"}
      </button>
    </article>
  );
}
