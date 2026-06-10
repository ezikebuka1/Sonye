import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { OnboardingForm } from './OnboardingForm';

type SlotPreview = {
  venue_name:   string;
  starts_at:    string;
  capacity:     number;
  fill_count:   number | null;
  fill_ratio_shown: boolean;
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params   = await searchParams;
  const flow     = params.flow     ?? '1';
  const slotId   = params.slotId   ?? '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Flow 3 — waitlist claim: skip the form, write directly, then redirect
  if (flow === '3') {
    const claimToken = params.claim_token ?? '';
    if (claimToken) {
      const rawPhone = user.phone ?? '';
      const phone    = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
      const { error } = await supabase.rpc('signup_claim', {
        p_phone:        phone,
        p_auth_user_id: user.id,
        p_claim_token:  claimToken,
        // Positional defaults — name/skill come from waitlist row
        p_first_name:   null,
        p_skill_level:  null,
        p_last_name:    null,
        p_gender:       null,
        p_general_availability: null,
        p_preferred_venues:     null,
      });
      if (error) {
        // signup_claim path 2 (phone-unclaimed bind) or error — fall through to form
        if (!error.message.includes('already')) {
          redirect('/?toast=welcomed');
        }
      } else {
        redirect('/?toast=welcomed');
      }
    }
  }

  // Flow 2 — net-new with slot context: fetch anon slot preview for banner
  let slotPreview: SlotPreview | null = null;
  if (slotId) {
    const anon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await anon.rpc('slot_share_preview', { target_slot: slotId });
    const rows = data as SlotPreview[] | null;
    slotPreview = rows?.[0] ?? null;
  }

  return (
    <OnboardingForm
      flow={slotId ? '2' : '1'}
      slotId={slotId}
      slotPreview={slotPreview}
    />
  );
}
