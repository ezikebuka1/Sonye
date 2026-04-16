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
