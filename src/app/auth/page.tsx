import { createClient as createAnonClient } from '@supabase/supabase-js';
import { PhoneForm } from './PhoneForm';
import { OtpForm }   from './OtpForm';

type SlotPreview = {
  venue_name: string;
  starts_at:  string;
};

function formatBanner(preview: SlotPreview): string {
  const dt  = new Date(preview.starts_at);
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Chicago',
  }).format(dt);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Chicago',
  }).format(dt);
  return `${day} · ${time} · ${preview.venue_name}`;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?:         string;
    phone?:        string;
    slotId?:       string;
    claim_token?:  string;
  }>;
}) {
  const params     = await searchParams;
  const step       = params.step        ?? 'phone';
  const phone      = params.phone       ?? '';
  const slotId     = params.slotId      ?? '';
  const claimToken = params.claim_token ?? '';

  // Banner — anon read via slot_share_preview (reuses Phase 2 anon surface).
  let bannerText: string | null = null;
  if (slotId) {
    const anon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await anon.rpc('slot_share_preview', { target_slot: slotId });
    const row = (data as SlotPreview[] | null)?.[0];
    if (row) bannerText = formatBanner(row);
  }

  return (
    <main className="min-h-screen bg-[#E6F0FF] flex flex-col items-center justify-start px-5 pt-14 pb-10 max-w-[390px] mx-auto">

      {/* Pinned banner — shown on both screens when ?slotId is present */}
      {bannerText && (
        <div className="w-full mb-7 rounded-2xl bg-white border border-[#CFE0F4] px-4 py-3">
          <p className="text-xs font-medium text-[#5E80A3] uppercase tracking-wide mb-0.5">
            You&apos;re joining
          </p>
          <p className="text-sm font-semibold text-[#14304D]">{bannerText}</p>
        </div>
      )}

      {step === 'otp' ? (
        <>
          <h1 className="text-xl font-bold text-[#14304D] mb-6 text-center w-full">
            we texted you a 6-digit code
          </h1>
          <OtpForm phone={phone} slotId={slotId} claimToken={claimToken} />
        </>
      ) : (
        <>
          {/* Public intro — gives a cold visitor / carrier reviewer immediate
              context for what Sonye is, replacing the bare phone prompt (A2P
              reviewability). Additive context only: the consent line, policy
              links, and Send-code submit live untouched in PhoneForm below.
              Gated on !bannerText — a share-link visitor already has the
              "You're joining …" banner for context. */}
          {!bannerText && (
            <div className="w-full mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#14304D]">Sonye</h1>
              <p className="mt-2 text-sm text-[#5E80A3]">
                Curated recurring pickleball games in Dallas. Enter your number to log in or join a game.
              </p>
            </div>
          )}
          <PhoneForm slotId={slotId} claimToken={claimToken} />
        </>
      )}
    </main>
  );
}
