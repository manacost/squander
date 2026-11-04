# Phase 3-b gamepad checkpoint

Status: slice 4 verified and ready to commit.

## Contract

- `create_browser_gamepad_adapter({ router, window? })` creates one adapter for
  one game/router.
- `gamepadconnected` and `gamepaddisconnected` trigger a state refresh.
- `poll()` samples `navigator.getGamepads()` and emits connection, button, and
  axis changes through the input router.
- Button and axis events are emitted only when values differ from the previous
  sample.
- `state.get(index)` and `state.all()` expose immutable snapshots.
- The adapter does not create its own animation loop; the owner chooses the
  frame/update cadence.
- Missing `navigator.getGamepads()` is reported immediately at construction.

## Trace

browser Window connection events / `navigator.getGamepads()` -> snapshot
comparison -> normalized `GamepadInputEvent` -> game input router -> scene or
global handler; snapshot readers use `GamepadState`.

## Evidence

Verification:

- `npm run test:unit`: passed, 33 files and 192 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run lint:code`: passed.
- `npm run validate:specs`: passed for 20 capability directories.
- `npm run test:coverage:runtime`: passed; overall statements 96.93%, branches
  95.19%, functions 97.58%, lines 97.97%. The new adapter reached 98.59%
  statements, 96.77% branches, 93.75% functions, and 100% lines.
- `npm run check:coverage`: passed for 26 files.
- `npm_config_cache=/private/tmp/squander-npm-cache npm run package`: passed;
  Publint reported `All good!`.
- `git diff --check`: passed.

## Next slice

Add final browser-host documentation and integration evidence for keyboard,
pointer, and gamepad behavior.
