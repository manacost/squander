# viewport-sizing

## Goal

Keep logical drawing coordinates usable across responsive containers and display densities.

## Status

Implemented.

The viewport contract is implemented and verified through CPU, public type, and
real WebGPU fixtures.

## Requirements

- Support fixed logical dimensions uniformly fitted and centered with letterboxing.
- Support responsive logical dimensions following available CSS size.
- Control letterboxing through viewport sizing, independently of cameras. Unscoped screen coordinates start at the logical content viewport’s top-left and exclude the bars (AD-047).
- Scale centrally in rendering and keep physical device pixel ratio separate from logical units.
- Expose logical dimensions and viewport bounds needed by application layout and aligned Svelte UI.
- Fixed-fill cropping and integer-only scaling are deferred.

## Scenarios

### Letterboxed resize

A 1280 by 720 logical view fits a 1000 by 1000 CSS container: the content is 1000 by 562.5, centered with 218.75 CSS units above and below.

### Responsive density

Changing display density increases physical resolution without changing responsive logical dimensions at the same CSS size.

## Acceptance criteria

- Verify fixed-fit geometry against explicit numerical expectations at wide, tall, and matching aspect ratios.
- Verify responsive logical size follows CSS size and DPR changes do not multiply logical coordinates.
- In a browser resize fixture, verify content stays within its computed viewport and bars do not contain game content.
- Verify published bounds let a DOM overlay align to known rendered landmarks.

## Usage description

Choose fixed dimensions or responsive sizing when creating the game. Use exposed viewport information when UI must align to game content.

## Test references

Current verification:

- [`src/lib/core/runtime/viewport_sizing.test.ts`](../../src/lib/core/runtime/viewport_sizing.test.ts)
  covers fixed-fit centering, responsive logical dimensions, DPR scaling, and
  invalid dimensions in the `[viewport-sizing] logical viewport math` suite.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts)
  verifies fixed-fit logical-to-physical placement and a clear letterbox bar in
  the `[viewport-sizing]` suite.

Fixed-fit letterbox mapping is integrated into the renderer and game-owned
viewport state is observable through `game.get_viewport()` and mutable through
`game.resize(viewport)`. Responsive sizing, explicit resize, DPR updates, and
logical placement are verified through the public game seam. Automatic DOM
observation remains an application integration concern rather than a renderer
runtime requirement.

## Notes

AD-009. The current pure helper rounds physical dimensions with `Math.round`,
rejects negative CSS dimensions and nonpositive DPR, and permits zero-size CSS
containers. Canvas integration, letterbox color, and runtime policy changes
remain open.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
