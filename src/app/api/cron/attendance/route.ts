import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSms } from '@/lib/sms/transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// D11 attendance-SMS dispatcher (D18). Vercel Cron hits this hourly; it can also be
// force-run with the CRON_SECRET bearer for the Step-6 smoke test. It scans eligible
// past games, calls the B1 RPC (claim_attendance_dispatch) per slot — which atomically
// mints a magic-link token, stamps the dedup column, and returns the joined roster —
// then texts each player. The RPC's dedup makes a re-run a no-op, so there is NO second
// dedup layer here.
type ClaimRow = {
  membership_id: string;
  user_id: string;
  phone: string;
  first_name: string;
  token: string;
};

export async function GET(request: Request) {
  // (a) Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. An unset secret
  // or any mismatch → 401. Never run unguarded.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  // (b) Candidate scan — the same window the RPC re-checks under lock per slot.
  // App-side now() is only a coarse pre-filter; the RPC is the authority.
  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const twentySixHoursAgo = new Date(now - 26 * 60 * 60 * 1000).toISOString();

  const { data: slots, error: slotsError } = await supabase
    .from('slots')
    .select('id')
    .lt('ends_at', twoHoursAgo)
    .gt('ends_at', twentySixHoursAgo)
    .is('cancelled_at', null);

  if (slotsError) {
    console.error('[cron:attendance] slot scan failed:', slotsError.message);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }

  let slotsProcessed = 0;
  let messagesSent = 0;
  let errors = 0;

  for (const slot of slots ?? []) {
    slotsProcessed++;

    // (c) Atomic mint + claim + roster read (service_role-only RPC).
    const { data: rows, error: rpcError } = await supabase.rpc(
      'claim_attendance_dispatch',
      { p_slot_id: slot.id }
    );

    if (rpcError) {
      errors++;
      console.error(`[cron:attendance] claim failed for slot ${slot.id}:`, rpcError.message);
      continue;
    }

    for (const row of (rows ?? []) as ClaimRow[]) {
      const yesUrl = `${base}/c/y/${row.token}`;
      const noUrl = `${base}/c/n/${row.token}`;
      const body = `Hi ${row.first_name}, did you make it to today's game? Yes: ${yesUrl}  No: ${noUrl}  Reply STOP to opt out.`;

      // One bad number must not abort the batch.
      try {
        await sendSms({ to: row.phone, body });
        messagesSent++;
      } catch {
        errors++;
        console.error(`[cron:attendance] send failed for membership ${row.membership_id}`);
      }
    }
  }

  // (d) Summary only — never tokens or phones in the response body.
  return NextResponse.json({ slotsProcessed, messagesSent, errors });
}
