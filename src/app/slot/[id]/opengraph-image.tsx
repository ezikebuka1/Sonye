import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchSlotPreview, formatDallas, deriveState } from '@/lib/slot-preview';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

// D8.2 skill ramp — LOCAL to the OG card, per the blast-radius ruling: this
// card owns its ramp, so re-skinning it here cannot re-skin the /slot page
// pill or the lobby, which each carry their own identical copy. The /slot-pill
// migration this comment used to defer to is DONE — slot-preview's old-D8
// SKILL_DISPLAY is deleted.
const SKILL_MAP: Record<string, { bg: string; ink: string; label: string }> = {
  beginner:          { bg: '#DCEBFF', ink: '#15457B', label: 'Beginner' },
  advanced_beginner: { bg: '#FFF1CC', ink: '#8A5A00', label: 'Adv. Beginner' },
  intermediate:      { bg: '#D8EFDF', ink: '#246B42', label: 'Intermediate' },
  advanced:          { bg: '#D7E0EC', ink: '#14304D', label: 'Advanced' },
};

// Instagram glyph — inline SVG (lucide 1.8.0 dropped brand logos; no brand-icon
// package). This is baked into a PNG, so the handle is a memory cue, not a link.
function InstagramGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8DBCF1" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="#8DBCF1" stroke="none" />
    </svg>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Load fonts as Buffers — safe with runtime='nodejs'. Baloo2 700 + NunitoSans
  // 400 are the ONLY loaded faces; hierarchy is size + color, never an unloaded
  // weight.
  const baloo2Data = readFileSync(join(process.cwd(), 'public', 'fonts', 'baloo2-semibold.ttf'));
  const nunitoData = readFileSync(join(process.cwd(), 'public', 'fonts', 'nunito-sans-regular.ttf'));

  const preview = await fetchSlotPreview(id);

  if (!preview) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200, height: 630,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#E6F0FF',
          }}
        >
          <span style={{ fontFamily: 'Baloo2', fontWeight: 700, fontSize: 64, color: '#14304D' }}>
            sonye
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: 'Baloo2',     data: baloo2Data, weight: 700, style: 'normal' },
          { name: 'NunitoSans', data: nunitoData, weight: 400, style: 'normal' },
        ],
      }
    );
  }

  const { dayLabel, startLabel } = formatDallas(preview.starts_at, preview.ends_at);
  const ds = deriveState(preview, id);
  const skill = SKILL_MAP[preview.skill_level];

  // The two terminal states share one treatment: muted steel hero, no action
  // row. The status chip needs no branch — it renders ds.statusCopy, so each
  // state carries its own words in ("This game was cancelled" / "Already
  // started"). For the four non-terminal states this is byte-identical to the
  // `cancelled` boolean it replaces.
  const muted = ds.state === 'CANCELLED' || ds.state === 'STARTED';
  const heroInk = muted ? '#5E80A3' : '#14304D';
  const venueColor = muted ? '#5E80A3' : '#4A6B8C';

  // Short weekday in Dallas civil time (never the server default TZ).
  const shortDay = new Date(preview.starts_at).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'America/Chicago',
  });

  const isSky = ds.state === 'FULL';
  const ctaBg = isSky ? '#8DBCF1' : '#EE5E00';
  const ctaText = isSky ? '#14304D' : '#FFFFFF';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)',
        }}
      >
        {/* Reserved photo region — abstract geometry, right side, behind content */}
        <div style={{ position: 'absolute', display: 'flex', top: -140, right: -180, width: 560, height: 560, borderRadius: '50%', backgroundColor: '#E6F0FF' }} />
        <div style={{ position: 'absolute', display: 'flex', top: 70, right: 60, width: 360, height: 360, borderRadius: '50%', border: '2px solid #CFE0F4' }} />
        <div style={{ position: 'absolute', display: 'flex', top: 360, right: 380, width: 84, height: 84, borderRadius: '50%', backgroundColor: '#CFE0F4' }} />

        {/* Content area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px 72px' }}>
          {/* ROW 1 — wordmark + status chip · skill pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ fontFamily: 'Baloo2', fontWeight: 700, fontSize: 36, color: '#14304D' }}>
                sonye
              </span>
              <div style={{ display: 'flex', backgroundColor: '#E6F0FF', borderRadius: 999, padding: '8px 18px' }}>
                <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 20, color: '#14304D' }}>
                  {ds.statusCopy}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', backgroundColor: skill.bg, borderRadius: 999, padding: '8px 18px' }}>
              <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 18, color: skill.ink, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {skill.label}
              </span>
            </div>
          </div>

          {/* HERO — date/time leads */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 24, color: '#5E80A3', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              {dayLabel}
            </span>
            <span style={{ fontFamily: 'Baloo2', fontWeight: 700, fontSize: 112, color: heroInk, lineHeight: 1 }}>
              {startLabel}
            </span>
            <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 26, color: venueColor }}>
              {preview.venue_name} · {preview.neighborhood}, Dallas
            </span>
          </div>

          {/* ACTION ROW — fixed left slot + right CTA; omitted entirely for the
              terminal states (CANCELLED, STARTED) */}
          {!muted && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {ds.state === 'FORMING' ? (
                  <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 22, color: '#4A6B8C', maxWidth: 560 }}>
                    {ds.bodyCopy}
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {Array.from({ length: ds.pipsFilled }).map((_, i) => (
                        <div key={`f${i}`} style={{ display: 'flex', width: 22, height: 22, borderRadius: '50%', backgroundColor: '#EE5E00' }} />
                      ))}
                      {Array.from({ length: ds.pipsEmpty }).map((_, i) => (
                        <div key={`e${i}`} style={{ display: 'flex', width: 22, height: 22, borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #9DB4CC' }} />
                      ))}
                    </div>
                    {ds.state === 'FILLING' && (
                      <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 20, color: '#14304D' }}>
                        {ds.spotsLeft} spot{ds.spotsLeft === 1 ? '' : 's'} left
                      </span>
                    )}
                  </div>
                )}
              </div>
              {ds.ctaLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: ctaBg, borderRadius: 999, padding: '16px 30px' }}>
                  <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 24, color: ctaText }}>
                    {ds.ctaLabel}
                  </span>
                  <Chevron color={ctaText} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER BAND — ink, full-width, all five states */}
        <div style={{ display: 'flex', width: '100%', backgroundColor: '#14304D', padding: '22px 72px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 22, color: '#FFFFFF' }}>
              Pickleball · {shortDay} {startLabel} · {preview.venue_name}
            </span>
            <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>
              sonye.app
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InstagramGlyph />
            <span style={{ fontFamily: 'NunitoSans', fontWeight: 400, fontSize: 22, color: '#8DBCF1' }}>
              @sonye.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Baloo2',     data: baloo2Data, weight: 700, style: 'normal' },
        { name: 'NunitoSans', data: nunitoData, weight: 400, style: 'normal' },
      ],
    }
  );
}
