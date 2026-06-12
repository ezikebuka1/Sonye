/**
 * Two-line hero headline.
 * Line 1: "Find your"  — Nunito Sans, text-ink, medium weight
 * Line 2: "squad."     — Baloo 2 semibold, text-decorative
 *
 * Baloo 2 semibold is used for exactly ONE word per screen (the
 * emotional anchor). See D8-design-system.md for the typography rules.
 */
export default function HeroText() {
  return (
    <div>
      <div className="leading-[1.05]">
        <p className="font-sans text-ink text-4xl font-medium">Find your</p>
        <p className="font-serif font-semibold text-decorative text-4xl">
          squad.
        </p>
      </div>
      <p className="font-sans text-ink-soft text-sm mt-2">
        Curated pickleball games in Dallas. Tap to join.
      </p>
    </div>
  );
}
