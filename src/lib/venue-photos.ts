/**
 * Venue photos — v1, keyed by venue NAME.
 *
 * Name, not id: the lobby's only venue data path is `fetchSlotPreview` →
 * the `slot_share_preview` RPC, whose RETURNS TABLE projects v.name /
 * neighborhood / lat / lng and consumes v.id purely as a join key. No venue
 * id or slug reaches the render site. (venues.id IS a slug — 'cole-park' —
 * but surfacing it means changing the RPC contract: a schema change, out of
 * scope for a surface pass.) Safe here because v1 has three fixed venues and
 * `venues_name_unique` enforces uniqueness on the column.
 *
 * Re-key to id if the RPC ever returns one, or if venue count grows enough
 * that a rename would silently drop a photo.
 *
 * Unknown venue → undefined → the game card renders with no photo block.
 */
export type VenuePhoto = {
  src: string;
  alt: string;
};

const VENUE_PHOTOS: Record<string, VenuePhoto> = {
  'Cole Park': {
    src: '/venues/cole-park.jpg',
    alt: 'Paddle rack at the Cole Park pickleball courts',
  },
};

export function venuePhoto(venueName: string): VenuePhoto | undefined {
  return VENUE_PHOTOS[venueName];
}
