// Avatar color derivation for the lobby roster (Phase 4A).
// Family by gender per D8.1, shade by stable hash of membership_id —
// same member always gets the same shade within a render and across
// visits (membership_id is stable for the life of the membership).
//
// NOTE: src/lib/mockData.ts getAvatarColor is quarantined (HomeClient
// mock surface, old D8 palette). This util supersedes it on the lobby
// surface only; consolidation rides the avatar/OG re-skin dispatch.

export type Gender = 'man' | 'woman' | 'non_binary' | 'prefer_not_to_say';

export type AvatarColor = { bg: string; fg: string };

// D8.1 families reconciled to D8.2 values.
const MAN_FAMILY: AvatarColor[] = [
  { bg: '#8DBCF1', fg: '#14304D' },
  { bg: '#5E80A3', fg: '#FFFFFF' },
  { bg: '#14304D', fg: '#FFFFFF' },
  { bg: '#9DB8D2', fg: '#14304D' },
];

// Placeholder pinks — finalized M5 per D8.1.
const WOMAN_FAMILY: AvatarColor[] = [
  { bg: '#C25A88', fg: '#FFFFFF' },
  { bg: '#E79CBE', fg: '#14304D' },
];

// non_binary / prefer_not_to_say / NULL — D8.1 green → D8.2 reconciliation.
const NEUTRAL_FAMILY: AvatarColor[] = [{ bg: '#246B42', fg: '#FFFFFF' }];

/**
 * Pick the avatar colors for a roster member.
 * Shade = (char-code sum of membershipId) % family length — stable,
 * uniform-enough spread for 4/6-person groups.
 * The viewer's own row uses the same derivation: the row tint and
 * "that's you" chip mark self, never the avatar.
 */
export function getAvatar(gender: Gender | null, membershipId: string): AvatarColor {
  const family =
    gender === 'man' ? MAN_FAMILY :
    gender === 'woman' ? WOMAN_FAMILY :
    NEUTRAL_FAMILY;

  let sum = 0;
  for (let i = 0; i < membershipId.length; i++) {
    sum += membershipId.charCodeAt(i);
  }
  return family[sum % family.length];
}
