A top level file defining rules  (e.g., "use TDD", "only use approved libraries", etc.)
# SquadUp — Claude Context File

## Project Overview
SquadUp is a squad-based social app for finding and joining local activities.
Users can browse activities near them, join a queue, and get matched into a group lobby with other people.

## Developer Profile
- Beginner developer learning by building
- Uses Cursor AI + Claude Code simultaneously on the same project
- Needs clear explanations alongside code suggestions

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** npm
- **Version Control:** GitHub (https://github.com/ezikebuka1/SquadUp)

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
- **Background:** Soft blue wash `#EEF4FA`
- **Cards:** White `#FFFFFF` with `0.5px solid #DAE7F1` border
- **Primary accent (actions):** Warm coral `#D4724A` — used on buttons and hero text only
- **Text primary:** Dark navy `#1A3650`
- **Text secondary:** Steel blue `#7A9AB8`
- **Borders/dividers:** `#DAE7F1`
- **Skill badges:** Blue badge `#E0EEF9`/`#0C447C`, Amber badge `#FAF0DC`/`#854F0B`
- **Border radius:** `rounded-2xl` (20px) for cards, `rounded-xl` (14px) for buttons
- **Fonts:** DM Sans (headings + body), Instrument Serif italic (hero accent word only)
- **Avatars:** Blue palette (`#1A3650`, `#3A7CB8`, `#5A9FD4`) — never coral
- **50% rule:** Player count + avatars shown on slot cards only when fill ≥ 50% of capacity
- See `memory-bank/decisions/D8-design-system.md` for full spec

## Pages Built So Far
| Page | Route | Status |
|------|--------|--------|
| Onboarding | `/onboarding` | ✅ Done |
| Queue | `/queue` | ⏳ Not started |
| Group Lobby | `/group-lobby` | ⏳ Not started |

## Memory Bank Protocol (REQUIRED)

The `memory-bank/` directory is the shared source of truth across multiple AI sessions (Claude Code, Claude.ai, Gemini). Drift breaks the other sessions.

- At the start of every task, read `memory-bank/activeContext.md` and `memory-bank/progress.md`.
- Before completing any task that changes code under `src/`, update `memory-bank/activeContext.md` with what you changed and what's next.
- A pre-commit hook enforces this — git will refuse the commit if `src/` changes are staged without `memory-bank/activeContext.md`.

## Folder Structure