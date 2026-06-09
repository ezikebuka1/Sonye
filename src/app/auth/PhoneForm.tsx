'use client';

import { useActionState } from 'react';
import { sendOtpAction } from './actions';

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
      <div className="flex items-center border border-[#DAE7F1] rounded-xl overflow-hidden bg-white">
        <span className="px-3 py-3 text-[#7A9AB8] text-sm font-medium border-r border-[#DAE7F1] select-none">
          +1
        </span>
        <input
          name="phone"
          type="tel"
          required
          placeholder="(555) 000-0000"
          autoComplete="tel-national"
          className="flex-1 px-3 py-3 text-[#1A3650] text-sm outline-none bg-transparent placeholder:text-[#7A9AB8]"
        />
      </div>

      {error && (
        <p className="text-sm text-[#D4724A]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#D4724A] hover:bg-[#B85D3A] disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
      >
        {isPending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  );
}
