'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { sendOtpAction } from './actions';
import { SMS_CONSENT_LINE } from '@/lib/consent';

type Props = {
  slotId:     string;
  claimToken: string;
};

export function PhoneForm({ slotId, claimToken }: Props) {
  const [error, formAction, isPending] = useActionState(sendOtpAction, null);

  return (
    <form action={formAction} className="w-full flex flex-col gap-4">
      <input type="hidden" name="slotId"      value={slotId} />
      <input type="hidden" name="claim_token" value={claimToken} />

      {/* Phone field — +1 prefix fixed for v1 */}
      <div className="flex items-center border border-[#CFE0F4] rounded-xl overflow-hidden bg-white">
        <span className="px-3 py-3 text-[#5E80A3] text-sm font-medium border-r border-[#CFE0F4] select-none">
          +1
        </span>
        <input
          name="phone"
          type="tel"
          required
          placeholder="(555) 000-0000"
          autoComplete="tel-national"
          className="flex-1 px-3 py-3 text-[#14304D] text-sm outline-none bg-transparent placeholder:text-[#5E80A3]"
        />
      </div>

      {error && (
        <p className="text-sm text-[#D64B4B]">{error}</p>
      )}

      {/* Trust line — plain-English reassurance directly above the consent
          disclosure (answers phone-number anxiety). Darker small-text token. */}
      <p className="text-[13px] text-[#4A6E92]">
        No password. We&apos;ll text you a 6-digit code.
      </p>

      {/* A2P / 10DLC SMS consent — must render directly ABOVE the submit
          action and stay visible with it in one frame (Twilio screenshot).
          Copy is the single source of truth in src/lib/consent.ts. */}
      <div className="flex flex-col gap-1.5">
        <p data-testid="sms-consent" className="text-[13px] leading-relaxed text-steel">
          {SMS_CONSENT_LINE}
        </p>
        <p className="text-[13px] text-steel">
          <Link href="/terms" className="text-ink underline">Terms</Link>
          {' · '}
          <Link href="/privacy" className="text-ink underline">Privacy Policy</Link>
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-coral hover:brightness-95 disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
      >
        {isPending ? 'Sending…' : 'Send code'}
      </button>

      {/* Reassurance — directly below the Send-code action. */}
      <p className="text-[13px] text-[#4A6E92] text-center">
        Your number stays private and is never shared.
      </p>
    </form>
  );
}
