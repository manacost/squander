# Phase 3 capability candidates

Last updated: 2026-11-14.

This is a planning backlog, not committed implementation scope. Entries need
capability specs, acceptance criteria, and test mappings before implementation.
Use capability names as stable IDs when creating specs; earlier P3 numeric labels
were planning labels only. Lists replace the earlier tables for readability.

Earlier closeout work does not promote any candidate in this file by itself.
Promoted entries below remain as historical traceability and link the current
capability contract.

## Promoted capabilities

- **Composition stack:** scene lifecycle, scene asset dependencies, typed event
  communication, and scene-owned Svelte UI. See
  [`phase-3-a.md`](history/phase-3/phase-3-a.md).
- **Input routing:** keyboard, pointer, and gamepad input with scene-first
  routing and browser adapters. See [`phase-3-b.md`](history/phase-3/phase-3-b.md).
- **ECS integration:** local worlds, typed queries, caller-owned systems, and
  ECS system composition. See the [ECS system capability](../specs/ecs-system/spec.md)
  and [ECS system composition capability](../specs/ecs-system-composition/spec.md).
- **Filled curved paths:** promoted into the
  [filled-curved-paths capability](../specs/filled-curved-paths/spec.md) with
  an explicit even-odd contract. Broader fill rules remain separate.
- **Constant screen-thickness strokes:** promoted into the
  [stroke-options capability](../specs/stroke-options/spec.md). The first
  contract applies to path strokes; inside/outside alignment remains separate.
- **Additional blend modes:** promoted into the implemented
  [blend-modes capability](../specs/blend-modes/spec.md); future modes still
  require a separate contract and pixel evidence (AD-027).
- **Automatic offscreen culling:** promoted into the implemented
  [render-culling capability](../specs/render-culling/spec.md). Occlusion
  culling remains a separate future capability.

## Requested future directions

- **Safe file storage and safe math utilities:** the meaning of safety and initial
  supported operations remain undecided.
- **Cursor-anchored zoom:** a convenience that keeps the world point under the
  cursor stationary while zoom changes; current camera zoom stays centered on the camera
  position (AD-042).
- **Swappable cameras/projections:** a possible extension within the 2D commitment.
- **Inside/outside stroke alignment:** selectable alignment beyond the current
  centered strokes; define supported closed geometries and wide-stroke behavior
  before implementation (AD-029).
- **Occlusion culling:** investigate skipping fully hidden content while respecting
  transparency and draw order. More advanced than offscreen checks; require
  correctness evidence and measured benefit before implementation (AD-048).

## Exploratory possibilities

- Manual camera `begin()`/`end()` scopes if a concrete need emerges beyond the
  synchronous, exception-safe `camera.draw(callback)` API (AD-045).

- Broader custom shader layouts and advanced rendering effects; the constrained
  fragment-effect capability is now implemented in
  [custom-shader-effects](../specs/custom-shader-effects/spec.md).
- Generated asset manifests.
- Advanced text layout, complex-script shaping, and richer font capabilities.
- Desktop packaging validation against a concrete wrapper/OS/GPU support matrix.
- Extra ownership scopes or opt-in release on scene unmount.
- An optional rendering scene graph, distinct from scene lifecycle management.

## Deferred without an assigned phase

- Build-time font atlas generation.
- Automatic restoration after GPU device loss.
- Fixed-fill viewport cropping and integer-only viewport scaling.
- Dashed strokes.
- Configurable line caps/joins on primitive outline shader paths; path stroke
  caps and joins are covered by [stroke-options](../specs/stroke-options/spec.md).

These are recorded so they are not lost; their place in the future-work backlog
has not been agreed.

## Scope corrections from the interview

Runtime bundled-font loading and glyph-atlas preparation are part of the current
text capability; they are no longer candidates. A developer-authored bitmap atlas is not
required for the preferred font workflow. Exact supplied-atlas import remains open.

The core Svelte bridge, game ownership primitives, typed manifests, and dynamic
File/Blob textures are current capabilities. Scene automation is implemented by
the scene-composition capability; future scene behavior must extend its existing
lifecycle contract.

Mipmap support remains in the [additional future capability log](phase-4-candidates.md).
WebGL2 fallback and general 3D are not planned. See the
[decision log](decisions.md) and [historical runtime scope](history/phase-2/phase-2.md).
