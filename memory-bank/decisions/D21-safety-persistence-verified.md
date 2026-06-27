# D21 — Safety-Persistence Gate: Verified Satisfied (Lobby-Message Retention Disclosure)

## Status
**RESOLVED — gate satisfied.** This doc closes the dangling "safety-persistence"
reference in `cutover.md` (which previously appeared exactly once in the repo with no
backing decision record).

## Background
`cutover.md` listed the legal-docs publish as gated on two conditions:
(a) the lobby-wall UI being deployed, and (b) a "safety-persistence amendment." Gate (a)
is satisfied (the lobby wall is built, deployed, and tested — see progress.md / D10-B).
Gate (b) had no paper trail — it was referenced but never recorded — so a read-only recon
was run to determine whether it represented real outstanding work.

## What the system actually does (verified)
The lobby wall (D10 Amendment B) **retains** `chat_messages` rows after a game ends — it
does NOT delete them. Only the *surface* closes: the wall is hidden from the UI after
`ends_at + 2h` (`WALL_GRACE_MS`). Retention is deliberate — the messages are a
trust-and-safety audit trail so a next-day harassment/abuse report can be investigated.
There is no scheduled or triggered deletion of `chat_messages`. (Account deletion is
admin-only per the M3 R4 "no client deletes" contract — there is no self-serve deletion
path in v1.)

## What the published docs disclose (verified)
The published Privacy Policy (`content/privacy.md`, live at `/privacy`) discloses this
behavior accurately, in three places:
- *Information we collect → Lobby messages* — describes them as coordination messages
  visible to joined players + organizer.
- *How we use your information* — "Keep a record of lobby messages so that reports of
  harassment or abuse can be looked into and the community kept safe."
- *How long we keep your information → Lobby messages* — messages stay on the wall while
  live and briefly after, the wall is then hidden, and "We keep the messages after that
  as a record, so that a problem with a game can be looked into if one is reported."
- Account-deletion handling matches the admin-only reality: on deletion, personal info
  including lobby messages is removed "except for records we are required to keep to
  comply with the law, or that we need to establish, exercise, or defend a legal claim."

The Terms (`/terms` §5) align: the wall is shown while live and briefly after, and
"messages there are not private."

## Verdict
**MATCH.** The published Privacy Policy + Terms accurately and explicitly disclose the
retain-for-safety, hidden-after-close behavior that the lobby wall implements. The docs do
NOT imply ephemerality or deletion. There is no disclosure gap and no required content fix.

The safety-persistence gate is therefore **SATISFIED** — it was effectively met when the
docs were written; this amendment simply records that verification so the gate has a
paper trail.

## Consequence
- No code change, no doc change.
- The `cutover.md` gate (b) reference is now backed by this record.
- Legal docs remain correctly published.

## Note for the future
If the lobby-wall retention behavior ever changes (e.g. adding hard-deletion of old
messages, or a self-serve account-deletion path that wipes messages), the Privacy Policy's
retention section MUST be updated to match — the disclosure and the behavior are coupled.
