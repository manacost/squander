# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Squander is primarily for developers building browser games through code-first,
agentic-driven workflows. The framework is shaped for a developer who wants a
game framework that reflects their own programming preferences and can support
serious, polished results.

## Product Purpose

Squander provides the runtime and tooling needed to build browser games with
TypeScript. It hides most WebGPU graphics-rendering details while exposing the
game lifecycle, assets, sprites, primitives, paths, polygons, cameras,
viewports, filtering, fonts, scenes, input routing, scene-owned Svelte UI, and
typed UI state bridges needed to make a game.
Success means developers can move from idea to a performant, professional game
without managing low-level graphics plumbing in every feature.

## Positioning

Squander aims to feel more like Love2D or MonoGame than a class-heavy,
opinionated object-oriented engine: it favors ECS-friendly foundations and
flexible programming styles while retaining the capability to deliver
professional results in the browser.

## Operating Context

Developers use Squander as an npm package from TypeScript browser applications.
The repository contains both the package and a SvelteKit documentation site
with focused runtime guides, copyable examples, a composed WebGPU playground,
and optional Svelte 5 integration. Agent-assisted development is a first-class
workflow, so public APIs and examples must be clear, typed, and easy for coding
agents to navigate.

## Capabilities and Constraints

- WebGPU is the rendering path; the framework should hide low-level graphics
  details behind a practical game API.
- The core runtime must remain independent of Svelte; Svelte 5 integration is
  optional.
- Scenes compose gameplay, assets, typed communication, and input ownership
  without requiring a rendering scene graph.
- Browser input remains explicit and host-scoped so native controls retain their
  behavior unless a game handler opts into prevention.
- APIs should support ECS-oriented and other flexible programming styles rather
  than requiring a heavy object-oriented model.
- Developer experience must support agentic-first programming through explicit,
  discoverable, strongly typed contracts and examples.
- Performance is a product requirement, including efficient runtime behavior and
  resource ownership.
- The framework targets browser games and must preserve the existing package,
  documentation, testing, and WebGPU verification workflows.

## Brand Commitments

The product name is Squander. Use the established terms WebGPU, Svelte 5,
game, runtime, adapter, and GameHost consistently.

## Evidence on Hand

The repository README, package exports, focused core guides, runnable examples,
capability specifications, unit tests, integration tests, and real WebGPU
fixtures document the current product and its verification expectations.
There are no user testimonials, customer claims, or performance benchmarks to
invent.

## Product Principles

- Keep the game code expressive and the graphics plumbing contained.
- Make the framework useful to multiple programming styles, including ECS.
- Treat agent-readable types, contracts, and examples as core developer
  experience.
- Preserve performance and explicit resource ownership as features, not
  implementation details.
- Earn professional results through composable primitives and verifiable
  runtime behavior.
