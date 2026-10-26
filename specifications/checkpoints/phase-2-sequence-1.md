# Phase 2 Sequence 1 checkpoint

Status: **Partial; do not advance the dependency sequence yet**.

## Implemented slice

- Added an internal update clock with immutable `UpdateTime` snapshots.
- Implemented the accepted default `0.1` second simulation clamp.
- Implemented first-update and post-reset zero timing semantics.
- Added an injected synchronous frame loop with update-before-draw ordering.
- Added explicit pause, hidden-document suspension hooks, callback failure stop,
  idempotent disposal, and deterministic scheduler tests.

## Not implemented

- Asynchronous setup and initialization failure cleanup.
- Typed lifecycle error union and public game factory contract.
- Resource acquisition, ownership sharing, stale-handle rejection, and safe
  GPU reclamation.
- Browser visibility event wiring and a real game host.

## Trace

The current replacement path is direct test import →
`src/lib/core/runtime/timing.ts` or `frame_loop.ts` → injected scheduler →
update/draw callbacks. No legacy package export imports these modules, so the
existing PixiJS package boundary is unchanged. The tests are linked from the
capability drafts but do not promote either capability to Implemented.

## Evidence

- `npm run test:unit`: passed; 9 files and 24 tests.
- `npm run test:type`: passed.
- `npm run check`: passed with zero diagnostics.
- Targeted ESLint for the new runtime and tests: passed.
- Targeted Prettier check: passed.
- `git diff --check`: passed.

## Gate

The timing/frame-loop sub-slice is verified. Continue Sequence 1 only after
resolving the remaining `game-lifecycle` and `resource-ownership` contract
gates without inventing public API behavior.
