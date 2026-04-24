# Project Brief

## The Problem
Organizing casual sports is high-friction. For a 25-45-year-old who just moved to a new city, showing up to a park alone is intimidating, and managing a messy group chat is a logistical nightmare. People flake, skill levels clash, and games fall apart.

## The Solution
A mobile-first PWA that acts as a matchmaking and coordination engine. Users input their availability, skill, and preferred venues. The system autonomously forms reliable, critical-mass groups by filling pre-published time slots.

## V1 Mechanism (per D7)
V1 implements brief-aligned matching via **manually curated, recurring time slots** that users opt into. Pickleball only. Three Dallas venues at launch (Cole Park, Churchill Park, Fretz Park). Group size of 6 to absorb 1-2 flakes without breaking the experience. Owner manually curates slots and waitlist expansion for the first month, then automates based on observed patterns.

## V2 Vision (deferred, captured for direction)
Multi-activity (paintball, tennis, etc.). "Play Now" button for spontaneous autonomous matching once user pool supports it. Reschedule prompts on cancellation, automated slot spawning, weather monitoring. All deferred to v2 — see `decisions/D7-product-mechanics-v1.md`.

## The Goal
Design, build, and deliver a fully functional, reliable MVP. Pre-launch waitlist of real users (collected manually) is pre-seeded into the database; launch day onboards them via SMS magic-claim links. Measure engagement, iterate based on real-world coordination data.

## V1 Decision Principle: Density Over Everything

The dominant risk in v1 is not bad matching — it is empty slots. A slot
with 3 players and mediocre chemistry is strictly better than a slot
with 1 player and perfect chemistry, because the first produces a game
and the second does not.

Every feature proposal during v1 must answer: "Does this improve
density and liquidity, or does it fracture the user base further?"
Filters, preferences, and segmentation axes all carry a density cost,
because each one splits the pool of opt-ins into smaller sub-pools.

Features that improve density earn a place in v1. Features that
fracture — no matter how good the product intuition behind them — go
to v2 until post-launch data shows density is high enough to afford
the segmentation.

This principle was articulated 2026-04-18 during M1 checkpoint, in
response to the play-reason matching proposal (see `PLAN.md` icebox
for that specific deferral).
