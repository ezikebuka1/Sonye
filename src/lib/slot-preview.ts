import { createAnonClient } from '@/lib/supabase/anon';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillLevel =
  | 'beginner'
  | 'advanced_beginner'
  | 'intermediate'
  | 'advanced';

export type SlotPreview = {
  venue_name: string;
  neighborhood: string;
  sport_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  gender_category: 'open' | 'women' | 'men';
  is_cancelled: boolean;
  owner_first_name: string;
  fill_count: number | null;
  fill_ratio_shown: boolean;
  skill_level: SkillLevel;
};

export type SlotState = 'CANCELLED' | 'FORMING' | 'FILLING' | 'FULL';

export type DerivedState = {
  state: SlotState;
  footerBg: string;
  pipsFilled: number;
  pipsEmpty: number;
  spotsLeft: number | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  statusCopy: string;
  smsCopy: string | null;
};

export type DallasFormat = {
  dayLabel: string;   // "Saturday, June 7"
  startLabel: string; // "8:00 AM"
  endLabel: string;   // "9:30 AM"
  ogShortDay: string; // "Sat 8 AM"
};

// ── Data fetching ─────────────────────────────────────────────────────────────

export async function fetchSlotPreview(id: string): Promise<SlotPreview | null> {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('slot_share_preview', { target_slot: id });
  if (error || !data || (data as SlotPreview[]).length === 0) return null;
  return (data as SlotPreview[])[0];
}

// ── Timezone formatting ───────────────────────────────────────────────────────

export function formatDallas(starts_at: string, ends_at: string): DallasFormat {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'America/Chicago' }).format(new Date(iso));

  const dayLabel   = fmt(starts_at, { weekday: 'long', month: 'long', day: 'numeric' });
  const startLabel = fmt(starts_at, { hour: 'numeric', minute: '2-digit', hour12: true });
  const endLabel   = fmt(ends_at,   { hour: 'numeric', minute: '2-digit', hour12: true });

  // Separate calls avoid the comma Intl emits when weekday + hour are combined
  const satDay = fmt(starts_at, { weekday: 'short' });
  const hour   = fmt(starts_at, { hour: 'numeric', hour12: true });
  const ogShortDay = `${satDay} ${hour}`;

  return { dayLabel, startLabel, endLabel, ogShortDay };
}

// ── Time range formatting ─────────────────────────────────────────────────────

// "8:00 AM" + "9:30 AM" → "8:00 – 9:30 AM"
// "8:00 AM" + "1:30 PM" → "8:00 AM – 1:30 PM"
export function formatTimeRange(startLabel: string, endLabel: string): string {
  const startPeriod = startLabel.slice(-2);
  const endPeriod   = endLabel.slice(-2);
  if (startPeriod === endPeriod) {
    return `${startLabel.slice(0, -3)} – ${endLabel}`;
  }
  return `${startLabel} – ${endLabel}`;
}

// ── State machine ─────────────────────────────────────────────────────────────

export function deriveState(preview: SlotPreview, slotId: string): DerivedState {
  if (preview.is_cancelled) {
    return {
      state: 'CANCELLED',
      footerBg: '#7A9AB8',
      pipsFilled: 0,
      pipsEmpty: 0,
      spotsLeft: null,
      ctaLabel: null,
      ctaHref: null,
      statusCopy: 'This game was cancelled',
      smsCopy: null,
    };
  }

  if (!preview.fill_ratio_shown) {
    return {
      state: 'FORMING',
      footerBg: '#1A3650',
      pipsFilled: 0,
      pipsEmpty: 0,
      spotsLeft: null,
      ctaLabel: 'Join this game',
      ctaHref: `/auth?slotId=${slotId}`,
      statusCopy: 'Game forming',
      smsCopy: "You'll get a text when the group is confirmed",
    };
  }

  const filled = preview.fill_count ?? 0;
  if (filled < preview.capacity) {
    const spots = preview.capacity - filled;
    return {
      state: 'FILLING',
      footerBg: '#D4724A',
      pipsFilled: filled,
      pipsEmpty: spots,
      spotsLeft: spots,
      ctaLabel: 'Join this game',
      ctaHref: `/auth?slotId=${slotId}`,
      statusCopy: `${spots} spot${spots === 1 ? '' : 's'} left`,
      smsCopy: 'Spots go fast — grab yours now',
    };
  }

  return {
    state: 'FULL',
    footerBg: '#7A9AB8',
    pipsFilled: preview.capacity,
    pipsEmpty: 0,
    spotsLeft: 0,
    ctaLabel: 'Join the waitlist',
    ctaHref: `/auth?slotId=${slotId}&waitlist=true`,
    statusCopy: 'Full · join the waitlist',
    smsCopy: "We'll text you if a spot opens",
  };
}

// ── Skill level display map ───────────────────────────────────────────────────

export const SKILL_DISPLAY: Record<SkillLevel, { bg: string; ink: string; label: string }> = {
  beginner:          { bg: '#E0EEF9', ink: '#0C447C', label: 'Beginner' },
  advanced_beginner: { bg: '#FAF0DC', ink: '#854F0B', label: 'Adv. Beginner' },
  intermediate:      { bg: '#E8F5E9', ink: '#27500A', label: 'Intermediate' },
  advanced:          { bg: '#FBEAF0', ink: '#72243E', label: 'Advanced' },
};
