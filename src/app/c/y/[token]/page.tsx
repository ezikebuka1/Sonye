import { createClient } from '@/lib/supabase/server';
import AttendanceResult, { type AttestStatus } from '@/components/AttendanceResult';

// Attendance confirmation — YES path. The token is the sole capability;
// attest_attendance self-gates on token validity + expiry. The tapped SMS
// link opens a session-less tab, so this standard @supabase/ssr client runs
// as `anon` — which holds EXECUTE on attest_attendance per D11 Amendment B.
export const dynamic = 'force-dynamic';

export default async function ConfirmAttendedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('attest_attendance', {
    p_token: token,
    p_attended: true,
  });

  // Malformed token (non-uuid) errors at the rpc → treat as invalid.
  const status: AttestStatus =
    !error && data === 'success' ? 'success' : 'invalid_or_expired';

  return <AttendanceResult status={status} attended={true} />;
}
