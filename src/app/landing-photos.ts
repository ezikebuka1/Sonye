// D22 — landing photo manifest. ONE place to swap in the owner's real photos
// (no code change beyond paths). `src: null` -> a labeled dashed placeholder;
// `src: "/landing/<file>"` -> an <img> from /public/landing/. ALL null at launch.
// alt = the D22 shot-list canon (also the a11y alt-text).

export type LandingPhoto = {
  src: string | null;
  alt: string;
  // Short visible caption for the placeholder box + polaroid footer.
  caption?: string;
};

export type LandingPhotoKey =
  | "hero"
  | "pol1"
  | "pol2"
  | "pol3"
  | "step1"
  | "step2"
  | "step3";

export const LANDING_PHOTOS: Record<LandingPhotoKey, LandingPhoto> = {
  hero: {
    src: null,
    alt: "Players mid-rally at a Dallas public pickleball court",
  },
  pol1: {
    src: null,
    alt: "A full game of six at the net",
    caption: "a full game of six",
  },
  pol2: {
    src: null,
    alt: "Mid-rally at Churchill Park",
    caption: "churchill park",
  },
  pol3: {
    src: null,
    alt: "Cole Park courts in the evening",
    caption: "cole park",
  },
  step1: { src: null, alt: "Browsing open games on a phone", caption: "pick" },
  step2: { src: null, alt: "A phone showing a verification code", caption: "verify" },
  step3: { src: null, alt: "Six players meeting at the court", caption: "play" },
};
