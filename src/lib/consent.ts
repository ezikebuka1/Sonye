/**
 * Single source of truth for the SMS consent line.
 *
 * This string is CHARACTER-EXACT and must stay byte-identical to the value
 * submitted in the Twilio 10DLC campaign "opt-in message" field and shown in
 * the consent screenshot. Do NOT reword, re-punctuate, or re-wrap it — the
 * carrier reviewer compares the rendered screen against the campaign text.
 *
 * It is rendered on the phone-entry screen (src/app/auth/PhoneForm.tsx) and is
 * asserted character-for-character by the Playwright consent test.
 */
export const SMS_CONSENT_LINE =
  'By continuing, you agree to receive recurring automated text messages from Sonye — login codes and attendance confirmations. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';
