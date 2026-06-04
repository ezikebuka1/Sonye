# D12 — slots.skill_level (corrective schema patch)

**Status:** DECIDED — 2026-06-04  
**Milestone:** M3.4  
**Migration:** `supabase/migrations/20260604050433_m3_4_slot_skill_level.sql`

---

## Problem

`slots` had no `skill_level` column. The field existed in `mockData.ts` but was never included in the D3 SQL (`20260520044919_m3_initial_schema.sql`). Every downstream consumer — the owner create-slot form (Phase 1), `SlotCard` skill badge, slot-detail view, and the OG preview — needs a structured tier on the slot itself.

## Decision

Add `skill_level text NOT NULL` to `public.slots` with a CHECK constraint mirroring `users_skill_level_valid`:

```
CHECK (skill_level IN ('beginner','advanced_beginner','intermediate','advanced'))
```

No DEFAULT. The owner form always supplies it; fail-loud on omission is the right behaviour for a NOT NULL field with a constrained domain.

Also extend `slot_share_preview` to return `skill_level` as the last column, so the anonymous OG/share path can surface the tier without a second query.

## Why NOT edit the base migration

`20260520044919_m3_initial_schema.sql` is already applied to cloud via `supabase db push`. Editing an applied migration causes a version/hash mismatch — it will not re-apply. A new forward migration is the correct mechanism.

## Constraint parity with users

`users_skill_level_valid` already enforces the same four tiers. The slot constraint uses the same set verbatim. If a new tier is ever added, both constraints are updated together.

## Safe NOT NULL without DEFAULT

`slots` is empty in both the fresh local DB and on cloud at the point this migration runs — the create-slot form (Phase 1) has not been built yet. An empty table makes NOT NULL-with-no-DEFAULT safe: there are no existing rows to backfill, and future rows are forced to supply the value explicitly.

## slot_share_preview replacement

`LANGUAGE sql` bodies validate at `CREATE` time — the column must exist before the `CREATE OR REPLACE FUNCTION` statement. The migration orders: `ALTER TABLE ADD COLUMN` → `ADD CONSTRAINT` → `CREATE OR REPLACE FUNCTION`. Grants are explicitly re-asserted after the replace (anon + authenticated both need EXECUTE).

## Affected files

| File | Change |
|------|--------|
| `supabase/migrations/20260604050433_m3_4_slot_skill_level.sql` | New forward migration |
| `supabase/verifications/phase3a_proofs.sql` | skill_level added to 3 slot INSERTs |
| `supabase/verifications/phase3b_setup.sql` | skill_level added to 4 slot INSERTs |
| `supabase/verifications/phase3b_proofs_m34.sql` | New M3.4 proof battery (Proofs 16a/b/c) |
