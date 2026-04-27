import { UserPlus, ChevronRight } from "lucide-react";

type OnboardingBannerProps = {
  onClick: () => void; // caller passes router.push('/onboarding')
};

/**
 * Coral-bordered card that prompts new users to complete their profile.
 * Visible only when currentUser.onboarded === false.
 * Uses a 1px coral border (deliberately stronger than the 0.5px card border)
 * so it stands out as a call-to-action, not just another content card.
 */
export default function OnboardingBanner({ onClick }: OnboardingBannerProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-card rounded-2xl border border-coral px-4 py-3 cursor-pointer text-left"
      role="button"
      aria-label="Set up your profile to get matched to games"
      data-testid="onboarding-banner"
    >
      {/* Left: coral icon */}
      <div className="shrink-0 text-coral">
        <UserPlus size={20} aria-hidden="true" />
      </div>

      {/* Middle: two-line copy */}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-ink text-sm font-medium leading-tight">
          Set up your profile
        </p>
        <p className="font-sans text-ink-soft text-xs leading-tight mt-0.5">
          Get matched to games you&apos;ll love
        </p>
      </div>

      {/* Right: chevron */}
      <div className="shrink-0 text-coral">
        <ChevronRight size={20} aria-hidden="true" />
      </div>
    </button>
  );
}
