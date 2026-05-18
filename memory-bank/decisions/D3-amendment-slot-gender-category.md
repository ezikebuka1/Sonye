# D3 Amendment — Slot Gender Category

Status: Locked 2026-05-16
Amends: D3 working draft (schema, in progress)
Triggered by: Real-user feedback (women players) — need for
women-only / men-only game options.

## Decision

slots gains a gender_category field, set by the owner at slot creation:
- 'open'  — anyone (DEFAULT; ~90% of games)
- 'women' — women's game
- 'men'   — men's game

Visible as a tag on the slot card. This is the STRONG safety mechanism
(a commitment), distinct from avatar color (a snapshot).

Users do NOT filter the home screen by this. Everyone sees all games.
The tag is a label, not a segmentation axis — does not split the player
pool, so does not fracture density.

## v1 enforcement: honor system

The app does NOT block wrong-gender joins in v1. Owner sees every join
and handles edge cases manually. Automated enforcement deferred to v2
(would require required gender data; messy with NULL/non-binary). At
launch scale, manual oversight suffices.

## Schema (feeds D3 Step 3)

- slots.gender_category TEXT NOT NULL DEFAULT 'open'
  CHECK (gender_category IN ('open','women','men'))

## Does NOT change

Group size 6, manual curation, waitlist. One additive field.

## Downstream

- D3 Step 3 CREATE TABLE includes this column
- mockData.ts: Slot type gains gender_category
- Slot card UI shows the tag (executed in pre-M3 Commit 2 or M5 polish —
  see Commit 2 instructions)
