'use client';

import { useActionState } from 'react';
import { verifyOtpAction } from './actions';

type Props = {
  phone:      string;
  slotId:     string;
  claimToken: string;
};

export function OtpForm({ phone, slotId, claimToken }: Props) {
  const [error, formAction, isPending] = useActionState(verifyOtpAction, null);

  return (
    <form action={formAction} className="w-full flex flex-col gap-4">
      <input type="hidden" name="phone"        value={phone} />
      <input type="hidden" name="slotId"       value={slotId} />
      <input type="hidden" name="claim_token"  value={claimToken} />

      <input
        name="code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        placeholder="000000"
        autoComplete="one-time-code"
        className="w-full border border-[#CFE0F4] rounded-xl px-4 py-4 text-[#14304D] text-center text-2xl tracking-[0.4em] bg-white outline-none focus:border-[#8DBCF1] placeholder:text-[#5E80A3] placeholder:tracking-normal"
      />

      {error && (
        <p className="text-sm text-[#D64B4B]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#EE5E00] hover:brightness-95 disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
      >
        {isPending ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
