import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { MapPin, ArrowUpRight, ChevronRight } from 'lucide-react';
import {
  fetchSlotPreview,
  formatDallas,
  formatTimeRange,
  deriveState,
  type SkillLevel,
} from '@/lib/slot-preview';
import { courtMapsUrl } from '@/lib/maps-url';
import { venuePhoto } from '@/lib/venue-photos';
import JoinDisclosure from '@/components/JoinDisclosure';
import SiteFooter from '@/components/SiteFooter';

// Deduplicate the fetch between generateMetadata and the page render
const getCachedPreview = cache((id: string) => fetchSlotPreview(id));

// Canonical D8.2 ramp — a LOCAL map, byte-identical to the OG card's SKILL_MAP
// and the lobby's SKILL_RAMP. Local rather than one shared export per the
// blast-radius ruling: a shared map re-skins every consumer at once, which is
// why the OG and the lobby each carry their own. Not copied from
// OnboardingForm's chip map, which carries the banked tier-shift bug.
const SKILL_RAMP: Record<SkillLevel, { bg: string; ink: string; label: string }> = {
  beginner:          { bg: '#DCEBFF', ink: '#15457B', label: 'Beginner' },
  advanced_beginner: { bg: '#FFF1CC', ink: '#8A5A00', label: 'Adv. Beginner' },
  intermediate:      { bg: '#D8EFDF', ink: '#246B42', label: 'Intermediate' },
  advanced:          { bg: '#D7E0EC', ink: '#14304D', label: 'Advanced' },
};

