import Link from "next/link";
import PublicFeedList from "@/components/PublicFeedList";
import LandingMotion from "./LandingMotion";
import {
  ROTATOR,
  ROTATOR_TAIL,
  GAMES_CTA,
  GAMES_EMPTY_COPY,
  MANIFESTO,
  STEPS,
  STATS,
  TESTIMONIALS,
  FAQ,
  CLOSING,
} from "./landing-content";
import { LANDING_PHOTOS, type LandingPhoto } from "./landing-photos";

// D22 — the anonymous marketing landing (Option B). Server Component: every
// phrase and number below is in the server HTML (first rotator phrase + final
// stats render with no JS). LandingMotion is the ONE client island; it only
// animates these finals and is fully inert under prefers-reduced-motion.
//
// Games section consumes the extracted PublicFeedList (D20 isolation: the card
// is shared-by-import, never copied). page.tsx's anon branch renders this in
// place of the deleted standalone public-feed shell.

// Presentational CSS scoped to #landing-root, gated by `.landing-js` (added by
// the island ONLY when motion is allowed) — so with no JS or reduced motion,
// every element keeps its visible, un-animated final state. This is NOT
// globals.css (which took only the two D22 tokens); it is component-scoped.
// Contains no HTML-special chars, so a plain <style> text child renders verbatim.
const LANDING_CSS = `
#landing-root .reveal { opacity: 1; }
#landing-root.landing-js .reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .6s ease, transform .6s ease;
}
#landing-root.landing-js .reveal.is-visible { opacity: 1; transform: none; }

#landing-root [data-rotator] {
  display: inline-block;
  transition: opacity .26s ease, transform .26s ease;
}
#landing-root [data-rotator].is-swapping { opacity: 0; transform: translateY(-0.32em); }

#landing-root .kb { transform: none; }
#landing-root.landing-js .kb { animation: sonye-kenburns 20s ease-in-out infinite alternate; }
@keyframes sonye-kenburns {
  from { transform: scale(1); }
  to { transform: scale(1.08) translate(1.5%, -1.5%); }
}

#landing-root .sway { transform: none; }
#landing-root.landing-js .sway { animation: sonye-sway 6s ease-in-out infinite; }
@keyframes sonye-sway {
  0%, 100% { transform: rotate(-1.5deg); }
  50% { transform: rotate(1.5deg); }
}

#landing-root .faq-plus { transition: transform .2s ease; }
#landing-root details[open] .faq-plus { transform: rotate(45deg); }

@media (prefers-reduced-motion: reduce) {
  #landing-root.landing-js .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  #landing-root.landing-js .kb,
  #landing-root.landing-js .sway { animation: none !important; }
  #landing-root [data-rotator],
  #landing-root .faq-plus { transition: none !important; }
}
`;

