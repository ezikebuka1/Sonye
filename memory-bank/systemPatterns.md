# System Patterns

## Architecture
- Next.js App Router — each page lives in `src/app/[page-name]/page.tsx`
- No backend yet — all data is hardcoded fake data for now
- Mobile-first — design for 390px width first, scale up

## Design Patterns
- One page per folder inside `src/app/`
- Reusable components will go in `src/components/` (Week 4+)
- Tailwind only — no inline styles, no CSS modules
- TypeScript strict — no `any` types

## Color System
- Background: `bg-black`
- Cards: `bg-gray-900`
- Primary: `blue
-600`
- Text: `text-white` + `text-gray-400`
- Buttons: `rounded-xl`, Cards: `rounded-2xl`

## File Naming
- Pages: `page.tsx`
- Components: `PascalCase.tsx` (e.g., `ActivityCard.tsx`)