import { ChevronLeft } from "lucide-react";

type SkillStyle = "beg" | "advbeg" | "int" | "adv";

type LobbyHeaderProps = {
  venueName: string;
  venueNeighborhood: string;
  dayLabel: string;
  timeLabel: string;
  skillLabel: string;
  skillStyle: SkillStyle;
  onBack: () => void;
};

const SKILL_CLASSES: Record<SkillStyle, string> = {
  beg:    "bg-skill-beg-bg text-skill-beg-ink",
  advbeg: "bg-skill-advbeg-bg text-skill-advbeg-ink",
  int:    "bg-skill-int-bg text-skill-int-ink",
  adv:    "bg-skill-adv-bg text-skill-adv-ink",
};

export default function LobbyHeader({
  venueName,
  venueNeighborhood,
  dayLabel,
  timeLabel,
  skillLabel,
  skillStyle,
  onBack,
}: LobbyHeaderProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onBack}
        className="p-1 -ml-1 text-ink mb-2"
        aria-label="Go back"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="flex items-start justify-between gap-2">
        <h1 className="font-sans text-xl font-semibold text-ink">
          {dayLabel} · {timeLabel}
        </h1>
        <span
          className={`${SKILL_CLASSES[skillStyle]} rounded-full px-2.5 py-1 text-xs font-medium shrink-0 mt-0.5`}
        >
          {skillLabel}
        </span>
      </div>

      <p className="font-sans text-sm text-ink-soft">
        {venueName} · {venueNeighborhood}
      </p>
    </div>
  );
}
