# Phase 2 renderer triangle checkpoint

Status: **Indexed triangle submission and real readback verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- The renderer accepts ordered triangle vertices and indices as a draw command,
  applies the active camera and viewport mapping, and preserves command order.
- Triangle geometry uses the renderer's existing source-over color pipeline and
  solid texture resource; no custom shader or public geometry ownership is
  introduced by this slice.
- Invalid indices, empty geometry, nonfinite vertices, and invalid opacity are
  rejected at command preparation.

## Implemented slice

- Added indexed triangle render commands to the WebGPU renderer.
- Added dynamic vertex counts for non-quad geometry.
- Added real browser readback coverage for a colored triangle and preserved all
  existing WebGPU fixtures.

## Evidence

- Focused real WebGPU test: indexed triangle geometry passed.
- `npm run test:webgpu`: passed, 21 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `draw_commands([{ kind:
"triangles", ... }])` → vertex/index validation → camera/viewport clip mapping
→ solid-texture bind group → dynamic vertex buffer draw → render pass → mapped
texture readback. A failed first readback revealed and verified the dynamic draw
count correction.

## Known gaps and gate

- Public path/polygon draw APIs, geometry ownership/release, polygon
  triangulation-to-renderer wiring, stroke integration, and full GPU stroke
  rasterization remain unimplemented.
- Go/no-go: **continue with geometry-to-renderer wiring; do not promote
  `paths-and-polygons`.**
