// Pure mock data module — no React imports, no side effects, no mutation.
// All shapes are flat and ID-referenced per D7 product mechanics.
// V2 breadcrumb fields (creation_mode, sport, willing_to_drive) are collected
// in v1 even though not yet used, to prevent future migrations.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SkillLevel =
  | "beginner"
  | "advanced_beginner"
  | "intermediate"
  | "advanced";

export type Sport = "pickleball"; // v1 hardcoded; v2 expands to multi-sport

export type VenueId = "cole_park" | "churchill_park" | "fretz_park";

export type DrivingWillingness =
  | "under_10"
  | "under_20"
  | "under_30"
  | "over_30";

export type Availability =
  | "weekday_evenings"
  | "saturday_morning"
  | "saturday_evening"
  | "sunday_morning"
  | "sunday_evening";

export type CreationMode = "scheduled_slot" | "play_now"; // play_now = v2 only

// ─── Shapes ───────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  name: string;
  phone: string;
  sport: Sport;
  skill_level: SkillLevel;
  general_availability: Availability[];
  preferred_venues: VenueId[];
  willing_to_drive: DrivingWillingness; // v2 breadcrumb: used by v2 matching algo
  avatar_color: string; // hex from blue palette only — never coral
  onboarded: boolean;
};

export type Venue = {
  id: VenueId;
  name: string;
  neighborhood: string;
};

export type Slot = {
  id: string;
  venueId: VenueId;
  sport: Sport; // v2 breadcrumb: always 'pickleball' in v1
  skill_level: SkillLevel;
  day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  time_label: string; // e.g. "6:30 AM"
  capacity: number; // v1 always 6
  opted_in_user_ids: string[];
  creation_mode: CreationMode; // v2 breadcrumb: always 'scheduled_slot' in v1
};

