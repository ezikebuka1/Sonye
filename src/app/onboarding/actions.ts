'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export type OnboardingErrors = {
  first_name?: string;
  skill_level?: string;
  general?: string;
};

type SlotPreview = {
  venue_name: string;
  starts_at:  string;
};

function fmtSlot(preview: SlotPreview): string {
  const dt   = new Date(preview.starts_at);
  const day  = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).format(dt);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' }).format(dt);
  return `${preview.venue_name} · ${day} ${time}`;
}

export async function submitOnboardingAction(
  _prevState: OnboardingErrors | null,
  formData: FormData,
): Promise<OnboardingErrors | null> {
  const firstName  = (formData.get('first_name')  as string ?? '').trim();
  const lastName   = (formData.get('last_name')   as string ?? '').trim();
  const skillLevel = (formData.get('skill_level') as string ?? '').trim();
  const gender     = (formData.get('gender')      as string ?? '') || null;
  const slotId     = (formData.get('slotId')      as string ?? '');

  // Validate — server-side only (spec: validate on submit, never while typing)
  const errors: OnboardingErrors = {};
  if (!firstName) errors.first_name  = "we need a first name — it's how your group knows you";
  if (!skillLevel) errors.skill_level = 'pick whatever feels right — you can change it later';
  if (Object.keys(errors).length > 0) return errors;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Normalise phone — GoTrue may omit the leading +
  const rawPhone = user.phone ?? '';
  const phone    = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

  // ── Write 1: signup_claim — commits the account independently ────────────
  const { error: claimErr } = await supabase.rpc('signup_claim', {
    p_phone:        phone,
    p_auth_user_id: user.id,
    p_first_name:   firstName,
    p_skill_level:  skillLevel,
    p_last_name:    lastName  || null,
    p_gender:       gender,
    // D7.4: availability + venues always NULL for in-app signups
    p_general_availability: null,
    p_preferred_venues:     null,
  });

  if (claimErr) {
    return { general: 'something went wrong — please try again' };
  }

  if (!slotId) {
    // Flow 1 — generic; account durable; go home
    redirect('/?toast=welcomed');
  }

  // ── Write 2: join_slot — best-effort; account already durable ────────────
  const { data: joinRows, error: joinErr } = await supabase.rpc('join_slot', { p_slot_id: slotId });

  if (joinErr) {
    const msg = joinErr.message ?? '';
    if (msg.includes('is cancelled')) {
      redirect('/?toast=cancelled');
    }
    if (msg.includes('D9 violation')) {
      redirect('/?toast=d9');
    }
    // Other join errors (double-active etc.) — account safe, go home
    redirect('/?toast=welcomed');
  }

  const rows = joinRows as Array<{ membership_id: string; resulting_status: string }> | null;
  const status = rows?.[0]?.resulting_status ?? 'joined';

  if (status === 'waitlisted') {
    redirect('/?toast=waitlisted');
  }

  // Fetch brief slot description for the joined toast
  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: previewRows } = await anon.rpc('slot_share_preview', { target_slot: slotId });
  const preview = (previewRows as SlotPreview[] | null)?.[0];
  const slotDesc = preview ? fmtSlot(preview) : 'your game';

  redirect(`/?toast=joined&slot=${encodeURIComponent(slotDesc)}`);
}
