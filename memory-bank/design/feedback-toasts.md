# Feedback, Toasts & Voice

**Source:** D5 (toast pattern + tone), D9 (collision copy + the punctuation
nuance), plus voice principles from projectbrief.md.

---

## The toast pattern (D5)

V1 uses a **minimal toast** for transient feedback. Skeleton loaders, spinners,
and full-page loading states are deferred until concretely needed.

- **One Toast component, two variants:** error, success.
- **Position:** top of viewport, 16px below the safe-area inset. (Bottom is
  reserved for the tab bar.)
- **Entry:** slide-down, 200ms. **Auto-dismiss:** 5s.
- **Single visible toast** — a new toast replaces the current one (no queue).
- **Dismiss early:** tap backdrop or the X.

> The cancel sheet and other overlays are modeled on Toast's overlay mechanics
> (there's no separate Modal/Dialog/BottomSheet primitive — see
> `owner-dashboard.md`).

---

## ✍️ Voice & tone (the copy register — D5)

**Tone: contractions, lowercase mid-sentence, terse, warm, second person.** It
should read like a friend texting you, not an app notifying you.

Examples of the register in the wild:
- "On the waitlist — we'll text you"
- "you're all set — find your game"
- "phone verified. let's find your game."
- "pick whatever feels right — you can change it later"

### The punctuation rule (D5 + D9 nuance — important)
- **Single-clause toasts/labels: NO trailing period.**
  - ✅ "Game already started"  ·  ✅ "That game was cancelled"
- **Multi-clause toasts (two clauses joined by "or"/"and"): KEEP grammatical
  punctuation** (the period is correct).
  - ✅ "You're already in a game today. Leave that one or complete it to join
    another."

This nuance was established in D9: the "no period at end" rule applies to
*single-clause* toasts; multi-clause toasts keep their punctuation. (Flagged in
D9 to fold into the D5 doc on the next amendment.)

---

## The copy register (known strings)

| Case | Copy | Variant |
|---|---|---|
| Optimistic op failed | "Couldn't save that" | error |
| Waitlist join confirmed | "On the waitlist — we'll text you" | success |
| Joined a game | "you're in — {venue}" | success |
| Welcomed (new signup, generic) | "you're all set — find your game" | success |
| Game was cancelled | "That game was cancelled" | error |
| Same-day collision (D9) | "You're already in a game today. Leave that one or complete it to join another." | error |
| Game already started (D19) | "Game already started" | error |

---

## SMS copy (the actual texts Sonye sends)

Two transactional message types only (no marketing):
1. **Login OTP** — "Your code is …" (via Supabase Auth / GoTrue + Twilio).
2. **Attendance confirmation** (post-game, via the D11 dispatcher):
   *"Hi {first_name}, did you make it to today's game? Yes: {url} No: {url}
   Reply STOP to opt out."*

The on-screen SMS **consent disclosure** (compliance-critical, fixed wording):
*"By continuing, you agree to receive recurring automated text messages from
Sonye — login codes and attendance confirmations. Msg frequency varies. Msg &
data rates may apply. Reply STOP to opt out, HELP for help."*

> This consent text is **load-bearing for Twilio A2P compliance** — do not reword
> it without checking the carrier requirements. It must also appear (in full) in
> the privacy policy's SMS section.
