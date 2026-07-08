// D22 — landing copy, ONE owner-editable place. Plain constants only (no JSX, no
// server imports) so BOTH the server landing (PublicLanding) and the motion
// island (LandingMotion, a 'use client' module) can import from here. Voice rule
// (D22): host-neutral, sentence case, no exclamation marks.

// The rotating "when + where" phrases — real Dallas inventory. The island cycles
// these ~3s; the FIRST one is what the server renders (static-first). The coral
// tail below is constant. OWNER-CONFIRM (day/time/park combos).
export const ROTATOR = [
  "saturday, 10 am, cole park,",
  "thursday, 7 pm, churchill park,",
] as const;

// The constant coral emotional anchor after the rotator (Baloo 2, the one
// serif "anchor phrase" per screen — mirrors HeroText's "squad." motif).
export const ROTATOR_TAIL = "your squad.";

// Hero + closing call-to-action label (anchor-scrolls to the games section).
export const GAMES_CTA = "See this week's games";

export const MANIFESTO = {
  head: "Join a squad, without the group chat.",
  body: "Every game is at a free public court, capped at six players, and tagged by skill — so you always know what you're walking into. Join a slot, verify your phone, and show up. The squad is already waiting.",
} as const;

// How-it-works — 3 rows (each pairs with a photo thumb from the manifest).
export const STEPS = [
  {
    n: "1",
    title: "Pick a game",
    body: "Browse open slots at Dallas courts and tap the one that fits your day and your level.",
  },
  {
    n: "2",
    title: "Verify your phone",
    body: "A quick text confirms you're real. No app to download, no account to fuss with.",
  },
  {
    n: "3",
    title: "Show up and play",
    body: "Your spot is locked in a game of six. Meet the squad at the court and play.",
  },
] as const;

// True numbers only, owner-maintained (D22). Server-rendered as the final value;
// the island only counts up to it. OWNER-CONFIRM (12 · 3 · 6).
export const STATS: ReadonlyArray<readonly [string, string]> = [
  ["12", "players this week"],
  ["3", "Dallas parks"],
  ["6", "per game, locked"],
];

// HONEST placeholder testimonials ONLY (D22 content rule) — verbatim; never
// swap for invented quotes. Replace with real, permissioned words when they exist.
export const TESTIMONIALS = [
  "This spot is saved for a real player's words — we'd rather leave it empty than invent them.",
  "Someone who actually played the Saturday games at Cole Park will get this card.",
] as const;

// Native <details>/<summary> FAQ. The three answers are D22-specced verbatim.
// OWNER-CONFIRM (paddle answer).
export const FAQ = [
  { q: "Is it free?", a: "Yes. Games are at free public courts — no fees, no memberships." },
  {
    q: "What skill level do I need?",
    a: "Every game is tagged from beginner to advanced, so you join at your level.",
  },
  {
    q: "Do I need my own paddle?",
    a: "Bring a paddle if you have one. If you don't, let your squad know.",
  },
] as const;

export const CLOSING = {
  head: "Your next game is a tap away.",
  body: "Find a slot, verify your phone, and meet your Dallas squad this week.",
} as const;

// Games-section empty state (D22 string). Passed as a prop to PublicFeedList so
// the reusable list carries no hard-coded copy.
export const GAMES_EMPTY_COPY =
  "No open games right now — new slots post a few days ahead. Check back for Cole, Churchill, and Lake Highlands games.";
