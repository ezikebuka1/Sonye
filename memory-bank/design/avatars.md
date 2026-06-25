# Avatars

**Source:** D8.1 (gender→color mapping), D7.3 (the gender field + visibility
rules), D8 (original blue palette, "coral forbidden for avatars").

Avatars are **abstract color circles, NOT photos.** Profile pictures are
iceboxed (Realness Strategy — credibility comes from byproducts, not photos;
reconsidered only at ~500 active users). The avatar's only job is a per-person
color, and that color **encodes gender**.

---

## Gender → color

| Gender | Color family | Specific |
|---|---|---|
| Woman | **Pink** | Exact hex finalized in M5 lobby polish — mirror the blue palette's saturation/lightness so women's and men's avatars feel visually equivalent (not muted-blue-vs-loud-pink). Placeholder pink OK until then. |
| Man | **Blue** | The existing D8 blues: `#1A3650` / `#3A7CB8` / `#5A9FD4` |
| Non-binary / Prefer not to say / NULL | **Green** | Reuse the skill-green family (`#D8EFDF` / `#246B42`) |

- Gender is an **optional** onboarding field (Woman / Man / Non-binary / Prefer
  not to say). Skipping = "prefer not to say" = green. **NULL is a first-class
  state, never an error.**
- Color is **derived at render time** from `users.gender`, not stored.

> ### ⚠️ Coral is FORBIDDEN for avatars.
> Coral (`#EE5E00`) is **action-only.** This D8 rule is unchanged across all
> amendments. No avatar is ever coral.

---

## Visibility rules (D7.3 — strict)

Avatar colors are **member-context only.** Specifically:

- ✅ Visible in the **lobby**, AFTER a user joins a game.
- ❌ NOT shown on the **public / anonymous share preview**.
- ❌ NOT shown on **home-screen slot cards before joining** (the pre-join feed
  uses gender-neutral slate `#AEBED0` fill dots instead).

**Why the pre-join feed is gender-neutral:** the strong safety mechanism before
joining is the **slot gender tag** (a commitment — see `slot-card.md`), NOT the
avatar color (a changeable snapshot). Showing gender composition before someone
commits would leak it across a softer threshold than intended.

---

## Where avatars appear as a stack

- **Slot card (at ≥50% fill only):** the avatar stack + count — but with
  gender-neutral slate dots, NOT gendered colors (pre-join).
- **Lobby:** per-joined-member avatar in the real gendered color, alongside first
  name + skill.
- **Home greeting social-proof strip (D8):** ~4 small mixed-color dots + "[count]
  players active in [city] this week."
