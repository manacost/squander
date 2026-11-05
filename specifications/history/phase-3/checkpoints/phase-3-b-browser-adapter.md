# Phase 3-b browser input adapter checkpoint

Status: slice 3 verified and ready to commit.

## Contract

- `create_browser_input_adapter({ host, router })` is the explicit DOM seam.
- Listeners are attached to the caller-owned host in capture phase; no global
  `window` or `document` listeners are installed.
- Keyboard events from input, textarea, select, or contenteditable descendants
  are ignored by default.
- `consume_and_prevent_default` calls the matching DOM event's
  `preventDefault()`; `consume` does not.
- Consumed pointer-down events request host pointer capture, and pointer-up or
  pointer-cancel releases it.
- Host focus is never stolen automatically unless `focus_on_pointer_down` is
  explicitly enabled; callers can call `adapter.focus()` explicitly.
- `dispose()` removes every listener and is idempotent.

## Trace

caller-owned host -> DOM keyboard/pointer event -> normalized `InputEvent` ->
game-owned `InputRouter` -> `InputDisposition` -> browser default/capture
policy.

## Evidence

Verification:

- `npm run test:unit`: passed, 32 files and 186 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run lint:code`: passed.
- `npm run validate:specs`: passed for 20 capability directories.
- `npm run test:coverage:runtime`: passed; overall statements 96.87%, branches
  95.13%, functions 97.75%, lines 97.90%. The new adapter reached 98.36%
  statements, 95.83% branches, 100% functions, and 100% lines.
- `npm run check:coverage`: passed for 24 files.
- `git diff --check`: passed.

## Next slice

Add gamepad connection/state polling and per-game snapshots. Then add browser
integration evidence and focused documentation for the complete Phase 3B
capability.
