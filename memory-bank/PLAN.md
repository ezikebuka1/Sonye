# Sonye — Plan

**Product (v1):** Manually-curated recurring pickleball games for reliable groups, in Dallas. Group size 6, SMS-OTP auth, pre-seeded waitlist onboarded via SMS magic-claim links. Evolution-first — v1 is the first form, not the final one; expansion (more activities / more metros) is gated on density, not calendar dates.

**Where we are:** The schema (M3) is shipped, verified, and live in cloud. M4 — the application layer — is underway; Phase 0 and Phase 1 are done.

## M4 — application layer (Phase 0–6, local-first; cloud is the last step)

- **Phase 0 — Local auth spine** ✅ — `@supabase/ssr` clients, local test-OTP, bound dev owner.
- **Phase 1 — Owner create-slot** ✅ — owner-only form, direct RLS INSERT (`slots_insert_owner`), Dallas-timezone handling.
- **Phase 2 — Anon read surfaces** ← NEXT — slot-detail landing page + state-aware OG share images (cards sketched in D8.2). Sketch the detail page first.
- **Phase 3 — Player auth UI** — phone/OTP pages + post-verify routing (D2 Model C branching) + onboarding forms → `signup_claim` + join.
- **Phase 4 — Behind-login player surfaces** — lobby phone directory (`slot_roster`), join + D9 same-day toast, attendance routes `/c/y` `/c/n`.
- **Phase 5 — Owner tools** — owner dashboard + cancel-slot.
- **Phase 6 — Twilio swap + cloud end-to-end** — real SMS once the Twilio campaign clears; the only Twilio-gated phase.

**Gating:** Phases 0–5 build and verify locally with no Twilio. Only Phase 6 waits on Twilio campaign approval (mid-flight). Cloud apply stays a manual, human-gated step.

## Beyond v1

Tracked in `v2-signals.md`. Expansion direction (activity-broad vs. geography-broad) is deliberately left open; the schema keeps both seams (real `sport` / `metro` fields). Gated on density/liquidity thresholds, not dates.
