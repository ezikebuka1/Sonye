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

## Design System
- **Primary color:** Blue (`blue-600`, `blue-500`)
- **Background:** Black (`bg-black`)
- **Cards:** Dark gray (`bg-gray-900`)
- **Text:** White + gray (`text-white`, `text-gray-400`)
- **Border radius:** Rounded-2xl for cards, rounded-xl for buttons
- **Font:** Default Next.js (Geist)

## Pages Built So Far
| Page | Route | Status |
|------|--------|--------|
| Onboarding | `/onboarding` | ✅ Done |
| Queue | `/queue` | ✅ Done |
| Group Lobby | `/group-lobby` | ⏳ Not started |

## Memory Bank Protocol (REQUIRED)

The `memory-bank/` directory is the shared source of truth across multiple AI sessions (Claude Code, Claude.ai, Gemini). Drift breaks the other sessions.

- At the start of every task, read `memory-bank/activeContext.md` and `memory-bank/progress.md`.
- Before completing any task that changes code under `src/`, update `memory-bank/activeContext.md` with what you changed and what's next.
- A pre-commit hook enforces this — git will refuse the commit if `src/` changes are staged without `memory-bank/activeContext.md`.

## Folder Structure