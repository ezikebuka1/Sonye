// Dallas civil date + time from an ISO instant. IANA zone "America/Chicago"
// → DST-correct (CDT/CST per date), never a fixed ±offset (D13/R2). Shared by
// the Home feed (HomeClient) and the owner dashboard (DashboardClient) so the
// card labels read identically across both surfaces — single source of truth.
//
// The date label carries weekday + month + day ("Sat, Jul 18") so cards are
// unambiguous across weeks — a bare weekday reads identically for every
// Saturday slot.
const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Chicago",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Chicago",
});

export function formatCentral(startsAtIso: string): { dayLabel: string; timeLabel: string } {
  const d = new Date(startsAtIso);
  return { dayLabel: DAY_FMT.format(d), timeLabel: TIME_FMT.format(d) };
}
