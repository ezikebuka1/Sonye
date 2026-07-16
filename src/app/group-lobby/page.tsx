import { redirect } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  fetchSlotPreview,
  formatDallas,
  formatTimeRange,
  type SkillLevel,
} from '@/lib/slot-preview';
import { getAvatar, type Gender } from '@/lib/avatar';
import { courtMapsUrl } from '@/lib/maps-url';
import { formatPhone, smsHref } from '@/lib/phone';
import PeerReportLink from '@/components/PeerReportLink';
import SiteFooter from '@/components/SiteFooter';
import LeaveGameControl from '@/components/LeaveGameControl';
import LobbyWall, { type WallMessageVM } from '@/components/LobbyWall';
import InviteControl from '@/components/InviteControl';
import { spotsClause } from '@/lib/spots-clause';
import { slotQrSvg } from '@/lib/qr';
import { formatCentral } from '@/lib/format-central';

// Roster must be fresh per request — never cached, never streamed
// (no Suspense: the page renders synchronously so the full payload is
// provable in one response).
export const dynamic = 'force-dynamic';

// Canonical D8.2 ramp — LOCAL map per ruling G8. The OG card
// (opengraph-image.tsx) no longer consumes SKILL_DISPLAY either — it now carries
// its own local D8.2 skill map. slot-preview.ts's SKILL_DISPLAY stays old-D8
// pending the separate /slot-pill migration. NOT copied from the OnboardingForm
// chip map, which carries the banked tier-shift bug.
const SKILL_RAMP: Record<SkillLevel, { bg: string; ink: string; label: string }> = {
  beginner:          { bg: '#DCEBFF', ink: '#15457B', label: 'Beginner' },
  advanced_beginner: { bg: '#FFF1CC', ink: '#8A5A00', label: 'Adv. Beginner' },
  intermediate:      { bg: '#D8EFDF', ink: '#246B42', label: 'Intermediate' },
  advanced:          { bg: '#D7E0EC', ink: '#14304D', label: 'Advanced' },
};

type RosterRow = {
  membership_id: string;
  first_name: string;
  gender: Gender | null;
  phone: string | null;
  status: 'joined' | 'waitlisted';
};

type SelfMembership = { id: string; status: 'joined' | 'waitlisted' };

// "1st" / "2nd" / "3rd" / "4th" … (11th–13th handled)
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function MessageGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="flex-shrink-0 text-[#5E80A3]"
    >
      <path d="M12 3C6.92 3 2.8 6.36 2.8 10.5c0 2.37 1.36 4.48 3.49 5.85-.1.86-.42 2.03-1.29 3.15 0 0 1.95-.27 3.6-1.5.44.09 1.62.3 3.4.3 5.08 0 9.2-3.36 9.2-7.5S17.08 3 12 3z" />
    </svg>
  );
}

function PadlockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function Avatar({ row }: { row: RosterRow }) {
  const av = getAvatar(row.gender, row.membership_id);
  return (
    <span
      className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-semibold flex-shrink-0"
      style={{ backgroundColor: av.bg, color: av.fg }}
    >
      {row.first_name.charAt(0).toUpperCase()}
    </span>
  );
}

function SelfChip({ label }: { label: string }) {
  return (
    <span className="flex-shrink-0 text-[11px] font-semibold text-[#5E80A3] bg-white border border-[#CFE0F4] rounded-full px-2 py-0.5">
      {label}
    </span>
  );
}

