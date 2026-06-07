import { cache } from 'react';
import { headers } from 'next/headers';
import { Baloo_2, Nunito_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import {
  fetchSlotPreview,
  formatDallas,
  formatTimeRange,
  deriveState,
  SKILL_DISPLAY,
} from '@/lib/slot-preview';

const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-baloo2',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-nunito',
});

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

  const headersList = await headers();
  const host  = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  let title: string;
  let description: string;

  switch (ds.state) {
    case 'FORMING':
      title       = `Pickleball · ${ogShortDay} · ${preview.venue_name}`.slice(0, 35);
      description = 'Curated Dallas pickleball game forming — tap to grab a spot.';
      break;
    case 'FILLING':
      title       = `${ds.spotsLeft} spots left · ${ogShortDay}`.slice(0, 35);
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
        className={`${baloo2.variable} ${nunitoSans.variable} min-h-screen bg-[#EEF4FA] flex flex-col items-center justify-center px-6`}
      >
        <p className="text-[#7A9AB8] text-sm text-center font-[family-name:var(--font-nunito)]">
          This game isn&apos;t available.
        </p>
        <a
          href="/"
          className="mt-4 text-[#D4724A] text-sm underline underline-offset-2 font-[family-name:var(--font-nunito)]"
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
  const initial = preview.owner_first_name.charAt(0).toUpperCase();

  const genderTag =
    preview.gender_category === 'women' ? 'Women' :
    preview.gender_category === 'men'   ? 'Men'   : null;

  return (
    <main
      className={`${baloo2.variable} ${nunitoSans.variable} min-h-screen bg-[#EEF4FA] flex flex-col items-center`}
    >
      <div className="w-full max-w-[390px] flex flex-col min-h-screen">

        {/* Wordmark */}
        <div className="pt-10 pb-2 flex flex-col items-center gap-2">
          <span
            className="text-[13px] tracking-[0.12em] uppercase text-[#7A9AB8] font-semibold"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            sonye
          </span>
          <span
            className="bg-[#E0EEF9] text-[#0C447C] text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {preview.sport_name}
          </span>
        </div>

        {/* Day / Time hero — Baloo 2 */}
        <div className="mt-6 px-6 text-center">
          <p
            className="text-[#7A9AB8] text-[12px] font-semibold uppercase tracking-widest mb-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {dayLabel}
          </p>
          <p
            className="text-[#1A3650] text-[36px] font-bold leading-tight"
            style={{ fontFamily: 'var(--font-baloo2)' }}
          >
            {timeRange}
          </p>
        </div>

        {/* Venue line */}
        <div className="mt-5 mx-6 bg-white border border-[#DAE7F1] rounded-2xl px-4 py-3 flex items-center gap-2">
          <span
            className="text-[#4A7A9E] text-[14px] font-medium"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {preview.venue_name}
          </span>
          <span className="text-[#DAE7F1]">·</span>
          <span
            className="text-[#7A9AB8] text-[13px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {preview.neighborhood}, Dallas
          </span>
        </div>

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
            className="bg-[#EEF4FA] text-[#1A3650] border border-[#DAE7F1] text-[12px] font-semibold px-3 py-1 rounded-full"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Group of {preview.capacity}
          </span>
          {genderTag && (
            <span
              className="bg-[#EEF4FA] text-[#7A9AB8] border border-[#DAE7F1] text-[12px] font-medium px-3 py-1 rounded-full"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {genderTag}
            </span>
          )}
        </div>

        {/* Owner line */}
        <div className="mt-5 px-6 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0"
            style={{ backgroundColor: '#1A3650', fontFamily: 'var(--font-nunito)' }}
          >
            {initial}
          </div>
          <span
            className="text-[#7A9AB8] text-[13px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Organized by{' '}
            <span className="text-[#1A3650] font-medium">{preview.owner_first_name}</span>
          </span>
        </div>

        {/* State card */}
        <div className="mt-6 mx-6 rounded-2xl overflow-hidden border border-[#DAE7F1]">

          {/* Status header */}
          <div
            className="px-5 py-4"
            style={{
              backgroundColor:
                ds.state === 'FILLING' ? '#FFF0EB' :
                ds.state === 'FORMING' ? '#EEF4FA' : '#F6F9FC',
            }}
          >
            <p
              className="text-[15px] font-semibold"
              style={{
                color:
                  ds.state === 'FILLING' ? '#D4724A' :
                  ds.state === 'FORMING' ? '#1A3650' : '#7A9AB8',
                fontFamily: 'var(--font-nunito)',
              }}
            >
              {ds.statusCopy}
            </p>
            {ds.bodyCopy && (
              <p
                className="mt-2 text-[13px] leading-snug"
                style={{ color: '#7A9AB8', fontFamily: 'var(--font-nunito)' }}
              >
                {ds.bodyCopy}
              </p>
            )}
            {ds.state === 'FILLING' && ds.spotsLeft !== null && (
              <p
                className="mt-1 text-[13px] font-semibold"
                style={{ color: '#D4724A', fontFamily: 'var(--font-nunito)' }}
              >
                {ds.spotsLeft} spot{ds.spotsLeft === 1 ? '' : 's'} left
              </p>
            )}
          </div>

          {/* Pips — FILLING and FULL only */}
          {(ds.state === 'FILLING' || ds.state === 'FULL') && (
            <div className="px-5 py-4 flex flex-wrap gap-2 border-t border-[#DAE7F1] bg-white">
              {Array.from({ length: ds.pipsFilled }).map((_, i) => (
                <span
                  key={`f${i}`}
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: '#D4724A' }}
                />
              ))}
              {Array.from({ length: ds.pipsEmpty }).map((_, i) => (
                <span
                  key={`e${i}`}
                  className="w-6 h-6 rounded-full border-2"
                  style={{ borderColor: '#DAE7F1' }}
                />
              ))}
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
                 ds.state === 'FILLING'   ? `${ds.spotsLeft} spots left` : 'Full'}
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
            className="mt-3 px-6 text-[#7A9AB8] text-[12px] text-center"
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4724A] flex-shrink-0" />
              <span
                className="text-[#7A9AB8] text-[12px]"
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
            className="text-[#A8C4DB] text-[11px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Recurring pickleball games in Dallas · sonye.app
          </p>
        </div>

      </div>
    </main>
  );
}
