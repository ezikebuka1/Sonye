import { cache } from 'react';
import type { Metadata } from 'next';
import { MapPin, ArrowUpRight } from 'lucide-react';
import {
  fetchSlotPreview,
  formatDallas,
  formatTimeRange,
  deriveState,
  SKILL_DISPLAY,
} from '@/lib/slot-preview';
import { courtMapsUrl } from '@/lib/maps-url';
import JoinDisclosure from '@/components/JoinDisclosure';

// Deduplicate the fetch between generateMetadata and the page render
const getCachedPreview = cache((id: string) => fetchSlotPreview(id));

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
  const skill   = SKILL_DISPLAY[preview.skill_level];

  const genderTag =
    preview.gender_category === 'women' ? 'Women' :
    preview.gender_category === 'men'   ? 'Men'   : null;

  return (
    <main
      className="min-h-screen bg-[#E6F0FF] flex flex-col items-center"
    >
      <div className="w-full max-w-[390px] flex flex-col min-h-screen">

        {/* Wordmark */}
        <div className="pt-10 pb-2 flex flex-col items-center gap-2">
          <span
            className="text-[13px] tracking-[0.12em] uppercase text-[#5E80A3] font-semibold"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            sonye
          </span>
          <span
            className="bg-[#DCEBFF] text-[#15457B] text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {preview.sport_name}
          </span>
        </div>

        {/* Day / Time hero — Baloo 2 */}
        <div className="mt-6 px-6 text-center">
          <p
            className="text-[#5E80A3] text-[12px] font-semibold uppercase tracking-widest mb-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {dayLabel}
          </p>
          <p
            className="text-[#14304D] text-[36px] font-bold leading-tight"
            style={{ fontFamily: 'var(--font-baloo2)' }}
          >
            {timeRange}
          </p>
        </div>

        {/* Venue line — tappable to Google Maps when the venue has court
            coordinates (D24); plain card row when coords are null. */}
        {preview.venue_lat !== null && preview.venue_lng !== null ? (
          <a
            href={courtMapsUrl(preview.venue_lat, preview.venue_lng)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${preview.venue_name} in Google Maps (opens in a new tab)`}
            className="mt-5 mx-6 bg-white border border-[#CFE0F4] rounded-2xl px-4 py-3 flex items-center gap-2 no-underline"
          >
            <MapPin size={16} color="#4A6B8C" className="flex-shrink-0" aria-hidden="true" />
            <span
              className="text-[#14304D] text-[14px] font-medium underline decoration-[#4A6B8C] underline-offset-2"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {preview.venue_name}
            </span>
            <span className="text-[#CFE0F4]">·</span>
            <span
              className="text-[#5E80A3] text-[13px]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {preview.neighborhood}, Dallas
            </span>
            <ArrowUpRight size={14} color="#4A6B8C" className="flex-shrink-0 ml-auto" aria-hidden="true" />
          </a>
        ) : (
          <div className="mt-5 mx-6 bg-white border border-[#CFE0F4] rounded-2xl px-4 py-3 flex items-center gap-2">
            <span
              className="text-[#14304D] text-[14px] font-medium"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {preview.venue_name}
            </span>
            <span className="text-[#CFE0F4]">·</span>
            <span
              className="text-[#5E80A3] text-[13px]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {preview.neighborhood}, Dallas
            </span>
          </div>
        )}

        {/* Park-honesty subline — free public court reality (language-honesty sweep) */}
        <p
          className="mt-2 mx-6 text-[#5E80A3] text-[13px]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Free public court — walk-up, park rules apply.
        </p>

        {/* Pills row */}
        <div className="mt-4 px-6 flex flex-wrap gap-2">
          <span
            className="text-[12px] font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: skill.bg,
              color: skill.ink,
              fontFamily: 'var(--font-nunito)',
            }}
          >
            {skill.label}
          </span>
          <span
            className="bg-[#E6F0FF] text-[#14304D] border border-[#CFE0F4] text-[12px] font-semibold px-3 py-1 rounded-full"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Group of {preview.capacity}
          </span>
          {genderTag && (
            <span
              className="bg-[#E6F0FF] text-[#5E80A3] border border-[#CFE0F4] text-[12px] font-medium px-3 py-1 rounded-full"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {genderTag}
            </span>
          )}
        </div>

        {/* Owner line REMOVED 2026-07 — host-neutral canon (amendment waiver):
            the public /slot page no longer surfaces the organizer's name/initial.
            owner_first_name stays in the SlotPreview type / slot_share_preview
            projection (server-only, is_host pattern), just not rendered. */}

        {/* State card */}
        <div className="mt-6 mx-6 rounded-2xl overflow-hidden border border-[#CFE0F4]">

          {/* Status header */}
          <div
            className="px-5 py-4"
            style={{
              backgroundColor:
                ds.state === 'FILLING' ? '#FF6A001A' :
                ds.state === 'FORMING' ? '#E6F0FF' : '#FFFFFF',
            }}
          >
            <p
              className="text-[15px] font-semibold"
              style={{
                color:
                  ds.state === 'FILLING' ? '#FF6A00' :
                  ds.state === 'FORMING' ? '#14304D' : '#5E80A3',
                fontFamily: 'var(--font-nunito)',
              }}
            >
              {ds.statusCopy}
            </p>
            {ds.bodyCopy && (
              <p
                className="mt-2 text-[13px] leading-snug"
                style={{ color: '#5E80A3', fontFamily: 'var(--font-nunito)' }}
              >
                {ds.bodyCopy}
              </p>
            )}
            {ds.state === 'FILLING' && ds.spotsLeft !== null && (
              <p
                className="mt-1 text-[13px] font-semibold"
                style={{ color: '#FF6A00', fontFamily: 'var(--font-nunito)' }}
              >
                {ds.spotsLeft} spot{ds.spotsLeft === 1 ? '' : 's'} left
              </p>
            )}
          </div>

          {/* Pips — FILLING and FULL only */}
          {(ds.state === 'FILLING' || ds.state === 'FULL') && (
            <div className="px-5 py-4 flex flex-wrap gap-2 border-t border-[#CFE0F4] bg-white">
              {Array.from({ length: ds.pipsFilled }).map((_, i) => (
                <span
                  key={`f${i}`}
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: '#FF6A00' }}
                />
              ))}
              {Array.from({ length: ds.pipsEmpty }).map((_, i) => (
                <span
                  key={`e${i}`}
                  className="w-6 h-6 rounded-full border-2"
                  style={{ borderColor: '#CFE0F4' }}
                />
              ))}
            </div>
          )}

          {/* D10 join disclosure — above the CTA (Phase 4A ruling G4) */}
          {ds.ctaLabel && (
            <div className="px-5 py-2.5 bg-white border-t border-[#CFE0F4]">
              <JoinDisclosure />
            </div>
          )}

          {/* Footer band */}
          <div
            className={`px-5 py-3 flex items-center ${ds.state === 'FORMING' ? 'justify-end' : 'justify-between'}`}
            style={{ backgroundColor: ds.footerBg }}
          >
            {ds.state !== 'FORMING' && (
              <span
                className="text-white text-[13px] font-medium opacity-90"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {ds.state === 'CANCELLED' ? 'Game cancelled' :
                 ds.state === 'FILLING'   ? `${ds.spotsLeft} spot${ds.spotsLeft === 1 ? '' : 's'} left` : 'Full'}
              </span>
            )}
            {ds.ctaLabel && (
              <a
                href={ds.ctaHref!}
                className="bg-white text-[13px] font-semibold px-4 py-1.5 rounded-xl"
                style={{ color: ds.footerBg, fontFamily: 'var(--font-nunito)' }}
              >
                {ds.ctaLabel}
              </a>
            )}
          </div>
        </div>

        {/* SMS subline */}
        {ds.smsCopy && (
          <p
            className="mt-3 px-6 text-[#5E80A3] text-[12px] text-center"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {ds.smsCopy}
          </p>
        )}

        {/* Trust trio */}
        <div className="mt-auto px-6 pt-8 pb-4">
          {[
            'No app to download',
            'Phone-verified players',
            'Leave before it locks',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] flex-shrink-0" />
              <span
                className="text-[#5E80A3] text-[12px]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* Page footer */}
        <div className="px-6 pb-8 text-center">
          <p
            className="text-[#9DB8D2] text-[11px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Recurring pickleball games in Dallas · sonye.app
          </p>
        </div>

      </div>
    </main>
  );
}
