'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Send OTP ────────────────────────────────────────────────────────────────
// Property 4 (enumeration resistance): STATELESS — no public.users read.
// Only calls supabase.auth.signInWithOtp. Nothing else.
export async function sendOtpAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const rawPhone   = (formData.get('phone')       as string).trim().replace(/\D/g, '');
  const slotId     = (formData.get('slotId')      as string) || '';
  const claimToken = (formData.get('claim_token') as string) || '';

  // Normalise to E.164 — +1 prefix for v1 (US only)
  const phone = rawPhone.length === 11 && rawPhone.startsWith('1')
    ? `+${rawPhone}`
    : `+1${rawPhone}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('ip') || msg.includes('device') || msg.includes('too many request')) {
      return 'too many login attempts from this device — try again in an hour';
    }
    if (msg.includes('rate') || msg.includes('limit') || msg.includes('recently')) {
      return 'we just sent a code to that number — give it a minute, then try again';
    }
    return error.message;
  }

  const params = new URLSearchParams({ step: 'otp', phone });
  if (slotId)     params.set('slotId', slotId);
  if (claimToken) params.set('claim_token', claimToken);
  redirect(`/auth?${params.toString()}`);
}

// ─── Verify OTP + server-side D2 router (Amendment B) ────────────────────────
export async function verifyOtpAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const phone      = (formData.get('phone')       as string).trim();
  const code       = (formData.get('code')        as string).trim();
  const slotId     = (formData.get('slotId')      as string) || '';
  const claimToken = (formData.get('claim_token') as string) || '';

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  });

  if (verifyErr) {
    const msg = verifyErr.message.toLowerCase();
    // GoTrue wrong-code message: "Token has expired or is invalid" (contains both
    // "expired" AND "invalid"). Time-expiry messages omit "invalid". Gate on that.
    const isTimeExpired = msg.includes('expired') && !msg.includes('invalid');
    if (isTimeExpired) {
      return 'that code expired — request a new one';
    }
    return "that code didn't match — try again, or request a new one";
  }

  // Session is now live (HttpOnly cookie set via @supabase/ssr setAll callback).
  // Read public.users — RLS returns only the caller's own row (0 or 1).
  const { data: rows } = await supabase.from('users').select('id').limit(1);
  const isNewUser      = !rows || rows.length === 0;
  const hasSlotContext = !!slotId;
  const hasClaimToken  = !!claimToken;

  // D2 flow detection — evaluated server-side per Amendment B priority order.
  let flow: string;
  let dest: string;

  if (hasClaimToken) {
    flow = 'Flow 3 (claim) onboarding';
    dest = `/onboarding?flow=3&claim_token=${encodeURIComponent(claimToken)}`;
  } else if (hasSlotContext && isNewUser) {
    flow = 'Flow 2 (slot) onboarding';
    dest = `/onboarding?flow=2&slotId=${encodeURIComponent(slotId)}`;
  } else if (hasSlotContext && !isNewUser) {
    flow = "Flow 2′ direct join";
    dest = `/join?slotId=${encodeURIComponent(slotId)}`;
  } else if (isNewUser) {
    flow = 'Flow 1 (generic) onboarding';
    dest = '/onboarding?flow=1';
  } else {
    flow = 'returning user home';
    dest = '/';
  }

  // NOTE: never log the phone (or any PII) here — this runs on every OTP verify
  // and would persist plaintext numbers in Vercel runtime logs / log drains.
  console.log(
    `[D2 router] isNewUser=${isNewUser} hasSlot=${hasSlotContext} hasClaim=${hasClaimToken} → Route → ${flow}`,
  );

  redirect(dest);
}
