// D10 join disclosure — locked copy, rendered at every real join CTA
// (slot detail CTA, onboarding slot-flow CTA; SlotCard banked for the
// phase that wires home to real join_slot).

export default function JoinDisclosure({ className = '' }: { className?: string }) {
  return (
    <p
      className={`flex items-center justify-center gap-1.5 text-[12px] text-[#5E80A3] ${className}`}
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" strokeLinecap="round" />
        <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
      <span>{"join and the group gets your number — you get theirs"}</span>
    </p>
  );
}
