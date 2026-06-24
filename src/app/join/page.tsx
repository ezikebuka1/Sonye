import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  const { error: joinErr } = await supabase.rpc('join_slot', { p_slot_id: slotId });

  if (joinErr) {
    const msg = joinErr.message ?? '';
    if (msg.includes('is cancelled')) redirect('/?toast=cancelled');
    if (msg.includes('already started')) redirect('/?toast=started'); // D19
    if (msg.includes('D9 violation')) redirect('/?toast=d9');
    redirect('/');
  }

  // Phase 4A: joined and waitlisted both land in the lobby — it
  // derives viewer state from the roster itself
  redirect(`/group-lobby?slotId=${slotId}`);
}
