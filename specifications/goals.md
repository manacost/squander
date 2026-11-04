# Framework goals

This document captures the original project goals and the direction agreed during
the architecture interview. It describes intended outcomes, not implemented behavior.

## Product vision

- Build a TypeScript-first game framework with LÖVE's minimalist callback-driven
  ergonomics and MonoGame's structured resources, pipeline, and math inspiration.
- Run in a browser and remain suitable for future desktop embedding. Desktop
  packaging is a later concern, not a Phase 2 deliverable.
- Commit to 2D. Allow camera or projection extensibility later without designing
  the initial framework around general 3D support.
- Favor composition over inheritance. Allow OOP without requiring it.
- Use strong typing throughout public APIs, preferring `type` over `interface`
  with justified exceptions.
- Provide type-safe asset references and explicit resource ownership and disposal.
- Provide GPU-powered rendering through WebGPU. An HTML canvas can be the
  presentation surface, but Canvas 2D is not the game renderer.
- Keep the core independent of Svelte while preserving first-class optional
  Svelte/SvelteKit integration and game-to-UI bridging. Svelte handles UI.
- Deliver a strong test suite with greater than 90% code coverage. Measure statements, branches, functions, and lines across framework runtime
  code, excluding demos/generated/type-only files. Complement coverage with type
  tests and real WebGPU rendering tests. Tooling and environment remain to be selected.
- Document the framework well, including usage, capability behavior, limitations,
  architecture decisions, and connections to tests.

## Architectural direction

A complete API break from the existing PixiJS-based toolkit is allowed. WebGPU
is the sole planned backend; a WebGL2 fallback is not promised. Favor a modern
foundation, with eventual product distribution targeting a controlled,
WebGPU-capable runtime. Browser distribution primarily serves development,
testing, and showcases. Chromium or V8 alone does not guarantee GPU compatibility.

The intended higher-level development style combines composed systems, ECS,
scene mounting/unmounting and stacking, and event-based communication. These
layers will build on the core loop and renderer rather than dictate their internals.

## Delivery plan

- [Phase 1 history](history/phase-1/phase-1.md): establish lightweight specifications and capture decisions.
- [Phase 2 history](history/phase-2/phase-2.md): remove PixiJS and deliver the initial rendering foundation.
- [Phase 3 candidates](phase-3-candidates.md): potential higher-level capabilities.
- [Phase 4 candidates](phase-4-candidates.md): fixed-step scheduling and mipmaps.

Future candidates are not commitments. See the [decision log](decisions.md) for
accepted architecture choices and the [spec-system capability](../specs/specs/spec.md)
for how behavioral specifications will be maintained.
