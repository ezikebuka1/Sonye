// Phone display + sms-link helpers for the lobby directory (Phase 4A).

/**
 * E.164 → "(XXX) XXX-XXXX" for +1 ten-digit numbers.
 * Anything else renders raw E.164 (ruled fallback — users.phone is
 * CHECK-constrained to E.164 but not to +1).
 */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

/**
 * sms: href with prefilled body. The `?&body=` form is the
 * cross-platform spelling (iOS and Android both honor it).
 */
export function smsHref(e164: string, body: string): string {
  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}
