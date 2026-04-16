# System Patterns

## Architecture
- Next.js App Router — each page lives in `src/app/[page-name]/page.tsx`
- No backend yet — all data is hardcoded fake data for now
- Mobile-first — design for 390px width first, scale up

## Design Patterns
- One page per folder inside `src/app/`
- Reusable components live in `src/components/` (extracted as needed during M1)
- Tailwind only — no inline styles, no CSS modules
- TypeScript strict — no `any` types

## Color System
- Background: `bg-black`
- Cards: `bg-gray-900`
- Primary: `blue-600`
- Text: `text-white` + `text-gray-400`
- Buttons: `rounded-xl`, Cards: `rounded-2xl`

## File Naming
- Pages: `page.tsx`
- Components: `PascalCase.tsx` (e.g., `ActivityCard.tsx`)

## V1 Product Mechanics (per D7)

Canonical source: `memory-bank/decisions/D7-product-mechanics-v1.md`. This section summarizes the patterns the codebase must implement.

### Slot Lifecycle
1. Owner manually publishes a slot (sport, skill level, venue, day, time, capacity 6).
2. Users see published slots on the home screen.
3. User taps a slot → opt-in record created.
4. When opt-ins reach capacity (6/6), session is **locked**. All members notified.
5. Locked sessions are immutable until completion.

### Waitlist
- Waitlist exists only when slot is full (6/6).
- Holds 2 people max for that slot.
- 3rd waitlist attempt → notify owner (no auto-spawn in v1).
- Always prioritize filling original slot before considering waitlist actions.

### Cancellation
- User cancels → system asks one question: reason for cancellation.
- No reschedule prompt in v1. Reason data informs v2 design.

### Sole-Occupant Slot
- If slot has only 1 user as game-time approaches (default 6h before), notify user, prompt them to join another slot or waitlist.
- Cancel the sparse slot.

### Onboarding Schema (7 fields)
- name (text)
- phone (text, required for SMS auth)
- sport (single-select; v1 hardcoded to "pickleball")
- skill_level (single-select: beginner / advanced beginner / intermediate / advanced)
- general_availability (multi-select: weekday evenings / Saturday morning / Saturday evening / Sunday morning / Sunday evening)
- preferred_venues (multi-select: Cole Park / Churchill Park / Fretz Park)
- willing_to_drive (single-select: under 10 / under 20 / under 30 / 30+ minutes)

### V2 Architectural Breadcrumbs
Fields collected/stored in v1 even though not yet used, to prevent v2 migrations:
- `sessions.creation_mode` — always `scheduled_slot` in v1; `play_now` added in v2
- `sessions.sport`, `users.sport` — always `pickleball` in v1; multi-sport in v2
- `users.willing_to_drive` — collected in v1, used by v2 matching algorithm

### Waitlist Import
Pre-launch waitlist users (collected via Waitlist Intake Script) are pre-seeded into the database via `npm run seed:waitlist`. Launch day: each receives SMS with magic claim link. Tap → OTP verify → account linked to pre-seeded record. No re-onboarding required.

## Process Patterns

### Sketches Before Code (effective 2026-04-15)
All visual design proposals must be presented as rendered sketches (HTML/SVG artifact previewable in browser) before implementation. Architect session enforces this. No design changes get handed to Code without an approved visual sketch.
