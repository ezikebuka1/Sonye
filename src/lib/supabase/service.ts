import 'server-only';
import { createClient } from '@supabase/supabase-js';

// service_role Supabase client — bypasses RLS. SERVER-ONLY: the `import 'server-only'`
// guard above makes any client-component import fail at build time.
//
// The key is a server secret (SUPABASE_SERVICE_ROLE_KEY — never NEXT_PUBLIC_*, never
// logged). This is the ONE legitimate service-role surface in the app and is imported
// ONLY by the D11 attendance cron route (src/app/api/cron/attendance/route.ts), which
// calls the service_role-only RPC claim_attendance_dispatch (D18).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
