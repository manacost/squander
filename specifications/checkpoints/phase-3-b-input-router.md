# Phase 3-b input router checkpoint

Status: slice 1 complete and verified; commit pending Git index access. Browser
adapter, device polling, and game integration remain future slices.

## Contract decisions

- Phase 3-b includes keyboard, pointer/mouse, and gamepad input.
- The core interface is raw-device input. Action maps and rebinding are not
  part of this phase's first slice.
- Scene handlers run newest mounted scene first.
- Global handlers are fallback handlers by default; explicit global capture is
  available for system-level behavior.
- `pass`, `consume`, and `consume_and_prevent_default` are distinct outcomes.
- The core router does not know about DOM focus or `preventDefault()`.
  Browser policy belongs to the later adapter seam.
- Subscription mutation uses a stable dispatch snapshot. Removal affects the
  next event, not a traversal already in progress.

## Trace

`create_input_router()` -> normalized `InputEvent` union -> scene handler stack
-> global capture/fallback handlers -> `InputDisposition` -> unit/type tests.

This slice is intentionally not wired into `create_game()` yet. The next
integration slice will attach one router to each game instance and scope scene
subscriptions to scene teardown.

## Files and public symbols

- `src/lib/core/runtime/input.ts`: `InputEvent`, device event types,
  `InputDisposition`, `InputRouter`, and `create_input_router`.
- `src/lib/core/runtime/index.ts`: public runtime export.
- `src/lib/core/runtime/input.test.ts`: behavioral seam tests.
- `type-tests/input.ts`: event narrowing and rejected misuse.
- `specs/input-routing/spec.md`: capability contract.
- `specifications/phase-3-b.md`: phase scope and browser policy.

## Evidence

- `npm run check`: passed with zero Svelte/TypeScript diagnostics.
- `npm run lint:code`: passed with zero errors and warnings.
- `npm run test:unit`: passed, 31 files and 177 tests.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed for 20 capability directories.
- `npm run test:coverage:runtime`: passed; overall statements 96.96%, branches
  95.27%, functions 97.95%, lines 97.94%. The new `input.ts` file reached
  statements 98.27%, branches 95%, functions 100%, lines 100%.
- `npm run check:coverage`: passed for 24 files; all metrics exceed 90%.
- `git diff --check`: passed.

`npm run lint:format` still reports the pre-existing formatting warning in
`specifications/checkpoints/phase-3-a-composition-stack.md`; all new Phase 3-b
files pass Prettier.

## Review and gap status

The seam review is READY for the first slice: the implementation has no DOM
dependency, no implicit browser default cancellation, and no action-map
leakage. The focused gap check passes for every slice-1 acceptance criterion.
Real browser evidence is intentionally deferred because this slice has no DOM
adapter or rendering claim.

## Next slice

Build the browser keyboard and pointer adapter. It must preserve native focus
and editable-control behavior, route game-owned overlays through the same
scene-first router, translate default-prevention dispositions, and use standard
pointer capture for drag ownership.
