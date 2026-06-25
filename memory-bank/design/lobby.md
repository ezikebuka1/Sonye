# Lobby

**Source:** D10 + Amendment A (peer-phone-visibility removed) + Amendment B (the
lobby wall). D7.3 (avatar visibility), D10 (phone visibility).

The lobby is the per-game coordination surface, shown to a game's joined players
(and the owner) after they join.

---

## What the lobby shows

For each **joined** member (D10-A, D7.3):
- First name
- Avatar (in the real gendered color — see `avatars.md`; lobby is the one place
  avatar colors appear)
- Skill

**Phone numbers: owner-only.** Players do NOT see each other's phone numbers.
`slot_roster` projects phone to the game **owner** only; every non-owner caller
(joined or waitlisted) gets NULL.

> **History (why peer phones were removed — D10 Amendment A):** the original D10
> let joined players see each other's phones (coordination via iMessage). That
> rested on D9's one-joined-slot-per-day cap bounding exposure — but the M5 leave
> flow voids that (leave → rejoin → harvest). Independently, auto-revealing a
> personal number on join is bundled, irreversible consent and a deterrent to
> joining (women especially) — a density cost. So peer-phone visibility was
> removed pre-launch, and coordination moved on-platform to the wall (below).

---

## The lobby wall (D10 Amendment B)

Coordination happens **on-platform**, on a per-game wall:

- **Canned presence taps:** "I'm here," "On my way," "Running ~10 late" (a canned
  tap is just a fixed-body message insert).
- **Free-text messages.**
- Both are written to the `chat_messages` table.

### Audience — joined-only
- **Read:** joined players + the owner.
- **Post:** joined players (and the owner, only where they're a joined player).
- **Waitlisters can neither read nor post.** (Rationale: matches D10's
  committed-players boundary — waitlist is a queue, not a commitment; promotion
  brings them in. Also prevents the wall becoming a backdoor for the peer-PII that
  Amendment A removed.)

### Moderation — owner-delete only
- No raw client delete. Moderation is the `owner_delete_message` RPC (checks
  `is_owner()`, drops the row).
- Messages are otherwise **immutable** (no edit). Kicking a player removes their
  access but leaves their posts; owner-delete pulls a specific bad message.

### Retention — persist, hide post-game
- Rows are **retained, not deleted** — the wall is a **trust-and-safety audit
  trail** (a next-day harassment report needs the evidence).
- The wall is **surfaced only while the game is live**, then hidden (NOT deleted).
- Removed on account deletion.

### Lifecycle window
- Read/post-able from joined-membership through **`ends_at + 2h`** — anchored on
  `ends_at` (not `starts_at`) so it's robust to game length (a starts_at window
  would close the wall mid-game for any session over 2 hours). The 2h pad covers
  parking-lot wrap-up + realize-it-at-home lag, and blocks next-day necro-posting.
- Read data persists past the window (the audit trail); only the surface closes.

---

## UX disclosure (D10)

The privacy posture must be visible — a one-line disclosure at the join action
(on the join confirmation or the Join button), D5 tone register. Final copy +
placement via sketch approval at the lobby-build stage.
