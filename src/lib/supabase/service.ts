// SERVER-ONLY. Never imported by a client component; the service-role
// key must never reach the browser.
//
// Sole purpose (Phase 4B): the anonymous attendance-confirmation routes
// (/c/y/[token], /c/n/[token]) call attest_attendance, which is granted
// to `authenticated` only. The link-tapper has no session — the token is
// the capability. Service-role satisfies the grant; it does NOT relax the
// function's own token + expiry self-gating (that lives in the SQL body).
// Do not import this helper outside the /c route handlers.

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
