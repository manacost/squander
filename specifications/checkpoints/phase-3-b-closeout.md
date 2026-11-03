# Phase 3-b closeout checkpoint

Status: complete; raw input capability promoted.

## Delivered contract

- Raw keyboard, pointer/mouse, and gamepad events use one typed input union.
- Active scenes receive events newest-first and can consume them before global
  fallback handlers.
- `create_game()` owns one router; scene input follows scene lifecycle.
- `create_browser_input_adapter()` attaches only to an explicit host, preserves
  editable controls by default, applies default prevention explicitly, and
  supports pointer capture.
- `create_browser_gamepad_adapter()` listens for connection lifecycle events,
  samples current state through owner-driven polling, emits changes, and exposes
  immutable snapshots.
- Action mapping, rebinding, text input/IME, gestures, hit testing, haptics,
  and automatic focus traversal remain separate capabilities.

## Documentation and evidence

- Sidebar: `/docs/examples/input` under Core.
- Live example: `src/routes/(docs)/docs/examples/input/+page.svelte`.
- Browser evidence: `tests/input-routing.spec.ts`, Chromium against the trusted
  local preview origin.
- Unit evidence: `browser_input.test.ts` and `browser_gamepad.test.ts`.
- Public type evidence: `type-tests/input.ts` and `type-tests/scene.ts`.

## Verification

- `npm run test:unit`: 192 tests passed.
- `npm run check`: passed.
- `npm run test:type`: passed.
- `npm run lint:code`: passed.
- `npm run validate:specs`: passed.
- `npm run test:coverage:runtime`: passed; statements 96.93%, branches
  95.19%, functions 97.58%, lines 97.97%.
- `npm run check:coverage`: passed for 26 files.
- `npm_config_cache=/private/tmp/squander-npm-cache npm run package`: passed;
  Publint reported `All good!`.
- `npx playwright test tests/input-routing.spec.ts --reporter=list`: passed,
  1 Chromium test.

## Limitations

The browser fixture proves host keyboard/pointer behavior and native browser
interaction. It does not claim physical gamepad hardware availability; the
gamepad adapter is proven through its injected browser API seam and documented
for owner-driven polling.
