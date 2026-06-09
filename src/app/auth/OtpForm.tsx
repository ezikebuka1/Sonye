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
        className="w-full border border-[#DAE7F1] rounded-xl px-4 py-4 text-[#1A3650] text-center text-2xl tracking-[0.4em] bg-white outline-none focus:border-[#3A7CB8] placeholder:text-[#7A9AB8] placeholder:tracking-normal"
      />

      {error && (
        <p className="text-sm text-[#D4724A]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#D4724A] hover:bg-[#B85D3A] disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
      >
        {isPending ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
