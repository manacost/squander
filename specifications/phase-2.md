# Phase 2: WebGPU rendering foundation

## Purpose and status

Replace PixiJS with a standalone TypeScript 2D foundation and optional first-class
Svelte/SvelteKit integration. The interview direction is consolidated into
[15 capability drafts](../specs/README.md). They are not implemented contracts:
[open details](open-questions.md) must be resolved for each dependent slice.

## Agreed scope

### Lifecycle, assets, and ownership

- Asynchronous setup finishes before the loop starts. Initialization failure
  releases that attempt's acquisitions and exposes a typed error; retry creates
  a fresh instance.
- Runtime callback errors and unexpected device loss stop the loop with typed
  errors. The instance remains available for inspection and disposal. No automatic recovery.
- Variable update timing protects against excessive deltas. Explicit pause stops
  updates while drawing continues; document hiding suspends both and returning
  resets timing while preserving explicit pause.
- Disposal is idempotent and wins over in-flight loading; late work cannot revive
  the instance. Cooperatively signal cancellation and release late resources.
- Explicit manifests provide checked asset keys and inferred handle types.
  Concurrent acquisitions share loading work within one game, with independent ownership.
- Failed loads reject, permit explicit retry, and do not stop an otherwise running
  game when handled. No silent placeholders or automatic retries.
- Dynamic texture input accepts File/Blob values; fetching stays with the application.
- Explicit owners share underlying resources. Release invalidates its handle;
  final-owner release frees the resource. Released-handle drawing throws;
  repeated release is harmless. Scene-specific ownership automation is deferred.

### Rendering and viewports

- WebGPU is the sole backend. All primitive types preserve draw call order and
  use normal source-over alpha blending. Additional blend modes are Phase 3 candidates.
- Sprites support regions, tint, opacity, scaling, rotation, and flips, with
  explicit options and no style leakage between draws.
- Positive X points right and positive Y down. Sprite origins default to top-left
  with normalized overrides relative to the selected region.
- Lines, filled/outlined rectangles and circles, and reusable concave simple
  polygons are included. Stroke-only paths include straight, quadratic, and
  cubic segments and explicit closure. Strokes are centered on their geometry;
  inside/outside alignment is a Phase 3 candidate. No polygon holes or self-intersections.
- Basic camera position/zoom/rotation applies to world content.
- Support fixed-fit logical sizing with letterboxing and responsive sizing.
  Handle physical display density separately from logical units.
- Texture filtering defaults to linear, with independent up/downscaling controls
  and a shorthand. No mipmaps in Phase 2.

### Fonts and UI

- Use typed font assets with bundled font-file URLs, including npm/Fontsource
  bundler imports. The core is independent of the bundler.
- Allow Canvas 2D for font preparation; render world labels with WebGPU.
- Prepare reusable glyph atlases during loading with configurable characters and
  a basic Latin default; extend automatically for additional supported glyphs.
  Changing already-prepared text reuses glyph texture data.
- Support label position, size, color, and camera transforms. Defer rich layout,
  wrapping, and build-time atlas generation. Initial language/size policies need specification.
- Expose strongly inferred read-only state subscriptions and typed commands,
  including return types. Keep state publication and gameplay validation in game code.
- Svelte owns each game host/instance; unmount cleans subscriptions and disposes
  the game. Future scenes can own overlays through an optional adapter. Core code
  has no Svelte dependency.

### Acceptance and migration

- Remove PixiJS from the replacement runtime and public API. Breaking the old API is allowed.
- Provide an organized documentation library with focused runnable demos and
  relevant tests for each individual feature, plus a final kitchen-sink playground.
- Exceed 90% in each of statements, branches, functions, and lines across framework
  runtime code, including renderer CPU logic and Svelte integration. Exclude demos,
  generated files, and type-only declarations.
- Add API type tests and real WebGPU rendering verification. Mocked GPU calls and
  code coverage alone cannot prove correct rendering.
- Initially verify a specified Chromium environment. Establish the concrete
  baseline before claiming compatibility; desktop packaging is outside this phase.

## Proposed implementation sequence

This is a dependency-based working sequence, not an approved API or a requirement
for one large rewrite. Resolve relevant contract gaps before starting each slice.

1. Establish verification feasibility: a minimal real WebGPU render fixture,
   public type-test harness, and coverage instrumentation. Record the environment
   and choose meaningful image tolerances. Keep this small and throwaway if needed.
2. Define lifecycle/ownership contracts and build a minimal setup, clear, draw,
   pause, failure, and disposal slice with a focused demo and observable tests.
3. Add manifest loading, concurrent acquisition, sprite drawing, and viewport
   sizing. Verify a real textured image and resource sharing/release behavior.
4. Add dynamic uploads, camera transforms, filtering, and primitive shapes with
   their own demos and tests. Confirm mixed draw order as primitives accumulate.
5. Add reusable paths/polygons and browser-font glyph preparation, resolving
   tessellation, font readiness, and cache policies before their dependent work.
6. Build the typed Svelte bridge and host against the established lifetime rules,
   including SSR and teardown races. Early minimal hosting can support prior demos.
7. Complete the organized feature library and composition playground. Migrate
   retained examples, remove remaining Pixi coupling, and verify package consumers,
   coverage, type contracts, and the real rendering suite.

Tests and documentation accompany each slice; step 7 completes integration rather
than postponing verification. See [implementation readiness](implementation-readiness.md).

## Deferred or unplanned

Scene/ECS/event-bus layers, input, safe storage/math, custom shaders, render targets,
advanced effects, richer text, and desktop packaging remain future candidates.
Fixed-step scheduling and mipmaps are Phase 4 candidates. WebGL2 and general 3D
are not planned. Consult the [Phase 3](phase-3-candidates.md) and
[Phase 4](phase-4-candidates.md) logs; candidate placement does not promise delivery.

Accepted rationale is in the [decision log](decisions.md). Detailed behavioral
criteria and planned verification live in the capability specs.
