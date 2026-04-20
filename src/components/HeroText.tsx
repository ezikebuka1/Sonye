/**
 * Two-line hero headline.
 * Line 1: "Find your"  — DM Sans, text-ink, medium weight
 * Line 2: "squad."     — Instrument Serif italic, text-coral
 *
 * Instrument Serif italic is used for exactly ONE word per screen (the
 * emotional anchor). See D8-design-system.md for the typography rules.
 */
export default function HeroText() {
  return (
    <div className="leading-[1.05]">
      <p className="font-sans text-ink text-4xl font-medium">Find your</p>
      <p className="font-serif italic text-coral text-4xl font-normal">
        squad.
      </p>
    </div>
  );
}
