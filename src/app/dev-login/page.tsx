'use server';

// DEV-ONLY local login shortcut — gated to development (notFound() in prod).
// Establishes a real, RLS-valid session: after OTP verify it binds the seeded
// user's auth_user_id via signup_claim Path A (phone known + auth_user_id NULL),
// the same bind onboarding uses — so current_user_id() resolves and RLS-gated
// surfaces (lobby, owner views) render locally. Kept (no longer a throwaway).
// Usage: POST phone → receive test OTP → POST phone+token → bound session.

import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';

async function sendOtp(formData: FormData) {
  'use server';
  if (process.env.NODE_ENV === 'production') notFound();
  const phone = formData.get('phone') as string;
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ phone });
  redirect(`/dev-login?phone=${encodeURIComponent(phone)}&sent=1`);
}

async function verifyOtp(formData: FormData) {
  'use server';
  if (process.env.NODE_ENV === 'production') notFound();
  const phone = formData.get('phone') as string;
  const token = formData.get('token') as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) redirect(`/dev-login?error=${encodeURIComponent(error.message)}`);

  // Bind the seeded user row to this GoTrue session so current_user_id() / RLS
  // resolve. signup_claim Path A: the owner's claim_token is NULL (so the RPC's
  // claim_token branch can't match) and it binds by phone where auth_user_id IS
  // NULL — exactly the bind submitOnboardingAction performs. Idempotent: a second
  // run hits Path C (already bound, read-only). +15555550101 always maps to the
  // same GoTrue auth row, so the bind stays consistent across logins.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const rawPhone = user.phone ?? '';
    const normPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
    const { error: bindErr } = await supabase.rpc('signup_claim', {
      p_phone:        normPhone,
      p_auth_user_id: user.id,
      p_first_name:   null,   // COALESCE keeps the seeded value
      p_skill_level:  null,   // COALESCE keeps the seeded value
    });
    if (bindErr) {
      redirect(`/dev-login?error=${encodeURIComponent('bind failed: ' + bindErr.message)}`);
    }
  }
  redirect('/');
}

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; sent?: string; error?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const params = await searchParams;

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: 480 }}>
      <h1>Dev Login (dev-only)</h1>
      {params.error && <p style={{ color: 'red' }}>Error: {params.error}</p>}

      {!params.sent ? (
        <form action={sendOtp}>
          <label>Phone (E.164)<br />
            <input name="phone" defaultValue="+15555550101" style={{ width: '100%' }} />
          </label>
          <br /><br />
          <button type="submit">Send OTP</button>
        </form>
      ) : (
        <form action={verifyOtp}>
          <input type="hidden" name="phone" value={params.phone} />
          <label>OTP token<br />
            <input name="token" defaultValue="123456" style={{ width: '100%' }} />
          </label>
          <br /><br />
          <button type="submit">Verify OTP</button>
        </form>
      )}
    </main>
  );
}
