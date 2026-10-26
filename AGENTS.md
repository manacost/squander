# Repository Guidelines

## Project Structure & Module Organization

Squander is a TypeScript game toolkit built with PixiJS 8 and Svelte 5. Library code lives in `src/lib/`: `core/` contains game logic and viewport code; `ui/` contains Svelte components; `scenes/` contains demos. Public exports are defined in `src/lib/index.ts`; adding a file does not expose it automatically.

Documentation is under `src/routes/(docs)/`; playable examples are under `src/routes/(game)/scenes/`. Static assets belong in `static/`. Vitest tests live beside source files; Playwright tests live in `tests/`. Do not edit generated `build/`, `dist/`, or `.svelte-kit/` files.

## Build, Test, and Development Commands

- `npm ci`: install the exact locked dependencies.
- `npm run dev`: start the local docs and demo server.
- `npm run check`: run Svelte and TypeScript diagnostics.
- `npm run lint`: check Prettier formatting and ESLint rules.
- `npm run test:unit`: run Vitest once; use `npm run test:unit:watch` for watch mode.
- `npm run test:integration`: run browser tests with Playwright.
- `npm run package`: build `dist/` and validate package exports with Publint.
- `npm run build`: build both the static site and library package.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, trailing commas, and a 140-character print width. Prettier and ESLint enforce these rules. Functions and variables generally use `snake_case`; components and types use `PascalCase`. Keep SvelteKit names such as `+page.svelte`. Use Svelte 5 runes (`$props`, `$state`) in new components and perform DOM work inside lifecycle code.

## Testing Guidelines

Name unit tests `*.test.ts` or `*.spec.ts` beneath `src/`; Vitest only discovers that tree. Place browser flows in `tests/`. Coverage is minimal, so add focused tests and manually exercise the relevant demo for rendering or lifecycle work. Run `npm run package` when changing exports.

### WebGPU and coverage rules

- Cover all new framework runtime code with focused Vitest tests. Use TypeScript type tests for public inference and rejected misuse. Revisit the repository-wide greater-than-90% coverage target after Phase 2; do not use legacy PixiJS coverage to evaluate replacement code.
- Treat TypeScript/Svelte coverage and GPU correctness as separate gates. Coverage must include statements, branches, functions, and lines for new runtime code; WGSL shader behavior requires real WebGPU evidence and is not proven by TypeScript coverage.
- Test GPU features in Playwright with a real Chromium WebGPU device. Run the page from a secure context: use the trusted local Vite origin (`http://127.0.0.1:<port>` or `http://localhost:<port>`), never `about:blank` or a `data:` URL. Assert `window.isSecureContext`, `navigator.gpu`, adapter creation, and device creation before rendering.
- Launch the GPU browser with the explicit WebGPU/GPU flags used by the project configuration. Record browser version, OS, GPU adapter/backend, DPR, viewport, and fixture dimensions. A missing `navigator.gpu` or adapter is a failed GPU verification environment, not a passing skip.
- Verify rendering by executing commands and reading deterministic textures or buffers back to JavaScript. Use independent expected values and declared tolerances. Use screenshots only as supplemental visual evidence.
- Use mocks for CPU-side failures, cancellation, ownership, caching, disposal, and device-loss state transitions; use a real device for shaders, texture sampling, blending, draw order, tessellation, and pixel results.
- Run the WebGPU Conformance Test Suite selectively as an external API-conformance reference; it supplements project acceptance tests and does not replace feature-specific fixtures.

## Git Guidelines

- Commit frequently at meaningful checkpoints, once a coherent change is complete and its relevant checks pass. Each commit must be atomic: one logical change, independently understandable and revertible.
- Use Conventional Commits: `type(scope): imperative summary`. Use `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, or `perf`; omit the scope for repository-wide changes. Examples: `fix(scenes): correct current scene`, `feat(viewport): add zoom limits`, and `chore: update project rules`.
- Stage only files belonging to the current change. Preserve unrelated work and avoid mixing generated files with source changes.
- Pull requests should explain the behavior change, list validation performed, link related issues, and include screenshots or recordings for visible UI or rendering changes.

## Documentation Guidelines

We never allow documentation to go stale. Update affected documentation and examples in the same atomic commit as changes to public APIs, behavior, configuration, or workflows. Before completing a change, verify that the relevant documentation matches the implementation and correct any discrepancies.

## Agent-Specific Instructions

Inspect `git status` before editing and preserve unrelated work in a dirty tree. Prefer source code over stale examples when behavior differs. Keep changes scoped and report pre-existing check failures separately.
