// OWNER-ONLY — Phase 1 create-slot form.
// Real security boundary: slots_insert_owner RLS WITH CHECK (is_owner()).
// UI gate (is_owner() check) is defense-in-depth, not the trust boundary.
//
// R2 (timezone): owner enters Dallas wall-clock time.
// We pass 'YYYY-MM-DD HH:MM:SS America/Chicago' to PostgreSQL, which handles
// DST via the named timezone — never store browser-local or naive-UTC.
//
// R1 (immutability): create only — no reschedule/edit of starts_at here.
// Out of scope: cancel-slot, owner dashboard, player-facing surfaces.

import { createClient } from '@/lib/supabase/server';
import { formatCentral } from '@/lib/format-central';
import { redirect } from 'next/navigation';

// ─── Server Actions ──────────────────────────────────────────────────────────

async function createSlot(formData: FormData) {
  'use server';
  const supabase = await createClient();

  // Defense-in-depth owner check before attempting the insert.
  // Real gate is the RLS WITH CHECK on slots_insert_owner.
  const { data: ownerFlag } = await supabase.rpc('is_owner');
  if (!ownerFlag) redirect('/create-slot?err=not_owner');

  // R1: created_by must be public.users.id, NOT auth.uid().
  const { data: createdBy } = await supabase.rpc('current_user_id');

  const venueId    = formData.get('venue_id')        as string;
  const date       = formData.get('date')             as string;
  const startTime  = formData.get('start_time')       as string;
  const endTime    = formData.get('end_time')         as string;
  const capacity   = Number(formData.get('capacity'));
  const genderCat  = formData.get('gender_category')  as string;
  const skillLevel = formData.get('skill_level')      as string;

  // R2: named-timezone string — PostgreSQL resolves DST correctly at query time.
  const startsAt = `${date} ${startTime}:00 America/Chicago`;
  const endsAt   = `${date} ${endTime}:00 America/Chicago`;

  // sport_id is fixed for v1; not a user-selectable field
  const sportId = 'pickleball';

  const { data, error } = await supabase
    .from('slots')
    .insert({
      venue_id:        venueId,
      sport_id:        sportId,
      created_by:      createdBy,
      starts_at:       startsAt,
      ends_at:         endsAt,
      capacity,
      gender_category: genderCat,
      skill_level:     skillLevel,
    })
    .select('id')
    .single();

  if (error) redirect(`/create-slot?err=${encodeURIComponent(error.message)}`);
  redirect(`/create-slot?created=${data.id}`);
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Venue = { id: string; name: string };

export default async function CreateSlotPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; err?: string }>;
}) {
  const supabase = await createClient();
  const params   = await searchParams;

  // Auth gate — send unauthenticated visitors to the login wall.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Owner gate (UI layer — RLS is the real boundary).
  const { data: isOwner } = await supabase.rpc('is_owner');
  if (!isOwner) {
    return (
      <main className="p-8 font-mono">
        <p className="text-[#D64B4B]">Access denied — owner only.</p>
      </main>
    );
  }

  // Rule 6: confirm authenticated SELECT on venues.
  // Policy venues_select_authenticated: FOR SELECT TO authenticated USING (true).
  const { data: venues, error: venuesErr } = await supabase
    .from('venues')
    .select('id, name')
    .order('name') as { data: Venue[] | null; error: unknown };

  if (venuesErr || !venues?.length) {
    return (
      <main className="p-8 font-mono">
        <p className="text-[#D64B4B] font-bold">
          FLAG (Rule 6): venues SELECT failed —{' '}
          {venuesErr ? String(venuesErr) : 'empty result'}.
          Check RLS policy venues_select_authenticated.
        </p>
      </main>
    );
  }

  // Post-create confirmation view — human summary composed from the just-created
  // row (starts_at + venue), formatted via the shared format-central conventions
  // so it reads identically to the feed/dashboard cards. No new query.
  if (params.created) {
    const { data: slot } = await supabase
      .from('slots')
      .select('id, starts_at, ends_at, capacity, gender_category, skill_level, member_count, venues(name)')
      .eq('id', params.created)
      .single();

    // venues(name) is a to-one join — normalize the object/array shape Supabase
    // may hand back so we can read the name safely.
    const row = slot as {
      starts_at: string;
      venues: { name: string } | { name: string }[] | null;
    } | null;
    const venue = Array.isArray(row?.venues) ? row?.venues[0] : row?.venues;
    const venueName = venue?.name ?? 'your venue';
    const when = row?.starts_at ? formatCentral(row.starts_at) : null;

    return (
      <main className="p-8 max-w-lg">
        <div className="rounded-2xl border border-[#CFE0F4] bg-white p-6">
          <h1 className="text-xl font-bold text-[#14304D]">Slot created</h1>
          <p className="mt-2 text-[15px] leading-snug text-[#14304D]">
            {when ? `${when.dayLabel} · ${when.timeLabel} at ${venueName}` : `Your game at ${venueName}`}
            <span className="mt-0.5 block text-[#5E80A3]">— it&apos;s live on the feed.</span>
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href="/dashboard"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#CFE0F4] px-6 text-[15px] font-semibold text-[#14304D] transition-colors hover:bg-[#E6F0FF]"
            >
              Done
            </a>
            <a
              href="/create-slot"
              className="text-center text-sm text-[#5E80A3] underline underline-offset-2 transition-colors hover:text-[#14304D]"
            >
              Create another
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-lg">
      <a
        href="/dashboard"
        className="mb-4 inline-block text-sm text-[#5E80A3] transition-colors hover:text-[#14304D]"
      >
        ← Dashboard
      </a>
      <h1 className="text-2xl font-bold text-[#14304D] mb-6">Create Slot</h1>

      {params.err && (
        <p className="mb-4 text-[#D64B4B] text-sm">
          Error: {decodeURIComponent(params.err)}
        </p>
      )}

      <form action={createSlot} className="flex flex-col gap-5">

        {/* Venue */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">Venue</span>
          <select
            name="venue_id"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D] bg-white"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>

        {/* Date */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">Date (Dallas)</span>
          <input
            name="date"
            type="date"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D]"
          />
        </label>

        {/* Start time */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">Start time (Dallas local)</span>
          <input
            name="start_time"
            type="time"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D]"
          />
        </label>

        {/* End time */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">End time (Dallas local)</span>
          <input
            name="end_time"
            type="time"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D]"
          />
        </label>

        {/* Capacity */}
        <fieldset className="border border-[#CFE0F4] rounded-xl p-3">
          <legend className="text-sm font-semibold text-[#14304D] px-1">Capacity</legend>
          <div className="flex gap-6 mt-1">
            <label className="flex items-center gap-2 text-[#14304D]">
              <input type="radio" name="capacity" value="6" defaultChecked /> 6
            </label>
            <label className="flex items-center gap-2 text-[#14304D]">
              <input type="radio" name="capacity" value="4" /> 4
            </label>
          </div>
        </fieldset>

        {/* Gender category */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">Gender category</span>
          <select
            name="gender_category"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D] bg-white"
          >
            <option value="open">Open</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
        </label>

        {/* Skill level */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#14304D]">Skill level</span>
          <select
            name="skill_level"
            required
            className="border border-[#CFE0F4] rounded-xl px-3 py-2 text-[#14304D] bg-white"
          >
            <option value="beginner">Beginner</option>
            <option value="advanced_beginner">Advanced Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <button
          type="submit"
          className="mt-2 bg-[#EE5E00] hover:brightness-95 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
        >
          Create Slot
        </button>
      </form>
    </main>
  );
}
