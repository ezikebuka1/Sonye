'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitOnboardingAction, type OnboardingErrors } from './actions';

type SkillLevel = 'beginner' | 'advanced_beginner' | 'intermediate' | 'advanced';
type Gender     = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';

type SlotPreview = {
  venue_name:       string;
  starts_at:        string;
  capacity:         number;
  fill_count:       number | null;
  fill_ratio_shown: boolean;
};

type Props = {
  flow:        string;
  slotId:      string;
  slotPreview: SlotPreview | null;
};

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner',          label: 'Beginner' },
  { value: 'advanced_beginner', label: 'Advanced Beginner' },
  { value: 'intermediate',      label: 'Intermediate' },
  { value: 'advanced',          label: 'Advanced' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'woman',             label: 'Woman' },
  { value: 'man',               label: 'Man' },
  { value: 'non_binary',        label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const SKILL_CHIP_SELECTED: Record<SkillLevel, string> = {
  beginner:          'bg-[#E0F0E9] text-[#1A6640] ring-2 ring-[#1A6640]',
  advanced_beginner: 'bg-[#E0EEF9] text-[#0C447C] ring-2 ring-[#0C447C]',
  intermediate:      'bg-[#FAF0DC] text-[#854F0B] ring-2 ring-[#854F0B]',
  advanced:          'bg-[#F9E0E0] text-[#7C1414] ring-2 ring-[#7C1414]',
};
const CHIP_UNSELECTED = 'bg-white border border-[#DAE7F1] text-[#1A3650]';
const GENDER_SELECTED = 'bg-[#D4724A]/10 text-[#D4724A] ring-2 ring-[#D4724A]';
const CHIP_BASE       = 'rounded-full px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-1.5 min-h-[46px]';

function formatBanner(preview: SlotPreview): string {
  const dt   = new Date(preview.starts_at);
  const day  = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).format(dt);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' }).format(dt);
  return `${day} · ${time} · ${preview.venue_name}`;
}

export function OnboardingForm({ flow, slotId, slotPreview }: Props) {
  const [errors, formAction, isPending] = useActionState<OnboardingErrors | null, FormData>(
    submitOnboardingAction,
    null,
  );

  const [selectedSkill,  setSelectedSkill]  = useState<SkillLevel | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);

  // Scroll + focus first error field after failed submit
  useEffect(() => {
    if (!errors) return;
    const el = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }, [errors]);

  const isSlot    = flow === '2';
  const bannerTxt = slotPreview ? formatBanner(slotPreview) : null;
  const fillShown = slotPreview?.fill_ratio_shown && slotPreview.fill_count != null;

  return (
    <main className="min-h-screen bg-[#EEF4FA] pb-40">
      <div className="max-w-[390px] mx-auto px-5 pt-8">

        {/* Pinned banner — slot context only */}
        {bannerTxt && (
          <div className="mb-6 rounded-2xl bg-white border border-[#DAE7F1] px-4 py-3">
            <p className="text-xs font-medium text-[#7A9AB8] uppercase tracking-wide mb-0.5">
              You&apos;re joining
            </p>
            <p className="text-sm font-semibold text-[#1A3650]">{bannerTxt}</p>
            {fillShown && (
              <p className="text-xs text-[#7A9AB8] mt-0.5">{slotPreview!.fill_count} already in</p>
            )}
          </div>
        )}

        {/* Header — locked copy per flow */}
        <h1 className="text-xl font-bold text-[#1A3650] mb-1">
          {isSlot
            ? "phone verified. you're one step from the game."
            : "phone verified. let's find your game."}
        </h1>
        <p className="text-sm text-[#7A9AB8] mb-7">Takes about a minute.</p>

        <form action={formAction} noValidate className="flex flex-col gap-6">
          {/* Hidden fields carrying selection state + slot context */}
          <input type="hidden" name="slotId"       value={slotId} />
          <input type="hidden" name="skill_level"  value={selectedSkill  ?? ''} />
          <input type="hidden" name="gender"       value={selectedGender ?? ''} />

          {/* General error */}
          {errors?.general && (
            <p role="alert" className="text-sm font-medium" style={{ color: '#D64B4B' }}>
              {errors.general}
            </p>
          )}

          {/* First name */}
          <div>
            <label htmlFor="first-name" className="block text-sm font-semibold text-[#1A3650] mb-2">
              First name
            </label>
            <input
              id="first-name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              maxLength={50}
              required
              aria-invalid={!!errors?.first_name}
              aria-describedby={errors?.first_name ? 'first-name-error' : undefined}
              placeholder="Jordan"
              className="w-full border border-[#DAE7F1] rounded-xl px-4 py-3 text-[#1A3650] bg-white text-sm outline-none focus:border-[#3A7CB8] focus:ring-1 focus:ring-[#3A7CB8]"
            />
            {errors?.first_name && (
              <p id="first-name-error" role="alert" className="mt-1.5 text-xs font-medium" style={{ color: '#D64B4B' }}>
                {errors.first_name}
              </p>
            )}
          </div>

          {/* Last name */}
          <div>
            <label htmlFor="last-name" className="block text-sm font-semibold text-[#1A3650] mb-2">
              Last name <span className="font-normal text-[#7A9AB8]">(optional)</span>
            </label>
            <input
              id="last-name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              maxLength={50}
              placeholder="Smith"
              className="w-full border border-[#DAE7F1] rounded-xl px-4 py-3 text-[#1A3650] bg-white text-sm outline-none focus:border-[#3A7CB8] focus:ring-1 focus:ring-[#3A7CB8]"
            />
          </div>

          {/* Skill level — chip group */}
          <div>
            <span id="skill-label" className="block text-sm font-semibold text-[#1A3650] mb-2">
              Skill level
            </span>
            <div
              role="group"
              aria-labelledby="skill-label"
              aria-invalid={!!errors?.skill_level}
              aria-describedby={errors?.skill_level ? 'skill-error' : undefined}
              className="flex flex-wrap gap-2"
            >
              {SKILL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selectedSkill === opt.value}
                  onClick={() => setSelectedSkill(opt.value)}
                  className={`${CHIP_BASE} ${selectedSkill === opt.value ? SKILL_CHIP_SELECTED[opt.value] : CHIP_UNSELECTED}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors?.skill_level && (
              <p id="skill-error" role="alert" className="mt-1.5 text-xs font-medium" style={{ color: '#D64B4B' }}>
                {errors.skill_level}
              </p>
            )}
          </div>

          {/* Gender — optional chip group */}
          <div>
            <span id="gender-label" className="block text-sm font-semibold text-[#1A3650] mb-0.5">
              Gender <span className="font-normal text-[#7A9AB8]">(optional)</span>
            </span>
            <p className="text-xs text-[#7A9AB8] mb-2">
              Used to show game gender composition in the lobby.
            </p>
            <div role="group" aria-labelledby="gender-label" className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map(opt => {
                const isSelected = selectedGender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedGender(isSelected ? null : opt.value)}
                    className={`${CHIP_BASE} ${isSelected ? GENDER_SELECTED : CHIP_UNSELECTED}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky CTA */}
          <div className="fixed bottom-0 inset-x-0 bg-[#EEF4FA] pt-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-[390px] mx-auto">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#D4724A] hover:bg-[#B85D3A] disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 transition-colors min-h-[52px]"
            >
              {isPending ? 'Saving…' : (isSlot ? 'Join the game' : 'Find games')}
            </button>

            {/* D10 privacy disclosure */}
            <p className="text-center text-xs text-[#7A9AB8] mt-2">
              {isSlot
                ? 'your number is only shared with joined players'
                : 'your number stays private until you join a game'}
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
