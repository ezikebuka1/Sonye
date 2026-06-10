import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';

type SlotPreviewRow = { venue_name: string; starts_at: string };

function fmtSlot(row: SlotPreviewRow): string {
  const dt   = new Date(row.starts_at);
  const day  = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).format(dt);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' }).format(dt);
  return `${row.venue_name} · ${day} ${time}`;
}

// Flow 2′ — returning user with slot context: skip onboarding, join directly.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params  = await searchParams;
  const slotId  = params.slotId ?? '';
  if (!slotId) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?slotId=${slotId}`);

  const { data: joinRows, error: joinErr } = await supabase.rpc('join_slot', { p_slot_id: slotId });

  if (joinErr) {
    const msg = joinErr.message ?? '';
    if (msg.includes('is cancelled')) redirect('/?toast=cancelled');
    if (msg.includes('D9 violation')) redirect('/?toast=d9');
    redirect('/');
  }

  const rows   = joinRows as Array<{ membership_id: string; resulting_status: string }> | null;
  const status = rows?.[0]?.resulting_status ?? 'joined';

  if (status === 'waitlisted') redirect('/?toast=waitlisted');

  // Fetch slot description for the toast
  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: previewRows } = await anon.rpc('slot_share_preview', { target_slot: slotId });
  const preview = (previewRows as SlotPreviewRow[] | null)?.[0];
  const slotDesc = preview ? fmtSlot(preview) : 'your game';

  redirect(`/?toast=joined&slot=${encodeURIComponent(slotDesc)}`);
}
