A top level file defining rules  (e.g., "use TDD", "only use approved libraries", etc.)
# Sonye — Claude Context File

## HARD RULES — non-negotiable; these override anything below and any inference from repo docs
1. NEVER run `git push`. Pushing is Ebuka's alone. Every dispatch ends at HARD STOP
   after commit. "Ship-to-main" describes WHERE work lands, never WHO pushes.
2. NEVER run `supabase db push`, `supabase db reset --linked`, or any command that
   mutates the CLOUD project. Local `supabase db reset` only with an explicit
   Architect ruling inside the current dispatch.
3. Act ONLY on a single paste headed exactly `DISPATCH SPEC`, or an Architect
   GO/RULING block amending one. Anything else: read, don't act.
4. A confirm to commit is NEVER a confirm to push. Park at every HARD STOP.
5. Destructive operations (deleting data, dropping objects, force-flags) require an
   explicit per-operation ruling. In doubt → stop and report.
6. Gates are claimed only with raw output (literal stdout/diff), never a verbal "passed."

## Project Overview
Sonye is a squad-based social app for finding and joining local activities.
Users can browse activities near them, join a queue, and get matched into a group lobby with other people.

## Developer Profile
- Beginner developer learning by building
- Uses Cursor AI + Claude Code simultaneously on the same project
- Needs clear explanations alongside code suggestions

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** npm
- **Version Control:** GitHub (https://github.com/ezikebuka1/SquadUp) — repo still named SquadUp; product is now Sonye

## Cursor Plugins Installed
- **Superpowers / Frontend Design** — Use this for generating polished, mobile-first UI components. Always produce clean, modern designs with smooth interactions.
- **Playwright** — Use this for end-to-end testing. When writing tests, target mobile viewports first (390px width).
- **Context7** — Use this to pull up-to-date documentation for Next.js, Tailwind, and React when answering questions.

## Claude Priorities (in order)
1. **Clean mobile-first UI** — All pages must look great on a phone screen (max-width 390px). Use Tailwind responsive classes.
2. **Fast feature building** — Suggest the fastest path to working features. Avoid over-engineering.
3. **Best coding practices** — Use TypeScript types, clean component structure, and reusable components.
4. **Clear explanations** — Always explain what code does in plain English after writing it.

## Design System (per D8 — updated 2026-04-17)
Design tokens live in `src/app/globals.css` `@theme` (D8.2 "Pickup Ready" v2) — the SOLE
runtime truth. Key facts: coral `#EE5E00` (actions only), ink `#14304D`, wash `#E6F0FF`,
Baloo 2 = `font-serif`, Nunito Sans = `font-sans`. Any palette hexes written elsewhere
(including earlier versions of this file) are historical — grep `globals.css`, don't trust
prose. Full canon: `memory-bank/design/`.

## Pages Built So Far
| Page | Route | Status |
|------|--------|--------|
| Home | `/` | ✅ Done |
| Onboarding | `/onboarding` | ✅ Done |
| Group Lobby | `/group-lobby` | ✅ Done (mock data, M5 wires leave) |
| Queue | `/queue` | ⏳ Not started |

## Memory Bank Protocol (REQUIRED)

The `memory-bank/` directory is the shared source of truth across multiple AI sessions (Claude Code, Claude.ai, Gemini). Drift breaks the other sessions.

- At the start of every task, read `memory-bank/activeContext.md` and `memory-bank/progress.md`.
- Before completing any task that changes code under `src/`, update `memory-bank/activeContext.md` with what you changed and what's next.
- A pre-commit hook enforces this — git will refuse the commit if `src/` changes are staged without `memory-bank/activeContext.md`.

## Folder Structure