// A photo slot: real <img> when the manifest carries a src, else a labeled
// dashed placeholder (the alt/caption doubles as the owner's shot-list).
function PhotoSlot({
  photo,
  className = "",
  kenburns = false,
}: {
  photo: LandingPhoto;
  className?: string;
  kenburns?: boolean;
}) {
  if (photo.src) {
    return (
      <div className={`overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          className={`h-full w-full object-cover ${kenburns ? "kb" : ""}`}
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center border-2 border-dashed border-border-strong bg-inset ${className}`}
      role="img"
      aria-label={photo.alt}
    >
      <span className="px-4 text-center font-sans text-xs leading-snug text-muted">
        {photo.caption ?? photo.alt}
      </span>
    </div>
  );
}

// One overlapping polaroid. Base tilt lives on the outer element (inline
// transform); the ±1.5° idle sway animates a separate inner element so the two
// compose. Sway only runs under `.landing-js`.
function Polaroid({
  photo,
  positionClassName,
  transform,
  swayDelay,
  z,
}: {
  photo: LandingPhoto;
  positionClassName: string;
  transform: string;
  swayDelay: number;
  z: number;
}) {
  return (
    <div className={`absolute ${positionClassName}`} style={{ transform, zIndex: z }}>
      <div className="sway" style={{ animationDelay: `${swayDelay}s` }}>
        <div className="w-[146px] rounded-lg border border-card-border bg-card p-2 shadow-md">
          <PhotoSlot photo={photo} className="aspect-square rounded-md" />
          <p className="mt-2 text-center font-sans text-[11px] text-steel-aa">
            {photo.caption}
          </p>
        </div>
      </div>
    </div>
  );
}

const STEP_PHOTOS = [
  LANDING_PHOTOS.step1,
  LANDING_PHOTOS.step2,
  LANDING_PHOTOS.step3,
];

export default function PublicLanding() {
  return (
    <main id="landing-root" className="min-h-screen bg-wash">
      <style>{LANDING_CSS}</style>

      <div className="mx-auto max-w-[390px] px-5 pb-16">
        {/* 1 · Top bar — wordmark · dallas pill · Log in (nav affordance). */}
        <header className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold lowercase text-ink">sonye</span>
            <span className="rounded-full border border-card-border bg-card px-2.5 py-0.5 font-sans text-xs font-medium text-ink-soft">
              dallas
            </span>
          </div>
          <Link
            href="/auth"
            className="rounded-xl border border-ink px-4 py-2 font-sans text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Log in
          </Link>
        </header>

        {/* 2 · Hero photo slot (Ken Burns when a real photo lands). */}
        <section className="reveal mt-6">
          <PhotoSlot
            photo={LANDING_PHOTOS.hero}
            kenburns
            className="aspect-[4/3] w-full rounded-3xl"
          />
        </section>

        {/* 3 · Rotating headline over real inventory + constant coral tail.
            Descriptive h1 wrapping the rotator; first phrase is server-rendered. */}
        <section className="reveal mt-6">
          <h1 className="font-serif text-[1.75rem] font-bold leading-[1.1] text-ink">
            <span data-rotator className="block">
              {ROTATOR[0]}
            </span>
            <span className="text-coral">{ROTATOR_TAIL}</span>
          </h1>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-steel-aa">
            Curated games at free Dallas courts. Pick a slot, verify your phone,
            and you&rsquo;re in.
          </p>
        </section>

        {/* 4 · Coral CTA — anchor-scrolls to the games section. */}
        <div className="reveal mt-5">
          <a
            href="#games"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-coral px-5 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-coral-dark active:bg-coral-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {GAMES_CTA}
          </a>
        </div>

        {/* 5 · Manifesto. */}
        <section className="reveal mt-12">
          <h2 className="font-serif text-2xl font-bold leading-tight text-ink">
            {MANIFESTO.head}
          </h2>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-steel-aa">
            {MANIFESTO.body}
          </p>
        </section>

        {/* 6 · Three overlapping polaroid photo slots (idle sway). */}
        <section className="reveal mt-12">
          <div className="relative mx-auto h-[300px] max-w-[320px]">
            <Polaroid
              photo={LANDING_PHOTOS.pol1}
              positionClassName="left-0 top-9"
              transform="rotate(-8deg)"
              swayDelay={0}
              z={10}
            />
            <Polaroid
              photo={LANDING_PHOTOS.pol3}
              positionClassName="right-0 top-11"
              transform="rotate(9deg)"
              swayDelay={0.9}
              z={20}
            />
            <Polaroid
              photo={LANDING_PHOTOS.pol2}
              positionClassName="left-1/2 top-0"
              transform="translateX(-50%) rotate(3deg)"
              swayDelay={0.45}
              z={30}
            />
          </div>
        </section>

        {/* 7 · How it works — 3 rows with photo thumbs. */}
        <section className="reveal mt-12">
          <h2 className="font-serif text-2xl font-bold text-ink">How it works</h2>
          <ol className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.n} className="flex items-start gap-3">
                <PhotoSlot
                  photo={STEP_PHOTOS[i]}
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div className="pt-0.5">
                  <p className="font-sans text-[15px] font-semibold text-ink">
                    <span className="text-coral">{step.n}.</span> {step.title}
                  </p>
                  <p className="mt-0.5 font-sans text-sm leading-relaxed text-steel-aa">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 8 · This week in Dallas — the live public feed as a section. */}
        <section id="games" className="reveal mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl font-bold text-ink">
            This week in Dallas
          </h2>
          <p className="mb-4 mt-1 font-sans text-sm text-steel-aa">
            Open games at Dallas courts right now.
          </p>
          <PublicFeedList emptyCopy={GAMES_EMPTY_COPY} />
        </section>

        {/* 9 · Testimonials — HONEST placeholder state only (D22 content rule). */}
        <section className="reveal mt-12">
          <h2 className="font-serif text-2xl font-bold text-ink">
            What players say
          </h2>
          <div className="mt-5 space-y-3">
            {TESTIMONIALS.map((quote, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-dashed border-border-strong bg-card p-4"
              >
                <blockquote className="font-sans text-sm italic leading-relaxed text-steel-aa">
                  {quote}
                </blockquote>
                <figcaption className="mt-2 font-sans text-xs text-muted">
                  placeholder — a real player&rsquo;s words go here
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 10 · Stats band — true numbers, server-rendered; island counts up. */}
        <section className="reveal mt-12">
          <div className="rounded-3xl bg-ink px-6 py-8">
            <div className="grid grid-cols-3 gap-3 text-center">
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <div
                    className="font-serif text-4xl font-bold tabular-nums text-white"
                    data-countup
                    data-final={value}
                  >
                    {value}
                  </div>
                  <div className="mt-1 font-sans text-[13px] leading-tight text-sky">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11 · FAQ — native details/summary (works with no JS). */}
        <section className="reveal mt-12">
          <h2 className="font-serif text-2xl font-bold text-ink">Questions</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-card-border bg-card">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className={`px-4 ${i > 0 ? "border-t border-card-border" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-sans text-[15px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral">
                  {item.q}
                  <span className="faq-plus ml-3 text-coral" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-4 font-sans text-sm leading-relaxed text-steel-aa">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 12 · Ink closing band. */}
        <section className="reveal mt-12">
          <div className="rounded-3xl bg-ink px-6 py-10 text-center">
            <h2 className="font-serif text-2xl font-bold leading-tight text-white">
              {CLOSING.head}
            </h2>
            <p className="mt-3 font-sans text-[15px] leading-relaxed text-sky">
              {CLOSING.body}
            </p>
            <a
              href="#games"
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-coral px-6 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-coral-dark active:bg-coral-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {GAMES_CTA}
            </a>
          </div>
        </section>

        {/* Footer — public policy links. */}
        <footer className="mt-10 text-center font-sans text-xs text-steel-aa">
          <Link
            href="/privacy"
            className="rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Privacy
          </Link>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Link
            href="/terms"
            className="rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Terms
          </Link>
        </footer>
      </div>

      <LandingMotion />
    </main>
  );
}
