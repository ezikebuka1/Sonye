import Link from "next/link";

// Shared site footer for the three public / marketing surfaces (landing, slot
// detail, group lobby). Deliberately NOT mounted in layout.tsx — that would put
// it on authed home/dashboard/profile, the /c attendance pages, /auth, and
// /onboarding, and overlap the fixed BottomTabBar. Instagram is a real outbound
// link here (the OG card's handle is a baked-in memory cue instead).

function InstagramGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

const FOCUS =
  "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function SiteFooter() {
  return (
    <footer className="w-full max-w-[390px] mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 font-sans text-xs">
      <span className="text-muted">sonye · Dallas public courts</span>

      <div className="flex items-center gap-3 text-steel-aa">
        <a
          href="https://instagram.com/sonye.app"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Sonye on Instagram (opens in a new tab)"
          className={`flex items-center gap-1.5 ${FOCUS}`}
        >
          <InstagramGlyph />
          @sonye.app
        </a>
        <span className="text-muted" aria-hidden="true">
          ·
        </span>
        <Link href="/privacy" className={`underline ${FOCUS}`}>
          Privacy
        </Link>
        <span className="text-muted" aria-hidden="true">
          ·
        </span>
        <Link href="/terms" className={`underline ${FOCUS}`}>
          Terms
        </Link>
      </div>
    </footer>
  );
}
