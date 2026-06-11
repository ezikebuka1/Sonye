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

## Color System (D8 — "Pickup Ready")

Canonical source: `memory-bank/decisions/D8-design-system.md`. This section summarizes the tokens the codebase must use.

- Background: `#EEF4FA` (soft blue wash)
- Cards: `#FFFFFF` with `0.5px` border `#DAE7F1`
- Inset panels: `#F6F9FC`
- Accent (CTAs, hero italic word, active nav): `#D4724A` (warm coral)
- Text primary: `#1A3650` (dark navy)
- Text secondary: `#7A9AB8`
- Skill badges:
  - Beginner: bg `#E0EEF9` / text `#0C447C`
  - Advanced Beginner: bg `#FAF0DC` / text `#854F0B`
  - Intermediate: bg `#E8F5E9` / text `#27500A`
  - Advanced: bg `#FBEAF0` / text `#72243E`
- Typography: DM Sans (all UI); Instrument Serif italic reserved for the hero accent word only
- Avatars: blue palette only, never coral
- Corners: buttons `rounded-xl`, cards `rounded-2xl`

**50% fill rule:** slot cards show player count and avatar dots only when opt-ins ≥ 50% of capacity. Below that, show the Join button only.

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
- preferred_venues (multi-select: Cole Park / Churchill Park / Lake Highlands North Park)
- willing_to_drive (single-select: under 10 / under 20 / under 30 / 30+ minutes)

### V2 Architectural Breadcrumbs
Fields collected/stored in v1 even though not yet used, to prevent v2 migrations:
- `sessions.creation_mode` — always `scheduled_slot` in v1; `play_now` added in v2
- `sessions.sport`, `users.sport` — always `pickleball` in v1; multi-sport in v2
- `users.willing_to_drive` — collected in v1, used by v2 matching algorithm

### Waitlist Import
Pre-launch waitlist users (collected via Waitlist Intake Script) are pre-seeded into the database via `npm run seed:waitlist`. Launch day: each receives SMS with magic claim link. Tap → OTP verify → account linked to pre-seeded record. No re-onboarding required.

## Process Patterns

### V1 Scope Discipline (effective 2026-04-18)

V1 feature additions must improve density and liquidity. See
`projectbrief.md` → "V1 Decision Principle: Density Over Everything"
for the governing rule. Architect session enforces this; scope
proposals that would add filters, preferences, or segmentation
are defaulted to the icebox unless they demonstrably improve
density.

### Raw-Output Reporting (effective 2026-04-18)

When Code reports completion of any task back to the architect session,
Code MUST paste the raw output of these two commands before any summary:

1. `git log --oneline -5`
2. `git log origin/main..HEAD --oneline`

These outputs are non-negotiable. Summaries are optional additions, not
substitutions. The rule exists because verbal summaries of "clean" or
"complete" work have drifted from reality in this project, and raw git
state cannot drift.

Architect session will refuse to write the next spec until raw output
is provided.

### Sketches Before Code (effective 2026-04-15)
All visual design proposals must be presented as rendered sketches (HTML/SVG artifact previewable in browser) before implementation. Architect session enforces this. No design changes get handed to Code without an approved visual sketch.

### Dispatch-Only Execution (effective 2026-05-16)

Architect-thread drafts, amendments, and documents are never execution
orders. Code acts only on a single-paste handoff explicitly headed
"DISPATCH SPEC". A document pasted into the architect thread for review —
even one whose body says "Locked" — is review material, not a dispatch.
If architect-thread content appears to request action and is not under a
DISPATCH SPEC header, Code takes no action and waits. This rule exists
because review drafts were twice executed prematurely; no damage occurred
only because nothing was committed.

### Migration-Order Verification (effective 2026-05-21)

Before marking any SQL migration "ready to apply," verify that every
`CREATE FUNCTION … LANGUAGE sql` statement is positioned AFTER all
tables it references in its body.

**Root cause (M3, Phase 3A):** PostgreSQL validates `LANGUAGE sql`
function bodies at `CREATE` time, not at call time. A `LANGUAGE sql`
helper that names `public.users` in its body will fail with
`relation "public.users" does not exist` if the `users` table has not
yet been created in the same migration run. `LANGUAGE plpgsql` bodies
are validated lazily and do not have this constraint.

