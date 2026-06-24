import type { Metadata } from 'next';
import Link from 'next/link';
import { SMS_CONSENT_LINE } from '@/lib/consent';

export const metadata: Metadata = {
  title: 'SMS Opt-In · Sonye',
  description: 'How Sonye obtains SMS consent, showing the opt-in screen presented to users.',
};

// Public — no auth gate, NO Supabase/backend dependency. The Twilio/carrier
// reviewer reads this without logging in to verify the SMS opt-in flow. There
// is no middleware, so the route is reachable unauthenticated, and the page
// renders fully even with the backend absent (only a static image + text).
//
// Mirrors the /privacy + /terms container chrome (PolicyDoc) for consistency.
export default function OptInPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-[640px]">
        <header className="mb-8">
          <Link href="/" className="font-serif text-2xl font-bold text-ink">
            Sonye
          </Link>
        </header>

        <article className="font-sans text-ink">
          <h1 className="mb-4 font-serif text-3xl font-bold text-ink">
            Sonye — SMS Opt-In
          </h1>

          <p className="mb-6 text-[15px] leading-relaxed text-ink">
            Opt-in occurs on the phone-entry screen at sonye.app. Below is that
            screen, showing the consent disclosure shown to users before they
            submit their number.
          </p>

          {/* Plain <img> by design — no next/image loader indirection, so the
              screenshot always renders inline (it is DISPLAYED here, never a
              download). Constrained to a phone aspect, centered. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/optin.png"
            alt="Sonye phone-entry screen showing the SMS consent disclosure presented before a user submits their number"
            className="mx-auto mb-6 block h-auto w-full max-w-[420px] rounded-2xl border border-border"
          />

          {/* Verbatim from SMS_CONSENT_LINE (src/lib/consent.ts) — the single
              source of truth also rendered on the live phone-entry screen, so
              this page's text stays byte-identical to the screenshot above. */}
          <p className="mb-6 text-[15px] leading-relaxed text-ink">
            {SMS_CONSENT_LINE}
          </p>

          <p className="text-[15px] leading-relaxed text-ink">
            <Link href="/privacy" className="text-cta underline">Privacy Policy</Link>
            {' · '}
            <Link href="/terms" className="text-cta underline">Terms of Service</Link>
          </p>
        </article>
      </div>
    </main>
  );
}
