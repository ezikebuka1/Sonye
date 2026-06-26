import { createClient as createAnonClient } from '@supabase/supabase-js';
import { PhoneForm } from './PhoneForm';
import { OtpForm }   from './OtpForm';
import { formatCentral } from '@/lib/format-central';
import PickleballIcon from '@/components/icons/PickleballIcon';

// slot_share_preview projection (anon, Bucket A). The banner consumes venue +
// day/time + skill + masked fill + gender tag, and is_cancelled to fall back.
// fill_count is NULL below the 50% threshold; fill_ratio_shown is the mask
// boolean (NOTE: that name, not get_public_feed's 'fill_shown').
type SlotPreview = {
  venue_name:       string;
  starts_at:        string;
  skill_level:      string;
  gender_category:  'open' | 'women' | 'men';
  capacity:         number;
  fill_count:       number | null;
  fill_ratio_shown: boolean;
  is_cancelled:     boolean;
};

// Flow-2 "you're joining" context banner — shown on BOTH steps so the game
// stays visible through sign-in (ruling 1). Fill clause has THREE states,
// checked full-FIRST so a full slot reads "waitlist", never "0 left":
//   full (fill_count === capacity) → waitlist eyebrow, NO count clause
//   else fill_ratio_shown (>=50%)  → " · N spots left"
//   else (masked, <50%, NULL)      → venue · skill only
function JoinBanner({ preview }: { preview: SlotPreview }) {
  const { dayLabel, timeLabel } = formatCentral(preview.starts_at);
  const isFull  = preview.fill_count === preview.capacity;
  const eyebrow = isFull ? "you're joining the waitlist" : "you're joining";
  const skill   = preview.skill_level.replace(/_/g, ' ');
  const spotsLeft =
    !isFull && preview.fill_ratio_shown && preview.fill_count !== null
      ? preview.capacity - preview.fill_count
      : null;
  const genderTag =
    preview.gender_category === 'women' ? "Women's"
    : preview.gender_category === 'men' ? "Men's"
    : null;

  return (
    <div className="w-full mb-7 rounded-2xl bg-card border border-card-border px-4 py-3.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PickleballIcon aria-hidden="true" className="w-5 h-5 text-[#FF6A00]" />
          <p className="text-xs font-bold uppercase tracking-wide text-coral">{eyebrow}</p>
        </div>
        {genderTag && (
          <span className="bg-inset border border-card-border rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft">
            {genderTag}
          </span>
        )}
      </div>
      <p className="font-serif text-2xl font-bold text-ink leading-tight">
        {dayLabel} · {timeLabel}
      </p>
      <p className="text-sm text-ink-soft">
        {preview.venue_name} · {skill}
        {spotsLeft !== null ? ` · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : ''}
      </p>
    </div>
  );
}

// Flow-1 cold-arrival "how it works" strip — slim, must not dominate the field.
function HowItWorks() {
  const steps = ['find a game', 'join six players', 'show up & play'];
  return (
    <div className="w-full mb-6 flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="flex-none w-5 h-5 rounded-full bg-skill-beg-bg text-skill-beg-ink text-[11px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-sm text-ink">{s}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?:        string;
    phone?:       string;
    slotId?:      string;
    claim_token?: string;
  }>;
}) {
  const params     = await searchParams;
  const step       = params.step        ?? 'phone';
  const phone      = params.phone       ?? '';
  const slotId     = params.slotId      ?? '';
  const claimToken = params.claim_token ?? '';

  // Anon read via slot_share_preview. A cancelled slot (is_cancelled) falls back
  // to the Flow-1 cold variant — don't banner a dead game (ruling 2).
  let preview: SlotPreview | null = null;
  if (slotId) {
    const anon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await anon.rpc('slot_share_preview', { target_slot: slotId });
    const row = (data as SlotPreview[] | null)?.[0];
    if (row && !row.is_cancelled) preview = row;
  }

  const isFull = !!preview && preview.fill_count === preview.capacity;
  const phoneHeader = preview
    ? (isFull
        ? 'Enter your number to join the waitlist for this game'
        : 'Enter your number to join this game')
    : 'Enter your number to log in or join a game';

  const bannerEl = preview ? <JoinBanner preview={preview} /> : null;

  return (
    <main className="min-h-screen bg-wash flex flex-col items-center justify-start px-5 pt-14 pb-10 max-w-[390px] mx-auto">
      {step === 'otp' ? (
        <>
          {/* Banner persists through the OTP step too (ruling 1). */}
          {bannerEl}
          <h1 className="text-xl font-bold text-ink mb-6 text-center w-full">
            we texted you a 6-digit code
          </h1>
          <OtpForm phone={phone} slotId={slotId} claimToken={claimToken} />
        </>
      ) : (
        <>
          {/* Lowercase wordmark on both variants (ruling 3). */}
          <p className="font-serif text-2xl font-bold text-ink lowercase mb-6">sonye</p>

          {/* Flow-2 → the context banner; Flow-1 (cold / cancelled) → the strip. */}
          {bannerEl ?? <HowItWorks />}

          <h1 className="text-lg font-bold text-ink text-center mb-5 w-full">
            {phoneHeader}
          </h1>

          <PhoneForm slotId={slotId} claimToken={claimToken} />
        </>
      )}
    </main>
  );
}
