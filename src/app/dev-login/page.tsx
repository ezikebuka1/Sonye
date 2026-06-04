'use server';

// THROWAWAY — Phase 0 local auth verification only.
// Not wired to any navigation. Delete when Phase 3 auth UI lands.
// Usage: POST phone → receive test OTP → POST phone+token → session established.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function sendOtp(formData: FormData) {
  'use server';
  const phone = formData.get('phone') as string;
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ phone });
  redirect(`/dev-login?phone=${encodeURIComponent(phone)}&sent=1`);
}

async function verifyOtp(formData: FormData) {
  'use server';
  const phone = formData.get('phone') as string;
  const token = formData.get('token') as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) redirect(`/dev-login?error=${encodeURIComponent(error.message)}`);
  else redirect('/');
}

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: 480 }}>
      <h1>Dev Login (Phase 0)</h1>
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
