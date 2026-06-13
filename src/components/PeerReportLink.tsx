// D11 peer-report link — muted steel, single source for the copy.
// Renders on the lobby (all viewer states, with venue + day in the
// prefill body) and on the invalid/expired attendance page (no venue/day
// in scope → generic body). Reads NEXT_PUBLIC_SUPPORT_PHONE directly; no
// DB read. If the env var is unset, render NOTHING — never sms:undefined.

import { smsHref } from '@/lib/phone';

export default function PeerReportLink({
  venue,
  day,
  className = '',
}: {
  venue?: string;
  day?: string;
  className?: string;
}) {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  if (!phone) return null; // G5 fallback — omit rather than emit sms:undefined

  const body =
    venue && day
      ? `Reporting a no-show for ${venue} on ${day}:`
      : 'Reporting a no-show:';

  return (
    <a
      href={smsHref(phone, body)}
      className={`text-[#5E80A3] text-[12px] underline underline-offset-2 ${className}`}
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      {"someone didn't show? let us know"}
    </a>
  );
}
