// Avatar color derivation for the lobby roster (Phase 4A).
// Gender → family per D8.1 (amended by D8.1a): woman → pink, non-binary
// → green, everything else (man, prefer_not_to_say, null) → blue (default).
// Shade by stable hash of membership_id — same member always gets the
// same shade within a render and across visits (membership_id is stable
// for the life of the membership).
//
// Gender-derived color is LOBBY-ONLY (member context, D7.3). The Home
// fill dots render a single neutral and never call this util.

export type Gender = 'man' | 'woman' | 'non_binary' | 'prefer_not_to_say';

export type AvatarColor = { bg: string; fg: string };

// Blue family (D8.2 values) — DEFAULT family: man, prefer_not_to_say,
// null, and anything else. Hexes unchanged.
const MAN_FAMILY: AvatarColor[] = [
  { bg: '#8DBCF1', fg: '#14304D' },
  { bg: '#5E80A3', fg: '#FFFFFF' },
  { bg: '#14304D', fg: '#FFFFFF' },
  { bg: '#9DB8D2', fg: '#14304D' },
];

// Pink family — finalized 2026-06-14 per D8.1. Each shade mirrors the
// blue family's saturation + lightness at pink hue; fg follows the same
// contrast rule (light bg → ink #14304D, dark bg → #FFFFFF).
const WOMAN_FAMILY: AvatarColor[] = [
  { bg: '#F18EB7', fg: '#14304D' },
  { bg: '#A25D7A', fg: '#FFFFFF' },
  { bg: '#4D142C', fg: '#FFFFFF' },
  { bg: '#D29DB3', fg: '#14304D' },
];

// Green family — non-binary only.
const NONBINARY_FAMILY: AvatarColor[] = [{ bg: '#246B42', fg: '#FFFFFF' }];

/**
 * Pick the avatar colors for a roster member.
 * Shade = (char-code sum of membershipId) % family length — stable,
 * uniform-enough spread for 4/6-person groups.
 * The viewer's own row uses the same derivation: the row tint and
 * "that's you" chip mark self, never the avatar.
 */
export function getAvatar(gender: Gender | null, membershipId: string): AvatarColor {
  const family =
    gender === 'woman' ? WOMAN_FAMILY :
    gender === 'non_binary' ? NONBINARY_FAMILY :
    MAN_FAMILY;   // man, prefer_not_to_say, null, anything else → blue (default)

  let sum = 0;
  for (let i = 0; i < membershipId.length; i++) {
    sum += membershipId.charCodeAt(i);
  }
  return family[sum % family.length];
}
