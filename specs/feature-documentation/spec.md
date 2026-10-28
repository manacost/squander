# feature-documentation

## Goal

Make every Phase 2 feature independently learnable and verifiable, then demonstrate composition.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Provide an organized documentation library with focused runnable demos and relevant automated tests for each individual feature.
- Document ownership, required release, release method, and owner/game cleanup for every resource-returning create/load API, in both API/editor documentation and usage examples (AD-037). Explain that draw calls and pure value helpers do not return disposable resources.
- Explain usage and limitations and connect capability specs to tests and demos.
- Provide a final playground/kitchen-sink experience in addition to focused demos.
- Demonstrate composition without making deferred scene/ECS/input systems prerequisites.
- Meet the agreed runtime coverage goal alongside type tests and real WebGPU tests; mocks alone do not establish rendered correctness.

## Scenarios

### Learn one feature

A reader finds a feature, reads its limitations, runs its small demo, and follows its test references.

### Check composition

The playground combines geometry, sprites, labels, camera/viewport behavior, asset lifetimes, and Svelte interaction without replacing the focused tests.

## Acceptance criteria

- Audit the resource-returning create/load API inventory for ownership/release documentation and examples that show cleanup; identify any missing lifecycle guidance.
- Inventory every Phase 2 feature against a documentation entry, focused runnable demo, and relevant automated verification; identify missing entries explicitly.
- Verify documentation routes and demo controls work in browser tests.
- Exercise the combined playground’s loading, interaction, pause, disposal/recreation, and handled failure flows.
- Report statements, branches, functions, and lines each greater than 90% for framework runtime code, including renderer CPU logic and Svelte integration, excluding demos/generated/type-only files.
- Record real GPU rendering and type-test results separately from runtime coverage; no passing claim may rely on silently skipped GPU tests.

## Usage description

Browse focused examples by capability, then use the playground to explore features together. Documentation should identify unsupported behavior rather than implying it works.

## Test references

The crossover rule and current inventory are recorded in
[`specifications/checkpoints/phase-2-feature-documentation-audit.md`](../../specifications/checkpoints/phase-2-feature-documentation-audit.md).
The Core sidebar and focused text guide are covered by
[`tests/docs-core.spec.ts`](../../tests/docs-core.spec.ts),
[`tests/text-example.spec.ts`](../../tests/text-example.spec.ts), and the real
WebGPU proof in
[`tests/webgpu-text-example.spec.ts`](../../tests/webgpu-text-example.spec.ts).
The remaining capability pages are explicitly listed as follow-up work in the
audit; the composition playground remains supplementary evidence.

Use `[feature-documentation]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-018. Open: route inventory and demo design, supported test machine/browser baseline, visual tolerances, coverage tooling, and CI GPU availability.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
