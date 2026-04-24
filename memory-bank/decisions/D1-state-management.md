# D1 — State Management

**Status:** ✅ Decided 2026-04-18
**Blocks:** M2 (Navigation & Client State)
**Supersedes:** N/A
**Related:** D3 (database schema — D3 will coexist with D1; Zustand caches client state, Supabase holds truth)

## The Decision

SquadUp uses **Zustand** for client-side state management.

The first Zustand store lives at `src/lib/store.ts` and holds the currently-active user. Additional stores (or additional slices of the same store) are added when concrete need arises, not speculatively.

## The Problem

React components cannot share state across page navigations without a mechanism. At M1, SquadUp used a URL parameter (`?onboarded=1`) as the only persistent channel between `/onboarding` and `/`. This was sufficient to prove Option A but does not scale to M2's requirements: a submitted profile must drive the home greeting, the Join button must know which user is joining, and the lobby must know which session the user belongs to.

We need a single, typed, in-memory location where shared data lives between routes.

## Options Considered

### React Context
React's built-in cross-component state mechanism. No dependency. Works by wrapping the app in a provider and reading via `useContext`.

- **Pros:** zero dependencies; simplest mental model; native to React.
- **Cons:** every consumer re-renders on every context change regardless of which field changed. Scales poorly beyond a handful of values. Splitting into many contexts is verbose and easy to get wrong.

### Zustand
A 1.2 KB third-party library. Creates a typed global store; components subscribe to specific slices via selector functions.

- **Pros:** selective re-renders (only components using the changed slice re-render); minimal API; strong TypeScript support; no provider wrapping required; coexists cleanly with server-state libraries (React Query / SWR) in M3+.
- **Cons:** one dependency; global state is always a temptation to overuse.

### URL Params
Store state in the URL via query parameters, read via `useSearchParams`.

- **Pros:** no library; survives navigation natively; shareable links; browser history works.
- **Cons:** cannot represent structured data without serialization acrobatics; all state is public and visible; URL length limits; awkward for multi-select or nested data; state is conceptually part of the route, not of the user — forcing user-profile data into the URL is semantic abuse.

### Server State (React Query / SWR / direct Supabase fetch)
No client-side state store at all. Every page reads directly from the server; the network becomes the source of truth.

- **Pros:** single source of truth; no client-server sync bugs; caching libraries make this performant.
- **Cons:** requires a backend (we have none until M3); over-fetching cost on mobile networks; doesn't address client-only state like "the form the user is currently filling out."

## Why Zustand

1. **Scale fit.** Our shared client state is small-medium: current user, currently-active session, UI-only flags. This is exactly the range Zustand is optimized for. Context is better below this scale; server state dominates above it.

2. **Mobile performance.** Zustand's selector-based subscriptions mean only components that use a changed field re-render. On mid-range Android devices running the PWA, this difference is observable.

3. **Cross-milestone durability.** Zustand works unchanged from M1 (mock data) through M3 (real backend) through M6 (launch). When Supabase arrives in M3, Zustand caches the currently-active user's profile while React Query handles list data from the server. No rewrite.

4. **Low blast radius.** 1.2 KB and ~50 lines of store code. If a future milestone proves Zustand wrong, swapping it out is a contained refactor, not a project-wide rework.

5. **Boring and proven.** Zustand is the default React state library for apps of this size in 2026. SquadUp has no reason to pick an exotic alternative.

## What This Decision Does NOT Mean

- **It does not mean "put everything in Zustand."** Form state still lives in `useState` inside the relevant form component. Server data (once M3 lands) belongs in React Query or direct Supabase reads, not in Zustand. Zustand is for genuinely shared, cross-page, client-only state.

- **It does not dictate store structure.** A single store with slices vs. multiple small stores is an implementation detail to be decided when the second store becomes necessary. M2 starts with one store.

- **It does not replace URL state where URL state is correct.** Route parameters, `/group-lobby/[sessionId]`-style IDs, and filter query strings should still live in the URL. Zustand holds state that does not belong in the URL.

## Consequences and Follow-ups

- `npm install zustand` is added in the first M2 commit.
- `src/lib/store.ts` is created with the initial user store.
- The `?onboarded=1` hack on `/` is retained through M2 as a dev-only demo toggle but no longer carries product meaning — the store is the source of truth.
- The `Hey Jordan` hardcode in the home screen override becomes removable in M2 (real submitted name threads through the store).
- The onJoin console.log stub on slot cards can be wired to real state updates in M2.

## When to Revisit This Decision

- **If state crosses 10+ slices** and we observe re-render performance issues that selectors can't solve, revisit with a slicing strategy, not a library swap.
- **If we introduce true real-time multi-user state in M5** (locked sessions updating live across clients), the boundary between Zustand and Supabase's realtime channels will need a design pass. Zustand likely still holds; the question is what it caches.
- **If we expand to React Native in v2+**, Zustand works on RN; no revisit needed.
