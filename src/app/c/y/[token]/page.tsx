import { createServiceClient } from '@/lib/supabase/service';
import AttendanceResult, { type AttestStatus } from '@/components/AttendanceResult';

// Attendance confirmation — YES path. The token is the sole capability;
// attest_attendance self-gates on token validity + expiry. Service-role
// satisfies the authenticated-only grant (the tapper has no session).
export const dynamic = 'force-dynamic';

export default async function ConfirmAttendedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('attest_attendance', {
    p_token: token,
    p_attended: true,
  });

  // Malformed token (non-uuid) errors at the rpc → treat as invalid.
  const status: AttestStatus =
    !error && data === 'success' ? 'success' : 'invalid_or_expired';

  return <AttendanceResult status={status} attended={true} />;
}