// Every pill except the skill chip. The skill chip is the only colour on the
// row; the rest are ghosts so they read as metadata, not as status.
const GHOST_PILL =
  'bg-card text-steel-aa border border-card-border text-[12px] font-medium px-3 py-1 rounded-full';

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const preview = await getCachedPreview(id);
  if (!preview) return { title: 'Sonye' };

  const { ogShortDay } = formatDallas(preview.starts_at, preview.ends_at);
  const ds = deriveState(preview, id);

  // Absolute base for the OG image URL. Derive from env so prod share previews
  // resolve against the real host; the localhost fallback is dev-only.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  let title: string;
  let description: string;

  switch (ds.state) {
    case 'FORMING':
      title       = `Pickleball · ${ogShortDay} · ${preview.venue_name}`.slice(0, 35);
      description = 'Curated Dallas pickleball game forming — tap to grab a spot.';
      break;
    case 'FILLING':
      title       = `${ds.spotsLeft} spot${ds.spotsLeft === 1 ? '' : 's'} left · ${ogShortDay}`.slice(0, 35);
      description = 'This Dallas game is filling up — join before it locks.';
      break;
    case 'FULL':
      title       = `Full · ${ogShortDay} · ${preview.venue_name}`.slice(0, 35);
      description = "This game's full — join the waitlist in case a spot opens.";
      break;
    case 'STARTED':
      title       = `Pickleball · ${preview.venue_name}`.slice(0, 35);
      description = 'This game already started.';
      break;
    default:
      title       = `Pickleball · ${preview.venue_name}`.slice(0, 35);
      description = 'This game was cancelled.';
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`${baseUrl}/slot/${id}/opengraph-image`],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await getCachedPreview(id);

  if (!preview) {
    return (
      <main
        className="min-h-screen bg-[#E6F0FF] flex flex-col items-center justify-center px-6"
      >
        <p className="text-[#5E80A3] text-sm text-center font-[family-name:var(--font-nunito)]">
          This game isn&apos;t available.
        </p>
        <a
          href="/"
          className="mt-4 text-[#EE5E00] text-sm underline underline-offset-2 font-[family-name:var(--font-nunito)]"
        >
          Browse games
        </a>
      </main>
    );
  }

  const { dayLabel, startLabel, endLabel } = formatDallas(preview.starts_at, preview.ends_at);
  const timeRange = formatTimeRange(startLabel, endLabel);
  const ds      = deriveState(preview, id);
  const skill   = SKILL_RAMP[preview.skill_level];

  // Keyed by venue NAME — no venue id/slug reaches this render site (see
  // venue-photos.ts). Venues without a photo (Churchill / LHN) return
  // undefined and the card renders photo-free.
  const photo = venuePhoto(preview.venue_name);

  const genderTag =
    preview.gender_category === 'women' ? 'Women' :
    preview.gender_category === 'men'   ? 'Men'   : null;

  // The two terminal states carry no action row, and mute the hero + venue
  // line to steel — the same treatment the OG card gives them.
  const terminal = ds.state === 'CANCELLED' || ds.state === 'STARTED';

  // Owner line REMOVED 2026-07 — host-neutral canon (amendment waiver): the
  // public /slot page no longer surfaces the organizer's name/initial.
  // owner_first_name stays in the SlotPreview type / slot_share_preview
  // projection (server-only, is_host pattern), just not rendered.

  return (
    <main className="min-h-screen bg-wash font-sans">
      <div className="w-full max-w-[390px] mx-auto px-5 pt-4">

        {/* Wordmark */}
        <div className="flex justify-center">
          <span className="text-[13px] tracking-[0.12em] uppercase text-steel-aa font-semibold">
            sonye
          </span>
        </div>

        {/* ── CARD 1 · GAME ──────────────────────────────────────────────
            overflow-hidden clips the photo to the card radius. Safe here in a
            way it would not be in the lobby: this page mounts no
            position:fixed sheets, so nothing can be clipped out of view. */}
        <section className="mt-3 bg-card border-[1.5px] border-card-border rounded-2xl overflow-hidden sonye-reveal">
          {photo && (
            // relative is required by next/image fill, and is safe: plain
            // relative (no z-index, no transform) creates no containing block.
            <div className="relative w-full h-40">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority
                sizes="(max-width: 390px) calc(100vw - 40px), 350px"
                className="object-cover"
                style={{ objectPosition: '50% 55%' }}
              />
            </div>
          )}

          <div className="px-4 py-4">
            {/* Day / Time hero — the only Baloo on the page */}
            <p className="text-steel-aa text-[12px] font-semibold uppercase tracking-widest mb-1">
              {dayLabel}
            </p>
            <p className={`font-serif text-[36px] font-bold leading-tight ${terminal ? 'text-steel' : 'text-ink'}`}>
              {timeRange}
            </p>

            {/* Venue line — tappable to Google Maps when the venue has court
                coordinates (D24); plain row when coords are null. */}
            {preview.venue_lat !== null && preview.venue_lng !== null ? (
              <a
                href={courtMapsUrl(preview.venue_lat, preview.venue_lng)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${preview.venue_name} in Google Maps (opens in a new tab)`}
                className="mt-3 flex items-center gap-2 no-underline"
              >
                <MapPin size={16} className="flex-shrink-0 text-steel-aa" aria-hidden="true" />
                <span
                  className={`text-[14px] font-medium underline decoration-steel-aa underline-offset-2 ${terminal ? 'text-steel' : 'text-ink'}`}
                >
                  {preview.venue_name}
                </span>
                <span className="text-card-border" aria-hidden="true">·</span>
                <span className={`text-[13px] ${terminal ? 'text-steel' : 'text-steel-aa'}`}>
                  {preview.neighborhood}, Dallas
                </span>
                <ArrowUpRight size={14} className="flex-shrink-0 ml-auto text-steel-aa" aria-hidden="true" />
              </a>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[14px] font-medium ${terminal ? 'text-steel' : 'text-ink'}`}>
                  {preview.venue_name}
                </span>
                <span className="text-card-border" aria-hidden="true">·</span>
                <span className={`text-[13px] ${terminal ? 'text-steel' : 'text-steel-aa'}`}>
                  {preview.neighborhood}, Dallas
                </span>
              </div>
            )}

            {/* Park-honesty subline — free public court reality */}
            <p className="mt-2 text-steel-aa text-[13px]">
              Free public court — walk-up, park rules apply.
            </p>

            {/* Pills — skill chip carries the ramp colour; the rest are ghosts */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="text-[12px] font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: skill.bg, color: skill.ink }}
              >
                {skill.label}
              </span>
              <span className={GHOST_PILL}>{preview.sport_name}</span>
              <span className={GHOST_PILL}>Group of {preview.capacity}</span>
              {genderTag && <span className={GHOST_PILL}>{genderTag}</span>}
            </div>
          </div>
        </section>

        {/* ── CARD 2 · JOIN ─────────────────────────────────────────────── */}
        <div className="sonye-reveal sonye-d1">
          <section className="mt-3 bg-card border-[1.5px] border-card-border rounded-2xl px-4 py-4">
            <span className="inline-flex bg-wash text-ink text-[13px] font-semibold px-3 py-1 rounded-full">
              {ds.statusCopy}
            </span>

            {ds.bodyCopy && (
              <p className="mt-2.5 text-steel-aa text-[13px] leading-snug">
                {ds.bodyCopy}
              </p>
            )}

            {/* The ONE spots-left line — the old card said it twice, once in
                the header and again in the footer band. */}
            {ds.state === 'FILLING' && ds.spotsLeft !== null && (
              <p className="mt-2.5 text-ink text-[13px] font-semibold">
                {ds.spotsLeft} spot{ds.spotsLeft === 1 ? '' : 's'} left
              </p>
            )}

            {(ds.pipsFilled > 0 || ds.pipsEmpty > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: ds.pipsFilled }).map((_, i) => (
                  <span
                    key={`f${i}`}
                    className="w-6 h-6 rounded-full bg-coral sonye-pip-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
                {Array.from({ length: ds.pipsEmpty }).map((_, i) => (
                  <span
                    key={`e${i}`}
                    className="w-6 h-6 rounded-full bg-card ring-2 ring-[#9DB4CC] sonye-pip-in"
                    style={{ animationDelay: `${(ds.pipsFilled + i) * 40}ms` }}
                  />
                ))}
              </div>
            )}

            {/* D10 join disclosure — above the CTA (Phase 4A ruling G4) */}
            {ds.ctaLabel && (
              <>
                <div className="mt-3.5">
                  <JoinDisclosure />
                </div>
                <a
                  href={ds.ctaHref!}
                  aria-label={`${ds.ctaLabel} — ${dayLabel} ${timeRange} at ${preview.venue_name}`}
                  className={`mt-2.5 flex min-h-[48px] items-center justify-center gap-1 rounded-full text-[19px] font-bold no-underline transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    ds.state === 'FULL'
                      ? 'bg-sky text-ink'
                      : 'bg-coral text-white hover:bg-coral-dark'
                  }`}
                >
                  {ds.ctaLabel}
                  <ChevronRight size={20} aria-hidden="true" className="flex-shrink-0" />
                </a>
              </>
            )}
          </section>

          {/* SMS subline */}
          {ds.smsCopy && (
            <p className="mt-3 text-steel-aa text-[12px] text-center">
              {ds.smsCopy}
            </p>
          )}
        </div>
      </div>

      {/* Trust trio + page footer */}
      <div className="sonye-reveal sonye-d2">
        <div className="w-full max-w-[390px] mx-auto px-5 pt-8">
          {[
            'No app to download',
            'Phone-verified players',
            'Leave before it locks',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-decorative flex-shrink-0" />
              <span className="text-steel-aa text-[12px]">{item}</span>
            </div>
          ))}
        </div>

        {/* Shared site footer (Instagram + policy links) */}
        <SiteFooter />
      </div>
    </main>
  );
}