export default async function GroupLobbyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const slotId = params.slotId ?? '';
  if (!slotId) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?slotId=${encodeURIComponent(slotId)}`);

  // Header data (anon-safe projection); null ⇒ invalid slotId
  const preview = await fetchSlotPreview(slotId);
  if (!preview) redirect('/');

  // D10-A roster — server returns phones ONLY to the owner caller and
  // NULLs them for every player; rows arrive in the ruled order (joined
  // first, FIFO by created_at)
  const { data: rosterData, error: rosterErr } = await supabase.rpc('slot_roster', {
    target_slot: slotId,
  });
  const roster = (rosterData as RosterRow[] | null) ?? [];
  if (rosterErr || roster.length === 0) {
    // Non-member (player) per the RPC gate — never reaches the lobby
    redirect(`/slot/${encodeURIComponent(slotId)}`);
  }

  // G2: pin self explicitly — never "the row I can see"
  const { data: uidData } = await supabase.rpc('current_user_id');
  const uid = (uidData as string | null) ?? null;
  if (!uid) redirect(`/slot/${encodeURIComponent(slotId)}`);

  const { data: selfData } = await supabase
    .from('session_memberships')
    .select('id,status')
    .eq('slot_id', slotId)
    .eq('user_id', uid)
    .in('status', ['joined', 'waitlisted'])
    .maybeSingle();
  const self = (selfData as SelfMembership | null) ?? null;

  // M5 (D16) — the real, trigger-managed counts for the LeaveSheet props. The
  // header (slot_share_preview) NULLs fill_count below the 50% threshold and
  // carries no waitlist_count, so the leave consequence copy reads the
  // canonical `slots` columns directly (query change, not schema). RLS
  // slots_select_authenticated USING (true) permits this authenticated read.
  const { data: slotCounts } = await supabase
    .from('slots')
    .select('member_count, waitlist_count')
    .eq('id', slotId)
    .maybeSingle();
  const counts = (slotCounts as { member_count: number; waitlist_count: number } | null) ?? null;

  const joined   = roster.filter((r) => r.status === 'joined');
  const waitlist = roster.filter((r) => r.status === 'waitlisted');

  // G3: three member viewer states; roster non-empty with no self row
  // is only reachable by the owner → owner-view (joined layout, no
  // pill / self row / banner)
  const viewer: 'joined' | 'waitlisted' | 'owner' = self ? self.status : 'owner';
  const selfId = self?.id ?? null;

  const waitlistPos =
    viewer === 'waitlisted'
      ? waitlist.findIndex((r) => r.membership_id === selfId) + 1
      : 0;

  // sms prefill needs the viewer's first name: members read their own
  // roster row; the owner (no roster row) reads their own users row.
  let selfFirstName = roster.find((r) => r.membership_id === selfId)?.first_name ?? '';
  if (viewer === 'owner') {
    const { data: ownRow } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', uid)
      .maybeSingle();
    selfFirstName = (ownRow as { first_name: string } | null)?.first_name ?? '';
  }
  const smsBody = `hey — it's ${selfFirstName} from the ${preview.venue_name} pickleball game`;

  const { dayLabel, startLabel, endLabel } = formatDallas(preview.starts_at, preview.ends_at);
  const timeRange = formatTimeRange(startLabel, endLabel);
  const skill = SKILL_RAMP[preview.skill_level];
  const genderTag =
    preview.gender_category === 'women' ? 'Women' :
    preview.gender_category === 'men'   ? 'Men'   : null;

  const cap = preview.capacity;
  const fillCount = joined.length;
  const isLocked = fillCount >= cap;

  // M5 (D16) — the leave entry point. Gated to the viewer's OWN joined
  // membership AND a strictly-future start (starts_at > now() — NO owner 2h
  // grace: after start the slot belongs to the D11 attendance flow, not leave).
  // Capacity is NOT a gate — a joined player may leave a full/locked game (D7
  // amendment); leave-eligibility is gated by TIME only.
  const canLeave =
    viewer === 'joined' &&
    new Date(preview.starts_at).getTime() > new Date().getTime();

  // D10-A: player numbers are owner-only now (slot_roster redacts them
  // for every non-owner caller), so only the owner gets the "tap a
  // number" directory help. Players and waitlisted get neutral copy —
  // no promise of numbers that will never appear for them.
  const dirHelp =
    viewer === 'owner'
      ? 'tap a number to text — parking, balls, last-minute changes'
      : "who's playing this game";

  // ── D10-B lobby wall ────────────────────────────────────────────────────────
  // Audience = joined members + host (owner); waitlisters are excluded (they do
  // NOT get the wall). ACTIVE until ends_at + 2h; CLOSED after — and when closed
  // we fetch NO message content, only a recap COUNT.
  const WALL_GRACE_MS = 2 * 60 * 60 * 1000;
  const showWall = viewer === 'joined' || viewer === 'owner';
  const wallClosed =
    new Date(preview.ends_at).getTime() + WALL_GRACE_MS <= new Date().getTime();

  // Host-only Remove keys off is_owner(), not viewer state: an owner who JOINED
  // their own game shows as viewer 'joined' but must still get Remove.
  let isOwner = viewer === 'owner';
  if (viewer === 'joined') {
    const { data: ownerFlag } = await supabase.rpc('is_owner');
    isOwner = Boolean(ownerFlag);
  }

  type WallRow = {
    message_id: string;
    body: string;
    created_at: string;
    author_id: string;
    author_first_name: string | null;
    author_gender: Gender | null;
    is_host: boolean;
    is_self: boolean;
  };

  const wallTimeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });

  let wallMessages: WallMessageVM[] = [];
  let wallMessageCount = 0;
  if (showWall && wallClosed) {
    // Closed: a COUNT only — never the bodies. RLS (is_joined_member OR
    // is_owner) lets this viewer count the slot's messages.
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId);
    wallMessageCount = count ?? 0;
  } else if (showWall) {
    // Active: slot_wall resolves each author server-side (the only path that
    // works for a joined non-owner — see the slot_wall migration). user_id is
    // used as the avatar shade seed and NEVER sent to the client.
    const { data: wallData } = await supabase.rpc('slot_wall', { target_slot: slotId });
    wallMessages = ((wallData as WallRow[] | null) ?? []).map((r) => {
      const av = getAvatar(r.author_gender, r.author_id);
      const fallbackName = r.author_first_name || 'Player';
      return {
        id: r.message_id,
        body: r.body,
        name: r.is_self ? 'You' : fallbackName,
        initial: fallbackName.charAt(0).toUpperCase(),
        avatarBg: av.bg,
        avatarFg: av.fg,
        time: wallTimeFmt.format(new Date(r.created_at)),
        isSelf: r.is_self,
      };
    });
  }

  // ── Invite a friend (v1 final feature) — composed server-side, rendered below
  // the roster / above the wall. Eligibility is explicit even though it is
  // currently ALWAYS true: everyone who reaches the lobby is the owner or an
  // active member (non-members were redirected to /slot above). The gate
  // self-documents and guards any future lobby-access change.
  const canInvite = viewer === 'owner' || self !== null;
  const inviteBase = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const inviteUrl = `${inviteBase}/slot/${slotId}`; // the receiving end — /slot unfurl already exists
  const inviteQrSvg = slotQrSvg(inviteUrl);
  const { dayLabel: inviteDay, timeLabel: inviteTime } = formatCentral(preview.starts_at); // composed-string authority (Ruling 2)
  const inviteMemberCount = counts?.member_count ?? fillCount;
  const inviteSport = preview.sport_name.toLowerCase();
  // OUTBOUND text is MASKED via spotsClause (>=50% AND not full → clause, else null).
  const inviteClause = spotsClause(inviteMemberCount, cap);
  const inviteShareText = inviteClause
    ? `I'm playing ${inviteSport} ${inviteDay} · ${inviteTime} at ${preview.venue_name} — ${inviteClause}. Join us:`
    : `I'm playing ${inviteSport} ${inviteDay} · ${inviteTime} at ${preview.venue_name}. Join us:`;
  // Subtitle is MEMBER-FACING and always true — the raw count (the member already
  // sees the roster), distinct from the masked share text above.
  const inviteSpotsRaw = cap - inviteMemberCount;
  const inviteSubtitle = isLocked
    ? `Game locked at ${cap} · share for next time`
    : `${inviteSpotsRaw} spot${inviteSpotsRaw === 1 ? '' : 's'} left · link or QR, no app needed`;

  return (
    <main
      className="min-h-screen bg-[#E6F0FF]"
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      <div className="w-full max-w-[390px] mx-auto px-5 pt-4 pb-12">

        {/* Topbar: back + status pill */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            aria-label="Back to home"
            className="flex items-center justify-center w-11 h-11 -ml-3 text-[#14304D]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          {viewer === 'joined' && (
            <span className="bg-[#D8EFDF] text-[#246B42] text-[12px] font-semibold px-3 py-1 rounded-full">
              {"you're in"}
            </span>
          )}
          {viewer === 'waitlisted' && (
            <span className="bg-[#FFF1CC] text-[#8A5A00] text-[12px] font-semibold px-3 py-1 rounded-full">
              waitlist
            </span>
          )}
        </div>

        {/* Venue — the ONLY Baloo on screen. Tappable to Google Maps when the
            venue has court coordinates (D24); the h1 landmark + its ink Baloo
            styling stay unchanged, only the content becomes an anchor. */}
        <h1
          className="mt-3 text-[#14304D] text-[30px] font-bold leading-tight"
          style={{ fontFamily: 'var(--font-baloo2)' }}
        >
          {preview.venue_lat !== null && preview.venue_lng !== null ? (
            <a
              href={courtMapsUrl(preview.venue_lat, preview.venue_lng)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${preview.venue_name} in Google Maps (opens in a new tab)`}
              className="inline-flex items-center gap-1.5 text-[#14304D] no-underline"
            >
              {preview.venue_name}
              <ArrowUpRight size={19} color="#4A6B8C" className="flex-shrink-0" aria-hidden="true" />
            </a>
          ) : (
            preview.venue_name
          )}
        </h1>
        <p className="mt-1 text-[#5E80A3] text-[13px]">
          {dayLabel} · {timeRange}
        </p>

        {/* Meta pills: skill ramp + gender category */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="text-[12px] font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: skill.bg, color: skill.ink }}
          >
            {skill.label}
          </span>
          {genderTag && (
            <span className="bg-white text-[#5E80A3] border border-[#CFE0F4] text-[12px] font-medium px-3 py-1 rounded-full">
              {genderTag}
            </span>
          )}
        </div>

        {/* Waitlist banner — waitlisted viewer only */}
        {viewer === 'waitlisted' && (
          <div className="mt-5 bg-[#FFF1CC] border-l-[3px] border-[#FFC63D] rounded-r-xl px-4 py-3">
            <p className="text-[#8A5A00] text-[14px] font-semibold">
              {`you're ${ordinal(waitlistPos)} in line`}
            </p>
            <p className="mt-0.5 text-[#8A5A00] text-[12px] leading-snug">
              {"we'll text you if a spot opens — no need to check back"}
            </p>
          </div>
        )}

        {/* Group header */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[#14304D] text-[16px] font-bold">your group</h2>
          <span className="flex items-center gap-1 text-[#5E80A3] text-[13px] font-semibold [font-variant-numeric:tabular-nums]">
            {`${fillCount}/${cap}`}
            {isLocked && (
              <>
                <span>· locked</span>
                <PadlockIcon />
              </>
            )}
          </span>
        </div>
        <p className="mt-1 text-[#5E80A3] text-[12px]">{dirHelp}</p>

        {/* Directory — single card, hairline dividers */}
        <div className="mt-3 bg-white border border-[#CFE0F4] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#CFE0F4]">
            {joined.map((row) => {
              const isSelf = row.membership_id === selfId;
              // D10-A UI gate: digits render only when the server sent a
              // phone (truthy) AND the row is a joined member AND it is not
              // the viewer's own row. Post-D10-A slot_roster returns the
              // phone ONLY to the owner caller (NULL for every player), so
              // this declaratively shows numbers to the owner and hides
              // them from players — the security boundary lives in the RPC.
              const showSms = !isSelf && row.status === 'joined' && Boolean(row.phone);
              return (
                <div
                  key={row.membership_id}
                  className={`flex items-center gap-3 px-4 py-2.5 min-h-[56px] ${
                    isSelf ? 'bg-[#E6F0FF]' : ''
                  }`}
                >
                  <Avatar row={row} />
                  <span className="text-[#14304D] text-[14px] font-medium truncate">
                    {row.first_name}
                  </span>
                  {isSelf && <SelfChip label={"that's you"} />}
                  {showSms && (
                    <a
                      href={smsHref(row.phone!, smsBody)}
                      aria-label={`Text ${row.first_name}`}
                      className="ml-auto flex items-center gap-1.5 min-h-[44px] pl-3 -my-1.5"
                    >
                      <span className="text-[#14304D] text-[14px] font-semibold [font-variant-numeric:tabular-nums]">
                        {formatPhone(row.phone!)}
                      </span>
                      <MessageGlyph />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Waitlist subsection */}
          {waitlist.length > 0 && (
            <div className="border-t border-[#CFE0F4]">
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#5E80A3]">
                waitlist
              </p>
              <div className="divide-y divide-[#CFE0F4]">
                {waitlist.map((row, i) => {
                  const isSelf = row.membership_id === selfId;
                  return (
                    <div
                      key={row.membership_id}
                      className={`flex items-center gap-3 px-4 py-2.5 min-h-[56px] ${
                        isSelf ? 'bg-[#E6F0FF]' : ''
                      }`}
                    >
                      {/* ordinal cell — kept on self rows (empty) so avatars align;
                          the self chip carries the ordinal instead */}
                      <span className="w-7 flex-shrink-0 text-[#5E80A3] text-[12px] font-semibold">
                        {isSelf ? '' : ordinal(i + 1)}
                      </span>
                      <Avatar row={row} />
                      <span className="text-[#14304D] text-[14px] font-medium truncate">
                        {row.first_name}
                      </span>
                      {isSelf && <SelfChip label={`${ordinal(i + 1)} · that's you`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Invite a friend — below the roster card, above the wall (Ruling 3:
            header → date → your group → Invite → wall) */}
        {canInvite && (
          <InviteControl
            qrSvg={inviteQrSvg}
            url={inviteUrl}
            shareText={inviteShareText}
            subtitle={inviteSubtitle}
          />
        )}

        {/* D10-B lobby wall — joined members + host, below the roster */}
        {showWall && (
          <LobbyWall
            slotId={slotId}
            closed={wallClosed}
            capacity={cap}
            playerCount={joined.length}
            messages={wallMessages}
            messageCount={wallMessageCount}
            canPost={viewer === 'joined'}
            canRemove={isOwner}
            supportPhone={process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null}
            venueName={preview.venue_name}
            dayLabel={dayLabel}
          />
        )}

        {/* D11 peer-report link — below the directory, muted steel */}
        <div className="mt-4 text-center">
          <PeerReportLink venue={preview.venue_name} day={dayLabel} />
        </div>

        {/* M5 (D16) — player-leave entry point: joined viewer, future start only */}
        {canLeave && (
          <LeaveGameControl
            slot={{
              id: slotId,
              startsAt: preview.starts_at,
              venueName: preview.venue_name,
              skillLevel: preview.skill_level,
              capacity: cap,
              memberCount: counts?.member_count ?? fillCount,
              waitlistCount: counts?.waitlist_count ?? waitlist.length,
            }}
          />
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
