# System Patterns

## Architecture
- Next.js App Router — each page lives in `src/app/[page-name]/page.tsx`
- Backend: Supabase (Postgres + RLS) — local Dockerized instance for dev, cloud project for production. All membership mutations go through explicit Postgres transaction functions (M3 discipline); reads via gated read functions (`slot_share_preview` is the only anon-callable one).
- Auth: Supabase Auth (phone OTP) via `@supabase/ssr`; server-side post-verify routing as Server Actions (D2 Amendment B)
- Mobile-first — design for 390px width first, scale up

## Design Patterns
- One page per folder inside `src/app/`
- Reusable components live in `src/components/`
- Tailwind only — no inline styles, no CSS modules
- TypeScript strict — no `any` types

## Visual System (D8.2 — supersedes D8 color/typography)

Canonical source: the D8.2 decision doc in `memory-bank/decisions/`. Project-knowledge summary: `D8.2-visual-identity.md`. D8's component anatomy (slot card structure, 50% fill rule, corner radii) persists unless re-sketched under D8.2; D8's color/type tokens are retired.

- Core: sky `#8DBCF1` · pale bg `#E6F0FF` · ink `#14304D` · steel `#5E80A3` · muted `#9DB8D2` · borders `#CFE0F4`/`#B7D2EE`
- Action/CTA `#EE5E00` · decorative orange `#FF6A00` · yellow `#FFC63D`
- Error `#D64B4B` (locked) · success `#4BAE78`
- Skill ramp: beginner `#DCEBFF`/`#15457B` · adv-beginner `#FFF1CC`/`#8A5A00` · intermediate `#D8EFDF`/`#246B42` · advanced `#D7E0EC`/`#14304D`
- Type: Baloo 2 (display) + Nunito Sans (body). DM Sans retired. Wordmark: lowercase "sonye", bold navy. Domain: sonye.app.

**50% fill rule:** slot cards/previews show fill count only when opt-ins ≥ 50% of capacity (`fill_ratio_shown`). Below that, no count.

## File Naming
- Pages: `page.tsx`
- Components: `PascalCase.tsx` (e.g., `ActivityCard.tsx`)

## V1 Product Mechanics (per D7, as amended)

Canonical source: `memory-bank/decisions/D7-product-mechanics-v1.md` + amendments D7.1–D7.5.

### Slot Lifecycle
1. Owner manually publishes a slot (sport, skill level, venue, day, time, capacity 4 or 6). Owner-only: `slots_insert_owner` RLS gate.
2. Users see published slots; anon users see the detail page via `slot_share_preview` only.
3. User taps Join → auth wall → membership via `join_slot` (the sole write path).
4. At capacity, session locks. Locked sessions immutable for joined members.

### Waitlist — UNCAPPED in v1 (supersedes D7's 2-cap)
- `join_slot` on a full slot returns `'waitlisted'` — unbounded, no hard reject. Locked 2026-06-10 (Ebuka + Gemini): more demand signal, no dead-end (Partiful posture), matches implementation.
- Owner monitors waitlist depth via a saved SQL query (D11 owner-review pattern) and spins up new slots by hand.
- D7's "waitlist holds 2, 3rd notifies owner" is spec-only and superseded for v1. The automation of this step is D7.5 Cell Division — a v2-signal, not v1 work.

### Onboarding — unified 4-field form (per D7.4)
In-app onboarding for ALL net-new users (both generic and slot-context entry) is ONE form: `first_name`, `last_name`, `skill_level`, optional `gender`. `general_availability`, `preferred_venues`, `willing_to_drive` are NOT asked in-app (NULL; v2 seams). The full 7-field schema remains valid for the Waitlist Intake Script (pre-launch manual collection). Paths: waitlist claim (Flow 3) and returning users see no form at all.

### Sequential writes — account durable by construction (per 3B)
`signup_claim` commits the account FIRST and independently; `join_slot` is the best-effort SECOND call. Never combine into one rollback-coupled transaction — `join_slot` RAISEs on cancelled slots, and a combined transaction would roll the account back with it. Catch the raise at the call site; do NOT change `join_slot`'s raise contract (other callers depend on the throws).

### Cancellation / Sole-Occupant
Unchanged from D7: cancel asks one reason question; no reschedule prompt in v1; sparse-slot handling per D7.

### V2 Architectural Breadcrumbs
- `sessions.creation_mode` — always `scheduled_slot` in v1
- `sport`, `metro` — real fields; v1 hardcodes pickleball/Dallas
- `willing_to_drive`, `general_availability`, `preferred_venues` — schema-present, in-app-dormant

## Process Patterns

### V1 Scope Discipline (effective 2026-04-18)
V1 feature additions must improve density and liquidity. See `projectbrief.md` → "Density Over Everything." Architect session enforces; segmentation proposals default to the icebox. (Recent application: D7.5 Cell Division → v2-signal, not v1 build.)

### Raw-Output Reporting (effective 2026-04-18)
When Code reports completion, it MUST paste raw output before any summary: `git log --oneline -5` and `git log origin/main..HEAD --oneline`, plus raw psql/DOM/log output for every checkpoint. Summaries are optional additions, never substitutions. This discipline has caught: commit-count drift (claimed 8 → was 4), checkpoint substitution (D9 shown for a cancelled-durability proof; a banner shown for an a11y proof), copy drift, and a missing migration paste. Architect refuses the next spec until raw output is provided.

### Sketches Before Code (effective 2026-04-15)
All player-facing visual proposals are rendered sketches (HTML/SVG artifact) approved before implementation.

### Dispatch-Only Execution (effective 2026-05-16)
Code acts only on a single-paste handoff headed "DISPATCH SPEC". Review drafts — even ones marked "Locked" — are not execution orders.

