# Phase 2 examples and verification

This page records the replacement framework work that has measured evidence in
this repository. A slice is not a promoted capability unless its checkpoint
states that the complete acceptance evidence exists.

## Verified slices

This route is the home for runnable examples and verification evidence. Open
the [composition playground](/docs/examples/playground) to exercise the
verified runtime capabilities together, or open the [Svelte 5 adapter example](/docs/examples/svelte)
to see typed state, commands, and per-host isolation.

## Evidence map

| Area                                                          | Current state                                                                             | Contract and evidence                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebGPU runtime, sprites, shapes, cameras, viewport, filtering | Runtime and renderer evidence is split by capability; sprite, shape, camera, and viewport promotion remains open | `specs/webgpu-runtime/spec.md`, `specs/sprite-drawing/spec.md`, `specs/shape-drawing/spec.md`, `specs/camera-2d/spec.md`, `specs/viewport-sizing/spec.md`, `specs/texture-filtering/spec.md`; `tests/webgpu-renderer.spec.ts` |
| Paths, polygons, and geometry ownership                       | Geometry ownership is Implemented; path/polygon promotion remains open                    | `specs/paths-and-polygons/spec.md`, `specs/resource-ownership/spec.md`; `tests/webgpu-renderer.spec.ts`; `specifications/checkpoints/phase-2-public-path-polygon.md`, `specifications/checkpoints/phase-2-resource-promotion.md` |
| Game lifecycle, timing, and dynamic assets                    | Implemented with public, CPU, and real-GPU evidence                                     | `specs/game-lifecycle/spec.md`, `specs/game-timing/spec.md`, `specs/asset-loading/spec.md`, `specs/dynamic-assets/spec.md`; `src/lib/core/runtime/game.test.ts`, `src/lib/core/runtime/asset_loading.test.ts` |
| Text rendering                                                | Implemented with bundled Geostar fixture, atlas/glyph reuse, and playground character sheet | `specs/text-drawing/spec.md`; `tests/webgpu-renderer.spec.ts`; `specifications/checkpoints/phase-2-text-drawing.md` |
| Svelte 5 adapter                                              | Implemented with adapter, SSR, host lifecycle, isolation, and package evidence           | `specs/svelte-bridge/spec.md`; `src/lib/svelte/adapter.test.ts`, `src/lib/svelte/GameHost.ssr.test.ts`, `tests/webgpu-svelte-adapter.spec.ts` |
| Package boundary                                              | PixiJS cleanup, replacement exports, isolated consumers, and v2 release metadata verified | `specifications/checkpoints/phase-2-package-boundary.md`; `verification/validate-package-exports.mjs`, `verification/validate-isolated-consumer.mjs`                                                                          |

## Evidence commands

```text
npm run test:unit
npm run test:type
npm run check
npm run test:webgpu
npm run test:integration
npm run validate:specs
npm run validate:package
npm run validate:consumer
npm run check:coverage
```

The WebGPU suite requires the trusted local Vite origin and the project’s
explicit Chromium GPU flags. Screenshots are supplemental; rendered behavior is
verified by deterministic texture readback.

## Still deferred

The `paths-and-polygons` and other capability specs remain
Draft until their complete acceptance criteria and evidence gates pass. Their
implemented seams and evidence are linked above; Draft does not mean that all
implementation work is absent. `resource-ownership`, `paths-and-polygons`,
`text-drawing`, and `svelte-bridge` have
completed their Phase 2 promotion gates.

PixiJS runtime removal, dependency cleanup, replacement exports, isolated
consumer validation, and the `2.0.0` release metadata are verified. Individual
capabilities remain subject to their own promotion gates.

See the repository capability specs and `specifications/checkpoints/` for the
contract decisions, code traces, exact commands, and known gaps for each slice.
