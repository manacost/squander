# Phase 3 capability candidates

Last updated: 2026-10-24.

This is a planning backlog, not committed implementation scope. Entries need
capability specs, acceptance criteria, and test mappings before implementation.
Use capability names as stable IDs when creating specs; earlier P3 numeric labels
were planning labels only. Lists replace the earlier tables for readability.

## Requested future directions

- **Scene lifecycle/composition:** factory-based mounting, unmounting, stacking,
  and potentially recursive composition over the update/draw loop.
- **Scene asset dependencies:** declarative dictionaries using explicit ownership;
  retain assets until disposal by default, sharing underlying resources across owners.
- **Scene-owned UI overlays:** an optional Svelte adapter within the per-game host;
  keep the core scene layer independent of Svelte.
- **ECS integration:** composed systems and entities without mandatory inheritance.
  Built-in ECS versus integration remains undecided.
- **Typed event buses:** communication with subscriptions that can be cleaned up
  on unmount; exact event contracts remain to be designed.
- **Keyboard events and gamepad detection:** input routing and broader gamepad
  controls need separate scoping.
- **Safe file storage and safe math utilities:** the meaning of safety and initial
  supported operations remain undecided.
- **Cursor-anchored zoom:** a convenience that keeps the world point under the
  cursor stationary while zoom changes; Phase 2 zoom stays centered on the camera
  position (AD-042).
- **Swappable cameras/projections:** a possible extension within the 2D commitment.
- **Filled curved paths, polygon holes, and fill rules:** extensions beyond Phase
  2's stroked paths and simple concave polygons.
- **Constant screen-thickness strokes:** optional stroke widths independent of
  camera zoom, useful for selection outlines and debug overlays; define screen
  units and viewport/display-density interaction before implementation (AD-030).
- **Inside/outside stroke alignment:** selectable alignment beyond Phase 2’s
  centered strokes; define supported closed geometries and wide-stroke behavior
  before implementation (AD-029).
- **Additional blend modes:** additive and multiply blending, beyond Phase 2’s
  normal source-over alpha blending (AD-027).

## Exploratory possibilities

- Custom shaders, render targets, and advanced rendering effects.
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
- Configurable line caps/joins, including rounded ends and corners, beyond Phase
  2’s fixed flat caps and limited sharp joins (AD-031).

These are recorded so they are not lost; their phase placement has not been agreed.

## Scope corrections from the interview

Runtime bundled-font loading and glyph-atlas preparation have moved into Phase 2;
they are no longer Phase 3 candidates. A developer-authored bitmap atlas is not
required for the preferred font workflow. Exact supplied-atlas import remains open.

The core Svelte bridge, game ownership primitives, typed manifests, and dynamic
File/Blob textures are Phase 2 features. Scene automation remains future work.

Fixed-step scheduling and mipmaps belong in the [Phase 4 log](phase-4-candidates.md).
WebGL2 fallback and general 3D are not planned. See the
[decision log](decisions.md) and [Phase 2 scope](phase-2.md).
