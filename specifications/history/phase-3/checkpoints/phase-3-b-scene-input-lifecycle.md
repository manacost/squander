# Phase 3-b scene input lifecycle checkpoint

Status: slice 2 verified and ready to commit.

## Contract

- `create_game()` creates one `InputRouter` and exposes it as `game.input`.
- `GameSetupContext.input` is the global-handler seam.
- `SceneDefinition.input` is the scene-handler seam.
- A scene handler is registered only after factory, dependencies, `init`, and
  `enter` complete successfully.
- Scene removal unregisters input before asynchronous cleanup and `exit` finish.
- Replacement preserves the scene's input position; stack replacement removes
  the old handlers and installs the replacement at the bottom of the stack.
- Game disposal disposes the router after scene teardown.

## Trace

`create_game()` -> `create_input_router()` -> `create_scene_composer(input)` ->
scene `input` definition -> `InputRouter.insert_scene()` -> dispatch -> scene
removal/replacement/disposal -> `InputRouter.remove_scene()`.

## Files and symbols

- `src/lib/core/runtime/game.ts`: game-owned router and setup exposure.
- `src/lib/core/runtime/scene.ts`: scene input registration and teardown.
- `src/lib/core/runtime/input.ts`: indexed scene insertion.
- `src/lib/core/runtime/scene.test.ts`: lifecycle and global fallback evidence.
- `specifications/history/phase-3/phase-3-b.md`: slice ordering.
- `specs/input-routing/spec.md`: lifecycle requirements and scenarios.

## Evidence

Verification:

- `npm run test:unit`: passed, 31 files and 179 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed, including scene and game input inference.
- `npm run lint:code`: passed.
- `npm run validate:specs`: passed for 20 capability directories.
- `npm run test:coverage:runtime`: passed; overall statements 96.82%, branches
  95.09%, functions 97.68%, lines 97.84%.
- `npm run check:coverage`: passed for 24 files.
- `git diff --check`: passed.

## Next slice

Implement the browser keyboard and pointer adapter. It will attach to an
explicit game host element, preserve native focus/editable controls, translate
default-prevention dispositions, and support pointer capture.
