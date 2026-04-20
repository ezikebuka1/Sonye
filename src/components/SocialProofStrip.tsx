type SocialProofStripProps = {
  avatarColors: string[]; // 4 hex strings from the blue palette
  message: string;        // e.g. "12 players active in Dallas this week"
};

/**
 * A horizontal row of 4 overlapping avatar dots followed by a message.
 * Avatar dot colors are data (not design tokens), so inline backgroundColor
 * is the one documented exception to the no-inline-styles rule per D8.
 */
export default function SocialProofStrip({
  avatarColors,
  message,
}: SocialProofStripProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Avatar dot stack — each dot after the first overlaps by ~30% via -ml-2 */}
      <div className="flex items-center">
        {avatarColors.slice(0, 4).map((color, i) => (
          <div
            key={i}
            // Avatar colors are dynamic data, not design tokens — inline backgroundColor
            // is the one documented exception to the no-inline-styles rule.
            style={{ backgroundColor: color }}
            className={`w-5 h-5 rounded-full border-2 border-wash${i > 0 ? " -ml-2" : ""}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="font-sans text-ink-soft text-sm">{message}</p>
    </div>
  );
}
