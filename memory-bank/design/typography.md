# Typography

**Source:** D8.2 (current — supersedes D8), D15 (confirms live fonts).

**Runtime truth:** `src/app/globals.css`. Fonts map to `--font-serif` (Baloo 2,
the display font) and `--font-sans` (Nunito Sans, body).

---

## Fonts

- **Baloo 2** — display / hero / card titles. Rounded, friendly. Mapped to
  `--font-serif` in globals.css (the name is a misnomer — it's the *display*
  font, not a serif).
- **Nunito Sans** — all body / UI text. Mapped to `--font-sans`.

> ### ⚠️ RETIRED — do not use
> - **DM Sans** (D8's body font) → replaced by Nunito Sans.
> - **Instrument Serif** (D8's accent font) → retired; the one-emotional-accent
>   role is now Baloo 2.
>
> Older memory/CLAUDE.md may still say DM Sans + Instrument Serif. That is stale.
> The shipped app uses Baloo 2 + Nunito Sans (confirmed in D15 recon).

---

## Scale

| Role | Font | Weight | Size |
|---|---|---|---|
| Hero headline | Baloo 2 | 600–800 | ~30–32px |
| Card title (day/time) | Baloo 2 | 600 | 18px |
| Greeting name | Baloo 2 | 600 | ~26px |
| Section header | Nunito Sans | 700–800 | 11px uppercase, letter-spacing 0.08em |
| Card label (sport) | Nunito Sans | 700 | 11px uppercase |
| Body / UI | Nunito Sans | 600–700 | 13–15px |

---

## Rules

- **One emotional display accent per screen**, in Baloo 2 (this role was
  Instrument Serif italic in D8; the *concept* of a single emotional anchor word
  per screen persists, the font changed).
- **Nothing should feel heavy.** D8's "no weights above 600" guidance loosened
  with Baloo 2 (which carries 700/800 for hero), but the *spirit* holds: body/UI
  stays at 600–700, display can go heavier for the hero only.
- **Sentence case**, generally. Many UI strings are intentionally lowercase
  (see `feedback-toasts.md` for the voice rules) — e.g. "phone verified. let's
  find your game."
- **OG images** burn these fonts in as TTF ArrayBuffers (a `@vercel/og`
  requirement) — so the font files must stay available to the OG route.
