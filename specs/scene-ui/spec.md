# scene-ui

## Goal

Give Svelte scenes a typed, lifecycle-owned UI surface without coupling the
core scene runtime to Svelte or exposing a separate overlay host.

## Status

Implemented. Target phase: Phase 3-a, Slice 4. The `Game` host, typed scene UI
handles, stack replacement, SSR boundary, host teardown, and browser evidence
are verified.

## Requirements

- `<Game onReady={...}>` creates one isolated game and private scene UI layer.
- `create_ui(Component, props)` infers component props and returns an opaque
  `UiHandle` owned by the current scene.
- UI handles support mount, update, and idempotent disposal.
- Scene UI follows scene stack order and is removed with its scene.
- `switch()` replaces the full scene/UI stack only after the replacement is ready.
- Host unmount cancels pending setup and disposes mounted UI without late updates.
- SSR renders the host shell without browser globals or running `onReady`.
- Multiple `Game` hosts remain isolated.

## Scenarios

### Typed scene panel

A scene creates a Svelte component with inferred props, mounts it, and updates
its state through the returned handle.

### Stacked UI

Gameplay, HUD, pause, and dialogue scenes mount together. Their UI appears in
the same bottom-to-top order as the scene stack.

### Atomic switch

A replacement scene is prepared before the old scene/UI stack is removed. A
failed replacement leaves the current stack active.

### Host teardown

A host is removed while setup or scene creation is pending. The pending work is
cancelled where possible and no late UI is mounted.

## Acceptance criteria

- Public type tests accept valid component props and reject missing or incorrect props.
- Unit and SSR tests cover mount, update, disposal, replacement, failure, and host teardown.
- Chromium/WebGPU evidence verifies stacked ordering, callback-driven switching,
  failed startup handling, renderer readback, and two-host isolation.
- Focused documentation provides a live example and copyable usage sample.

## Usage description

```svelte
<script lang="ts">
  import { Game, type GameReadyContext } from "squander/svelte";

  const start_game = ({ scenes }: GameReadyContext) => {
    scenes.switch(
      scenes.create(({ create_ui }) => ({
        name: "hud",
        enter: () => create_ui(Hud, { score: 0 }),
      })),
    );
  };
</script>

<Game onReady={start_game} />
```

Use the scene-owned handle to update or dispose the component. Keep gameplay
state in the game and publish only the UI state the component needs.

## Test references

- [`src/lib/svelte/scenes.test.ts`](../../src/lib/svelte/scenes.test.ts) covers
  scene UI scope, multiple handles, replacement, and idempotent disposal in the
  `[scene-ui]` suite.
- [`src/lib/svelte/Game.ssr.test.ts`](../../src/lib/svelte/Game.ssr.test.ts)
  covers SSR behavior in the `[scene-ui] Game SSR` suite.
- [`type-tests/svelte-scenes.ts`](../../type-tests/svelte-scenes.ts) covers
  component props, `UiHandle`, scene navigation, and EventMap inference.
- [`tests/webgpu-scene-ui.spec.ts`](../../tests/webgpu-scene-ui.spec.ts) covers
  trusted-origin browser behavior in the `[scene-ui]` suites.

## Notes

The private UI layer belongs to the Svelte package. Core scenes remain
Svelte-independent. Rich reactive helpers, widget systems, and automatic focus
traversal are separate future capabilities.
