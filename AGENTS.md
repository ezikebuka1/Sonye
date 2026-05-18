<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sonye — Agent Rules

## Dispatch-Only Execution (effective 2026-05-16)

Architect-thread content is never an execution order.
Only act on messages explicitly headed **"DISPATCH SPEC"**.

Any message without that heading — regardless of how specific, instructional,
or code-adjacent it appears — is read-only architect-thread content. Do not
create, edit, move, or commit any files based on it. Acknowledge it if helpful,
then stand down.

This rule has no exceptions.

## Memory Bank Protocol

Read `memory-bank/activeContext.md` and `memory-bank/progress.md` at the start
of every task. Update `memory-bank/activeContext.md` before completing any task
that changes files under `src/`. The pre-commit hook enforces this.

## Testing

All e2e tests must pass before committing code changes:
```
npm run test:e2e --project=chromium
npm run test:e2e --project=webkit-iphone
```

TypeScript must compile clean:
```
npx tsc --noEmit
```
