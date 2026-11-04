# Phase 2 prepared stroke renderer checkpoint

Status: **Prepared stroke command and real WebGPU readback verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- A `stroke` render command accepts flattened subpaths, a positive world-unit
  width, color, and optional opacity.
- The renderer prepares stroke quads/joins through the existing CPU geometry
  module, then submits the resulting indexed triangles in command order.
- Active camera and viewport mapping apply to the prepared vertices.
- This slice does not claim public geometry ownership, release, or final package
  exports.

## Implemented slice

- Added the renderer `stroke` command boundary.
- Wired prepared stroke geometry into the existing triangle submission path.
- Added real browser readback coverage for a prepared horizontal stroke.

## Evidence

- Focused real WebGPU test: prepared stroke geometry passed.
- `npm run test:webgpu`: passed, 22 tests.
- `npm run test:unit`: passed, 23 files and 70 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Spec validation, focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `draw_commands([{ kind: "stroke", ...
}])` → `create_stroke_geometry()` → camera/viewport clip mapping → dynamic
vertex buffer → source-over render pass → mapped texture readback.

## Known gaps and gate

- Public game-owned path/polygon handles, release/disposal, polygon fill and
  outline command wiring, and broader stroke fixtures remain unimplemented.
- Go/no-go: **continue with polygon fill/outline renderer wiring; do not promote
  `paths-and-polygons`.**
