// D10-B lobby wall — the canned quick-messages. ONE source of truth, shared by
// the wall composer (the tappable chips) and any future surface.
//
// Each chip inserts a FIXED body — a pure literal, never the label, never the
// label + free text. Keeping the inserted body a closed set of known strings
// keeps the future "RIGHT NOW" categorization (a fast-follow, NOT built here)
// clean: the categorizer can match on these exact bodies.
//
// `key` is a stable, content-free id for testids / React keys (labels + bodies
// may be re-worded later without breaking selectors).

export type CannedMessage = {
  key: string;
  label: string; // what the chip reads
  body: string; // what gets inserted (fixed)
};

export const CANNED_MESSAGES: readonly CannedMessage[] = [
  { key: 'here', label: "I'm here", body: 'Here' },
  { key: 'omw', label: 'On my way', body: 'On my way' },
  { key: 'late', label: 'Running ~10 late', body: 'Running ~10 late' },
] as const;