export type Session = {
  id: string;
  slotId: string;
  sport: Sport; // v2 breadcrumb
  creation_mode: CreationMode; // v2 breadcrumb
  status: "forming" | "locked" | "completed" | "cancelled";
  member_user_ids: string[];
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const venues: Venue[] = [
  { id: "cole_park", name: "Cole Park", neighborhood: "Lakewood" },
  { id: "churchill_park", name: "Churchill Park", neighborhood: "Preston Hollow" },
  { id: "fretz_park", name: "Fretz Park", neighborhood: "North Dallas" },
];

const users: User[] = [
  // u_current: the local user — starts unboarded; ?onboarded=1 toggles for demo
  {
    id: "u_current",
    name: "Jordan",
    phone: "",
    sport: "pickleball",
    skill_level: "intermediate",
    general_availability: ["saturday_morning", "sunday_morning"],
    preferred_venues: ["cole_park", "fretz_park"],
    willing_to_drive: "under_20",
    avatar_color: "#3A7CB8",
    onboarded: false,
  },
  {
    id: "u1",
    name: "Marcus",
    phone: "",
    sport: "pickleball",
    skill_level: "intermediate",
    general_availability: ["weekday_evenings", "saturday_morning"],
    preferred_venues: ["cole_park"],
    willing_to_drive: "under_10",
    avatar_color: "#1A3650",
    onboarded: true,
  },
  {
    id: "u2",
    name: "Priya",
    phone: "",
    sport: "pickleball",
    skill_level: "advanced_beginner",
    general_availability: ["saturday_evening", "sunday_morning"],
    preferred_venues: ["churchill_park", "fretz_park"],
    willing_to_drive: "under_20",
    avatar_color: "#5A9FD4",
    onboarded: true,
  },
  {
    id: "u3",
    name: "Devon",
    phone: "",
    sport: "pickleball",
    skill_level: "intermediate",
    general_availability: ["saturday_morning", "saturday_evening"],
    preferred_venues: ["cole_park", "churchill_park"],
    willing_to_drive: "under_30",
    avatar_color: "#4A6E8E",
    onboarded: true,
  },
  {
    id: "u4",
    name: "Simone",
    phone: "",
    sport: "pickleball",
    skill_level: "beginner",
    general_availability: ["sunday_morning", "sunday_evening"],
    preferred_venues: ["fretz_park"],
    willing_to_drive: "under_10",
    avatar_color: "#7FA8C9",
    onboarded: true,
  },
  {
    id: "u5",
    name: "Theo",
    phone: "",
    sport: "pickleball",
    skill_level: "advanced",
    general_availability: ["weekday_evenings", "sunday_evening"],
    preferred_venues: ["cole_park"],
    willing_to_drive: "over_30",
    avatar_color: "#2D6B9E",
    onboarded: true,
  },
  {
    id: "u6",
    name: "Aaliyah",
    phone: "",
    sport: "pickleball",
    skill_level: "intermediate",
    general_availability: ["saturday_morning", "sunday_morning"],
    preferred_venues: ["churchill_park", "fretz_park"],
    willing_to_drive: "under_20",
    avatar_color: "#A9C3DB",
    onboarded: true,
  },
  {
    id: "u7",
    name: "Cameron",
    phone: "",
    sport: "pickleball",
    skill_level: "advanced_beginner",
    general_availability: ["weekday_evenings", "saturday_evening"],
    preferred_venues: ["cole_park", "fretz_park"],
    willing_to_drive: "under_30",
    avatar_color: "#6B9AC4",
    onboarded: true,
  },
];

// Slots pre-ordered: sat morning → sat evening → sun morning → sun evening.
// Exercises the 50% fill threshold rule across all four cards:
//   slot_a: 1/6 (17%) — below threshold, no avatars/count shown
//   slot_b: 3/6 (50%) — at threshold, avatars + count shown
//   slot_c: 5/6 (83%) — above threshold, avatars + count shown
//   slot_d: 6/6 (100%) — full, avatars + count + "Join waitlist" button
const slots: Slot[] = [
  {
    id: "slot_a",
    venueId: "cole_park",
    sport: "pickleball",
    skill_level: "intermediate",
    day_of_week: "sat",
    time_label: "8:00 AM",
    capacity: 6,
    opted_in_user_ids: ["u1"],
    creation_mode: "scheduled_slot",
  },
  {
    id: "slot_b",
    venueId: "churchill_park",
    sport: "pickleball",
    skill_level: "advanced_beginner",
    day_of_week: "sat",
    time_label: "5:00 PM",
    capacity: 6,
    opted_in_user_ids: ["u1", "u2", "u3"],
    creation_mode: "scheduled_slot",
  },
  {
    id: "slot_c",
    venueId: "fretz_park",
    sport: "pickleball",
    skill_level: "beginner",
    day_of_week: "sun",
    time_label: "9:00 AM",
    capacity: 6,
    opted_in_user_ids: ["u1", "u2", "u3", "u4", "u5"],
    creation_mode: "scheduled_slot",
  },
  {
    id: "slot_d",
    venueId: "cole_park",
    sport: "pickleball",
    skill_level: "advanced",
    day_of_week: "sun",
    time_label: "4:00 PM",
    capacity: 6,
    opted_in_user_ids: ["u1", "u2", "u3", "u4", "u5", "u6"],
    creation_mode: "scheduled_slot",
  },
];

// M1 has no active sessions — empty array exported for shape correctness.
const sessions: Session[] = [];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the current user. Pass `{ onboarded: '1' }` to simulate a returning
 * user for demo purposes (e.g. ?onboarded=1 in the URL). Pure — does not mutate
 * the seed array.
 */
export function getCurrentUser(searchParams?: { onboarded?: string }): User {
  const base = users.find((u) => u.id === "u_current")!;
  if (searchParams?.onboarded === "1") {
    return { ...base, onboarded: true };
  }
  return base;
}

export function getVenueById(id: VenueId): Venue {
  const venue = venues.find((v) => v.id === id);
  if (!venue) throw new Error(`Venue not found: ${id}`);
  return venue;
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

/** Returns slots sorted by day of week then time (sat before sun, morning before evening). */
export function getSlotsForHome(): Slot[] {
  const dayOrder: Record<Slot["day_of_week"], number> = {
    mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
  };
  return [...slots].sort((a, b) => {
    const dayDiff = dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
    if (dayDiff !== 0) return dayDiff;
    return parseTimeLabel(a.time_label) - parseTimeLabel(b.time_label);
  });
}

/** Returns the User objects for every opted-in user in a slot. */
export function getUsersForSlot(slotId: string): User[] {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return [];
  return slot.opted_in_user_ids
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => u !== undefined);
}

/** Fill ratio 0..1. */
export function getFillRatio(slot: Slot): number {
  return slot.opted_in_user_ids.length / slot.capacity;
}

/** Returns true when the fill ratio is at or above the 50% social proof threshold (D8). */
export function isSlotAtOrAbove50(slot: Slot): boolean {
  return getFillRatio(slot) >= 0.5;
}

// Exported for shape completeness; sessions are empty at M1.
export { sessions };

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Converts "8:00 AM" / "5:00 PM" → minutes past midnight for sort stability. */
function parseTimeLabel(label: string): number {
  const [time, period] = label.split(" ");
  const [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
