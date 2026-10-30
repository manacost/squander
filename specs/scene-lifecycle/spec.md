# scene-lifecycle

## Goal

Compose multiple game scenes through a game-owned ordered stack while preserving
the Phase 2 game lifecycle, error, and disposal guarantees.

## Status

Accepted. Target phase: Phase 3-a, Slice 1. Implemented and verified.

## Requirements

- A game exposes an isolated scene composer.
- Scene factories create one scene instance and may return a promise.
- `init` runs once after construction; `enter` runs before activation; `update`
  and `draw` run while active; `exit` runs before removal.
- A scene becomes active only after factory setup, `init`, and `enter` succeed.
- Scene contexts expose cancellation, rendering, manifest-aware asset scopes,
  and scene-owned subscriptions without coupling the core to Svelte.
- Active scenes update and draw in bottom-to-top stack order.
- Scene handles are opaque and belong to one composer.
- Removal disposes the scene permanently. A later mount creates a new instance.
- Structural changes requested during update or draw take effect at the next
  frame boundary.
- Replacement keeps the old scene active until the replacement is ready. A
  failed replacement leaves the old scene unchanged.
- Scene callback failures use the parent game's runtime failure path.
- Game disposal disposes every scene and prevents late setup from activating.
- The core scene capability has no Svelte dependency.

## Scenarios

### Compose two scenes

The game mounts two scenes. Each active frame updates and draws the scenes from
the lowest stack index to the highest stack index.

### Failed atomic mount

A factory or lifecycle hook rejects. The scene never receives an update or draw,
and its completed setup is disposed without changing the active stack.

### Replace a scene

The caller replaces an active scene. The old scene remains active while the new
factory and hooks run. The old scene is removed only after the replacement is
ready. A failed replacement leaves the old scene active.

### Mutation during a frame

A scene requests removal or mounting during update or draw. The current frame
continues with its original active list; the structural change applies at the
next frame boundary.

### Game disposal during setup

The game is disposed while a scene factory or hook is pending. The scene never
activates, late work is cancelled where possible, and the game remains disposed.

## Acceptance criteria

- Unit tests prove lifecycle ordering, stack ordering, atomic failure, queued
  mutation, replacement, disposal, callback errors, and handle isolation.
- Public type tests prove manifest-aware factory/context inference and reject
  forged or cross-composer scene handles.
- A browser fixture demonstrates two ordered scenes using the real game host and
  trusted local WebGPU environment.
- Focused documentation and a runnable example explain the scene contract.
- Runtime coverage for changed scene and game code is recorded by statements,
  branches, functions, and lines.

## Usage description

```ts
const scene = await game.scenes.mount(async ({ signal }) => {
  const state = { ticks: 0 };

  return {
    name: "counter",
    init: async () => {
      if (signal.aborted) throw new DOMException("scene setup aborted", "AbortError");
    },
    update: () => {
      state.ticks += 1;
    },
    draw: () => {
      // Draw using the scene's composed rendering context.
    },
    exit: () => {
      state.ticks = 0;
    },
  };
});

await game.scenes.remove(scene);
```

The scene factory and lifecycle hooks are the supported Phase 3-a core path.

## Test references

- [`src/lib/core/runtime/scene.test.ts`](../../src/lib/core/runtime/scene.test.ts)
  covers the `[scene-lifecycle] game-owned scene composer` suite.
- [`type-tests/scene.ts`](../../type-tests/scene.ts) covers public factory,
  context, handle, and manifest inference.
- [`tests/webgpu-scene.spec.ts`](../../tests/webgpu-scene.spec.ts) covers the
  trusted local WebGPU composition fixture.

## Notes

This slice intentionally supersedes the earlier Phase 2 wording that
unmounting does not imply disposal. Removing a scene permanently disposes its
scene instance; scene asset scopes and subscriptions follow this lifecycle.

The implementation builds above `create_game` and `create_frame_loop`; it does
not introduce a rendering scene graph or expand the legacy ECS experiment.
