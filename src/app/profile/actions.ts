'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Sign out the current session and land on the public Home feed. Same
// behavior for player and owner. Mirrors the app/actions.ts conventions:
// server client only (D13 — no client-side Supabase), redirect() for the
// navigation outcome.
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
