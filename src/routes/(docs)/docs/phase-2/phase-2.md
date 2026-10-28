# Phase 2 replacement framework

This page records the replacement framework work that has measured evidence in
this repository. A slice is not a promoted capability unless its checkpoint
states that the complete acceptance evidence exists.

## Verified slices

Open the [composition playground](/docs/phase-2/playground) to exercise the
verified runtime capabilities together.

- WebGPU runtime setup, deterministic readback, texture sampling, source-over
  blending, camera transforms, viewport mapping, and runtime resize.
- CPU path command snapshots, curve flattening, polygon validation,
  triangulation, stroke geometry, fixed miter policy, and bevel fallback.
- Real WebGPU submission for indexed triangles, prepared strokes, concave polygon
  fills, polygon outlines, game-owned geometry, persistent buffer replacement,
  and release cleanup.
- Game lifecycle ownership with opaque geometry handles, owner isolation,
  snapshotting, updates, release observers, and disposal invalidation.
- Core factory exports at `squander/core` and `squander/core/runtime`, verified
  by the package export validator.

## Evidence commands

```text
npm run test:unit
npm run test:type
npm run check
npm run test:webgpu
npm run validate:specs
npm run validate:package
```

The WebGPU suite requires the trusted local Vite origin and the project’s
explicit Chromium GPU flags. Screenshots are supplemental; rendered behavior is
verified by deterministic texture readback.

## Still deferred

The `paths-and-polygons` capability remains Draft. Public game-facing draw
ergonomics, final package migration, Svelte bridge integration, text, and the
remaining Phase 2 capability work are not implied by the verified slices above.
PixiJS runtime removal and dependency metadata cleanup are verified in the
replacement package boundary slice. Isolated consumer validation and the final
major-version release metadata remain before promotion.

See the repository capability specs and `specifications/checkpoints/` for the
contract decisions, code traces, exact commands, and known gaps for each slice.
