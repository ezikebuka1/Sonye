type CommitmentTrackerProps = {
  filled: number;
  capacity: number;
};

function subText(filled: number, capacity: number): string {
  if (filled === capacity) return "Squad locked — see you there.";
  if (filled === capacity - 1) return "Almost there — 1 spot left";
  return `${capacity - filled} spots left`;
}

function subTextClass(filled: number, capacity: number): string {
  return filled === capacity
    ? "font-sans text-sm text-coral"
    : "font-sans text-sm text-ink-soft";
}

export default function CommitmentTracker({ filled, capacity }: CommitmentTrackerProps) {
  const pct = Math.round((filled / capacity) * 100);

  return (
    <div className="bg-card rounded-2xl border border-card-border p-4 space-y-2">
      <p className="font-sans text-base font-semibold text-ink">
        {filled} of {capacity} locked in
      </p>
      <p className={subTextClass(filled, capacity)}>{subText(filled, capacity)}</p>
      <div className="h-1.5 rounded-full bg-card-border overflow-hidden">
        <div
          className="h-full rounded-full bg-coral transition-[width] duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={capacity}
        />
      </div>
    </div>
  );
}
