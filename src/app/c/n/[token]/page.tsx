import { createClient } from '@/lib/supabase/server';
import AttendanceResult, { type AttestStatus } from '@/components/AttendanceResult';

// Attendance confirmation — NO path. Mirror of /c/y but p_attended=false.
// Runs as `anon` via the standard @supabase/ssr client (session-less SMS-link
// tab; anon holds EXECUTE per D11 Amendment B). attest_attendance is
// idempotent: a second tap on a consumed token (either path) returns
// invalid_or_expired; an already-set membership returns success without a write.
export const dynamic = 'force-dynamic';

export default async function ConfirmDidNotAttendPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('attest_attendance', {
    p_token: token,
    p_attended: false,
  });

  const status: AttestStatus =
    !error && data === 'success' ? 'success' : 'invalid_or_expired';

  return <AttendanceResult status={status} attended={false} />;
}