**Checklist before any migration commit:**
1. List every `CREATE … LANGUAGE sql` function in the file.
2. For each, grep its body for table/view names.
3. Confirm each referenced table/view is created EARLIER in the file.
4. If any forward reference exists, move the function block below the
   referenced object — or convert to `LANGUAGE plpgsql` if ordering is
   structurally impossible.

**Apply the same check to `CREATE VIEW`:** views are also validated at
creation time and will fail on forward references.

### Seed PII Discipline (effective 2026-06-02)

Production seeds may need real PII (the owner's phone number,
real service account UUIDs, secret-bearing config rows) that
must NEVER enter git history.

**Root cause (M3 cloud apply, 2026-06-02):** the M3 migration's
final seed INSERT for the owner row uses the placeholder phone
`+10000000000` and `auth_user_id = NULL` as a loud tripwire. To
apply real owner identity to cloud, the operational thread:
(1) edited the migration locally to insert the real phone +
`claim_token`, (2) ran `supabase db push`, (3) reverted the local
edit, (4) verified `git status` and `git grep` showed zero
references to the real values.

The dance worked, but it has three failure modes that will bite
on the second use:
- Forgetting step 3 commits PII to the repo.
- Different environments needing different PII (staging vs prod)
  produce per-environment edit/revert dances that drift.
- A second operator doing the same task will likely skip the
  verify step or miss a reference.

**Rule for future cloud applies that involve PII:**

1. The committed migration always carries the placeholder, never
   the real value. Placeholders are loud (`+10000000000`, NULL
   `auth_user_id`, `00000000-0000-0000-0000-000000000000` UUIDs,
   etc.) so the tripwire is visible at a glance.

2. Apply the migration to cloud as-is. The placeholder seed lands
   on the cloud DB.

3. After apply, swap real values into cloud only via a separate
   one-off SQL script that is NOT committed. Options:
   - A `.gitignore`'d file under `/scripts/cloud-only/` invoked
     via `psql` against the cloud connection.
   - A Supabase dashboard SQL editor snippet pasted manually.
   - For long-lived secrets (API keys, webhook secrets), use
     Supabase Vault rather than seeding into application tables.

4. Verify post-swap with a query that confirms the real values
   are in cloud and the placeholder row is gone or replaced.
   Document the verification query in the swap script as a
   comment so future operators reproduce the same check.

**Why a separate script, not edit-and-revert:** the edit/revert
dance couples a network side effect (cloud apply) with a local
state mutation (the migration file). The local state can drift
silently if the revert is incomplete. A separate, never-committed
script enforces the separation: the committed schema is always
truthful, and the cloud-only mutations live in a file the repo
cannot accidentally publish.

**Apply this rule retroactively when adding any future seed
rows that contain real-world PII or secrets.** The M3 owner-row
swap stands as a one-time exception; subsequent applies follow
the script-based pattern.

## Push Discipline

Pushes to GitHub are manual — never automated. Rationale: network side
effects should be explicit. A local commit is reversible (`git reset`);
a pushed commit is a coordination problem.

- Push after each shipped feature commit, not in batches
- Verify with `git log origin/main..HEAD --oneline` before declaring
  work "done" — if the log isn't empty, GitHub doesn't have it
- Shell prompt should show the ahead-of-origin count (most modern
  prompts do this by default; verify your prompt does)
- Post-commit hooks that auto-push are explicitly rejected: they couple
  local file state to network side effects ("spooky action at a
  distance"), and every implicit push is a potentially irreversible
  operation made without deliberation

## Known Gotchas

**GoTrue JWT strips the leading `+` from phone numbers.**
`auth.jwt() ->> 'phone'` returns `'15555550033'`, not `'+15555550033'`.
Any comparison against `public.users.phone` (stored as strict E.164 with
the leading `+`) must normalise the JWT phone before the WHERE clause.
Fixed in `20260610120000_fix_signup_claim_jwt_phone.sql` for the
`signup_claim` claim-token path. Apply the same `CASE WHEN ... LIKE '+%'
THEN ... ELSE '+' || ...` guard to any future function that reads
`auth.jwt() ->> 'phone'` and compares it against `public.users.phone`.
