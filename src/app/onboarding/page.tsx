'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Activity } from 'lucide-react';
import type { SkillLevel, VenueId, DrivingWillingness, Availability } from '@/lib/mockData';

type OnboardingFormState = {
  name: string;
  phone: string;
  skill_level: SkillLevel | null;
  general_availability: Availability[];
  preferred_venues: VenueId[];
  willing_to_drive: DrivingWillingness | null;
};

function formatPhone(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'advanced_beginner', label: 'Advanced Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'weekday_evenings', label: 'Weekday evenings' },
  { value: 'saturday_morning', label: 'Saturday morning' },
  { value: 'saturday_evening', label: 'Saturday evening' },
  { value: 'sunday_morning', label: 'Sunday morning' },
  { value: 'sunday_evening', label: 'Sunday evening' },
];

const VENUE_OPTIONS: { value: VenueId; label: string }[] = [
  { value: 'cole_park', label: 'Cole Park' },
  { value: 'churchill_park', label: 'Churchill Park' },
  { value: 'fretz_park', label: 'Fretz Park' },
];

const DRIVE_OPTIONS: { value: DrivingWillingness; label: string }[] = [
  { value: 'under_10', label: 'Under 10 min' },
  { value: 'under_20', label: 'Under 20 min' },
  { value: 'under_30', label: 'Under 30 min' },
  { value: 'over_30', label: '30+ min' },
];

const SKILL_SELECTED_CLASSES: Record<SkillLevel, string> = {
  beginner: 'bg-skill-beg-bg text-skill-beg-ink',
  advanced_beginner: 'bg-skill-advbeg-bg text-skill-advbeg-ink',
  intermediate: 'bg-skill-int-bg text-skill-int-ink',
  advanced: 'bg-skill-adv-bg text-skill-adv-ink',
};

const CHIP_BASE = 'rounded-full px-4 py-2 text-sm border font-sans transition-colors';
const CHIP_UNSELECTED = `${CHIP_BASE} bg-card border-card-border text-ink`;
const CHIP_SELECTED_CORAL = `${CHIP_BASE} bg-coral/10 border-coral text-coral flex items-center gap-1.5`;
const CHIP_SELECTED_SKILL = (level: SkillLevel) =>
  `${CHIP_BASE} ${SKILL_SELECTED_CLASSES[level]} border-card-border flex items-center gap-1.5`;
const CHIP_SELECTED_DRIVE = `${CHIP_BASE} bg-skill-int-bg text-skill-int-ink border-card-border flex items-center gap-1.5`;

function toggleMulti<T extends string>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingFormState>({
    name: '',
    phone: '',
    skill_level: null,
    general_availability: [],
    preferred_venues: [],
    willing_to_drive: null,
  });

  const isValid =
    form.name.trim().length >= 2 &&
    /^\d{10}$/.test(form.phone) &&
    form.skill_level !== null &&
    form.general_availability.length >= 1 &&
    form.preferred_venues.length >= 1;

  function handlePhoneChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, phone: digits }));
  }

  function handleSubmit() {
    if (!isValid) return;
    console.log('[onboarding submit]', form);
    router.push('/?onboarded=1');
  }

  return (
    <main className="min-h-screen bg-wash pb-40">
      <div className="max-w-[390px] mx-auto px-5 pt-6">
        {/* Back nav */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 p-1 -ml-1 text-ink"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>

        <h1 className="font-sans text-2xl font-semibold text-ink">
          Let&apos;s get you set up
        </h1>
        <p className="font-sans text-sm text-ink-soft mt-1 mb-6">Takes about a minute.</p>

        <div className="space-y-6">
          {/* Field 1 — Name */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              What&apos;s your name?
            </label>
            <input
              type="text"
              placeholder="Jordan"
              maxLength={50}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-card rounded-xl border border-card-border px-4 py-3 w-full text-ink font-sans focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral"
            />
          </div>

          {/* Field 2 — Phone */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              Phone number
            </label>
            <p className="font-sans text-xs text-ink-soft mb-2">
              For game confirmations and squad chat.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(214) 555-0123"
              value={formatPhone(form.phone)}
              onChange={e => handlePhoneChange(e.target.value)}
              className="bg-card rounded-xl border border-card-border px-4 py-3 w-full text-ink font-sans focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral"
            />
          </div>

          {/* Field 3 — Sport (read-only) */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              Sport
            </label>
            <div className="bg-card rounded-xl border border-card-border px-4 py-3 flex items-center gap-3">
              <div className="bg-gradient-to-br from-coral/80 to-coral rounded-xl p-2 text-white shrink-0">
                <Activity size={16} aria-hidden="true" />
              </div>
              <span className="font-sans text-ink font-medium">Pickleball</span>
              <span className="font-sans text-sm text-ink-soft">(more coming soon)</span>
            </div>
          </div>

          {/* Field 4 — Skill level */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              Your skill level
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(opt => {
                const selected = form.skill_level === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, skill_level: opt.value }))}
                    className={selected ? CHIP_SELECTED_SKILL(opt.value) : CHIP_UNSELECTED}
                  >
                    {selected && <Check size={12} aria-hidden="true" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 5 — General availability */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              When are you usually free?
            </label>
            <p className="font-sans text-xs text-ink-soft mb-2">Pick all that work.</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(opt => {
                const selected = form.general_availability.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm(f => ({
                        ...f,
                        general_availability: toggleMulti(f.general_availability, opt.value),
                      }))
                    }
                    className={selected ? CHIP_SELECTED_CORAL : CHIP_UNSELECTED}
                  >
                    {selected && <Check size={12} aria-hidden="true" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 6 — Preferred venues */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              Which parks work for you?
            </label>
            <div className="flex flex-wrap gap-2">
              {VENUE_OPTIONS.map(opt => {
                const selected = form.preferred_venues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm(f => ({
                        ...f,
                        preferred_venues: toggleMulti(f.preferred_venues, opt.value),
                      }))
                    }
                    className={selected ? CHIP_SELECTED_CORAL : CHIP_UNSELECTED}
                  >
                    {selected && <Check size={12} aria-hidden="true" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 7 — Willing to drive (optional per D7 v2 breadcrumb pattern) */}
          <div>
            <label className="block font-sans text-sm font-medium text-ink mb-2">
              How far will you drive for a game?
            </label>
            <p className="font-sans text-xs text-ink-soft mb-2">
              Helps us match you nearby. Optional.
            </p>
            <div className="flex flex-wrap gap-2">
              {DRIVE_OPTIONS.map(opt => {
                const selected = form.willing_to_drive === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm(f => ({
                        ...f,
                        willing_to_drive: selected ? null : opt.value,
                      }))
                    }
                    className={selected ? CHIP_SELECTED_DRIVE : CHIP_UNSELECTED}
                  >
                    {selected && <Check size={12} aria-hidden="true" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky submit — always visible at bottom */}
      <div className="fixed bottom-0 inset-x-0 bg-wash pt-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full max-w-[350px] mx-auto block bg-coral hover:bg-coral-dark active:bg-coral-dark text-white font-medium py-3.5 rounded-xl font-sans disabled:bg-ink-soft disabled:cursor-not-allowed transition-colors"
        >
          Get matched
        </button>
      </div>
    </main>
  );
}
