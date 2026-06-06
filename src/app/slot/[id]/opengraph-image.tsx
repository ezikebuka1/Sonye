import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  fetchSlotPreview,
  formatDallas,
  deriveState,
  SKILL_DISPLAY,
} from '@/lib/slot-preview';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

// Gradient pairs [from, to] per state
const BG: Record<string, [string, string]> = {
  FORMING:   ['#1A3650', '#2A5070'],
  FILLING:   ['#B85D3A', '#D4724A'],
  FULL:      ['#2A3F52', '#3A5472'],
  CANCELLED: ['#5A7A9A', '#7A9AB8'],
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Load fonts as ArrayBuffer — safe with runtime='nodejs'
  const baloo2Data   = readFileSync(join(process.cwd(), 'public', 'fonts', 'baloo2-semibold.ttf'));
  const nunitoData   = readFileSync(join(process.cwd(), 'public', 'fonts', 'nunito-sans-regular.ttf'));

  const preview = await fetchSlotPreview(id);

  if (!preview) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200, height: 630,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1A3650',
          }}
        >
          <span style={{ color: '#7A9AB8', fontSize: 32, fontWeight: 700, fontFamily: 'Baloo2' }}>
            sonye
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: 'Baloo2',   data: baloo2Data,  weight: 700, style: 'normal' },
          { name: 'NunitoSans', data: nunitoData, weight: 400, style: 'normal' },
        ],
      }
    );
  }

  const { dayLabel, startLabel } = formatDallas(preview.starts_at, preview.ends_at);
  const ds    = deriveState(preview, id);
  const skill = SKILL_DISPLAY[preview.skill_level];
  const [bgFrom, bgTo] = BG[ds.state] ?? BG.FORMING;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: 'flex', flexDirection: 'column',
          background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgTo} 100%)`,
          padding: '56px 72px',
        }}
      >
        {/* Wordmark + skill pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontFamily: 'NunitoSans', fontSize: 18, fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            sonye
          </span>
          <span style={{
            fontFamily: 'NunitoSans', fontSize: 12, fontWeight: 400,
            color: skill.ink, backgroundColor: skill.bg,
            padding: '5px 14px', borderRadius: 20,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {skill.label}
          </span>
        </div>

        {/* Day + time hero — Baloo 2 */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          flex: 1, justifyContent: 'center', gap: 10,
        }}>
          <p style={{
            fontFamily: 'NunitoSans', fontSize: 20, fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            margin: 0,
          }}>
            {dayLabel}
          </p>
          <p style={{
            fontFamily: 'Baloo2', fontSize: 88, fontWeight: 700,
            color: '#FFFFFF', lineHeight: 1, margin: 0,
          }}>
            {startLabel}
          </p>
          <p style={{
            fontFamily: 'NunitoSans', fontSize: 24, fontWeight: 400,
            color: 'rgba(255,255,255,0.7)', margin: 0,
          }}>
            {preview.venue_name} · {preview.neighborhood}, Dallas
          </p>
        </div>

        {/* Footer band */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'rgba(0,0,0,0.28)',
          borderRadius: 16, padding: '18px 32px',
        }}>
          {/* Pips or status text */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {ds.state === 'FORMING' ? (
              <span style={{
                fontFamily: 'NunitoSans', fontSize: 20, fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
              }}>
                Game forming
              </span>
            ) : (
              <>
                {Array.from({ length: ds.pipsFilled }).map((_, i) => (
                  <div key={`f${i}`} style={{
                    width: 18, height: 18, borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                  }} />
                ))}
                {Array.from({ length: ds.pipsEmpty }).map((_, i) => (
                  <div key={`e${i}`} style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                  }} />
                ))}
              </>
            )}
          </div>

          {/* CTA copy */}
          <span style={{
            fontFamily: 'NunitoSans', fontSize: 20, fontWeight: 400,
            color: '#FFFFFF',
          }}>
            {ds.state === 'CANCELLED' ? 'Cancelled' :
             ds.state === 'FULL'      ? 'Full · join waitlist' : 'Tap to join'}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Baloo2',     data: baloo2Data,  weight: 700, style: 'normal' },
        { name: 'NunitoSans', data: nunitoData,  weight: 400, style: 'normal' },
      ],
    }
  );
}
