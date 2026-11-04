# scene-assets

## Status

Implemented. Target phase: Phase 3-a, Slice 2. Required and lazy scene asset
ownership, shared lifetime, retry, cancellation, and trusted-origin image
upload/draw evidence are verified.

## Goal

Give each mounted scene a typed asset scope backed by the parent game's
`AssetCache` and `ResourceOwner`.

## Requirements

- Use the parent game's typed manifest and existing ownership primitives.
- Keep scene, game, and frame-local ownership distinct.
- Release scene handles on scene disposal and reject late attachment.

## Scenarios

### Required dependency

A declared dependency loads before `enter` and is available from `assets.get()`.

### Shared dependency

Two scenes acquire one manifest key and retain independent handles.

### Late dependency

A scene or game is disposed while loading; the result is rejected and released.

## Acceptance criteria

- Type inference accepts manifest keys and rejects unknown keys.
- Required and lazy loads use cache cancellation, retry, and disposal semantics.
- Scene removal releases its handles without invalidating surviving scenes.
- Real WebGPU evidence verifies image upload and draw after one scene leaves.

## Usage description

Declare `dependencies: { hero: "hero" }` for required setup work, or call
`context.assets.load("hero")` for a lazy scene-owned acquisition.

## Test references

Automated evidence marker: [scene-assets]

Test evidence: the focused [`scene.test.ts`](../../src/lib/core/runtime/scene.test.ts) suite
covers required dependency acquisition, shared-scene lifetime, surviving-scene
use, cancellation, retry, and late completion. Real browser image upload/draw
evidence is exercised by [`webgpu-scene-assets.spec.ts`](../../tests/webgpu-scene-assets.spec.ts)
on the trusted local preview origin.

## Notes

The cache retains its game-owned shared entry until game disposal. Scene scopes
release their independent handles; frame-local draw data is not an asset.

## Contract

- Scene dependencies select keys from the parent manifest and are loaded before
  activation.
- `SceneContext.assets.load()` supports required and lazy acquisition with the
  existing cache's cancellation and retry behavior.
- `SceneContext.assets.get()` returns a handle previously acquired by that scene.
- Removing a scene disposes its scope and releases its acquired handles.
- The game cache remains the parent owner of shared cache entries; final resource
  destruction occurs when the cache and all scene handles are released.
- Parent game disposal wins over scene loading. A late resource is released and
  never attached to a disposed scene.
- Frame-local draw data is not stored in a scene asset scope.

## Traceability

`SceneDefinition.dependencies` -> `SceneAssetScope` -> `AssetCache.load` ->
`ResourceOwner` handles -> scene removal/game disposal -> unit/type/WebGPU tests.

## Verification

Focused tests cover manifest inference, required loading, lazy loading, shared
acquisition, cancellation, retry, and late completion. The browser fixture
verifies real image upload and draw after one scene is removed.
