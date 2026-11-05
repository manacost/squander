# Framework goals

This document captures the current goals for Squander. It describes the product
direction and architectural boundaries; observable behavior belongs in the
capability specifications, and durable rationale belongs in the decision log.

## Product vision

- Build a TypeScript-first toolkit for polished 2D browser games.
- Keep game code expressive and focused on gameplay while the framework owns
  WebGPU setup, frame scheduling, resource lifetime, and predictable teardown.
- Combine LÖVE's minimal callback-driven ergonomics with MonoGame's structured
  resources, pipeline, and math without requiring inheritance or a class-heavy
  architecture.
- Favor composition, ECS-friendly foundations, and flexible programming styles.
- Provide strong public types, useful inference, and runtime boundaries that make
  invalid ownership and lifecycle behavior difficult to express.
- Make rendering, input, scenes, UI integration, and verification work together
  as one coherent developer experience.

## Runtime architecture

- Use WebGPU as the rendering path. An HTML canvas is the presentation surface;
  Canvas 2D is not the game renderer, and a WebGL fallback is not promised.
- Keep the core runtime independent of Svelte, SvelteKit, and any application
  framework.
- Give each game explicit ownership of its renderer, frame loop, input router,
  assets, resources, geometry, and scenes.
- Separate update and draw work, provide deterministic lifecycle transitions,
  and make initialization, failure, pause, visibility, and disposal observable.
- Use explicit handles and disposal for persistent GPU-backed resources. Keep
  frame-local drawing separate from resources that applications own.
- Support composed scenes, scene-owned assets and UI, signals, and input
  routing without requiring a persistent rendering scene graph.
- Treat real WebGPU rendering evidence as distinct from CPU tests, type tests,
  and coverage. Shader, blending, draw-order, and readback claims require a real
  device.

## UI and experience delivery

- Svelte is the UI layer. It renders menus, HUDs, overlays, controls, loading
  states, errors, and other presentation around the game runtime.
- Keep mutable gameplay state and business rules in game code. Publish only the
  readonly state needed by the UI through a typed bridge, and send user intent
  back through typed commands.
- Use `GameHost` for the common Svelte integration and
  `create_game_adapter` for custom hosts. Each host owns one game instance,
  subscriptions, and disposal for that mount.
- Make the bridge preserve inferred state, command parameters, and synchronous
  or asynchronous command return types without coupling the core runtime to
  Svelte.
- Use SvelteKit as the application medium for delivering the experience:
  routing, documentation, runnable examples, composition demos, and the
  browser/server boundary belong there. SvelteKit delivers the surrounding
  experience; it does not own simulation, rendering, or core resource lifetime.
- Keep WebGPU creation and other browser-only work on the client side, while
  allowing SvelteKit to provide the application shell and delivery workflow.

## Developer experience and quality

- Expose a small, discoverable package surface with clear core, runtime, and
  Svelte entry points.
- Document supported behavior, limitations, ownership rules, and usage patterns
  with focused guides, copyable examples, and live demonstrations.
- Prefer APIs that TypeScript can verify without assertions in production code.
- Test framework runtime code with focused unit tests, type tests, browser flows,
  and real WebGPU fixtures where the behavior crosses the GPU boundary.
- Keep coverage, type safety, lifecycle correctness, and GPU correctness as
  separate quality signals.
- Preserve a fast feedback loop for contributors and coding agents through
  strict formatting, linting, diagnostics, package validation, and explicit
  repository conventions.

## Scope and boundaries

- Squander is browser-first and currently targets 2D games. Future desktop
  embedding can build on the same runtime but is not a current product
  requirement.
- Advanced projections, custom shaders, render targets, mipmaps, fixed-step
  scheduling, action mapping, and other deferred capabilities must earn their
  own contracts and evidence before becoming supported behavior.
- The core runtime must remain useful without Svelte. Svelte and SvelteKit are
  integration and delivery choices, not prerequisites for game simulation or
  rendering.

## Source of truth

For current behavior, start with the relevant capability specification under
`specs/`, then read the architecture decision log and implementation. Historical
plans and checkpoints are preserved for auditability, but they do not define the
current product goals or supported contract.
