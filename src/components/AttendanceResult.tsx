// D11 attendance-confirmation result page — shared by /c/y/[token] and
// /c/n/[token]. SMS-link landing: the user arrived from their texts, so
// NO nav chrome (nowhere to navigate). D8.2 surface, centered, one Baloo
// headline + Nunito body. Copy is single-sourced here.

import PeerReportLink from '@/components/PeerReportLink';

export type AttestStatus = 'success' | 'invalid_or_expired';

export default function AttendanceResult({
  status,
  attended,
}: {
  status: AttestStatus;
  attended: boolean;
}) {
  const isSuccess = status === 'success';

  // Baloo headline + Nunito body. Success body differs by path (attended);
  // the locked "got it — {body}" reads as headline "got it" + subline.
  const headline = isSuccess ? 'got it' : "this link's expired";
  const body = isSuccess
    ? attended
      ? 'glad you made it out'
      : 'thanks for letting us know'
    : null;

  return (
    <main
      className="min-h-screen bg-[#E6F0FF] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      <div className="w-full max-w-[390px] flex flex-col items-center text-center">
        <h1
          className="text-[#14304D] text-[34px] font-bold leading-tight"
          style={{ fontFamily: 'var(--font-baloo2)' }}
        >
          {headline}
        </h1>

        {body && (
          <p className="mt-2 text-[#5E80A3] text-[15px]">{body}</p>
        )}

        {/* Invalid/expired carries the same peer-report link as the lobby */}
        {!isSuccess && (
          <PeerReportLink className="mt-6" />
        )}
      </div>
    </main>
  );
}
