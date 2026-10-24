# Remaining contract decisions

The numbered interview established direction, not every API detail. These are
implementation-readiness questions, not reopened decisions. Resolve the relevant
ones before a dependent slice starts; record outcomes in its spec and the decision
log when architectural. No fixed implementation values below are implied.

## Lifecycle and runtime

- `game-lifecycle`: factory/setup/cleanup signatures, typed errors,
  and how external custom setup cleanup cooperates with cancellation.
- `game-timing`: the timing fields, cap, first/resume delta, snapshot lifetime, and
  synchronous callback scheduling are agreed (AD-019 and AD-020).
- `webgpu-runtime`: supported Chromium/OS baseline, GPU limits, unavailable-adapter
  handling, and intentional teardown versus unexpected device loss.

## Assets

- `asset-loading`: descriptor/cache identity and cancellation of one concurrent
  requester without disrupting others.
- `dynamic-assets`: supported image encodings and size limits; duplicate-input policy.
- `resource-ownership`: release/scope API and safe GPU destruction timing.

## Rendering

- `sprite-drawing`: color helper signatures/ranges and validation, color encoding/alpha composition,
  atlas metadata, and negative-scale policy.
- `shape-drawing`: anchors, stroke alignment, fixed cap/join behavior, degenerates,
  antialiasing, and stroke width under transforms.
- `paths-and-polygons`: path syntax, tessellation tolerance, winding, invalid inputs,
  and reusable geometry ownership/disposal.
- `viewport-sizing`: pixel rounding, zero-size hosts, DPR policy, bar color, and
  whether policy changes require recreation.
- `camera-2d`: default mapping, position meaning, application scope, and zoom limits.
- `texture-filtering`: descriptor names, sampler changes, and font sampling defaults.

## Text and integration

- `text-drawing`: atlas resolution/capacity/eviction, first-use glyph readiness,
  fonts/variants and language scope, missing-glyph behavior, and supplied-atlas import.
  Browser-font loading was accepted; BMFont JSON import was only proposed.
- `svelte-bridge`: exact read-only subscription and command types, runtime alias
  protection, SSR boundary, notification scheduling, and commands after disposal.
- `feature-documentation`: feature route inventory, demo organization, and the
  playground's composition flows. Feature-specific tests and demos are required.

## Verification and migration

- Select real GPU test infrastructure, visual tolerances, type-test runner, and
  coverage instrumentation/merging. The four greater-than-90% metrics and runtime
  scope are already agreed.
- Identify which legacy demos can be adapted and which are removed or archived;
  preserve unrelated work and avoid a broad unreviewed deletion.
- Resolve package entry points so plain TypeScript consumers do not require Svelte.

See [capability drafts](../specs/README.md) and [readiness guidance](implementation-readiness.md).

## Approved project maintenance

Strict type-aware ESLint, reasoned narrow suppressions, and consistent naming are
agreed in AD-021. The coordinated Svelte/SvelteKit toolchain upgrade is complete; see
[maintenance verification](toolchain-maintenance.md) and the remaining
[lint debt](tooling-standards.md).

The lifecycle/timing and maintenance questionnaire is complete. Continue with the
remaining capability contracts above before their dependent implementation slices.

## Rendering questionnaire progress

Questions 1–3 of 6 have established radians with a `degrees()` helper (AD-022),
image flips that preserve geometry and origins (AD-023), and equal color helpers
returning a shared readonly `Color` (AD-024). Color validation and exact helper
contracts remain open. Six is the estimate for this rendering block, not all
remaining project decisions. Continue with invalid color inputs.
