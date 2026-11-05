# Phase 1 readiness record

> Historical readiness record. For current behavior, read `specs/README.md` and
> the relevant capability specification.

Status: **Ready for Phase 2**. This record captures the closeout evidence and
the handoff boundary before Phase 2 implementation begins.

## Contract disposition

- Accepted architecture decisions are authoritative in
  [decisions.md](../../decisions.md).
- Decisions AD-019 through AD-054 are reflected in the relevant capability
  drafts. Details that remain genuinely implementation-specific stay in the
  capability's Notes section and must be resolved before its implementation
  slice starts.
- Capability lifecycle status remains `Draft`; target phase remains separate.
  No capability is promoted to `Accepted` or `Implemented` by this readiness
  update; Phase 2 evidence is still required.
- The remaining contract details are grouped by implementation slice in
  [open-questions.md](../../open-questions.md). They are pre-slice gates, not hidden
  requirements or claims of implementation.

## Verification baseline

- Browser: Playwright-managed Chromium, headless for repeatable checks.
- GPU requirement: the WebGPU probe must run with `navigator.gpu`, an adapter,
  and a real device. An unavailable adapter is a verification gap and fails the
  dedicated probe; it is never treated as a passing render check.
- Current environment result: the original probe used `about:blank`, which is
  not a secure context and therefore hid `navigator.gpu`. On the trusted local
  Vite origin (`http://127.0.0.1:5173`), both bundled Chromium and installed
  Chrome expose `navigator.gpu` and return an adapter on the Apple M1/Metal
  host.
- Rendering fixture: a 1×1 `rgba8unorm` texture cleared to
  `[64, 128, 191, 255]`, read back through a mapped GPU buffer. Future visual
  fixtures must record browser version, OS, adapter/backend, DPR, dimensions,
  and declared pixel tolerances.
- Type tests: TypeScript `tsc --noEmit` with `@ts-expect-error` for rejected
  calls. The current fixture validates the harness; replacement API fixtures
  are added with the Phase 2 public contracts.
- Coverage: Vitest's V8 provider is the selected approach. Runtime source will
  be included explicitly and demos, generated output, and type-only files will
  be excluded. Unit and browser evidence remain separate; coverage does not
  substitute for real GPU rendering evidence.

## Migration and documentation inventory

The current package is still the PixiJS-era implementation. Pixi-dependent
runtime code, demos, tests, and peer dependencies are retained as migration
inputs for Phase 2. They are not replacement-framework evidence. The existing
documentation and demos are classified as follows:

- **Retain as migration references:** existing unit tests, browser navigation
  tests, and current Svelte bridge examples.
- **Adapt during Phase 2:** public exports, lifecycle/UI host, camera and
  rendering demos, package entry points, and the focused documentation routes.
- **Remove during Phase 2 replacement:** PixiJS runtime imports and PixiJS peer
  dependency once replacement consumers exist.
- **Archive or replace deliberately:** legacy Pixi-only examples whose behavior
  has no Phase 2 capability counterpart.

Every Phase 2 capability must gain a focused documentation page/demo, tagged
tests, and real-rendering evidence before it can become `Implemented`.

## Evidence and gate

Phase 1 handoff requires:

1. `npm run test:type` passes for the harness.
2. `npm run test:webgpu` executes the real probe successfully on the trusted
   local Vite origin.
3. `spec-validate` reports no structural or traceability violations.
4. Planning documents agree on Phase 1 boundaries and Phase 2 sequencing.
5. Any remaining capability-specific detail is named as a pre-slice gate.

The Phase 2 implementation sequence remains dependency ordered: verification
feasibility, lifecycle/ownership, assets/sprites/viewports, camera/filtering/
shapes, reusable geometry/text, Svelte bridge, then documentation and migration.

## Recorded execution

- `npm run validate:specs`: passed; 16 capability directories validated.
- Full validation evidence is preserved in
  [phase-1-validation.md](phase-1-validation.md).
- `npm run test:type`: passed; the harness verified inferred values, return
  types, and rejected command misuse.
- `npm run test:unit`: passed; 7 files and 18 tests passed.
- `npm run test:coverage`: executed with the V8 provider. The current PixiJS-era
  runtime measured 11.30% statements, 4.94% branches, 17.07% functions, and
  11.21% lines under the selected all-runtime scope. This is a baseline, not a
  replacement-framework coverage claim.
- `npm run check`: passed with zero errors and warnings.
- Targeted Prettier checks: passed.
- `npm run test:webgpu`: passed after moving the probe to the trusted local Vite
  origin and enabling the explicit WebGPU/GPU launch flags. The test created an
  adapter and device, rendered the deterministic fixture, and read back the
  expected pixel.
- `npm run test:integration` and `npm run package`: blocked during the build /
  preview packaging path by the environment's npm cache/packaging failure. The
  package step also reports the existing missing `@sveltejs/kit` declaration
  warning. No browser integration pass is claimed.

Phase 1 now has a viable local WebGPU verification environment and is ready for
Phase 2 handoff. Package-boundary validation is intentionally deferred to the
final Phase 2 breaking migration: the replacement core will be exposed from the
package root and `squander/core`, optional Svelte integration from
`squander/svelte`, and the legacy PixiJS exports and dependencies will be
removed in the next major release. The current npm cache/packaging failure is
retained as historical baseline evidence, not treated as an active Phase 1
blocker or a reason to introduce a transitional export shape.
