import 'server-only';

export type SmsMessage = { to: string; body: string };

// Env-aware SMS transport seam. This is the ONLY place that knows how a message
// physically leaves the system, so the whole roster→token→dedup→send path can be
// exercised locally with zero Twilio.
//
//   dev  (NODE_ENV !== 'production'): LOG a labeled block (recipient + body, which
//        carries the /c/y and /c/n magic links). Does NOT call Twilio.
//   prod (NODE_ENV === 'production'): POST to the Twilio Messaging API.
//
// Twilio credentials are server secrets (never NEXT_PUBLIC_*, never logged).
export async function sendSms({ to, body }: SmsMessage): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    // DEV transport: log instead of sending. `body` contains both magic-link URLs.
    console.log(
      [
        '──────── [sms:dev] outbound (NOT sent — dev transport) ────────',
        `to:   ${to}`,
        `body: ${body}`,
        '───────────────────────────────────────────────────────────────',
      ].join('\n')
    );
    return;
  }

  // PROD transport: minimal Twilio REST call (Basic auth = accountSid:authToken).
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!;

  const params = new URLSearchParams({
    To: to,
    MessagingServiceSid: messagingServiceSid,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    // Surface a non-2xx so the caller can count + skip it. Never log the auth header.
    const detail = await res.text().catch(() => '');
    throw new Error(`twilio send failed: ${res.status} ${detail.slice(0, 200)}`);
  }
}