### Schema-Change Dispatch Discipline (effective 2026-06-10)
Schema/function changes (migrations, `CREATE OR REPLACE` on any RPC, RLS/grant edits) get their **own reviewed dispatch and their own commit** — never folded into an app-feature commit, never applied autonomously mid-build. Edits to load-bearing functions are **surgical**: change the target lines and nothing around them (no comment relabels, no formatting joins) — cosmetic churn in a diff is where a real change can hide.

**Root cause:** during Phase 3B, Code autonomously rewrote `signup_claim` (the GoTrue fix) inside the feature commit `c0b57a6`. The fix was correct and reviewed after the fact (extracted-function `diff -u` proved scope), and the commit was deliberately NOT rebased apart (3-deep agent-driven rebase risk > cosmetic gain) — but the pattern is not repeated. Correct shape going forward: Code stops, reports the bug, architect reviews, fix ships as its own dispatch + commit.

### Migration-Order Verification (effective 2026-05-21)
`LANGUAGE sql` functions and views validate their bodies at CREATE time — every referenced table must be created earlier in the migration. Checklist before any migration commit: list `CREATE … LANGUAGE sql` functions, grep bodies for table names, confirm ordering, else move the block or convert to plpgsql.

### Seed PII Discipline (effective 2026-06-02)
Committed migrations always carry loud placeholders (`+10000000000`, NULL `auth_user_id`); real PII reaches cloud only via separate, never-committed one-off scripts (`.gitignore`'d under `/scripts/cloud-only/` or dashboard snippets). Verify post-swap with a documented query.

### Secrets Discipline (effective 2026-06-08, post-incident)
No cloud keys in any committed file, ever — including verify scripts (the incident's root cause). Verify scripts run against local Docker using the public local-default JWTs only. Cloud keys live in Ebuka's password manager and the Supabase dashboard. Never click GitHub's "allow secret" URL — purge and rotate instead. If history rewrite is needed: `git-filter-repo --replace-text`, verify with three greps (log -p, tracked files, --all), rotate the key, then `git push --force-with-lease`.

## Known Gotchas

- **GoTrue strips the `+` from JWT phone claims.** `auth.jwt() ->> 'phone'` returns `15555550033`, not `+15555550033`. Any comparison against `public.users.phone` (strict E.164 CHECK) must normalize — prepend `+` when absent (the `signup_claim` fix pattern; idempotent, no stripping). Synthetic proofs that set phones directly will NOT catch this class of bug — only the live auth flow does.
- **Security hook fires on the sport name.** The local security plugin false-positives on the substring "pickle" and blocks the Write tool. Use heredoc bash (`cat > path << 'EOF'`) or a Python file-write.
- **Shell blocks `$(...)` command substitution.** Use pipes, `xargs`, or two-step commands.
- **`signup_claim` parameter order:** non-default params before defaulted ones; grants matrix signature must match. `p_claim_token` is position 7.
- **Real-device verification needs the production build** (`npm run build && npm run start`), not `npm run dev` — HMR WebSocket binds to localhost only; React won't hydrate on a phone over wifi.
- **Return-shape changes to functions need DROP + CREATE** (not `CREATE OR REPLACE`), and DROP silently wipes grants — re-assert them (the M3.4 lesson).
- **Playwright `.click()` inside `evaluate` fires before React re-renders** — use Playwright's native click / dispatch bubbling events when asserting post-interaction DOM state.
- **`member_count` trigger covers INSERT + UPDATE OF status only; DELETE is intentionally uncovered.** `trg_sync_slot_counts` fires `AFTER INSERT OR UPDATE OF status` and its body reads `NEW.slot_id` (NULL on DELETE). No app path deletes a membership row — RLS exposes no DELETE policy, FKs are `ON DELETE RESTRICT`, and leave/kick are status→left UPDATEs (covered). A DELETE-reconcile branch would be dead code. (Phase 4B G2 ruling.) Battery probes the real paths (join → +1, full-join → waitlist, status→left → reconcile, CHECK backstop) — not raw DELETE.
- **BSD `grep -E` treats `\d` as a literal `d`, not a digit class.** macOS grep is BSD; a verbatim `\d{3}` pattern silently matches nothing useful. Use POSIX `[0-9]{3}` in digit-pattern proofs. (Surfaced in 4A's D10 curl proof — the spec's `\(\d{3}\) \d{3}-\d{4}` grep was weaker than intended; the `[0-9]` variant is authoritative.)
- **RSC flight payload doubles raw substring counts.** `grep -o "sms:" page.html | wc -l` counts each server-rendered anchor twice (once in DOM, once in the hydration/flight stream). For DOM-truth counts use `grep -o 'href="sms:'` (the attribute form appears once). (4A D10 proof.)
- **psql `UPDATE … RETURNING` with `-A -t` still emits the `UPDATE 1` command tag**, so `TOKEN=$(psql -c "UPDATE … RETURNING x")` captures `<value>\nUPDATE 1` and breaks any URL built from it (embedded newline → curl HTTP 000). Extract the value defensively: pipe through `grep -oiE '<uuid-regex>' | head -1`. (4B token-lifecycle battery.)

## Push Discipline

Pushes to GitHub are manual — never automated, Ebuka only, post-validation. Rationale: network side effects should be explicit.

- Push after each validated phase, not in batches
- Verify with `git log origin/main..HEAD --oneline` before declaring work "done" — and again after pushing (must be empty)
- Post-commit hooks that auto-push are explicitly rejected
- Husky pre-commit hook: any `src/` commit must also stage `memory-bank/activeContext.md`
