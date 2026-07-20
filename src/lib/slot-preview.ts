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
  venue_lat: number | null;
  venue_lng: number | null;
};

export type SlotState = 'CANCELLED' | 'STARTED' | 'FORMING' | 'FILLING' | 'FULL';

export type DerivedState = {
  state: SlotState;
  pipsFilled: number;
  pipsEmpty: number;
  spotsLeft: number | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  statusCopy: string;
  bodyCopy: string | null;
  smsCopy: string | null;
};

export type DallasFormat = {
  dayLabel: string;   // "Saturday, June 7"
  startLabel: string; // "8:00 AM"
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

export function formatDallas(starts_at: string): DallasFormat {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'America/Chicago' }).format(new Date(iso));

  const dayLabel   = fmt(starts_at, { weekday: 'long', month: 'long', day: 'numeric' });
  const startLabel = fmt(starts_at, { hour: 'numeric', minute: '2-digit', hour12: true });

  // Separate calls avoid the comma Intl emits when weekday + hour are combined
  const satDay = fmt(starts_at, { weekday: 'short' });
  const hour   = fmt(starts_at, { hour: 'numeric', hour12: true });
  const ogShortDay = `${satDay} ${hour}`;

  return { dayLabel, startLabel, ogShortDay };
}

// ── State machine ─────────────────────────────────────────────────────────────

export function deriveState(preview: SlotPreview, slotId: string): DerivedState {
  if (preview.is_cancelled) {
    return {
      state: 'CANCELLED',
      pipsFilled: 0,
      pipsEmpty: 0,
      spotsLeft: null,
      ctaLabel: null,
      ctaHref: null,
      statusCopy: 'This game was cancelled',
      bodyCopy: null,
      smsCopy: null,
    };
  }

  // Past-game guard. Mirrors join_slot's own cascade — cancelled is checked
  // first, then started — and its predicate exactly, including the inclusive
  // `<=` (20260624120000_join_slot_past_game_guard.sql:42-53). A slot that is
  // both cancelled and started reads as CANCELLED on both surfaces, because
  // that is the error join_slot would raise.
  //
  // starts_at is a timestamptz projected uncast by slot_share_preview, so it
  // serializes with an offset and parses to an unambiguous absolute instant.
  // Date.now() is the server clock here: deriveState is only ever called from
  // server files, and /slot/[id] renders per request.
  if (new Date(preview.starts_at).getTime() <= Date.now()) {
    return {
      state: 'STARTED',
      pipsFilled: 0,
      pipsEmpty: 0,
      spotsLeft: null,
      ctaLabel: null,
      ctaHref: null,
      statusCopy: 'Already started',
      bodyCopy: null,
      smsCopy: null,
    };
  }

  if (!preview.fill_ratio_shown) {
    return {
      state: 'FORMING',
      pipsFilled: 0,
      pipsEmpty: 0,
      spotsLeft: null,
      ctaLabel: 'Join this game',
      ctaHref: `/auth?slotId=${slotId}`,
      statusCopy: 'Game forming',
      bodyCopy: 'Spots are open — grab one and the group builds out from here.',
      smsCopy: "Takes about 20 seconds — we'll text you a code",
    };
  }

  const filled = preview.fill_count ?? 0;
  if (filled < preview.capacity) {
    const spots = preview.capacity - filled;
    return {
      state: 'FILLING',
      pipsFilled: filled,
      pipsEmpty: spots,
      spotsLeft: spots,
      ctaLabel: 'Join this game',
      ctaHref: `/auth?slotId=${slotId}`,
      statusCopy: 'Filling up',
      bodyCopy: null,
      smsCopy: "Filling up — we'll text you a code to lock your spot",
    };
  }

  return {
    state: 'FULL',
    pipsFilled: preview.capacity,
    pipsEmpty: 0,
    spotsLeft: 0,
    ctaLabel: 'Join the waitlist',
    ctaHref: `/auth?slotId=${slotId}&waitlist=true`,
    statusCopy: 'Full · join the waitlist',
    bodyCopy: null,
    smsCopy: "We'll text you if a spot opens",
  };
}
